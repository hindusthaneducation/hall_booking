import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import { Building2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye, Camera } from 'lucide-react';
import type { Database } from '../../types/database';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import { Pagination } from '../../components/Pagination';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
  department_name: string;
};

export function MyBookings() {
  const { profile, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchBookings();
  }, [profile]); // Refetch if profile changes (e.g. login)

  const fetchBookings = async () => {
    try {
      // Backend filters by user_id for 'department_user' role
      const { data, error } = await api.get<Booking[]>('/bookings');

      if (error) throw error;
      if (data) setBookings(data);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      showToast.error('Failed to load your bookings');
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

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'approved' | 'rejected') => {
    setFilter(newFilter);
    setCurrentPage(1);
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
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all'
            ? 'bg-brand-primary text-white'
            : 'bg-brand-card border border-gray-300 text-brand-text hover:bg-brand-base/50'
            }`}
        >
          All Bookings
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending'
            ? 'bg-brand-primary text-white'
            : 'bg-brand-card border border-gray-300 text-brand-text hover:bg-brand-base/50'
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => handleFilterChange('approved')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'approved'
            ? 'bg-brand-primary text-white'
            : 'bg-brand-card border border-gray-300 text-brand-text hover:bg-brand-base/50'
            }`}
        >
          Approved
        </button>
        <button
          onClick={() => handleFilterChange('rejected')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'rejected'
            ? 'bg-brand-primary text-white'
            : 'bg-brand-card border border-gray-300 text-brand-text hover:bg-brand-base/50'
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
        <>
          <div className="space-y-4">
            {currentBookings.map((booking) => {
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
                    <div className="flex flex-col items-end gap-2">
                      <div className={`flex items-center px-3 py-1 rounded-full ${config.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 mr-1 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {booking.event_description && (
                    <p className="text-gray-600 mb-4">{booking.event_description}</p>
                  )}

                  {booking.status === 'rejected' && booking.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{booking.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    {booking.photography_drive_link && (
                      <div className="mr-auto inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        Photos Available
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="inline-flex items-center px-4 py-2 border border-brand-primary text-sm font-medium rounded-md text-brand-primary bg-white hover:bg-brand-base/10"
                    >
                      View Details <Eye className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

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
