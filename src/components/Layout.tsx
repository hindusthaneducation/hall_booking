import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  LayoutDashboard,
  Calendar,
  FileCheck,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = {
    department_user: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/halls', icon: Building2, label: 'Browse Halls' },
      { path: '/my-bookings', icon: Calendar, label: 'My Bookings' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
    principal: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/approvals', icon: FileCheck, label: 'Pending Approvals' },
      { path: '/halls', icon: Building2, label: 'Book Hall' },
      { path: '/all-bookings', icon: Calendar, label: 'All Bookings' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
    super_admin: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/approvals', icon: FileCheck, label: 'Pending Approvals' }, // New Access
      { path: '/halls-management', icon: Building2, label: 'Manage Halls' },
      { path: '/halls', icon: Calendar, label: 'Book Hall' },
      { path: '/users-management', icon: Users, label: 'Manage Users' },
      { path: '/all-bookings', icon: Calendar, label: 'All Bookings' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  };

  const currentNavItems = profile ? navItems[profile.role] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-blue-600 mr-2" />
            <span className="font-semibold text-gray-900">Hall Booking</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Hall Booking</h1>
              <p className="text-xs text-gray-500 capitalize">{profile?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
