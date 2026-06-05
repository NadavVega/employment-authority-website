const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const excelFilePath = path.join(__dirname, "../data/employers.xlsx");
const outputJsonPath = path.join(
  __dirname,
  "../data/employers_users_import.json"
);

if (!fs.existsSync(excelFilePath)) {
  console.error("Missing Excel file:");
  console.error(excelFilePath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelFilePath);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

const rows = XLSX.utils.sheet_to_json(worksheet, {
  defval: "",
  raw: false,
});

const normalizeValue = (value) => String(value || "").trim();

const normalizeEmail = (value) => normalizeValue(value).toLowerCase();

const normalizePhone = (value) => {
  const raw = normalizeValue(value);

  if (!raw) {
    return "";
  }

  let phone = raw
    .replace(/[^\d+]/g, "")
    .replace(/^\+972/, "0")
    .replace(/^972/, "0");

  if (!phone) {
    return "";
  }

  if (phone.startsWith("0")) {
    return phone;
  }

  // Israeli mobile/landline numbers often become 9 digits after Excel removes the leading zero.
  // Example: 545671342 -> 0545671342
  if (phone.length === 9) {
    return `0${phone}`;
  }

  return phone;
};

const getFirstValue = (row, possibleColumnNames) => {
  for (const columnName of possibleColumnNames) {
    if (
      row[columnName] !== undefined &&
      normalizeValue(row[columnName]) !== ""
    ) {
      return normalizeValue(row[columnName]);
    }
  }

  return "";
};

const employers = [];
const skippedRows = [];
const seenEmails = new Set();

rows.forEach((row, index) => {
  const rowNumber = index + 2;

  const company = getFirstValue(row, [
    "שם החברה",
  ]);

  // We intentionally do not use this field as the main company name,
  // but keep support for it as fallback if the Hebrew company name is missing.
  const englishCompany = getFirstValue(row, [
    "שם החברה באנגלית",
  ]);

  const field = getFirstValue(row, [
    "תחום העיסוק של החברה",
  ]);

  const address = getFirstValue(row, [
    "כתובת\\מיקום החברה",
    "כתובת/מיקום החברה",
  ]);

  const fullName = getFirstValue(row, [
    "שם איש\\ת קשר בחברה",
    "שם איש/ת קשר בחברה",
  ]);

  const position = getFirstValue(row, [
    "תפקיד בחברה",
  ]);

  const rawPhone = getFirstValue(row, [
    "מספר טלפון (נייד) של איש\\ת הקשר",
    "מספר טלפון (נייד) של איש/ת הקשר",
  ]);

  const phone = normalizePhone(rawPhone);

  const email = normalizeEmail(
    getFirstValue(row, [
      "כתובת דוא\"ל של איש\\ת הקשר בחברה",
      "כתובת דוא\"ל של איש/ת הקשר בחברה",
    ])
  );

  const neededFields = getFirstValue(row, [
    "תחומים בהם יש צורך בעובדים",
  ]);

  const notes = getFirstValue(row, [
    "הערות",
  ]);

  if (!email) {
    skippedRows.push({
      rowNumber,
      reason: "Missing email",
      row,
    });
    return;
  }

  if (seenEmails.has(email)) {
    skippedRows.push({
      rowNumber,
      reason: "Duplicate email",
      email,
      row,
    });
    return;
  }

  seenEmails.add(email);

  employers.push({
    documentId: email,
    email,
    role: "employer",
    isWhitelisted: true,

    privateInfo: {
      phone,
      directEmail: email,
      approved_viewers: [],
    },

    profile: {
      company: company || englishCompany,
      address,
      field,
      fullName,
      position,
      neededFields,
      notes,
    },
  });
});

fs.writeFileSync(outputJsonPath, JSON.stringify(employers, null, 2), "utf8");

const skippedReportPath = path.join(
  __dirname,
  "../data/employers_users_import_skipped_report.json"
);

fs.writeFileSync(
  skippedReportPath,
  JSON.stringify(skippedRows, null, 2),
  "utf8"
);

console.log("Excel conversion finished.");
console.log(`Sheet used: ${firstSheetName}`);
console.log(`Total rows read: ${rows.length}`);
console.log(`Employers exported: ${employers.length}`);
console.log(`Rows skipped: ${skippedRows.length}`);
console.log(`Output JSON: ${outputJsonPath}`);
console.log(`Skipped report: ${skippedReportPath}`);