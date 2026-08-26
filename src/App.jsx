import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { NewEntryPage } from './pages/NewEntryPage';
import { VerificationPage } from './pages/VerificationPage';
import { PaymentApprovalPage } from './pages/PaymentApprovalPage';
import { PaymentPage } from './pages/PaymentPage';
import { TallyPage } from './pages/TallyPage';
import { WorkTrackerPage } from './pages/WorkTrackerPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { AdministrationPage } from './pages/AdministrationPage';

function ProtectedRoute({ children }) {
  const { currentUser } = useApp();
  if (!currentUser || !currentUser.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="new-entry" element={<NewEntryPage />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="approval" element={<PaymentApprovalPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="tally" element={<TallyPage />} />
        <Route path="tracker" element={<WorkTrackerPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdministrationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
