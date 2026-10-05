import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  increment,
  getDoc,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocFromServer
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

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
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
      lastUpdate: Timestamp.now()
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
      lastSeen: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    // Silently fail for presence to not disturb user
  }
}

export function subscribeToOnlineCount(callback: (count: number) => void) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const q = query(
    collection(db, 'presence'),
    where('lastSeen', '>', Timestamp.fromDate(twoMinutesAgo))
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}
