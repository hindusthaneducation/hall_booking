import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DepartmentDashboard } from './pages/department/Dashboard';
import { HallsList } from './pages/department/HallsList';
import { PressRelease } from './pages/department/PressRelease';
import { HallDetails } from './pages/department/HallDetails';
import { MyBookings } from './pages/department/MyBookings';
import { PrincipalDashboard } from './pages/principal/Dashboard';
import { Approvals } from './pages/principal/Approvals';
import { AdminDashboard } from './pages/admin/Dashboard';
import { HallsManagement } from './pages/admin/HallsManagement';
import { UsersManagement } from './pages/admin/UsersManagement';
import { InstitutionsManagement } from './pages/admin/InstitutionsManagement';
import { DepartmentsManagement } from './pages/admin/DepartmentsManagement';
import { Settings } from './pages/admin/Settings';
import { AllBookings } from './pages/shared/AllBookings';

import { DesigningDashboard } from './pages/designing/Dashboard';
import { PhotographyDashboard } from './pages/photography/Dashboard';
import PressReleaseApprovals from './pages/admin/PressReleaseApprovals';
import PressReleaseTeamDashboard from './pages/team/PressReleaseTeamDashboard';

function DashboardRouter() {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case 'department_user':
      return <DepartmentDashboard />;
    case 'principal':
      return <PrincipalDashboard />;
    case 'super_admin':
      return <AdminDashboard />;
    case 'designing_team':
      return <DesigningDashboard />;
    case 'photography_team':
      return <PhotographyDashboard />;
    case 'press_release_team':
      return <PressReleaseTeamDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/Toast';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastContainer />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardRouter />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Common routes available to designing_team if needed, but Dashboard is main */}
            {/* We might want to restrict others from them or allow them access to settings? */}
            {/* For now, they just stay on / (Dashboard) */}

            <Route
              path="/halls"
              element={
                <ProtectedRoute allowedRoles={['department_user', 'principal', 'super_admin']}>
                  <Layout>
                    <HallsList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/halls/:id"
              element={
                <ProtectedRoute allowedRoles={['department_user', 'principal', 'super_admin']}>
                  <Layout>
                    <HallDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={['department_user']}>
                  <Layout>
                    <MyBookings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute allowedRoles={['principal', 'super_admin']}>
                  <Layout>
                    <Approvals />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-bookings"
              element={
                <ProtectedRoute allowedRoles={['principal', 'super_admin']}>
                  <Layout>
                    <AllBookings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/halls-management"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <HallsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users-management"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <UsersManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institutions-management"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <InstitutionsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/press-release"
              element={
                <ProtectedRoute allowedRoles={['department_user']}>
                  <Layout>
                    <PressRelease />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments-management"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <DepartmentsManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Super Admin: Press Release Approvals */}
            <Route
              path="/admin/press-releases"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <PressReleaseApprovals />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Press Release Team & Designing Team Dashboard */}
            <Route
              path="/team/press-releases"
              element={
                <ProtectedRoute allowedRoles={['press_release_team']}>
                  <Layout>
                    <PressReleaseTeamDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['department_user', 'principal', 'super_admin', 'designing_team', 'photography_team']}>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter >
  );
}

export default App;
