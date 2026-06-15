import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './utils/theme';
import { AuthProvider, useAuth } from './context/auth-context';
import MainLayout from './components/layout/main-layout';
import DirectoryPage from './pages/directory-page';
import EmployerProfilePage from './pages/employer-profile-page';
import EmployerContactFormPage from './pages/employer-contact-form-page';
import PrivacyRequestsPage from './pages/privacy-requests-page';

// Import design files
import './design/global-theme.css';

// Importing page components
import LoginPage from './pages/login-page';
import { EventsPage } from './pages/event-page';
import HomePage from './pages/home-page';
import AddEventPage from './pages/add-event-page';
import { EditEventPage } from './pages/edit-event-page';
import ContentManagementPage from './pages/content-management-page';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

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
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <HomePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EventsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/add-event"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AddEventPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/content-management"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ContentManagementPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/directory"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DirectoryPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/directory/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EmployerContactFormPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/directory/:employerId"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EmployerProfilePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/directory/:employerId/edit"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EmployerContactFormPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/privacy-requests"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PrivacyRequestsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/edit-event/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EditEventPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;