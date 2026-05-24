import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './utils/theme';
import { AuthProvider, useAuth } from './context/auth-context';
import MainLayout from './components/layout/main-layout';

//import design files
import './design/global-theme.css';
import './design/event-page-design.css';

// Importing page components
import LoginPage from './pages/login-page';
import { EventsPage } from './pages/event-page';
import HomePage from './pages/home-page';
import AddEventPage from './pages/add-event-page'; 

/**
 * ProtectedRoute Guard Component
 * Enforces authentication by redirecting unauthenticated users to the login root.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          {/* Removed the global MainLayout wrapper to prevent rendering layout on the login page */}
          <Routes>
            <Route path="/" element={<LoginPage />} />

            {/* Authenticated routes wrapped individually in MainLayout and ProtectedRoute */}
            <Route path="/home" element={
              <ProtectedRoute>
                <MainLayout>
                  <HomePage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/events" element={
              <ProtectedRoute>
                <MainLayout>
                  <EventsPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/add-event" element={
              <ProtectedRoute>
                <MainLayout>
                  <AddEventPage />
                </MainLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;