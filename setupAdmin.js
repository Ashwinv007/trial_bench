// This is a one-time use script to create the first admin user.
const admin = require('firebase-admin');

// --- PLEASE EDIT THE EMAIL BELOW ---
const emailToMakeAdmin = "admin2@tb.com";
// ---

// --- INSTRUCTIONS ---
// 1. Go to your Firebase Project Settings > Service accounts.
// 2. Click "Generate new private key" and save the downloaded JSON file.
// 3. Rename the file to "serviceAccountKey.json" and place it in your project's root directory.
// 4. IMPORTANT: Add "serviceAccountKey.json" to your .gitignore file to keep it private.
// 5. Run this script from your terminal: node setupAdmin.js
// 6. Delete the serviceAccountKey.json file after use if you wish.

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("Error: Could not initialize Firebase Admin SDK. Make sure 'serviceAccountKey.json' exists and is valid.");
  process.exit(1);
}


async function setFirstAdmin() {
  if (emailToMakeAdmin === "change-me@example.com") {
    console.error("Error: Please edit the 'emailToMakeAdmin' variable in this script before running.");
    process.exit(1);
  }

  try {
    const user = await admin.auth().getUserByEmail(emailToMakeAdmin);
    // This sets the { all: true } custom claim, which our rules use to identify an admin.
    await admin.auth().setCustomUserClaims(user.uid, { all: true });
    console.log(`✅ Success! ${emailToMakeAdmin} has been granted full admin privileges.`);
    console.log("You can now proceed to the next step in the Gemini CLI.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting admin claim:", error.message);
    console.log("Please ensure the email address is correct and the user exists in Firebase Authentication.");
    process.exit(1);
  }
}

setFirstAdmin();
