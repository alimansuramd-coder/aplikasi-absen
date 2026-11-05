import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Download, 
  Share2, 
  Check, 
  Copy, 
  QrCode, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  Apple,
  Layers,
  MessageCircle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
}

export const ApkDistributionModal: React.FC<ApkDistributionModalProps> = ({
  isOpen,
  onClose,
  schoolName,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios' | 'qrcode'>('android');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      // Auto detect user device for active tab
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActivePlatformTab('ios');
      } else {
        setActivePlatformTab('android');
      }

      if (qrCanvasRef.current) {
        QRCode.toCanvas(qrCanvasRef.current, url, {
          width: 220,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo Bapak/Ibu Guru ${schoolName},\n\nSilakan buka dan pasang Aplikasi Presensi Guru (Scan Wajah & Google Sheets) di HP Android atau iPhone masing-masing melalui link berikut:\n\n${appUrl}\n\nCara pasang: Buka link lalu pilih "Pasang Aplikasi" / "Tambahkan ke Layar Utama". Terima kasih!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleInstallClick = async () => {
    await install();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Paket Instalasi HP Guru (Android APK &amp; iPhone)
              </h3>
              <p className="text-xs text-emerald-100">
                Kompatibel dengan semua versi Android &amp; semua versi iPhone / iOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6 overflow-x-auto gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActivePlatformTab('android')}
            className={`py-3 px-3.5 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activePlatformTab === 'android'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android (Semua Versi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatformTab('ios')}
            className={`py-3 px-3.5 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activePlatformTab === 'ios'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4 text-cyan-400" />
            <span>iPhone / iPad (Semua iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatformTab('qrcode')}
            className={`py-3 px-3.5 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activePlatformTab === 'qrcode'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR &amp; Bagikan WA</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: ANDROID (SEMUA VERSI) */}
          {activePlatformTab === 'android' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Instalasi Otomatis Android WebAPK
                  </span>
                </div>

                {isInstalled ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Aplikasi Sudah Terpasang sebagai APK di HP Android Ini</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-98 transition"
                  >
                    <Download className="w-5 h-5" />
                    <span>PASANG / INSTALL APK KE ANDROID SEKARANG</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-300 space-y-2">
                    <p className="font-semibold text-emerald-300">
                      Cara Pasang di Browser Chrome / Samsung Internet / Mi Browser:
                    </p>
                    <div className="p-3 rounded-xl bg-black/40 text-left text-[11px] text-slate-300 space-y-1.5 border border-slate-800">
                      <p>
                        1. Buka link ini di browser <strong>Chrome</strong> HP Android guru.
                      </p>
                      <p>
                        2. Ketuk tombol <strong>Menu Titik Tiga (⋮)</strong> di pojok kanan atas browser.
                      </p>
                      <p>
                        3. Pilih opsi <strong>"Pasang Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Install app)</strong>.
                      </p>
                      <p>
                        4. Android akan otomatis mengemas aplikasi ini menjadi file paket <strong>WebAPK</strong> dengan ikon di menu aplikasi, fullscreen tanpa URL bar, dan izin kamera &amp; GPS langsung aktif!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Supported Android Versions Details */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Kompatibilitas Versi Android:</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-white font-semibold block">Android 12, 13, 14, 15:</span>
                    Mendukung WebAPK instan, biometrik kamera 60fps &amp; GPS akurat.
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-white font-semibold block">Android 8, 9, 10, 11:</span>
                    Mendukung PWA Home Screen icon, kamera depan &amp; offline mode.
                  </div>
                </div>
              </div>

              {/* Native APK Packaging Guide with PWABuilder */}
              <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-500/20 text-[11px] text-blue-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Butuh file installer .APK murni untuk dibagikan via Bluetooth / Flashdisk?</p>
                  <p className="text-slate-400">Aplikasi ini sudah 100% siap di-generate jadi file .apk via PWABuilder.</p>
                </div>
                <a
                  href={`https://www.pwabuilder.com/?url=${encodeURIComponent(appUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0 shadow"
                >
                  <span>Buka PWABuilder</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE / IPAD (SEMUA VERSI IOS) */}
          {activePlatformTab === 'ios' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/40">
                <div className="flex items-center gap-2 mb-3 text-cyan-400">
                  <Apple className="w-5 h-5 text-white" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Panduan Pasang di iPhone / iPad (iOS 12 s/d iOS 18+)
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-300 leading-relaxed">
                    Di iPhone, Apple tidak mengizinkan penginstalan APK file mentah, namun mendukung penuh sistem <strong>Apple WebClip PWA</strong> yang berjalan layaknya aplikasi resmi App Store:
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <p className="text-[11px] leading-snug">
                        Buka link aplikasi ini di browser <strong>Safari</strong> (bukan Chrome/in-app WA).
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <p className="text-[11px] leading-snug">
                        Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari (ikon kotak dengan tanda panah mengarah ke atas <span className="font-bold text-white">↑</span>).
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <p className="text-[11px] leading-snug">
                        Gulir ke bawah dan ketuk opsi <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        4
                      </span>
                      <p className="text-[11px] leading-snug">
                        Ketuk tombol <strong>"Tambah" (Add)</strong> di pojok kanan atas. Ikon aplikasi akan langsung tampil di beranda iPhone Anda!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <p className="text-white font-semibold mb-0.5">Kelebihan di iPhone:</p>
                <p>
                  Aplikasi akan berjalan dalam mode mandiri (*standalone*), tanpa bilah pencarian Safari, dengan akses kamera depan selfie &amp; sensor lokasi GPS otomatis.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SCAN QR & BAGIKAN KE WHATSAPP GURU */}
          {activePlatformTab === 'qrcode' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-200 text-xs font-bold mb-3">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Scan QR Code Ini Dengan Kamera HP Android / iPhone Guru:</span>
                </div>

                {/* QR Canvas Container */}
                <div className="inline-block p-3 rounded-2xl bg-white shadow-xl mx-auto mb-3">
                  <canvas ref={qrCanvasRef} className="rounded-lg max-w-full" />
                </div>

                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Guru cukup mengarahkan kamera HP bawaan ke QR Code di atas, lalu ketuk tautan yang muncul untuk langsung membuka aplikasi.
                </p>

                {/* Action Buttons: WhatsApp Share & Copy Link */}
                <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Bagikan ke Grup WhatsApp Guru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Link Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* Teacher Device Mode Isolation Guide */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Keamanan Multi-Perangkat:</span>
                </h4>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Ketika guru memasang aplikasi ini di HP masing-masing:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                  <li>
                    Guru <strong>hanya dapat melakukan absensi foto (Masuk, Pulang, Izin, DL)</strong> dan melihat riwayat absensi.
                  </li>
                  <li>
                    Menu pendaftaran guru, pengeditan wajah master, dan pengaturan Google Sheets tetap terkunci aman di balik <strong>Login Admin (<code className="text-amber-300">admi</code> / <code className="text-amber-300">admin123</code>)</strong>.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Presensi Guru Pintar • PWA &amp; APK Ready
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition ml-auto"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
