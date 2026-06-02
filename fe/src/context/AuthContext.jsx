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
    console.log('\n========== AUTH CONTEXT: loginWithMetaMask ==========');
    console.log('[CONTEXT] walletAddress:', walletAddress);
    console.log('[CONTEXT] signature:', signature ? signature.substring(0, 30) + '...' : 'NULL');
    console.log('[CONTEXT] signature length:', signature?.length);
    try {
      console.log('[CONTEXT] Sending request to authAPI.loginMetamask...');
      const res = await authAPI.loginMetamask({ walletAddress, signature });
      console.log('[CONTEXT] Response received:', {
        status: res.status,
        data: res.data
      });
      const { user, token } = res.data;
      
      console.log('[CONTEXT] User data:', user);
      console.log('[CONTEXT] Token received:', token ? 'YES (length: ' + token.length + ')' : 'NO');
      
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      console.log('[CONTEXT] Login successful! User saved to localStorage');
      toast.success('Đăng nhập bằng MetaMask thành công!');
      return user;
    } catch (error) {
      console.log('[CONTEXT] ERROR caught in loginWithMetaMask:');
      console.log('[CONTEXT] error.name:', error.name);
      console.log('[CONTEXT] error.message:', error.message);
      console.log('[CONTEXT] error.response?.status:', error.response?.status);
      console.log('[CONTEXT] error.response?.data:', error.response?.data);
      console.log('[CONTEXT] error.code:', error.code);
      
      const msg = error.response?.data?.error || 'Đăng nhập ví thất bại';
      console.log('[CONTEXT] Error message to display:', msg);
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
