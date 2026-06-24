import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award, BadgeCheck, Calendar, CheckCircle2, Database, ExternalLink, FileText,
  Fingerprint, GraduationCap, Hash, Loader2, QrCode, Search, Shield,
  UploadCloud, User, XCircle, AlertTriangle, Ban, CloudOff,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { certAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const evidenceLabel = (v) => { if (!v) return ''; if (v.length <= 22) return v; return `${v.slice(0, 10)}...${v.slice(-8)}`; };

const formatDate = (ts) => { if (!ts) return 'N/A'; const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts); return d.toLocaleDateString('vi-VN'); };

const RenderResult = ({ result, certId }) => {
  switch (result?.result) {
    case 'VALID': {
      const d = result.data || {};
      const rows = [
        { label: 'Certificate ID', value: d.certificateCode || certId, icon: <Hash size={16} /> },
        { label: 'Certificate Hash', value: d.certificateHash, icon: <Fingerprint size={16} /> },
        { label: 'Metadata CID', value: d.metadataCid, icon: <Database size={16} /> },
        { label: 'Issued Date', value: formatDate(d.issuedAt), icon: <Calendar size={16} /> },
        { label: 'Issuer Wallet', value: d.issuer, icon: <Fingerprint size={16} /> },
        { label: 'Transaction Hash', value: d.txHash, icon: <FileText size={16} /> },
      ].filter((r) => r.value);
      return (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="trust-glow">
            <CardHeader>
              <Badge variant="success" className="mb-5 w-fit px-3 py-1.5">
                <CheckCircle2 size={15} /> VERIFIED ON BLOCKCHAIN
              </Badge>
              <CardTitle className="text-2xl text-emerald-700">Văn bằng hợp lệ</CardTitle>
              <CardDescription>Dữ liệu khớp với bản ghi đã được xác nhận trên hợp đồng thông minh.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/70 p-5">
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div><p className="text-xs font-bold uppercase text-slate-500">Certificate Preview</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-950">{d.certificateCode || certId}</p></div>
                  <Award className="text-blue-700" size={34} />
                </div>
                <div className="space-y-4">
                  <div><p className="text-xs font-bold uppercase text-slate-500">Student</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-950">{d.studentName}</p></div>
                  {d.studentCode && <div><p className="text-xs font-bold uppercase text-slate-500">Mã số SV</p>
                    <p className="mt-1 font-bold text-slate-800">{d.studentCode}</p></div>}
                  {d.universityName && <div><p className="text-xs font-bold uppercase text-slate-500">Trường</p>
                    <p className="mt-1 font-bold text-slate-800">{d.universityName}</p></div>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><p className="text-xs font-bold uppercase text-slate-500">Degree</p>
                      <p className="mt-1 font-bold text-slate-800">{d.degree}</p></div>
                    <div><p className="text-xs font-bold uppercase text-slate-500">Chuyên ngành</p>
                      <p className="mt-1 font-bold text-slate-800">{d.major}</p></div>
                    <div><p className="text-xs font-bold uppercase text-slate-500">Năm tốt nghiệp</p>
                      <p className="mt-1 font-bold text-slate-800">{d.graduationYear}</p></div>
                    <div><p className="text-xs font-bold uppercase text-slate-500">GPA</p>
                      <p className="mt-1 font-bold text-slate-800">{d.gpa}</p></div>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-5 w-full">
                <a href={`${window.location.origin}/verify?id=${d.certificateCode || certId}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={18} /> Link xác minh công khai
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Thông tin xác minh</CardTitle>
              <CardDescription>Metadata và bằng chứng kỹ thuật của văn bằng.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                  <User className="mt-0.5 flex-none text-slate-400" size={19} />
                  <div><p className="text-xs font-bold uppercase text-slate-500">Họ và tên</p>
                    <p className="mt-1 font-bold text-slate-950">{d.studentName}</p></div>
                </div>
                <div className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                  <GraduationCap className="mt-0.5 flex-none text-slate-400" size={19} />
                  <div><p className="text-xs font-bold uppercase text-slate-500">Chuyên ngành</p>
                    <p className="mt-1 font-bold text-slate-950">{d.major}</p></div>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                {rows.map((row) => (
                  <div key={row.label} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr] sm:items-center">
                    <span className="flex items-center gap-2 font-bold text-slate-500">{row.icon}{row.label}</span>
                    <span className="break-all font-mono font-bold text-slate-950" title={row.value}>{evidenceLabel(String(row.value))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    case 'REVOKED': {
      const d = result.data || {};
      return (
        <Card className="border-red-200/80">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100"><Ban size={44} /></div>
            <h2 className="text-2xl font-extrabold text-red-700">VĂN BẰNG ĐÃ BỊ THU HỒI</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Văn bằng này đã bị thu hồi và không còn hiệu lực trên blockchain.
            </p>
            <div className="mx-auto mt-5 max-w-sm space-y-2 rounded-xl border border-red-200 bg-red-50/70 p-4 text-left text-sm">
              <div className="flex justify-between"><span className="font-bold text-slate-500">Mã VB</span><span className="font-mono font-bold">{d.certificateCode || certId}</span></div>
              {d.issuer && <div className="flex justify-between"><span className="font-bold text-slate-500">Issuer</span><span className="font-mono text-xs">{evidenceLabel(d.issuer)}</span></div>}
              {d.revokedAt && <div className="flex justify-between"><span className="font-bold text-slate-500">Thu hồi lúc</span><span>{formatDate(d.revokedAt)}</span></div>}
            </div>
          </CardContent>
        </Card>
      );
    }

    case 'TAMPERED': {
      const d = result.data || {};
      return (
        <Card className="border-red-200/80">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100"><AlertTriangle size={44} /></div>
            <h2 className="text-2xl font-extrabold text-red-700">DỮ LIỆU ĐÃ BỊ THAY ĐỔI</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Dữ liệu IPFS không khớp với bản ghi blockchain. Văn bằng có thể đã bị can thiệp.
            </p>
            <div className="mx-auto mt-5 max-w-sm space-y-2 rounded-xl border border-red-200 bg-red-50/70 p-4 text-left text-sm">
              <div className="flex justify-between"><span className="font-bold text-slate-500">Mã VB</span><span className="font-mono font-bold">{d.certificateCode || certId}</span></div>
              {d.recomputedHash && <div className="flex justify-between"><span className="font-bold text-slate-500">Hash IPFS</span><span className="font-mono text-xs">{evidenceLabel(d.recomputedHash)}</span></div>}
              {d.chainHash && <div className="flex justify-between"><span className="font-bold text-slate-500">Hash Chain</span><span className="font-mono text-xs">{evidenceLabel(d.chainHash)}</span></div>}
            </div>
          </CardContent>
        </Card>
      );
    }

    case 'IPFS_UNAVAILABLE':
      return (
        <Card className="border-amber-200/80">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100"><CloudOff size={44} /></div>
            <h2 className="text-2xl font-extrabold text-amber-700">IPFS TẠM THỜI KHÔNG KHẢ DỤNG</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Không thể tải metadata từ IPFS. Vui lòng thử lại sau hoặc kiểm tra gateway.
            </p>
          </CardContent>
        </Card>
      );

    case 'NOT_FOUND':
    default:
      return (
        <Card className="border-red-200/80">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100"><XCircle size={44} /></div>
            <h2 className="text-2xl font-extrabold text-red-700">KHÔNG TÌM THẤY VĂN BẰNG</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Mã này không tồn tại trên blockchain hoặc chưa được cấp phát.
            </p>
          </CardContent>
        </Card>
      );
  }
};

const VerifyPage = () => {
  const [certId, setCertId] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchParams] = useSearchParams();

  const verifyCertificate = useCallback(async (idToVerify) => {
    const normalizedId = idToVerify?.trim();
    if (!normalizedId) return;
    setIsLoading(true);
    setHasSearched(true);
    setResult(null);
    try {
      const response = await certAPI.verify(normalizedId);
      const data = response.data;
      if (data.result) {
        setResult(data);
      } else if (data.data) {
        setResult({ result: 'VALID', data: data.data });
      } else {
        setResult({ result: 'VALID', data: data });
      }
      if (data.result === 'VALID') toast.success('Xác minh thành công!');
    } catch (error) {
      const data = error.response?.data;
      if (data?.result) {
        setResult(data);
      } else {
        setResult({ result: 'NOT_FOUND' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) { setCertId(urlId); verifyCertificate(urlId); }
  }, [searchParams, verifyCertificate]);

  useEffect(() => {
    if (!isScanning) return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render((decodedText) => {
      let idFromQR = decodedText;
      try { const url = new URL(decodedText); const p = new URLSearchParams(url.search); if (p.has('id')) idFromQR = p.get('id'); } catch {}
      scanner.clear().catch(() => {});
      setIsScanning(false);
      setCertId(idFromQR);
      verifyCertificate(idFromQR);
    }, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [isScanning, verifyCertificate]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <section className="mx-auto max-w-3xl py-7 text-center sm:py-12">
        <Badge variant="primary" className="mb-5"><Shield size={14} /> Blockchain Certificate Verification</Badge>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-5xl">Xác minh văn bằng tức thời</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Nhập Certificate ID để kiểm tra dữ liệu văn bằng đã được ghi nhận trên blockchain.
        </p>
      </section>

      <section className="premium-card trust-glow mx-auto max-w-4xl p-3 sm:p-4">
        <form onSubmit={(e) => { e.preventDefault(); verifyCertificate(certId); }} className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input type="text" className="form-control min-h-14 pl-12 text-base sm:text-lg"
              placeholder="Certificate ID (VD: VB-2024-001)" value={certId}
              onChange={(e) => setCertId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" size="lg" onClick={() => setIsScanning((v) => !v)} className="w-full sm:w-auto">
              <QrCode size={19} /> QR
            </Button>
            <Button type="submit" size="lg" disabled={isLoading || !certId.trim()} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="animate-spin" size={19} /> : <BadgeCheck size={19} />} Xác minh
            </Button>
          </div>
        </form>
      </section>

      {isScanning && (
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div><CardTitle className="flex items-center gap-2"><QrCode className="text-blue-600" size={20} /> Quét QR</CardTitle>
              <CardDescription>Camera sẽ đọc mã xác minh và tự động kiểm tra.</CardDescription></div>
            <Button variant="ghost" onClick={() => setIsScanning(false)}>Đóng</Button>
          </CardHeader>
          <CardContent><div id="reader" className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white" /></CardContent>
        </Card>
      )}

      {hasSearched && (
        <section className="mx-auto max-w-5xl">
          {isLoading ? (
            <Card><CardContent className="flex min-h-56 items-center justify-center">
              <div className="text-center"><Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={38} />
                <p className="text-sm font-bold text-slate-600">Đang truy vấn dữ liệu on-chain...</p></div>
            </CardContent></Card>
          ) : (
            <RenderResult result={result} certId={certId} />
          )}
        </section>
      )}

      {!hasSearched && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Shield size={22} />, title: 'Chống giả mạo', description: 'Dữ liệu được kiểm tra dựa trên bản ghi on-chain.' },
            { icon: <Database size={22} />, title: 'IPFS evidence', description: 'CID của file gốc giúp đối chiếu tài liệu.' },
            { icon: <BadgeCheck size={22} />, title: 'Xác minh tức thời', description: 'Tra cứu bằng mã số hoặc quét QR.' },
          ].map((f) => (
            <Card key={f.title}><CardHeader>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">{f.icon}</div>
              <CardTitle>{f.title}</CardTitle><CardDescription>{f.description}</CardDescription>
            </CardHeader></Card>
          ))}
        </section>
      )}
    </div>
  );
};

export default VerifyPage;
