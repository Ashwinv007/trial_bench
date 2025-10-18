// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzrBw2xIEuh1XEnSWowCXa6wuS_ypzf28",
  authDomain: "trial-bench--crm.firebaseapp.com",
  projectId: "trial-bench--crm",
  storageBucket: "trial-bench--crm.firebasestorage.app",
  messagingSenderId: "77504521211",
  appId: "1:77504521211:web:cda9146c78d9999acee15e",
  measurementId: "G-N6GW714B49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
