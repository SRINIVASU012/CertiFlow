import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';

// Public & Auth Pages
import Login from './pages/auth/Login';
import Unauthorized from './pages/auth/Unauthorized';
import NotFound from './pages/auth/NotFound';
import CertificateVerification from './pages/public/CertificateVerification';
import VerificationResult from './pages/public/VerificationResult';

// Training Centre Pages
import CentreDashboard from './pages/centre/CentreDashboard';
import CreateBatch from './pages/centre/CreateBatch';
import UploadCandidates from './pages/centre/UploadCandidates';
import BatchList from './pages/centre/BatchList';
import BatchDetails from './pages/centre/BatchDetails';
import ReturnedBatches from './pages/centre/ReturnedBatches';
import CertificateList from './pages/centre/CertificateList';

// District Officer Pages
import DistrictDashboard from './pages/district/DistrictDashboard';
import PendingBatches from './pages/district/PendingBatches';
import DistrictBatchReview from './pages/district/DistrictBatchReview';
import ApprovalHistory from './pages/district/ApprovalHistory';

// Quality Team Pages
import QualityDashboard from './pages/quality/QualityDashboard';
import QualityPendingBatches from './pages/quality/QualityPendingBatches';
import QualityBatchDetails from './pages/quality/QualityBatchDetails';
import QualityReviewHistory from './pages/quality/QualityReviewHistory';

// State Office Pages
import StateDashboard from './pages/state/StateDashboard';
import PendingFinalApprovals from './pages/state/PendingFinalApprovals';
import AllBatches from './pages/state/AllBatches';
import CertificateManagement from './pages/state/CertificateManagement';
import DelayedBatches from './pages/state/DelayedBatches';
import AuditLogs from './pages/state/AuditLogs';

// Helper component for landing page redirect
const HomeRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/verify" replace />;

  if (user.role === 'TRAINING_CENTRE') return <Navigate to="/centre/dashboard" replace />;
  if (user.role === 'DISTRICT_OFFICER') return <Navigate to="/district/dashboard" replace />;
  if (user.role === 'QUALITY_TEAM') return <Navigate to="/quality/dashboard" replace />;
  if (user.role === 'STATE_OFFICE') return <Navigate to="/state/dashboard" replace />;
  return <Navigate to="/verify" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Root & Public Routes */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/verify" element={<CertificateVerification />} />
            <Route path="/verify/:certificateNumber" element={<VerificationResult />} />

            {/* Authenticated Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Training Centre Portal */}
              <Route element={<RoleBasedRoute allowedRoles={['TRAINING_CENTRE']} />}>
                <Route path="/centre/dashboard" element={<DashboardLayout><CentreDashboard /></DashboardLayout>} />
                <Route path="/centre/batches" element={<DashboardLayout><BatchList /></DashboardLayout>} />
                <Route path="/centre/batches/create" element={<DashboardLayout><CreateBatch /></DashboardLayout>} />
                <Route path="/centre/batches/:id" element={<DashboardLayout><BatchDetails /></DashboardLayout>} />
                <Route path="/centre/batches/:id/upload" element={<DashboardLayout><UploadCandidates /></DashboardLayout>} />
                <Route path="/centre/returned" element={<DashboardLayout><ReturnedBatches /></DashboardLayout>} />
                <Route path="/centre/certificates" element={<DashboardLayout><CertificateList /></DashboardLayout>} />
              </Route>

              {/* District Officer Portal */}
              <Route element={<RoleBasedRoute allowedRoles={['DISTRICT_OFFICER']} />}>
                <Route path="/district/dashboard" element={<DashboardLayout><DistrictDashboard /></DashboardLayout>} />
                <Route path="/district/pending" element={<DashboardLayout><PendingBatches /></DashboardLayout>} />
                <Route path="/district/batches/:id" element={<DashboardLayout><DistrictBatchReview /></DashboardLayout>} />
                <Route path="/district/history" element={<DashboardLayout><ApprovalHistory /></DashboardLayout>} />
              </Route>

              {/* Quality Team Portal */}
              <Route element={<RoleBasedRoute allowedRoles={['QUALITY_TEAM']} />}>
                <Route path="/quality/dashboard" element={<DashboardLayout><QualityDashboard /></DashboardLayout>} />
                <Route path="/quality/pending" element={<DashboardLayout><QualityPendingBatches /></DashboardLayout>} />
                <Route path="/quality/batches/:id" element={<DashboardLayout><QualityBatchDetails /></DashboardLayout>} />
                <Route path="/quality/history" element={<DashboardLayout><QualityReviewHistory /></DashboardLayout>} />
              </Route>

              {/* State Office Portal */}
              <Route element={<RoleBasedRoute allowedRoles={['STATE_OFFICE']} />}>
                <Route path="/state/dashboard" element={<DashboardLayout><StateDashboard /></DashboardLayout>} />
                <Route path="/state/pending" element={<DashboardLayout><PendingFinalApprovals /></DashboardLayout>} />
                <Route path="/state/batches" element={<DashboardLayout><AllBatches /></DashboardLayout>} />
                <Route path="/state/certificates" element={<DashboardLayout><CertificateManagement /></DashboardLayout>} />
                <Route path="/state/delayed" element={<DashboardLayout><DelayedBatches /></DashboardLayout>} />
                <Route path="/state/audit" element={<DashboardLayout><AuditLogs /></DashboardLayout>} />
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
