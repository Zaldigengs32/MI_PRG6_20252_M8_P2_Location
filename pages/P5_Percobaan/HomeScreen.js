import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { AuthContext } from './AuthContext';
import { CameraView, useCameraPermissions } from 'expo-camera';

const HomeScreen = ({ navigation }) => {

  const { userData, logout } = useContext(AuthContext);

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState('Memuat jam...');
  const [note, setNote] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isAlertShowing, setIsAlertShowing] = useState(false);
  const noteInputRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();

  const BASE_URL = "http://10.1.9.195:8080/api/presensi";

  const attendanceStats = useMemo(() => {
    return { totalPresent: 12, totalAbsent: 2 };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    if (isCheckedIn) return Alert.alert("Perhatian", "Anda sudah Check In.");
    if (note.trim() === '') {
      Alert.alert("Peringatan", "Catatan kehadiran wajib diisi!");
      noteInputRef.current.focus();
      return;
    }

    setIsPosting(true);
    const now = new Date();

    const payload = {
      kodeMk: "TRPL205",
      course: "Mobile Programming",
      status: "Present",
      nimMhs: userData.nim_mhs,
      pertemuanKe: 5,
      date: now.toISOString().split('T')[0],
      jamPresensi: now.toLocaleTimeString('id-ID', { hour12: false }),
      kode_qr: "AUTH-TRPL205-W5-XYZ987",
      ruangan: "Lab Komputer 3",
      dosenPengampu: "Tim Dosen TRPL"
    };

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setIsCheckedIn(true);
        Alert.alert("Berhasil!", "Presensi masuk ke Database.", [
          { text: "Lihat Riwayat", onPress: () => navigation.navigate('HistoryTab') }
        ]);
      } else {
        Alert.alert("Gagal", result.message || "Terjadi kesalahan di server.");
      }
    } catch (error) {
      console.error("handleCheckIn error:", error);
      Alert.alert("Error Jaringan", "Pastikan IP Laptop benar dan Spring Boot berjalan.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Izin Ditolak", "Aplikasi butuh akses kamera untuk memindai QR Code.");
        return;
      }
    }
    setIsScanning(true);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (!isScanning) return;
    setIsScanning(false);

    try {
      const qrData = JSON.parse(data);

      setIsAlertShowing(true);
      Alert.alert(
        "QR Code Terdeteksi",
        `Mata Kuliah: ${qrData.kodeMk}\nPertemuan: ${qrData.pertemuanKe}\nRuangan: ${qrData.ruangan}\n\nLanjutkan Presensi (Check-In)?`,
        [
          {
            text: "Batal",
            onPress: () => {
              setIsAlertShowing(false);
              setIsScanning(true);
            },
            style: "cancel"
          },
          {
            text: "Ya, Check In",
            onPress: () => {
              setIsAlertShowing(false);
              setShowScanner(false);
              handleSubmitPresensi(qrData);
            }
          },
        ]
      );
    } catch (e) {
      console.error("QR parse error:", e);
      Alert.alert("QR Tidak Valid", "Pastikan Anda memindai QR Code Presensi Dosen.");
      setIsScanning(true);
    }
  };

  const handleSubmitPresensi = async (qrData) => {
    setIsPosting(true);
    const now = new Date();

    const payload = {
      kodeMk: qrData.kodeMk,
      course: qrData.course || qrData.namaMk || "Mobile Programming",
      nimMhs: userData.nim_mhs,
      pertemuanKe: qrData.pertemuanKe,
      date: now.toISOString().split('T')[0],
      jamPresensi: now.toLocaleTimeString('en-GB'),
      status: "Present",
      ruangan: qrData.ruangan,
      kode_qr: qrData.kode_qr || "",
      dosenPengampu: qrData.dosenPengampu || ""
    };

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setIsCheckedIn(true);
        Alert.alert("Berhasil!", "Presensi sukses dicatat ke Database.", [
          { text: "Lihat Riwayat", onPress: () => navigation.navigate('HistoryTab') }
        ]);
      } else {
        Alert.alert("Gagal", result.message || "Terjadi kesalahan di server.");
      }
    } catch (error) {
      console.error("handleSubmitPresensi error:", error);
      Alert.alert("Error Jaringan", "Pastikan IP Laptop benar dan API berjalan.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && globalThis.window?.confirm) {
      if (globalThis.window.confirm("Apakah Anda yakin ingin keluar?")) logout();
    } else {
      Alert.alert(
        "Konfirmasi Logout",
        "Apakah Anda yakin ingin keluar?",
        [
          { text: "Batal", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: () => logout() }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.headerRow}>
          <Text style={styles.title}>Attendance App</Text>
          <View style={styles.headerRight}>
            <Text style={styles.clockText}>{currentTime}</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.icon}>
            <MaterialIcons name="person" size={40} color="#555" />
          </View>
          <View>
            <Text style={styles.name}>{userData.nama}</Text>
            <Text>NIM : {userData.nim_mhs}</Text>
            <Text>Class : Informatika-2A</Text>
          </View>
        </View>

        <View style={styles.classCard}>
          <View style={styles.classCardHeader}>
            <Text style={styles.subtitle}>Today's Class</Text>
            <TouchableOpacity onPress={handleOpenScanner} style={styles.qrButton}>
              <MaterialIcons name="qr-code-scanner" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <Text>Mobile Programming (TRPL205)</Text>
          <Text>08:00 - 10:00</Text>
          <Text>Lab 3</Text>

          {!isCheckedIn && (
            <TextInput
              ref={noteInputRef}
              style={styles.inputCatatan}
              placeholder="Tulis catatan (cth: Hadir lab)"
              value={note}
              onChangeText={setNote}
            />
          )}

          {isPosting ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 15 }} />
          ) : (
            <TouchableOpacity
              style={[styles.button, isCheckedIn ? styles.buttonDisabled : styles.buttonActive]}
              onPress={handleCheckIn}
              disabled={isCheckedIn}
            >
              <Text style={styles.buttonText}>
                {isCheckedIn ? "CHECKED IN" : "CHECK IN SEKARANG"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{attendanceStats.totalPresent}</Text>
            <Text style={styles.statLabel}>Total Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: 'red' }]}>{attendanceStats.totalAbsent}</Text>
            <Text style={styles.statLabel}>Total Absent</Text>
          </View>
        </View>

      </ScrollView>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerUnfocused}></View>
            <View style={styles.scannerFocused}>
              <View style={styles.borderCornerTopLeft} />
              <View style={styles.borderCornerTopRight} />
              <View style={styles.borderCornerBottomLeft} />
              <View style={styles.borderCornerBottomRight} />
            </View>
            <View style={styles.scannerUnfocused}>
              <Text style={styles.scanText}>Arahkan Kamera ke QR Code Dosen</Text>
              {!isScanning && !isAlertShowing && (
                <TouchableOpacity onPress={() => setIsScanning(true)} style={styles.scanAgainButton}>
                  <Text style={styles.scanAgainText}>Scan Lagi</Text>
                </TouchableOpacity>
              )}
              {!isAlertShowing && (
                <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Tutup</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

HomeScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  content: {
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold"
  },
  card: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15
  },
  name: {
    fontSize: 18,
    fontWeight: "bold"
  },
  classCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  qrButton: {
    padding: 4,
  },
  button: {
    marginTop: 15,
    padding: 18,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "bold"
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  clockText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    fontVariant: ['tabular-nums'],
  },
  logoutButton: {
    padding: 5,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#A0C4FF',
  },
  inputCatatan: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    backgroundColor: '#fafafa',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'green',
  },
  statLabel: {
    fontSize: 14,
    color: 'gray',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerUnfocused: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFocused: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  scanAgainButton: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  scanAgainText: {
    color: '#000',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  borderCornerTopLeft: {
    position: 'absolute', top: 0, left: 0, width: 40, height: 40,
    borderTopWidth: 5, borderLeftWidth: 5, borderColor: '#007bff',
  },
  borderCornerTopRight: {
    position: 'absolute', top: 0, right: 0, width: 40, height: 40,
    borderTopWidth: 5, borderRightWidth: 5, borderColor: '#007bff',
  },
  borderCornerBottomLeft: {
    position: 'absolute', bottom: 0, left: 0, width: 40, height: 40,
    borderBottomWidth: 5, borderLeftWidth: 5, borderColor: '#007bff',
  },
  borderCornerBottomRight: {
    position: 'absolute', bottom: 0, right: 0, width: 40, height: 40,
    borderBottomWidth: 5, borderRightWidth: 5, borderColor: '#007bff',
  },
});
