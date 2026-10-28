import { Platform } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../services/firebase/firebaseConfig';

// Application error log. Writes one document per error to errorLogs/{id},
// which the Monitor tab reads for its error log and health indicators.
//
//   logError('scan.predict', error, { source: 'Uploaded' });
//
// `source` is a short dotted area name — keep it stable so the Monitor tab
// can group by it. Logging is best-effort: it never throws, and it's
// rate-limited so a crash loop can't flood Firestore on the free plan.
// Errors are still printed to the console as before.

const MAX_PER_MINUTE = 10;
const DEDUPE_WINDOW_MS = 30 * 1000;

let windowStart = 0;
let sentInWindow = 0;
const lastSentByKey = new Map();

export const ERROR_SOURCES = {
  'scan.predict': 'Classifier',
  'scan.detect': 'Detector (YOLO)',
  'scan.camera': 'Camera',
  'scan.save': 'Save scan / orchid',
  'orchid.delete': 'Delete orchid',
  'reports.create': 'Send report',
  'auth': 'Sign-in',
};

export function logError(source, error, context = {}) {
  try {
    console.error(`[${source}]`, { code: error?.code, message: error?.message, ...context });

    // getAuth() returns the app's existing Auth instance (including one made
    // with initializeAuth), so this needs no extra export from firebaseConfig.
    const user = getAuth().currentUser;
    // The errorLogs rule only accepts self-tagged writes from signed-in users.
    if (!user) return;

    const message = String(error?.message || error || 'Unknown error').slice(0, 500);
    const key = `${source}|${message}`;
    const now = Date.now();

    if (now - (lastSentByKey.get(key) || 0) < DEDUPE_WINDOW_MS) return;
    if (now - windowStart > 60 * 1000) {
      windowStart = now;
      sentInWindow = 0;
    }
    if (sentInWindow >= MAX_PER_MINUTE) return;

    sentInWindow += 1;
    lastSentByKey.set(key, now);

    addDoc(collection(db, 'errorLogs'), {
      userId: user.uid,
      source,
      code: error?.code ? String(error.code) : null,
      message,
      context: sanitize(context),
      platform: Platform.OS,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  } catch (_) {
    // Logging must never break the app.
  }
}

// Keep only small primitive values so a context object can't carry a photo,
// a token or a huge payload into the log.
function sanitize(context) {
  const out = {};
  Object.entries(context || {}).forEach(([k, v]) => {
    if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
  });
  return out;
}
