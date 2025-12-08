import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DepartmentDashboard } from './pages/department/Dashboard';
import { HallsList } from './pages/department/HallsList';
import { HallDetails } from './pages/department/HallDetails';
import { MyBookings } from './pages/department/MyBookings';
import { PrincipalDashboard } from './pages/principal/Dashboard';
import { Approvals } from './pages/principal/Approvals';
import { AdminDashboard } from './pages/admin/Dashboard';
import { HallsManagement } from './pages/admin/HallsManagement';
import { UsersManagement } from './pages/admin/UsersManagement';
import { Settings } from './pages/admin/Settings';
import { AllBookings } from './pages/shared/AllBookings';

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
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['department_user', 'principal', 'super_admin']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
