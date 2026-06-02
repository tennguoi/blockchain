import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abiCandidatePaths = [
  path.resolve(__dirname, '../../../bc/deployments/CertificateRegistry.abi.json'),
  path.resolve(__dirname, '../../../bc/artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json'),
  path.resolve(__dirname, '../../../blockchain/deployments/CertificateRegistry.abi.json'),
];

const loadContractABI = () => {
  for (const abiPath of abiCandidatePaths) {
    if (!fs.existsSync(abiPath)) {
      continue;
    }

    const parsed = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.abi)) {
      return parsed.abi;
    }
  }

  throw new Error(
    `Unable to load CertificateRegistry ABI. Checked: ${abiCandidatePaths.join(', ')}`
  );
};

const contractABI = loadContractABI();

// Khởi tạo provider và signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

// Khởi tạo contract instance
const getContract = () => {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error('Missing CONTRACT_ADDRESS in backend environment');
  }

  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
};

export const ensureIssuerCanIssue = async () => {
  const contract = getContract();
  const walletAddress = await wallet.getAddress();
  const issuerRole = await contract.ISSUER_ROLE();
  const hasIssuerRole = await contract.hasRole(issuerRole, walletAddress);

  if (!hasIssuerRole) {
    throw new Error(
      `Backend wallet ${walletAddress} does not have ISSUER_ROLE on contract ${process.env.CONTRACT_ADDRESS}`
    );
  }
};

export const issueCertificateOnChain = async (certData) => {
  const contract = getContract();

  if (typeof contract.issueCertificate !== 'function') {
    throw new Error('Contract ABI does not expose issueCertificate(). Check deployed ABI and contract address.');
  }
  
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
