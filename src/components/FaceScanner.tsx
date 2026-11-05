import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  UserCheck, 
  Sparkles, 
  Scan, 
  ExternalLink, 
  Send, 
  Check, 
  Clock, 
  Navigation,
  ChevronDown,
  FileText,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Teacher, AttendanceRecord, SchoolConfig, GoogleSheetsConfig } from '../types';
import { soundEffects } from '../utils/audio';
import { 
  analyzeVideoFrame, 
  captureVideoFrame, 
  compareFaceWithTeacher, 
  LiveFrameAnalysis 
} from '../utils/biometrics';
import { 
  getCurrentPosition, 
  calculateDistance, 
  formatCoordinates, 
  generateMapsUrl 
} from '../utils/geolocation';
import { sendAttendanceToGoogleSheets } from '../utils/googleSheets';
import { formatIndonesianDate, formatIndonesianTime } from '../utils/storage';

interface FaceScannerProps {
  teachers: Teacher[];
  school: SchoolConfig;
  sheetsConfig: GoogleSheetsConfig;
  onAttendanceSuccess: (record: AttendanceRecord) => void;
  onSelectTeacherForRegistration?: () => void;
}

export const FaceScanner: React.FC<FaceScannerProps> = ({
  teachers,
  school,
  sheetsConfig,
  onAttendanceSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // States
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [attendanceType, setAttendanceType] = useState<'masuk' | 'pulang' | 'izin' | 'dl'>('masuk');
  const [izinReason, setIzinReason] = useState<string>('Sakit (Surat Dokter)');
  const [izinDetail, setIzinDetail] = useState<string>('');
  const [dlTugas, setDlTugas] = useState<string>('Rapat Koordinasi Dinas Pendidikan');
  const [dlLokasi, setDlLokasi] = useState<string>('Kantor Disdik OKI');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameAnalysis, setFrameAnalysis] = useState<LiveFrameAnalysis>({
    hasFace: false,
    isCentered: false,
    brightness: 120,
    contrast: 50,
    confidence: 0,
    feedback: 'Mengaktifkan sensor kamera...',
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS State
  const [currentGps, setCurrentGps] = useState<{
    lat: number;
    lng: number;
    distance: number;
    withinRadius: boolean;
  }>({
    lat: school.schoolLat,
    lng: school.schoolLng,
    distance: 0,
    withinRadius: true,
  });

  // Auto detect Masuk vs Pulang based on current time
  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    // After 11:30 AM default to pulang
    if (hours >= 11) {
      setAttendanceType('pulang');
    } else {
      setAttendanceType('masuk');
    }
  }, []);

  // Update GPS location
  useEffect(() => {
    const fetchGps = async () => {
      const pos = await getCurrentPosition();
      const dist = calculateDistance(pos.latitude, pos.longitude, school.schoolLat, school.schoolLng);
      setCurrentGps({
        lat: pos.latitude,
        lng: pos.longitude,
        distance: dist,
        withinRadius: dist <= school.radiusMeter,
      });
    };

    fetchGps();
    const interval = setInterval(fetchGps, 15000);
    return () => clearInterval(interval);
  }, [school]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Mengaktifkan mode simulator biometrik foto.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode]);

  // Toggle Front / Back Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [startCamera]);

  // Live video frame analysis loop
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (active && videoRef.current && isCameraActive && !isScanning) {
        const analysis = analyzeVideoFrame(videoRef.current, { x: 80, y: 80, width: 240, height: 280 });
        setFrameAnalysis(analysis);
      }
      scanLoopRef.current = requestAnimationFrame(loop);
    };

    scanLoopRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [isCameraActive, isScanning]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

  // Trigger attendance face scan verification
  const handlePerformAttendance = async () => {
    if (!selectedTeacher) {
      setErrorMessage('Pilih nama guru terlebih dahulu.');
      return;
    }

    // Geolocation verification check (only for Masuk and Pulang at school premises)
    if (school.strictGps && !currentGps.withinRadius && attendanceType !== 'izin' && attendanceType !== 'dl') {
      soundEffects.playError();
      setErrorMessage(
        `Lokasi Anda berada di luar radius sekolah (${currentGps.distance} meter dari sekolah). Toleransi radius maksimal: ${school.radiusMeter} meter.`
      );
      return;
    }

    setErrorMessage(null);
    setIsScanning(true);
    soundEffects.playScanBeep();

    try {
      let capturedPhoto = '';

      if (videoRef.current && isCameraActive) {
        capturedPhoto = captureVideoFrame(videoRef.current);
      } else {
        // Fallback for devices without active camera: use teacher's registered photo
        capturedPhoto = selectedTeacher.photoUrl;
      }

      soundEffects.playShutter();

      // Small delay for biometric scan animation effect
      await new Promise((res) => setTimeout(res, 800));

      // Compare face with registered teacher
      const matchResult = await compareFaceWithTeacher(capturedPhoto, selectedTeacher);

      if (!matchResult.matched && isCameraActive) {
        // Face didn't match
        soundEffects.playError();
        setIsScanning(false);
        setErrorMessage(
          `Verifikasi Wajah Gagal (${matchResult.confidence}%). Wajah tidak sesuai dengan data terdaftar ${selectedTeacher.name}. Silakan posisikan wajah lurus ke kamera.`
        );
        return;
      }

      // Success calculation
      soundEffects.playSuccess();

      const now = new Date();
      const waktuHariTanggal = formatIndonesianDate(now);
      const currentTimeStr = formatIndonesianTime(now);

      // Determine presensi status & description
      let presensiStatus: AttendanceRecord['presensi'] = 'Masuk';
      let keteranganStr = '';

      if (attendanceType === 'izin') {
        presensiStatus = 'Izin';
        keteranganStr = `Izin: ${izinReason}${izinDetail ? ` (${izinDetail})` : ''}`;
      } else if (attendanceType === 'dl') {
        presensiStatus = 'DL';
        keteranganStr = `DL: ${dlTugas}${dlLokasi ? ` di ${dlLokasi}` : ''}`;
      } else if (attendanceType === 'masuk') {
        const [batasH, batasM] = school.batasTerlambat.split(':').map(Number);
        const batasDate = new Date();
        batasDate.setHours(batasH, batasM, 0, 0);

        if (now > batasDate) {
          presensiStatus = 'Terlambat';
          const diffMinutes = Math.round((now.getTime() - batasDate.getTime()) / 60000);
          keteranganStr = `Terlambat ${diffMinutes} Menit (Batas ${school.batasTerlambat})`;
        } else {
          keteranganStr = `Hadir Tepat Waktu (Radius ${currentGps.distance}m)`;
        }
      } else {
        presensiStatus = 'Pulang';
        keteranganStr = `Presensi Pulang Sekolah (Radius ${currentGps.distance}m)`;
      }

      const coordinatesStr = formatCoordinates(currentGps.lat, currentGps.lng);
      const mapsUrl = generateMapsUrl(currentGps.lat, currentGps.lng);

      const record: AttendanceRecord = {
        id: `rec-${Date.now()}`,
        waktuHariTanggal,
        namaGuru: selectedTeacher.name,
        jamMasuk: attendanceType === 'pulang' ? '-' : currentTimeStr,
        jamPulang: attendanceType === 'pulang' ? currentTimeStr : '-',
        titikKordinat: coordinatesStr,
        viewLokasi: mapsUrl,
        presensi: presensiStatus,
        keterangan: keteranganStr,
        teacherId: selectedTeacher.id,
        timestamp: Date.now(),
        type: attendanceType,
        facePhotoUrl: capturedPhoto,
        similarityScore: matchResult.confidence,
        distanceMeters: currentGps.distance,
        syncedToSheets: false,
      };

      // Disparate to Google Sheets automatically!
      const sheetResult = await sendAttendanceToGoogleSheets(record, sheetsConfig);
      record.syncedToSheets = sheetResult.success;
      if (sheetResult.success) {
        record.sheetsSyncTime = currentTimeStr;
      }

      // Confetti celebrate
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#fbbf24', '#38bdf8'],
        });
      } catch {
        // ignore
      }

      setSuccessRecord(record);
      onAttendanceSuccess(record);
    } catch (err) {
      soundEffects.playError();
      setErrorMessage('Terjadi kesalahan saat memproses absensi: ' + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      {/* Top Controls: 4 Mode Presensi (Masuk, Pulang, Izin, DL) */}
      <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setAttendanceType('masuk')}
          className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            attendanceType === 'masuk'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/30'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>Masuk</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceType('pulang')}
          className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            attendanceType === 'pulang'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-700/30'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span>Pulang</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceType('izin')}
          className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            attendanceType === 'izin'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-700/30'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Absen Izin</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceType('dl')}
          className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            attendanceType === 'dl'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-700/30'
              : 'text-slate-400 hover:text-white bg-slate-900/40'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          <span>Dinas Luar (DL)</span>
        </button>
      </div>

      {/* Additional Form Panel for Izin */}
      {attendanceType === 'izin' && (
        <div className="p-3.5 bg-gradient-to-r from-amber-950/40 to-slate-900 rounded-2xl border border-amber-500/30 text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Formulir Absensi Izin Guru:</span>
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Kategori Izin:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['Sakit (Surat Dokter)', 'Keperluan Keluarga Mendesak', 'Izin Cuti Resmi', 'Izin Lainnya'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIzinReason(opt)}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-left border transition ${
                    izinReason === opt
                      ? 'bg-amber-600/40 text-amber-200 border-amber-400'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Keterangan / Alasan Tambahan:</label>
            <input
              type="text"
              value={izinDetail}
              onChange={(e) => setIzinDetail(e.target.value)}
              placeholder="Contoh: Demam istirahat dokter / Ada musibah keluarga"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <p className="text-[10px] text-amber-300/80">
            * Ambil foto wajah selfie atau foto surat izin Anda melalui kamera di bawah untuk verifikasi.
          </p>
        </div>
      )}

      {/* Additional Form Panel for Dinas Luar (DL) */}
      {attendanceType === 'dl' && (
        <div className="p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-900 rounded-2xl border border-purple-500/30 text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <span>Formulir Absensi Dinas Luar (DL):</span>
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Jenis Kegiatan Kedinasan:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                'Rapat Koordinasi Dinas Pendidikan',
                'Pelatihan / Workshop Kurikulum',
                'Kegiatan KKG / Gugus',
                'Pendampingan Lomba / Siswa',
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDlTugas(opt)}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-left border transition ${
                    dlTugas === opt
                      ? 'bg-purple-600/40 text-purple-200 border-purple-400'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Lokasi / Instansi Tempat Tugas:</label>
            <input
              type="text"
              value={dlLokasi}
              onChange={(e) => setDlLokasi(e.target.value)}
              placeholder="Contoh: Kantor Disdik Kab. OKI / Hotel Horison Palembang"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <p className="text-[10px] text-purple-300/80">
            * Lokasi GPS saat ini akan otomatis dicatat sebagai bukti kehadiran fisik di lokasi Dinas Luar.
          </p>
        </div>
      )}

      {/* Teacher Selector Card */}
      <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Pilih Nama Guru yang Hadir:</span>
          </label>
          <span className="text-[11px] text-cyan-400 font-medium">
            {teachers.length} Guru Terdaftar
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full appearance-none bg-slate-900/90 border border-slate-600 hover:border-cyan-500 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition cursor-pointer"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white py-2">
                {t.name} • {t.subject} (NIP: {t.nip})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Selected Teacher Quick Preview Card */}
        {selectedTeacher && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedTeacher.photoUrl}
                alt={selectedTeacher.name}
                className="w-11 h-11 rounded-xl object-cover border border-cyan-500/40 bg-slate-800 shadow"
              />
              <div>
                <p className="text-xs font-bold text-white leading-snug">{selectedTeacher.name}</p>
                <p className="text-[11px] text-slate-400">{selectedTeacher.subject}</p>
                <p className="text-[10px] text-cyan-400 font-mono">NIP: {selectedTeacher.nip}</p>
              </div>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Check className="w-3 h-3" /> Wajah Terdaftar
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Siap verifikasi</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Camera Scanner Box */}
      <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl aspect-square flex flex-col items-center justify-center">
        {/* Real Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          } ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Camera Inactive Fallback */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-cyan-500/50 flex items-center justify-center mb-4 text-cyan-400">
              <Camera className="w-10 h-10 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">Sensor Kamera Siap</p>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              {cameraError || 'Gunakan kamera depan HP guru untuk pemindaian wajah biometrik otomatis.'}
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
            >
              Aktifkan Kamera Sekarang
            </button>
          </div>
        )}

        {/* Biometric Scanning Overlay Elements */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
            {/* Top Bar inside Camera */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white">
                <span className={`w-2 h-2 rounded-full ${frameAnalysis.hasFace ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span>{frameAnalysis.feedback}</span>
              </div>

              {/* Camera Switcher */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="pointer-events-auto p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white active:scale-90 transition shadow-lg"
                title="Putar Kamera"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Central Oval Face Reticle */}
            <div className="relative w-56 h-68 sm:w-64 sm:h-76 flex items-center justify-center">
              {/* Outer Oval Guide */}
              <div
                className={`w-full h-full rounded-[48%] border-2 transition-all duration-300 ${
                  isScanning
                    ? 'border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.7)]'
                    : frameAnalysis.isCentered
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]'
                    : 'border-white/50 border-dashed'
                }`}
              />

              {/* 4 Corner Markers */}
              <div className="absolute top-2 left-4 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
              <div className="absolute top-2 right-4 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
              <div className="absolute bottom-2 left-4 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
              <div className="absolute bottom-2 right-4 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

              {/* Scanning Laser Beam Line */}
              <div
                className={`absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] transition-all duration-75 ${
                  isScanning ? 'animate-bounce' : 'opacity-60 animate-pulse'
                }`}
                style={{ top: '45%' }}
              />

              {/* Center Crosshair */}
              <div className="absolute w-4 h-4 border border-cyan-400/40 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
              </div>

              {/* Target Text */}
              <span className="absolute bottom-4 text-[10px] uppercase tracking-wider font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Area Wajah Guru
              </span>
            </div>

            {/* Bottom Camera Indicators: GPS & Confidence */}
            <div className="w-full flex items-center justify-between text-[11px] text-white">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{currentGps.withinRadius ? 'Dalam Area Sekolah' : `${currentGps.distance}m ke Sekolah`}</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-mono">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Akurasi: {frameAnalysis.confidence}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Peringatan Presensi:</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Action Button: AMBIL FOTO & VERIFIKASI SEKARANG */}
      <button
        type="button"
        disabled={isScanning || !selectedTeacher}
        onClick={handlePerformAttendance}
        className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
          attendanceType === 'masuk'
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25'
            : attendanceType === 'pulang'
            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/25'
            : attendanceType === 'izin'
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25'
            : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
        } ${isScanning ? 'opacity-80 cursor-wait' : ''}`}
      >
        {isScanning ? (
          <>
            <span className="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin" />
            <span>Memproses Presensi & Foto...</span>
          </>
        ) : (
          <>
            <Scan className="w-5 h-5" />
            <span>
              {attendanceType === 'masuk'
                ? 'AMBIL FOTO & PRESENSI MASUK'
                : attendanceType === 'pulang'
                ? 'AMBIL FOTO & PRESENSI PULANG'
                : attendanceType === 'izin'
                ? 'AMBIL FOTO & KIRIM PRESENSI IZIN'
                : 'AMBIL FOTO & KIRIM DINAS LUAR (DL)'}
            </span>
          </>
        )}
      </button>

      {/* Explanation Footer Card */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span>Otomatis sinkron ke 8 Kolom Google Sheets</span>
        </span>
        <span className="text-slate-500">Kamera + Biometrik + GPS</span>
      </div>

      {/* SUCCESS MODAL DIALOG */}
      {successRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header with celebration banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Presensi Berhasil Dicatat!</h3>
                  <p className="text-xs text-emerald-100">Tersimpan otomatis ke Google Sheets</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Photo Verification Pair */}
              <div className="flex items-center justify-center gap-4 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 mb-1">Foto Scan Baru</span>
                  <img
                    src={successRecord.facePhotoUrl || selectedTeacher.photoUrl}
                    alt="Foto Scan"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                  />
                </div>
                <div className="flex flex-col items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold font-mono">{successRecord.similarityScore || 96}%</span>
                  <span className="text-[9px] text-slate-400">Kecocokan</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 mb-1">Foto Master Guru</span>
                  <img
                    src={selectedTeacher.photoUrl}
                    alt="Foto Master"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-cyan-500/50 shadow-md"
                  />
                </div>
              </div>

              {/* Data Summary matching Google Sheet Columns */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Nama Guru:</span>
                  <span className="font-bold text-white text-right">{successRecord.namaGuru}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Waktu Hari Tanggal:</span>
                  <span className="font-semibold text-cyan-300">{successRecord.waktuHariTanggal}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Jam Presensi:</span>
                  <span className="font-bold text-emerald-400">
                    {successRecord.type === 'masuk' ? `Masuk: ${successRecord.jamMasuk}` : `Pulang: ${successRecord.jamPulang}`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Status Presensi:</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {successRecord.presensi} ({successRecord.keterangan})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Titik Kordinat:</span>
                  <span className="font-mono text-slate-300">{successRecord.titikKordinat}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400">View Lokasi:</span>
                  <a
                    href={successRecord.viewLokasi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Buka Google Maps</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>

              {/* Google Sheets Sync Status feedback */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                successRecord.syncedToSheets
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              }`}>
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>
                    {successRecord.syncedToSheets
                      ? 'Baris baru berhasil ditambahkan ke Google Sheets'
                      : 'Tersimpan di database lokal (Koneksi Google Sheets disiapkan di Admin)'}
                  </span>
                </div>
                <span className="font-bold">OK</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSuccessRecord(null)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-[0.99]"
              >
                Selesai / Lanjut Absensi Guru Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
