const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "../../privateKey.json");
const employersFilePath = path.join(
  __dirname,
  "../data/employers-cleaned-for-firestore.json"
);

const isWriteMode = process.argv.includes("--write");
const isDryRun = !isWriteMode;

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing Firebase private key file:");
  console.error(serviceAccountPath);
  process.exit(1);
}

if (!fs.existsSync(employersFilePath)) {
  console.error("Missing employers enrichment JSON file:");
  console.error(employersFilePath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const enrichedEmployers = JSON.parse(
  fs.readFileSync(employersFilePath, "utf8")
);

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const isVisibleValue = (value) => {
  return value !== undefined && value !== null && String(value).trim() !== "";
};

/**
 * Manual company-based mapping.
 *
 * This runs before keyword classification because some rows contain long mixed
 * field text, and a side keyword like IT/tech/banking may cause a wrong match.
 */
const COMPANY_FIELD_OVERRIDES = {
    
    "mobileye": {
    field: "הייטק וטכנולוגיה",
    subField: "תוכנה",
  },
  "cross river": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "בנקאות",
  },
  "cross river technologies": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "בנקאות",
  },
  "elbit systems": {
    field: "הייטק וטכנולוגיה",
    subField: "אלקטרוניקה",
  },
  "shalva": {
    field: "עמותות וחברה",
    subField: "שילוב אוכלוסיות",
  },
  "developers institute": {
    field: "חינוך ואקדמיה",
    subField: "הכשרות",
  },
  "vta centre": {
    field: "חינוך ואקדמיה",
    subField: "הכשרות",
  },
  "gvahim": {
    field: "סיוע תעסוקתי ושירותים קהילתיים",
    subField: "עולים ותושבים חוזרים",
  },
  "nefesh b'nefesh": {
    field: "סיוע תעסוקתי ושירותים קהילתיים",
    subField: "עולים ותושבים חוזרים",
  },
  "israel experience": {
    field: "חינוך ואקדמיה",
    subField: "חינוך",
  },
  "branco weiss": {
    field: "חינוך ואקדמיה",
    subField: "חינוך",
  },
  "amutat lavi": {
    field: "חינוך ואקדמיה",
    subField: "חינוך",
  },
  "wizo": {
    field: "חינוך ואקדמיה",
    subField: "חינוך",
  },

  "leumit": {
    field: "בריאות וביומד",
    subField: "בריאות",
  },
  "kupat holim leumit": {
    field: "בריאות וביומד",
    subField: "בריאות",
  },
  "adi negev nahalat eran": {
    field: "בריאות וביומד",
    subField: "בריאות",
  },
  "adi": {
    field: "בריאות וביומד",
    subField: "בריאות",
  },
  "shalva": {
    field: "עמותות וחברה",
    subField: "שילוב אוכלוסיות",
  },
  "shekel": {
    field: "עמותות וחברה",
    subField: "שילוב אוכלוסיות",
  },
  "israel elwyn": {
    field: "עמותות וחברה",
    subField: "שילוב אוכלוסיות",
  },

  "israel tax authority": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "מיסוי",
  },
  "bank mizrahy": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "בנקאות",
  },
  "bank mizrahi": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "בנקאות",
  },
  "bank of israel": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "פיננסים",
  },
  "ey": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "מיסוי",
  },

  "jerusalem municipality": {
    field: "ממשל ושירות ציבורי",
    subField: "עירייה",
  },
  "municipality employment community centre": {
    field: "סיוע תעסוקתי ושירותים קהילתיים",
    subField: "מבקשי עבודה",
  },
  "israel tax authority": {
    field: "פיננסים, ביטוח ומיסוי",
    subField: "מיסוי",
  },
  "civil service commission": {
    field: "ממשל ושירות ציבורי",
    subField: "שירות ציבורי",
  },
  "police": {
    field: "אבטחה, ניקיון והסעדה",
    subField: "אבטחה",
  },
  "idf": {
    field: "אבטחה, ניקיון והסעדה",
    subField: "אבטחה",
  },
  "shabak": {
    field: "אבטחה, ניקיון והסעדה",
    subField: "אבטחה",
  },

  "isrotel": {
    field: "אירוח, מזון ותיירות",
    subField: "מלונאות",
  },
  "isrotel orient hotel": {
    field: "אירוח, מזון ותיירות",
    subField: "מלונאות",
  },
  "hotel king david": {
    field: "אירוח, מזון ותיירות",
    subField: "מלונאות",
  },
  "dan hotels": {
    field: "אירוח, מזון ותיירות",
    subField: "מלונאות",
  },

  "goopss": {
    field: "שירותים, ייעוץ ומכירות",
    subField: "שיווק",
  },
  "outsourcing to israel": {
    field: "השמה ומשאבי אנוש",
    subField: "השמה",
  },
  "nayot": {
    field: "השמה ומשאבי אנוש",
    subField: "השמה",
  },
  "atid hr": {
    field: "השמה ומשאבי אנוש",
    subField: "השמה",
  },

  "urbanica": {
    field: "מסחר וקמעונאות",
    subField: "קמעונאות",
  },
  "golbary": {
    field: "עיצוב, אופנה ואדריכלות",
    subField: "אופנה",
  },
  "natasha denona": {
    field: "עיצוב, אופנה ואדריכלות",
    subField: "איפור וטיפוח",
  },

  "superbus": {
    field: "ממשל ושירות ציבורי",
    subField: "שירות ציבורי",
  },
  "manufacturers association of israel": {
    field: "תעשייה וייצור",
    subField: "תעשייה",
  },
  "mitkanei psagot": {
    field: "תעשייה וייצור",
    subField: "תעשייה",
  },
  "n.a.s. tech electronics manufacturing systems": {
    field: "הייטק וטכנולוגיה",
    subField: "אלקטרוניקה",
  },
  "geohome": {
    field: "תעשייה וייצור",
    subField: "תעשייה",
  },
};

