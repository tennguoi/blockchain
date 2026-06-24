import prisma from '../services/db.js';
import * as blockchain from '../services/blockchainService.js';
import { getJSONFromIPFS } from '../services/pinataService.js';
import { createCertificateHash } from '../services/hashService.js';
import { issueCertificateOnChain } from '../services/blockchainService.js';

export const getCertificates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = { institutionId: req.user.institutionId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { certificateCode: { contains: search } },
        { studentCode: { contains: search } },
        { studentName: { contains: search } },
        { degree: { contains: search } },
      ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'certificateCode', 'studentName', 'status', 'graduationYear'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: orderDir },
        include: {
          issuerUser: { select: { id: true, name: true, email: true } },
          studentUser: { select: { id: true, name: true, email: true } },
          _count: { select: { verificationLogs: true } },
        },
      }),
      prisma.certificate.count({ where }),
    ]);

    res.json({
      data: certificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in getCertificates:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách văn bằng' });
  }
};

export const getCertificateDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        issuerUser: { select: { id: true, name: true, email: true } },
        studentUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!certificate || certificate.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Không tìm thấy văn bằng hoặc không có quyền truy cập' });
    }

    let chainProof = null;
    try {
      chainProof = await blockchain.getCertificateProofFromChain(certificate.contractAddress || process.env.CONTRACT_ADDRESS, certificate.certificateCode);
    } catch (chainError) {
      console.warn('Cannot fetch chain proof:', chainError.message);
    }

    const recentLogs = await prisma.verificationLog.findMany({
      where: { certificateId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ ...certificate, chainProof, recentVerificationLogs: recentLogs });
  } catch (error) {
    console.error('Error in getCertificateDetail:', error);
    res.status(500).json({ error: 'Không thể lấy chi tiết văn bằng' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;
    const { action, targetType } = req.query;

    const where = {
      actor: {
        institutionId: req.user.institutionId
      }
    };
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({ error: 'Không thể lấy audit logs' });
  }
};

export const getVerificationLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;
    const { result, certificateCode } = req.query;

    const where = {
      certificate: {
        institutionId: req.user.institutionId
      }
    };
    if (result) where.result = result;
    if (certificateCode) where.certificateCode = { contains: certificateCode };

    const [logs, total] = await Promise.all([
      prisma.verificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          certificate: { select: { certificateCode: true, studentName: true, degree: true } },
        },
      }),
      prisma.verificationLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error in getVerificationLogs:', error);
    res.status(500).json({ error: 'Không thể lấy verification logs' });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const instId = req.user.institutionId;
    
    const institution = await prisma.institution.findUnique({
      where: { id: instId },
    });
    const contractAddress = institution?.contractAddress || process.env.CONTRACT_ADDRESS;

    const [
      totalCertificates,
      statusCounts,
      todayIssued,
      todayVerified,
      totalVerifications,
      totalUsers,
      recentCertificates,
      chainStats,
      recentAuditLogs,
      recentVerificationLogs,
    ] = await Promise.all([
      prisma.certificate.count({ where: { institutionId: instId } }),
      prisma.certificate.groupBy({
        by: ['status'],
        where: { institutionId: instId },
        _count: true,
      }),
      prisma.certificate.count({ where: { createdAt: { gte: todayStart }, institutionId: instId } }),
      prisma.verificationLog.count({
        where: { createdAt: { gte: todayStart }, certificate: { institutionId: instId } },
      }),
      prisma.verificationLog.count({ where: { certificate: { institutionId: instId } } }),
      prisma.user.count({ where: { institutionId: instId } }),
      prisma.certificate.findMany({
        where: { institutionId: instId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          issuerUser: { select: { name: true } },
        },
      }),
      blockchain.getStats(contractAddress).catch(() => ({ total: 0, revoked: 0, active: 0 })),
      prisma.auditLog.findMany({
        where: { actor: { institutionId: instId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.verificationLog.findMany({
        where: { certificate: { institutionId: instId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { certificate: { select: { certificateCode: true } } },
      }),
    ]);

    const statusBreakdown = {};
    for (const item of statusCounts) {
      statusBreakdown[item.status] = item._count;
    }

    res.json({
      db: {
        totalCertificates,
        totalUsers,
        totalVerifications,
        todayIssued,
        todayVerified,
        statusBreakdown,
      },
      chain: chainStats,
      recentCertificates,
      recentAuditLogs,
      recentVerificationLogs,
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    res.status(500).json({ error: 'Không thể lấy dữ liệu dashboard' });
  }
};

export const reconcileCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({ where: { id } });
    if (!certificate) {
      return res.status(404).json({ error: 'Không tìm thấy văn bằng' });
    }

    if (certificate.status === 'VALID') {
      return res.status(400).json({ error: 'Văn bằng đã ở trạng thái VALID' });
    }

    if (certificate.status === 'REVOKED') {
      return res.status(400).json({ error: 'Văn bằng đã bị thu hồi' });
    }

    if (!certificate.fileCid || !certificate.metadataCid || !certificate.certificateHash) {
      return res.status(400).json({
        error: 'Thiếu dữ liệu IPFS. Cần upload lại từ đầu.',
      });
    }

    const proof = await blockchain.getCertificateProofFromChain(certificate.contractAddress || process.env.CONTRACT_ADDRESS, certificate.certificateCode);
    if (proof.exists && !proof.revoked) {
      await prisma.certificate.update({
        where: { id },
        data: { status: 'VALID' },
      });
      return res.json({ message: 'Văn bằng đã tồn tại trên chain, cập nhật thành VALID' });
    }

    const certData = {
      certificateId: certificate.certificateCode,
      studentId: certificate.studentCode,
      studentName: certificate.studentName,
      universityName: certificate.universityName,
      degree: certificate.degree,
      major: certificate.major,
      graduationYear: certificate.graduationYear,
      gpa: certificate.gpa,
      ipfsCID: certificate.fileCid,
      ipfsMetadataCID: certificate.metadataCid,
      certificateHash: certificate.certificateHash,
    };

    const txHash = await blockchain.issueCertificateOnChain(certificate.contractAddress || process.env.CONTRACT_ADDRESS, certData);

    await prisma.certificate.update({
      where: { id },
      data: { status: 'VALID', txHash },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: 'CERTIFICATE_RECONCILED',
        targetType: 'Certificate',
        targetId: id,
        metadata: { certificateCode: certificate.certificateCode, txHash },
      },
    });

    res.json({ message: 'Reconcile thành công', txHash });
  } catch (error) {
    console.error('Error in reconcileCertificate:', error);
    res.status(500).json({ error: 'Không thể reconcile văn bằng' });
  }
};

export const getFailedCertificates = async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        institutionId: req.user.institutionId,
        status: { in: ['FAILED', 'IPFS_UPLOADED'] },
        fileCid: { not: null },
        metadataCid: { not: null },
        certificateHash: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ data: certificates, total: certificates.length });
  } catch (error) {
    console.error('Error in getFailedCertificates:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách văn bằng lỗi' });
  }
};

export const getStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        institutionId: req.user.institutionId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        walletAddress: true,
        createdAt: true,
      },
    });
    res.json(students);
  } catch (error) {
    console.error('Error in getStudents:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách sinh viên' });
  }
};
