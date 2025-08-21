import React from 'react';
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { JobBoard } from './components/JobBoard';
import { LoginPage } from './components/LoginPage';
import { LoadingSpinner } from './components/LoadingSpinner';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <JobBoard />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Analytics />
    </AuthProvider>
  );
}

export default App;
