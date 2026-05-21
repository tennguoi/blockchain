import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Khởi tạo Pinata SDK v2
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
});

/**
 * Upload file lên IPFS thông qua Pinata
 * @param {string} filePath - Đường dẫn tới file local
 * @param {string} name - Tên file trên Pinata
 * @returns {Promise<string>} - IPFS CID
 */
export const uploadFileToIPFS = async (filePath, name) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const file = new File([fs.readFileSync(filePath)], name, { type: 'application/pdf' }); // PinataSDK handles File objects
    
    // Convert to readable stream or file obj for pinata sdk
    const upload = await pinata.upload.file(file);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to Pinata:', error);
    throw new Error('Không thể upload file lên IPFS');
  }
};

/**
 * Upload JSON metadata lên IPFS
 * @param {Object} metadata - JSON object
 * @returns {Promise<string>} - IPFS CID
 */
export const uploadJSONToIPFS = async (metadata) => {
  try {
    const upload = await pinata.upload.json(metadata);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw new Error('Không thể upload metadata lên IPFS');
  }
};
