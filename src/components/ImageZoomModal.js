import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DetectionOverlay from './DetectionOverlay';

// Full-screen, uncropped view of a scan photo, so the YOLOv8-highlighted
// regions can be inspected without the aspect-ratio cropping the inline
// thumbnail/result image uses (those use resizeMode="cover"; this uses
// "contain" — see DetectionOverlay's two fit modes).
export default function ImageZoomModal({ visible, imageUri, detections = [], onClose }) {
  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          <DetectionOverlay imageUri={imageUri} detections={detections} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imageWrap: {
    width: '100%',
    height: '80%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
