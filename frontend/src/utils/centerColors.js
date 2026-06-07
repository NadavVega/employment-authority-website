// src/utils/centerColors.js

export const CENTER_COLORS = {
  'מרכז הזדמנות':                          '#00897B',  // Teal
  'מרכז כיוון':                             '#D81B60',  // Magenta
  'מרכז פיתוח קריירה לאקדמאים':            '#F4511E',  // Orange
  'מרכז ריאן':                              '#F6BF26',  // Yellow
  'מרכז ותיקים בעבודה':                     '#7B1FA2',  // Deep purple
  'קעליטה':                                 '#1565C0',  // Royal blue
  'תוכניות לעולים':                         '#E53935',  // Red
  'מרכז הקריירה באוניברסיטה העיברית':      '#880E4F',  // Burgundy
};

// For coordinator/manager-only events — cycles by index, no red
export const RAINBOW_COLORS = [
  '#00897B', // teal
  '#F4511E', // orange
  '#F6BF26', // yellow
  '#1565C0', // royal blue
  '#7B1FA2', // purple
  '#039BE5', // sky blue
];

// Helper: given an event and its index, return its color
export const getEventColor = (event, index = 0) => {
  if (event.center && CENTER_COLORS[event.center]) {
    return CENTER_COLORS[event.center];
  }
  if (event.center === 'coordinators-only') {
    return RAINBOW_COLORS[index % RAINBOW_COLORS.length];
  }
  return '#003b8b'; // fallback: default primary dark
};