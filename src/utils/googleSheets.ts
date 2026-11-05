/**
 * Google Sheets Integration & Synchronization Helper
 * Specifically adapted for SDN 1 CAHYA MAJU Apps Script & Legacy Sheets
 */

import { AttendanceRecord, GoogleSheetsConfig, Teacher } from '../types';

/**
 * Sends an attendance record directly to Google Sheets (calls simpanAbsensi)
 * Writes to 'Sheet1': [Timestamp, Nama Guru, Koordinat, Jam Masuk, Tanggal, Info, Jenis Absen, Keterangan]
 */
export async function sendAttendanceToGoogleSheets(
  record: AttendanceRecord,
  config: GoogleSheetsConfig
): Promise<{ success: boolean; message: string }> {
  if (!config.webhookUrl || !config.webhookUrl.trim()) {
    return {
      success: false,
      message: 'URL Google Sheets belum diisi. Data diamankan di memori lokal.',
    };
  }

  // Parse lat and lng from titikKordinat ("-6.2088, 106.8456")
  let lat = '';
  let lng = '';
  if (record.titikKordinat && record.titikKordinat.includes(',')) {
    const parts = record.titikKordinat.split(',');
    lat = parts[0].trim();
    lng = parts[1].trim();
  }

  // Map jenis to match Google Apps Script keywords (IZIN, DL, Masuk, Pulang)
  let jenisNormalized = String(record.presensi);
  if (record.type === 'izin' || record.presensi === 'Izin') {
    jenisNormalized = 'IZIN';
  } else if (record.type === 'dl' || record.presensi === 'DL') {
    jenisNormalized = 'DL';
  }

  // Payload tailored for both simpanAbsensi(nama, jenis, lat, lng, alasan) and standard column fields
  const payload = {
    action: 'simpanAbsensi',
    nama: record.namaGuru,
    jenis: jenisNormalized,
    lat: lat,
    lng: lng,
    alasan: record.keterangan || (record.type === 'izin' ? 'Izin Tidak Masuk' : record.type === 'dl' ? 'Tugas Dinas Luar' : record.type === 'masuk' ? 'Hadir Tepat Waktu' : 'Presensi Pulang'),
    
    // Additional parameters for full compatibility
    namaGuru: record.namaGuru,
    waktuHariTanggal: record.waktuHariTanggal,
    jamMasuk: record.jamMasuk,
    jamPulang: record.jamPulang,
    titikKordinat: record.titikKordinat,
    viewLokasi: record.viewLokasi,
    presensi: record.presensi,
    keterangan: record.keterangan,
    type: record.type,
    timestamp: record.timestamp,
  };

  try {
    // In Google Apps Script Web Apps, mode: 'no-cors' allows dispatch from browser
    await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Berhasil dikirim ke Google Sheets (Sheet1) SDN 1 CAHYA MAJU!',
    };
  } catch (error) {
    console.error('Error sending to Google Sheets:', error);
    return {
      success: false,
      message: 'Gagal mengirim ke Google Sheets: ' + (error as Error).message + '. Data tersimpan aman di lokal.',
    };
  }
}

/**
 * Fetches the existing teacher list from the school's 'DataGuru' sheet via getDaftarGuru()
 */
export async function fetchTeachersFromAppsScript(
  url: string
): Promise<{ success: boolean; teachers?: Teacher[]; message: string }> {
  if (!url || !url.trim().startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Masukkan URL Google Apps Script yang valid terlebih dahulu.',
    };
  }

  try {
    // Try GET request with action=getDaftarGuru
    const fetchUrl = `${url.trim()}${url.includes('?') ? '&' : '?'}action=getDaftarGuru&t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
    });

    const data = await res.json();
    if (data && data.listGuru && Array.isArray(data.listGuru)) {
      const importedTeachers: Teacher[] = data.listGuru.map((g: { nama: string; descriptor?: number[]; jabatan?: string; alamat?: string }, idx: number) => ({
        id: `guru-sheet-${idx + 1}-${Date.now()}`,
        name: g.nama,
        nip: '-',
        subject: g.jabatan || 'Guru SDN 1 CAHYA MAJU',
        jabatan: g.jabatan || '-',
        alamat: g.alamat || '-',
        photoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231e40af"/><text x="50" y="60" font-size="30" fill="white" font-weight="bold" text-anchor="middle" font-family="sans-serif">${encodeURIComponent(g.nama.slice(0, 2).toUpperCase())}</text></svg>`,
        faceFeatures: g.descriptor || undefined,
        descriptor: g.descriptor || undefined,
        registeredAt: new Date().toISOString().split('T')[0],
        status: 'aktif',
      }));

      return {
        success: true,
        teachers: importedTeachers,
        message: `Berhasil mengimpor ${importedTeachers.length} data guru dari Sheet 'DataGuru'!`,
      };
    } else {
      return {
        success: false,
        message: 'Format respon dari Apps Script belum sesuai. Pastikan Anda telah memasang kode skrip gabungan di Apps Script Anda.',
      };
    }
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengambil data guru dari Google Sheets: ' + (err as Error).message + '. Pastikan skrip sudah di-Deploy ulang sebagai "Siapa saja (Anyone)".',
    };
  }
}

