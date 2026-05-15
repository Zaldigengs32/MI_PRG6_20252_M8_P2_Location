import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';

export default function LoginScreen() {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useContext(AuthContext);

  const BASE_URL = "http://10.1.9.195:8080/api/user";

  const fetchWithTimeout = async (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Connection timeout - Server tidak merespon dalam 10 detik');
        }
        throw error;
    }
  };

  const retryRequest = async (url, options, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetchWithTimeout(url, options);
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleLogin = async () => {
    if (nim.trim() === '' || password.trim() === '') {
      Alert.alert("Peringatan", "NIM dan Password harus diisi!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await retryRequest(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'authcode': 'astratech@123'
        },
        body: JSON.stringify({
          nim: nim,
          password: password
        })
      });

      const result = await response.json();

      if (result.code === 200 && result.data) {
        login(result.data);
        Alert.alert("Berhasil!", `Selamat datang, ${result.data.mhsName}!`);
      } else if (result.code === 501) {
        Alert.alert("Login Gagal", "NIM atau Password salah!");
      } else if (result.code === 401) {
        Alert.alert("Error", "Unauthorized - Missing Token");
      } else if (result.code === 403) {
        Alert.alert("Error", "Forbidden - Invalid Token");
      } else {
        Alert.alert("Error", result.message || "Terjadi kesalahan");
      }
    } catch (error) {
      let errorMessage = "Tidak dapat terhubung ke server.";
      
      if (error.message.includes('timeout')) {
        errorMessage = "Connection timeout - Server tidak merespon. Coba lagi beberapa saat.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Server tidak dapat dijangkau. Periksa koneksi internet dan IP server.";
      } else if (error.message.includes('Network request failed')) {
        errorMessage = "Koneksi internet bermasalah. Periksa WiFi/data Anda.";
      }
      
      Alert.alert(
        "Error Jaringan",
        `${errorMessage}\n\nDetail: ${error.message}\n\nIP Server: ${BASE_URL}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image 
              source={require('../../foto/image-removebg-preview.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Selamat Datang</Text>
            <Text style={styles.subtitle}>Silakan login untuk melanjutkan</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Login</Text>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="person-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan NIM"
                placeholderTextColor="#999"
                value={nim}
                onChangeText={setNim}
                autoCapitalize="none"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Memproses...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>MASUK</Text>
                <MaterialIcons name="arrow-forward" size={20} color="white" style={styles.arrowIcon} />
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Info</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.infoContainer}>
              <MaterialIcons name="info-outline" size={18} color="#007AFF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Demo Credentials:</Text>
                <Text style={styles.infoValue}>NIM: 0320240040</Text>
                <Text style={styles.infoValue}>Password: 100406</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Attendance Management System</Text>
            <Text style={styles.footerVersion}>v1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 4,
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 11,
    color: '#BBB',
  },
});
