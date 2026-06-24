import { useCallback, useEffect, useState } from 'react';
import { BrowserProvider } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Award, Calendar, CheckCircle2, ExternalLink, FileText, GraduationCap,
  Loader2, Share2, ShieldCheck, Wallet, Ban, AlertTriangle, Hash, Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, certAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const NETWORK_NAMES = { 1: 'Ethereum', 11155111: 'Sepolia', 31337: 'Hardhat', 1337: 'Localhost' };
const shortAddress = (a) => a ? `${a.substring(0, 6)}...${a.substring(a.length - 4)}` : '';
const shorten = (v) => { if (!v) return ''; if (v.length <= 24) return v; return `${v.slice(0, 10)}...${v.slice(-8)}`; };

const statusBadge = (status) => {
  const map = { DRAFT: 'warning', IPFS_UPLOADED: 'primary', VALID: 'success', FAILED: 'danger', REVOKED: 'danger' };
  return <Badge variant={map[status] || 'default'}>{status || 'UNKNOWN'}</Badge>;
};

const StudentPortal = () => {
  const { user, updateUserInContext } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [walletNetwork, setWalletNetwork] = useState('');

  const fetchCertificates = useCallback(async () => {
    if (!user?.studentId) return;
    try {
      const res = await certAPI.getStudentCerts(user.studentId);
      setCertificates(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách văn bằng');
    } finally {
      setLoading(false);
    }
  }, [user?.studentId]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  const copyLink = async (certCode) => {
    const link = `${window.location.origin}/verify?id=${certCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Đã sao chép link xác minh!');
    } catch { toast.error('Không thể sao chép link'); }
  };

  const handleLinkWallet = async () => {
    if (!window.ethereum) { toast.error('Vui lòng cài đặt MetaMask!'); return; }
    setIsLinking(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      setWalletNetwork(NETWORK_NAMES[Number(network.chainId)] || `Chain ${network.chainId.toString()}`);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const normalizedAddress = walletAddress.toLowerCase();
      const nonceRes = await authAPI.getLinkWalletNonce({ walletAddress: normalizedAddress });
      const signature = await signer.signMessage(nonceRes.data.message);
      const res = await authAPI.linkWallet({ walletAddress: normalizedAddress, signature });
      updateUserInContext(res.data.user);
      toast.success('Liên kết ví MetaMask thành công!');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Lỗi khi liên kết ví');
    } finally {
      setIsLinking(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={44} /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Badge variant="primary" className="mb-3"><GraduationCap size={14} /> Student portal</Badge>
          <h1 className="text-3xl font-extrabold text-slate-950">Xin chào, {user.name}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Mã số sinh viên: {user.studentId}</p>
        </div>
        <Card className="lg:min-w-[340px]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`grid h-12 w-12 place-items-center rounded-xl ring-1 ${user.walletAddress ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
              <Wallet size={23} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-500">Ví MetaMask</p>
              {user.walletAddress ? (
                <div>
                  <p className="truncate text-sm font-extrabold text-emerald-700">{shortAddress(user.walletAddress)}</p>
                  <p className="text-xs font-semibold text-slate-500">{walletNetwork || 'Wallet linked'}</p>
                </div>
              ) : (
                <Button onClick={handleLinkWallet} disabled={isLinking} size="sm" className="mt-2">
                  {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />} Liên kết ví
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Award size={22} /></div>
          <div><p className="text-sm font-bold text-slate-500">Văn bằng</p><p className="text-3xl font-extrabold text-slate-950">{certificates.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><ShieldCheck size={22} /></div>
          <div><p className="text-sm font-bold text-slate-500">Hợp lệ</p><p className="text-lg font-extrabold text-emerald-700">{certificates.filter((c) => c.status === 'VALID').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200"><FileText size={22} /></div>
          <div><p className="text-sm font-bold text-slate-500">Định dạng</p><p className="text-lg font-extrabold text-slate-950">PDF + QR</p></div>
        </CardContent></Card>
      </section>

      <div>
        <h2 className="text-xl font-extrabold text-slate-950">Văn bằng của tôi</h2>
        <p className="mt-1 text-sm text-slate-500">Danh sách chứng chỉ đã được nhà trường cấp phát.</p>
      </div>

      {certificates.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-400"><Award size={42} /></div>
          <h3 className="text-lg font-extrabold text-slate-800">Bạn chưa có văn bằng nào</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Khi nhà trường cấp chứng chỉ, thông tin sẽ xuất hiện tại đây.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="flex h-full flex-col">
              <CardHeader>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Award size={23} /></div>
                  {statusBadge(cert.status)}
                </div>
                <CardTitle className="text-base">{cert.degree} - {cert.major}</CardTitle>
                <CardDescription>Mã VB: {cert.certificateCode}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Calendar size={16} /> Năm tốt nghiệp: {cert.graduationYear}
                </div>

                {cert.certificateHash && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Hash size={14} /> Hash: <span className="font-mono">{shorten(cert.certificateHash)}</span>
                  </div>
                )}
                {cert.metadataCid && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Database size={14} /> CID: <span className="font-mono">{shorten(cert.metadataCid)}</span>
                  </div>
                )}
                {cert.txHash && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <FileText size={14} /> Tx: <span className="font-mono">{shorten(cert.txHash)}</span>
                  </div>
                )}

                <div className="grid place-items-center rounded-xl border border-slate-200 bg-white/80 p-4">
                  <QRCodeSVG value={`${window.location.origin}/verify?id=${cert.certificateCode}`} size={132}
                    bgColor="#ffffff" fgColor="#0f172a" level="Q" />
                </div>

                <div className="mt-auto grid gap-2 sm:grid-cols-2">
                  {cert.fileCid && (
                    <Button asChild variant="outline">
                      <a href={`https://gateway.pinata.cloud/ipfs/${cert.fileCid}`} target="_blank" rel="noreferrer">
                        <ExternalLink size={17} /> PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => copyLink(cert.certificateCode)} className={!cert.fileCid ? 'sm:col-span-2' : ''}>
                    <Share2 size={17} /> Chia sẻ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentPortal;
