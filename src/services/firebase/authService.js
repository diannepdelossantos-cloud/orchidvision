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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';

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

export async function uploadAvatar(uid, localUri) {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const avatarRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(avatarRef, blob);
  const photoURL = await getDownloadURL(avatarRef);

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