/**
 * Finds a manual override when the company name appears inside the raw field text
 * or equals the cleaned company name from the enrichment file.
 */
const getCompanyFieldOverride = (companyName, rawField) => {
  const normalizedCompany = normalizeText(companyName);
  const normalizedRawField = normalizeText(rawField);

  for (const [companyKey, classification] of Object.entries(
    COMPANY_FIELD_OVERRIDES
  )) {
    if (
      normalizedCompany === companyKey ||
      normalizedCompany.includes(companyKey) ||
      normalizedRawField.includes(companyKey)
    ) {
      return classification;
    }
  }

  return null;
};

const classifyEmployerField = (rawField, companyName) => {
  const companyOverride = getCompanyFieldOverride(companyName, rawField);

  if (companyOverride) {
    return companyOverride;
  }

  const normalizedField = normalizeText(rawField);

  if (!normalizedField) {
    return {
      field: "",
      subField: "",
    };
  }

  /**
   * Priority mappings:
   * Put specific fields before broad words like tech, IT, service, business.
   */

  if (
    normalizedField.includes("training") ||
    normalizedField.includes("professional training") ||
    normalizedField.includes("הכשרה") ||
    normalizedField.includes("הכשרות")
  ) {
    return {
      field: "חינוך ואקדמיה",
      subField: "הכשרות",
    };
  }

  if (
    normalizedField.includes("education") ||
    normalizedField.includes("teaching") ||
    normalizedField.includes("חינוך") ||
    normalizedField.includes("הוראה")
  ) {
    return {
      field: "חינוך ואקדמיה",
      subField: "חינוך",
    };
  }

  if (
    normalizedField.includes("academy") ||
    normalizedField.includes("academic") ||
    normalizedField.includes("אקדמ")
  ) {
    return {
      field: "חינוך ואקדמיה",
      subField: "אקדמיה",
    };
  }

  if (
    normalizedField.includes("student") ||
    normalizedField.includes("סטודנט")
  ) {
    return {
      field: "חינוך ואקדמיה",
      subField: "סטודנטים",
    };
  }

  if (
    normalizedField.includes("job seekers") ||
    normalizedField.includes("מבקשי עבודה") ||
    normalizedField.includes("קריירה")
  ) {
    return {
      field: "סיוע תעסוקתי ושירותים קהילתיים",
      subField: "מבקשי עבודה",
    };
  }

  if (
    normalizedField.includes("olim") ||
    normalizedField.includes("עולים") ||
    normalizedField.includes("עלייה") ||
    normalizedField.includes("עליה") ||
    normalizedField.includes("תושבים חוזרים")
  ) {
    return {
      field: "סיוע תעסוקתי ושירותים קהילתיים",
      subField: "עולים ותושבים חוזרים",
    };
  }

  if (normalizedField.includes("קליטת מפונים")) {
    return {
      field: "סיוע תעסוקתי ושירותים קהילתיים",
      subField: "קליטת מפונים",
    };
  }

  if (normalizedField.includes("קידום תהליכים")) {
    return {
      field: "סיוע תעסוקתי ושירותים קהילתיים",
      subField: "קידום תהליכים",
    };
  }

  if (
    normalizedField.includes("biomed") ||
    normalizedField.includes("biopharma") ||
    normalizedField.includes("ביומד")
  ) {
    return {
      field: "בריאות וביומד",
      subField: "ביומד",
    };
  }

  if (
    normalizedField.includes("pharma") ||
    normalizedField.includes("פארמה")
  ) {
    return {
      field: "בריאות וביומד",
      subField: "פארמה",
    };
  }

  if (normalizedField.includes("סיעוד")) {
    return {
      field: "בריאות וביומד",
      subField: "סיעוד",
    };
  }

  if (
    normalizedField.includes("medical") ||
    normalizedField.includes("medicine") ||
    normalizedField.includes("health") ||
    normalizedField.includes("mental health") ||
    normalizedField.includes("rehabilitation") ||
    normalizedField.includes("רפואה") ||
    normalizedField.includes("רפוא") ||
    normalizedField.includes("בריאות") ||
    normalizedField.includes("שיקום")
  ) {
    return {
      field: "בריאות וביומד",
      subField: "בריאות",
    };
  }

  if (
    normalizedField.includes("insurance") ||
    normalizedField.includes("ביטוח")
  ) {
    return {
      field: "פיננסים, ביטוח ומיסוי",
      subField: "ביטוח",
    };
  }

  if (
    normalizedField.includes("tax") ||
    normalizedField.includes("מיסוי") ||
    normalizedField.includes("מסים") ||
    normalizedField.includes("מס ")
  ) {
    return {
      field: "פיננסים, ביטוח ומיסוי",
      subField: "מיסוי",
    };
  }

  if (
    normalizedField.includes("accounting") ||
    normalizedField.includes("accountant") ||
    normalizedField.includes("ראיית חשבון") ||
    normalizedField.includes("חשבונ")
  ) {
    return {
      field: "פיננסים, ביטוח ומיסוי",
      subField: "ראיית חשבון",
    };
  }

  if (
    normalizedField.includes("bank") ||
    normalizedField.includes("banking") ||
    normalizedField.includes("בנק")
  ) {
    return {
      field: "פיננסים, ביטוח ומיסוי",
      subField: "בנקאות",
    };
  }

  if (
    normalizedField.includes("finance") ||
    normalizedField.includes("fintech") ||
    normalizedField.includes("פיננס") ||
    normalizedField.includes("כלכלה")
  ) {
    return {
      field: "פיננסים, ביטוח ומיסוי",
      subField: "פיננסים",
    };
  }

  if (
    normalizedField.includes("municipality") ||
    normalizedField.includes("עירייה")
  ) {
    return {
      field: "ממשל ושירות ציבורי",
      subField: "עירייה",
    };
  }

  if (
    normalizedField.includes("government") ||
    normalizedField.includes("gov") ||
    normalizedField.includes("ממשל") ||
    normalizedField.includes("משרד")
  ) {
    return {
      field: "ממשל ושירות ציבורי",
      subField: "ממשלתי",
    };
  }

  if (
    normalizedField.includes("public") ||
    normalizedField.includes("ציבור")
  ) {
    return {
      field: "ממשל ושירות ציבורי",
      subField: "שירות ציבורי",
    };
  }

  if (normalizedField.includes("רשות")) {
    return {
      field: "ממשל ושירות ציבורי",
      subField: "רשות",
    };
  }

  if (
    normalizedField.includes("ngo") ||
    normalizedField.includes("עמותה") ||
    normalizedField.includes("עמותות")
  ) {
    return {
      field: "עמותות וחברה",
      subField: "עמותות",
    };
  }

  if (
    normalizedField.includes("community") ||
    normalizedField.includes("קהילה") ||
    normalizedField.includes("קהיל")
  ) {
    return {
      field: "עמותות וחברה",
      subField: "קהילה",
    };
  }

  if (
    normalizedField.includes("disabilities") ||
    normalizedField.includes("מוגבלות") ||
    normalizedField.includes("שילוב")
  ) {
    return {
      field: "עמותות וחברה",
      subField: "שילוב אוכלוסיות",
    };
  }

  if (
    normalizedField.includes("social") ||
    normalizedField.includes("חברתי") ||
    normalizedField.includes("חברה")
  ) {
    return {
      field: "עמותות וחברה",
      subField: "שירותים חברתיים",
    };
  }

  if (
    normalizedField.includes("marketing") ||
    normalizedField.includes("שיווק")
  ) {
    return {
      field: "שירותים, ייעוץ ומכירות",
      subField: "שיווק",
    };
  }

  if (
    normalizedField.includes("sales") ||
    normalizedField.includes("מכירות")
  ) {
    return {
      field: "שירותים, ייעוץ ומכירות",
      subField: "מכירות",
    };
  }

  if (
    normalizedField.includes("customer service") ||
    normalizedField.includes("שירות לקוחות") ||
    normalizedField.includes("לקוחות")
  ) {
    return {
      field: "שירותים, ייעוץ ומכירות",
      subField: "שירות לקוחות",
    };
  }

  if (
    normalizedField.includes("consulting") ||
    normalizedField.includes("consultants") ||
    normalizedField.includes("ייעוץ") ||
    normalizedField.includes("יעוץ")
  ) {
    return {
      field: "שירותים, ייעוץ ומכירות",
      subField: "ייעוץ",
    };
  }

  if (
    normalizedField.includes("business") ||
    normalizedField.includes("עסק")
  ) {
    return {
      field: "שירותים, ייעוץ ומכירות",
      subField: "שירותים עסקיים",
    };
  }

  if (
    normalizedField.includes("placement") ||
    normalizedField.includes("השמה") ||
    normalizedField.includes("השמות")
  ) {
    return {
      field: "השמה ומשאבי אנוש",
      subField: "השמה",
    };
  }

  if (
    normalizedField.includes("recruitment") ||
    normalizedField.includes("גיוס") ||
    normalizedField.includes("גיוסים")
  ) {
    return {
      field: "השמה ומשאבי אנוש",
      subField: "גיוס",
    };
  }

  if (
    normalizedField.includes("hr") ||
    normalizedField.includes("human resources") ||
    normalizedField.includes("משאבי אנוש") ||
    normalizedField.includes("כוח אדם") ||
    normalizedField.includes("כח אדם")
  ) {
    return {
      field: "השמה ומשאבי אנוש",
      subField: "משאבי אנוש",
    };
  }

  if (normalizedField.includes("תעסוקה")) {
    return {
      field: "השמה ומשאבי אנוש",
      subField: "תעסוקה",
    };
  }

  if (
    normalizedField.includes("restaurant") ||
    normalizedField.includes("מסעד") ||
    normalizedField.includes("דיינר")
  ) {
    return {
      field: "אירוח, מזון ותיירות",
      subField: "מסעדנות",
    };
  }

  if (
    normalizedField.includes("food") ||
    normalizedField.includes("מזון")
  ) {
    return {
      field: "אירוח, מזון ותיירות",
      subField: "מזון",
    };
  }

  if (normalizedField.includes("משקאות")) {
    return {
      field: "אירוח, מזון ותיירות",
      subField: "משקאות",
    };
  }

  if (
    normalizedField.includes("hotel") ||
    normalizedField.includes("hotels") ||
    normalizedField.includes("hospitality") ||
    normalizedField.includes("מלון") ||
    normalizedField.includes("מלונאות")
  ) {
    return {
      field: "אירוח, מזון ותיירות",
      subField: "מלונאות",
    };
  }

  if (
    normalizedField.includes("tourism") ||
    normalizedField.includes("tour") ||
    normalizedField.includes("תיירות")
  ) {
    return {
      field: "אירוח, מזון ותיירות",
      subField: "תיירות",
    };
  }

  if (
    normalizedField.includes("retail") ||
    normalizedField.includes("קמעונ")
  ) {
    return {
      field: "מסחר וקמעונאות",
      subField: "קמעונאות",
    };
  }

  if (
    normalizedField.includes("store") ||
    normalizedField.includes("shop") ||
    normalizedField.includes("חנות") ||
    normalizedField.includes("חנויות")
  ) {
    return {
      field: "מסחר וקמעונאות",
      subField: "חנויות",
    };
  }

  if (
    normalizedField.includes("commerce") ||
    normalizedField.includes("trade") ||
    normalizedField.includes("מסחר")
  ) {
    return {
      field: "מסחר וקמעונאות",
      subField: "מסחר",
    };
  }

  if (
    normalizedField.includes("network") ||
    normalizedField.includes("רשת") ||
    normalizedField.includes("רשתות")
  ) {
    return {
      field: "מסחר וקמעונאות",
      subField: "רשתות",
    };
  }

  if (normalizedField.includes("מוצרי נייר")) {
    return {
      field: "מסחר וקמעונאות",
      subField: "מוצרי נייר",
    };
  }

  if (
    normalizedField.includes("factory") ||
    normalizedField.includes("מפעל")
  ) {
    return {
      field: "תעשייה וייצור",
      subField: "מפעלים",
    };
  }

  if (
    normalizedField.includes("filter") ||
    normalizedField.includes("מסננים")
  ) {
    return {
      field: "תעשייה וייצור",
      subField: "ייצור מסננים",
    };
  }

  if (
    normalizedField.includes("manufacturing") ||
    normalizedField.includes("production") ||
    normalizedField.includes("ייצור")
  ) {
    return {
      field: "תעשייה וייצור",
      subField: "ייצור",
    };
  }

  if (
    normalizedField.includes("industry") ||
    normalizedField.includes("industrial") ||
    normalizedField.includes("תעשייה") ||
    normalizedField.includes("תעש")
  ) {
    return {
      field: "תעשייה וייצור",
      subField: "תעשייה",
    };
  }

  if (
    normalizedField.includes("fashion") ||
    normalizedField.includes("אופנה")
  ) {
    return {
      field: "עיצוב, אופנה ואדריכלות",
      subField: "אופנה",
    };
  }

  if (
    normalizedField.includes("makeup") ||
    normalizedField.includes("beauty") ||
    normalizedField.includes("cosmetics") ||
    normalizedField.includes("איפור") ||
    normalizedField.includes("יופי") ||
    normalizedField.includes("טיפוח") ||
    normalizedField.includes("קוסמטיקה")
  ) {
    return {
      field: "עיצוב, אופנה ואדריכלות",
      subField: "איפור וטיפוח",
    };
  }

  if (normalizedField.includes("עיצוב מוצר")) {
    return {
      field: "עיצוב, אופנה ואדריכלות",
      subField: "עיצוב מוצר",
    };
  }

  if (
    normalizedField.includes("architecture") ||
    normalizedField.includes("design") ||
    normalizedField.includes("אדריכלות") ||
    normalizedField.includes("עיצוב")
  ) {
    return {
      field: "עיצוב, אופנה ואדריכלות",
      subField: "אדריכלות ועיצוב",
    };
  }

  if (
    normalizedField.includes("security") ||
    normalizedField.includes("אבטחה") ||
    normalizedField.includes("ביטחון")
  ) {
    return {
      field: "אבטחה, ניקיון והסעדה",
      subField: "אבטחה",
    };
  }

  if (
    normalizedField.includes("guard") ||
    normalizedField.includes("שומר") ||
    normalizedField.includes("שמירה")
  ) {
    return {
      field: "אבטחה, ניקיון והסעדה",
      subField: "שמירה",
    };
  }

  if (
    normalizedField.includes("cleaning") ||
    normalizedField.includes("ניקיון") ||
    normalizedField.includes("נקיון")
  ) {
    return {
      field: "אבטחה, ניקיון והסעדה",
      subField: "ניקיון",
    };
  }

  if (normalizedField.includes("הסעדה")) {
    return {
      field: "אבטחה, ניקיון והסעדה",
      subField: "הסעדה",
    };
  }

  if (
    normalizedField.includes("cyber") ||
    normalizedField.includes("סייבר")
  ) {
    return {
      field: "הייטק וטכנולוגיה",
      subField: "סייבר",
    };
  }

  if (
    normalizedField.includes("it") ||
    normalizedField.includes("מחשוב")
  ) {
    return {
      field: "הייטק וטכנולוגיה",
      subField: "IT ומחשוב",
    };
  }

  if (
    normalizedField.includes("digital") ||
    normalizedField.includes("דיגיטל")
  ) {
    return {
      field: "הייטק וטכנולוגיה",
      subField: "דיגיטל",
    };
  }

  if (
    normalizedField.includes("electronics") ||
    normalizedField.includes("electronic") ||
    normalizedField.includes("אלקטרוניקה")
  ) {
    return {
      field: "הייטק וטכנולוגיה",
      subField: "אלקטרוניקה",
    };
  }

  if (
    normalizedField.includes("software") ||
    normalizedField.includes("תוכנה") ||
    normalizedField.includes("high tech") ||
    normalizedField.includes("hi-tech") ||
    normalizedField.includes("hitech") ||
    normalizedField.includes("הייטק") ||
    normalizedField.includes("tech")
  ) {
    return {
      field: "הייטק וטכנולוגיה",
      subField: "תוכנה",
    };
  }

  return {
    field: "אחר",
    subField: "לא מסווג",
  };
};

