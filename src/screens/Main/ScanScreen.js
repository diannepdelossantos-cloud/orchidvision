import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { predictDisease } from '../../services/predictionService';
import ScanResultCard from '../../components/ScanResultCard';

// Must match the <Tab.Screen name="..."> in MainTabNavigator.js exactly.
const MY_ORCHIDS_ROUTE = 'My Orchids';

export default function ScanScreen() {
  const navigation = useNavigation();

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState('back');

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notOrchidWarning, setNotOrchidWarning] = useState(null);

  const cameraRef = useRef(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const resetAll = () => {
    setResult(null);
    setLoading(false);
    setNotOrchidWarning(null);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      resetAll();
      setCapturedImage(photo.uri);
      runScan(photo.uri);
    } catch (e) {
      Alert.alert('Camera error', 'The photo could not be captured. Try again.');
    }
  };

  const pickFromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!picked.canceled) {
      resetAll();
      setCapturedImage(picked.assets[0].uri);
      runScan(picked.assets[0].uri);
    }
  };

  const runScan = async (uri) => {
    setLoading(true);
    try {
      const prediction = await predictDisease(uri);
      if (prediction.top.label === 'not_orchid') {
        setNotOrchidWarning(prediction);
      } else {
        setResult(prediction);
      }
    } catch (e) {
      Alert.alert('Scan failed', 'The image could not be analyzed. Try again.');
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  // Continue -> dismiss the warning and stay on the camera
  const continueScanning = () => {
    setNotOrchidWarning(null);
    setCapturedImage(null);
  };

  // Cancel -> leave the scanner for My Orchids
  const goToMyOrchids = () => {
    resetAll();
    setCapturedImage(null);
    navigation.navigate(MY_ORCHIDS_ROUTE);
  };

  const backToCamera = () => {
    resetAll();
    setCapturedImage(null);
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>
          Camera access is needed to scan your orchid.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="flower-outline" size={64} color="#fff" />
        <Text style={styles.loadingText}>Processing AI analysis result…</Text>
        <ActivityIndicator color="#8bc34a" style={{ marginTop: 18 }} />
      </View>
    );
  }

  // ---------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------
  if (result && capturedImage) {
    return (
      <View style={styles.resultContainer}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={backToCamera}>
            <Ionicons name="chevron-back" size={22} color="#1b3a1e" />
          </TouchableOpacity>

          <View style={styles.imageWrap}>
            <Image source={{ uri: capturedImage }} style={styles.resultImage} />
            <TouchableOpacity style={styles.capturePill} onPress={backToCamera}>
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.capturePillText}>Capture new image</Text>
            </TouchableOpacity>
          </View>

          <ScanResultCard result={result} />
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing={facing}
        enableTorch={flashOn}
      />

      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>OrchidVision</Text>
          <Text style={styles.headerSubtitle}>
            Vanda sanderiana · Health Detection
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.holdStillText}>Hold still</Text>
      </View>

      <Text style={styles.instructionText}>
        Capture a close-up of the affected leaf
      </Text>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.sideButton} onPress={pickFromGallery}>
          <Ionicons name="image-outline" size={26} color="#fff" />
          <Text style={styles.sideButtonLabel}>Upload image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.flashButton}
        onPress={() => setFlashOn(!flashOn)}
      >
        <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* ------------- Not-an-orchid warning ------------- */}
      <Modal
        transparent
        visible={!!notOrchidWarning}
        animationType="fade"
        onRequestClose={continueScanning}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Warning</Text>
            <Text style={styles.modalBody}>
              This plant is not recognized as an orchid.
            </Text>
            <Text style={styles.modalBody}>
              Please scan an orchid for accurate analysis.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={goToMyOrchids}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalDivider} />
              <TouchableOpacity style={styles.modalBtn} onPress={continueScanning}>
                <Text style={styles.modalBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b3a1e' },
  center: { justifyContent: 'center', alignItems: 'center' },
  resultContainer: { flex: 1, backgroundColor: '#f5f7f5', paddingTop: 50 },

  loadingText: { color: '#fff', marginTop: 18, fontSize: 14, fontWeight: '600' },

  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTextWrap: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#d0d0d0', fontSize: 12, marginTop: 2 },

  flashButton: { position: 'absolute', top: 110, alignSelf: 'center' },

  frameWrap: { position: 'absolute', top: '25%', left: 0, right: 0, alignItems: 'center' },
  frame: { width: 260, height: 260 },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 12 },
  holdStillText: { color: '#fff', marginTop: 16, fontSize: 14 },

  instructionText: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
  },
  sideButton: { alignItems: 'center' },
  sideButtonLabel: { color: '#fff', fontSize: 11, marginTop: 4 },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  placeholderText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: 32,
    fontSize: 15,
  },
  permissionButton: {
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },

  // Result screen
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: 12,
  },
  imageWrap: { marginHorizontal: 16, marginBottom: 16 },
  resultImage: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  capturePill: {
    position: 'absolute',
    left: -4,
    bottom: -16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  capturePillText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '78%',
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingTop: 18,
    overflow: 'hidden',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBody: {
    color: '#e0e0e0',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#444',
    marginTop: 18,
  },
  modalDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#444' },
  modalBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 14 },
});