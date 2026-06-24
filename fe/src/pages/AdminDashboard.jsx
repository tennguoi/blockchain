import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Activity, Award, CheckCircle2, Database, FileText, FileX, Hash, Loader2,
  Plus, ShieldAlert, Unlink, UploadCloud, Wallet, X, Search, Eye, Clock,
  Ban, RefreshCw, AlertTriangle, Info, Users, UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, certAPI, adminAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const NETWORK_NAMES = { 1: 'Ethereum', 11155111: 'Sepolia', 31337: 'Hardhat', 1337: 'Localhost' };
const TABS = ['dashboard', 'issue', 'certificates', 'revoke', 'students'];

const shortAddress = (a) => a ? `${a.substring(0, 6)}...${a.substring(a.length - 4)}` : '';
const shorten = (v) => { if (!v) return 'N/A'; if (v.length <= 24) return v; return `${v.slice(0, 10)}...${v.slice(-8)}`; };

const statusBadge = (status) => {
  const map = {
    DRAFT: 'warning', IPFS_UPLOADED: 'primary', VALID: 'success',
    FAILED: 'danger', REVOKED: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
};

const initialIssueForm = {
  certificateId: '', studentId: '', studentName: '', universityName: 'Trường Đại học Blockchain Việt Nam',
  degree: 'Cử nhân', major: '', graduationYear: new Date().getFullYear().toString(), gpa: '',
};

const issueSteps = [
  'Uploading to IPFS', 'Waiting wallet confirmation', 'Transaction submitted',
  'Waiting block confirmation', 'Certificate issued successfully',
];

const AdminDashboard = () => {
  const { user, updateUserInContext } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [certs, setCerts] = useState([]);
  const [certPagination, setCertPagination] = useState(null);
  const [certSearch, setCertSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('');
  const [certPage, setCertPage] = useState(1);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  const [isLinking, setIsLinking] = useState(false);
  const [walletNetwork, setWalletNetwork] = useState('');
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowStep, setFlowStep] = useState(-1);
  const [issuedCert, setIssuedCert] = useState(null);
  const [issueError, setIssueError] = useState(null);
  const [revokeForm, setRevokeForm] = useState({ id: '', reason: '' });
  const [isRevoking, setIsRevoking] = useState(false);
  
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentForm, setStudentForm] = useState({ email: '', password: '', name: '', studentId: '' });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (TABS.includes(hash)) setActiveTab(hash);
  }, [location.hash]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await adminAPI.getDashboard();
      setDashboard(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCerts = useCallback(async (page, status, search) => {
    setLoadingCerts(true);
    try {
      const params = { page: page || 1, limit: 20 };
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await adminAPI.getCertificates(params);
      setCerts(res.data.data);
      setCertPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách văn bằng');
    } finally {
      setLoadingCerts(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await adminAPI.getStudents();
      setStudents(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'certificates') {
      fetchCerts(certPage, certStatusFilter, certSearch);
    } else if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, certPage, certStatusFilter, fetchCerts, fetchStudents]);

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

  const handleUnlinkWallet = async () => {
    if (!user?.walletAddress) return;
    if (!window.confirm('Hủy liên kết ví MetaMask?')) return;
    try {
      const res = await authAPI.unlinkWallet();
      updateUserInContext(res.data.user);
      setWalletNetwork('');
      toast.success('Đã hủy liên kết ví!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi hủy liên kết ví');
    }
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    if (!file) { toast.error('Vui lòng chọn file văn bằng'); return; }
    setIsSubmitting(true);
    setFlowStep(0);
    setIssueError(null);
    const progressTimer = setInterval(() => {
      setFlowStep((current) => Math.min(current + 1, issueSteps.length - 2));
    }, 850);
    const formData = new FormData();
    Object.entries(issueForm).forEach(([key, value]) => formData.append(key, value));
    formData.append('file', file);
    try {
      const response = await certAPI.issue(formData);
      clearInterval(progressTimer);
      setFlowStep(issueSteps.length - 1);
      const receipt = response.data;
      setIssuedCert({ ...issueForm, ...receipt, fileName: file.name });
      toast.success('Cấp phát văn bằng thành công!');
      setIssueForm({ ...initialIssueForm, graduationYear: new Date().getFullYear().toString() });
      setFile(null);
      setFileInputKey((k) => k + 1);
      fetchDashboard();
    } catch (error) {
      clearInterval(progressTimer);
      setFlowStep(-1);
      const msg = error.response?.data?.error || 'Lỗi khi cấp phát văn bằng';
      setIssueError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSubmit = async (event) => {
    event.preventDefault();
    setIsRevoking(true);
    try {
      await certAPI.revoke(revokeForm.id, revokeForm.reason);
      toast.success('Thu hồi văn bằng thành công!');
      setRevokeForm({ id: '', reason: '' });
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi thu hồi văn bằng');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingStudent(true);
    try {
      await authAPI.registerStudent(studentForm);
      toast.success('Đăng ký tài khoản sinh viên thành công!');
      setStudentForm({ email: '', password: '', name: '', studentId: '' });
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi tạo sinh viên');
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const handleSearch = () => {
    setCertPage(1);
    fetchCerts(1, certStatusFilter, certSearch);
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={44} /></div>;
  }

  const metadataPreview = [
    { label: 'Certificate ID', value: issueForm.certificateId || 'Chưa nhập', icon: <Hash size={16} /> },
    { label: 'Student', value: issueForm.studentName || 'Chưa nhập', icon: <Award size={16} /> },
    { label: 'IPFS CID', value: issuedCert?.ipfsCID || 'Sẽ tạo sau khi upload', icon: <Database size={16} /> },
    { label: 'Signing wallet', value: user?.walletAddress ? shorten(user.walletAddress) : 'Backend issuer wallet', icon: <Wallet size={16} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Badge variant="primary" className="mb-3"><Wallet size={14} /> Admin console</Badge>
          <h1 className="text-3xl font-extrabold text-slate-950">Certificate Registry Dashboard</h1>
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
                  <Button onClick={handleUnlinkWallet} disabled={isLinking} size="sm" variant="danger" className="mt-3">
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />} Hủy liên kết
                  </Button>
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

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? 'default' : 'outline'} onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' && <Activity size={16} />}
            {tab === 'issue' && <Plus size={16} />}
            {tab === 'certificates' && <FileText size={16} />}
            {tab === 'revoke' && <ShieldAlert size={16} />}
            {tab === 'students' && <Users size={16} />}
            {tab === 'students' ? 'Quản lý sinh viên' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'dashboard' && dashboard && (
        <>
          <section className="grid gap-4 md:grid-cols-5">
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Award size={24} /></div>
              <div><p className="text-sm font-bold text-slate-500">Tổng văn bằng</p><p className="mt-1 text-3xl font-extrabold text-slate-950">{dashboard.db.totalCertificates}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><CheckCircle2 size={24} /></div>
              <div><p className="text-sm font-bold text-slate-500">VALID</p><p className="mt-1 text-3xl font-extrabold text-emerald-700">{dashboard.db.statusBreakdown.VALID || 0}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100"><FileX size={24} /></div>
              <div><p className="text-sm font-bold text-slate-500">FAILED</p><p className="mt-1 text-3xl font-extrabold text-red-700">{dashboard.db.statusBreakdown.FAILED || 0}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100"><Ban size={24} /></div>
              <div><p className="text-sm font-bold text-slate-500">REVOKED</p><p className="mt-1 text-3xl font-extrabold text-red-700">{dashboard.db.statusBreakdown.REVOKED || 0}</p></div>
            </CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100"><AlertTriangle size={24} /></div>
              <div><p className="text-sm font-bold text-slate-500">Hôm nay cấp</p><p className="mt-1 text-3xl font-extrabold text-slate-950">{dashboard.db.todayIssued}</p></div>
            </CardContent></Card>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Văn bằng gần đây</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {dashboard.recentCertificates?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/70 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-950">{c.certificateCode}</p>
                      <p className="text-xs text-slate-500">{c.studentName} - {c.degree} - {c.major}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(c.status)}
                      <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Xác minh gần đây</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                  {dashboard.recentVerificationLogs?.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono text-xs text-slate-600">{l.certificate?.certificateCode || 'N/A'}</span>
                      {statusBadge(l.result)}
                    </div>
                  ))}
                  {(!dashboard.recentVerificationLogs || dashboard.recentVerificationLogs.length === 0) && <p className="text-sm text-slate-400">Chưa có</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Audit gần đây</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                  {dashboard.recentAuditLogs?.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-xs font-semibold text-slate-600">{l.action}</span>
                      <span className="text-xs text-slate-400">{l.actor?.name || 'System'}</span>
                    </div>
                  ))}
                  {(!dashboard.recentAuditLogs || dashboard.recentAuditLogs.length === 0) && <p className="text-sm text-slate-400">Chưa có</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {activeTab === 'issue' && (
        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle>Cấp phát văn bằng mới</CardTitle>
              <CardDescription>Nhập thông tin chính xác trước khi upload IPFS và ghi nhận on-chain.</CardDescription>
            </CardHeader>
            <CardContent>
              {issueError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} /> {issueError}
                </div>
              )}
              <form onSubmit={handleIssueSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="form-label">Mã văn bằng</label>
                    <input required className="form-control" placeholder="VD: VB-2026-001" value={issueForm.certificateId}
                      onChange={(e) => setIssueForm((f) => ({ ...f, certificateId: e.target.value }))} /></div>
                  <div><label className="form-label">Tên trường</label>
                    <input required className="form-control" value={issueForm.universityName}
                      onChange={(e) => setIssueForm((f) => ({ ...f, universityName: e.target.value }))} /></div>
                  <div><label className="form-label">Mã sinh viên</label>
                    <input required className="form-control" placeholder="Mã SV" value={issueForm.studentId}
                      onChange={(e) => setIssueForm((f) => ({ ...f, studentId: e.target.value }))} /></div>
                  <div><label className="form-label">Họ và tên sinh viên</label>
                    <input required className="form-control" placeholder="Họ tên đầy đủ" value={issueForm.studentName}
                      onChange={(e) => setIssueForm((f) => ({ ...f, studentName: e.target.value }))} /></div>
                  <div><label className="form-label">Loại bằng</label>
                    <select required className="form-control" value={issueForm.degree}
                      onChange={(e) => setIssueForm((f) => ({ ...f, degree: e.target.value }))}>
                      <option value="Cử nhân">Cử nhân</option><option value="Kỹ sư">Kỹ sư</option>
                      <option value="Thạc sĩ">Thạc sĩ</option><option value="Tiến sĩ">Tiến sĩ</option>
                    </select></div>
                  <div><label className="form-label">Chuyên ngành</label>
                    <input required className="form-control" placeholder="VD: Công nghệ thông tin" value={issueForm.major}
                      onChange={(e) => setIssueForm((f) => ({ ...f, major: e.target.value }))} /></div>
                  <div><label className="form-label">Năm tốt nghiệp</label>
                    <input required type="number" className="form-control" value={issueForm.graduationYear}
                      onChange={(e) => setIssueForm((f) => ({ ...f, graduationYear: e.target.value }))} /></div>
                  <div><label className="form-label">GPA</label>
                    <input required type="number" step="0.01" className="form-control" placeholder="VD: 3.8"
                      value={issueForm.gpa} onChange={(e) => setIssueForm((f) => ({ ...f, gpa: e.target.value }))} /></div>
                </div>
                <div>
                  <label className="form-label">File văn bằng</label>
                  <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/45 px-5 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50">
                    <UploadCloud className="mb-3 text-blue-700" size={34} />
                    <span className="font-extrabold text-slate-900">{file ? file.name : 'Kéo thả PDF hoặc chọn file để upload'}</span>
                    <span className="mt-1 text-sm font-semibold text-slate-500">File sẽ được lưu trữ trên IPFS trước khi ghi nhận blockchain</span>
                    <input key={fileInputKey} type="file" className="hidden" accept=".pdf,image/*"
                      onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    {isSubmitting ? 'Đang xử lý giao dịch' : 'Issue Certificate'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Metadata preview</CardTitle><CardDescription>Các giá trị sẽ được đóng gói trước khi gửi transaction.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {metadataPreview.map((row) => (
                  <div key={row.label} className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-3">
                    <span className="mt-0.5 text-blue-600">{row.icon}</span>
                    <div className="min-w-0"><p className="text-xs font-bold uppercase text-slate-500">{row.label}</p>
                      <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{row.value}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Transaction flow</CardTitle><CardDescription>Trạng thái trực quan của quy trình cấp phát.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {issueSteps.map((step, index) => {
                  const isFinal = index === issueSteps.length - 1;
                  const complete = flowStep > index || (isFinal && flowStep === index);
                  const active = flowStep === index && !complete;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-extrabold ring-1 ${complete ? 'bg-emerald-600 text-white ring-emerald-600' : ''} ${active ? 'bg-blue-600 text-white ring-blue-600' : ''} ${!complete && !active ? 'bg-white text-slate-400 ring-slate-200' : ''}`}>
                        {complete ? <CheckCircle2 size={16} /> : active ? <Loader2 className="animate-spin" size={15} /> : index + 1}
                      </span>
                      <div><p className={`text-sm font-bold ${active || complete ? 'text-slate-950' : 'text-slate-500'}`}>{step}</p>
                        <p className="text-xs font-semibold text-slate-400">{active ? 'Đang xử lý' : complete ? 'Hoàn tất' : 'Đang chờ'}</p></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {activeTab === 'certificates' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Danh sách văn bằng</CardTitle>
              <div className="flex items-center gap-2">
                <select className="form-control w-auto" value={certStatusFilter} onChange={(e) => { setCertStatusFilter(e.target.value); setCertPage(1); }}>
                  <option value="">Tất cả</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="IPFS_UPLOADED">IPFS_UPLOADED</option>
                  <option value="VALID">VALID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
                <input className="form-control w-48" placeholder="Tìm kiếm..." value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                <Button size="sm" onClick={handleSearch}><Search size={16} /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingCerts ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
            ) : certs.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Không có văn bằng nào</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="py-3 pr-3">Mã VB</th>
                      <th className="py-3 pr-3">Sinh viên</th>
                      <th className="py-3 pr-3">Ngành</th>
                      <th className="py-3 pr-3">Năm</th>
                      <th className="py-3 pr-3">Trạng thái</th>
                      <th className="py-3 pr-3">metadataCid</th>
                      <th className="py-3 pr-3">certificateHash</th>
                      <th className="py-3 pr-3">txHash</th>
                      <th className="py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certs.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 pr-3 font-mono text-xs font-bold">{c.certificateCode}</td>
                        <td className="py-3 pr-3 font-bold">{c.studentName}</td>
                        <td className="py-3 pr-3 text-slate-600">{c.major}</td>
                        <td className="py-3 pr-3">{c.graduationYear}</td>
                        <td className="py-3 pr-3">{statusBadge(c.status)}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-slate-500" title={c.metadataCid}>{shorten(c.metadataCid)}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-slate-500" title={c.certificateHash}>{shorten(c.certificateHash)}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-slate-500" title={c.txHash}>{shorten(c.txHash)}</td>
                        <td className="py-3 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedCert(c)}><Eye size={14} /></Button>
                          {c.status === 'VALID' && (
                            <Button size="sm" variant="danger" onClick={async () => {
                              if (window.confirm(`Thu hồi ${c.certificateCode}?`)) {
                                try {
                                  await certAPI.revoke(c.certificateCode, 'Thu hồi từ Admin');
                                  toast.success('Đã thu hồi');
                                  fetchCerts(certPage, certStatusFilter, certSearch);
                                } catch (e) { toast.error(e.response?.data?.error || 'Lỗi'); }
                              }
                            }}><Ban size={14} /></Button>
                          )}
                          {(c.status === 'FAILED' || c.status === 'IPFS_UPLOADED') && (
                            <Button size="sm" variant="outline" onClick={async () => {
                              try {
                                await adminAPI.reconcile(c.id);
                                toast.success('Reconcile thành công');
                                fetchCerts(certPage, certStatusFilter, certSearch);
                              } catch (e) { toast.error(e.response?.data?.error || 'Lỗi'); }
                            }}><RefreshCw size={14} /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {certPagination && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Tổng: {certPagination.total}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={certPagination.page <= 1}
                        onClick={() => setCertPage((p) => p - 1)}>Trước</Button>
                      <span className="flex items-center px-3 text-slate-600">Trang {certPagination.page}/{certPagination.totalPages}</span>
                      <Button size="sm" variant="outline" disabled={certPagination.page >= certPagination.totalPages}
                        onClick={() => setCertPage((p) => p + 1)}>Sau</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'revoke' && (
        <Card className="border-red-200/80">
          <CardHeader>
            <Badge variant="danger" className="mb-3 w-fit"><ShieldAlert size={14} /> Critical action</Badge>
            <CardTitle className="text-red-700">Thu hồi văn bằng</CardTitle>
            <CardDescription>Thao tác này đánh dấu văn bằng không còn hợp lệ trên blockchain.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRevokeSubmit} className="space-y-5">
              <div><label className="form-label">Mã văn bằng cần thu hồi</label>
                <input required className="form-control" placeholder="Nhập mã số văn bằng"
                  value={revokeForm.id} onChange={(e) => setRevokeForm((f) => ({ ...f, id: e.target.value }))} /></div>
              <div><label className="form-label">Lý do thu hồi</label>
                <textarea required className="form-control min-h-32" placeholder="VD: Sai sót thông tin..."
                  value={revokeForm.reason} onChange={(e) => setRevokeForm((f) => ({ ...f, reason: e.target.value }))} /></div>
              <Button type="submit" variant="danger" disabled={isRevoking} className="w-full sm:w-auto">
                {isRevoking ? <Loader2 className="animate-spin" size={19} /> : <ShieldAlert size={19} />}
                Xác nhận thu hồi
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'students' && (
        <section className="grid gap-5 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Đăng ký sinh viên mới</CardTitle>
              <CardDescription>Tạo tài khoản học viên để cấp phát văn bằng.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Họ và tên</label>
                  <input required className="form-control" placeholder="Nguyễn Văn A" value={studentForm.name}
                    onChange={(e) => setStudentForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Mã số sinh viên (MSSV)</label>
                  <input required className="form-control" placeholder="SV2024001" value={studentForm.studentId}
                    onChange={(e) => setStudentForm((f) => ({ ...f, studentId: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Email tài khoản</label>
                  <input required type="email" className="form-control" placeholder="student@university.edu" value={studentForm.email}
                    onChange={(e) => setStudentForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Mật khẩu đăng nhập</label>
                  <input required type="password" className="form-control" placeholder="••••••••" value={studentForm.password}
                    onChange={(e) => setStudentForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <Button type="submit" disabled={isCreatingStudent} className="w-full">
                  {isCreatingStudent ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
                  Đăng ký tài khoản
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách sinh viên trực thuộc</CardTitle>
              <CardDescription>Tất cả sinh viên đã đăng ký trong cơ sở dữ liệu của trường.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loadingStudents ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
              ) : students.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Chưa có sinh viên nào đăng ký</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="py-3 pr-3">MSSV</th>
                      <th className="py-3 pr-3">Họ Tên</th>
                      <th className="py-3 pr-3">Email</th>
                      <th className="py-3 pr-3">Ví MetaMask</th>
                      <th className="py-3">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((std) => (
                      <tr key={std.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 pr-3 font-mono text-xs font-bold">{std.studentId}</td>
                        <td className="py-3 pr-3 font-bold text-slate-900">{std.name}</td>
                        <td className="py-3 pr-3 text-slate-600 font-mono text-xs">{std.email}</td>
                        <td className="py-3 pr-3">
                          {std.walletAddress ? (
                            <Badge variant="success" title={std.walletAddress}>Đã liên kết ví</Badge>
                          ) : (
                            <Badge variant="warning">Chưa liên kết</Badge>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">{new Date(std.createdAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {selectedCert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setSelectedCert(null)}>
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 shrink-0">
              <div><CardTitle>Chi tiết văn bằng</CardTitle></div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCert(null)}><X size={20} /></Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm overflow-y-auto flex-1">
              {[
                ['Mã văn bằng', selectedCert.certificateCode],
                ['Sinh viên', selectedCert.studentName],
                ['Mã SV', selectedCert.studentCode],
                ['Trường', selectedCert.universityName],
                ['Loại bằng', selectedCert.degree],
                ['Chuyên ngành', selectedCert.major],
                ['Năm tốt nghiệp', selectedCert.graduationYear],
                ['GPA', selectedCert.gpa],
                ['Trạng thái', selectedCert.status],
                ['fileCid', selectedCert.fileCid],
                ['metadataCid', selectedCert.metadataCid],
                ['certificateHash', selectedCert.certificateHash],
                ['txHash', selectedCert.txHash],
                ['revokeTxHash', selectedCert.revokeTxHash],
                ['Ngày tạo', selectedCert.createdAt && new Date(selectedCert.createdAt).toLocaleString('vi-VN')],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-3 rounded-lg border border-slate-200 bg-white/70 p-3">
                  <span className="min-w-24 text-xs font-bold uppercase text-slate-500">{label}</span>
                  <span className="break-all font-mono text-xs font-semibold text-slate-950">{value}</span>
                </div>
              ))}
              <div className="mt-2">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Link xác minh</p>
                <input className="form-control w-full text-xs" readOnly value={`${window.location.origin}/verify?id=${selectedCert.certificateCode}`}
                  onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value).catch(() => {}); }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {issuedCert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <Badge variant="success" className="mb-3"><CheckCircle2 size={14} /> Issued</Badge>
                <CardTitle>Cấp phát thành công</CardTitle>
                <CardDescription>QR này trỏ tới trang xác minh công khai của văn bằng.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIssuedCert(null)}><X size={20} /></Button>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <div className="inline-block rounded-xl border border-slate-200 bg-white p-4">
                <QRCodeSVG value={`${window.location.origin}/verify?id=${issuedCert.certificateId}`} size={190}
                  bgColor="#ffffff" fgColor="#0f172a" level="Q" />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left">
                {[
                  ['Certificate ID', issuedCert.certificateId],
                  ['Certificate Hash', issuedCert.certificateHash],
                  ['IPFS CID', issuedCert.ipfsCID],
                  ['IPFS Metadata CID', issuedCert.ipfsMetadataCID],
                  ['Tx Hash', issuedCert.txHash],
                  ['Trạng thái', issuedCert.status || 'VALID'],
                ].map(([label, value]) => value ? (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-500">{label}</span>
                    <span className="truncate font-mono font-bold text-slate-950" title={value}>{shorten(value)}</span>
                  </div>
                ) : null)}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-500">Link verify</span>
                  <a className="truncate font-mono text-xs text-blue-600 underline" target="_blank" rel="noreferrer"
                    href={`${window.location.origin}/verify?id=${issuedCert.certificateId}`}>
                    {window.location.origin}/verify?id={issuedCert.certificateId}
                  </a>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setIssuedCert(null); fetchDashboard(); }}>
                <FileText size={18} /> Đóng và tiếp tục
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
