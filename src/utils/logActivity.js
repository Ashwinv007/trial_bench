import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logActivity = async (db, user, action, message, details = {}) => {
  if (!db || !user) return;
  try {
    await addDoc(collection(db, 'logs'), {
      timestamp: serverTimestamp(),
      user: {
        uid: user.uid,
        displayName: user.displayName,
      },
      action,
      message,
      details,
    });
  } catch (error) {
    console.error("Error writing to log:", error);
  }
};
