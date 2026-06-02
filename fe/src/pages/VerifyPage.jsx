import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  GraduationCap,
  Hash,
  Loader2,
  QrCode,
  Search,
  Shield,
  UploadCloud,
  User,
  XCircle,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { certAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const evidenceLabel = (value) => {
  if (!value) return '';
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
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
      setResult(response.data.data);
      toast.success('Xác minh thành công!');
    } catch (error) {
      console.error(error);
      setResult({ isValid: false });
      toast.error('Văn bằng không tồn tại hoặc không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      setCertId(urlId);
      verifyCertificate(urlId);
    }
  }, [searchParams, verifyCertificate]);

  useEffect(() => {
    if (!isScanning) return undefined;

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render((decodedText) => {
      let idFromQR = decodedText;

      try {
        const url = new URL(decodedText);
        const urlParams = new URLSearchParams(url.search);
        if (urlParams.has('id')) {
          idFromQR = urlParams.get('id');
        }
      } catch {
        // QR có thể chỉ chứa trực tiếp certificate id.
      }

      scanner.clear().catch((error) => console.error('Scanner clear error', error));
      setIsScanning(false);
      setCertId(idFromQR);
      verifyCertificate(idFromQR);
    }, () => {});

    return () => {
      scanner.clear().catch((error) => console.error('Scanner clear error', error));
    };
  }, [isScanning, verifyCertificate]);

  const handleVerify = (event) => {
    event.preventDefault();
    verifyCertificate(certId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
  };

  const evidenceRows = result?.isValid
    ? [
        { label: 'Certificate ID', value: certId, icon: <Hash size={16} /> },
        { label: 'IPFS CID', value: result.ipfsCID, icon: <Database size={16} /> },
        { label: 'Issued Date', value: formatDate(result.issuedAt), icon: <Calendar size={16} /> },
        { label: 'Issuer Wallet', value: result.issuer || result.issuedBy, icon: <Fingerprint size={16} /> },
        { label: 'Transaction Hash', value: result.txHash, icon: <FileText size={16} /> },
        { label: 'Block Number', value: result.blockNumber, icon: <Shield size={16} /> },
      ].filter((row) => row.value)
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <section className="mx-auto max-w-3xl py-7 text-center sm:py-12">
        <Badge variant="primary" className="mb-5">
          <Shield size={14} />
          Blockchain Certificate Verification
        </Badge>
        <h1 className="text-3xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
          Xác minh văn bằng tức thời
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Nhập Certificate ID, CID hoặc transaction hash để kiểm tra dữ liệu văn bằng đã được ghi nhận trên blockchain.
        </p>
      </section>

      <section className="premium-card trust-glow mx-auto max-w-4xl p-3 sm:p-4">
        <form onSubmit={handleVerify} className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input
              type="text"
              className="form-control min-h-14 pl-12 text-base sm:text-lg"
              placeholder="Certificate ID, IPFS CID hoặc transaction hash"
              value={certId}
              onChange={(event) => setCertId(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setIsScanning((value) => !value)}
              className="w-full sm:w-auto"
            >
              <QrCode size={19} />
              QR
            </Button>
            <Button type="submit" size="lg" disabled={isLoading || !certId.trim()} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="animate-spin" size={19} /> : <BadgeCheck size={19} />}
              Xác minh
            </Button>
          </div>
        </form>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50">
            <UploadCloud className="flex-none text-blue-600" size={22} />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Upload PDF để đối chiếu thủ công'}
              </span>
              <span className="block truncate text-xs font-semibold text-slate-500">
                Hỗ trợ PDF hoặc hình ảnh chứng chỉ
              </span>
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-xs font-bold text-slate-500">
            Sepolia / Hardhat ready
          </div>
        </div>
      </section>

      {isScanning && (
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="text-blue-600" size={20} />
                Quét QR văn bằng
              </CardTitle>
              <CardDescription>Camera sẽ đọc mã xác minh và tự động kiểm tra.</CardDescription>
            </div>
            <Button variant="ghost" onClick={() => setIsScanning(false)}>
              Đóng
            </Button>
          </CardHeader>
          <CardContent>
            <div id="reader" className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white" />
          </CardContent>
        </Card>
      )}

      {hasSearched && (
        <section className="mx-auto max-w-5xl">
          {isLoading ? (
            <Card>
              <CardContent className="flex min-h-56 items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={38} />
                  <p className="text-sm font-bold text-slate-600">Đang truy vấn dữ liệu on-chain...</p>
                </div>
              </CardContent>
            </Card>
          ) : result?.isValid ? (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="trust-glow">
                <CardHeader>
                  <Badge variant="success" className="mb-5 w-fit px-3 py-1.5">
                    <CheckCircle2 size={15} />
                    VERIFIED ON BLOCKCHAIN
                  </Badge>
                  <CardTitle className="text-2xl text-emerald-700">Văn bằng hợp lệ</CardTitle>
                  <CardDescription>
                    Dữ liệu khớp với bản ghi đã được xác nhận trên hợp đồng thông minh.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/70 p-5">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Certificate Preview</p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-950">{certId}</p>
                      </div>
                      <Award className="text-blue-700" size={34} />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Student</p>
                        <p className="mt-1 text-lg font-extrabold text-slate-950">{result.studentName}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">Degree</p>
                          <p className="mt-1 font-bold text-slate-800">{result.degree}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">Graduation</p>
                          <p className="mt-1 font-bold text-slate-800">{result.graduationYear}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.ipfsCID && (
                    <Button asChild variant="outline" className="mt-5 w-full">
                      <a href={`https://gateway.pinata.cloud/ipfs/${result.ipfsCID}`} target="_blank" rel="noreferrer">
                        <ExternalLink size={18} />
                        Xem file gốc trên IPFS
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin xác minh</CardTitle>
                  <CardDescription>Metadata và bằng chứng kỹ thuật của văn bằng.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                      <User className="mt-0.5 flex-none text-slate-400" size={19} />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Họ và tên</p>
                        <p className="mt-1 font-bold text-slate-950">{result.studentName}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                      <GraduationCap className="mt-0.5 flex-none text-slate-400" size={19} />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Chuyên ngành</p>
                        <p className="mt-1 font-bold text-slate-950">{result.major}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    {evidenceRows.map((row) => (
                      <div key={row.label} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr] sm:items-center">
                        <span className="flex items-center gap-2 font-bold text-slate-500">
                          {row.icon}
                          {row.label}
                        </span>
                        <span className="break-all font-mono font-bold text-slate-950" title={row.value}>
                          {evidenceLabel(String(row.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-red-200/80">
              <CardContent className="p-8 text-center sm:p-10">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
                  <XCircle size={44} />
                </div>
                <h2 className="text-2xl font-extrabold text-red-700">INVALID CERTIFICATE</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                  Mã này không tồn tại, đã bị thu hồi hoặc dữ liệu tải lên không khớp với bản ghi blockchain.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {!hasSearched && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Shield size={22} />,
              title: 'Chống giả mạo',
              description: 'Dữ liệu được kiểm tra dựa trên bản ghi on-chain, giảm rủi ro chỉnh sửa sau khi cấp.',
            },
            {
              icon: <Database size={22} />,
              title: 'IPFS evidence',
              description: 'CID của file gốc giúp đối chiếu tài liệu với metadata đã được cấp phát.',
            },
            {
              icon: <CheckCircle2 size={22} />,
              title: 'Xác minh tức thời',
              description: 'Tra cứu bằng mã số hoặc quét QR để nhận kết quả rõ ràng trong một luồng thao tác ngắn.',
            },
          ].map((feature) => (
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
      )}
    </div>
  );
};

export default VerifyPage;
