import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";

const BASE_URL = "http://10.1.9.195:8080/api/presensi";

export default function LocationScreen() {
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapStatus, setMapStatus] = useState("idle");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Permission ditolak");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const initial = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setLocation(loc);
      setRegion(initial);
      setSelectedLocation(initial);
      setLoading(false);
    })();
  }, []);

  const handleMapStatusChange = async () => {
    try {
      if (!selectedLocation) return;

      const lat = selectedLocation.latitude;
      const lng = selectedLocation.longitude;

      const res = await axios.post(`${BASE_URL}/locate`, { lat, lng });

      setMapStatus(res.data);
    } catch (err) {
      console.log("API ERROR:", err.message);
    }
  };

  const goToMyLocation = () => {
    if (!location) return;

    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion);
    setSelectedLocation(newRegion);
  };

  const handleMapPress = (e) => {
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  if (loading || !region) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>📍 Your Location</Text>

        <Text style={styles.value}>Lat: {selectedLocation?.latitude}</Text>

        <Text style={styles.value}>Lng: {selectedLocation?.longitude}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => setMapVisible(true)}
        >
          <Text style={styles.primaryText}>Choose Location</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={() => handleMapStatusChange()}
        >
          <Text style={styles.primaryText}>Check My Location</Text>
        </Pressable>

        <Text style={styles.value}>Status Area : {mapStatus}</Text>
      </View>

      <Modal visible={mapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            region={region}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker coordinate={selectedLocation} />
            )}
          </MapView>

          <View style={styles.floating}>
            <Pressable onPress={goToMyLocation} style={styles.circleBtn}>
              <Text style={styles.icon}>📍</Text>
            </Pressable>

            <Pressable
              onPress={() => setMapVisible(false)}
              style={[styles.circleBtn, styles.confirm]}
            >
              <Text style={styles.icon}>✓</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "85%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  value: {
    fontSize: 13,
    color: "#555",
  },
  muted: {
    marginTop: 8,
    color: "#888",
  },
  primaryButton: {
    marginTop: 15,
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
  },
  floating: {
    position: "absolute",
    right: 16,
    bottom: 24,
    gap: 12,
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  confirm: {
    backgroundColor: "#22C55E",
  },
  icon: {
    fontSize: 18,
  },
});
