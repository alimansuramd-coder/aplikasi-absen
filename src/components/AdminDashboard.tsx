import React, { useState, useRef } from 'react';
import { 
  Users, 
  Database, 
  Settings, 
  Share2, 
  Plus, 
  Trash2, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Download, 
  ExternalLink, 
  MapPin, 
  Clock, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  X,
  Sparkles,
  Building,
  Navigation
} from 'lucide-react';
import { Teacher, AttendanceRecord, SchoolConfig, GoogleSheetsConfig } from '../types';
import { 
  exportAttendanceToCsv, 
  generateMergedSDNAppsScriptCode, 
  testGoogleSheetsConnection,
  fetchTeachersFromAppsScript 
} from '../utils/googleSheets';
import { extractBiometricVector, captureVideoFrame } from '../utils/biometrics';
import { getCurrentPosition, formatCoordinates, generateMapsUrl } from '../utils/geolocation';
import { soundEffects } from '../utils/audio';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  records: AttendanceRecord[];
  school: SchoolConfig;
  sheetsConfig: GoogleSheetsConfig;
  onSaveTeachers: (teachers: Teacher[]) => void;
  onSaveSchool: (school: SchoolConfig) => void;
  onSaveSheetsConfig: (config: GoogleSheetsConfig) => void;
  onOpenApkModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  teachers,
  records,
  school,
  sheetsConfig,
  onSaveTeachers,
  onSaveSchool,
  onSaveSheetsConfig,
  onOpenApkModal,
}) => {
  const [activeTab, setActiveTab] = useState<'guru' | 'database' | 'sheets' | 'pengaturan'>('guru');

  // Teacher Registration Form State
  const [isAddGuruModalOpen, setIsAddGuruModalOpen] = useState(false);
  const [newGuruName, setNewGuruName] = useState('');
  const [newGuruNip, setNewGuruNip] = useState('');
  const [newGuruSubject, setNewGuruSubject] = useState('');
  const [newGuruPhone, setNewGuruPhone] = useState('');
  const [newGuruPhoto, setNewGuruPhoto] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Database Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPresensi, setFilterPresensi] = useState<string>('all');

  // Sheets Config State
  const [webhookUrlInput, setWebhookUrlInput] = useState(sheetsConfig.webhookUrl);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message?: string; success?: boolean }>({
    loading: false,
  });
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSyncingTeachers, setIsSyncingTeachers] = useState(false);
  const [syncTeacherFeedback, setSyncTeacherFeedback] = useState<string | null>(null);

  // School Settings State
  const [schoolForm, setSchoolForm] = useState<SchoolConfig>({ ...school });
  const [savedSettingsFeedback, setSavedSettingsFeedback] = useState(false);

  if (!isOpen) return null;

  // Import teachers from SDN 1 CAHYA MAJU DataGuru sheet
  const handleImportTeachersFromSheet = async () => {
    if (!webhookUrlInput || !webhookUrlInput.trim()) {
      alert('Isi URL Google Apps Script Anda terlebih dahulu di tab "Koneksi Google Sheets".');
      setActiveTab('sheets');
      return;
    }

    setIsSyncingTeachers(true);
    setSyncTeacherFeedback(null);

    const result = await fetchTeachersFromAppsScript(webhookUrlInput);
    setIsSyncingTeachers(false);

    if (result.success && result.teachers && result.teachers.length > 0) {
      // Merge imported teachers, avoiding duplicate names
      const existingNames = new Set(teachers.map((t) => t.name.toLowerCase().trim()));
      const newTeachersToAdd = result.teachers.filter(
        (t) => !existingNames.has(t.name.toLowerCase().trim())
      );

      const merged = [...teachers, ...newTeachersToAdd];
      onSaveTeachers(merged);
      soundEffects.playSuccess();
      setSyncTeacherFeedback(
        `Sukses! Menemukan ${result.teachers.length} guru dari Sheet 'DataGuru'. ${newTeachersToAdd.length} guru baru ditambahkan ke aplikasi!`
      );
    } else {
      soundEffects.playError();
      setSyncTeacherFeedback(result.message);
    }
  };

  // --- TEACHER MANAGEMENT LOGIC ---
  const handleStartRegisterCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert('Tidak dapat mengaktifkan kamera. Anda dapat mengunggah file foto sebagai gantinya.');
      setIsCameraActive(false);
    }
  };

  const handleStopRegisterCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsCameraActive(false);
  };

  const handleCaptureRegisterPhoto = async () => {
    if (videoRef.current) {
      const photo = captureVideoFrame(videoRef.current);
      soundEffects.playShutter();
      setNewGuruPhoto(photo);
      handleStopRegisterCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setNewGuruPhoto(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuruName.trim() || !newGuruNip.trim()) {
      alert('Nama guru dan NIP wajib diisi.');
      return;
    }

    let photo = newGuruPhoto;
    if (!photo) {
      // Default SVG avatar if none uploaded
      photo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%232563eb"/><text x="50" y="60" font-size="32" fill="white" text-anchor="middle" font-family="sans-serif">${encodeURIComponent(newGuruName.slice(0, 2).toUpperCase())}</text></svg>`;
    }

    const newTeacher: Teacher = {
      id: `guru-${Date.now()}`,
      name: newGuruName.trim(),
      nip: newGuruNip.trim(),
      subject: newGuruSubject.trim() || 'Guru Pengajar',
      phone: newGuruPhone.trim() || '-',
      photoUrl: photo,
      registeredAt: new Date().toISOString().split('T')[0],
      status: 'aktif',
    };

    onSaveTeachers([...teachers, newTeacher]);
    soundEffects.playSuccess();
    setIsAddGuruModalOpen(false);
    setNewGuruName('');
    setNewGuruNip('');
    setNewGuruSubject('');
    setNewGuruPhone('');
    setNewGuruPhoto('');
    handleStopRegisterCamera();
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data guru: ${name}?`)) {
      onSaveTeachers(teachers.filter((t) => t.id !== id));
    }
  };

  // --- GOOGLE SHEETS TEST & SAVE ---
  const handleSaveSheetsWebhook = () => {
    const updated = {
      ...sheetsConfig,
      webhookUrl: webhookUrlInput.trim(),
    };
    onSaveSheetsConfig(updated);
    alert('Konfigurasi Google Sheets berhasil disimpan!');
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    const res = await testGoogleSheetsConnection(webhookUrlInput);
    setTestStatus({ loading: false, message: res.message, success: res.success });
  };

  const handleCopyAppsScript = () => {
    const code = generateMergedSDNAppsScriptCode();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  // --- SCHOOL SETTINGS SAVE ---
  const handleGetAdminCurrentGps = async () => {
    const pos = await getCurrentPosition();
    setSchoolForm((prev) => ({
      ...prev,
      schoolLat: pos.latitude,
      schoolLng: pos.longitude,
    }));
  };

  const handleSaveSchoolSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSchool(schoolForm);
    setSavedSettingsFeedback(true);
    setTimeout(() => setSavedSettingsFeedback(false), 2500);
  };

  // Database filtering
  const filteredRecords = records.filter((r) => {
    const matchQuery =
      r.namaGuru.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.waktuHariTanggal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.keterangan.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterPresensi === 'all') return matchQuery;
    if (filterPresensi === 'Terlambat') return matchQuery && r.presensi === 'Terlambat';
    if (filterPresensi === 'Masuk') return matchQuery && r.presensi === 'Masuk';
    if (filterPresensi === 'Pulang') return matchQuery && r.presensi === 'Pulang';
    return matchQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl">
              <Settings className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Panel Kontrol Administrator
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Login: admi
                </span>
              </h2>
              <p className="text-xs text-slate-300">Registrasi Guru, Setelan Google Sheets, Rekap Presensi & Jam Sekolah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('guru')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'guru'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Guru & Wajah ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'database'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Google Sheets ({records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'sheets'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Koneksi Google Sheets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengaturan')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
              activeTab === 'pengaturan'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Jam & GPS Sekolah</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-900/40">
          {/* TAB 1: DATA GURU & REGISTRASI WAJAH */}
          {activeTab === 'guru' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <div>
                  <h3 className="font-bold text-white text-base">Daftar Guru SDN 1 CAHYA MAJU</h3>
                  <p className="text-xs text-slate-400">
                    Guru yang terdaftar di bawah ini dapat melakukan absensi dengan scan wajah biometrik di HP masing-masing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncingTeachers}
                    onClick={handleImportTeachersFromSheet}
                    className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    title="Tarik data guru lama dari Sheet 'DataGuru' Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTeachers ? 'animate-spin' : ''}`} />
                    <span>{isSyncingTeachers ? 'Menarik Data...' : "Tarik Guru dari Sheet 'DataGuru'"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddGuruModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrasi Guru Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenApkModal}
                    className="px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-blue-500/40 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Bagi ke HP Guru</span>
                  </button>
                </div>
              </div>

              {syncTeacherFeedback && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{syncTeacherFeedback}</span>
                </div>
              )}

              {/* Grid of Teachers */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teachers.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 hover:border-slate-600 transition flex items-start justify-between shadow-md group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={t.photoUrl}
                          alt={t.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/40 bg-slate-900 shadow"
                        />
                        <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-slate-950 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">{t.name}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">{t.subject}</p>
                        <p className="text-[11px] text-cyan-400 font-mono mt-0.5">NIP: {t.nip}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Wajah Aktif
                          </span>
                          <span className="text-[10px] text-slate-400">Reg: {t.registeredAt}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacher(t.id, t.name)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                      title="Hapus Data Guru"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE GOOGLE SHEETS LIVE REKAP */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              {/* Header Info & Actions */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span>Database Presensi (Struktur 8 Kolom Google Sheets)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Setiap absensi wajah guru otomatis mengalir dan mengisi kolom-kolom berikut di Google Sheets sekolah.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportAttendanceToCsv(records, school.schoolName)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV / Excel</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama guru atau tanggal..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'Masuk', 'Pulang', 'Terlambat', 'Izin', 'DL'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterPresensi(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        filterPresensi === f
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'Semua Status' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact 8-Column Table View */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-blue-950/80 text-cyan-300 uppercase tracking-wider text-[11px] font-bold sticky top-0 z-10 border-b border-blue-800/40">
                      <tr>
                        <th className="py-3 px-3.5 whitespace-nowrap">Waktu Hari Tanggal</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Nama Guru</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Jam Masuk</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Jam Pulang</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Titik Kordinat</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">View Lokasi</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Presensi</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Belum ada riwayat absensi yang cocok.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-800/50 transition">
                            <td className="py-3 px-3.5 font-medium text-white whitespace-nowrap">
                              {r.waktuHariTanggal}
                            </td>
                            <td className="py-3 px-3.5 font-bold text-cyan-300 whitespace-nowrap">
                              {r.namaGuru}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-emerald-400 whitespace-nowrap">
                              {r.jamMasuk}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-blue-400 whitespace-nowrap">
                              {r.jamPulang}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                              {r.titikKordinat}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <a
                                href={r.viewLokasi}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Maps</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.presensi === 'Terlambat'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : r.presensi === 'Pulang'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : r.presensi === 'Izin'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                    : r.presensi === 'DL'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {r.presensi}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-300 whitespace-nowrap">
                              {r.keterangan}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KONEKSI GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              {/* SDN 1 CAHYA MAJU Explanation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/40 text-xs text-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">
                    Sinkronisasi Data Lama SDN 1 CAHYA MAJU
                  </h4>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Skrip lama Anda di Google Sheets menggunakan fungsi internal seperti <code className="text-amber-300 font-mono">simpanAbsensi()</code>, <code className="text-amber-300 font-mono">getDaftarGuru()</code>, dan sheet <code className="text-cyan-300 font-mono">DataGuru</code> &amp; <code className="text-cyan-300 font-mono">Sheet1</code>. Agar aplikasi Android ini bisa mengirim dan menarik data lama Anda, kami telah melengkapi skrip Anda dengan gerbang penerima data (<code className="text-emerald-400 font-mono">doPost</code> &amp; <code className="text-emerald-400 font-mono">doGet</code>) tanpa menghapus atau mengubah struktur sheet lama Anda sama sekali!
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                    ✓ Sheet 'DataGuru' Terhubung
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                    ✓ Sheet 'Sheet1' (Riwayat Absensi) Terhubung
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                    ✓ Kepala Sekolah IMAM WIDAYAT, S.Pd
                  </span>
                </div>
              </div>

              {/* Webhook URL Input Card */}
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-base">URL Web App Google Apps Script SDN 1 CAHYA MAJU</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    sheetsConfig.webhookUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {sheetsConfig.webhookUrl ? 'Tersambung' : 'Belum Terhubung'}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Tempelkan URL Aplikasi Web (Web App Deployment URL) dari Google Apps Script Google Sheet sekolah Anda di bawah ini:
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSheetsWebhook}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      Simpan URL
                    </button>
                    <button
                      type="button"
                      disabled={testStatus.loading || !webhookUrlInput}
                      onClick={handleTestConnection}
                      className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                    >
                      {testStatus.loading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Test Koneksi</span>
                    </button>
                  </div>
                </div>

                {testStatus.message && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testStatus.message}</span>
                  </div>
                )}
              </div>

              {/* 1-Minute Google Apps Script Guide & Code */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">Kode Skrip Gabungan SDN 1 CAHYA MAJU (Tinggal Salin)</h4>
                    <p className="text-xs text-slate-400">Salin skrip di bawah ini lalu ganti isi Apps Script di Google Sheet lama Anda:</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAppsScript}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition active:scale-95 shrink-0"
                  >
                    {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedScript ? 'Kode Skrip Tersalin!' : 'Salin Seluruh Kode Skrip'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="font-bold text-cyan-400 block mb-1">Langkah 1: Buka Apps Script</span>
                    Buka Google Sheet lama Anda (SDN 1 CAHYA MAJU), klik <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="font-bold text-cyan-400 block mb-1">Langkah 2: Ganti & Simpan</span>
                    Hapus isi kode lama Anda, paste (tempel) seluruh kode yang disalin dari tombol di atas, lalu klik <strong>Simpan (ikon disket)</strong>.
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="font-bold text-cyan-400 block mb-1">Langkah 3: Deploy Versi Baru</span>
                    Klik <strong>Terapkan (Deploy)</strong> &gt; <strong>Kelola Penerapan</strong> &gt; Ikon Pensil (Edit) &gt; Pilih <strong>Versi Baru</strong>. Akses: <strong>"Siapa Saja (Anyone)"</strong> &gt; Simpan dan salin URL-nya ke atas!
                  </div>
                </div>

                {/* Code Preview Box */}
                <div className="relative">
                  <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56 scrollbar-thin">
                    {generateMergedSDNAppsScriptCode()}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENGATURAN JAM & GPS SEKOLAH */}
          {activeTab === 'pengaturan' && (
            <form onSubmit={handleSaveSchoolSettings} className="space-y-4 max-w-2xl">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-cyan-400" />
                  <span>Informasi Sekolah & Jam Kerja Guru</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Sekolah</label>
                    <input
                      type="text"
                      value={schoolForm.schoolName}
                      onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">NPSN / Kode Sekolah</label>
                    <input
                      type="text"
                      value={schoolForm.npsn || ''}
                      onChange={(e) => setSchoolForm({ ...schoolForm, npsn: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Masuk</label>
                    <input
                      type="time"
                      value={schoolForm.jamMasuk}
                      onChange={(e) => setSchoolForm({ ...schoolForm, jamMasuk: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Batas Terlambat</label>
                    <input
                      type="time"
                      value={schoolForm.batasTerlambat}
                      onChange={(e) => setSchoolForm({ ...schoolForm, batasTerlambat: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Pulang</label>
                    <input
                      type="time"
                      value={schoolForm.jamPulang}
                      onChange={(e) => setSchoolForm({ ...schoolForm, jamPulang: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* GPS Geofencing Settings */}
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span>Titik Lokasi GPS & Geofencing Sekolah</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleGetAdminCurrentGps}
                    className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-blue-400/30 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Gunakan GPS Saya Saat Ini</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={schoolForm.schoolLat}
                      onChange={(e) => setSchoolForm({ ...schoolForm, schoolLat: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={schoolForm.schoolLng}
                      onChange={(e) => setSchoolForm({ ...schoolForm, schoolLng: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Radius Toleransi (Meter)</label>
                    <input
                      type="number"
                      value={schoolForm.radiusMeter}
                      onChange={(e) => setSchoolForm({ ...schoolForm, radiusMeter: parseInt(e.target.value) || 100 })}
                      required
                      min={20}
                      max={5000}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="strictGps"
                    checked={schoolForm.strictGps}
                    onChange={(e) => setSchoolForm({ ...schoolForm, strictGps: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="strictGps" className="text-xs text-slate-300 cursor-pointer">
                    <strong>Kunci Radius GPS Ketat:</strong> Tolak absensi jika guru berada di luar radius {schoolForm.radiusMeter} meter dari sekolah.
                  </label>
                </div>
              </div>

              {savedSettingsFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengaturan sekolah dan jam absensi berhasil disimpan!</span>
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition"
              >
                Simpan Seluruh Pengaturan
              </button>
            </form>
          )}
        </div>

        {/* REGISTRATION MODAL FOR NEW TEACHER */}
        {isAddGuruModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-base">Registrasi Guru & Data Wajah Baru</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleStopRegisterCamera();
                    setIsAddGuruModalOpen(false);
                  }}
                  className="p-1 rounded-lg text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNewTeacher} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Lengkap Guru (dengan Gelar) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGuruName}
                    onChange={(e) => setNewGuruName(e.target.value)}
                    placeholder="Contoh: Drs. H. Bambang Sudirman, M.Pd"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">NIP / NIK Guru *</label>
                    <input
                      type="text"
                      required
                      value={newGuruNip}
                      onChange={(e) => setNewGuruNip(e.target.value)}
                      placeholder="19800101 200501 1 001"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran / Jabatan</label>
                    <input
                      type="text"
                      value={newGuruSubject}
                      onChange={(e) => setNewGuruSubject(e.target.value)}
                      placeholder="Contoh: Biologi / Wakasek"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                {/* Face Capture Section */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>Foto Referensi Wajah Biometrik</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Wajah harus jelas & terang</span>
                  </label>

                  {/* Photo Preview or Live Camera */}
                  <div className="flex flex-col items-center justify-center">
                    {isCameraActive ? (
                      <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl bg-black">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        <button
                          type="button"
                          onClick={handleCaptureRegisterPhoto}
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ambil Foto</span>
                        </button>
                      </div>
                    ) : newGuruPhoto ? (
                      <div className="relative">
                        <img
                          src={newGuruPhoto}
                          alt="Pratinjau Foto"
                          className="w-36 h-36 rounded-2xl object-cover border-2 border-emerald-400 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setNewGuruPhoto('')}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
                        <Camera className="w-8 h-8 mb-1 text-slate-600" />
                        <span className="text-[10px]">Belum ada foto</span>
                      </div>
                    )}
                  </div>

                  {/* Controls to capture or upload */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {!isCameraActive && (
                      <button
                        type="button"
                        onClick={handleStartRegisterCamera}
                        className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Buka Kamera</span>
                      </button>
                    )}
                    <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah File Foto</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRegisterCamera();
                      setIsAddGuruModalOpen(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg"
                  >
                    Simpan Data Guru
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