const buildProfileUpdates = (enrichedEmployer, currentProfile = {}) => {
  const updates = {};

  if (isVisibleValue(enrichedEmployer.address)) {
    updates.address = enrichedEmployer.address;
  }

  if (isVisibleValue(enrichedEmployer.field)) {
    const classifiedField = classifyEmployerField(
      enrichedEmployer.field,
      enrichedEmployer.company
    );

    if (
      isVisibleValue(classifiedField.field) &&
      classifiedField.field !== "אחר"
    ) {
      updates.field = classifiedField.field;
    }

    if (
      isVisibleValue(classifiedField.subField) &&
      classifiedField.subField !== "לא מסווג"
    ) {
      updates.subField = classifiedField.subField;
    }
  }

  if (isVisibleValue(enrichedEmployer.jobsUrl)) {
    updates.jobsUrl = enrichedEmployer.jobsUrl;
  }

  if (
    isVisibleValue(enrichedEmployer.status) &&
    !isVisibleValue(currentProfile.status)
  ) {
    updates.status = enrichedEmployer.status;
  }

  if (
    isVisibleValue(enrichedEmployer.companyId) &&
    !isVisibleValue(currentProfile.companyId)
  ) {
    updates.companyId = enrichedEmployer.companyId;
  }

  if (
    isVisibleValue(enrichedEmployer.logoUrl) &&
    !isVisibleValue(currentProfile.logoUrl)
  ) {
    updates.logoUrl = enrichedEmployer.logoUrl;
  }

  if (
    isVisibleValue(enrichedEmployer.companyDescription) &&
    !isVisibleValue(currentProfile.companyDescription)
  ) {
    updates.companyDescription = enrichedEmployer.companyDescription;
  }

  if (
    isVisibleValue(enrichedEmployer.lastContactNote) &&
    !isVisibleValue(currentProfile.lastContactNote)
  ) {
    updates.lastContactNote = enrichedEmployer.lastContactNote;
  }

  if (
    isVisibleValue(enrichedEmployer.lastContactDate) &&
    !isVisibleValue(currentProfile.lastContactDate)
  ) {
    updates.lastContactDate = enrichedEmployer.lastContactDate;
  }

  return updates;
};

