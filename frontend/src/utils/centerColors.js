import { getEventCenterName } from './centerIcons';

export const CENTER_COLORS = {
  'מרכז הזדמנות': '#00897B',
  'מרכז כיוון': '#ad0045',
  'מרכז פיתוח קריירה לאקדמאים': '#bb2c00',
  'מרכז ריאן': '#967102',
  'מרכז ותיקים בעבודה': '#37014e',
  'קעליטה': '#1565C0',
  'תוכניות לעולים': '#cd0300cf',
  'מרכז הקריירה האוניברסיטה העיברית': '#642a49',
  'coordinators-only': '#013175',
};

export const getEventColor = (event) => {
  const centerName = getEventCenterName(event);
  return CENTER_COLORS[centerName] || '#64748B';
};
