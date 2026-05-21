import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <GraduationCap size={28} />
        <span>BlockCert</span>
      </Link>

      <div className="nav-links">
        <Link to="/verify" className="nav-link">Xác minh văn bằng</Link>
        
        {user ? (
          <>
            {user.role === 'admin' ? (
              <Link to="/admin" className="nav-link">Dashboard Admin</Link>
            ) : (
              <Link to="/student" className="nav-link">Văn bằng của tôi</Link>
            )}
            
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1rem' }}>
              <LogOut size={16} /> Đăng xuất
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            <User size={18} /> Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