async function enrichExistingEmployers() {
  console.log("Starting employers enrichment...");
  console.log(
    isDryRun
      ? "Mode: DRY RUN - no data will be written."
      : "Mode: WRITE - Firestore will be updated."
  );
  console.log(`Loaded enrichment records: ${enrichedEmployers.length}`);

  const usersSnapshot = await db.collection("users").get();

  const companyToUsersMap = new Map();

  usersSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const profile = data.profile || {};
    const company = profile.company || data.company || "";

    if (data.role !== "employer") {
      return;
    }

    const normalizedCompany = normalizeText(company);

    if (!normalizedCompany) {
      return;
    }

    if (!companyToUsersMap.has(normalizedCompany)) {
      companyToUsersMap.set(normalizedCompany, []);
    }

    companyToUsersMap.get(normalizedCompany).push({
      id: docSnap.id,
      ref: docSnap.ref,
      data,
      profile,
      company,
    });
  });

  let updatedCount = 0;
  let dryRunUpdateCount = 0;
  let skippedNoCompanyCount = 0;
  let skippedNoMatchCount = 0;
  let skippedMultipleMatchesCount = 0;
  let skippedNoUpdatesCount = 0;

  for (const enrichedEmployer of enrichedEmployers) {
    const company = enrichedEmployer.company;
    const normalizedCompany = normalizeText(company);

    if (!normalizedCompany) {
      console.warn("Skipping enrichment record without company:", enrichedEmployer);
      skippedNoCompanyCount++;
      continue;
    }

    const matchingUsers = companyToUsersMap.get(normalizedCompany) || [];

    if (matchingUsers.length === 0) {
      console.log(`No matching existing employer found for: ${company}`);
      skippedNoMatchCount++;
      continue;
    }

    if (matchingUsers.length > 1) {
      console.warn(
        `Skipping company with multiple matching users: ${company}`,
        matchingUsers.map((user) => user.id)
      );
      skippedMultipleMatchesCount++;
      continue;
    }

    const matchedUser = matchingUsers[0];
    const profileUpdates = buildProfileUpdates(
      enrichedEmployer,
      matchedUser.profile
    );

    const updateKeys = Object.keys(profileUpdates);

    if (updateKeys.length === 0) {
      console.log(`No relevant updates for: ${company} (${matchedUser.id})`);
      skippedNoUpdatesCount++;
      continue;
    }

    const updatePayload = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    updateKeys.forEach((key) => {
      updatePayload[`profile.${key}`] = profileUpdates[key];
    });

    if (isDryRun) {
      console.log(`[DRY RUN] Would update ${matchedUser.id}:`, profileUpdates);
      dryRunUpdateCount++;
      continue;
    }

    try {
      await matchedUser.ref.update(updatePayload);
      console.log(`Updated ${matchedUser.id}:`, profileUpdates);
      updatedCount++;
    } catch (error) {
      console.error(`Failed to update ${matchedUser.id}:`, error.message);
    }
  }

  console.log("Enrichment finished.");
  console.log(`Dry-run updates: ${dryRunUpdateCount}`);
  console.log(`Updated users: ${updatedCount}`);
  console.log(`Skipped without company: ${skippedNoCompanyCount}`);
  console.log(`Skipped no match: ${skippedNoMatchCount}`);
  console.log(`Skipped multiple matches: ${skippedMultipleMatchesCount}`);
  console.log(`Skipped no relevant updates: ${skippedNoUpdatesCount}`);
}

enrichExistingEmployers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Enrichment failed:", error);
    process.exit(1);
  });