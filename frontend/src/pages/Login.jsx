import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';
import { BrowserProvider } from 'ethers';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithMetaMask, user } = useAuth();
  const navigate = useNavigate();

  // Đã đăng nhập thì chuyển hướng
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  const handleMetaMaskLogin = async () => {
    if (!window.ethereum) {
      toast.error('Vui lòng cài đặt ví MetaMask để sử dụng tính năng này!');
      return;
    }
    
    setIsLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      // Yêu cầu kết nối tài khoản
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const normalizedAddress = walletAddress.toLowerCase();
      const message = `Tôi xác nhận đăng nhập vào hệ thống BlockCert bằng ví ${normalizedAddress}`;
      
      // Ký thông điệp
      const signature = await signer.signMessage(message);
      
      // Đăng nhập qua context
      const loggedUser = await loginWithMetaMask(walletAddress, signature);
      
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Lỗi đăng nhập MetaMask');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h2>Đăng nhập hệ thống</h2>
          <p style={{ color: 'var(--text-secondary)' }}>BlockCert - Quản lý văn bằng số</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-secondary)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '0.875rem' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
        </div>
        
        <button 
          type="button" 
          onClick={handleMetaMaskLogin}
          className="btn btn-outline" 
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderColor: '#e28743', color: '#e28743' }}
          disabled={isLoading}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style={{ width: '20px', height: '20px' }} />
          Đăng nhập bằng MetaMask
        </button>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>Tài khoản demo:</p>
          <p>Admin: admin@university.edu / admin123</p>
          <p>Sinh viên: student@university.edu / student123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
