import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc ABI từ thư mục deployments của frontend/blockchain
const abiPath = path.resolve(__dirname, '../../../blockchain/deployments/CertificateRegistry.abi.json');
let contractABI = [];
try {
  contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (error) {
  console.error("Warning: Không tìm thấy ABI file. Chắc chắn đã deploy contract.", error.message);
}

// Khởi tạo provider và signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

// Khởi tạo contract instance
const getContract = () => {
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
};

export const issueCertificateOnChain = async (certData) => {
  const contract = getContract();
  
  const tx = await contract.issueCertificate(
    certData.certificateId,
    certData.studentId,
    certData.studentName,
    certData.universityName,
    certData.degree,
    certData.major,
    certData.graduationYear,
    certData.gpa,
    certData.ipfsCID,
    certData.ipfsMetadataCID
  );
  
  const receipt = await tx.wait();
  return receipt.hash; // Trả về transaction hash
};

export const revokeCertificateOnChain = async (certificateId, reason) => {
  const contract = getContract();
  const tx = await contract.revokeCertificate(certificateId, reason);
  const receipt = await tx.wait();
  return receipt.hash;
};

export const getCertificateFromChain = async (certificateId) => {
  const contract = getContract();
  const cert = await contract.getCertificate(certificateId);
  return cert;
};

export const verifyCertificateOnChain = async (certificateId) => {
  const contract = getContract();
  const result = await contract.verifyCertificate(certificateId);
  return {
    isValid: result.isValid,
    studentName: result.studentName,
    degree: result.degree,
    major: result.major,
    graduationYear: result.graduationYear,
    ipfsCID: result.ipfsCID,
    issuedAt: Number(result.issuedAt)
  };
};

export const getStudentCertificates = async (studentId) => {
  const contract = getContract();
  return await contract.getStudentCertificates(studentId);
};

export const getStats = async () => {
  const contract = getContract();
  const stats = await contract.getStats();
  return {
    total: Number(stats.total),
    revoked: Number(stats.revoked),
    active: Number(stats.active)
  };
};
