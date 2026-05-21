const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CertificateRegistry", function () {
  // ============================================================
  //                    FIXTURES
  // ============================================================

  /**
   * @dev Deploy contract với trạng thái ban đầu
   */
  async function deployCertificateRegistryFixture() {
    const [owner, issuer1, issuer2, student1, student2, publicUser] =
      await ethers.getSigners();

    const INSTITUTION_NAME = "Đại học Blockchain Test";

    const CertificateRegistry = await ethers.getContractFactory(
      "CertificateRegistry"
    );
    const registry = await CertificateRegistry.deploy(INSTITUTION_NAME);

    // Tính roles
    const ADMIN_ROLE = await registry.ADMIN_ROLE();
    const ISSUER_ROLE = await registry.ISSUER_ROLE();
    const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

    return {
      registry,
      owner,
      issuer1,
      issuer2,
      student1,
      student2,
      publicUser,
      INSTITUTION_NAME,
      ADMIN_ROLE,
      ISSUER_ROLE,
      DEFAULT_ADMIN_ROLE,
    };
  }

  /**
   * @dev Sample certificate data
   */
  const sampleCert = {
    certificateId: "VB-2024-001",
    studentId: "SV20200001",
    studentName: "Nguyen Van An",
    universityName: "Dai hoc Blockchain Viet Nam",
    degree: "Cu nhan",
    major: "Cong nghe thong tin",
    graduationYear: "2024",
    gpa: "3.75",
    ipfsCID: "QmTest1234567890abcdef",
    ipfsMetadataCID: "QmMeta1234567890abcdef",
  };

  const sampleCert2 = {
    certificateId: "VB-2024-002",
    studentId: "SV20200001", // same student, second cert
    studentName: "Nguyen Van An",
    universityName: "Dai hoc Blockchain Viet Nam",
    degree: "Thac si",
    major: "Khoa hoc may tinh",
    graduationYear: "2026",
    gpa: "3.90",
    ipfsCID: "QmTest9876543210fedcba",
    ipfsMetadataCID: "QmMeta9876543210fedcba",
  };

  // ============================================================
  //              1. DEPLOYMENT TESTS
  // ============================================================

  describe("1. Deployment", function () {
    it("Nên deploy với tên tổ chức đúng", async function () {
      const { registry, INSTITUTION_NAME } = await loadFixture(
        deployCertificateRegistryFixture
      );
      expect(await registry.institutionName()).to.equal(INSTITUTION_NAME);
    });

    it("Nên gán ADMIN_ROLE cho deployer", async function () {
      const { registry, owner, ADMIN_ROLE } = await loadFixture(
        deployCertificateRegistryFixture
      );
      expect(await registry.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Nên gán ISSUER_ROLE cho deployer", async function () {
      const { registry, owner, ISSUER_ROLE } = await loadFixture(
        deployCertificateRegistryFixture
      );
      expect(await registry.hasRole(ISSUER_ROLE, owner.address)).to.be.true;
    });

    it("Nên có totalCertificates = 0 khi mới deploy", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);
      expect(await registry.totalCertificates()).to.equal(0);
    });

    it("Nên revert nếu institution name rỗng", async function () {
      const CertificateRegistry = await ethers.getContractFactory(
        "CertificateRegistry"
      );
      await expect(CertificateRegistry.deploy("")).to.be.revertedWith(
        "Institution name cannot be empty"
      );
    });
  });

  // ============================================================
  //              2. ISSUE CERTIFICATE TESTS
  // ============================================================

  describe("2. Issue Certificate", function () {
    it("Nên cấp bằng thành công với thông tin đầy đủ", async function () {
      const { registry, owner } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await expect(
        registry.issueCertificate(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          sampleCert.ipfsCID,
          sampleCert.ipfsMetadataCID
        )
      )
        .to.emit(registry, "CertificateIssued")
        .withArgs(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.ipfsCID,
          owner.address,
          (val) => val > 0n
        );
    });

    it("Nên tăng totalCertificates sau khi cấp bằng", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );

      expect(await registry.totalCertificates()).to.equal(1);
    });

    it("Nên lưu đúng thông tin văn bằng", async function () {
      const { registry, owner } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );

      const cert = await registry.getCertificate(sampleCert.certificateId);

      expect(cert.certificateId).to.equal(sampleCert.certificateId);
      expect(cert.studentId).to.equal(sampleCert.studentId);
      expect(cert.studentName).to.equal(sampleCert.studentName);
      expect(cert.degree).to.equal(sampleCert.degree);
      expect(cert.major).to.equal(sampleCert.major);
      expect(cert.ipfsCID).to.equal(sampleCert.ipfsCID);
      expect(cert.isValid).to.be.true;
      expect(cert.issuedBy).to.equal(owner.address);
    });

    it("Nên revert khi cấp bằng trùng mã", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );

      await expect(
        registry.issueCertificate(
          sampleCert.certificateId, // trùng ID
          "SV99999999",
          "Tran Thi B",
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          "QmDifferentCID",
          "QmDifferentMetaCID"
        )
      ).to.be.revertedWithCustomError(registry, "CertificateAlreadyExists");
    });

    it("Nên revert khi người không có quyền cố cấp bằng", async function () {
      const { registry, publicUser } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await expect(
        registry.connect(publicUser).issueCertificate(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          sampleCert.ipfsCID,
          sampleCert.ipfsMetadataCID
        )
      ).to.be.reverted;
    });

    it("Nên revert nếu certificateId rỗng", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await expect(
        registry.issueCertificate(
          "", // rỗng
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          sampleCert.ipfsCID,
          sampleCert.ipfsMetadataCID
        )
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("Nên revert nếu ipfsCID rỗng", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await expect(
        registry.issueCertificate(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          "", // ipfsCID rỗng
          sampleCert.ipfsMetadataCID
        )
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("Issuer được thêm bởi admin nên có thể cấp bằng", async function () {
      const { registry, issuer1 } = await loadFixture(
        deployCertificateRegistryFixture
      );

      // Admin thêm issuer1
      await registry.addIssuer(issuer1.address);

      // issuer1 cấp bằng
      await expect(
        registry.connect(issuer1).issueCertificate(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          sampleCert.ipfsCID,
          sampleCert.ipfsMetadataCID
        )
      ).to.not.be.reverted;
    });
  });

  // ============================================================
  //              3. VERIFY CERTIFICATE TESTS
  // ============================================================

  describe("3. Verify Certificate", function () {
    async function issuedCertFixture() {
      const base = await deployCertificateRegistryFixture();
      await base.registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );
      return base;
    }

    it("Nên trả về isValid=true cho văn bằng hợp lệ", async function () {
      const { registry, publicUser } = await loadFixture(issuedCertFixture);

      const result = await registry
        .connect(publicUser)
        .verifyCertificate(sampleCert.certificateId);

      expect(result.isValid).to.be.true;
      expect(result.studentName).to.equal(sampleCert.studentName);
      expect(result.degree).to.equal(sampleCert.degree);
      expect(result.ipfsCID).to.equal(sampleCert.ipfsCID);
    });

    it("Nên trả về isValid=false cho mã bằng không tồn tại", async function () {
      const { registry, publicUser } = await loadFixture(issuedCertFixture);

      const result = await registry
        .connect(publicUser)
        .verifyCertificate("VB-KHONG-TON-TAI");

      expect(result.isValid).to.be.false;
      expect(result.studentName).to.equal("");
    });

    it("isCertificateExists nên trả về true sau khi cấp", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      expect(
        await registry.isCertificateExists(sampleCert.certificateId)
      ).to.be.true;
    });

    it("isCertificateExists nên trả về false cho mã không tồn tại", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      expect(await registry.isCertificateExists("VB-NOT-FOUND")).to.be.false;
    });

    it("getCertificate nên revert với mã không tồn tại", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      await expect(
        registry.getCertificate("VB-KHONG-TON-TAI")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("getStudentCertificates nên trả về danh sách bằng của sinh viên", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      // Cấp thêm bằng 2 cho cùng sinh viên
      await registry.issueCertificate(
        sampleCert2.certificateId,
        sampleCert2.studentId,
        sampleCert2.studentName,
        sampleCert2.universityName,
        sampleCert2.degree,
        sampleCert2.major,
        sampleCert2.graduationYear,
        sampleCert2.gpa,
        sampleCert2.ipfsCID,
        sampleCert2.ipfsMetadataCID
      );

      const certs = await registry.getStudentCertificates(sampleCert.studentId);
      expect(certs.length).to.equal(2);
      expect(certs[0]).to.equal(sampleCert.certificateId);
      expect(certs[1]).to.equal(sampleCert2.certificateId);
    });
  });

  // ============================================================
  //              4. REVOKE CERTIFICATE TESTS
  // ============================================================

  describe("4. Revoke Certificate", function () {
    async function issuedCertFixture() {
      const base = await deployCertificateRegistryFixture();
      await base.registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );
      return base;
    }

    it("Admin nên thu hồi được văn bằng", async function () {
      const { registry, owner } = await loadFixture(issuedCertFixture);

      await expect(
        registry.revokeCertificate(sampleCert.certificateId, "Gian lận học thuật")
      )
        .to.emit(registry, "CertificateRevoked")
        .withArgs(
          sampleCert.certificateId,
          sampleCert.studentId,
          owner.address,
          (val) => val > 0n,
          "Gian lận học thuật"
        );
    });

    it("Văn bằng sau khi thu hồi nên có isValid=false", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      await registry.revokeCertificate(
        sampleCert.certificateId,
        "Gian lận học thuật"
      );

      const result = await registry.verifyCertificate(sampleCert.certificateId);
      expect(result.isValid).to.be.false;
    });

    it("Nên tăng totalRevoked sau khi thu hồi", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      await registry.revokeCertificate(sampleCert.certificateId, "Lý do test");

      expect(await registry.totalRevoked()).to.equal(1);
    });

    it("Nên revert khi thu hồi bằng đã bị thu hồi rồi", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      await registry.revokeCertificate(sampleCert.certificateId, "Lần 1");

      await expect(
        registry.revokeCertificate(sampleCert.certificateId, "Lần 2")
      ).to.be.revertedWithCustomError(registry, "CertificateAlreadyRevoked");
    });

    it("Nên revert khi thu hồi bằng không tồn tại", async function () {
      const { registry } = await loadFixture(issuedCertFixture);

      await expect(
        registry.revokeCertificate("VB-KHONG-TON-TAI", "Test")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("Người dùng thường không thể thu hồi bằng", async function () {
      const { registry, publicUser } = await loadFixture(issuedCertFixture);

      await expect(
        registry
          .connect(publicUser)
          .revokeCertificate(sampleCert.certificateId, "Hack attempt")
      ).to.be.reverted;
    });
  });

  // ============================================================
  //              5. ACCESS CONTROL TESTS
  // ============================================================

  describe("5. Access Control", function () {
    it("Admin nên thêm được issuer mới", async function () {
      const { registry, issuer1, ISSUER_ROLE } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await registry.addIssuer(issuer1.address);
      expect(await registry.hasRole(ISSUER_ROLE, issuer1.address)).to.be.true;
    });

    it("Admin nên xóa được quyền issuer", async function () {
      const { registry, issuer1, ISSUER_ROLE } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await registry.addIssuer(issuer1.address);
      await registry.removeIssuer(issuer1.address);
      expect(await registry.hasRole(ISSUER_ROLE, issuer1.address)).to.be.false;
    });

    it("Nên revert addIssuer với address(0)", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await expect(
        registry.addIssuer(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("Người dùng thường không thể addIssuer", async function () {
      const { registry, publicUser, issuer1 } = await loadFixture(
        deployCertificateRegistryFixture
      );

      await expect(
        registry.connect(publicUser).addIssuer(issuer1.address)
      ).to.be.reverted;
    });
  });

  // ============================================================
  //              6. STATS TESTS
  // ============================================================

  describe("6. Statistics", function () {
    it("getStats nên trả về đúng số liệu", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      // Cấp 2 bằng
      await registry.issueCertificate(
        sampleCert.certificateId,
        sampleCert.studentId,
        sampleCert.studentName,
        sampleCert.universityName,
        sampleCert.degree,
        sampleCert.major,
        sampleCert.graduationYear,
        sampleCert.gpa,
        sampleCert.ipfsCID,
        sampleCert.ipfsMetadataCID
      );
      await registry.issueCertificate(
        sampleCert2.certificateId,
        sampleCert2.studentId,
        sampleCert2.studentName,
        sampleCert2.universityName,
        sampleCert2.degree,
        sampleCert2.major,
        sampleCert2.graduationYear,
        sampleCert2.gpa,
        sampleCert2.ipfsCID,
        sampleCert2.ipfsMetadataCID
      );

      // Thu hồi 1 bằng
      await registry.revokeCertificate(sampleCert.certificateId, "Test");

      const stats = await registry.getStats();
      expect(stats.total).to.equal(2n);
      expect(stats.revoked).to.equal(1n);
      expect(stats.active).to.equal(1n);
    });
  });

  // ============================================================
  //              7. PAUSE TESTS
  // ============================================================

  describe("7. Pausable", function () {
    it("Admin nên tạm dừng được contract", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await registry.pause();
      expect(await registry.paused()).to.be.true;
    });

    it("Nên revert issueCertificate khi contract bị pause", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await registry.pause();

      await expect(
        registry.issueCertificate(
          sampleCert.certificateId,
          sampleCert.studentId,
          sampleCert.studentName,
          sampleCert.universityName,
          sampleCert.degree,
          sampleCert.major,
          sampleCert.graduationYear,
          sampleCert.gpa,
          sampleCert.ipfsCID,
          sampleCert.ipfsMetadataCID
        )
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");
    });

    it("Admin nên unpause được contract", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await registry.pause();
      await registry.unpause();
      expect(await registry.paused()).to.be.false;
    });
  });

  // ============================================================
  //              8. INSTITUTION NAME TESTS
  // ============================================================

  describe("8. Institution Name", function () {
    it("Admin nên cập nhật được tên tổ chức", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      const newName = "Đại học Mới Cập Nhật";
      await expect(registry.updateInstitutionName(newName))
        .to.emit(registry, "InstitutionNameUpdated")
        .withArgs("Đại học Blockchain Test", newName);

      expect(await registry.institutionName()).to.equal(newName);
    });

    it("Nên revert nếu tên mới rỗng", async function () {
      const { registry } = await loadFixture(deployCertificateRegistryFixture);

      await expect(
        registry.updateInstitutionName("")
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });
  });
});
