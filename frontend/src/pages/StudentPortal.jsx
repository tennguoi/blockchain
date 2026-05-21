import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { certAPI, authAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Calendar, Download, Share2, Loader, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrowserProvider } from 'ethers';

const StudentPortal = () => {
  const { user, updateUserInContext } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await certAPI.getStudentCerts(user.studentId);
        setCertificates(res.data);
      } catch (error) {
        console.error(error);
        toast.error('Không thể tải danh sách văn bằng');
      } finally {
        setLoading(false);
      }
    };

    if (user?.studentId) {
      fetchCertificates();
    }
  }, [user]);

  const copyLink = (certId) => {
    const link = `${window.location.origin}/verify?id=${certId}`;
    navigator.clipboard.writeText(link);
    toast.success('Đã sao chép link xác minh!');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('vi-VN');
  };

  const handleLinkWallet = async () => {
    if (!window.ethereum) {
      toast.error('Vui lòng cài đặt MetaMask!');
      return;
    }
    
    setIsLinking(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const normalizedAddress = walletAddress.toLowerCase();
      const message = `Tôi xác nhận muốn liên kết ví ${normalizedAddress} với tài khoản ${user.id}`;
      
      const signature = await signer.signMessage(message);
      
      const res = await authAPI.linkWallet({ walletAddress: normalizedAddress, signature });
      
      updateUserInContext(res.data.user);
      toast.success('Liên kết ví MetaMask thành công!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || error.message || 'Lỗi khi liên kết ví');
    } finally {
      setIsLinking(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Xin chào, {user.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Mã số sinh viên: {user.studentId}</p>
        </div>
        
        {/* Wallet Link Status */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', margin: 0 }}>
          <div style={{ background: user.walletAddress ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: user.walletAddress ? '#10b981' : '#f59e0b', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
            <Wallet size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ví MetaMask</h4>
            {user.walletAddress ? (
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '500', color: '#10b981' }}>
                Đã liên kết: {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
              </p>
            ) : (
              <button 
                onClick={handleLinkWallet}
                disabled={isLinking}
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
              >
                {isLinking ? 'Đang liên kết...' : 'Liên kết ví ngay'}
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        Văn Bằng Của Tôi ({certificates.length})
      </h2>

      {certificates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Award size={64} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>Bạn chưa có văn bằng nào được cấp phát</h3>
        </div>
      ) : (
        <div className="grid-cards">
          {certificates.map((cert) => (
            <div key={cert.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '12px' }}>
                  <Award size={24} color="var(--primary)" />
                </div>
                <span className="badge badge-success">Hợp lệ</span>
              </div>

              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{cert.degree}</h3>
              <p style={{ color: 'var(--primary)', fontWeight: '500', marginBottom: '1rem' }}>{cert.major}</p>

              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <Calendar size={16} />
                <span>Năm tốt nghiệp: {cert.graduationYear}</span>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <QRCodeSVG 
                  value={`${window.location.origin}/verify?id=${cert.id}`}
                  size={120}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                  level={"Q"}
                  style={{ borderRadius: '8px', padding: '8px', background: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <a 
                  href={`https://gateway.pinata.cloud/ipfs/${cert.ipfsCID}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  <Download size={18} /> Bản PDF
                </a>
                <button 
                  onClick={() => copyLink(cert.id)}
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  <Share2 size={18} /> Chia sẻ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentPortal;
