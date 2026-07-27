import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

// Required once per app so the OAuth browser tab closes itself and
// returns control to the app after the user approves access.
WebBrowser.maybeCompleteAuthSession();

// Wraps Expo's AuthSession Google provider + Firebase credential exchange
// behind a single "promptAsync" call, so screens don't deal with OAuth
// plumbing directly.
export function useGoogleSignIn() {
  const { signInWithGoogleIdToken } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) return;

    setIsSigningIn(true);
    setError(null);
    signInWithGoogleIdToken(idToken)
      .catch((err) => setError(getAuthErrorMessage(err)))
      .finally(() => setIsSigningIn(false));
  }, [response, signInWithGoogleIdToken]);

  return {
    isReady: !!request,
    isSigningIn,
    error,
    promptAsync,
  };
}
