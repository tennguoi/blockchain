import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for user data on load
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const { user, token } = res.data;
      
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      toast.success('Đăng nhập thành công!');
      return user;
    } catch (error) {
      const msg = error.response?.data?.error || 'Đăng nhập thất bại';
      toast.error(msg);
      throw new Error(msg, { cause: error });
    }
  };

  const loginWithMetaMask = async (walletAddress, signature) => {
    try {
      const res = await authAPI.loginMetamask({ walletAddress, signature });
      const { user, token } = res.data;

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

      toast.success('Đăng nhập bằng MetaMask thành công!');
      return user;
    } catch (error) {
      const msg = error.response?.data?.error || 'Đăng nhập ví thất bại';
      toast.error(msg);
      throw new Error(msg, { cause: error });
    }
  };

  const updateUserInContext = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Đã đăng xuất');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loginWithMetaMask, updateUserInContext, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
