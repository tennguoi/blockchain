import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Award, Calendar, GraduationCap, User } from 'lucide-react';
import { certAPI } from '../services/api';
import toast from 'react-hot-toast';

const VerifyPage = () => {
  const [certId, setCertId] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!certId.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setResult(null);

    try {
      const response = await certAPI.verify(certId);
      setResult(response.data.data);
      toast.success('Xác minh thành công!');
    } catch (error) {
      console.error(error);
      setResult({ isValid: false });
      toast.error('Văn bằng không tồn tại hoặc không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Xác Minh Văn Bằng Số
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Hệ thống kiểm tra chứng chỉ bằng công nghệ Blockchain, đảm bảo tính minh bạch và chống giả mạo.
        </p>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nhập mã số văn bằng (VD: VB-2024-001)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }} disabled={isLoading}>
            {isLoading ? 'Đang kiểm tra...' : <><Search size={20} /> Kiểm tra</>}
          </button>
        </form>
      </div>

      {hasSearched && !isLoading && (
        <div className="animate-fade-in">
          {result && result.isValid ? (
            <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--success)' }}></div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                <CheckCircle size={40} color="var(--success)" />
                <div>
                  <h3 style={{ color: 'var(--success)', margin: 0 }}>Văn Bằng Hợp Lệ</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Đã được xác thực trên Blockchain</p>
                </div>
              </div>

              <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <User color="var(--primary)" />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Họ và tên</div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{result.studentName}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Award color="var(--primary)" />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loại bằng</div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{result.degree}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <GraduationCap color="var(--primary)" />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ngành học</div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{result.major}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Calendar color="var(--primary)" />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Năm tốt nghiệp</div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{result.graduationYear}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ngày cấp: </span>
                  {formatDate(result.issuedAt)}
                </div>
                {result.ipfsCID && (
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${result.ipfsCID}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    Xem bản gốc PDF
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <XCircle size={64} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Văn bằng không hợp lệ</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Mã số này không tồn tại trong hệ thống hoặc văn bằng đã bị thu hồi.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyPage;
