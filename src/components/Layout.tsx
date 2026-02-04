import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  School,
  Layers,
  Palette,
  FileText,
} from 'lucide-react';
import HindusthanLogo from '../images/hindusthan_logo.webp';
import { ImageWithFallback } from './ImageWithFallback';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ... (rest of the file content until return)
  // Restoring deleted logic
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Dynamic Title & Favicon
  useEffect(() => {
    if (profile?.institution) {
      document.title = `${profile.institution.name} - Hall Booking`;

      // Update Favicon
      if ((profile.institution as any).logo_url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        // Handle relative vs absolute URL
        const logoUrl = (profile.institution as any).logo_url;
        link.href = logoUrl.startsWith('http')
          ? logoUrl
          : `${import.meta.env.VITE_API_BASE_URL}${logoUrl}`;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    } else {
      document.title = 'Hall Booking System';
    }
  }, [profile]);

  const navItems = {
    department_user: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/halls', icon: Building2, label: 'Browse Halls' },
      { path: '/my-bookings', icon: Calendar, label: 'My Bookings' },
      { path: '/press-release', icon: FileText, label: 'Press Release' },
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
      { path: '/approvals', icon: FileCheck, label: 'Pending Approvals' },
      { path: '/institutions-management', icon: School, label: 'Manage Institutions' },
      { path: '/departments-management', icon: Layers, label: 'Manage Departments' },
      { path: '/halls-management', icon: Building2, label: 'Manage Halls' },
      { path: '/halls', icon: Calendar, label: 'Book Hall' },
      { path: '/users-management', icon: Users, label: 'Manage Users' },
      { path: '/admin/press-releases', icon: FileText, label: 'Press Release Requests' }, // New Link
      { path: '/all-bookings', icon: Calendar, label: 'All Bookings' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
    designing_team: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
    photography_team: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
    press_release_team: [ // New Role
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/team/press-releases', icon: FileText, label: 'Approved Releases' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  };

  const currentNavItems = profile ? navItems[profile.role] : [];

  return (
    <div className="min-h-screen bg-brand-base transition-colors duration-300">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-brand-card border-b border-gray-200 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            {/* ... Logo logic ... */}
            {profile?.role === 'super_admin' ? (
              <ImageWithFallback src={null} fallbackSrc={HindusthanLogo} alt="Logo" className="w-8 h-8 object-contain mr-2" />
            ) : (
              <ImageWithFallback src={(profile?.institution as any)?.logo_url} fallbackSrc={HindusthanLogo} alt="Logo" className="w-8 h-8 object-contain mr-2" />
            )}
            <span className="font-semibold text-brand-text">
              {profile?.role === 'super_admin' ? 'Hindusthan Admin' : ((profile?.institution as any)?.short_name || 'Hall Booking')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
              title="Toggle Theme"
            >
              <Palette className="w-6 h-6" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-brand-card border-r border-gray-200 z-30 transition-transform duration-300 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center">
            {profile?.role === 'super_admin' ? (
              <ImageWithFallback src={null} fallbackSrc={HindusthanLogo} alt="Logo" className="w-10 h-10 object-contain mr-3" />
            ) : (
              <ImageWithFallback src={(profile?.institution as any)?.logo_url} fallbackSrc={HindusthanLogo} alt="Logo" className="w-10 h-10 object-contain mr-3" />
            )}
            <div>
              <h1 className="text-lg font-semibold text-brand-text leading-tight">
                {profile?.role === 'super_admin'
                  ? 'Hindusthan Educational Institutions'
                  : (profile?.institution?.name || (profile?.institution as any)?.short_name || 'Hall Booking')}
              </h1>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role === 'department_user'
                  ? (profile?.department?.name || 'Department Staff')
                  : profile?.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto min-h-0">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          {/* Theme Toggle for Desktop */}
          <button
            onClick={toggleTheme}
            className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
          >
            <Palette className="w-5 h-5 mr-3" />
            <span className="font-medium">Theme: {theme === 'default' ? 'Default' : 'College'}</span>
          </button>

          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-brand-text">{profile?.full_name}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
