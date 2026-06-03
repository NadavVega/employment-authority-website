const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "../../privateKey.json");
const coordinatorsFilePath = path.join(
  __dirname,
  "../data/coordinators_import.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing Firebase private key file:");
  console.error(serviceAccountPath);
  process.exit(1);
}

if (!fs.existsSync(coordinatorsFilePath)) {
  console.error("Missing coordinators import JSON file:");
  console.error(coordinatorsFilePath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const coordinators = JSON.parse(fs.readFileSync(coordinatorsFilePath, "utf8"));

const normalizeValue = (value) => String(value || "").trim();

const normalizeEmail = (value) => normalizeValue(value).toLowerCase();

async function importCoordinators() {
  console.log(`Starting import of ${coordinators.length} coordinators...`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const coordinator of coordinators) {
    const email = normalizeEmail(coordinator.email || coordinator.documentId);

    if (!email) {
      console.warn("Skipping coordinator without email:", coordinator);
      skippedCount++;
      continue;
    }

    const role = coordinator.role || "coordinator";

    const coordinatorDoc = {
      email,
      role,
      isWhitelisted: coordinator.isWhitelisted !== false,
      profile: {
        fullName: normalizeValue(coordinator.profile?.fullName),
        centerName: normalizeValue(coordinator.profile?.centerName),
        population: normalizeValue(coordinator.profile?.population),
        field: normalizeValue(coordinator.profile?.field),
        phone: normalizeValue(coordinator.profile?.phone),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("users").doc(email).set(coordinatorDoc, {
        merge: true,
      });

      console.log(`Imported coordinator: ${email}`);
      importedCount++;
    } catch (error) {
      console.error(`Failed to import ${email}:`, error.message);
      skippedCount++;
    }
  }

  console.log("Coordinator import finished.");
  console.log(`Imported: ${importedCount}`);
  console.log(`Skipped/failed: ${skippedCount}`);
}

importCoordinators()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });