import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  MapPin, 
  Wifi, 
  WifiOff, 
  Database, 
  Smartphone, 
  Clock, 
  Building2 
} from 'lucide-react';
import { SchoolConfig, GoogleSheetsConfig } from '../types';
import { formatIndonesianDate, formatIndonesianTime } from '../utils/storage';

interface HeaderProps {
  school: SchoolConfig;
  sheetsConfig: GoogleSheetsConfig;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenAdminDashboard: () => void;
  deviceMode: 'admin' | 'kiosk';
  onToggleDeviceMode: () => void;
  gpsActive: boolean;
  gpsDistance?: number;
  onOpenApkModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  school,
  sheetsConfig,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenAdminDashboard,
  gpsActive,
  gpsDistance,
  onOpenApkModal,
}) => {
  const [currentTime, setCurrentTime] = useState(formatIndonesianTime());
  const [currentDate, setCurrentDate] = useState(formatIndonesianDate());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatIndonesianTime());
      setCurrentDate(formatIndonesianDate());
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-800/40 shadow-xl backdrop-blur-md">
      {/* Top micro bar for system status */}
      <div className="px-3 sm:px-6 py-1.5 bg-black/30 flex items-center justify-between text-xs text-slate-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">{school.schoolName}</span>
            <span className="sm:hidden font-semibold truncate max-w-[140px]">{school.schoolName}</span>
          </span>
          <span className="hidden md:inline-block text-slate-500">|</span>
          <span className="hidden md:flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-emerald-400" />
            {currentDate}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* GPS status */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            gpsActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            <MapPin className="w-3 h-3" />
            <span>{gpsActive ? (gpsDistance !== undefined ? `${gpsDistance}m ke sekolah` : 'GPS Aktif') : 'Mencari GPS...'}</span>
          </div>

          {/* Sheets status */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
            sheetsConfig.webhookUrl ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700/50 text-slate-400'
          }`}>
            <Database className="w-3 h-3" />
            <span>{sheetsConfig.webhookUrl ? 'Sheets Terhubung' : 'Sheets Lokal'}</span>
          </div>

          {/* Internet Online indicator */}
          <div className="flex items-center gap-1 text-[11px]">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-semibold animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation / App bar */}
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* App Logo */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Presensi Guru Pintar
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                  Android APK
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-cyan-400 font-mono font-bold">{currentTime}</span>
              <span>•</span>
              <span className="hidden sm:inline">Scan Wajah Biometrik & Google Sheets</span>
              <span className="sm:hidden">Face Scan</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* APK / PWA install modal trigger */}
          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Download APK / Pasang ke HP Guru"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Pasang APK / HP</span>
            <span className="sm:hidden">APK</span>
          </button>

          {/* Admin Login / Dashboard button */}
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-300" />
                <span>Panel Admin</span>
              </button>
              <button
                onClick={onLogoutAdmin}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
                title="Keluar Admin"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95"
              title="Login Admin (admi / admin123)"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Login Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
