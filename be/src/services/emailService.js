import nodemailer from 'nodemailer';

const isProduction = process.env.NODE_ENV === 'production';

// Cấu hình transporter với fallback
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'no-reply@blockchain-certs.edu';

  if (!transporter) {
    console.log('\n✉️  [EMAIL FALLBACK - CẤU HÌNH SMTP TRỐNG]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Text): ${text || 'N/A'}`);
    console.log(`Body (HTML): ${html}`);
    console.log('-----------------------------------------\n');
    return { success: true, fallback: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`✉️  Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email via SMTP:', error);
    // Vẫn log ra console nếu gửi SMTP lỗi để dev không bị gián đoạn
    console.log('\n✉️  [EMAIL FALLBACK - LỖI SMTP]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML): ${html}`);
    console.log('-----------------------------------------\n');
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email thông báo cho Super Admin khi có trường học mới đăng ký.
 */
export const sendNewRegistrationEmail = async (institutionName, code) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@university.edu';
  const subject = `[Yêu cầu Đăng ký] Trường học mới: ${institutionName}`;
  const html = `
    <h2>Yêu cầu Đăng ký Trường học Mới</h2>
    <p>Chào Super Admin,</p>
    <p>Hệ thống nhận được yêu cầu đăng ký tham gia mạng lưới cấp phát văn bằng:</p>
    <ul>
      <li><strong>Tên trường:</strong> ${institutionName}</li>
      <li><strong>Mã trường:</strong> ${code}</li>
    </ul>
    <p>Vui lòng đăng nhập vào trang quản trị Super Admin để duyệt và khởi tạo hợp đồng cho đơn vị này.</p>
    <br/>
    <p>Trân trọng,<br/>Hệ thống Blockchain Certificate</p>
  `;
  const text = `Yêu cầu Đăng ký Trường học Mới. Tên trường: ${institutionName}, Mã trường: ${code}. Vui lòng duyệt trong Super Admin dashboard.`;

  return sendEmail({ to: superAdminEmail, subject, html, text });
};

/**
 * Gửi email tài khoản cho Institution Admin sau khi được Super Admin duyệt.
 */
export const sendInstitutionApprovedEmail = async (email, name, password, contractAddress) => {
  const subject = `[Đã Phê Duyệt] Tài khoản quản lý văn bằng trường ${name}`;
  const html = `
    <h2>Phê Duyệt Đơn Đăng Ký Trường Học Thành Công</h2>
    <p>Chào Ban Quản trị trường <strong>${name}</strong>,</p>
    <p>Đơn đăng ký của bạn đã được Super Admin phê duyệt thành công. Hệ thống đã triển khai một hợp đồng thông minh (Smart Contract) riêng cho đơn vị của bạn.</p>
    <p>Dưới đây là thông tin tài khoản đăng nhập của Phòng Đào Tạo:</p>
    <ul>
      <li><strong>Địa chỉ truy cập:</strong> http://localhost:5173/login</li>
      <li><strong>Tài khoản đăng nhập (Email):</strong> ${email}</li>
      <li><strong>Mật khẩu tạm thời:</strong> <code>${password}</code></li>
      <li><strong>Smart Contract Address:</strong> <code>${contractAddress}</code></li>
    </ul>
    <p><em>Lưu ý: Vui lòng thay đổi mật khẩu sau khi đăng nhập lần đầu tiên để đảm bảo bảo mật.</em></p>
    <br/>
    <p>Trân trọng,<br/>Hệ thống quản lý Blockchain Certificate</p>
  `;
  const text = `Phê duyệt thành công trường ${name}. Đăng nhập: ${email} / Mật khẩu: ${password}. Contract: ${contractAddress}`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Gửi email thông báo/xác nhận khi thu hồi văn bằng.
 */
export const sendCertificateRevokedEmail = async (studentEmail, certCode, reason) => {
  const subject = `[THÔNG BÁO THU HỒI] Văn bằng mã số ${certCode}`;
  const html = `
    <h2 style="color: #dc2626;">Thông báo Thu Hồi Văn Bằng Số</h2>
    <p>Kính gửi quý học viên/sinh viên,</p>
    <p>Hệ thống Blockchain Certificate thông báo: Văn bằng số của bạn đã bị đơn vị cấp phát thu hồi on-chain.</p>
    <ul>
      <li><strong>Mã văn bằng:</strong> ${certCode}</li>
      <li><strong>Lý do thu hồi:</strong> ${reason}</li>
      <li><strong>Thời điểm thu hồi:</strong> ${new Date().toLocaleString('vi-VN')}</li>
    </ul>
    <p>Trạng thái văn bằng hiện tại trên Blockchain đã được cập nhật thành <strong>REVOKED</strong> (Không còn giá trị pháp lý).</p>
    <p>Nếu có thắc mắc, vui lòng liên hệ trực tiếp với Phòng Đào tạo của trường cấp bằng để được giải quyết.</p>
    <br/>
    <p>Trân trọng,<br/>Hệ thống Blockchain Certificate</p>
  `;
  const text = `Văn bằng số mã ${certCode} của bạn đã bị thu hồi on-chain. Lý do: ${reason}.`;

  // Gửi mail cho cả sinh viên (nếu có email) và Super Admin làm audit copy
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@university.edu';
  const recipients = [superAdminEmail];
  if (studentEmail) {
    recipients.push(studentEmail);
  }

  return sendEmail({ to: recipients.join(','), subject, html, text });
};
