import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abiCandidatePaths = [
  path.resolve(__dirname, '../../../bc/deployments/CertificateRegistry.abi.json'),
  path.resolve(__dirname, '../../../bc/artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json'),
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

const loadContractBytecode = () => {
  for (const abiPath of abiCandidatePaths) {
    if (!fs.existsSync(abiPath)) {
      continue;
    }

    const parsed = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    if (parsed?.bytecode) {
      return typeof parsed.bytecode === 'object' ? parsed.bytecode.object : parsed.bytecode;
    }
  }

  throw new Error(
    `Unable to load CertificateRegistry Bytecode. Checked: ${abiCandidatePaths.join(', ')}`
  );
};

// Khởi tạo provider và signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

// Khởi tạo contract instance động
const getContract = (contractAddress) => {
  const address = contractAddress || process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('Missing CONTRACT_ADDRESS');
  }

  return new ethers.Contract(address, contractABI, wallet);
};

const toBytes32Hash = (hash) => {
  if (!hash) {
    throw new Error('Missing certificate hash');
  }

  const normalized = hash.startsWith('0x') ? hash : `0x${hash}`;

  if (!ethers.isHexString(normalized, 32)) {
    throw new Error('Certificate hash must be a 32-byte hex string');
  }

  return normalized;
};

const fromBytes32Hash = (hash) => `${hash || ''}`.replace(/^0x/i, '').toLowerCase();

export const deployNewContract = async (institutionName) => {
  try {
    const bytecode = loadContractBytecode();
    const factory = new ethers.ContractFactory(contractABI, bytecode, wallet);
    const contract = await factory.deploy(institutionName);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`🚀 Smart Contract deployed for ${institutionName} at ${contractAddress}`);
    return contractAddress;
  } catch (error) {
    console.error('❌ Dynamic smart contract deployment failed:', error);
    throw error;
  }
};

export const ensureIssuerCanIssue = async (contractAddress) => {
  const contract = getContract(contractAddress);
  const walletAddress = await wallet.getAddress();
  const issuerRole = await contract.ISSUER_ROLE();
  const hasIssuerRole = await contract.hasRole(issuerRole, walletAddress);

  if (!hasIssuerRole) {
    throw new Error(
      `Backend wallet ${walletAddress} does not have ISSUER_ROLE on contract ${contractAddress || process.env.CONTRACT_ADDRESS}`
    );
  }
};

export const issueCertificateOnChain = async (contractAddress, certData) => {
  const contract = getContract(contractAddress);

  if (typeof contract.issueCertificate !== 'function') {
    throw new Error('Contract ABI does not expose issueCertificate(). Check deployed ABI and contract address.');
  }
  
  const tx = await contract.issueCertificate(
    certData.certificateId,
    toBytes32Hash(certData.certificateHash),
    certData.ipfsMetadataCID
  );
  
  const receipt = await tx.wait();
  return receipt.hash; // Trả về transaction hash
};

export const revokeCertificateOnChain = async (contractAddress, certificateId, reason) => {
  const contract = getContract(contractAddress);
  const tx = await contract.revokeCertificate(certificateId, reason);
  const receipt = await tx.wait();
  return receipt.hash;
};

export const getCertificateFromChain = async (contractAddress, certificateId) => {
  const contract = getContract(contractAddress);
  const cert = await contract.getCertificateProof(certificateId);
  return cert;
};

export const getCertificateProofFromChain = async (contractAddress, certificateId) => {
  const contract = getContract(contractAddress);

  try {
    const proof = await contract.getCertificateProof(certificateId);
    const revokedAt = Number(proof.revokedAt);

    return {
      exists: true,
      isValid: revokedAt === 0,
      revoked: revokedAt !== 0,
      certificateHash: fromBytes32Hash(proof.certificateHash),
      metadataCid: proof.metadataCID,
      issuer: proof.issuer,
      issuedAt: Number(proof.issuedAt),
      revokedAt,
    };
  } catch {
    return {
      exists: false,
      isValid: false,
      revoked: false,
      certificateHash: null,
      metadataCid: null,
      issuer: null,
      issuedAt: 0,
      revokedAt: 0,
    };
  }
};

export const verifyCertificateOnChain = async (contractAddress, certificateId, expectedHash) => {
  const contract = getContract(contractAddress);
  const proof = await getCertificateProofFromChain(contractAddress, certificateId);

  if (!proof.exists || proof.revoked) {
    return proof;
  }

  if (!expectedHash) {
    return proof;
  }

  const isValid = await contract.verifyCertificate(
    certificateId,
    toBytes32Hash(expectedHash)
  );

  return {
    ...proof,
    isValid,
  };
};

export const getStats = async (contractAddress) => {
  const contract = getContract(contractAddress);
  const stats = await contract.getStats();
  return {
    total: Number(stats.total),
    revoked: Number(stats.revoked),
    active: Number(stats.active)
  };
};
