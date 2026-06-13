import { getEventCenterName } from './centerIcons';

export const CENTER_COLORS = {
  'מרכז הזדמנות': '#00897B',
  'מרכז כיוון': '#D81B60',
  'מרכז פיתוח קריירה לאקדמאים': '#F4511E',
  'מרכז ריאן': '#D7A514',
  'מרכז ותיקים בעבודה': '#7B1FA2',
  'קעליטה': '#1565C0',
  'תוכניות לעולים': '#E53935',
  'מרכז הקריירה האוניברסיטה העיברית': '#880E4F',
  'coordinators-only': '#003B8B',
};

export const getEventColor = (event) => {
  const centerName = getEventCenterName(event);
  return CENTER_COLORS[centerName] || '#64748B';
};
