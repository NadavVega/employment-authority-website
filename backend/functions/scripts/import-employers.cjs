const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "../../privateKey.json");
const employersFilePath = path.join(__dirname, "../data/employers_users_import.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing Firebase private key file:");
  console.error(serviceAccountPath);
  process.exit(1);
}

if (!fs.existsSync(employersFilePath)) {
  console.error("Missing employers import JSON file:");
  console.error(employersFilePath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const employers = JSON.parse(fs.readFileSync(employersFilePath, "utf8"));

async function importEmployers() {
  console.log(`Starting import of ${employers.length} employers...`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const employer of employers) {
    const documentId = employer.documentId || employer.email;

    if (!documentId) {
      console.warn("Skipping employer without documentId/email:", employer);
      skippedCount++;
      continue;
    }

    const normalizedEmail = documentId.toLowerCase().trim();

    const userDoc = {
      email: normalizedEmail,
      role: "employer",
      isWhitelisted: true,
      profile: {
        company: employer.profile?.company || "",
        address: employer.profile?.address || "",
        field: employer.profile?.field || "",
        fullName: employer.profile?.fullName || "",
        position: employer.profile?.position || "",
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("users").doc(normalizedEmail).set(userDoc, { merge: true });
      console.log(`Imported: ${normalizedEmail}`);
      importedCount++;
    } catch (error) {
      console.error(`Failed to import ${normalizedEmail}:`, error.message);
      skippedCount++;
    }
  }

  console.log("Import finished.");
  console.log(`Imported: ${importedCount}`);
  console.log(`Skipped/failed: ${skippedCount}`);
}

importEmployers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });