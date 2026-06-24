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

