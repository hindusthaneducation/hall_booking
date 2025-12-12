import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Building2, Calendar, Clock, FileText, User, School } from 'lucide-react';
import type { Database } from '../../types/database';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
  department_name: string;
  user_name: string;
  institution_name?: string;
};

export function Approvals() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  const fetchPendingBookings = async () => {
    try {
      const { data, error } = await api.get<Booking[]>('/bookings');

      if (error) throw error;

      if (data) {
        // Filter locally for now effectively
        const pending = data.filter(b => b.status === 'pending');
        setBookings(pending);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setProcessing(true);
    try {
      const { error } = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'approved',
      });

      if (error) throw error;

      setBookings(bookings.filter((b) => b.id !== bookingId));
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('Failed to approve booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'rejected',
        rejection_reason: rejectionReason,
      });

      if (error) throw error;

      setBookings(bookings.filter((b) => b.id !== bookingId));
      setSelectedBooking(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking');
    } finally {
      setProcessing(false);
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Pending Approvals</h1>
        <p className="text-gray-600">Review and process booking requests</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending approvals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings?.map((booking) => (
            <div key={booking.id} className="bg-brand-card rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 flex-grow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {booking.event_title}
                  </h3>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-brand-primary/70 shrink-0" />
                    <span className="truncate" title={booking.hall_name}>{booking.hall_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-brand-primary/70 shrink-0" />
                    <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-brand-primary/70 shrink-0" />
                    <span>{booking.event_time}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-brand-primary/70 shrink-0" />
                    <span className="truncate" title={booking.department_name}>{booking.department_name}</span>
                  </div>
                  {booking.institution_name && (
                    <div className="flex items-center text-brand-primary">
                      <School className="w-4 h-4 mr-2 shrink-0" />
                      <span className="font-medium truncate" title={booking.institution_name}>{booking.institution_name}</span>
                    </div>
                  )}
                </div>

                {booking.event_description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 line-clamp-2">{booking.event_description}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                {booking.approval_letter_url ? (
                  <a
                    href={booking.approval_letter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:text-brand-secondary text-sm font-medium flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Letter
                  </a>
                ) : (
                  <span className="text-gray-400 text-sm italic">No Letter</span>
                )}

                <button
                  onClick={() => setSelectedBooking(booking)}
                  className="inline-flex items-center px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Review Booking</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedBooking.event_title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Hall</p>
                    <p className="font-medium text-gray-900">{selectedBooking.hall_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">{selectedBooking.department_name}</p>
                  </div>
                  {selectedBooking.institution_name && (
                    <div>
                      <p className="text-sm text-gray-500">College</p>
                      <p className="font-medium text-indigo-600">{selectedBooking.institution_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedBooking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{selectedBooking.event_time}</p>
                  </div>
                </div>
                {selectedBooking.event_description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-gray-700">{selectedBooking.event_description}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (optional)
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide reason if rejecting..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedBooking.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleApprove(selectedBooking.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
