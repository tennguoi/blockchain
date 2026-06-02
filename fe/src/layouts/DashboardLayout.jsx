import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileBadge,
  Search,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Wallet,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import AnimatedMeshBackground from '../components/AnimatedMeshBackground';
import AnimatedOutlet from '../components/AnimatedOutlet';

const NETWORK_NAMES = {
  '0x1': 'Ethereum',
  '0xaa36a7': 'Sepolia',
  '0x5': 'Goerli',
  '0x7a69': 'Hardhat',
  '0x539': 'Localhost',
};

const shortAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [networkName, setNetworkName] = useState('');

  useEffect(() => {
    let mounted = true;

    const readNetwork = async () => {
      if (!window.ethereum || !user?.walletAddress) {
        if (mounted) setNetworkName('');
        return;
      }

      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const label = NETWORK_NAMES[chainId] || `Chain ${Number.parseInt(chainId, 16)}`;
        if (mounted) setNetworkName(label);
      } catch (error) {
        console.error(error);
        if (mounted) setNetworkName('Unknown network');
      }
    };

    readNetwork();
    window.ethereum?.on?.('chainChanged', readNetwork);

    return () => {
      mounted = false;
      window.ethereum?.removeListener?.('chainChanged', readNetwork);
    };
  }, [user?.walletAddress]);

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Issue Certificate', path: '/admin#issue', icon: <FileBadge size={20} /> },
    { name: 'Revoke', path: '/admin#revoke', icon: <ShieldAlert size={20} /> },
    { name: 'Verify', path: '/verify', icon: <Search size={20} /> },
  ];

  const studentLinks = [
    { name: 'My Certificates', path: '/student', icon: <FileBadge size={20} /> },
    { name: 'Verify', path: '/verify', icon: <Search size={20} /> },
  ];

  const navLinks = user?.role === 'admin' ? adminLinks : studentLinks;

  const isActive = (path) => {
    const [pathname, rawHash] = path.split('#');
    const hash = rawHash ? `#${rawHash}` : '';

    if (hash) {
      return location.pathname === pathname && location.hash === hash;
    }

    return location.pathname === pathname && !location.hash;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 lg:flex">
      <AnimatedMeshBackground />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/70
          bg-white/84 shadow-[18px_0_46px_-34px_rgba(15,23,42,0.55)] backdrop-blur-xl
          transition-transform duration-200 ease-out lg:static lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/70 px-5">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsSidebarOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <GraduationCap size={22} />
            </span>
            <span className="text-xl font-extrabold tracking-normal text-slate-950">BlockCert</span>
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navLinks.map((link) => {
            const active = isActive(link.path);

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all
                  ${active
                    ? 'bg-blue-50 text-blue-700 shadow-[0_18px_36px_-30px_rgba(37,99,235,0.75)] ring-1 ring-blue-100'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-950 hover:ring-1 hover:ring-slate-200/70'}
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className={active ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}>
                  {link.icon}
                </span>
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/70 p-4">
          {user?.walletAddress && (
            <div className="mb-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Wallet size={16} />
                {shortAddress(user.walletAddress)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700/80">
                <Activity size={13} />
                {networkName || 'Wallet linked'}
              </div>
            </div>
          )}

          <div className="mb-4 flex min-w-0 items-center gap-3 rounded-xl bg-white/70 p-2 ring-1 ring-slate-200/70">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-slate-100 text-sm font-extrabold uppercase text-slate-700">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{user?.name}</p>
              <p className="text-xs font-semibold capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={19} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/78 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-950 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu size={22} />
          </button>

          <div className="hidden text-sm font-semibold text-slate-500 sm:block">
            University Blockchain Certificate Registry
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user?.walletAddress ? (
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:text-sm">
                <Wallet size={15} />
                <span>{shortAddress(user.walletAddress)}</span>
                {networkName && <span className="hidden text-emerald-600/70 sm:inline">/ {networkName}</span>}
              </div>
            ) : (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 sm:text-sm">
                Wallet not linked
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
