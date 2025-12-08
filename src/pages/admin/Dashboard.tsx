import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Building2, Users, Calendar, TrendingUp } from 'lucide-react';
import type { Database } from '../../types/database';

type User = Database['public']['Tables']['profiles']['Row'];
type Hall = Database['public']['Tables']['halls']['Row'];
type Booking = Database['public']['Tables']['bookings']['Row'];

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalHalls: 0,
    totalUsers: 0,
    totalBookings: 0,
    currentMonthBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [hallsRes, usersRes, bookingsRes] = await Promise.all([
        api.get<Hall[]>('/halls'),
        api.get<User[]>('/users'),
        api.get<Booking[]>('/bookings'),
      ]);

      const halls = hallsRes.data || [];
      const users = usersRes.data || [];
      const bookings = bookingsRes.data || [];

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.booking_date); // Note: API returns booking_date
        return (
          bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
        );
      }).length;

      setStats({
        totalHalls: halls.length,
        totalUsers: users.length,
        totalBookings: bookings.length,
        currentMonthBookings,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Halls</p>
              <p className="text-3xl font-semibold text-blue-600 mt-2">{stats.totalHalls}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-semibold text-green-600 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-semibold text-purple-600 mt-2">{stats.totalBookings}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-semibold text-orange-600 mt-2">
                {stats.currentMonthBookings}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link
          to="/halls-management"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <Building2 className="w-12 h-12 text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Halls</h2>
          <p className="text-gray-600">Create, edit, and manage hall information</p>
        </Link>

        <Link
          to="/users-management"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <Users className="w-12 h-12 text-green-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Users</h2>
          <p className="text-gray-600">Create and manage user accounts</p>
        </Link>

        <Link
          to="/all-bookings"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <Calendar className="w-12 h-12 text-purple-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">All Bookings</h2>
          <p className="text-gray-600">View complete booking history</p>
        </Link>
      </div>
    </div>
  );
}
