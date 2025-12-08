import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Building2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Database } from '../../types/database';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
};

export function DepartmentDashboard() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchBookings();
  }, [profile]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await api.get<Booking[]>('/bookings');

      if (error) throw error;

      let allUserBookings: Booking[] = [];
      if (data && profile) {
        // Client-side filter: Only count current user's bookings for dashboard stats
        allUserBookings = data.filter(b => b.user_id === profile.id);
      }

      // Sort by date desc
      allUserBookings.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());

      // Take top 5 for "Recent Bookings"
      setBookings(allUserBookings.slice(0, 5));

      const pending = allUserBookings.filter((b) => b.status === 'pending').length;
      const approved = allUserBookings.filter((b) => b.status === 'approved').length;
      const rejected = allUserBookings.filter((b) => b.status === 'rejected').length;

      setStats({ pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Pending',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Approved',
    },
    rejected: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Rejected',
    },
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-3xl font-semibold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-semibold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-semibold text-red-600 mt-2">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/halls"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Browse Halls</p>
                <p className="text-sm text-gray-600">View available halls and make bookings</p>
              </div>
            </Link>
            <Link
              to="/my-bookings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">My Bookings</p>
                <p className="text-sm text-gray-600">View all your booking requests</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-600">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const config = statusConfig[booking.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={booking.id}
                    className={`p-4 border rounded-lg ${config.borderColor} ${config.bgColor}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{booking.event_title}</h3>
                      <div className={`flex items-center ${config.color}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">{config.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        <span>{booking.hall_name}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
