import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/firebase/authService';

const AuthContext = createContext(null);

// Single source of truth for "who is signed in" plus the auth actions
// screens need. Screens call these methods and handle their own loading/
// error UI; this context only owns the shared user/initializing state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signInWithGoogleIdToken: authService.signInWithGoogleIdToken,
      requestPasswordReset: authService.requestPasswordReset,
      verifyResetCode: authService.verifyResetCode,
      confirmReset: authService.confirmReset,
      changePassword: authService.changePassword,
      signOutUser: authService.signOutUser,
    }),
    [user, initializing],
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
