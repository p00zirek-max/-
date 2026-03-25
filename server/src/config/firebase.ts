/**
 * Firebase Admin SDK initialization.
 *
 * Optional for MVP — if credentials are not configured,
 * Firebase-dependent features (token verification, custom claims)
 * will gracefully return null / throw clear errors.
 *
 * Env variables:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of service account key
 *   FIREBASE_SERVICE_ACCOUNT_PATH — path to service account JSON file
 *   FIREBASE_PROJECT_ID — (fallback) project ID for emulator / minimal init
 */

let firebaseAdmin: typeof import('firebase-admin') | null = null;
let firebaseAuth: import('firebase-admin').auth.Auth | null = null;
let initialized = false;

function getServiceAccount(): object | null {
  // 1. JSON string in env
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      console.error('[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
      return null;
    }
  }

  // 2. File path in env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } catch {
      console.error('[firebase] Failed to load service account from file:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      return null;
    }
  }

  return null;
}

export function initFirebase(): boolean {
  if (initialized) return firebaseAdmin !== null;

  initialized = true;

  try {
    // Dynamic import — firebase-admin is optional dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    const serviceAccount = getServiceAccount();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Minimal init (for emulator or when running inside GCP)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      console.warn('[firebase] No credentials configured. Firebase Auth disabled.');
      console.warn('[firebase] Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH env var.');
      return false;
    }

    firebaseAdmin = admin;
    firebaseAuth = admin.auth();
    console.log('[firebase] Admin SDK initialized successfully');
    return true;
  } catch (err) {
    console.warn('[firebase] firebase-admin not available. Auth features disabled.', err);
    return false;
  }
}

/** Get Firebase Auth instance. Returns null if not initialized. */
export function getFirebaseAuth(): import('firebase-admin').auth.Auth | null {
  if (!initialized) initFirebase();
  return firebaseAuth;
}

/** Check if Firebase is available */
export function isFirebaseConfigured(): boolean {
  if (!initialized) initFirebase();
  return firebaseAdmin !== null;
}
