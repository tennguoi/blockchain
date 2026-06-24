import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../services/db.js';
import { ethers } from 'ethers';

const WALLET_NONCE_TTL_MS = 5 * 60 * 1000;

const normalizeWalletAddress = (walletAddress) => `${walletAddress || ''}`.toLowerCase();

const createNonce = () => crypto.randomBytes(24).toString('hex');

const createWalletMessage = ({ action, walletAddress, nonce }) => {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  const actionText = action === 'link' ? 'liên kết ví' : 'đăng nhập';

  return [
    `BlockCert ${actionText}`,
    `Wallet: ${normalizedAddress}`,
    `Nonce: ${nonce}`,
    'Nonce này chỉ dùng một lần và hết hạn sau 5 phút.'
  ].join('\n');
};

const issueWalletNonce = async ({ userId, walletAddress, action }) => {
  const nonce = createNonce();
  const expiresAt = new Date(Date.now() + WALLET_NONCE_TTL_MS);
  const message = createWalletMessage({ action, walletAddress, nonce });

  await prisma.user.update({
    where: { id: userId },
    data: {
      walletNonce: nonce,
      walletNonceExpiresAt: expiresAt,
    },
  });

  return { nonce, expiresAt, message };
};

const verifyAndConsumeWalletNonce = async ({ user, walletAddress, signature, action }) => {
  const normalizedAddress = normalizeWalletAddress(walletAddress);

  if (!user.walletNonce || !user.walletNonceExpiresAt) {
    const error = new Error('Nonce không tồn tại hoặc đã được sử dụng');
    error.statusCode = 400;
    throw error;
  }

  if (user.walletNonceExpiresAt.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { walletNonce: null, walletNonceExpiresAt: null },
    });

    const error = new Error('Nonce đã hết hạn');
    error.statusCode = 400;
    throw error;
  }

  const message = createWalletMessage({
    action,
    walletAddress: normalizedAddress,
    nonce: user.walletNonce,
  });

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch (verifyError) {
    const error = new Error('Chữ ký số không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  if (recoveredAddress.toLowerCase() !== normalizedAddress) {
    const error = new Error('Chữ ký số không hợp lệ hoặc không khớp với địa chỉ ví');
    error.statusCode = 400;
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { walletNonce: null, walletNonceExpiresAt: null },
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, studentId: user.studentId, institutionId: user.institutionId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        institutionId: user.institutionId,
        walletAddress: user.walletAddress,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const getMetamaskLoginNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví' });
    }

    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!user) {
      return res.status(404).json({ error: 'Địa chỉ ví này chưa được liên kết với tài khoản nào' });
    }

    const nonceData = await issueWalletNonce({
      userId: user.id,
      walletAddress: normalizedAddress,
      action: 'login',
    });

    res.json(nonceData);
  } catch (error) {
    console.error('Error in getMetamaskLoginNonce:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const getLinkWalletNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví' });
    }

    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const existingWallet = await prisma.user.findFirst({
      where: {
        walletAddress: normalizedAddress,
        NOT: { id: req.user.userId },
      },
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Địa chỉ ví này đã được liên kết với một tài khoản khác' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    if (user.walletAddress) {
      return res.status(400).json({ error: 'Tài khoản này đã được liên kết với một ví khác. Vui lòng liên hệ Admin để thay đổi.' });
    }

    const nonceData = await issueWalletNonce({
      userId: user.id,
      walletAddress: normalizedAddress,
      action: 'link',
    });

    res.json(nonceData);
  } catch (error) {
    console.error('Error in getLinkWalletNonce:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: { email, password: hashedPassword, name, role: 'admin' }
    });

    res.status(201).json({ message: 'Tạo tài khoản admin thành công' });
  } catch (error) {
    console.error('Error in registerAdmin:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const registerStudent = async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Mã sinh viên là bắt buộc đối với sinh viên' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { studentId }
        ]
      }
    });
    
    if (existing) return res.status(400).json({ error: 'Email hoặc Mã SV đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        studentId,
        role: 'student',
        institutionId: req.user.institutionId,
      }
    });

    res.status(201).json({ message: 'Tạo tài khoản sinh viên thành công' });
  } catch (error) {
    console.error('Error in registerStudent:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const linkWallet = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví hoặc chữ ký' });
    }

    const normalizedAddress = normalizeWalletAddress(walletAddress);

    // 2. Kiểm tra ví đã được liên kết với ai khác chưa
    const existingWallet = await prisma.user.findFirst({
      where: { walletAddress: normalizedAddress }
    });
    if (existingWallet) {
      return res.status(400).json({ error: 'Địa chỉ ví này đã được liên kết với một tài khoản khác' });
    }

    // 3. Lấy thông tin user hiện tại
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // 4. Nếu đã liên kết ví rồi thì không cho phép tự ý đổi (Lock mechanism)
    if (user.walletAddress) {
      return res.status(400).json({ error: 'Tài khoản này đã được liên kết với một ví khác. Vui lòng liên hệ Admin để thay đổi.' });
    }

    await verifyAndConsumeWalletNonce({
      user,
      walletAddress: normalizedAddress,
      signature,
      action: 'link',
    });

    // 5. Cập nhật ví
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { walletAddress: normalizedAddress }
    });

    res.json({
      message: 'Liên kết ví thành công',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentId: updatedUser.studentId,
        institutionId: updatedUser.institutionId,
        walletAddress: updatedUser.walletAddress
      }
    });
  } catch (error) {
    console.error('Error in linkWallet:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Lỗi server' });
  }
};

export const unlinkWallet = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    if (!user.walletAddress) {
      return res.status(400).json({ error: 'Tài khoản chưa liên kết ví MetaMask' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { walletAddress: null }
    });

    res.json({
      message: 'Hủy liên kết ví thành công',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentId: updatedUser.studentId,
        institutionId: updatedUser.institutionId,
        walletAddress: updatedUser.walletAddress
      }
    });
  } catch (error) {
    console.error('Error in unlinkWallet:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const loginMetamask = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví hoặc chữ ký' });
    }

    const normalizedAddress = normalizeWalletAddress(walletAddress);

    // 2. Tìm user có ví này
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });
    } catch (dbError) {
      console.error('Database error in loginMetamask:', dbError);
      return res.status(500).json({ error: 'Lỗi server' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Địa chỉ ví này chưa được liên kết với tài khoản nào. Vui lòng đăng nhập bằng Email/Password trước để liên kết ví.' });
    }

    await verifyAndConsumeWalletNonce({
      user,
      walletAddress: normalizedAddress,
      signature,
      action: 'login',
    });

    // 3. Tạo JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, studentId: user.studentId, institutionId: user.institutionId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công bằng MetaMask',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        institutionId: user.institutionId,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Error in loginMetamask:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Lỗi server' });
  }
};