/**
 * Saves a new teacher to the school's 'DataGuru' sheet via simpanGuruBaru()
 */
export async function saveTeacherToAppsScript(
  teacher: Teacher,
  url: string
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.trim()) {
    return { success: false, message: 'URL Apps Script belum diisi.' };
  }

  const payload = {
    action: 'simpanGuruBaru',
    nama: teacher.name,
    descriptorJson: teacher.faceFeatures ? JSON.stringify(teacher.faceFeatures) : '[]',
    jabatan: teacher.subject || teacher.jabatan || 'Guru Pengajar',
    alamat: teacher.alamat || 'Desa Cahya Maju',
  };

  try {
    await fetch(url.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Data guru ${teacher.name} berhasil disinkronkan ke Sheet 'DataGuru'!`,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal sinkron guru: ' + (err as Error).message,
    };
  }
}

/**
 * Pings the Google Apps Script Web App to verify connectivity
 */
export async function testGoogleSheetsConnection(url: string): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'URL harus berupa URL Google Apps Script Web App yang valid (https://script.google.com/macros/s/...)',
    };
  }

  try {
    const testPayload = {
      action: 'simpanAbsensi',
      nama: 'UJI COBA SISTEM',
      jenis: 'Masuk',
      lat: '-6.2088',
      lng: '106.8456',
      alasan: 'Uji Koneksi Aplikasi Presensi Guru Pintar',
    };

    await fetch(url.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    return {
      success: true,
      message: 'Koneksi ke Apps Script SDN 1 CAHYA MAJU berhasil diuji! Data uji coba telah terkirim ke Sheet1.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menghubungi server Google Sheets: ' + (err as Error).message,
    };
  }
}

/**
 * Generates the complete merged Google Apps Script code
 * Combines the user's existing script (SDN 1 CAHYA MAJU) with the doPost & doGet API endpoints!
 */
export function generateMergedSDNAppsScriptCode(): string {
  return `/**
 * ============================================================================
 * SKRIP PRESENSI GURU SDN 1 CAHYA MAJU (GABUNGAN LENGKAP & SINKRON DATA LAMA)
 * ============================================================================
 * 
 * Skrip ini mempertahankan 100% data lama Anda pada:
 * 1. Sheet "DataGuru"  : Menyimpan [Nama Guru, Descriptor Biometrik, Jabatan, Alamat]
 * 2. Sheet "Sheet1"    : Menyimpan Riwayat Absensi [Timestamp, Nama Guru, Koordinat, Jam Masuk, Tanggal, Info, Jenis Absen, Keterangan]
 * 3. Sheet "Sheet2"    : Menyimpan Data Libur [Tanggal, Jenis Libur, Keterangan]
 * 4. Data Cetak        : Kepala Sekolah "IMAM WIDAYAT, S.Pd" & NIP "19770110 200801 1 002"
 * 
 * CARA MEMASANG / UPDATE:
 * 1. Buka Google Sheet lama Anda (SDN 1 CAHYA MAJU).
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus seluruh isi kode lama, lalu tempelkan (paste) SEMUA kode di bawah ini.
 * 4. Klik ikon "Simpan" (disket).
 * 5. Klik "Terapkan" (Deploy) > "Kelola Penerapan" (Manage deployments) > klik ikon Pensil (Edit).
 * 6. Pilih Versi: "Versi baru" (New version).
 * 7. Pastikan Akses (Who has access): "Siapa saja" (Anyone) -> PENTING!
 * 8. Klik "Terapkan" (Deploy).
 * 9. Salin URL Aplikasi Web dan tempelkan di Panel Admin aplikasi ini!
 */

// ==========================================
// 1. ENDPOINT PENERIMA DATA (doGet & doPost)
// ==========================================

function doGet(e) {
  // Jika dipanggil via API Aplikasi (mengambil data guru / rekap via JSON)
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    
    if (action === 'getDaftarGuru') {
      var list = getDaftarGuru();
      return ContentService.createTextOutput(JSON.stringify({ success: true, listGuru: list }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getRekapAbsensiData') {
      var bln = e.parameter.bln || (new Date().getMonth() + 1);
      var thn = e.parameter.thn || new Date().getFullYear();
      var rekap = getRekapAbsensiData(bln, thn);
      return ContentService.createTextOutput(JSON.stringify(rekap))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getCetakInfo') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, cetakInfo: getPengaturanCetak() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Jika dibuka langsung di browser, tampilkan HTML Index lama jika ada
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Absensi Harian Guru SDN 1 CAHYA MAJU')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch(err) {
    return ContentService.createTextOutput("API Presensi Guru SDN 1 CAHYA MAJU Siap & Aktif!");
  }
}

function doPost(e) {
  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var action = data.action || 'simpanAbsensi';

    // Aksi 1: Ambil Daftar Guru
    if (action === 'getDaftarGuru') {
      var list = getDaftarGuru();
      return ContentService.createTextOutput(JSON.stringify({ success: true, listGuru: list }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 2: Simpan Guru Baru
    if (action === 'simpanGuruBaru') {
      var resGuru = simpanGuruBaru(data.nama, data.descriptorJson, data.jabatan, data.alamat);
      return ContentService.createTextOutput(JSON.stringify(resGuru))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: Simpan Absensi ke Sheet1
    if (action === 'simpanAbsensi' || action === 'add_attendance') {
      var nama = data.nama || data.namaGuru || "";
      var jenis = data.jenis || data.presensi || "Masuk";
      var lat = data.lat || "";
      var lng = data.lng || "";
      
      if (!lat && data.titikKordinat && data.titikKordinat.indexOf(',') !== -1) {
        var parts = data.titikKordinat.split(',');
        lat = parts[0].trim();
        lng = parts[1].trim();
      }

      var alasan = data.alasan || data.keterangan || (jenis === 'Masuk' ? 'Hadir Tepat Waktu' : 'Presensi Pulang');
      var resAbsen = simpanAbsensi(nama, jenis, lat, lng, alasan);
      return ContentService.createTextOutput(JSON.stringify(resAbsen))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 4: Ambil Rekap Absensi Bulanan
    if (action === 'getRekapAbsensiData') {
      var rekap = getRekapAbsensiData(data.bln, data.thn);
      return ContentService.createTextOutput(JSON.stringify(rekap))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 5: Simpan Libur ke Sheet2
    if (action === 'simpanLibur') {
      var resLibur = simpanLiburKeSheet2(data.tgl, data.jenis, data.ket);
      return ContentService.createTextOutput(JSON.stringify(resLibur))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Aksi tidak dikenali: " + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. FUNGSI LOGIKA ASLI SDN 1 CAHYA MAJU
// ==========================================

function cleanName(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDateToYMD(val, timeZone) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, timeZone, "yyyy-MM-dd");
  }
  
  var str = String(val).trim();
  if (!str) return "";

  var matchYMD = str.match(/^(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})/);
  if (matchYMD) {
    return matchYMD[1] + "-" + String(matchYMD[2]).padStart(2, '0') + "-" + String(matchYMD[3]).padStart(2, '0');
  }

  var matchDMY = str.match(/^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})/);
  if (matchDMY) {
    return matchDMY[3] + "-" + String(matchDMY[2]).padStart(2, '0') + "-" + String(matchDMY[1]).padStart(2, '0');
  }

  try {
    var parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, timeZone, "yyyy-MM-dd");
    }
  } catch(e) {}

  return "";
}

function getDaftarGuru() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetGuru = ss.getSheetByName("DataGuru");
    if (!sheetGuru) {
      sheetGuru = ss.insertSheet("DataGuru");
      sheetGuru.appendRow(["Nama Guru", "Descriptor Biometrik", "Jabatan", "Alamat"]);
      return [];
    }
    
    const data = sheetGuru.getDataRange().getValues();
    let result = [];
    
    for (let i = 1; i < data.length; i++) {
      const nama = String(data[i][0] || '').trim();
      if (!nama) continue;
      
      let descriptor = null;
      try {
        if (data[i][1]) {
          descriptor = JSON.parse(data[i][1]);
        }
      } catch (e) {}
      
      result.push({
        nama: nama,
        descriptor: descriptor,
        jabatan: String(data[i][2] || '-'),
        alamat: String(data[i][3] || '-')
      });
    }
    return result;
  } catch (e) {
    return [];
  }
}

function simpanGuruBaru(nama, descriptorJson, jabatan, alamat) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetGuru = ss.getSheetByName("DataGuru");
    if (!sheetGuru) {
      sheetGuru = ss.insertSheet("DataGuru");
      sheetGuru.appendRow(["Nama Guru", "Descriptor Biometrik", "Jabatan", "Alamat"]);
    }
    
    const data = sheetGuru.getDataRange().getValues();
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (cleanName(data[i][0]) === cleanName(nama)) {
        foundRow = i + 1;
        break;
      }
    }
    
    if (foundRow > 0) {
      const currentJabatan = sheetGuru.getRange(foundRow, 3).getValue();
      const currentAlamat = sheetGuru.getRange(foundRow, 4).getValue();
      
      sheetGuru.getRange(foundRow, 1, 1, 4).setValues([[
        nama,
        descriptorJson,
        jabatan || currentJabatan || "-",
        alamat || currentAlamat || "-"
      ]]);
      return { success: true, message: "✅ Master data & biometrik " + nama + " berhasil diperbarui!" };
    } else {
      sheetGuru.appendRow([
        nama,
        descriptorJson,
        jabatan || "-",
        alamat || "-"
      ]);
      return { success: true, message: "✅ Guru baru " + nama + " berhasil didaftarkan!" };
    }
  } catch (e) {
    return { success: false, message: "❌ Gagal menyimpan data guru: " + e.message };
  }
}

