import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';
import fs from 'fs';
import { File } from 'buffer';

dotenv.config();

// Khởi tạo Pinata SDK v2
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
});

const getGatewayBaseUrl = () => {
  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
  return gateway.startsWith('http') ? gateway : `https://${gateway}`;
};

/**
 * Upload file lên IPFS thông qua Pinata
 * @param {string} filePath - Đường dẫn tới file local
 * @param {string} name - Tên file trên Pinata
 * @param {string} mimeType - MIME type đã được multer kiểm tra
 * @returns {Promise<string>} - IPFS CID
 */
export const uploadFileToIPFS = async (filePath, name, mimeType = 'application/octet-stream') => {
  try {
    const file = new File([fs.readFileSync(filePath)], name, { type: mimeType });
    
    // Convert to readable stream or file obj for pinata sdk
    const upload = await pinata.upload.file(file);
    return upload.cid;
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
    return upload.cid;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw new Error('Không thể upload metadata lên IPFS');
  }
};

export const getJSONFromIPFS = async (cid, timeoutMs) => {
  const gateways = [
    getGatewayBaseUrl(),
    'https://cloudflare-ipfs.com',
    'https://ipfs.io',
    'https://dweb.link'
  ];

  const controller = new AbortController();
  const actualTimeout = timeoutMs || Number(process.env.IPFS_FETCH_TIMEOUT_MS || 5000);
  const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

  const fetchPromises = gateways.map(gateway => 
    fetch(`${gateway}/ipfs/${cid}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(response => {
      if (!response.ok) throw new Error(`Gateway ${gateway} returned ${response.status}`);
      return response.json();
    })
  );

  try {
    const data = await Promise.any(fetchPromises);
    clearTimeout(timeoutId);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error fetching JSON from all IPFS gateways:', error);
    throw new Error('Không thể tải metadata từ IPFS');
  }
};
