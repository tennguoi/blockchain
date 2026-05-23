import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { certAPI } from '../services/api';
import { Award, Users, FileX, ShieldAlert, Plus, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

import { QRCodeSVG } from 'qrcode.react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, revoked: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issue'); // 'issue' or 'revoke'

  // Issue Form State
  const [issueForm, setIssueForm] = useState({
    certificateId: '', studentId: '', studentName: '', universityName: 'Trường Đại học Blockchain Việt Nam',
    degree: 'Cử nhân', major: '', graduationYear: new Date().getFullYear().toString(), gpa: ''
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revoke Form State
  const [revokeForm, setRevokeForm] = useState({ id: '', reason: '' });
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await certAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const [issuedCert, setIssuedCert] = useState(null); // Trạng thái lưu chứng chỉ vừa tạo để hiển thị QR

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      return toast.error('Vui lòng chọn file văn bằng (PDF/Image)');
    }

    setIsSubmitting(true);
    const formData = new FormData();
    Object.keys(issueForm).forEach(key => formData.append(key, issueForm[key]));
    formData.append('file', file);

    try {
      await certAPI.issue(formData);
      toast.success('Cấp phát văn bằng thành công!');
      
      // Hiển thị QR Code cho văn bằng vừa tạo
      setIssuedCert(issueForm);
      
      // Reset form
      setIssueForm({ ...issueForm, certificateId: '', studentId: '', studentName: '', major: '', gpa: '' });
      setFile(null);
      document.getElementById('fileUpload').value = '';
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi cấp phát văn bằng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    setIsRevoking(true);
    try {
      await certAPI.revoke(revokeForm.id, revokeForm.reason);
      toast.success('Thu hồi văn bằng thành công!');
      setRevokeForm({ id: '', reason: '' });
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi thu hồi văn bằng');
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Quản lý cấp phát và thu hồi văn bằng số</p>
      </div>

      {/* Stats Section */}
      <div className="grid-cards" style={{ marginBottom: '3rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Award size={32} />
          </div>
          <div className="stat-content">
            <h4>Tổng Số Văn Bằng Đã Cấp</h4>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle size={32} />
          </div>
          <div className="stat-content">
            <h4>Văn Bằng Hợp Lệ</h4>
            <p>{stats.active}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <FileX size={32} />
          </div>
          <div className="stat-content">
            <h4>Văn Bằng Đã Thu Hồi</h4>
            <p>{stats.revoked}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'issue' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('issue')}
        >
          <Plus size={18} /> Cấp Phát Mới
        </button>
        <button 
          className={`btn ${activeTab === 'revoke' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => setActiveTab('revoke')}
          style={activeTab !== 'revoke' ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}}
        >
          <ShieldAlert size={18} /> Thu Hồi Văn Bằng
        </button>
      </div>

      {/* Forms Section */}
      <div className="glass-card">
        {activeTab === 'issue' ? (
          <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              Cấp Phát Văn Bằng Mới
            </h2>
            <form onSubmit={handleIssueSubmit}>
              <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mã Văn Bằng</label>
                  <input required className="form-control" placeholder="VD: VB-2024-001" value={issueForm.certificateId} onChange={e => setIssueForm({...issueForm, certificateId: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tên Trường</label>
                  <input required className="form-control" value={issueForm.universityName} onChange={e => setIssueForm({...issueForm, universityName: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mã Sinh Viên</label>
                  <input required className="form-control" placeholder="Mã SV" value={issueForm.studentId} onChange={e => setIssueForm({...issueForm, studentId: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Họ và Tên Sinh Viên</label>
                  <input required className="form-control" placeholder="Họ tên đầy đủ" value={issueForm.studentName} onChange={e => setIssueForm({...issueForm, studentName: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Loại Bằng</label>
                  <select required className="form-control" value={issueForm.degree} onChange={e => setIssueForm({...issueForm, degree: e.target.value})}>
                    <option value="Cử nhân">Cử nhân</option>
                    <option value="Kỹ sư">Kỹ sư</option>
                    <option value="Thạc sĩ">Thạc sĩ</option>
                    <option value="Tiến sĩ">Tiến sĩ</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ngành Học</label>
                  <input required className="form-control" placeholder="VD: Công nghệ thông tin" value={issueForm.major} onChange={e => setIssueForm({...issueForm, major: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Năm Tốt Nghiệp</label>
                  <input required type="number" className="form-control" value={issueForm.graduationYear} onChange={e => setIssueForm({...issueForm, graduationYear: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Điểm GPA</label>
                  <input required type="number" step="0.01" className="form-control" placeholder="VD: 3.8" value={issueForm.gpa} onChange={e => setIssueForm({...issueForm, gpa: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">File Văn Bằng (PDF/Image)</label>
                <input id="fileUpload" required type="file" className="form-control" accept=".pdf,image/*" onChange={e => setFile(e.target.files[0])} style={{ padding: '0.5rem' }} />
                <small style={{ color: 'var(--warning)', marginTop: '0.5rem', display: 'block' }}>* File sẽ được lưu trữ vĩnh viễn trên IPFS</small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem 2.5rem' }}>
                  {isSubmitting ? 'Đang xử lý Blockchain...' : 'Cấp Phát Văn Bằng'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--danger)' }}>
              Thu Hồi Văn Bằng
            </h2>
            <div style={{ background: 'var(--danger-light)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--danger)' }}>
              <strong style={{ color: '#fca5a5' }}>Cảnh báo:</strong> Thao tác này sẽ đánh dấu văn bằng là không hợp lệ trên Blockchain vĩnh viễn và không thể hoàn tác.
            </div>
            <form onSubmit={handleRevokeSubmit}>
              <div className="form-group">
                <label className="form-label">Mã Văn Bằng Cần Thu Hồi</label>
                <input required className="form-control" placeholder="Nhập mã số văn bằng" value={revokeForm.id} onChange={e => setRevokeForm({...revokeForm, id: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Lý Do Thu Hồi</label>
                <textarea required className="form-control" rows="4" placeholder="Nhập lý do thu hồi (VD: Gian lận học thuật, sai sót thông tin...)" value={revokeForm.reason} onChange={e => setRevokeForm({...revokeForm, reason: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-danger" disabled={isRevoking} style={{ padding: '0.75rem 2.5rem' }}>
                  {isRevoking ? 'Đang xử lý...' : 'Xác Nhận Thu Hồi'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal hiển thị QR Code sau khi cấp phát */}
      {issuedCert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={48} color="var(--success)" />
            </div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Cấp Phát Thành Công!</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Văn bằng của sinh viên <strong>{issuedCert.studentName}</strong> đã được lưu lên Blockchain.
            </p>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <QRCodeSVG 
                value={`${window.location.origin}/verify?id=${issuedCert.certificateId}`}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"Q"}
              />
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Mã văn bằng: <strong>{issuedCert.certificateId}</strong><br/>
              Bạn có thể tải hoặc in mã QR này để dán lên bản cứng.
            </p>

            <button 
              className="btn btn-primary" 
              onClick={() => setIssuedCert(null)}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Đóng và tiếp tục cấp phát
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
