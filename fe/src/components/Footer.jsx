import { ShieldCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/70 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldCheck className="text-blue-600" size={20} />
          <span>BlockCert Verification System</span>
        </div>
        
        <div className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} University Blockchain System. All rights reserved.
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-slate-500">
          <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Help Center</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
