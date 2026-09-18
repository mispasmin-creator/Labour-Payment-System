import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { PaymentReportPage } from './pages/PaymentReportPage';
import { WorkTrackerPage } from './pages/WorkTrackerPage';
import { ReportsPage } from './pages/ReportsPage';
import { InchargeWiseReportPage } from './pages/InchargeWiseReportPage';
import { LoginPage } from './pages/LoginPage';
import { AdministrationPage } from './pages/AdministrationPage';
import { ProductionPage } from './pages/ProductionPage';

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
        <Route path="new-entry" element={<Navigate to="/" replace />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="payment-report" element={<PaymentReportPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="approval" element={<Navigate to="/payment-report" replace />} />
        <Route path="payment" element={<Navigate to="/payment-report" replace />} />
        <Route path="tally" element={<Navigate to="/payment-report" replace />} />
        <Route path="tracker" element={<WorkTrackerPage />} />
        <Route path="reports" element={<Navigate to="/payment-report" replace />} />
        <Route path="reports/*" element={<Navigate to="/payment-report" replace />} />
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
