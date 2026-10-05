import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, signIn, logOut, signInAsAnonymous } from '../services/firebase';
import { toast } from 'react-hot-toast';

const ADMIN_PIN_FALLBACK = "I2026";

export function useAuth(dynamicPin?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(
    () => localStorage.getItem('admin_pin_session') === 'true'
  );
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Sync Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // If PIN is unlocked and no auth session yet, sign in anonymously
  // so Firestore writes are authorized
  useEffect(() => {
    if (pinUnlocked && !auth.currentUser) {
      signInAsAnonymous().catch(console.error);
    }
  }, [pinUnlocked]);

  // Determine admin status
  useEffect(() => {
    // PIN unlock always grants admin
    if (pinUnlocked) {
      setIsAdminUser(true);
      return;
    }

    if (user && !user.isAnonymous) {
      // Google-signed-in: check admins collection
      const adminDocRef = doc(db, 'admins', user.uid);
      const unsub = onSnapshot(adminDocRef, (snap) => {
        setIsAdminUser(snap.exists() || user.email === 'orestesgvillanueva@gmail.com');
      }, () => {
        // fallback to email check on permission error
        setIsAdminUser(user.email === 'orestesgvillanueva@gmail.com');
      });
      return unsub;
    } else {
      setIsAdminUser(false);
    }
  }, [user, pinUnlocked]);

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const effectivePin = dynamicPin || ADMIN_PIN_FALLBACK;
    if (pinInput.trim() === effectivePin) {
      setPinUnlocked(true);
      localStorage.setItem('admin_pin_session', 'true');
      setShowPinModal(false);
      setPinInput('');
      // Sign in anonymously immediately so writes work right away
      signInAsAnonymous().catch(console.error);
    } else {
      toast.error("PIN Incorrecto");
      setPinInput('');
    }
  };

  const handleSignIn = () => signIn();

  const handleLogOut = async () => {
    await logOut();
    setPinUnlocked(false);
    setIsAdminUser(false);
    localStorage.removeItem('admin_pin_session');
  };

  return {
    user,
    isAdminUser,
    pinUnlocked,
    loading,
    showPinModal,
    setShowPinModal,
    pinInput,
    setPinInput,
    handlePinSubmit,
    handleSignIn,
    handleLogOut,
  };
}