function simpanAbsensi(nama, jenis, lat, lng, alasan) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetAbsen = ss.getSheetByName("Sheet1");
    if (!sheetAbsen) {
      sheetAbsen = ss.insertSheet("Sheet1");
      sheetAbsen.appendRow(["Timestamp", "Nama Guru", "Koordinat", "Jam Masuk", "Tanggal", "Info", "Jenis Absen", "Keterangan"]);
    }
    
    const timeZone = Session.getScriptTimeZone();
    const now = new Date();
    const tglStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    const jamStr = Utilities.formatDate(now, timeZone, "HH:mm:ss");
    
    sheetAbsen.appendRow([
      now,                                       // Col A: Timestamp
      nama,                                      // Col B: Nama Guru
      (lat && lng) ? (lat + ", " + lng) : "-",   // Col C: Koordinat
      jamStr,                                    // Col D: Jam Masuk
      tglStr,                                    // Col E: Tanggal
      "-",                                       // Col F: Info
      jenis,                                     // Col G: Jenis Absen
      alasan || "-"                              // Col H: Keterangan
    ]);
    
    return { success: true, message: "✅ Absensi (" + jenis + ") berhasil disimpan untuk " + nama + "!" };
  } catch (e) {
    return { success: false, message: "❌ Gagal mencatat absensi: " + e.message };
  }
}

