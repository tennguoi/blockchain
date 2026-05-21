// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CertificateRegistry
 * @author Blockchain Certificate System
 * @notice Hệ thống cấp phát và xác minh văn bằng số trên blockchain
 * @dev Smart contract quản lý toàn bộ vòng đời của văn bằng số:
 *      - Cấp phát bởi Admin (Trường Đại học)
 *      - Xem bởi Sinh viên
 *      - Xác minh công khai bởi bất kỳ ai (Nhà tuyển dụng, v.v.)
 */
contract CertificateRegistry is AccessControl, Pausable, ReentrancyGuard {
    // ============================================================
    //                         ROLES
    // ============================================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ============================================================
    //                         STRUCTS
    // ============================================================

    /**
     * @dev Cấu trúc dữ liệu lưu trữ thông tin văn bằng
     */
    struct Certificate {
        string certificateId;    // Mã văn bằng duy nhất (ví dụ: "VB-2024-001")
        string studentId;        // Mã số sinh viên
        string studentName;      // Họ và tên sinh viên
        string universityName;   // Tên trường đại học
        string degree;           // Loại bằng (Cử nhân, Thạc sĩ, Tiến sĩ)
        string major;            // Ngành học
        string graduationYear;   // Năm tốt nghiệp
        string gpa;              // Điểm GPA
        string ipfsCID;          // CID của file PDF bằng trên IPFS
        string ipfsMetadataCID;  // CID của metadata JSON trên IPFS
        uint256 issuedAt;        // Timestamp cấp bằng
        uint256 revokedAt;       // Timestamp thu hồi (0 nếu còn hiệu lực)
        address issuedBy;        // Địa chỉ admin cấp bằng
        bool isValid;            // Trạng thái hiệu lực
    }

    // ============================================================
    //                         STATE VARIABLES
    // ============================================================

    /// @notice Lưu trữ văn bằng theo certificateId
    mapping(string => Certificate) private certificates;

    /// @notice Danh sách certificateId của từng sinh viên
    mapping(string => string[]) private studentCertificates;

    /// @notice Kiểm tra certificateId đã tồn tại chưa
    mapping(string => bool) private certificateExists;

    /// @notice Tổng số văn bằng đã cấp
    uint256 public totalCertificates;

    /// @notice Tổng số văn bằng đã thu hồi
    uint256 public totalRevoked;

    /// @notice Tên tổ chức cấp bằng
    string public institutionName;

    /// @notice Địa chỉ contract
    address public contractOwner;

    // ============================================================
    //                         EVENTS
    // ============================================================

    /**
     * @dev Phát ra khi văn bằng được cấp phát thành công
     */
    event CertificateIssued(
        string indexed certificateId,
        string indexed studentId,
        string studentName,
        string ipfsCID,
        address issuedBy,
        uint256 issuedAt
    );

    /**
     * @dev Phát ra khi văn bằng bị thu hồi
     */
    event CertificateRevoked(
        string indexed certificateId,
        string indexed studentId,
        address revokedBy,
        uint256 revokedAt,
        string reason
    );

    /**
     * @dev Phát ra khi văn bằng được xác minh
     */
    event CertificateVerified(
        string indexed certificateId,
        address verifiedBy,
        uint256 verifiedAt
    );

    /**
     * @dev Phát ra khi tên tổ chức được cập nhật
     */
    event InstitutionNameUpdated(string oldName, string newName);

    // ============================================================
    //                         ERRORS (Custom)
    // ============================================================

    error CertificateAlreadyExists(string certificateId);
    error CertificateNotFound(string certificateId);
    error CertificateAlreadyRevoked(string certificateId);
    error EmptyField(string fieldName);
    error InvalidAddress();

    // ============================================================
    //                         CONSTRUCTOR
    // ============================================================

    /**
     * @param _institutionName Tên trường đại học
     */
    constructor(string memory _institutionName) {
        require(bytes(_institutionName).length > 0, "Institution name cannot be empty");

        institutionName = _institutionName;
        contractOwner = msg.sender;

        // Gán role DEFAULT_ADMIN_ROLE và ADMIN_ROLE cho deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    // ============================================================
    //                         MODIFIERS
    // ============================================================

    modifier certificateMustExist(string memory certificateId) {
        if (!certificateExists[certificateId]) {
            revert CertificateNotFound(certificateId);
        }
        _;
    }

    modifier certificateMustNotExist(string memory certificateId) {
        if (certificateExists[certificateId]) {
            revert CertificateAlreadyExists(certificateId);
        }
        _;
    }

    modifier notEmpty(string memory value, string memory fieldName) {
        if (bytes(value).length == 0) {
            revert EmptyField(fieldName);
        }
        _;
    }

    // ============================================================
    //                     ISSUER FUNCTIONS
    // ============================================================

    /**
     * @notice Cấp phát văn bằng mới lên blockchain
     * @dev Chỉ admin/issuer mới có thể gọi hàm này
     * @param _certificateId Mã văn bằng duy nhất
     * @param _studentId Mã số sinh viên
     * @param _studentName Họ và tên sinh viên
     * @param _universityName Tên trường
     * @param _degree Loại bằng
     * @param _major Ngành học
     * @param _graduationYear Năm tốt nghiệp
     * @param _gpa Điểm GPA
     * @param _ipfsCID CID file PDF trên IPFS
     * @param _ipfsMetadataCID CID metadata JSON trên IPFS
     */
    function issueCertificate(
        string memory _certificateId,
        string memory _studentId,
        string memory _studentName,
        string memory _universityName,
        string memory _degree,
        string memory _major,
        string memory _graduationYear,
        string memory _gpa,
        string memory _ipfsCID,
        string memory _ipfsMetadataCID
    )
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
        nonReentrant
        certificateMustNotExist(_certificateId)
        notEmpty(_certificateId, "certificateId")
        notEmpty(_studentId, "studentId")
        notEmpty(_studentName, "studentName")
        notEmpty(_ipfsCID, "ipfsCID")
    {
        Certificate memory newCert = Certificate({
            certificateId: _certificateId,
            studentId: _studentId,
            studentName: _studentName,
            universityName: _universityName,
            degree: _degree,
            major: _major,
            graduationYear: _graduationYear,
            gpa: _gpa,
            ipfsCID: _ipfsCID,
            ipfsMetadataCID: _ipfsMetadataCID,
            issuedAt: block.timestamp,
            revokedAt: 0,
            issuedBy: msg.sender,
            isValid: true
        });

        certificates[_certificateId] = newCert;
        certificateExists[_certificateId] = true;
        studentCertificates[_studentId].push(_certificateId);
        totalCertificates++;

        emit CertificateIssued(
            _certificateId,
            _studentId,
            _studentName,
            _ipfsCID,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Thu hồi văn bằng (đánh dấu không còn hiệu lực)
     * @dev Chỉ admin mới có thể thu hồi
     * @param _certificateId Mã văn bằng cần thu hồi
     * @param _reason Lý do thu hồi
     */
    function revokeCertificate(
        string memory _certificateId,
        string memory _reason
    )
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
        nonReentrant
        certificateMustExist(_certificateId)
    {
        Certificate storage cert = certificates[_certificateId];

        if (!cert.isValid) {
            revert CertificateAlreadyRevoked(_certificateId);
        }

        cert.isValid = false;
        cert.revokedAt = block.timestamp;
        totalRevoked++;

        emit CertificateRevoked(
            _certificateId,
            cert.studentId,
            msg.sender,
            block.timestamp,
            _reason
        );
    }

    // ============================================================
    //                     VIEW FUNCTIONS (PUBLIC)
    // ============================================================

    /**
     * @notice Lấy toàn bộ thông tin văn bằng theo mã
     * @param _certificateId Mã văn bằng cần tra cứu
     * @return Certificate struct chứa toàn bộ thông tin
     */
    function getCertificate(string memory _certificateId)
        external
        view
        certificateMustExist(_certificateId)
        returns (Certificate memory)
    {
        return certificates[_certificateId];
    }

    /**
     * @notice Xác minh nhanh tính hợp lệ của văn bằng
     * @param _certificateId Mã văn bằng
     * @return isValid Văn bằng có hợp lệ không
     * @return studentName Tên sinh viên
     * @return degree Loại bằng
     * @return major Ngành học
     * @return graduationYear Năm tốt nghiệp
     * @return ipfsCID CID file trên IPFS
     * @return issuedAt Thời điểm cấp bằng
     */
    function verifyCertificate(string memory _certificateId)
        external
        view
        returns (
            bool isValid,
            string memory studentName,
            string memory degree,
            string memory major,
            string memory graduationYear,
            string memory ipfsCID,
            uint256 issuedAt
        )
    {
        if (!certificateExists[_certificateId]) {
            return (false, "", "", "", "", "", 0);
        }

        Certificate memory cert = certificates[_certificateId];
        return (
            cert.isValid,
            cert.studentName,
            cert.degree,
            cert.major,
            cert.graduationYear,
            cert.ipfsCID,
            cert.issuedAt
        );
    }

    /**
     * @notice Lấy danh sách mã văn bằng của một sinh viên
     * @param _studentId Mã số sinh viên
     * @return Mảng các certificateId
     */
    function getStudentCertificates(string memory _studentId)
        external
        view
        returns (string[] memory)
    {
        return studentCertificates[_studentId];
    }

    /**
     * @notice Kiểm tra văn bằng có tồn tại không
     * @param _certificateId Mã văn bằng
     * @return bool
     */
    function isCertificateExists(string memory _certificateId)
        external
        view
        returns (bool)
    {
        return certificateExists[_certificateId];
    }

    /**
     * @notice Lấy thống kê tổng quan hệ thống
     * @return total Tổng số văn bằng đã cấp
     * @return revoked Số văn bằng đã thu hồi
     * @return active Số văn bằng còn hiệu lực
     */
    function getStats()
        external
        view
        returns (
            uint256 total,
            uint256 revoked,
            uint256 active
        )
    {
        return (
            totalCertificates,
            totalRevoked,
            totalCertificates - totalRevoked
        );
    }

    // ============================================================
    //                     ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Thêm issuer mới (được phép cấp bằng)
     * @param _issuer Địa chỉ ví của issuer
     */
    function addIssuer(address _issuer)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_issuer == address(0)) revert InvalidAddress();
        _grantRole(ISSUER_ROLE, _issuer);
    }

    /**
     * @notice Xóa quyền issuer
     * @param _issuer Địa chỉ ví của issuer cần xóa
     */
    function removeIssuer(address _issuer)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_issuer == address(0)) revert InvalidAddress();
        _revokeRole(ISSUER_ROLE, _issuer);
    }

    /**
     * @notice Cập nhật tên tổ chức
     * @param _newName Tên mới
     */
    function updateInstitutionName(string memory _newName)
        external
        onlyRole(ADMIN_ROLE)
        notEmpty(_newName, "institutionName")
    {
        string memory oldName = institutionName;
        institutionName = _newName;
        emit InstitutionNameUpdated(oldName, _newName);
    }

    /**
     * @notice Tạm dừng hợp đồng (emergency)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Tiếp tục hoạt động sau khi tạm dừng
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //                     INTERFACE SUPPORT
    // ============================================================

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
