
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('/home/ashwin/React Basics/trial_bench/serviceAccountKey.json');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrateCompanyNames() {
  console.log('Starting migration of company names for all members with empty company field...');

  const membersRef = db.collection('members');
  const snapshot = await membersRef.get(); // Get all members

  if (snapshot.empty) {
    console.log('No members found in the collection.');
    return;
  }

  const batchArray = [];
  let batch = db.batch();
  let operationCounter = 0;

  snapshot.docs.forEach((doc) => {
    const member = doc.data();
    // Check if the company field is empty, null, or undefined
    if (!member.company) {
      batch.update(doc.ref, { company: 'N/A' });
      operationCounter++;
      if (operationCounter > 0 && operationCounter % 500 === 0) {
        batchArray.push(batch);
        batch = db.batch();
      }
    }
  });

  if (operationCounter > 0) {
    batchArray.push(batch);
  }

  if (batchArray.length === 0) {
    console.log('All members found already have a value in the company field or it is already "N/A".');
    return;
  }

  console.log(`Found ${snapshot.size} members. Updating ${operationCounter} of them with an empty company field.`);

  for (let i = 0; i < batchArray.length; i++) {
    try {
      await batchArray[i].commit();
      console.log(`Batch ${i + 1} of ${batchArray.length} committed successfully.`);
    } catch (error) {
      console.error(`Error committing batch ${i + 1}:`, error);
    }
  }

  console.log('Migration completed successfully.');
}

migrateCompanyNames().catch(console.error);
