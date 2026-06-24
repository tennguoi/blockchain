import express from 'express';
import { ethers } from 'ethers';
import prisma from '../services/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const results = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  let allHealthy = true;

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.checks.database = { status: 'ok' };
  } catch (error) {
    allHealthy = false;
    results.checks.database = { status: 'error', error: error.message };
  }

  // RPC check
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, undefined, {
      staticNetwork: true,
    });
    const blockNumber = await provider.getBlockNumber();
    results.checks.rpc = { status: 'ok', blockNumber };
  } catch (error) {
    allHealthy = false;
    results.checks.rpc = { status: 'error', error: error.message };
  }

  // IPFS check (Pinata gateway)
  try {
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const gatewayUrl = gateway.startsWith('http') ? gateway : `https://${gateway}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${gatewayUrl}/ipfs/bafkreibmizgngk3savw5i7lqgf6ozjdg6bs3hwolr5hfh2fjnnft4i4k7q`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    results.checks.ipfs = { status: 'ok', gateway: gatewayUrl, reachable: response.ok };
  } catch (error) {
    results.checks.ipfs = { status: 'warn', gateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud', error: error.message };
  }

  // Contract check
  try {
    if (process.env.CONTRACT_ADDRESS) {
      results.checks.contract = { status: 'ok', address: process.env.CONTRACT_ADDRESS };
    } else {
      results.checks.contract = { status: 'warn', message: 'CONTRACT_ADDRESS not configured' };
    }
  } catch (error) {
    results.checks.contract = { status: 'error', error: error.message };
  }

  if (!allHealthy) {
    results.status = 'degraded';
  }

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json(results);
});

export default router;
