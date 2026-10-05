import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth, signIn, logOut, openPinSession, closePinSessions, secretDoc, GLOBAL_SCOPE } from '../services/firebase';
import { toast } from 'react-hot-toast';

/**
 * Admin status is decided by the Firestore rules, not by the client: the
 * scope's secret document can only be read by its admins, so a successful
 * listener on it means "admin" and a permission error means "not admin".
 *
 * @param scope tournament id, 'legacy', or omitted for the global (home) scope
 */
export function useAuth(scope: string = GLOBAL_SCOPE) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  // Bumped after a PIN session is opened so the listeners re-check access.
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    // Clean up the old client-side unlock flag, which is no longer trusted.
    try { localStorage.removeItem('admin_pin_session'); } catch {}
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdminUser(false);
      setIsGlobalAdmin(false);
      return;
    }

    const watch = (s: string, set: (v: boolean) => void) =>
      onSnapshot(secretDoc(s), () => set(true), () => set(false));

    const unsubScope = watch(scope, setIsAdminUser);
    const unsubGlobal = scope === GLOBAL_SCOPE ? () => {} : watch(GLOBAL_SCOPE, setIsGlobalAdmin);
    return () => {
      unsubScope();
      unsubGlobal();
    };
  }, [user, scope, sessionVersion]);

  // On the home page the scope *is* global.
  const effectiveGlobalAdmin = scope === GLOBAL_SCOPE ? isAdminUser : isGlobalAdmin;

  const handlePinSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const pin = pinInput.trim();
    if (!pin || pinSubmitting) return;
    setPinSubmitting(true);
    try {
      let ok = await openPinSession(scope, pin);
      if (!ok && scope !== GLOBAL_SCOPE) ok = await openPinSession(GLOBAL_SCOPE, pin);
      if (ok) {
        setShowPinModal(false);
        setSessionVersion(v => v + 1);
        toast.success('Acceso concedido');
      } else {
        toast.error('PIN incorrecto');
      }
    } catch (err) {
      console.error('PIN error', err);
      toast.error('No se pudo comprobar el PIN. ¿Hay conexión?');
    } finally {
      setPinInput('');
      setPinSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      setShowPinModal(false);
    } catch {
      toast.error('No se pudo iniciar sesión con Google');
    }
  };

  const handleLogOut = async () => {
    await closePinSessions(scope === GLOBAL_SCOPE ? [GLOBAL_SCOPE] : [scope, GLOBAL_SCOPE]);
    await logOut();
    setIsAdminUser(false);
    setIsGlobalAdmin(false);
  };

  return {
    user,
    isAdminUser,
    isGlobalAdmin: effectiveGlobalAdmin,
    loading,
    showPinModal,
    setShowPinModal,
    pinInput,
    setPinInput,
    pinSubmitting,
    handlePinSubmit,
    handleSignIn,
    handleLogOut,
  };
}
