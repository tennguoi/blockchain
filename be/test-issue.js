import 'dotenv/config';
import fs from 'fs';
import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
});

async function test() {
  try {
    fs.writeFileSync('test.pdf', 'dummy pdf content');
    const file = new File([fs.readFileSync('test.pdf')], 'test.pdf', { type: 'application/pdf' });
    const upload = await pinata.upload.file(file);
    console.log("Upload result:", upload);
  } catch (error) {
    console.error("Error:", error);
  }
}
test();
