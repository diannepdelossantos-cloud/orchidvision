// Translates Firebase Auth error codes into copy a user can act on.
// Falls back to the raw message for anything not explicitly mapped.
const MESSAGES = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/expired-action-code': 'This reset link has expired. Please request a new one.',
  'auth/invalid-action-code': 'This reset link is invalid or has already been used.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
};

export function getAuthErrorMessage(error) {
  return MESSAGES[error?.code] || error?.message || 'Something went wrong. Please try again.';
}
