import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../services/db.js';
import * as blockchain from '../services/blockchainService.js';
import * as emailService from '../services/emailService.js';

/**
 * Đăng ký trường/học viện mới (Công khai)
 */
export const registerInstitutionRequest = async (req, res) => {
  try {
    const { name, code, email } = req.body;

    if (!name || !code || !email) {
      return res.status(400).json({ error: 'Thiếu thông tin đăng ký (name, code, email)' });
    }

    // Kiểm tra mã trường đã tồn tại
    const existingCode = await prisma.institution.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(409).json({ error: 'Mã trường này đã tồn tại trong hệ thống' });
    }

    // Kiểm tra email đã được sử dụng chưa
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email liên hệ này đã được đăng ký tài khoản' });
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        code,
        email,
        status: 'PENDING',
      },
    });

    // Gửi email thông báo cho Super Admin duyệt
    await emailService.sendNewRegistrationEmail(name, code);

    res.status(201).json({
      message: 'Gửi yêu cầu đăng ký thành công. Đang chờ Super Admin phê duyệt.',
      data: institution,
    });
  } catch (error) {
    console.error('Error in registerInstitutionRequest:', error);
    res.status(500).json({ error: 'Không thể đăng ký trường học mới' });
  }
};

/**
 * Lấy danh sách các trường chờ phê duyệt (Super Admin)
 */
export const getPendingInstitutions = async (req, res) => {
  try {
    const pending = await prisma.institution.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pending);
  } catch (error) {
    console.error('Error in getPendingInstitutions:', error);
    res.status(500).json({ error: 'Không thể tải danh sách trường chờ phê duyệt' });
  }
};

/**
 * Lấy tất cả các trường học (Super Admin)
 */
export const getInstitutions = async (req, res) => {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, certificates: true } },
      },
    });
    res.json(institutions);
  } catch (error) {
    console.error('Error in getInstitutions:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách trường học' });
  }
};

/**
 * Phê duyệt đơn đăng ký của trường học (Super Admin)
 * Tự động deploy smart contract, tạo tài khoản Admin trường và gửi email thông báo
 */
export const approveInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      return res.status(404).json({ error: 'Không tìm thấy trường học' });
    }

    if (institution.status !== 'PENDING') {
      return res.status(400).json({ error: 'Yêu cầu này đã được xử lý trước đó' });
    }

    // 1. Deploy Smart Contract tự động cho trường học
    console.log(`[SuperAdmin] Bắt đầu deploy hợp đồng cho trường: ${institution.name}`);
    const contractAddress = await blockchain.deployNewContract(institution.name);

    // 2. Tạo tài khoản mật khẩu ngẫu nhiên cho admin trường
    const randomPassword = crypto.randomBytes(6).toString('hex'); // 12 ký tự ngẫu nhiên
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // Sử dụng transaction để cập nhật DB
    const [updatedInstitution, adminUser] = await prisma.$transaction([
      prisma.institution.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          contractAddress,
          chainId: Number(process.env.CHAIN_ID || 31337),
        },
      }),
      prisma.user.create({
        data: {
          email: institution.email,
          password: hashedPassword,
          name: `Quản trị ${institution.name}`,
          role: 'institution_admin',
          institutionId: id,
        },
      }),
    ]);

    // 3. Ghi audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: 'INSTITUTION_APPROVED',
        targetType: 'Institution',
        targetId: id,
        metadata: {
          name: institution.name,
          contractAddress,
          adminEmail: institution.email,
        },
      },
    });

    // 4. Gửi email cung cấp tài khoản & địa chỉ contract cho trường
    await emailService.sendInstitutionApprovedEmail(
      institution.email,
      institution.name,
      randomPassword,
      contractAddress
    );

    res.json({
      message: 'Phê duyệt trường thành công và đã gửi email tài khoản',
      data: {
        institution: updatedInstitution,
        adminUser: { id: adminUser.id, email: adminUser.email },
      },
    });
  } catch (error) {
    console.error('Error in approveInstitution:', error);
    res.status(500).json({ error: 'Phê duyệt đơn đăng ký thất bại' });
  }
};

/**
 * Tạm đình chỉ hoạt động của một trường (Super Admin)
 */
export const suspendInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      return res.status(404).json({ error: 'Không tìm thấy trường học' });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: 'INSTITUTION_SUSPENDED',
        targetType: 'Institution',
        targetId: id,
        metadata: { name: institution.name },
      },
    });

    res.json({ message: 'Đã tạm khóa trường thành công', data: updated });
  } catch (error) {
    console.error('Error in suspendInstitution:', error);
    res.status(500).json({ error: 'Không thể tạm khóa trường học' });
  }
};

/**
 * Kích hoạt lại hoạt động của một trường (Super Admin)
 */
export const activateInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      return res.status(404).json({ error: 'Không tìm thấy trường học' });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: 'INSTITUTION_ACTIVATED',
        targetType: 'Institution',
        targetId: id,
        metadata: { name: institution.name },
      },
    });

    res.json({ message: 'Đã kích hoạt trường thành công', data: updated });
  } catch (error) {
    console.error('Error in activateInstitution:', error);
    res.status(500).json({ error: 'Không thể kích hoạt trường học' });
  }
};

/**
 * Thống kê tổng hợp Super Admin Dashboard
 */
export const getSuperAdminDashboard = async (req, res) => {
  try {
    const [
      totalInstitutions,
      pendingInstitutions,
      activeInstitutions,
      totalCertificates,
      totalUsers,
      totalVerifications,
      recentInstitutions,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.institution.count(),
      prisma.institution.count({ where: { status: 'PENDING' } }),
      prisma.institution.count({ where: { status: 'ACTIVE' } }),
      prisma.certificate.count(),
      prisma.user.count(),
      prisma.verificationLog.count(),
      prisma.institution.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          actor: { select: { name: true, email: true, role: true } },
        },
      }),
    ]);

    res.json({
      stats: {
        totalInstitutions,
        pendingInstitutions,
        activeInstitutions,
        totalCertificates,
        totalUsers,
        totalVerifications,
      },
      recentInstitutions,
      recentAuditLogs,
    });
  } catch (error) {
    console.error('Error in getSuperAdminDashboard:', error);
    res.status(500).json({ error: 'Không thể lấy dữ liệu thống kê hệ thống' });
  }
};
