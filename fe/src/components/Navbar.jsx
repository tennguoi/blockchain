import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, User, Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/76 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" onClick={closeMenu}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <GraduationCap size={22} />
            </span>
            <span className="text-xl font-extrabold tracking-normal text-slate-950">BlockCert</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link
              to="/verify"
              className={`text-sm font-bold transition-colors ${isActive('/verify') ? 'text-blue-700' : 'text-slate-600 hover:text-slate-950'}`}
            >
              Xác minh văn bằng
            </Link>

            {user ? (
              <>
                <Link
                  to={user.role === 'admin' ? '/admin' : '/student'}
                  className={`text-sm font-bold transition-colors ${isActive(user.role === 'admin' ? '/admin' : '/student') ? 'text-blue-700' : 'text-slate-600 hover:text-slate-950'}`}
                >
                  {user.role === 'admin' ? 'Admin Dashboard' : 'Văn bằng của tôi'}
                </Link>

                <div className="h-6 w-px bg-slate-200" />

                <div className="flex items-center gap-3">
                  <div className="hidden flex-col items-end lg:flex">
                    <span className="text-sm font-bold text-slate-950">{user.name}</span>
                    <span className="text-xs font-semibold capitalize text-slate-500">{user.role}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Đăng xuất"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <Button asChild className="ml-1">
                <Link to="/login">
                  <User size={16} />
                  Đăng nhập
                </Link>
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-white hover:text-slate-950 md:hidden"
            aria-label="Mở menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-t border-slate-200/70 bg-white/92 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1">
              <Link
                to="/verify"
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                onClick={closeMenu}
              >
                <ShieldCheck size={18} />
                Xác minh văn bằng
              </Link>

              {user ? (
                <>
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/student'}
                    className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={closeMenu}
                  >
                    <User size={18} />
                    {user.role === 'admin' ? 'Admin Dashboard' : 'Văn bằng của tôi'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  onClick={closeMenu}
                >
                  <User size={18} />
                  Đăng nhập
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
