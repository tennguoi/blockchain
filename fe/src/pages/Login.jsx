import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import toast from 'react-hot-toast';
import {
  BadgeCheck,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Network,
  ShieldCheck,
  Wallet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const NETWORK_NAMES = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  31337: 'Hardhat',
  1337: 'Localhost',
};

const walletErrorMessage = (error) => {
  if (error?.code === 4001) return 'Bạn đã từ chối yêu cầu ký ví.';
  if (error?.code === -32002) return 'MetaMask đang có một yêu cầu kết nối đang chờ.';
  return error?.message || 'Lỗi đăng nhập MetaMask';
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State cho hiện/ẩn mật khẩu
  
  const [isLoading, setIsLoading] = useState(false);
  const [isMetaMaskLoading, setIsMetaMaskLoading] = useState(false);
  const [walletNetwork, setWalletNetwork] = useState('');
  const { login, loginWithMetaMask, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  const handleMetaMaskLogin = async () => {
    console.log('\n========== LOGIN PAGE: handleMetaMaskLogin ==========');
    if (!window.ethereum) {
      console.log('[LOGIN] MetaMask not installed');
      toast.error('Vui lòng cài đặt MetaMask để đăng nhập bằng ví.');
      return;
    }
    console.log('[LOGIN] window.ethereum detected:', window.ethereum.isMetaMask);

    setIsMetaMaskLoading(true);
    try {
      console.log('[LOGIN] Creating BrowserProvider...');
      const provider = new BrowserProvider(window.ethereum);
      
      console.log('[LOGIN] Requesting accounts...');
      await provider.send('eth_requestAccounts', []);
      
      console.log('[LOGIN] Getting network info...');
      const network = await provider.getNetwork();
      console.log('[LOGIN] Network:', { chainId: network.chainId.toString(), name: network.name });
      setWalletNetwork(NETWORK_NAMES[Number(network.chainId)] || `Chain ${network.chainId.toString()}`);

      console.log('[LOGIN] Getting signer...');
      const signer = await provider.getSigner();
      
      console.log('[LOGIN] Getting wallet address...');
      const walletAddress = await signer.getAddress();
      console.log('[LOGIN] walletAddress:', walletAddress);

      const normalizedAddress = walletAddress.toLowerCase();
      const message = `Tôi xác nhận đăng nhập vào hệ thống BlockCert bằng ví ${normalizedAddress}`;
      console.log('[LOGIN] Message to sign:', message);
      
      console.log('[LOGIN] Requesting signature from MetaMask...');
      const signature = await signer.signMessage(message);
      console.log('[LOGIN] Signature received:', signature.substring(0, 50) + '...');
      console.log('[LOGIN] Signature full length:', signature.length);

      console.log('[LOGIN] Calling loginWithMetaMask...');
      const loggedUser = await loginWithMetaMask(walletAddress, signature);
      console.log('[LOGIN] Login success, navigating to:', loggedUser.role === 'admin' ? '/admin' : '/student');
      navigate(loggedUser.role === 'admin' ? '/admin' : '/student');
    } catch (error) {
      console.log('[LOGIN] ERROR in handleMetaMaskLogin:');
      console.log('[LOGIN] error.name:', error.name);
      console.log('[LOGIN] error.message:', error.message);
      console.log('[LOGIN] error.code:', error.code);
      console.log('[LOGIN] Full error:', error);
      toast.error(walletErrorMessage(error));
    } finally {
      console.log('[LOGIN] handleMetaMaskLogin finished, loading=false');
      setIsMetaMaskLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.role === 'admin' ? '/admin' : '/student');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-6xl items-center gap-6 py-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden h-full min-h-[620px] overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-8 text-white shadow-[0_22px_60px_-34px_rgba(15,23,42,0.75)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(59,130,246,0.32),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.22),transparent_30%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
              <GraduationCap size={25} />
            </span>
            <span className="text-2xl font-extrabold tracking-normal">BlockCert</span>
          </div>

          <div className="max-w-md">
            <Badge className="mb-5 bg-white/10 text-white ring-white/15">
              <ShieldCheck size={14} />
              Trusted education registry
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-normal">
              Cổng quản lý văn bằng blockchain cho nhà trường
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Đăng nhập để cấp phát, theo dõi giao dịch và xác minh dữ liệu văn bằng bằng hợp đồng thông minh.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['IPFS', 'On-chain', 'QR Verify'].map((label) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-bold text-slate-100 backdrop-blur">
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-card p-5 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-md">
          <div className="text-center sm:text-left">
            <Badge variant="primary" className="mb-4">
              <BadgeCheck size={14} />
              Secure access
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">Đăng nhập hệ thống</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sử dụng tài khoản nhà trường hoặc ký ví MetaMask đã liên kết.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="form-control pl-10"
                  placeholder="admin@university.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Mật khẩu</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="form-control pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={18} />}
              Đăng nhập
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold uppercase text-slate-400">Hoặc</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleMetaMaskLogin}
            disabled={isMetaMaskLoading}
            className="w-full"
          >
            {isMetaMaskLoading ? <Loader2 className="animate-spin" size={20} /> : <Wallet size={19} />}
            MetaMask Wallet
          </Button>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Network size={17} className="text-blue-600" />
              Network status
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {walletNetwork || 'Chưa kết nối ví. Hệ thống hỗ trợ Sepolia, Hardhat và Localhost.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;