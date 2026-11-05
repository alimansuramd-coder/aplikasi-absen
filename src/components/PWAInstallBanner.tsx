import React, { useState } from 'react';
import { Smartphone, Download, X, Check, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-blue-500/30 px-3 py-2 text-white shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="text-xs truncate">
              <strong className="text-emerald-300 font-semibold">Pasang Aplikasi di HP Guru:</strong>{' '}
              <span className="text-slate-300 hidden sm:inline">
                Akses cepat kamera dan GPS tanpa membuka browser
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow flex items-center gap-1 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'Pasang di iPhone' : 'Pasang APK / Android'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-md transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Share className="w-4 h-4 text-cyan-400" />
              <span>Cara Pasang di iPhone / iPad:</span>
            </h3>
            <div className="mt-3 text-xs text-slate-300 space-y-2">
              <p>1. Tekan tombol <strong>Bagikan (Share)</strong> di bar bawah Safari.</p>
              <p>2. Gulir ke bawah lalu pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</p>
              <p>3. Aplikasi akan langsung muncul di beranda HP Anda layaknya aplikasi native!</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
