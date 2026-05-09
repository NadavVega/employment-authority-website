import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './utils/theme';
import { AuthProvider } from './context/auth-context';
import MainLayout from './components/layout/main-layout';
import LandingPage from './pages/landing-page';
import { EventsPage } from './pages/event-page';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {/* We use Router to handle client-side navigation without full page reloads. */}
        <Router>
          <MainLayout>
            <Routes>
              {/* Define the URL paths and which component they should render */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/events" element={<EventsPage />} />
            </Routes>
          </MainLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;