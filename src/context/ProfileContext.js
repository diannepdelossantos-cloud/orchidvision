import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as authService from '../services/firebase/authService';

const ProfileContext = createContext(null);

// Keeps the signed-in user's Firestore profile document (fullName, email,
// location, stationId, photoURL) in sync via a real-time listener, and
// exposes the update actions the Profile/Edit Profile screen needs.
export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = authService.subscribeToUserDocument(user.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const updateProfile = useCallback(
    (fields) => authService.updateUserProfile(user.uid, fields),
    [user],
  );

  const uploadAvatar = useCallback(
    (localUri) => authService.uploadAvatar(user.uid, localUri),
    [user],
  );

  const value = useMemo(
    () => ({ profile, loading, updateProfile, uploadAvatar }),
    [profile, loading, updateProfile, uploadAvatar],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