function simpanLiburKeSheet2(tgl, jenis, ket) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet2 = ss.getSheetByName("Sheet2");
    if (!sheet2) {
      sheet2 = ss.insertSheet("Sheet2");
      sheet2.appendRow(["Tanggal", "Jenis Libur", "Keterangan"]);
    } else if (sheet2.getLastRow() === 0) {
      sheet2.appendRow(["Tanggal", "Jenis Libur", "Keterangan"]);
    }
    
    sheet2.appendRow([
      tgl,
      jenis,
      ket || "Libur Sekolah"
    ]);

    return { success: true, message: "✅ Berhasil menyimpan tanggal libur (" + jenis + ") tanggal " + tgl + " ke Sheet2!" };
  } catch (e) {
    return { success: false, message: "❌ Gagal menyimpan libur ke Sheet2: " + e.message };
  }
}

function verifikasiAdmin(pass) {
  const props = PropertiesService.getScriptProperties();
  const savedPass = props.getProperty('ADMIN_PASS') || 'admin123';
  return pass === savedPass;
}

function simpanPengaturanCetak(nama, nip, desa, tglCetak, logoPemda, logoSekolah) {
  try {
    const props = PropertiesService.getScriptProperties();
    const data = {
      nama: nama,
      nip: nip,
      desa: desa,
      tglCetak: tglCetak,
      logoPemda: logoPemda || "",
      logoSekolah: logoSekolah || ""
    };
    props.setProperty('CETAK_INFO', JSON.stringify(data));
    return { success: true, message: "✅ Pengaturan cetak & logo berhasil disimpan!" };
  } catch (e) {
    return { success: false, message: "❌ Gagal menyimpan pengaturan cetak: " + e.message };
  }
}

