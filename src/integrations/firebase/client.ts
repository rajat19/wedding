import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAVoCQQLMcvpfyoXXpzQ9vsEgH2upim7ww",
  authDomain: "rajat-shraddha-wedding.firebaseapp.com",
  projectId: "rajat-shraddha-wedding",
  storageBucket: "rajat-shraddha-wedding.firebasestorage.app",
  messagingSenderId: "196372122429",
  appId: "1:196372122429:web:fa60ffea7b6cb846499354",
  measurementId: "G-XL3D9125LK",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
