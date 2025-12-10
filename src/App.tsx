import { useState, useEffect } from 'react';
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
import { InstitutionsManagement } from './pages/admin/InstitutionsManagement';
import { DepartmentsManagement } from './pages/admin/DepartmentsManagement';
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

// Loading Component for Server Wake-up
function ServerWakeup({ children }: { children: React.ReactNode }) {
  const [isAwake, setIsAwake] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const checkServer = async () => {
      try {
        // Use fetch directly to avoid auth headers or interceptors for this ping
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/health`);
        if (res.ok) {
          setIsAwake(true);
        } else {
          throw new Error('Not OK');
        }
      } catch (e) {
        // Retry logic: Wait 2s and try again
        setTimeout(() => setAttempt(prev => prev + 1), 2000);
      }
    };
    checkServer();
  }, [attempt]);

  if (isAwake) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting to Server...</h2>
      <p className="text-gray-500 text-center max-w-md">
        The backend is waking up from idle mode. This may take up to 60 seconds.
        <br />
        <span className="text-sm mt-2 block text-gray-400">(Attempt #{attempt + 1})</span>
      </p>
    </div>
  );
}

function App() {
  return (
    <ServerWakeup>
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
              path="/departments-management"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Layout>
                    <DepartmentsManagement />
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
    </ServerWakeup>
  );
}

export default App;
