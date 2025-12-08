import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateLocal } from '../../lib/utils';
import { Building2, Users, Maximize, ArrowLeft } from 'lucide-react';
import { Calendar } from '../../components/Calendar';
import { BookingForm } from '../../components/BookingForm';
import { SuccessModal } from '../../components/SuccessModal';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import type { Database } from '../../types/database';




type Hall = Database['public']['Tables']['halls']['Row'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
  department_name: string; // from API
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
  const [bookingsMap, setBookingsMap] = useState<Map<string, Booking>>(new Map());

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
    } catch (error) {
      console.error('Error fetching hall:', error);
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
    const { data: bookings } = await api.get<Booking[]>('/bookings?view=all');

    const bookingMap = new Map<string, Booking>();

    if (bookings) {
      bookings.forEach((booking) => {
        // Filter by hall_id and IGNORE rejected bookings (so date becomes available again)
        if (booking.hall_id === id && booking.status !== 'rejected') {
          // If multiple bookings exist for same date (e.g. one cancelled, one new),
          // this simple map might need specific logic, but with 'rejected' filtered, it helps.
          // Ideally rely on backend to give "active" booking, but client-side filter works for now.
          bookingMap.set(booking.booking_date.split('T')[0], booking);
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

      if (booking) {
        status = booking.status === 'approved' ? 'booked' : 'pending';
        // department_name is 'IT', 'CSE' etc (short_name from query)
        departmentShortName = booking.department_name;
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
    const dateStr = formatDateLocal(date);
    const existingBooking = bookingsMap.get(dateStr);

    if (existingBooking) {
      // If there is a booking (pending or approved), show details
      setSelectedBooking(existingBooking);
      setShowEventModal(true);
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
          <img src={hall.image_url} alt={hall.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">{hall.name}</h1>
          <p className="text-gray-600 mb-6">{hall.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center text-gray-700">
              <Building2 className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{hall.hall_type}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <Users className="w-5 h-5 mr-3 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Capacity</p>
                <p className="font-medium">{hall.seating_capacity} seats</p>
              </div>
            </div>
            {hall.stage_size && (
              <div className="flex items-center text-gray-700">
                <Maximize className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Stage Size</p>
                  <p className="font-medium">{hall.stage_size}</p>
                </div>
              </div>
            )}
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
    </div>
  );
}
