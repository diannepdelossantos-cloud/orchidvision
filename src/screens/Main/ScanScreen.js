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
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

import { predictDisease } from '../../services/predictionService';
import { detectDiseaseRegions } from '../../services/detectionService';
import ScanResultCard from '../../components/ScanResultCard';
import DetectionOverlay from '../../components/DetectionOverlay';
import ImageZoomModal from '../../components/ImageZoomModal';
import RegisterOrchidModal from '../../components/RegisterOrchidModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import { logError } from '../../utils/errorLogger';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { useAuth } from '../../context/AuthContext';
import * as orchidService from '../../services/firebase/orchidService';
import { TARGET_SPECIES } from '../../utils/diseaseInfo';
import { showAlert } from '../../utils/showAlert';

// Must match the <Tab.Screen name="..."> in MainTabNavigator.js exactly.
const MY_ORCHIDS_ROUTE = 'MyOrchids';

export default function ScanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { addScanRecord } = useScanHistory();

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState('back');

  const [result, setResult] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notOrchidWarning, setNotOrchidWarning] = useState(null);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savingOrchid, setSavingOrchid] = useState(false);
  // Set once this result has been saved, so tapping Save again can't create
  // a second orchid / second History record for the same scan.
  const [savedTo, setSavedTo] = useState(null);
  // History record of the saved result. If it gets deleted elsewhere (orchid
  // deleted in My Orchids, or removed in History), the result is cleared and
  // the camera comes back.
  const [savedScanId, setSavedScanId] = useState(null);
  const [scanSource, setScanSource] = useState('Scanned');
  const [zoomVisible, setZoomVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  // Set when arriving here via an orchid's "Scan this orchid now" button, so
  // Save attaches to that existing orchid instead of registering a new one.
  // Consumed once from the route params (then cleared) so a later, unrelated
  // visit to this tab doesn't silently keep targeting the same orchid.
  const [targetOrchid, setTargetOrchid] = useState(null);

  const cameraRef = useRef(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (route.params?.orchidId) {
      setTargetOrchid({ id: route.params.orchidId, nickname: route.params.orchidNickname });
      navigation.setParams({ orchidId: undefined, orchidNickname: undefined });
    }
  }, [route.params?.orchidId]);

  // Watch the saved record; once it's deleted or soft-deleted, go back to
  // the camera instead of showing a result that no longer exists.
  useEffect(() => {
    if (!savedScanId) return undefined;
    const unsubscribe = onSnapshot(
      doc(db, 'scans', savedScanId),
      (snap) => {
        if (!snap.exists() || snap.data()?.deletedAt) {
          resetAll();
          setCapturedImage(null);
        }
      },
      () => {
        // Permission errors after a delete also mean the record is gone.
        resetAll();
        setCapturedImage(null);
      },
    );
    return unsubscribe;
  }, [savedScanId]);

  const resetAll = () => {
    setResult(null);
    setDetections([]);
    setLoading(false);
    setNotOrchidWarning(null);
    setSaveModalVisible(false);
    setZoomVisible(false);
    setSavedTo(null);
    setSavedScanId(null);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      resetAll();
      setCapturedImage(photo.uri);
      runScan(photo.uri, 'Scanned');
    } catch (e) {
      logError('scan.camera', e);
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
      runScan(picked.assets[0].uri, 'Uploaded');
    }
  };

  const runScan = async (uri, source) => {
    setLoading(true);
    try {
      // Detection runs alongside classification rather than after it — it's
      // additive (bounding boxes for the diagnosis, not the diagnosis
      // itself), so a failure here shouldn't block or delay the result the
      // classifier already produced.
      const [prediction, regions] = await Promise.all([
        predictDisease(uri),
        detectDiseaseRegions(uri).catch((e) => {
          logError('scan.detect', e, { source });
          return [];
        }),
      ]);
      if (prediction.top.label === 'not_orchid') {
        setNotOrchidWarning(prediction);
      } else {
        setResult(prediction);
        setDetections(regions);
        setScanSource(source);
        // No History record yet: it is created only when the user taps Save,
        // named after the orchid, so one saved orchid = one History entry.
      }
    } catch (e) {
      logError('scan.predict', e, { source });
      Alert.alert('Scan failed', e?.message || 'The image could not be analyzed. Try again.');
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

  // After a successful save: clear the result so the Scan tab is back on
  // the camera next time, then open the orchid's detail screen. Works
  // whether OrchidDetail is registered in a parent stack or nested inside
  // the My Orchids tab's own stack.
  const finishAndOpenOrchid = (orchidId) => {
    resetAll();
    setCapturedImage(null);

    let nav = navigation;
    while (nav) {
      if (nav.getState?.()?.routeNames?.includes('OrchidDetail')) {
        nav.navigate('OrchidDetail', { orchidId });
        return;
      }
      nav = nav.getParent?.();
    }
    // `initial: false` keeps the My Orchids list underneath, so Back from
    // the detail screen lands on the list.
    navigation.navigate(MY_ORCHIDS_ROUTE, {
      screen: 'OrchidDetail',
      params: { orchidId },
      initial: false,
    });
  };

  // Uploads the photo and creates the single History record for this
  // result, already named after the orchid it is being saved to.
  const createRecordFor = (name) =>
    addScanRecord({
      name,
      label: result.top.label,
      confidence: result.top.score,
      imageUri: capturedImage,
      source: scanSource,
      detections,
    });

  const handleSaveOrchid = async ({ nickname, speciesName }) => {
    if (savingOrchid || savedTo) return;
    setSavingOrchid(true);
    try {
      const record = await createRecordFor(nickname);
      const orchidId = await orchidService.createOrchid(user.uid, {
        nickname,
        speciesName,
        scanId: record.id,
        imageUrl: record.imageUrl,
        label: result.top.label,
        confidence: result.top.score,
        detections,
      });
      setSaveModalVisible(false);
      finishAndOpenOrchid(orchidId);
    } catch (e) {
      logError('scan.save', e, { flow: 'register' });
      showAlert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSavingOrchid(false);
    }
  };

  const handleAttachToOrchid = async () => {
    if (savingOrchid || savedTo) return;
    setSavingOrchid(true);
    try {
      const record = await createRecordFor(targetOrchid.nickname);
      await orchidService.attachScanToOrchid(user.uid, targetOrchid.id, {
        scanId: record.id,
        imageUrl: record.imageUrl,
        label: result.top.label,
        confidence: result.top.score,
        detections,
      });
      const orchidId = targetOrchid.id;
      setTargetOrchid(null);
      finishAndOpenOrchid(orchidId);
    } catch (e) {
      logError('scan.save', e, { flow: 'attach' });
      showAlert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSavingOrchid(false);
    }
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
            <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
              <Image source={{ uri: capturedImage }} style={styles.resultImage} />
              <DetectionOverlay imageUri={capturedImage} detections={detections} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.capturePill} onPress={backToCamera}>
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.capturePillText}>Capture new image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.savePill, (savingOrchid || savedTo) && styles.savePillDone]}
              onPress={targetOrchid ? handleAttachToOrchid : () => setSaveModalVisible(true)}
              disabled={savingOrchid || !!savedTo}
            >
              {savingOrchid ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={savedTo ? 'checkmark' : 'bookmark-outline'} size={16} color="#fff" />
              )}
              <Text style={styles.savePillText}>
                {savedTo ? 'Saved' : targetOrchid ? `Save to ${targetOrchid.nickname}` : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScanResultCard result={result} />

          <TouchableOpacity style={styles.reportLink} onPress={() => setReportVisible(true)}>
            <Ionicons name="flag-outline" size={14} color="#8a8a8a" />
            <Text style={styles.reportLinkText}>Report this result</Text>
          </TouchableOpacity>
        </ScrollView>

        <RegisterOrchidModal
          visible={saveModalVisible}
          defaultSpecies={TARGET_SPECIES}
          onClose={() => setSaveModalVisible(false)}
          onSubmit={handleSaveOrchid}
        />

        <ReportIssueModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          defaultType="wrong_diagnosis"
          scan={{ label: result.top.label, confidence: result.top.score }}
        />

        <ImageZoomModal
          visible={zoomVisible}
          imageUri={capturedImage}
          detections={detections}
          onClose={() => setZoomVisible(false)}
        />
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
        <TouchableOpacity onPress={goToMyOrchids}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {!!targetOrchid && (
        <View style={styles.targetBanner}>
          <Ionicons name="flower-outline" size={14} color="#fff" />
          <Text style={styles.targetBannerText} numberOfLines={1}>
            Adding scan to {targetOrchid.nickname}
          </Text>
          <TouchableOpacity onPress={() => setTargetOrchid(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

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

  targetBanner: {
    position: 'absolute',
    top: 96,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46,125,50,0.9)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  targetBannerText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1, marginHorizontal: 6 },

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
  // marginBottom clears both the pills' full height below the image (see
  // capturePill/savePill) and DetectionOverlay's "Affected regions
  // highlighted" caption bar, which sits at the image's own bottom edge —
  // the pills used to overlap and cover that caption before this offset
  // was pushed down.
  imageWrap: { marginHorizontal: 16, marginBottom: 56 },
  resultImage: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  capturePill: {
    position: 'absolute',
    left: -4,
    bottom: -44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  capturePillText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  savePill: {
    position: 'absolute',
    right: -4,
    bottom: -44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  savePillText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  savePillDone: { backgroundColor: '#81c784' },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reportLinkText: { color: '#8a8a8a', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },

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