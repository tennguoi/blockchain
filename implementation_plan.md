# 🎓 Hệ Thống Cấp Phát & Xác Minh Văn Bằng Blockchain

## Tổng Quan

Xây dựng một DApp (Decentralized Application) cho phép:
- **Admin (Trường ĐH)**: Đăng ký / cấp phát văn bằng số lên blockchain
- **Sinh viên**: Xem và chia sẻ văn bằng của mình
- **Nhà tuyển dụng / Người dùng**: Xác minh tính xác thực của văn bằng qua mã số hoặc QR code

---

## Kiến Trúc Hệ Thống

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React.js)                       │
│  Module Admin | Module Sinh Viên | Module Xác Minh Công Khai  │
└───────────────────────┬──────────────────────────────────────┘
                        │ REST API + ethers.js
┌───────────────────────▼──────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                   │
│    Auth (JWT) | Upload IPFS | API Gateway | Email Service     │
└──────────┬────────────────────────────────┬──────────────────┘
           │ Pinata SDK                     │ ethers.js
┌──────────▼──────────┐      ┌─────────────▼──────────────────┐
│   IPFS (via Pinata) │      │  BLOCKCHAIN (Hardhat / Sepolia)  │
│  Lưu file PDF/image │      │    Smart Contract (Solidity)     │
│  Trả về IPFS CID    │      │    Lưu CID + metadata on-chain   │
└─────────────────────┘      └────────────────────────────────┘
```

---

## Cấu Trúc Thư Mục

```
c:\Blockchain2\
├── blockchain/              # Hardhat project
│   ├── contracts/
│   │   └── CertificateRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── certificate.test.js
│   └── hardhat.config.js
│
├── backend/                 # Node.js + Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── ipfsService.js   (Pinata)
│   │   │   └── blockchainService.js
│   │   ├── models/             (MongoDB schemas)
│   │   └── app.js
│   ├── .env
│   └── package.json
│
└── frontend/                # React.js (Vite)
    ├── src/
    │   ├── pages/
    │   │   ├── AdminDashboard/
    │   │   ├── StudentPortal/
    │   │   └── VerifyPage/
    │   ├── components/
    │   ├── services/
    │   │   ├── api.js
    │   │   └── web3.js
    │   └── App.jsx
    └── package.json
