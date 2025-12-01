// scripts/migrateAgreementDates.mjs
import admin from 'firebase-admin';
// The 'fs' module is used to read the JSON file
import { readFileSync } from 'fs';

// Load the service account key
// The 'assert { type: "json" }' is important for ES modules
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

const migrateAgreements = async () => {
    console.log("Starting agreement date migration with Admin SDK...");
    const agreementsCollection = db.collection('agreements');
    
    try {
        const agreementsSnapshot = await agreementsCollection.get();
        let updatedCount = 0;
        
        if (agreementsSnapshot.empty) {
            console.log("No agreements found to migrate.");
            return;
        }

        console.log(`Found ${agreementsSnapshot.docs.length} agreements to check.`);

        const writeBatch = db.batch();
        
        agreementsSnapshot.forEach(docSnapshot => {
            const agreementData = docSnapshot.data();
            const updates = {};
            const dateFields = ['agreementDate', 'startDate', 'endDate'];

            dateFields.forEach(fieldName => {
                const dateValue = agreementData[fieldName];
                if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const dateObject = new Date(dateValue);
                    if (!isNaN(dateObject.getTime())) {
                        updates[fieldName] = admin.firestore.Timestamp.fromDate(dateObject);
                    }
                }
            });

            if (Object.keys(updates).length > 0) {
                console.log(`- Staging update for document ${docSnapshot.id}`);
                const agreementRef = db.collection('agreements').doc(docSnapshot.id);
                writeBatch.update(agreementRef, updates);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            console.log(`\nCommitting ${updatedCount} updates to the database...`);
            await writeBatch.commit();
            console.log(`
Migration complete! Successfully updated ${updatedCount} agreements.`);
        } else {
            console.log("\nMigration complete! No agreements needed updates.");
        }

    } catch (error) {
        console.error("An error occurred during migration:", error);
    }
};

migrateAgreements().then(() => {
    console.log("Script finished.");
}).catch(error => {
    console.error("Script failed to run:", error);
});