# 🎓 Blockchain Certificate Management System

Hệ thống quản lý, cấp phát và xác minh văn bằng số phi tập trung sử dụng công nghệ Blockchain (Ethereum/Hardhat) và IPFS (Pinata).

## Kiến Trúc Hệ Thống

Dự án bao gồm 3 phần chính:
1. **Blockchain (`/blockchain`)**: Smart Contract viết bằng Solidity, test và deploy bằng Hardhat.
2. **Backend (`/backend`)**: Node.js + Express REST API, xử lý Authentication, giao tiếp với IPFS (Pinata) và tương tác với Smart Contract bằng ethers.js.
3. **Frontend (`/frontend`)**: React.js + Vite, giao diện người dùng chia làm 3 phân hệ (Công khai, Sinh viên, Admin).

---

## 🚀 Hướng Dẫn Cài Đặt và Chạy Dự Án

### Yêu cầu hệ thống:
- Node.js (v18+)
- MongoDB chạy ở local (port mặc định 27017)
- Khóa API của Pinata (để lưu trữ IPFS)

---

### Bước 1: Khởi động Blockchain Local Node & Deploy
1. Mở terminal, đi tới thư mục `blockchain`:
   ```bash
   cd blockchain
   npm install
   ```
2. Khởi động mạng Hardhat cục bộ:
   ```bash
   npx hardhat node
   ```
   *(Để terminal này mở liên tục)*

3. Mở một terminal khác, đi tới thư mục `blockchain` và deploy hợp đồng:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```

---

### Bước 2: Chạy Backend Server
1. Đi tới thư mục `backend`:
   ```bash
   cd backend
   npm install
   ```
2. Cấu hình file `.env`:
   - Đảm bảo bạn đã có file `.env` (copy từ `.env.example` hoặc mẫu có sẵn).
   - Điền Pinata JWT của bạn vào `PINATA_JWT`.
   - Nếu bạn deploy lại contract, hãy cập nhật `CONTRACT_ADDRESS` với địa chỉ mới.
3. Khởi tạo dữ liệu mẫu (Admin & Student accounts):
   ```bash
   node seed.js
   ```
   *Tài khoản Admin: admin@university.edu / admin123*  
   *Tài khoản Student: student@university.edu / student123*

4. Khởi động server (sẽ chạy ở port 5000):
   ```bash
   npm run dev
   ```

---

### Bước 3: Chạy Frontend (React)
1. Mở terminal mới, đi tới thư mục `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi động Vite server:
   ```bash
   npm run dev
   ```
3. Truy cập: `http://localhost:5173`

---

## 🛠️ Quy Trình Sử Dụng (End-to-End Flow)

1. **Đăng nhập Admin**: Truy cập `/login` với tài khoản Admin.
2. **Cấp phát bằng**: Trong Admin Dashboard, điền thông tin và tải lên 1 file PDF (hoặc ảnh) giả định. Nhấn cấp phát.
   - *Hệ thống sẽ upload file lên IPFS.*
   - *Upload JSON metadata lên IPFS.*
   - *Gửi giao dịch lên Blockchain.*
3. **Đăng nhập Sinh viên**: Đăng nhập bằng tài khoản Student. Bạn sẽ thấy văn bằng vừa được cấp cùng mã QR.
4. **Xác minh công khai**: Bất kỳ ai vào trang chủ `/verify`, nhập ID văn bằng (ví dụ `VB-2024-001`) để hệ thống kiểm tra dữ liệu Blockchain và xác nhận.

## Tech Stack
- **Smart Contract**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Backend**: Express, Mongoose, bcrypt, jsonwebtoken, pinata SDK, ethers.js
- **Frontend**: React 18, Vite, react-router-dom, react-hot-toast, framer-motion, lucide-react
