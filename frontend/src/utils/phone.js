export const ISRAELI_PHONE_VALIDATION_ERROR =
  "יש להזין מספר טלפון ישראלי תקין (לדוגמה: 0501234567).";

const ISRAELI_PHONE_PATTERNS = [
  /^05\d{8}$/,
  /^(?:02|03|04|08|09)\d{7}$/,
  /^07\d{8}$/,
];

/**
 * Converts common Israeli phone formats to a local digits-only value.
 * International 972 prefixes are replaced with the leading local zero.
 */
export const normalizeIsraeliPhone = (value) => {
  let phone = String(value || "")
    .trim()
    .replace(/[\s()-]/g, "");

  if (phone.startsWith("+972")) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("972")) {
    phone = `0${phone.slice(3)}`;
  }

  if (!/^\d+$/.test(phone)) return null;

  return ISRAELI_PHONE_PATTERNS.some((pattern) => pattern.test(phone))
    ? phone
    : null;
};
