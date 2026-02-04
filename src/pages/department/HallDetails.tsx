import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateLocal } from '../../lib/utils';
import { showToast } from '../../components/Toast';
import { Building2, Users, Maximize, ArrowLeft, X, Volume2 } from 'lucide-react';
import { Calendar } from '../../components/Calendar';
import { BookingForm } from '../../components/BookingForm';
import { SuccessModal } from '../../components/SuccessModal';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import type { Database } from '../../types/database';




type Hall = Database['public']['Tables']['halls']['Row'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  department_name: string; // from API
  institution_short_name?: string;
};

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  status: 'available' | 'pending' | 'booked';
  departmentShortName?: string;
  isPast?: boolean;
}

export function HallDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [hall, setHall] = useState<Hall | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [bookingsMap, setBookingsMap] = useState<Map<string, Booking[]>>(new Map());
  const [showDayView, setShowDayView] = useState(false);
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (id) {
      fetchHall();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      generateCalendar();
    }
  }, [currentDate, id]);

  const fetchHall = async () => {
    try {
      const { data, error } = await api.get<Hall>(`/halls/${id}`);

      if (error) throw error;
      setHall(data);
    } catch (error: any) {
      console.error('Error fetching hall:', error);
      showToast.error('Failed to load hall details');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendar = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);

    // We fetch all bookings and filter client side for the month/range
    // Optimization: Backend could support date range params, but fetching all is fine for MVP
    // We fetch all bookings and filter client side for the month/range
    // Optimization: Backend could support date range params, but fetching all is fine for MVP
    // We fetch bookings for this specific HALL to correct the calendar view
    const { data: bookings } = await api.get<Booking[]>(`/bookings?hall_id=${id}`);

    const bookingMap = new Map<string, Booking[]>();

    if (bookings) {
      bookings.forEach((booking) => {
        if (booking.hall_id === id && booking.status !== 'rejected') {
          const dateStr = booking.booking_date.split('T')[0];
          const existing = bookingMap.get(dateStr) || [];
          bookingMap.set(dateStr, [...existing, booking]);
        }
      });
    }
    setBookingsMap(bookingMap);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const dateStr = formatDateLocal(current);
      const booking = bookingMap.get(dateStr);
      const isPast = current < today;

      let status: 'available' | 'pending' | 'booked' = 'available';
      let departmentShortName: string | undefined;

      if (booking && booking.length > 0) {
        // If any approved, mark partial/booked?
        // Let's just show 'booked' if any exist, but we allow clicking.
        const hasApproved = booking.some(b => b.status === 'approved');
        status = hasApproved ? 'booked' : 'pending';
        // department_name from first booking?
        departmentShortName = booking[0].department_name;
        if (booking.length > 1) departmentShortName = `${booking.length} Slots`;
      }

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        status,
        departmentShortName,
        isPast,
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Allow seeing past details? Maybe. But definitively future.

    const dateStr = formatDateLocal(date);
    const existingBookings = bookingsMap.get(dateStr);

    if (existingBookings && existingBookings.length > 0) {
      setSelectedDate(date);
      setSelectedDayBookings(existingBookings);
      setShowDayView(true);
      return;
    }

    // Only allow new bookings for future dates/today
    if (date < today) {
      return;
    }

    setSelectedDate(date);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    setSelectedDate(null);
    showToast.success('Booking requested successfully!');
    setShowSuccessModal(true);
    generateCalendar();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hall) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Hall not found</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/halls')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Halls
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="aspect-video bg-gray-200 overflow-hidden">
          <img
            src={hall.image_url?.startsWith('http') ? hall.image_url : `${import.meta.env.VITE_API_BASE_URL}${hall.image_url}`}
            alt={hall.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800';
            }}
          />
        </div>
        <div className="p-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">{hall.name}</h1>
          <p className="text-gray-600 mb-6">{hall.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-brand-card p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-brand-text mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-4">
                {hall.is_ac && (
                  <div className="flex items-center text-gray-700">
                    <Building2 className="w-5 h-5 mr-3 text-brand-primary" />
                    <span>AC Hall</span>
                  </div>
                )}
                <div className="flex items-center text-gray-700">
                  <Users className="w-5 h-5 mr-3 text-brand-primary" />
                  <span>{hall.seating_capacity} Seating</span>
                </div>
                {hall.has_sound_system && (
                  <div className="flex items-center text-gray-700">
                    <Volume2 className="w-5 h-5 mr-3 text-brand-primary" />
                    <span>Sound System</span>
                  </div>
                )}
                {hall.stage_size && (
                  <div className="flex items-center text-gray-700">
                    <Maximize className="w-5 h-5 mr-3 text-brand-primary" />
                    <div>
                      <p className="text-sm text-gray-500">Stage Size</p>
                      <p className="font-medium">{hall.stage_size}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Calendar
        currentDate={currentDate}
        onMonthChange={setCurrentDate}
        days={calendarDays}
        onDateClick={handleDateClick}
      />

      {showBookingForm && selectedDate && hall && profile && (
        <BookingForm
          hallId={hall.id}
          hallName={hall.name}
          date={selectedDate}
          departmentId={profile.department_id || null}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedDate(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}

      {showSuccessModal && (
        <SuccessModal
          title="Booking Requested Successfully"
          message="Your booking request has been submitted. You can track its status in My Bookings."
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {showEventModal && selectedBooking && (
        <EventDetailsModal
          booking={selectedBooking}
          onClose={() => {
            setShowEventModal(false);
            setSelectedBooking(null);
          }}
          onUpdate={generateCalendar} // Refresh calendar on Edit/Delete
        />
      )}
      {showDayView && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Bookings for {selectedDate.toLocaleDateString()}
              </h3>
              <button onClick={() => setShowDayView(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 mb-6">
              {selectedDayBookings.map(b => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBooking(b);
                    setShowEventModal(true);
                    // Optional: keep DayView open? or close it?
                    // If we close DayView, user returns to calendar. 
                    // If we keep it open, the modal opens on top. 
                    // Let's keep DayView open or maybe close it if Modal takes over.
                    // Modal is 'fixed inset-0 z-50'. DayView is z-50.
                    // Better to close DayView or ensure Modal is z-51.
                    // Let's close DayView for simplicity.
                    // setShowDayView(false); 
                    // Wait, user might want to see others.
                    // Let's try z-index stacking or just leave it. 
                    // Current Modal z-50. DayView z-50.
                    // I'll make Modal z-[60].
                  }}
                  className={`p-3 rounded border cursor-pointer hover:shadow-md transition-shadow ${b.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{b.event_time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${b.status === 'approved' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{b.status}</span>
                  </div>
                  <p className="font-semibold mt-1">{b.event_title}</p>
                  <p className="text-sm text-gray-600">
                    By: {b.department_name}
                    {b.institution_short_name && <span className="ml-1 text-gray-500">({b.institution_short_name})</span>}
                  </p>
                  <p className="text-xs text-blue-600 mt-2 hover:underline">View/Edit Details</p>
                </div>
              ))}
            </div>

            {selectedDate >= new Date(new Date().setHours(0, 0, 0, 0)) && (
              <button
                onClick={() => {
                  setShowDayView(false);
                  setShowBookingForm(true);
                }}
                className="w-full py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary"
              >
                Book New Slot
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
