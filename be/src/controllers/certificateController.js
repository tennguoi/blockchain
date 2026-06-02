import fs from 'fs';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../services/pinataService.js';
import * as blockchain from '../services/blockchainService.js';

export const issueCertificate = async (req, res) => {
  try {
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
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Thiếu dữ liệu cấp phát: ${missingFields.join(', ')}`
      });
    }

    await blockchain.ensureIssuerCanIssue();

    // 1. Upload file PDF/Image lên IPFS
    const filePath = req.file.path;
    const fileName = `cert_${certificateId}_${Date.now()}`;
    const ipfsCID = await uploadFileToIPFS(filePath, fileName);
    
    // Xóa file local sau khi upload thành công
    fs.unlinkSync(filePath);

    // 2. Tạo Metadata JSON và upload lên IPFS
    const metadata = {
      name: `Certificate - ${studentName}`,
      description: `${degree} in ${major} from ${universityName}`,
      image: `ipfs://${ipfsCID}`,
      attributes: [
        { trait_type: 'Student ID', value: studentId },
        { trait_type: 'Graduation Year', value: graduationYear },
        { trait_type: 'GPA', value: gpa }
      ]
    };
    const ipfsMetadataCID = await uploadJSONToIPFS(metadata);

    // 3. Gọi Smart Contract lưu lên Blockchain
    const certData = {
      certificateId, studentId, studentName, universityName,
      degree, major, graduationYear, gpa,
      ipfsCID, ipfsMetadataCID
    };
    
    const txHash = await blockchain.issueCertificateOnChain(certData);

    res.status(201).json({
      message: 'Cấp phát văn bằng thành công',
      certificateId,
      ipfsCID,
      ipfsMetadataCID,
      txHash
    });
  } catch (error) {
    console.error('Error in issueCertificate:', error);
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
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
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Thiếu dữ liệu cấp phát: ${missingFields.join(', ')}`
      });
    }

    const filePath = req.file.path;
    const fileName = `cert_${certificateId}_${Date.now()}`;
    const ipfsCID = await uploadFileToIPFS(filePath, fileName);
    
    fs.unlinkSync(filePath);

    const metadata = {
      name: `Certificate - ${studentName}`,
      description: `${degree} in ${major} from ${universityName}`,
      image: `ipfs://${ipfsCID}`,
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
      ipfsMetadataCID
    });
  } catch (error) {
    console.error('Error in prepareIssue:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const { id } = req.params; // certificateId
    const result = await blockchain.verifyCertificateOnChain(id);
    
    if (!result.isValid) {
      return res.status(404).json({ error: 'Văn bằng không tồn tại hoặc đã bị thu hồi' });
    }

    res.json({
      message: 'Xác minh thành công',
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudentCertificates = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Lấy danh sách ID văn bằng từ blockchain
    const certIds = await blockchain.getStudentCertificates(studentId);
    
    // Lấy chi tiết từng văn bằng
    const certificates = [];
    for (const id of certIds) {
      const details = await blockchain.verifyCertificateOnChain(id);
      if (details.isValid) {
        certificates.push({ id, ...details });
      }
    }
    
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const txHash = await blockchain.revokeCertificateOnChain(id, reason || 'Thu hồi bởi Admin');
    
    res.json({
      message: 'Thu hồi văn bằng thành công',
      txHash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await blockchain.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
