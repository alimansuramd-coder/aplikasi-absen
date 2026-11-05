import React, { useState } from 'react';
import { Lock, User, KeyRound, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Required credentials: user: admi, paswot: admin123
      if (username.trim() === 'admi' && password === 'admin123') {
        setLoading(false);
        onLoginSuccess();
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setLoading(false);
        setError('Username atau password admin salah! Gunakan user: admi dan paswot: admin123');
      }
    }, 400);
  };

  const handleQuickFill = () => {
    setUsername('admi');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header decoration */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Login Portal Admin</h3>
              <p className="text-xs text-blue-200">Kontrol Data Guru & Konfigurasi Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Info pill about default credential */}
          <div className="mb-5 p-3 rounded-xl bg-blue-950/60 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-cyan-300 mb-0.5">Kredensial Resmi Admin:</p>
              <p>Username: <code className="bg-blue-900/60 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">admi</code> | Password: <code className="bg-blue-900/60 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">admin123</code></p>
              <button
                type="button"
                onClick={handleQuickFill}
                className="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100 underline decoration-cyan-400/50 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Klik di sini untuk isi otomatis
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan 'admi'"
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan 'admin123'"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Masuk Sebagai Admin</span>
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Hanya administrator / pihak sekolah yang dapat menambah guru, mengubah radius GPS, dan mengatur Google Sheets.
          </p>
        </div>
      </div>
    </div>
  );
};
