import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BrowserProvider } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Activity,
  Award,
  CheckCircle2,
  Database,
  FileText,
  FileX,
  Hash,
  Loader2,
  Plus,
  ShieldAlert,
  Unlink,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, certAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const NETWORK_NAMES = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  31337: 'Hardhat',
  1337: 'Localhost',
};

const shortAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const walletErrorMessage = (error) => {
  if (error?.code === 4001) return 'Bạn đã từ chối yêu cầu ký ví.';
  if (error?.code === -32002) return 'MetaMask đang có một yêu cầu kết nối đang chờ.';
  return error.response?.data?.error || error.message || 'Lỗi khi liên kết ví';
};

const initialIssueForm = {
  certificateId: '',
  studentId: '',
  studentName: '',
  universityName: 'Trường Đại học Blockchain Việt Nam',
  degree: 'Cử nhân',
  major: '',
  graduationYear: new Date().getFullYear().toString(),
  gpa: '',
};

const issueSteps = [
  'Uploading to IPFS',
  'Waiting wallet confirmation',
  'Transaction submitted',
  'Waiting block confirmation',
  'Certificate issued successfully',
];

const shorten = (value) => {
  if (!value) return 'N/A';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
};

const AdminDashboard = () => {
  const { user, updateUserInContext } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState({ total: 0, revoked: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issue');
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [walletNetwork, setWalletNetwork] = useState('');
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowStep, setFlowStep] = useState(-1);
  const [issuedCert, setIssuedCert] = useState(null);
  const [revokeForm, setRevokeForm] = useState({ id: '', reason: '' });
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (location.hash === '#revoke') {
      setActiveTab('revoke');
    }
    if (location.hash === '#issue') {
      setActiveTab('issue');
    }
  }, [location.hash]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await certAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLinkWallet = async () => {
    if (!window.ethereum) {
      toast.error('Vui lòng cài đặt MetaMask!');
      return;
    }
    setIsLinking(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      setWalletNetwork(NETWORK_NAMES[Number(network.chainId)] || `Chain ${network.chainId.toString()}`);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const normalizedAddress = walletAddress.toLowerCase();
      const message = `Tôi xác nhận muốn liên kết ví ${normalizedAddress} với tài khoản ${user.id}`;
      const signature = await signer.signMessage(message);
      const res = await authAPI.linkWallet({ walletAddress: normalizedAddress, signature });
      updateUserInContext(res.data.user);
      toast.success('Liên kết ví MetaMask thành công!');
    } catch (error) {
      console.error(error);
      toast.error(walletErrorMessage(error));
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkWallet = async () => {
    if (!user?.walletAddress) return;

    const confirmed = window.confirm('Bạn có chắc muốn hủy liên kết ví MetaMask khỏi tài khoản này?');
    if (!confirmed) return;

    setIsUnlinking(true);
    try {
      const res = await authAPI.unlinkWallet();
      updateUserInContext(res.data.user);
      setWalletNetwork('');
      toast.success('Đã hủy liên kết ví MetaMask!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Lỗi khi hủy liên kết ví');
    } finally {
      setIsUnlinking(false);
    }
  };

  const updateIssueForm = (field, value) => {
    setIssueForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn file văn bằng PDF hoặc hình ảnh');
      return;
    }

    setIsSubmitting(true);
    setFlowStep(0);

    const progressTimer = window.setInterval(() => {
      setFlowStep((current) => Math.min(current + 1, issueSteps.length - 2));
    }, 850);

    const formData = new FormData();
    Object.entries(issueForm).forEach(([key, value]) => formData.append(key, value));
    formData.append('file', file);

    try {
      const response = await certAPI.issue(formData);
      window.clearInterval(progressTimer);
      setFlowStep(issueSteps.length - 1);

      const receipt = response.data;
      setIssuedCert({
        ...issueForm,
        ...receipt,
        fileName: file.name,
      });
      toast.success('Cấp phát văn bằng thành công!');

      setIssueForm({
        ...initialIssueForm,
        graduationYear: new Date().getFullYear().toString(),
      });
      setFile(null);
      setFileInputKey((key) => key + 1);
      fetchStats();
    } catch (error) {
      window.clearInterval(progressTimer);
      setFlowStep(-1);
      toast.error(error.response?.data?.error || 'Lỗi khi cấp phát văn bằng');
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
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi thu hồi văn bằng');
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={44} />
      </div>
    );
  }

  const metadataRows = [
    { label: 'Certificate ID', value: issueForm.certificateId || 'Chưa nhập', icon: <Hash size={16} /> },
    { label: 'Student', value: issueForm.studentName || 'Chưa nhập', icon: <Award size={16} /> },
    { label: 'IPFS CID', value: issuedCert?.ipfsCID || 'Sẽ tạo sau khi upload', icon: <Database size={16} /> },
    { label: 'Signing wallet', value: user?.walletAddress ? shorten(user.walletAddress) : 'Backend issuer wallet', icon: <Wallet size={16} /> },
    { label: 'Gas estimate', value: isSubmitting ? 'Đang tính toán' : 'Tính khi gửi giao dịch', icon: <Activity size={16} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Badge variant="primary" className="mb-3">
            <Wallet size={14} />
            Admin console
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-normal text-slate-950">Certificate Registry Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Quản lý cấp phát, lưu trữ IPFS và trạng thái xác minh văn bằng trên blockchain.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                    <Button
                      onClick={handleUnlinkWallet}
                      disabled={isUnlinking}
                      size="sm"
                      variant="danger"
                      className="mt-3"
                    >
                      {isUnlinking ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />}
                      Hủy liên kết
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleLinkWallet} disabled={isLinking} size="sm" className="mt-2">
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                    Liên kết ví
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Button onClick={() => setActiveTab('issue')}>
            <Plus size={18} />
            Issue Certificate
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Tổng văn bằng</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Đang hợp lệ</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FileX size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Đã thu hồi</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950">{stats.revoked}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant={activeTab === 'issue' ? 'default' : 'outline'}
          onClick={() => setActiveTab('issue')}
          className="w-full sm:w-auto"
        >
          <Plus size={18} />
          Cấp phát mới
        </Button>
        <Button
          variant={activeTab === 'revoke' ? 'danger' : 'outline'}
          onClick={() => setActiveTab('revoke')}
          className="w-full sm:w-auto"
        >
          <ShieldAlert size={18} />
          Thu hồi văn bằng
        </Button>
      </div>

      {activeTab === 'issue' ? (
        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle>Cấp phát văn bằng mới</CardTitle>
              <CardDescription>Nhập thông tin chính xác trước khi upload IPFS và ghi nhận on-chain.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIssueSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label">Mã văn bằng</label>
                    <input
                      required
                      className="form-control"
                      placeholder="VD: VB-2026-001"
                      value={issueForm.certificateId}
                      onChange={(event) => updateIssueForm('certificateId', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tên trường</label>
                    <input
                      required
                      className="form-control"
                      value={issueForm.universityName}
                      onChange={(event) => updateIssueForm('universityName', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Mã sinh viên</label>
                    <input
                      required
                      className="form-control"
                      placeholder="Mã SV"
                      value={issueForm.studentId}
                      onChange={(event) => updateIssueForm('studentId', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Họ và tên sinh viên</label>
                    <input
                      required
                      className="form-control"
                      placeholder="Họ tên đầy đủ"
                      value={issueForm.studentName}
                      onChange={(event) => updateIssueForm('studentName', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Loại bằng</label>
                    <select
                      required
                      className="form-control"
                      value={issueForm.degree}
                      onChange={(event) => updateIssueForm('degree', event.target.value)}
                    >
                      <option value="Cử nhân">Cử nhân</option>
                      <option value="Kỹ sư">Kỹ sư</option>
                      <option value="Thạc sĩ">Thạc sĩ</option>
                      <option value="Tiến sĩ">Tiến sĩ</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Chuyên ngành</label>
                    <input
                      required
                      className="form-control"
                      placeholder="VD: Công nghệ thông tin"
                      value={issueForm.major}
                      onChange={(event) => updateIssueForm('major', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Năm tốt nghiệp</label>
                    <input
                      required
                      type="number"
                      className="form-control"
                      value={issueForm.graduationYear}
                      onChange={(event) => updateIssueForm('graduationYear', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">GPA</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="VD: 3.8"
                      value={issueForm.gpa}
                      onChange={(event) => updateIssueForm('gpa', event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">File văn bằng</label>
                  <label
                    className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/45 px-5 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleFileChange(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <UploadCloud className="mb-3 text-blue-700" size={34} />
                    <span className="font-extrabold text-slate-900">
                      {file ? file.name : 'Kéo thả PDF hoặc chọn file để upload'}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-slate-500">
                      File sẽ được lưu trữ trên IPFS trước khi ghi nhận blockchain
                    </span>
                    <input
                      key={fileInputKey}
                      type="file"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(event) => handleFileChange(event.target.files?.[0])}
                    />
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
              <CardHeader>
                <CardTitle>Metadata preview</CardTitle>
                <CardDescription>Các giá trị sẽ được đóng gói trước khi gửi transaction.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metadataRows.map((row) => (
                  <div key={row.label} className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-3">
                    <span className="mt-0.5 text-blue-600">{row.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-slate-500">{row.label}</p>
                      <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{row.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction flow</CardTitle>
                <CardDescription>Trạng thái trực quan của quy trình cấp phát.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {issueSteps.map((step, index) => {
                  const isFinalStep = index === issueSteps.length - 1;
                  const complete = flowStep > index || (isFinalStep && flowStep === index);
                  const active = flowStep === index && !complete;

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span
                        className={`
                          grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-extrabold ring-1
                          ${complete ? 'bg-emerald-600 text-white ring-emerald-600' : ''}
                          ${active ? 'bg-blue-600 text-white ring-blue-600' : ''}
                          ${!complete && !active ? 'bg-white text-slate-400 ring-slate-200' : ''}
                        `}
                      >
                        {complete ? <CheckCircle2 size={16} /> : active ? <Loader2 className="animate-spin" size={15} /> : index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${active || complete ? 'text-slate-950' : 'text-slate-500'}`}>{step}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {active ? 'Đang xử lý' : complete ? 'Hoàn tất' : 'Đang chờ'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <Card className="border-red-200/80">
          <CardHeader>
            <Badge variant="danger" className="mb-3 w-fit">
              <ShieldAlert size={14} />
              Critical action
            </Badge>
            <CardTitle className="text-red-700">Thu hồi văn bằng</CardTitle>
            <CardDescription>
              Thao tác này đánh dấu văn bằng không còn hợp lệ trên blockchain và cần lý do nghiệp vụ rõ ràng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRevokeSubmit} className="space-y-5">
              <div>
                <label className="form-label">Mã văn bằng cần thu hồi</label>
                <input
                  required
                  className="form-control"
                  placeholder="Nhập mã số văn bằng"
                  value={revokeForm.id}
                  onChange={(event) => setRevokeForm((current) => ({ ...current, id: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Lý do thu hồi</label>
                <textarea
                  required
                  className="form-control min-h-32"
                  placeholder="VD: Sai sót thông tin, quyết định thu hồi từ hội đồng..."
                  value={revokeForm.reason}
                  onChange={(event) => setRevokeForm((current) => ({ ...current, reason: event.target.value }))}
                />
              </div>
              <Button type="submit" variant="danger" disabled={isRevoking} className="w-full sm:w-auto">
                {isRevoking ? <Loader2 className="animate-spin" size={19} /> : <ShieldAlert size={19} />}
                Xác nhận thu hồi
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {issuedCert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <Badge variant="success" className="mb-3">
                  <CheckCircle2 size={14} />
                  Issued
                </Badge>
                <CardTitle>Cấp phát thành công</CardTitle>
                <CardDescription>QR này trỏ tới trang xác minh công khai của văn bằng.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIssuedCert(null)}>
                <X size={20} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <div className="inline-block rounded-xl border border-slate-200 bg-white p-4">
                <QRCodeSVG
                  value={`${window.location.origin}/verify?id=${issuedCert.certificateId}`}
                  size={190}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="Q"
                />
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-500">Certificate ID</span>
                  <span className="font-mono font-bold text-slate-950">{issuedCert.certificateId}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-500">IPFS CID</span>
                  <span className="truncate font-mono font-bold text-slate-950">{shorten(issuedCert.ipfsCID)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-500">Tx Hash</span>
                  <span className="truncate font-mono font-bold text-slate-950">{shorten(issuedCert.txHash)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={() => setIssuedCert(null)}>
                <FileText size={18} />
                Đóng và tiếp tục
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
