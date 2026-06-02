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

---

## 🔐 Cơ Chế Authentication & Metamask Login

### Tổng Quan

Hệ thống hỗ trợ **2 cách đăng nhập** cho mỗi người dùng (Admin & Sinh viên):
1. **Email/Password** - Đăng nhập truyền thống
2. **Metamask (Web3 Wallet)** - Đăng nhập phi tập trung

### Quan Trọng ⚠️

**Cùng một tài khoản** có thể sử dụng cả 2 phương thức đăng nhập:
- Admin đăng nhập Email → Tạo JWT với `role: 'admin'`
- Admin liên kết ví Metamask → Đăng nhập qua Metamask → Vẫn lấy JWT với `role: 'admin'` (cùng tài khoản)

```
┌─────────────────────────────────────────┐
│  ADMIN TÀI KHOẢN (userId = 1)           │
├─────────────────────────────────────────┤
│                                         │
│  ├─ Email/Password:                     │
│  │  admin@university.edu / admin123    │
│  │  → JWT { role: 'admin' }             │
│  │                                     │
│  └─ Metamask Wallet:                    │
│     0xAAA... (sau khi liên kết)         │
│     → JWT { role: 'admin' }             │
│     ✅ CÙ NG TÀI KHOẢN (userId = 1)   │
│                                         │
└─────────────────────────────────────────┘
```

### Quy Trình Liên Kết Ví (Link Wallet)

1. **Đăng nhập bằng Email trước** (để lấy JWT token)
2. **Gọi endpoint `/api/auth/link-wallet`**
   ```bash
   POST /api/auth/link-wallet
   Headers: Authorization: Bearer <JWT_TOKEN>
   Body: {
     "walletAddress": "0xAAA...",
     "signature": "<WEB3_SIGNATURE>"
   }
   ```
3. **System xác minh chữ ký** (sử dụng ethers.js)
4. **Cập nhật walletAddress** vào database
5. **Từ bây giờ có thể đăng nhập qua Metamask**

### Ưu Điểm & Bảo Vệ

| Tính Năng | Chi Tiết |
|-----------|---------|
| **Liên kết 1 lần** | Mỗi user chỉ liên kết được 1 ví, không thể đổi tùy tiện (phòng admin mất tài khoản) |
| **Chữ ký số** | Không lưu private key trên server, chỉ xác minh chữ ký |
| **Cùng quyền** | Dù đăng nhập Email hay Metamask, role vẫn như nhau (admin/student) |
| **Blockchain Rights** | Admin role trên Backend **khác** với ADMIN_ROLE trên Smart Contract |

### Phân Biệt: Backend Admin vs Blockchain ADMIN_ROLE

```
┌──────────────────────────────────────────────────┐
│ Backend Authentication (JWT)                     │
├──────────────────────────────────────────────────┤
│ - Check: role = 'admin' trong JWT                │
│ - Kiểm soát: Quyền truy cập API (issue cert)    │
│ - Nơi lưu: Database (Prisma/PostgreSQL)         │
│                                                  │
├──────────────────────────────────────────────────┤
│ Blockchain Authorization (Smart Contract)       │
├──────────────────────────────────────────────────┤
│ - Check: hasRole(ADMIN_ROLE) từ AccessControl   │
│ - Kiểm soát: Quyền thi hành hàm trên contract   │
│ - Nơi lưu: Ethereum Storage (Blockchain)        │
│ - Cấp bởi: addIssuer() function                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Setup Metamask Admin Login

**Để admin có thể đăng nhập qua Metamask:**

1. Cập nhật `backend/seed.js` - thêm walletAddress cho admin:
   ```javascript
   const admin = await prisma.user.create({
     data: {
       email: 'admin@university.edu',
       password: adminPasswordHash,
       name: 'Phòng Đào Tạo',
       role: 'admin',
       walletAddress: '0x...' // ← Metamask address của admin
     }
   });
   ```

2. Cập nhật `backend/.env`:
   ```env
   ADMIN_WALLET_ADDRESS=0x...
   ADMIN_PRIVATE_KEY=...  # Dùng để ký giao dịch blockchain
   ```

3. Cập nhật `blockchain/scripts/deploy.js` - cấp ADMIN_ROLE cho wallet:
   ```javascript
   // Thêm hàm này
   async function grantAdminRoleToWallet(registry, walletAddress) {
     console.log(`⏳ Granting ADMIN_ROLE to ${walletAddress}...`);
     const tx = await registry.addIssuer(walletAddress);
     await tx.wait();
     console.log(`✅ ADMIN_ROLE granted`);
   }
   
   // Trong main(), sau khi deploy:
   await grantAdminRoleToWallet(registry, process.env.ADMIN_WALLET_ADDRESS);
   ```

4. Deploy lại:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

5. Seed dữ liệu:
   ```bash
   node backend/seed.js
   ```

---

## Tech Stack
- **Smart Contract**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Backend**: Express, Mongoose, bcrypt, jsonwebtoken, pinata SDK, ethers.js
- **Frontend**: React 18, Vite, react-router-dom, react-hot-toast, framer-motion, lucide-react
