// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

export default app;