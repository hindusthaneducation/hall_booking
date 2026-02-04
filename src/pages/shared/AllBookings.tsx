import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Building2, Calendar, Clock, Filter, Download, Search } from 'lucide-react';
import type { Database } from '../../types/database';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import { DesigningBookingModal } from '../../components/DesigningBookingModal';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import type { Institution } from '../../lib/types';

// Update Booking type to match the flat structure returned by server.js
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  hall_name: string;
  department_name: string;
  user_name: string;
  institution_short_name?: string;
  institution_name?: string;
  institution_id?: string;
};

export function AllBookings() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, institutionsRes] = await Promise.all([
        api.get<Booking[]>('/bookings'),
        api.get<Institution[]>('/institutions')
      ]);

      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (institutionsRes.data) setInstitutions(institutionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesInstitution = institutionFilter === 'all' || booking.institution_id === institutionFilter;
    const matchesSearch = booking.event_title.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(booking.booking_date) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(booking.booking_date) <= new Date(endDate);
    }

    return matchesStatus && matchesInstitution && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const downloadCSV = () => {
    const headers = ['Event Title', 'Hall', 'Department', 'Institution', 'Date', 'Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(b => [
        `"${b.event_title.replace(/"/g, '""')}"`,
        `"${b.hall_name.replace(/"/g, '""')}"`,
        `"${b.department_name.replace(/"/g, '""')}"`,
        `"${(b.institution_short_name || '').replace(/"/g, '""')}"`,
        `"${new Date(b.booking_date).toLocaleDateString()}"`,
        `"${b.event_time.replace(/"/g, '""')}"`,
        `"${b.status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bookings_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showDesigningStatus = profile?.role !== 'principal';

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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">All Bookings</h1>
        <p className="text-gray-600">Complete booking history across all halls</p>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {profile?.role === 'super_admin' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 flex items-center">
              <Building2 className="w-3 h-3 mr-1" /> Institution
            </label>
            <select
              value={institutionFilter}
              onChange={(e) => handleFilterChange(setInstitutionFilter, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Institutions</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" /> Date Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-gray-500 flex items-center">
            <Search className="w-3 h-3 mr-1" /> Search
          </label>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Event name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={downloadCSV}
          disabled={filteredBookings.length === 0}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hall
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Institution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {showDesigningStatus && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Des. Status
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowEventModal(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{booking.event_title}</div>
                      {booking.event_description && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {booking.event_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                        {booking.hall_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {booking.department_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {booking.institution_short_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {booking.event_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    {showDesigningStatus && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.work_status === 'completed' ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-700 w-fit">
                              Completed
                            </span>
                            {booking.final_file_url && (
                              <span className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1" onClick={(e) => {
                                e.stopPropagation();
                                window.open(booking.final_file_url?.startsWith('http') ? booking.final_file_url : `http://localhost:5001/api${booking.final_file_url}`, '_blank');
                              }}>
                                <Download className="w-3 h-3" /> Asset
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
                            Pending
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )
      }

      {
        showEventModal && selectedBooking && (
          profile?.role === 'designing_team' ? (
            <DesigningBookingModal
              booking={selectedBooking as any}
              onClose={() => {
                setShowEventModal(false);
                setSelectedBooking(null);
              }}
            />
          ) : (
            <EventDetailsModal
              booking={selectedBooking as any}
              onClose={() => {
                setShowEventModal(false);
                setSelectedBooking(null);
              }}
              onUpdate={fetchData}
            />
          )
        )
      }
    </div >
  );
}
