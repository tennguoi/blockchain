import fs from 'fs';
import { getJSONFromIPFS, uploadFileToIPFS, uploadJSONToIPFS } from '../services/pinataService.js';
import * as blockchain from '../services/blockchainService.js';
import prisma from '../services/db.js';
import * as emailService from '../services/emailService.js';
import {
  buildCertificateMetadata,
  createCertificateHash,
  createIpHash,
} from '../services/hashService.js';

const cleanupUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

const sanitizeStorageName = (value) =>
  `${value || 'certificate'}`
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);

const createAuditLog = async ({ actorId, action, targetType, targetId, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

const createVerificationLog = async ({ req, certificate, certificateCode, result }) => {
  try {
    await prisma.verificationLog.create({
      data: {
        certificateCode,
        result,
        certificateId: certificate?.id,
        verifierIpHash: createIpHash(req.ip),
        userAgent: req.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('Failed to write verification log:', error);
  }
};

export const issueCertificate = async (req, res) => {
  let certificateRecord;

  try {
    // 1. Kiểm tra trạng thái hoạt động của trường học trước tiên
    const institution = await prisma.institution.findUnique({
      where: { id: req.user.institutionId },
    });

    if (!institution || !institution.contractAddress) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Trường học của bạn chưa được cấu hình Smart Contract' });
    }

    if (institution.status === 'SUSPENDED') {
      cleanupUploadedFile(req.file);
      return res.status(403).json({ error: 'Tài khoản trường học đã bị tạm khóa' });
    }

    const {
      certificateId, studentId, studentName, universityName,
      degree, major, graduationYear, gpa
    } = req.body;

    const requiredFields = {
      certificateId,
      studentId,
      studentName,
      universityName,
      degree,
      major,
      graduationYear,
      gpa,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => value === undefined || value === null || `${value}`.trim() === '')
      .map(([key]) => key);
    
    // Validate file
    if (!req.file) {
      return res.status(400).json({ error: 'File văn bằng là bắt buộc (PDF/Image)' });
    }

    if (missingFields.length > 0) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({
        error: `Thiếu dữ liệu cấp phát: ${missingFields.join(', ')}`
      });
    }

    const existingCertificate = await prisma.certificate.findUnique({
      where: { certificateCode: certificateId },
    });

    if (existingCertificate) {
      cleanupUploadedFile(req.file);
      return res.status(409).json({ error: 'Mã văn bằng đã tồn tại' });
    }

    const studentUser = await prisma.user.findFirst({
      where: { studentId, institutionId: req.user.institutionId },
      select: { id: true },
    });

    certificateRecord = await prisma.certificate.create({
      data: {
        certificateCode: certificateId,
        studentCode: studentId,
        studentName,
        universityName,
        degree,
        major,
        graduationYear,
        gpa,
        studentUserId: studentUser?.id,
        issuerUserId: req.user?.userId,
        institutionId: req.user.institutionId,
        contractAddress: institution.contractAddress,
        chainId: institution.chainId,
        status: 'DRAFT',
      },
    });

    await blockchain.ensureIssuerCanIssue(institution.contractAddress);

    // 1. Upload file PDF/Image lên IPFS
    const filePath = req.file.path;
    const fileName = `cert_${sanitizeStorageName(certificateId)}_${Date.now()}`;
    const ipfsCID = await uploadFileToIPFS(filePath, fileName, req.file.mimetype);
    
    // Xóa file local sau khi upload thành công
    cleanupUploadedFile(req.file);

    // 2. Tạo Metadata JSON và upload lên IPFS
    const canonicalMetadata = buildCertificateMetadata(req.body, ipfsCID);
    const certificateHash = createCertificateHash(canonicalMetadata);
    const metadata = {
      name: `Certificate - ${studentName}`,
      description: `${degree} in ${major} from ${universityName}`,
      image: `ipfs://${ipfsCID}`,
      certificateHash,
      canonical: canonicalMetadata,
      attributes: [
        { trait_type: 'Student ID', value: studentId },
        { trait_type: 'Graduation Year', value: graduationYear },
        { trait_type: 'GPA', value: gpa }
      ]
    };
    const ipfsMetadataCID = await uploadJSONToIPFS(metadata);

    certificateRecord = await prisma.certificate.update({
      where: { id: certificateRecord.id },
      data: {
        fileCid: ipfsCID,
        metadataCid: ipfsMetadataCID,
        certificateHash,
        status: 'IPFS_UPLOADED',
      },
    });

    // 3. Gọi Smart Contract lưu lên Blockchain
    const certData = {
      certificateId, studentId, studentName, universityName,
      degree, major, graduationYear, gpa,
      ipfsCID, ipfsMetadataCID, certificateHash
    };
    
    const txHash = await blockchain.issueCertificateOnChain(institution.contractAddress, certData);

    certificateRecord = await prisma.certificate.update({
      where: { id: certificateRecord.id },
      data: {
        txHash,
        status: 'VALID',
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'CERTIFICATE_ISSUED',
      targetType: 'Certificate',
      targetId: certificateRecord.id,
      metadata: {
        certificateCode: certificateId,
        studentCode: studentId,
        txHash,
        metadataCid: ipfsMetadataCID,
      },
    });

    res.status(201).json({
      message: 'Cấp phát văn bằng thành công',
      certificateId,
      ipfsCID,
      ipfsMetadataCID,
      certificateHash,
      txHash
    });
  } catch (error) {
    console.error('Error in issueCertificate:', error);
    // Clean up file if error occurs
    cleanupUploadedFile(req.file);

    if (certificateRecord?.id) {
      try {
        await prisma.certificate.update({
          where: { id: certificateRecord.id },
          data: { status: 'FAILED' },
        });
      } catch (updateError) {
        console.error('Failed to mark certificate as FAILED:', updateError);
      }
    }

    res.status(500).json({ error: 'Không thể cấp phát văn bằng' });
  }
};

export const prepareIssue = async (req, res) => {
  try {
    const { certificateId, studentId, studentName, universityName, degree, major, graduationYear, gpa } = req.body;

    const requiredFields = {
      certificateId,
      studentId,
      studentName,
      universityName,
      degree,
      major,
      graduationYear,
      gpa,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => value === undefined || value === null || `${value}`.trim() === '')
      .map(([key]) => key);
    
    if (!req.file) {
      return res.status(400).json({ error: 'File văn bằng là bắt buộc' });
    }

    if (missingFields.length > 0) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({
        error: `Thiếu dữ liệu cấp phát: ${missingFields.join(', ')}`
      });
    }

    const filePath = req.file.path;
    const fileName = `cert_${sanitizeStorageName(certificateId)}_${Date.now()}`;
    const ipfsCID = await uploadFileToIPFS(filePath, fileName, req.file.mimetype);
    
    cleanupUploadedFile(req.file);

    const canonicalMetadata = buildCertificateMetadata(req.body, ipfsCID);
    const certificateHash = createCertificateHash(canonicalMetadata);
    const metadata = {
      name: `Certificate - ${studentName}`,
      description: `${degree} in ${major} from ${universityName}`,
      image: `ipfs://${ipfsCID}`,
      certificateHash,
      canonical: canonicalMetadata,
      attributes: [
        { trait_type: 'Student ID', value: studentId },
        { trait_type: 'Graduation Year', value: graduationYear },
        { trait_type: 'GPA', value: gpa }
      ]
    };
    const ipfsMetadataCID = await uploadJSONToIPFS(metadata);

    res.status(200).json({
      message: 'Upload to IPFS successful',
      ipfsCID,
      ipfsMetadataCID,
      certificateHash
    });
  } catch (error) {
    console.error('Error in prepareIssue:', error);
    cleanupUploadedFile(req.file);
    res.status(500).json({ error: 'Không thể upload dữ liệu lên IPFS' });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const { id } = req.params; // certificateId
    const certificate = await prisma.certificate.findUnique({
      where: { certificateCode: id },
    });
    if (!certificate || !certificate.contractAddress) {
      await createVerificationLog({
        req,
        certificate,
        certificateCode: id,
        result: 'NOT_FOUND',
      });

      return res.status(404).json({ error: 'Văn bằng không tồn tại trong hệ thống' });
    }

    const proof = await blockchain.getCertificateProofFromChain(certificate.contractAddress, id);
    
    if (!proof.exists) {
      await createVerificationLog({
        req,
        certificate,
        certificateCode: id,
        result: 'NOT_FOUND',
      });

      return res.status(404).json({ error: 'Văn bằng không tồn tại' });
    }

    if (proof.revoked) {
      await createVerificationLog({
        req,
        certificate,
        certificateCode: id,
        result: 'REVOKED',
      });

      return res.status(200).json({
        message: 'Văn bằng đã bị thu hồi',
        result: 'REVOKED',
        data: {
          certificateCode: id,
          issuer: proof.issuer,
          issuedAt: proof.issuedAt,
          revokedAt: proof.revokedAt,
          metadataCid: proof.metadataCid,
          txHash: certificate?.txHash,
        },
      });
    }

    let ipfsMetadata;
    let usedFallback = false;
    try {
      ipfsMetadata = await getJSONFromIPFS(proof.metadataCid, 4000);
    } catch (ipfsError) {
      if (!certificate) {
        await createVerificationLog({
          req,
          certificate,
          certificateCode: id,
          result: 'IPFS_UNAVAILABLE',
        });

        return res.status(503).json({
          error: 'Không thể tải metadata từ IPFS và không tìm thấy dữ liệu gốc',
          result: 'IPFS_UNAVAILABLE',
        });
      }

      console.warn(`IPFS fetch failed for ${id}, falling back to local database reconstruction`);
      ipfsMetadata = {
        canonical: {
          certificateCode: certificate.certificateCode,
          studentCode: certificate.studentCode,
          studentName: certificate.studentName,
          universityName: certificate.universityName,
          degree: certificate.degree,
          major: certificate.major,
          graduationYear: certificate.graduationYear,
          gpa: certificate.gpa,
          fileCid: certificate.fileCid || '',
        }
      };
      usedFallback = true;
    }

    if (!ipfsMetadata?.canonical) {
      await createVerificationLog({
        req,
        certificate,
        certificateCode: id,
        result: 'TAMPERED',
      });

      return res.status(200).json({
        message: 'Metadata IPFS không đúng định dạng xác minh',
        result: 'TAMPERED',
      });
    }

    const recomputedHash = createCertificateHash(ipfsMetadata.canonical);
    const expectedHash = `${proof.certificateHash || ''}`.toLowerCase();
    const dbHash = `${certificate?.certificateHash || ''}`.toLowerCase();
    const hashMatchesChain = recomputedHash === expectedHash;
    const hashMatchesDb = !dbHash || recomputedHash === dbHash;
    const cidMatchesDb = !certificate?.metadataCid || certificate.metadataCid === proof.metadataCid;

    if (!hashMatchesChain || !hashMatchesDb || !cidMatchesDb) {
      await createVerificationLog({
        req,
        certificate,
        certificateCode: id,
        result: 'TAMPERED',
      });

      return res.status(200).json({
        message: 'Dữ liệu văn bằng không khớp hash xác thực',
        result: 'TAMPERED',
        data: {
          certificateCode: id,
          recomputedHash,
          chainHash: proof.certificateHash,
          databaseHash: certificate?.certificateHash,
          metadataCid: proof.metadataCid,
        },
      });
    }

    await createVerificationLog({
      req,
      certificate,
      certificateCode: id,
      result: 'VALID',
    });

    res.json({
      message: 'Xác minh thành công',
      result: 'VALID',
      data: {
        certificateCode: id,
        ...ipfsMetadata.canonical,
        certificateHash: proof.certificateHash,
        metadataCid: proof.metadataCid,
        issuer: proof.issuer,
        issuedAt: proof.issuedAt,
        txHash: certificate?.txHash,
        usedFallback,
      }
    });
  } catch (error) {
    console.error('Error in verifyCertificate:', error);
    res.status(500).json({ error: 'Không thể xác minh văn bằng' });
  }
};

export const getStudentCertificates = async (req, res) => {
  try {
    const { studentId } = req.params;

    const certificates = await prisma.certificate.findMany({
      where: {
        studentCode: studentId,
        institutionId: req.user.institutionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        certificateCode: true,
        studentCode: true,
        studentName: true,
        universityName: true,
        degree: true,
        major: true,
        graduationYear: true,
        gpa: true,
        fileCid: true,
        metadataCid: true,
        certificateHash: true,
        txHash: true,
        status: true,
        revokedReason: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    
    res.json(certificates);
  } catch (error) {
    console.error('Error in getStudentCertificates:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách văn bằng' });
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const existingCertificate = await prisma.certificate.findUnique({
      where: { certificateCode: id },
    });

    if (!existingCertificate) {
      return res.status(404).json({ error: 'Không tìm thấy văn bằng' });
    }

    if (existingCertificate.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Bạn không có quyền thu hồi văn bằng của trường khác' });
    }

    const contractAddress = existingCertificate.contractAddress || process.env.CONTRACT_ADDRESS;
    const txHash = await blockchain.revokeCertificateOnChain(contractAddress, id, reason || 'Thu hồi bởi Admin');

    const certificate = await prisma.certificate.update({
      where: { certificateCode: id },
      data: {
        status: 'REVOKED',
        revokeTxHash: txHash,
        revokedReason: reason || 'Thu hồi bởi Admin',
        revokedAt: new Date(),
      },
    });

    // Tìm email của sinh viên để gửi thông báo thu hồi
    const studentUser = certificate.studentUserId
      ? await prisma.user.findUnique({ where: { id: certificate.studentUserId } })
      : null;
    await emailService.sendCertificateRevokedEmail(studentUser?.email, id, reason || 'Thu hồi bởi Admin');

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'CERTIFICATE_REVOKED',
      targetType: 'Certificate',
      targetId: certificate?.id,
      metadata: {
        certificateCode: id,
        txHash,
        reason: reason || 'Thu hồi bởi Admin',
      },
    });
    
    res.json({
      message: 'Thu hồi văn bằng thành công',
      txHash
    });
  } catch (error) {
    console.error('Error in revokeCertificate:', error);
    res.status(500).json({ error: 'Không thể thu hồi văn bằng' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.user.institutionId },
    });
    const contractAddress = institution?.contractAddress || process.env.CONTRACT_ADDRESS;

    const [chainStats, dbTotal] = await Promise.all([
      blockchain.getStats(contractAddress).catch(() => ({ total: 0, revoked: 0, active: 0 })),
      prisma.certificate.count({ where: { institutionId: req.user.institutionId } }),
    ]);

    res.json({
      ...chainStats,
      dbTotal,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ error: 'Không thể lấy thống kê dashboard' });
  }
};
