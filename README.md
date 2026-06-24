# Blockchain Certificate Management System

Hệ thống quản lý, cấp phát và xác minh văn bằng số phi tập trung sử dụng công nghệ Blockchain (Ethereum/Hardhat) và IPFS (Pinata).

## Kiến Trúc Hệ Thống

Dự án bao gồm 3 phần chính:
1. **Blockchain (`bc/`)**: Smart Contract viết bằng Solidity, test và deploy bằng Hardhat.
2. **Backend (`be/`)**: Node.js + Express REST API, PostgreSQL (Prisma), giao tiếp với IPFS (Pinata) và tương tác với Smart Contract bằng ethers.js.
3. **Frontend (`fe/`)**: React.js + Vite, giao diện người dùng chia làm 3 phân hệ (Công khai, Sinh viên, Admin).

## Quick Start (Dùng `run_all.py`)

```bash
python run_all.py
```
Script sẽ mở 3 cửa sổ CMD riêng cho Blockchain Node, Backend, Frontend.

---

## Hướng Dẫn Cài Đặt và Chạy Dự Án

### Yêu cầu hệ thống:
- Node.js (v18+)
- PostgreSQL (chạy ở local, port mặc định 5432)
- Khóa API của Pinata (để lưu trữ IPFS)

### Bước 1: Khởi động Blockchain Local Node & Deploy
1. Mở terminal, đi tới thư mục `bc/`:
   ```bash
   cd bc
   npm install
   ```
2. Khởi động mạng Hardhat cục bộ:
   ```bash
   npx hardhat node
   ```
   *(Để terminal này mở liên tục)*

3. Mở một terminal khác, đi tới thư mục `bc/` và deploy hợp đồng:
   ```bash
   cd bc
   npx hardhat run scripts/deploy.js --network localhost
   ```

### Bước 2: Chạy Backend Server
1. Đi tới thư mục `be/`:
   ```bash
   cd be
   npm install
   ```
2. Cấu hình file `.env` (copy từ `.env.example`):
   ```bash
   cp .env.example .env
   ```
   - Điền Pinata JWT vào `PINATA_JWT`
   - Điền `DATABASE_URL` cho PostgreSQL
   - Nếu deploy lại contract, cập nhật `CONTRACT_ADDRESS`
3. Chạy Prisma migration:
   ```bash
   npx prisma migrate dev
   ```
4. Khởi tạo dữ liệu mẫu (Admin & Student accounts):
   ```bash
   node seed.js
   ```
   *Tài khoản Admin: admin@university.edu / admin123*
   *Tài khoản Student: student@university.edu / student123*
5. Khởi động server (port 5000):
   ```bash
   npm run dev
   ```

### Bước 3: Chạy Frontend (React)
1. Mở terminal mới, đi tới thư mục `fe/`:
   ```bash
   cd fe
   npm install
   ```
2. Khởi động Vite server:
   ```bash
   npm run dev
   ```
3. Truy cập: `http://localhost:5173`

---

## API Endpoints

### Health Check
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health` | Kiểm tra DB, RPC, IPFS, Contract |

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/login` | - | Đăng nhập email/password |
| POST | `/login-metamask/nonce` | - | Lấy nonce đăng nhập MetaMask |
| POST | `/login-metamask` | - | Đăng nhập MetaMask |
| POST | `/link-wallet/nonce` | JWT | Lấy nonce liên kết ví |
| POST | `/link-wallet` | JWT | Liên kết ví MetaMask |
| POST | `/unlink-wallet` | JWT | Hủy liên kết ví |
| POST | `/register-admin` | JWT+Admin | Tạo tài khoản admin |
| POST | `/register-student` | JWT+Admin | Tạo tài khoản sinh viên |

### Certificates (`/api/certificates`)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/verify/:id` | Public | Xác minh văn bằng công khai |
| GET | `/student/:studentId` | JWT+Self/Admin | DS văn bằng của sinh viên |
| POST | `/issue` | JWT+Admin+File | Cấp phát văn bằng mới |
| POST | `/revoke/:id` | JWT+Admin | Thu hồi văn bằng |
| GET | `/stats` | JWT+Admin | Thống kê dashboard |

### Admin (`/api/admin`) — tất cả đều yêu cầu JWT+Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/certificates` | Danh sách văn bằng (phân trang, lọc, tìm kiếm) |
| GET | `/certificates/failed` | DS văn bằng lỗi cần reconcile |
| GET | `/certificates/:id` | Chi tiết văn bằng (kèm chain proof, logs) |
| POST | `/certificates/:id/reconcile` | Retry/reconcile văn bằng lỗi |
| GET | `/audit-logs` | Audit logs (phân trang, lọc) |
| GET | `/verification-logs` | Verification logs (phân trang, lọc) |
| GET | `/dashboard` | Dashboard tổng hợp (DB + Blockchain) |

---

## Xử Lý Lỗi & Reconcile

Khi cấp phát văn bằng, nếu IPFS upload thành công nhưng blockchain fail, văn bằng được gắn trạng thái `FAILED` hoặc `IPFS_UPLOADED`.

**Cách reconcile:**
1. Gọi `GET /api/admin/certificates/failed` để lấy danh sách
2. Gọi `POST /api/admin/certificates/:id/reconcile` để thử lại giao dịch blockchain
3. Hệ thống sẽ kiểm tra nếu đã tồn tại trên chain hoặc thực hiện issue mới

---

## Cơ Chế Authentication & Metamask Login

### Tổng Quan
Hệ thống hỗ trợ **2 cách đăng nhập** cho mỗi người dùng (Admin & Sinh viên):
1. **Email/Password** — Đăng nhập truyền thống
2. **Metamask (Web3 Wallet)** — Đăng nhập phi tập trung

**Cùng một tài khoản** có thể sử dụng cả 2 phương thức đăng nhập.

### Quy Trình Liên Kết Ví
1. Đăng nhập bằng Email trước
2. Gọi `POST /api/auth/link-wallet/nonce` → nhận nonce
3. Ký nonce bằng MetaMask
4. Gọi `POST /api/auth/link-wallet` với signature

### Setup Metamask Admin Login
1. Thêm `walletAddress` cho admin trong `be/seed.js`
2. Cập nhật `be/.env` với `ADMIN_PRIVATE_KEY`
3. Cấp `ISSUER_ROLE` trong deploy script
4. Deploy lại contract
5. Seed dữ liệu

---

## Tech Stack
- **Smart Contract**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Backend**: Express, Prisma (PostgreSQL), bcrypt, jsonwebtoken, pinata SDK, ethers.js
- **Frontend**: React 18, Vite, react-router-dom, react-hot-toast, framer-motion, lucide-react
