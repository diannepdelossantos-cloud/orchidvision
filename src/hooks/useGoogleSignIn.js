import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

// Required once per app so the OAuth browser tab closes itself and
// returns control to the app after the user approves access (web only).
WebBrowser.maybeCompleteAuthSession();

const isNative = Platform.OS !== 'web';

// The native Google Sign-In SDK needs configuring once at module load,
// before any screen calls GoogleSignin.signIn(). It only works inside a
// custom dev build (not Expo Go), which is why this branches on platform
// instead of running unconditionally.
if (isNative) {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
      : {}),
  });
}

// Wraps Google sign-in behind a single "promptAsync" call, so screens don't
// deal with OAuth plumbing directly. Web uses expo-auth-session's
// browser-based flow; native (dev build) uses the native Google Sign-In SDK,
// since that's the only approach Google still allows for installed apps.
export function useGoogleSignIn() {
  const { signInWithGoogleIdToken } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState(null);

  const [webRequest, webResponse, webPromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (isNative) return;
    if (webResponse?.type !== 'success') return;
    const idToken = webResponse.params?.id_token;
    if (!idToken) return;

    setIsSigningIn(true);
    setError(null);
    signInWithGoogleIdToken(idToken)
      .catch((err) => setError(getAuthErrorMessage(err)))
      .finally(() => setIsSigningIn(false));
  }, [webResponse, signInWithGoogleIdToken]);

  const promptNativeSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        await signInWithGoogleIdToken(response.data.idToken);
      }
    } catch (err) {
      const isCancellation =
        isErrorWithCode(err) &&
        (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS);
      if (!isCancellation) {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithGoogleIdToken]);

  return {
    isReady: isNative ? true : !!webRequest,
    isSigningIn,
    error,
    promptAsync: isNative ? promptNativeSignIn : webPromptAsync,
  };
}
