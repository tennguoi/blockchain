import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, Building2, CheckCircle2, Database, FileText, Loader2,
  Lock, ShieldAlert, Unlock, Users, Search, AlertTriangle, Check, ShieldCheck, Clock
} from 'lucide-react';
import { superAdminAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const TABS = ['dashboard', 'requests', 'institutions'];

const shorten = (v) => {
  if (!v) return 'N/A';
  if (v.length <= 24) return v;
  return `${v.slice(0, 10)}...${v.slice(-8)}`;
};

const statusBadge = (status) => {
  const map = {
    PENDING: 'warning',
    ACTIVE: 'success',
    SUSPENDED: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
};

const SuperAdminDashboard = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Institution lists
  const [institutions, setInstitutions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingInsts, setLoadingInsts] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  
  // Processing states
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (TABS.includes(hash)) setActiveTab(hash);
  }, [location.hash]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await superAdminAPI.getDashboard();
      setDashboard(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải dữ liệu dashboard hệ thống');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstitutions = useCallback(async () => {
    setLoadingInsts(true);
    try {
      const res = await superAdminAPI.getInstitutions();
      setInstitutions(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách trường học');
    } finally {
      setLoadingInsts(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await superAdminAPI.getPending();
      setPendingRequests(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách đơn chờ duyệt');
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'institutions') {
      fetchInstitutions();
    } else if (activeTab === 'requests') {
      fetchPendingRequests();
    }
  }, [activeTab, fetchInstitutions, fetchPendingRequests]);

  const handleApprove = async (id, name) => {
    if (processingId) return;
    setProcessingId(id);
    const toastId = toast.loading(`Đang khởi tạo Smart Contract cho trường ${name}... Tác vụ này có thể mất 5-10 giây.`);
    try {
      await superAdminAPI.approve(id);
      toast.success(`Phê duyệt và deploy hợp đồng cho trường ${name} thành công!`, { id: toastId });
      fetchPendingRequests();
      fetchDashboard();
    } catch (error) {
      const msg = error.response?.data?.error || 'Phê duyệt thất bại';
      toast.error(msg, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khóa trường ${name}? Mọi hoạt động cấp bằng trực thuộc trường sẽ bị tạm ngưng.`)) {
      return;
    }
    const toastId = toast.loading('Đang xử lý...');
    try {
      await superAdminAPI.suspend(id);
      toast.success(`Đã tạm khóa trường ${name}`, { id: toastId });
      fetchInstitutions();
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Thao tác thất bại', { id: toastId });
    }
  };

  const handleActivate = async (id, name) => {
    const toastId = toast.loading('Đang kích hoạt...');
    try {
      await superAdminAPI.activate(id);
      toast.success(`Đã kích hoạt hoạt động cho trường ${name}`, { id: toastId });
      fetchInstitutions();
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Thao tác thất bại', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={44} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Badge variant="primary" className="mb-3"><ShieldCheck size={14} /> System Registry Administrator</Badge>
        <h1 className="text-3xl font-extrabold text-slate-950">Super Admin Console</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dashboard' && <Activity size={16} />}
            {tab === 'requests' && <Clock size={16} />}
            {tab === 'institutions' && <Building2 size={16} />}
            {tab === 'dashboard' ? 'Thống kê tổng quan' : tab === 'requests' ? 'Yêu cầu chờ duyệt' : 'Danh sách trường học'}
          </Button>
        ))}
      </div>

      {activeTab === 'dashboard' && dashboard && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Building2 size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Tổng trường học</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-950">{dashboard.stats.totalInstitutions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Chờ duyệt</p>
                  <p className="mt-1 text-3xl font-extrabold text-amber-700">{dashboard.stats.pendingInstitutions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Tổng văn bằng đã cấp</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-950">{dashboard.stats.totalCertificates}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Tổng tài khoản</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-950">{dashboard.stats.totalUsers}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Trường học mới tham gia</CardTitle>
                <CardDescription>Các đơn vị đại học/học viện đăng ký mới nhất trong hệ thống.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.recentInstitutions?.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-950">{inst.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Mã: {inst.code} | Email: {inst.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(inst.status)}
                      <span className="text-xs text-slate-400">{new Date(inst.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
                {(!dashboard.recentInstitutions || dashboard.recentInstitutions.length === 0) && (
                  <p className="py-5 text-center text-sm text-slate-500">Chưa có dữ liệu trường học</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nhật ký hệ thống (Audit Logs)</CardTitle>
                <CardDescription>Nhật ký hành động quan trọng toàn hệ thống.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {dashboard.recentAuditLogs?.map((log) => (
                  <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{log.action}</span>
                      <span className="font-normal text-slate-400">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="mt-1 text-slate-500 font-medium">Thực hiện bởi: {log.actor?.name || 'Hệ thống'}</p>
                  </div>
                ))}
                {(!dashboard.recentAuditLogs || dashboard.recentAuditLogs.length === 0) && (
                  <p className="py-5 text-center text-sm text-slate-500">Chưa có nhật ký</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách yêu cầu chờ duyệt</CardTitle>
            <CardDescription>Các trường đăng ký trực tuyến chờ cấp tài khoản và deploy hợp đồng thông minh.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingPending ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={36} />
                <p className="text-sm font-bold">Không có yêu cầu nào đang chờ xử lý</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="py-3 pr-3">Tên Trường/Học viện</th>
                    <th className="py-3 pr-3">Mã Trường</th>
                    <th className="py-3 pr-3">Email liên hệ nhận tài khoản</th>
                    <th className="py-3 pr-3">Ngày gửi yêu cầu</th>
                    <th className="py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 pr-3 font-bold text-slate-900">{req.name}</td>
                      <td className="py-3 pr-3"><Badge variant="primary">{req.code}</Badge></td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-600">{req.email}</td>
                      <td className="py-3 pr-3 text-slate-500">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          disabled={processingId !== null}
                          onClick={() => handleApprove(req.id, req.name)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {processingId === req.id ? (
                            <>
                              <Loader2 className="animate-spin mr-1.5" size={14} />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <Check className="mr-1" size={14} />
                              Duyệt & Deploy
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'institutions' && (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách trường học thành viên</CardTitle>
            <CardDescription>Các đơn vị đào tạo đang vận hành hệ thống lưu trữ và cấp phát văn bằng.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingInsts ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
            ) : institutions.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Chưa có trường thành viên nào</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="py-3 pr-3">Tên trường</th>
                    <th className="py-3 pr-3">Mã</th>
                    <th className="py-3 pr-3">Email liên hệ</th>
                    <th className="py-3 pr-3">Smart Contract Address</th>
                    <th className="py-3 pr-3">Trạng thái</th>
                    <th className="py-3 pr-3 text-center">Số SV</th>
                    <th className="py-3 pr-3 text-center">Bằng đã cấp</th>
                    <th className="py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 pr-3 font-bold text-slate-900">{inst.name}</td>
                      <td className="py-3 pr-3"><Badge variant="primary">{inst.code}</Badge></td>
                      <td className="py-3 pr-3 text-slate-600 font-mono text-xs">{inst.email}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-500" title={inst.contractAddress}>
                        {shorten(inst.contractAddress)}
                      </td>
                      <td className="py-3 pr-3">{statusBadge(inst.status)}</td>
                      <td className="py-3 pr-3 text-center font-bold text-slate-600">{inst._count?.users || 0}</td>
                      <td className="py-3 pr-3 text-center font-bold text-slate-700">{inst._count?.certificates || 0}</td>
                      <td className="py-3 text-right">
                        {inst.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleSuspend(inst.id, inst.name)}
                          >
                            <Lock size={13} className="mr-1" />
                            Khóa trường
                          </Button>
                        ) : inst.status === 'SUSPENDED' ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleActivate(inst.id, inst.name)}
                          >
                            <Unlock size={13} className="mr-1" />
                            Kích hoạt
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Chờ duyệt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
