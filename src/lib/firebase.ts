import { auth, db, storage } from "@/integrations/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  limit as qlimit,
  serverTimestamp,
} from "firebase/firestore";

type MinimalError = { message: string } | null;

export { auth, db, storage };

const nowIso = () => new Date().toISOString();

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url?: string | null;
  is_admin?: boolean;
  side?: "bride" | "groom" | null;
  relationship?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Create a profile document for the new user
    await setDoc(doc(db, "profiles", user.uid), {
      id: user.uid,
      full_name: fullName,
      email,
      phone: null,
      side: null,
      relationship: null,
      is_admin: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    });

    return { data: { user }, error: null as MinimalError };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Sign up failed" } as MinimalError };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { data: { user: cred.user }, error: null as MinimalError };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Sign in failed" } as MinimalError };
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    // Ensure a profile document exists/updated for the user
    const profileRef = doc(db, "profiles", user.uid);
    const existing = await getDoc(profileRef);
    const profilePayload = {
      id: user.uid,
      full_name: user.displayName ?? null,
      email: user.email ?? null,
      phone: null,
      avatar_url: user.photoURL ?? null,
      side: null,
      relationship: null,
      updated_at: nowIso(),
      ...(existing.exists() ? {} : { is_admin: false, created_at: nowIso() }),
    };
    await setDoc(profileRef, profilePayload, { merge: true });

    return { data: { user }, error: null as MinimalError };
  } catch (e: any) {
    return {
      data: null,
      error: { message: e?.message || "Google sign-in failed" } as MinimalError,
    };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null as MinimalError };
  } catch (e: any) {
    return { error: { message: e?.message || "Sign out failed" } as MinimalError };
  }
};

export const getCurrentUser = async (): Promise<FirebaseUser | null> => {
  return auth.currentUser;
};

export const getSession = async (): Promise<FirebaseUser | null> => {
  return auth.currentUser;
};

export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Prefer profile flag for admin check
    const profileSnap = await getDoc(doc(db, "profiles", userId));
    const fromProfile =
      profileSnap.exists() && Boolean((profileSnap.data() as any)?.is_admin === true);
    if (fromProfile) return true;

    // Fallback to legacy user_roles mapping (for backward compatibility)
    const rolesRef = collection(db, "user_roles");
    const q = query(
      rolesRef,
      where("user_id", "==", userId),
      where("role", "==", "admin"),
      qlimit(1),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.error("Error checking admin role:", e);
    return false;
  }
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const snap = await getDoc(doc(db, "profiles", userId));
    if (!snap.exists()) return null;
    const data = snap.data() as Profile;
    return { ...data, id: userId };
  } catch {
    return null;
  }
};

export const upsertProfile = async (
  userId: string,
  updates: Partial<Profile>,
): Promise<{ error: MinimalError }> => {
  try {
    await setDoc(
      doc(db, "profiles", userId),
      { ...updates, updated_at: nowIso() },
      { merge: true },
    );
    return { error: null };
  } catch (e: any) {
    return { error: { message: e?.message || "Failed to update profile" } as MinimalError };
  }
};
