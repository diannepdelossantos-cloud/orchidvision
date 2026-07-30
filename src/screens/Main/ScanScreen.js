import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    requestPermission();
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Camera permission is required.</Text>
      </View>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedImage(photo.uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  // Preview screen after a photo is captured/picked
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        <View style={styles.previewControls}>
          <TouchableOpacity style={styles.retakeButton} onPress={() => setCapturedImage(null)}>
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={() => {
              // TODO: send capturedImage to model inference
              console.log('Analyzing:', capturedImage);
            }}
          >
            <Text style={styles.buttonText}>Analyze</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Live camera view with overlay UI
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing="back"
        enableTorch={flashOn}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>OrchidVision</Text>
          <Text style={styles.headerSubtitle}>Vanda sanderiana · Health Detection</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scan frame overlay */}
      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.holdStillText}>Hold still</Text>
      </View>

      {/* Instruction */}
      <Text style={styles.instructionText}>Capture leaf, stem, root, or flower</Text>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.sideButton} onPress={pickFromGallery}>
          <Ionicons name="image-outline" size={26} color="#fff" />
          <Text style={styles.sideButtonLabel}>Upload image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideButton} onPress={() => setFlashOn(!flashOn)}>
          <Ionicons name={flashOn ? 'flash' : 'flash-outline'} size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b3a1e' },
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

  frameWrap: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  frame: { width: 260, height: 260, justifyContent: 'space-between' },
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

  placeholderText: { color: '#fff', textAlign: 'center', marginTop: 100 },

  previewImage: { flex: 1, resizeMode: 'contain' },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  retakeButton: { backgroundColor: '#555', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  analyzeButton: { backgroundColor: '#2e7d32', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});