function getPengaturanCetak() {
  try {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty('CETAK_INFO');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  
  return {
    nama: "IMAM WIDAYAT, S.Pd",
    nip: "19770110 200801 1 002",
    desa: "Cahya Maju",
    tglCetak: "",
    logoPemda: "",
    logoSekolah: ""
  };
}

function getRekapAbsensiData(bln, thn) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetAbsen = ss.getSheetByName("Sheet1");
    let sheetLibur = ss.getSheetByName("Sheet2");
    
    const listGuru = getDaftarGuru();
    const cetakInfo = getPengaturanCetak();
    const timeZone = Session.getScriptTimeZone();
    
    let mapAbsen = {}; 
    let mapLibur = {}; 

    if (sheetLibur && sheetLibur.getLastRow() > 1) {
      const dataLibur = sheetLibur.getDataRange().getValues();
      for (let i = 1; i < dataLibur.length; i++) {
        let tglRaw = dataLibur[i][0];
        let jenis = String(dataLibur[i][1] || '').trim().toUpperCase();
        let tglStr = parseDateToYMD(tglRaw, timeZone);
        
        if (tglStr && (jenis === 'LS' || jenis === 'LN')) {
          mapLibur[tglStr] = jenis;
        }
      }
    }

    if (sheetAbsen && sheetAbsen.getLastRow() > 1) {
      const dataAbsen = sheetAbsen.getDataRange().getValues();
      const guruCleanList = listGuru.map(g => ({
        namaAsli: g.nama,
        namaClean: cleanName(g.nama)
      }));

      for (let i = 1; i < dataAbsen.length; i++) {
        const row = dataAbsen[i];
        if (!row || row.length === 0) continue;

        let namaRaw  = row[1]; 
        let tglRaw   = row[4]; 
        let jenisRaw = row[6]; 

        let tglStr = parseDateToYMD(tglRaw, timeZone);
        if (!tglStr && row[0]) tglStr = parseDateToYMD(row[0], timeZone);

        if (namaRaw && tglStr) {
          let cNama = cleanName(namaRaw);
          let matchGuru = guruCleanList.find(g => g.namaClean === cNama || (cNama.length > 3 && g.namaClean.indexOf(cNama) !== -1));

          if (matchGuru) {
            const parts = tglStr.split("-");
            if (parts.length === 3 && parseInt(parts[0], 10) === parseInt(thn, 10) && parseInt(parts[1], 10) === parseInt(bln, 10)) {
              const key = cleanName(matchGuru.namaAsli) + "_" + tglStr;
              let jns = String(jenisRaw || '').trim().toUpperCase();

              if (!mapAbsen[key] || jns.indexOf('IZIN') !== -1 || jns.indexOf('DINAS') !== -1 || jns === 'DL') {
                mapAbsen[key] = jns;
              }
            }
          }
        }
      }
    }
    
    return {
      success: true,
      listGuru: listGuru,
      mapAbsen: mapAbsen,
      mapLibur: mapLibur,
      cetakInfo: cetakInfo
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
`;
}

/**
 * Exports attendance records to CSV (Indonesian formatted with BOM)
 */
export function exportAttendanceToCsv(records: AttendanceRecord[], schoolName = 'SDN_1_CAHYA_MAJU'): void {
  const headers = [
    'Timestamp',
    'Nama Guru',
    'Koordinat',
    'Jam Masuk',
    'Tanggal',
    'Info',
    'Jenis Absen',
    'Keterangan',
  ];

  const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

  const rows = records.map((r) => [
    escapeCsv(new Date(r.timestamp).toISOString()),
    escapeCsv(r.namaGuru),
    escapeCsv(r.titikKordinat),
    escapeCsv(r.jamMasuk),
    escapeCsv(r.waktuHariTanggal),
    escapeCsv('-'),
    escapeCsv(r.presensi),
    escapeCsv(r.keterangan),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `Rekap_Presensi_${schoolName.replace(/\s+/g, '_')}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