```

---

## Các Giai Đoạn Thực Hiện

### 🔵 GIAI ĐOẠN 1: Smart Contract (Solidity + Hardhat)
**Thời gian ước tính: 30-45 phút**

#### Công việc:
1. Khởi tạo Hardhat project
2. Viết smart contract `CertificateRegistry.sol`:
   - Struct `Certificate` lưu: studentId, studentName, degree, major, graduationDate, ipfsCID, issuedAt, isValid
   - Role-based: `onlyAdmin` modifier
   - Functions: `issueCertificate()`, `verifyCertificate()`, `revokeCertificate()`, `getCertificate()`
   - Events: `CertificateIssued`, `CertificateRevoked`
   - Mapping: `certificateId => Certificate`
3. Viết unit tests với Hardhat + Chai
4. Deploy lên Hardhat local network (sau đó Sepolia testnet)

#### Files:
- [NEW] `blockchain/contracts/CertificateRegistry.sol`
- [NEW] `blockchain/scripts/deploy.js`
- [NEW] `blockchain/test/certificate.test.js`
- [NEW] `blockchain/hardhat.config.js`
- [NEW] `blockchain/package.json`

---

### 🟢 GIAI ĐOẠN 2: Backend (Node.js + Express + Pinata)
**Thời gian ước tính: 45-60 phút**

#### Công việc:
1. Khởi tạo Express server
2. Kết nối MongoDB Atlas (lưu users, certificate metadata cache)
3. Tích hợp Pinata SDK để upload PDF/image lên IPFS
4. Kết nối smart contract với ethers.js
5. API endpoints:
   - `POST /api/auth/login` - Admin/Student login (JWT)
   - `POST /api/certificates/issue` - Admin cấp bằng (upload IPFS → call smart contract)
   - `GET /api/certificates/:id` - Lấy thông tin bằng
   - `GET /api/certificates/student/:studentId` - Lấy bằng của sinh viên
   - `POST /api/certificates/verify` - Xác minh bằng (ai cũng dùng được)
   - `DELETE /api/certificates/:id/revoke` - Thu hồi bằng (Admin)
   - `GET /api/admin/stats` - Thống kê dashboard

#### Files:
- [NEW] `backend/src/app.js`
- [NEW] `backend/src/routes/` (auth, certificates, admin)
- [NEW] `backend/src/controllers/`
- [NEW] `backend/src/services/ipfsService.js`
- [NEW] `backend/src/services/blockchainService.js`
- [NEW] `backend/src/middleware/auth.js`
- [NEW] `backend/src/models/` (User, CertificateCache)
- [NEW] `backend/.env`
- [NEW] `backend/package.json`

---

### 🟡 GIAI ĐOẠN 3: Frontend (React + Vite)
**Thời gian ước tính: 60-90 phút**

#### Công việc:
1. Khởi tạo Vite + React project
2. Cài đặt: ethers.js, axios, react-router-dom, react-hot-toast, qrcode.react, framer-motion
3. **Module Admin Dashboard**:
   - Login page (JWT auth)
   - Cấp phát văn bằng mới (form + file upload)
   - Danh sách văn bằng đã cấp
   - Thu hồi văn bằng
   - Thống kê tổng quan
4. **Module Sinh Viên**:
   - Login sinh viên
   - Xem văn bằng của mình
   - Download PDF / chia sẻ link xác minh
   - QR code xác minh
5. **Module Xác Minh Công Khai** (không cần login):
   - Nhập mã bằng hoặc scan QR
   - Kết quả: hiển thị thông tin bằng từ blockchain + IPFS

#### Design:
- Dark theme với màu xanh blockchain (#0ea5e9, #6366f1)
- Glassmorphism cards
- Smooth animations (Framer Motion)
- Responsive design
- QR code generation

---

### 🔴 GIAI ĐOẠN 4: Tích Hợp & Deploy
**Thời gian ước tính: 30-45 phút**

#### Công việc:
1. Deploy smart contract lên Sepolia testnet
2. Cập nhật contract address vào backend/frontend
3. Test end-to-end flow
4. Viết README với hướng dẫn setup
5. Tạo sample data / seed script

---

## Công Nghệ Sử Dụng

| Lớp | Công nghệ |
|-----|-----------|
| Smart Contract | Solidity ^0.8.20 + OpenZeppelin |
| Blockchain Dev | Hardhat + Hardhat Ignition |
| Backend | Node.js 18+ + Express.js |
| Database | MongoDB Atlas (Mongoose) |
| IPFS Storage | Pinata SDK v2 |
| Blockchain Client | ethers.js v6 |
| Frontend | React 18 + Vite |
| UI Animation | Framer Motion |
| Styling | Vanilla CSS (custom design system) |
| Auth | JWT + bcrypt |
| QR Code | qrcode.react |

---

## Open Questions

> [!IMPORTANT]
> **1. Testnet hay Local?**  
> Deploy smart contract lên Hardhat local (cho dev) hay Sepolia testnet? Cần Alchemy/Infura API key và test ETH từ faucet nếu dùng testnet.

> [!IMPORTANT]
> **2. MongoDB - Local hay Atlas?**  
> Dùng MongoDB Atlas (cloud, cần tạo free account) hay MongoDB local?

> [!IMPORTANT]
> **3. Pinata API Keys**  
> Bạn cần cung cấp Pinata API Key và Secret Key để upload lên IPFS. Tôi sẽ để placeholder trong .env file.

> [!NOTE]
> **4. MetaMask Integration**  
> Frontend có tích hợp MetaMask wallet cho admin không? Hoặc dùng backend wallet (private key trong .env) để ký giao dịch?  
> → Đề xuất: **Backend wallet** (đơn giản hơn, phù hợp cho hệ thống tập trung của trường ĐH)

---

## Verification Plan

### Automated Tests
- Hardhat tests: `npx hardhat test`
- API tests với Postman/Thunder Client

### Manual Verification
1. Admin đăng nhập → tải lên file bằng → cấp phát → thấy transaction hash
2. Sinh viên đăng nhập → thấy bằng → download PDF → xem QR code
3. Người dùng bên ngoài vào trang verify → nhập mã → thấy thông tin bằng hợp lệ
4. Nhập mã bằng không tồn tại → thông báo "không tìm thấy"
