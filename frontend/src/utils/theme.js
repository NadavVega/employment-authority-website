import { createTheme } from '@mui/material/styles';

/**
 * Jerusalem Employment Authority Custom Theme.
 * Municipal blue is used for primary actions; gold remains an accent color.
 */
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#003b8b',
      light: '#e6eef8',
      dark: '#002b66',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c99a2e',
      dark: '#ad7f1f',
      contrastText: '#1f2933',
    },
    background: {
      default: '#f7f7f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2933',
      secondary: '#6b7280',
    },
    divider: '#d8d8d2',
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(31, 41, 51, 0.08)',
    '0 2px 6px rgba(31, 41, 51, 0.09)',
    '0 4px 12px rgba(31, 41, 51, 0.10)',
    ...Array(21).fill('0 6px 18px rgba(31, 41, 51, 0.12)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 700,
          boxShadow: 'none',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#002b66',
            boxShadow: '0 2px 6px rgba(31, 41, 51, 0.12)',
          },
          '&:focus-visible': {
            outline: '3px solid rgba(0, 59, 139, 0.3)',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 0,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h5: { fontSize: '1.35rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontSize: '0.875rem' },
  },
});

export default theme;
