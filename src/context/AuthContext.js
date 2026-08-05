import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/firebase/authService';
import * as twoFactorService from '../services/supabase/twoFactorService';

const AuthContext = createContext(null);

// Single source of truth for "who is signed in" plus the auth actions
// screens need. Screens call these methods and handle their own loading/
// error UI; this context only owns the shared user/initializing state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [role, setRole] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabledState] = useState(false);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
      if (!firebaseUser) setNeedsTwoFactor(false);
    });
    return unsubscribe;
  }, []);

  // Track the signed-in user's role from their Firestore doc, so
  // navigation can route admins to the Admin stack instead of Main.
  // Missing role (or any value other than 'admin') is treated as a
  // regular user — this is a routing convenience only, not a security
  // boundary; admin-only writes must still be enforced by Firestore rules.
  useEffect(() => {
    if (!user) {
      setRole(null);
      setTwoFactorEnabledState(false);
      return undefined;
    }

    const unsubscribe = authService.subscribeToUserDocument(user.uid, (data) => {
      setRole(data?.role || 'user');
      setTwoFactorEnabledState(!!data?.twoFactorEnabled);
    });
    return unsubscribe;
  }, [user]);

  const isAdmin = role === 'admin';

  // Wraps both sign-in paths so a 2FA-enrolled account can't reach the app
  // (AppNavigator gates on needsTwoFactor) until the emailed code is
  // verified. Restoring an already-signed-in session on app launch doesn't
  // go through these wrappers, so it doesn't re-prompt every time the app
  // opens — only a fresh sign-in does.
  const signIn = async (email, password) => {
    const signedInUser = await authService.signIn(email, password);
    if (await authService.getTwoFactorEnabled(signedInUser.uid)) setNeedsTwoFactor(true);
    return signedInUser;
  };

  const signInWithGoogleIdToken = async (idToken) => {
    const signedInUser = await authService.signInWithGoogleIdToken(idToken);
    if (await authService.getTwoFactorEnabled(signedInUser.uid)) setNeedsTwoFactor(true);
    return signedInUser;
  };

  const sendTwoFactorCode = () => twoFactorService.sendTwoFactorCode(user.email);
  const verifyTwoFactorCode = (code) => twoFactorService.verifyTwoFactorCode(user.email, code);
  const confirmTwoFactorLogin = () => setNeedsTwoFactor(false);
  const updateTwoFactorEnabled = (enabled) => authService.setTwoFactorEnabled(user.uid, enabled);

  const value = useMemo(
    () => ({
      user,
      initializing,
      role,
      isAdmin,
      needsTwoFactor,
      twoFactorEnabled,
      signIn,
      signUp: authService.signUp,
      signInWithGoogleIdToken,
      requestPasswordReset: authService.requestPasswordReset,
      verifyResetCode: authService.verifyResetCode,
      confirmReset: authService.confirmReset,
      changePassword: authService.changePassword,
      signOutUser: authService.signOutUser,
      sendTwoFactorCode,
      verifyTwoFactorCode,
      confirmTwoFactorLogin,
      updateTwoFactorEnabled,
    }),
    [user, initializing, role, isAdmin, needsTwoFactor, twoFactorEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}