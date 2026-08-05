import { Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase/supabaseClient';

// Thin wrappers around the Firebase calls used by the Auth screens.
// Screens/context call these instead of touching the SDK directly, so the
// UI layer never has to know about Firebase-specific error shapes or paths.

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Creates the Firebase Auth account, sets the display name, and writes the
// matching Firestore profile document (users/{uid}) per the storyboard's
// Create Account fields: Full Name, Email, Station/Location.
export async function signUp({ fullName, email, location, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  await updateProfile(user, { displayName: fullName });
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    fullName,
    email,
    location,
    createdAt: serverTimestamp(),
  });

  return user;
}

// Google sign-in can create a first-time user, so make sure their
// Firestore profile document exists without overwriting it on repeat logins.
export async function ensureUserDocument(user) {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(ref, {
    uid: user.uid,
    fullName: user.displayName || '',
    email: user.email || '',
    location: '',
    createdAt: serverTimestamp(),
  });
}

export async function signInWithGoogleIdToken(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user);
  return result.user;
}

export async function requestPasswordReset(email, actionCodeSettings) {
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}

// Used by the Reset Password screen when the user opens the link from
// their email: confirms the link is still valid and returns the email
// it belongs to (shown to the user for confirmation).
export async function verifyResetCode(oobCode) {
  return verifyPasswordResetCode(auth, oobCode);
}

export async function confirmReset(oobCode, newPassword) {
  await confirmPasswordReset(auth, oobCode, newPassword);
}

export function signOutUser() {
  return signOut(auth);
}

// Two-Factor Authentication is opt-in per user (Settings toggle) and checked
// once, right after sign-in, via AuthContext — not on every profile read.
export async function getTwoFactorEnabled(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return !!snapshot.data()?.twoFactorEnabled;
}

export async function setTwoFactorEnabled(uid, enabled) {
  await updateDoc(doc(db, 'users', uid), { twoFactorEnabled: enabled });
}

// Real-time subscription to the signed-in user's Firestore profile document,
// used by ProfileContext so edits (from any device/tab) reflect immediately.
export function subscribeToUserDocument(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
}

// Updates the editable Profile fields. `stationId` wasn't collected at
// sign-up (Create Account only has Station/Location as one field), so it
// starts unset and is only ever written here.
export async function updateUserProfile(uid, { fullName, location, stationId }) {
  await updateDoc(doc(db, 'users', uid), { fullName, location, stationId });
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: fullName });
  }
}

// Uploads the avatar to Supabase Storage (Firebase Storage requires the
// paid Blaze plan, so file hosting lives in Supabase instead) and saves
// the resulting public URL to both the Firestore doc and the Firebase
// Auth profile, same as the rest of this file does for other fields.
// expo-file-system's readAsStringAsync is native-only, so on web we read
// the file as a blob directly instead.
export async function uploadAvatar(uid, localUri) {
  const filePath = `avatars/${uid}.jpg`;
  let fileData;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    fileData = await response.blob();
  } else {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    fileData = decode(base64);
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const photoURL = data.publicUrl;

  await updateDoc(doc(db, 'users', uid), { photoURL });
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL });
  }

  return photoURL;
}

// Firebase requires re-proving the current password before allowing a
// password change, hence the reauthenticate step.
export async function changePassword(currentPassword, newPassword) {
  const { currentUser } = auth;
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
}