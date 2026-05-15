import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

function CustomAlert({ visible, title, message, onClose }) {
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={alertStyles.overlay}>
                <View style={alertStyles.box}>
                    <Text style={alertStyles.title}>{title}</Text>
                    <Text style={alertStyles.message}>{message}</Text>
                    <TouchableOpacity style={alertStyles.button} onPress={onClose}>
                        <Text style={alertStyles.buttonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const alertStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    box: { backgroundColor: 'white', borderRadius: 12, padding: 24, width: '80%', maxWidth: 320, elevation: 10 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#1a1a1a' },
    message: { fontSize: 15, color: '#444', marginBottom: 20, lineHeight: 22 },
    button: { alignSelf: 'flex-end' },
    buttonText: { fontSize: 15, fontWeight: 'bold', color: '#0056b3' },
});

export default function AboutScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [mahasiswa, setMahasiswa] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isViewingPhoto, setIsViewingPhoto] = useState(false);
    const [lastUploadTime, setLastUploadTime] = useState(0);
    const [imageKey, setImageKey] = useState(0);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const cameraRef = useRef(null);

    const NIM_USER = "0320240040";
    const BASE_URL = "http://10.1.9.195:8080/api/mahasiswa";

    useEffect(() => {
        fetchMahasiswa();
    }, []);

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            setAlertTitle(title);
            setAlertMessage(message);
            setAlertVisible(true);
        } else {
            Alert.alert(title, message);
        }
    };

    const validateFile = async (uri) => {
        try {
            let fileSizeInBytes = 0;

            if (Platform.OS === 'web') {
                if (uri.startsWith('data:')) {
                    const base64Data = uri.split(',')[1];
                    fileSizeInBytes = Math.ceil((base64Data.length * 3) / 4);
                } else {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    fileSizeInBytes = blob.size;
                }
            } else {
                const fileInfo = await FileSystem.getInfoAsync(uri);
                fileSizeInBytes = fileInfo.size;
            }

            const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

            if (fileSizeInMB > 5) {
                showAlert("Error", "Ukuran file maksimal 5MB. File Anda: " + fileSizeInMB.toFixed(2) + "MB");
                return false;
            }

            if (uri.startsWith('data:')) {
                const mimeType = uri.split(';')[0].split(':')[1];
                const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedMimes.includes(mimeType)) {
                    showAlert("Error", "Tipe file tidak didukung. Gunakan: JPG, PNG, atau WEBP");
                    return false;
                }
            } else {
                const fileExtension = uri.split('.').pop().toLowerCase().split('?')[0];
                const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
                if (!allowedTypes.includes(fileExtension)) {
                    showAlert("Error", "Tipe file tidak didukung. Gunakan: JPG, JPEG, PNG, atau WEBP");
                    return false;
                }
            }

            return true;
        } catch (error) {
            showAlert("Error", "Gagal memvalidasi file");
            return false;
        }
    };

    const canUpload = () => {
        const now = Date.now();
        const timeDiff = now - lastUploadTime;
        const minInterval = 5000;

        if (timeDiff < minInterval) {
            const remainingTime = Math.ceil((minInterval - timeDiff) / 1000);
            showAlert("Info", `Tunggu ${remainingTime} detik sebelum upload lagi`);
            return false;
        }

        setLastUploadTime(now);
        return true;
    };

    const flipImageHorizontalWeb = (uri) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.translate(img.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = uri;
        });
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.3 });

                if (Platform.OS === 'web') {
                    try {
                        const flippedUri = await flipImageHorizontalWeb(photo.uri);
                        uploadPhoto(flippedUri);
                    } catch (flipError) {
                        uploadPhoto(photo.uri);
                    }
                } else {
                    uploadPhoto(photo.uri);
                }
            } catch (error) {
                showAlert("Error", "Gagal mengambil gambar. Silakan coba lagi.");
            }
        }
    };

    const fetchMahasiswa = async () => {
        try {
            const response = await fetch(`${BASE_URL}/${NIM_USER}`);

            if (response.ok) {
                const data = await response.json();
                setMahasiswa(data);
                setImageKey(prev => prev + 1);
            } else if (response.status === 404) {
                showAlert("Data Tidak Ditemukan", `NIM ${NIM_USER} tidak terdaftar dalam database. Silakan hubungi administrator.`);
            } else {
                showAlert("Error Server", `Gagal mengambil data mahasiswa. Status: ${response.status}`);
            }
        } catch (error) {
            showAlert("Koneksi Error", "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
        } finally {
            setIsLoading(false);
        }
    };

    const uploadPhoto = async (uri) => {
        if (!canUpload()) return;

        const isValidFile = await validateFile(uri);
        if (!isValidFile) return;

        setIsLoading(true);

        const formData = new FormData();
        formData.append('nim', NIM_USER);
        formData.append('nama', 'Muhamad Zaldi Aprialdi');

        if (Platform.OS === 'web') {
            let blob;
            if (uri.startsWith('data:')) {
                const mimeType = uri.split(';')[0].split(':')[1];
                const base64Data = uri.split(',')[1];
                const byteChars = atob(base64Data);
                const byteArray = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                    byteArray[i] = byteChars.charCodeAt(i);
                }
                blob = new Blob([byteArray], { type: mimeType });
            } else {
                const res = await fetch(uri);
                blob = await res.blob();
            }
            const ext = blob.type.split('/')[1] || 'jpg';
            formData.append('foto', blob, `selfie.${ext}`);
        } else {
            formData.append('foto', {
                uri: uri,
                name: 'selfie.jpg',
                type: 'image/jpeg',
            });
        }

        try {
            const response = await fetch(`${BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                showAlert("Sukses", "Foto profil tersinkronisasi ke Server!");
                fetchMahasiswa();
            } else {
                showAlert("Error", `Gagal mengunggah foto ke server. Status: ${response.status}`);
            }
        } catch (error) {
            showAlert("Error", "Gagal mengunggah foto ke server.");
        } finally {
            setIsLoading(false);
            setIsCameraOpen(false);
        }
    };

    if (isLoading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

    if (isCameraOpen) {
        if (!permission) return <View style={styles.container}><Text>Memuat perizinan...</Text></View>;
        if (!permission.granted) {
            return (
                <View style={styles.container}>
                    <Text style={styles.infoText}>Kami butuh akses kamera untuk Selfie Profil.</Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Beri Izin Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.buttonDanger} onPress={() => setIsCameraOpen(false)}>
                        <Text style={styles.buttonText}>Batal</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <CameraView style={StyleSheet.absoluteFillObject} facing="front" mirror={true} ref={cameraRef} />
                <View style={styles.cameraOverlay}>
                    <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                        <Text style={styles.captureButtonText}>Ambil & Kirim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsCameraOpen(false)}>
                        <Text style={{ color: 'white', marginBottom: 20 }}>Batal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CustomAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />

            <View style={styles.profileCard}>
                <TouchableOpacity onPress={() => setIsViewingPhoto(true)}>
                    <Image
                        key={`profile-${imageKey}`}
                        source={mahasiswa?.fotoMhs
                            ? { uri: `data:image/jpeg;base64,${mahasiswa.fotoMhs}` }
                            : { uri: `https://i.pravatar.cc/150?img=3&t=${Date.now()}` }
                        }
                        style={styles.profileImage}
                    />
                </TouchableOpacity>
                <Text style={styles.nameText}>{mahasiswa?.namaMhs || "Muhamad Zaldi Aprialdi"}</Text>
                <Text style={styles.nimText}>{NIM_USER}</Text>

                <TouchableOpacity style={styles.button} onPress={() => setIsCameraOpen(true)}>
                    <Text style={styles.buttonText}>Ganti Foto Selfie</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isViewingPhoto} transparent={true} animationType="fade" onRequestClose={() => setIsViewingPhoto(false)}>
                <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={() => setIsViewingPhoto(false)}>
                    <Image
                        key={`modal-${imageKey}`}
                        source={mahasiswa?.fotoMhs
                            ? { uri: `data:image/jpeg;base64,${mahasiswa.fotoMhs}` }
                            : { uri: `https://i.pravatar.cc/150?img=3&t=${Date.now()}` }
                        }
                        resizeMode="contain"
                        style={styles.fullScreenImage}
                    />
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9', justifyContent: 'center', alignItems: 'center' },
    profileCard: { backgroundColor: 'white', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
    profileImage: { width: 150, height: 150, borderRadius: 75, marginBottom: 20, borderWidth: 2, borderColor: '#0056b3' },
    nameText: { fontSize: 20, fontWeight: 'bold' },
    nimText: { fontSize: 16, color: 'gray', marginBottom: 20 },
    button: { backgroundColor: '#0056b3', padding: 10, borderRadius: 10, width: '100%', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'transparent' },
    captureButton: { backgroundColor: 'white', padding: 15, borderRadius: 30, marginBottom: 20 },
    captureButtonText: { fontWeight: 'bold' },
    buttonDanger: { backgroundColor: '#dc3545', padding: 10, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
    infoText: { textAlign: 'center', marginBottom: 20, fontSize: 16 },
    modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '90%', height: '60%' },
});
