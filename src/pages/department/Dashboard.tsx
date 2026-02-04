import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Building2, Clock, CheckCircle, XCircle, AlertCircle, Eye, Camera } from 'lucide-react';
import type { Database } from '../../types/database';
import { EventDetailsModal } from '../../components/EventDetailsModal';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
  department_name: string;
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
  const [overduePressReleases, setOverduePressReleases] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchOverdue();
  }, [profile]);

  const fetchOverdue = async () => {
    try {
      const { data } = await api.get<any[]>('/notifications/press-release-overdue');
      if (data) setOverduePressReleases(data);
    } catch (e) { console.error(e) }
  };

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

      {/* Overdue Alerts */}
      {overduePressReleases.length > 0 && (
        <div className="mb-8 space-y-4">
          {overduePressReleases.map(pr => (
            <div key={pr.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                <div>
                  <h3 className="text-red-800 font-bold">Action Required: Press Release Overdue</h3>
                  <p className="text-red-700 text-sm">
                    The event <span className="font-semibold">"{pr.event_title}"</span> ({new Date(pr.booking_date).toLocaleDateString()}) has ended, and no press release has been submitted.
                  </p>
                </div>
              </div>
              <Link
                to="/press-release"
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Upload Now
              </Link>
            </div>
          ))}
        </div>
      )}

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
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-base/50 transition-colors"
            >
              <Building2 className="w-6 h-6 text-brand-primary mr-3" />
              <div>
                <h3 className="font-semibold text-brand-text">Browse Halls</h3>
                <p className="text-sm text-gray-500">View available seminar halls</p>
              </div>
            </Link>
            <Link
              to="/my-bookings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-base/50 transition-colors"
            >
              <Calendar className="w-6 h-6 text-brand-primary mr-3" />
              <div>
                <p className="font-medium text-gray-900">My Bookings</p>
                <p className="text-sm text-gray-600">View all your booking requests</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 shrink-0">Recent Bookings</h2>
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
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
                      className={`p-4 border rounded-lg transition-all hover:shadow-md ${config.borderColor} ${config.bgColor}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 line-clamp-1">{booking.event_title}</h3>
                        <div className={`flex items-center ${config.color} shrink-0 ml-2`}>
                          <StatusIcon className="w-4 h-4 mr-1" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4 mb-2">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1" />
                          <span className="truncate max-w-[100px]">{booking.hall_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200 border-opacity-50">
                        {booking.photography_drive_link && (
                          <span className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full mr-auto">
                            <Camera className="w-3 h-3 mr-1" />
                            Photos
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-xs font-medium text-brand-primary hover:text-brand-secondary flex items-center"
                        >
                          View Details <Eye className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBooking && (
        <EventDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
}
