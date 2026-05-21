import pkgClient from '@prisma/client';
const { PrismaClient } = pkgClient;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('✅ Bắt đầu kết nối database qua Prisma để seed dữ liệu...');

    // Xóa dữ liệu cũ trong bảng User
    const deleted = await prisma.user.deleteMany({});
    console.log(`🧹 Đã xóa ${deleted.count} người dùng cũ.`);

    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const studentPasswordHash = await bcrypt.hash('student123', salt);

    // Tạo Admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@university.edu',
        password: adminPasswordHash,
        name: 'Phòng Đào Tạo',
        role: 'admin',
        walletAddress: null
      }
    });
    console.log(`✅ Đã tạo tài khoản Admin: ${admin.email} / admin123`);

    // Tạo Sinh viên
    const student = await prisma.user.create({
      data: {
        email: 'student@university.edu',
        password: studentPasswordHash,
        name: 'Nguyễn Văn A',
        studentId: 'SV2024001',
        role: 'student',
        walletAddress: null
      }
    });
    console.log(`✅ Đã tạo tài khoản Sinh viên: ${student.email} / student123 (MSSV: ${student.studentId})`);

    console.log('\n🎉 Quá trình seed dữ liệu thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
