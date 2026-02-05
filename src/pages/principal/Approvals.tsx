import { useEffect, useState } from 'react';
import { api, API_URL } from '../../lib/api';
import { downloadFile } from '../../lib/utils';
import { showToast } from '../../components/Toast';
import { Building2, Calendar, Clock, FileText, User, School, Search } from 'lucide-react';
import type { Database } from '../../types/database';
import { Pagination } from '../../components/Pagination';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  const filteredBookings = bookings.filter(b =>
    b.event_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.department_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleApprove = async (bookingId: string) => {
    setProcessing(true);
    try {
      const { error } = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'approved',
      });

      if (error) throw error;

      showToast.success('Booking approved successfully');
      setBookings(bookings.filter((b) => b.id !== bookingId));
      setSelectedBooking(null);
    } catch (error: any) {
      console.error('Error approving booking:', error);
      showToast.error(error.message || 'Failed to approve booking');
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

      showToast.success('Booking rejected');
      setBookings(bookings.filter((b) => b.id !== bookingId));
      setSelectedBooking(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      showToast.error(error.message || 'Failed to reject booking');
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Pending Approvals</h1>
          <p className="text-gray-600">Review and process booking requests</p>
        </div>
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search events or departments..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending approvals</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBookings.map((booking) => (
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
                      <User className="w-4 h-4 mr-3 text-brand-primary/70 shrink-0" />
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Review Booking</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  {selectedBooking.event_title}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    {/* Optional Services */}
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Optional Services:</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded text-xs border ${selectedBooking.is_ac ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          AC: {selectedBooking.is_ac ? 'Yes' : 'No'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs border ${selectedBooking.is_fan ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          Fan: {selectedBooking.is_fan ? 'Yes' : 'No'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs border ${selectedBooking.is_photography ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          Photography: {selectedBooking.is_photography ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {selectedBooking.event_description && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Description</p>
                        <p className="text-gray-700 text-sm leading-relaxed">{selectedBooking.event_description}</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100 h-fit">
                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Guest & Event Details</h4>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {selectedBooking.media_coordinator_name && (
                        <div><span className="text-gray-500 block text-xs">Media Coordinator</span> <span className="font-medium">{selectedBooking.media_coordinator_name}</span></div>
                      )}
                      {selectedBooking.contact_no && (
                        <div><span className="text-gray-500 block text-xs">Contact</span> <span className="font-medium">{selectedBooking.contact_no}</span></div>
                      )}
                      {selectedBooking.event_coordinator_name && (
                        <div><span className="text-gray-500 block text-xs">Event Coordinator</span> <span className="font-medium">{selectedBooking.event_coordinator_name}</span></div>
                      )}
                    </div>



                    {/* Chief Guest */}
                    {selectedBooking.chief_guest_name && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Chief Guest</p>
                        <div className="flex gap-3">
                          {selectedBooking.chief_guest_photo_url && (
                            <div className="flex-shrink-0 group relative">
                              <img
                                src={selectedBooking.chief_guest_photo_url.startsWith('http') ? selectedBooking.chief_guest_photo_url : `${API_URL}${selectedBooking.chief_guest_photo_url}`}
                                alt="Chief Guest"
                                className="w-20 h-20 object-cover rounded shadow-sm"
                              />
                              <button
                                onClick={() => downloadFile(
                                  selectedBooking.chief_guest_photo_url?.startsWith('http') ? selectedBooking.chief_guest_photo_url : `${API_URL}${selectedBooking.chief_guest_photo_url}`,
                                  `chief_guest_${selectedBooking.id}`
                                )}
                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 rounded cursor-pointer border-none"
                                title="Download Image"
                                type="button"
                              >
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{selectedBooking.chief_guest_name}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedBooking.chief_guest_designation}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedBooking.chief_guest_organization}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Partner */}
                    {selectedBooking.event_partner_organization && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Event Partner</p>
                        <div className="flex gap-3">
                          {selectedBooking.event_partner_logo_url && (
                            <div className="flex-shrink-0 group relative">
                              <img
                                src={selectedBooking.event_partner_logo_url.startsWith('http') ? selectedBooking.event_partner_logo_url : `${API_URL}${selectedBooking.event_partner_logo_url}`}
                                alt="Partner Logo"
                                className="w-20 h-20 object-contain rounded bg-white border border-gray-200"
                              />
                              <button
                                onClick={() => downloadFile(
                                  selectedBooking.event_partner_logo_url?.startsWith('http') ? selectedBooking.event_partner_logo_url : `${API_URL}${selectedBooking.event_partner_logo_url}`,
                                  `partner_logo_${selectedBooking.id}`
                                )}
                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 rounded cursor-pointer border-none"
                                title="Download Logo"
                                type="button"
                              >
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{selectedBooking.event_partner_organization}</p>
                            <p className="text-xs text-gray-500 break-words">{selectedBooking.event_partner_details}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedBooking.files_urls && Array.isArray(selectedBooking.files_urls) && selectedBooking.files_urls.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Attachments</p>
                        <ul className="space-y-1">
                          {selectedBooking.files_urls.map((url: string, idx: number) => (
                            <li key={idx}>
                              <button
                                onClick={() => downloadFile(
                                  url.startsWith('http') ? url : `${API_URL}${url}`,
                                  `attachment_${idx + 1}_${selectedBooking.id}`
                                )}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center group cursor-pointer bg-transparent border-none p-0"
                                type="button"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Attachment {idx + 1}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

              </div>
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
      )}
    </div>
  );
}
