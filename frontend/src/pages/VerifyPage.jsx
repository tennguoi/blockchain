import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Award, Calendar, GraduationCap, User, QrCode } from 'lucide-react';
import { certAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const VerifyPage = () => {
  const [certId, setCertId] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchParams] = useSearchParams();

  const verifyCertificate = async (idToVerify) => {
    if (!idToVerify || !idToVerify.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setResult(null);

    try {
      const response = await certAPI.verify(idToVerify);
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

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      setCertId(urlId);
      verifyCertificate(urlId);
    }
  }, [searchParams]);

  const handleVerify = (e) => {
    e.preventDefault();
    verifyCertificate(certId);
  };

  useEffect(() => {
    let scanner = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render((decodedText) => {
        let idFromQR = decodedText;
        try {
          const url = new URL(decodedText);
          const urlParams = new URLSearchParams(url.search);
          if (urlParams.has('id')) {
            idFromQR = urlParams.get('id');
          }
        } catch (e) {
          // Nếu không phải là URL, dùng chuỗi được quét làm ID
        }
        
        scanner.clear();
        setIsScanning(false);
        setCertId(idFromQR);
        verifyCertificate(idFromQR);
      }, (error) => {
        // Bỏ qua các lỗi quét (thường xảy ra khi khung hình chưa rõ mã QR)
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Scanner clear error", e));
      }
    };
  }, [isScanning]);

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

      {isScanning && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Quét mã QR</h3>
            <button className="btn btn-outline" onClick={() => setIsScanning(false)} style={{ padding: '0.25rem 0.75rem' }}>Đóng</button>
          </div>
          <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
        </div>
      )}

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nhập mã số văn bằng (VD: VB-2024-001)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              style={{ padding: '1rem', fontSize: '1.1rem', height: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }} disabled={isLoading}>
            {isLoading ? 'Đang kiểm tra...' : <><Search size={20} /> Kiểm tra</>}
          </button>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setIsScanning(!isScanning)}
            style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }}
          >
            <QrCode size={20} /> Quét mã QR
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

              <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
