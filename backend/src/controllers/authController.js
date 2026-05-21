import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../services/db.js';
import { ethers } from 'ethers';

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
      { userId: user.id, role: user.role, studentId: user.studentId },
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
      }
    });
  } catch (error) {
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

    const admin = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: 'admin' }
    });

    res.status(201).json({ message: 'Tạo tài khoản admin thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      data: { email, password: hashedPassword, name, studentId, role: 'student' }
    });

    res.status(201).json({ message: 'Tạo tài khoản sinh viên thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const linkWallet = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví hoặc chữ ký' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // 1. Xác thực chữ ký số
    const message = `Tôi xác nhận muốn liên kết ví ${normalizedAddress} với tài khoản ${req.user.userId}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return res.status(400).json({ error: 'Chữ ký số không hợp lệ hoặc không khớp với địa chỉ ví' });
    }

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
        walletAddress: updatedUser.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginMetamask = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Thiếu địa chỉ ví hoặc chữ ký' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // 1. Xác thực chữ ký số
    const message = `Tôi xác nhận đăng nhập vào hệ thống BlockCert bằng ví ${normalizedAddress}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return res.status(400).json({ error: 'Chữ ký số không hợp lệ' });
    }

    // 2. Tìm user có ví này
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      return res.status(404).json({ error: 'Địa chỉ ví này chưa được liên kết với tài khoản nào. Vui lòng đăng nhập bằng Email/Password trước để liên kết ví.' });
    }

    // 3. Tạo JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, studentId: user.studentId },
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
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

