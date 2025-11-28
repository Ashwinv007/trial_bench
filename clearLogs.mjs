// clearLogs.mjs

// Import necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, limit, getDocs, writeBatch } from "firebase/firestore";

// Your web app's Firebase configuration (copied from src/firebase/config.js)
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
const db = getFirestore(app);

const clearLogsCollection = async () => {
  const collectionRef = collection(db, 'logs');
  const batchSize = 100; // Number of documents to delete per batch

  console.log('Starting to clear logs collection...');

  try {
    let deletedCount = 0;
    while (true) {
      // Query a batch of documents
      const q = query(collectionRef, limit(batchSize));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No more documents to delete. Collection is clear.');
        break; // No more documents to delete
      }

      // Create a new batch and delete each document
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });

      // Commit the batch
      await batch.commit();
      deletedCount += querySnapshot.docs.length;
      console.log(`Deleted ${deletedCount} documents so far...`);
    }
    console.log('Successfully cleared all logs from the collection.');
  } catch (error) {
    console.error('Error clearing logs collection:', error);
    console.error('Please ensure you have authenticated and have sufficient permissions to delete documents.');
  }
};

// Execute the clear function
clearLogsCollection();

// Note: This script assumes you have appropriate Firebase security rules
// and authentication in place to perform deletions.
// If running in Node.js, this script relies on client-side Firebase SDK.
// For administrative tasks with elevated privileges, Firebase Admin SDK is usually preferred.
// If you encounter permission errors, ensure the user running this (if authenticated)
// has delete permissions in your Firestore security rules.
