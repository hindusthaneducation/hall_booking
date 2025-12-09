import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import type { Database } from '../../types/database';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
};

export function MyBookings() {
  const { profile, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchBookings();
  }, [profile]); // Refetch if profile changes (e.g. login)

  const fetchBookings = async () => {
    try {
      // Backend filters by user_id for 'department_user' role
      const { data, error } = await api.get<Booking[]>('/bookings');

      if (error) throw error;
      if (data) setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    // Client-side filter: STRICT. If no profile, show nothing.
    if (!profile) return false;
    if (booking.user_id !== profile.id) return false;

    if (filter === 'all') return true;
    return booking.status === filter;
  });

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

  // Wait for both auth and data
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Track all your hall booking requests</p>
      </div>

      <div className="mb-6 flex items-center space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'pending'
            ? 'bg-yellow-600 text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'approved'
            ? 'bg-green-600 text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${filter === 'rejected'
            ? 'bg-red-600 text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          Rejected
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const config = statusConfig[booking.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={booking.id}
                className={`bg-white rounded-lg border p-6 ${config.borderColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {booking.event_title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        <span>{booking.hall_name}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{booking.event_time}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center px-3 py-1 rounded-full ${config.bgColor}`}>
                    <StatusIcon className={`w-4 h-4 mr-1 ${config.color}`} />
                    <span className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {booking.event_description && (
                  <p className="text-gray-600 mb-4">{booking.event_description}</p>
                )}

                {/* Approval Letter Feature Removed */}

                {booking.status === 'rejected' && booking.rejection_reason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{booking.rejection_reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
