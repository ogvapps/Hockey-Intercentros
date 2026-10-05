import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  increment,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  WriteBatch,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

import { toast } from 'react-hot-toast';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error("Error al guardar los datos. Revisa tus permisos.");
  throw new Error(JSON.stringify(errInfo));
}

export async function signIn() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Auth error", error);
    throw error;
  }
}

/** Sign in anonymously so PIN-authenticated users can write to Firestore */
export async function signInAsAnonymous() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (error) {
    console.error("Anonymous auth error", error);
    throw error;
  }
}

export async function logOut() {
  return await signOut(auth);
}


export async function incrementVisits() {
  const sessionKey = 'hockey_visit_recorded';
  if (sessionStorage.getItem(sessionKey)) return;

  try {
    const statsRef = doc(db, 'stats', 'visits');
    await setDoc(statsRef, { 
      total: increment(1),
      lastUpdate: serverTimestamp()
    }, { merge: true });
    sessionStorage.setItem(sessionKey, 'true');
  } catch (error) {
    console.error("Error incrementing visits:", error);
  }
}

// Presence logic
const getSessionId = () => {
  const key = 'hockey_presence_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem(key, id);
  }
  return id;
};

const SESSION_ID = getSessionId();

export async function updatePresence() {
  try {
    const presenceRef = doc(db, 'presence', SESSION_ID);
    await setDoc(presenceRef, {
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    // Silently fail for presence to not disturb user
  }
}

/**
 * Counts sessions seen in the last two minutes. The time window is a fixed
 * value inside the query, so the query is rebuilt every minute to keep
 * sliding forward.
 */
export function subscribeToOnlineCount(callback: (count: number) => void) {
  let unsubSnapshot = () => {};

  const subscribe = () => {
    unsubSnapshot();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const q = query(
      collection(db, 'presence'),
      where('lastSeen', '>', Timestamp.fromDate(twoMinutesAgo))
    );
    unsubSnapshot = onSnapshot(
      q,
      (snapshot) => callback(snapshot.size),
      (err) => console.warn('Online count error:', err.code)
    );
  };

  subscribe();
  const interval = setInterval(subscribe, 60 * 1000);
  return () => {
    clearInterval(interval);
    unsubSnapshot();
  };
}

// ── Admin PINs ──────────────────────────────────────────────────
// PINs are stored in /secrets/{scope} (never publicly readable). A scope is a
// tournament id, 'legacy' for the root collections, or 'global'.

export const GLOBAL_SCOPE = 'global';
export const MIN_PIN_LENGTH = 6;

const sessionDoc = (uid: string, scope: string) => doc(db, 'adminSessions', uid, 'scopes', scope);
export const secretDoc = (scope: string) => doc(db, 'secrets', scope);

/** Tries to open a PIN session for a scope. Resolves false when the PIN is wrong. */
export async function openPinSession(scope: string, pin: string): Promise<boolean> {
  if (!auth.currentUser) await signInAnonymously(auth);
  const uid = auth.currentUser!.uid;
  try {
    await setDoc(sessionDoc(uid, scope), { pin, createdAt: serverTimestamp() });
    return true;
  } catch (e: any) {
    if (e?.code === 'permission-denied') return false;
    throw e;
  }
}

export async function closePinSessions(scopes: string[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await Promise.all(scopes.map(s => deleteDoc(sessionDoc(uid, s)).catch(() => {})));
}

/** Adds the write that sets a scope's PIN; also refreshes the caller's own session so they stay unlocked. */
export function setScopePin(batch: WriteBatch, scope: string, pin: string, keepOwnSession: boolean) {
  batch.set(secretDoc(scope), { pin, updatedAt: serverTimestamp() });
  const uid = auth.currentUser?.uid;
  if (keepOwnSession && uid) {
    batch.set(sessionDoc(uid, scope), { pin, createdAt: serverTimestamp() });
  }
}

export function generatePin(length = MIN_PIN_LENGTH) {
  const digits = new Uint32Array(length);
  crypto.getRandomValues(digits);
  return Array.from(digits, d => (d % 10).toString()).join('');
}

// ── Batched writes ──────────────────────────────────────────────
// Firestore rejects batches with more than 500 writes.

const MAX_BATCH_OPS = 450;

export async function commitInChunks(firestore: Firestore, ops: ((batch: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(firestore);
    ops.slice(i, i + MAX_BATCH_OPS).forEach(op => op(batch));
    await batch.commit();
  }
}
