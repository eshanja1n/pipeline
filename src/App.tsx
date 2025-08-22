import React, { useState } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { JobBoard } from './components/JobBoard';
import { LoginPage } from './components/LoginPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';

type Page = 'app' | 'privacy' | 'terms';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('app');

  if (loading) {
    return <LoadingSpinner />;
  }

  // Handle legal pages navigation
  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => setCurrentPage('app')} />;
  }

  if (currentPage === 'terms') {
    return <TermsOfService onBack={() => setCurrentPage('app')} />;
  }

  if (!user) {
    return <LoginPage onNavigate={setCurrentPage} />;
  }

  return <JobBoard onNavigate={setCurrentPage} />;
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
