import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import prisma from './src/services/db.js';
import { getStats } from './src/services/blockchainService.js';

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

let superAdminToken = '';
let instAdminToken = '';
let instAdminEmail = 'uit-admin@university.edu';
let instAdminPassword = ''; // Sẽ lấy từ DB sau khi approve
let institutionId = '';
let contractAddress = '';
let certCode = 'CERT-E2E-999';

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...options.headers };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const fetchOptions = { method, headers };

  if (options.body) {
    if (options.formData) {
      fetchOptions.body = options.formData;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function run() {
  console.log('\n=== Bắt đầu chạy E2E Test: Super Admin & Multi-Institution ===\n');

  // Khởi động server test trên port 5001
  const server = app.listen(PORT);
  await new Promise((resolve) => server.on('listening', resolve));
  console.log(`📡 Test server is running on port ${PORT}`);

  try {
    // 1. Đăng nhập với vai trò Super Admin
    console.log('\n[1] Đăng nhập tài khoản Super Admin');
    const saLogin = await request('POST', '/auth/login', {
      body: { email: 'superadmin@university.edu', password: 'superadmin123' },
    });
    assert(saLogin.ok, 'Super Admin đăng nhập thành công');
    assert(saLogin.data.token, 'Nhận được JWT Token');
    assert(saLogin.data.user.role === 'super_admin', 'Role của user đúng là super_admin');
    superAdminToken = saLogin.data.token;

    // 2. Gửi yêu cầu đăng ký trường học mới (Công khai)
    console.log('\n[2] Gửi yêu cầu đăng ký trường học mới (UIT)');
    const regReq = await request('POST', '/super-admin/institutions', {
      body: {
        name: 'Trường Đại học Công nghệ Thông tin UIT',
        code: 'UIT',
        email: instAdminEmail,
      },
    });
    assert(regReq.status === 201, 'Gửi yêu cầu đăng ký trường học thành công (201)');
    institutionId = regReq.data.data.id;
    assert(institutionId, 'Lấy được Institution ID');

    // 3. Super Admin xem danh sách trường học chờ duyệt
    console.log('\n[3] Super Admin xem danh sách chờ duyệt');
    const pendingList = await request('GET', '/super-admin/pending', { token: superAdminToken });
    assert(pendingList.ok, 'Lấy danh sách chờ duyệt thành công');
    const uitReq = pendingList.data.find(inst => inst.id === institutionId);
    assert(uitReq !== undefined, 'Trường UIT có trong danh sách chờ duyệt');
    assert(uitReq.status === 'PENDING', 'Trạng thái trường UIT ban đầu là PENDING');

    // 4. Super Admin phê duyệt đơn đăng ký (Tự động deploy Smart Contract)
    console.log('\n[4] Super Admin phê duyệt đơn đăng ký của trường UIT (Deploying Contract...)');
    const approveReq = await request('POST', `/super-admin/approve/${institutionId}`, { token: superAdminToken });
    assert(approveReq.ok, 'Phê duyệt thành công');
    contractAddress = approveReq.data.data.institution.contractAddress;
    assert(contractAddress, `Smart Contract đã được deploy tại: ${contractAddress}`);
    assert(approveReq.data.data.institution.status === 'ACTIVE', 'Trạng thái trường được cập nhật thành ACTIVE');

    // Lấy mật khẩu sinh ngẫu nhiên của admin trường từ database để giả lập đăng nhập
    const adminUser = await prisma.user.findFirst({
      where: { institutionId, role: 'institution_admin' }
    });
    assert(adminUser !== null, 'Tài khoản admin trường đã được tạo trong DB');

    // Để lấy mật khẩu test, ta sẽ đổi mật khẩu của tài khoản admin trường này thành 'uitadmin123' cho tiện test
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('uitadmin123', salt);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashed }
    });
    instAdminPassword = 'uitadmin123';

    // 5. Đăng nhập bằng tài khoản Admin của trường UIT
    console.log('\n[5] Đăng nhập bằng tài khoản Admin trường UIT vừa tạo');
    const instLogin = await request('POST', '/auth/login', {
      body: { email: instAdminEmail, password: instAdminPassword },
    });
    assert(instLogin.ok, 'Đăng nhập Admin trường UIT thành công');
    assert(instLogin.data.user.role === 'institution_admin', 'Vai trò đúng là institution_admin');
    assert(instLogin.data.user.institutionId === institutionId, 'Tài khoản trực thuộc trường UIT');
    instAdminToken = instLogin.data.token;

    // 6. Admin trường UIT đăng ký sinh viên mới
    console.log('\n[6] Admin trường UIT đăng ký sinh viên mới');
    const regStudent = await request('POST', '/auth/register-student', {
      token: instAdminToken,
      body: {
        email: 'uitstudent@university.edu',
        password: 'student123',
        name: 'Trần Văn B',
        studentId: 'SV-UIT-001',
      },
    });
    assert(regStudent.status === 201, 'Đăng ký tài khoản sinh viên thành công');

    // Kiểm tra sinh viên trong DB có đúng trực thuộc UIT
    const studentUser = await prisma.user.findUnique({
      where: { email: 'uitstudent@university.edu' }
    });
    assert(studentUser.institutionId === institutionId, 'Sinh viên tự động liên kết với trường UIT');

    // 7. Admin trường UIT lấy danh sách sinh viên
    console.log('\n[7] Admin trường UIT lấy danh sách sinh viên trực thuộc');
    const studentList = await request('GET', '/admin/students', { token: instAdminToken });
    assert(studentList.ok, 'Lấy danh sách sinh viên thành công');
    assert(studentList.data.length >= 1, 'Danh sách sinh viên chứa ít nhất 1 bản ghi');
    assert(studentList.data[0].studentId === 'SV-UIT-001', 'Tìm thấy MSSV vừa tạo');

    // 8. Tạm đình chỉ hoạt động của trường học (Super Admin)
    console.log('\n[8] Super Admin tạm đình chỉ trường UIT');
    const suspendReq = await request('POST', `/super-admin/suspend/${institutionId}`, { token: superAdminToken });
    assert(suspendReq.ok, 'Đã tạm khóa trường học thành công');
    
    // Gửi yêu cầu cấp bằng lúc trường bị khóa -> Phải bị từ chối
    console.log('  Thử cấp bằng khi trường bị khóa...');
    const failIssue = await request('POST', '/certificates/issue', {
      token: instAdminToken,
      body: {
        certificateId: certCode,
        studentId: 'SV-UIT-001',
        studentName: 'Trần Văn B',
        universityName: 'Trường Đại học Công nghệ Thông tin UIT',
        degree: 'Cử nhân',
        major: 'An toàn thông tin',
        graduationYear: '2026',
        gpa: '3.9',
      }
    });
    assert(failIssue.status === 403, 'Từ chối cấp bằng thành công khi trường bị khóa (403)');

    // 9. Kích hoạt lại trường học (Super Admin)
    console.log('\n[9] Super Admin kích hoạt lại trường UIT');
    const activateReq = await request('POST', `/super-admin/activate/${institutionId}`, { token: superAdminToken });
    assert(activateReq.ok, 'Kích hoạt lại trường thành công');

    console.log('\n=== E2E Test Hoàn Thành Với Kết Quả Tốt! ===\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Đóng server test
    server.close();
    await prisma.$disconnect();
  }
}

// Cần import bcrypt động để xử lý mật khẩu test
import bcrypt from 'bcrypt';
run().catch(console.error);
