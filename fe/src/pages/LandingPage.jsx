import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Database,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const features = [
  {
    icon: <FileCheck2 size={22} />,
    title: 'Cấp chứng chỉ số',
    description: 'Biểu mẫu cấp phát rõ ràng, metadata chuẩn hóa và QR xác minh cho từng văn bằng.',
  },
  {
    icon: <Database size={22} />,
    title: 'Lưu trữ IPFS',
    description: 'File chứng chỉ và metadata được đưa lên IPFS để tăng tính sẵn sàng và đối chiếu.',
  },
  {
    icon: <Blocks size={22} />,
    title: 'Xác minh blockchain',
    description: 'Mã văn bằng, CID hoặc QR code được kiểm tra với dữ liệu đã ghi nhận on-chain.',
  },
];

const LandingPage = () => {
  return (
    <div className="pb-12">
      <section className="grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.04fr_0.96fr] lg:py-16">
        <div className="max-w-2xl">
          <Badge variant="primary" className="mb-5">
            <ShieldCheck size={14} />
            Enterprise + Education + Trust
          </Badge>

          <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            Secure Blockchain Certificate Verification
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Nền tảng cấp phát, lưu trữ và xác minh văn bằng bằng blockchain và IPFS, tập trung vào tính chính thống,
            minh bạch và chống giả mạo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/verify">
                Verify Certificate
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">
                <Wallet size={18} />
                Connect Wallet
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            {['Tamper-proof', 'IPFS backed', 'QR ready'].map((item) => (
              <div key={item} className="rounded-xl border border-white/70 bg-white/62 px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                {item}
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="premium-card trust-glow p-4 sm:p-6"
        >
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                  <GraduationCap className="text-blue-700" size={19} />
                  National University
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">Certificate Registry Console</p>
              </div>
              <Badge variant="success">
                <BadgeCheck size={13} />
                Verified
              </Badge>
            </div>

            <div className="grid gap-4 py-5 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Certificate ID</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-950">BC-2026-000124</p>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Student</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">Nguyen Minh Anh</p>
                  <p className="text-xs font-semibold text-slate-500">B.Sc. Computer Science</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4">
                <div className="mb-4 grid h-20 place-items-center rounded-lg bg-slate-950 text-xs font-bold text-white">
                  QR VERIFY
                </div>
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-blue-100">
                    <div className="h-2 w-4/5 rounded-full bg-blue-600" />
                  </div>
                  <div className="h-2 rounded-full bg-emerald-100">
                    <div className="h-2 w-3/5 rounded-full bg-emerald-600" />
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-2/3 rounded-full bg-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/82 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                <ShieldCheck size={18} />
                VERIFIED ON BLOCKCHAIN
              </div>
              <p className="mt-2 break-all font-mono text-xs font-semibold text-emerald-700/80">
                tx: 0x7f31...a92e / ipfs: QmVb2z...Certificate
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                {feature.icon}
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-white/70 bg-white/68 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {['Upload to IPFS', 'Wallet confirmation', 'Transaction submitted', 'Block confirmation'].map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-bold text-slate-700">{step}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
