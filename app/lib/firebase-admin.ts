import "server-only";
import { initializeApp, getApps, deleteApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App | null = null;

function projectIdFromClientEmail(clientEmail: string): string | null {
  const match = clientEmail.match(/^[^@]+@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match?.[1] ?? null;
}

function looksLikePlaceholderCredential(value: string): boolean {
  return /your[-_]?project[-_]?id|example|placeholder|<project|paste|your_private|your_account|your_callmebot/i.test(value);
}

export function getAdminProjectId(): string | null {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (!clientEmail) return null;
  return projectIdFromClientEmail(clientEmail) || null;
}

function getAdminApp(): App | null {
  if (adminApp) {
    return adminApp;
  }
  const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } =
    process.env;
  const derivedProjectId = getAdminProjectId();
  console.log("[firebase-admin] env check:", {
    envProjectId: FIREBASE_ADMIN_PROJECT_ID,
    derivedProjectId,
    clientEmail: !!FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: {
      present: !!FIREBASE_ADMIN_PRIVATE_KEY,
      length: FIREBASE_ADMIN_PRIVATE_KEY?.length,
      hasBegin: FIREBASE_ADMIN_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY"),
      hasNewlines: FIREBASE_ADMIN_PRIVATE_KEY?.includes("\n"),
      hasBackslashN: FIREBASE_ADMIN_PRIVATE_KEY?.includes("\\n"),
    },
  });
  if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error("[firebase-admin] missing admin env vars");
    return null;
  }
  if (
    looksLikePlaceholderCredential(FIREBASE_ADMIN_CLIENT_EMAIL) ||
    looksLikePlaceholderCredential(FIREBASE_ADMIN_PRIVATE_KEY)
  ) {
    console.error(
      "[firebase-admin] admin credentials are still placeholders. Please set real FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY from your Firebase service account."
    );
    return null;
  }
  let privateKey = FIREBASE_ADMIN_PRIVATE_KEY;
  // dotenv may preserve surrounding quotes; strip them before building the cert
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.includes("\n")
    ? privateKey
    : privateKey.replace(/\\n/g, "\n");
  const projectId = derivedProjectId || FIREBASE_ADMIN_PROJECT_ID || "";
  if (FIREBASE_ADMIN_PROJECT_ID && derivedProjectId && FIREBASE_ADMIN_PROJECT_ID !== derivedProjectId) {
    console.warn(
      `[firebase-admin] FIREBASE_ADMIN_PROJECT_ID (${FIREBASE_ADMIN_PROJECT_ID}) does not match the service account project (${derivedProjectId}). Using ${derivedProjectId}.`
    );
  }
  if (!projectId) {
    console.error("[firebase-admin] could not determine admin project ID");
    return null;
  }
  const bucketName = getStorageBucketName();
  const appOptions = {
    credential: cert({
      projectId,
      clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
    ...(bucketName ? { storageBucket: bucketName } : {}),
  };
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existing = existingApps[0];
    const existingOptions = existing.options as { storageBucket?: string };
    if (bucketName && existingOptions.storageBucket !== bucketName) {
      console.warn(
        `[firebase-admin] existing app missing storageBucket (${existingOptions.storageBucket ?? "none"}), reinitializing with ${bucketName}`
      );
      try { deleteApp(existing); } catch { /* ignore */ }
    } else {
      adminApp = existing;
      console.log("[firebase-admin] reusing existing app, storageBucket:", existingOptions.storageBucket);
      return adminApp;
    }
  }
  try {
    adminApp = initializeApp(appOptions);
    console.log("[firebase-admin] initialized successfully, storageBucket:", bucketName);
  } catch (err) {
    console.error("[firebase-admin] initializeApp failed:", err);
    adminApp = null;
  }
  return adminApp;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

let dbSettingsApplied = false;

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  if (!dbSettingsApplied) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
      dbSettingsApplied = true;
    } catch (err) {
      console.warn("[firebase-admin] db.settings already set:", err);
      dbSettingsApplied = true;
    }
  }
  return db;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

type Bucket = ReturnType<Storage["bucket"]>;

export function getStorageBucket(): Bucket | null {
  const adminStorage = getAdminStorage();
  if (!adminStorage) {
    console.error("[firebase-admin] getStorageBucket: admin storage not initialized");
    return null;
  }
  const name = getStorageBucketName();
  if (!name) {
    console.error("[firebase-admin] getStorageBucket: no bucket name — set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env.local");
    return null;
  }
  const bucket = adminStorage.bucket(name);
  if (typeof (bucket as unknown as Record<string, unknown>).file !== "function") {
    console.error("[firebase-admin] getStorageBucket: bucket object is invalid (no .file method). adminStorage type:", typeof adminStorage, Object.keys(adminStorage).slice(0, 10));
    return null;
  }
  console.log(`[firebase-admin] getStorageBucket: resolved bucket ${name}`);
  return bucket;
}

function looksLikePlaceholderBucket(name: string): boolean {
  return /your[-_]?project[-_]?id|example|placeholder|<project/i.test(name);
}

export function getStorageBucketName(): string | null {
  const adminProjectId = getAdminProjectId();
  const fromEnv =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (fromEnv && !looksLikePlaceholderBucket(fromEnv)) {
    return fromEnv;
  }

  if (fromEnv) {
    console.warn(
      `[firebase-admin] bucket name "${fromEnv}" looks like a placeholder; using ${adminProjectId}.appspot.com instead.`
    );
  }

  return adminProjectId ? `${adminProjectId}.appspot.com` : null;
}
