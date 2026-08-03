import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/firebase/authService';

const AuthContext = createContext(null);

// Single source of truth for "who is signed in" plus the auth actions
// screens need. Screens call these methods and handle their own loading/
// error UI; this context only owns the shared user/initializing state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
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
      return undefined;
    }

    const unsubscribe = authService.subscribeToUserDocument(user.uid, (data) => {
      setRole(data?.role || 'user');
    });
    return unsubscribe;
  }, [user]);

  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      initializing,
      role,
      isAdmin,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signInWithGoogleIdToken: authService.signInWithGoogleIdToken,
      requestPasswordReset: authService.requestPasswordReset,
      verifyResetCode: authService.verifyResetCode,
      confirmReset: authService.confirmReset,
      changePassword: authService.changePassword,
      signOutUser: authService.signOutUser,
    }),
    [user, initializing, role, isAdmin],
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