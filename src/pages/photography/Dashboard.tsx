
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { showToast } from '../../components/Toast';
import { AlertCircle } from 'lucide-react';
import type { Database } from '../../types/database';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import { PhotographyUploadModal } from '../../components/modals/PhotographyUploadModal';
import { DayEventsModal } from '../../components/modals/DayEventsModal';
import { EventsListModal } from '../../components/modals/EventsListModal';
import { Calendar } from '../../components/Calendar';

// Using the same Booking type structure
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
    hall_name: string;
    department_name: string;
    user_name: string;
    institution_name?: string;
    institution_short_name?: string;
};

export function PhotographyDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Derived state for notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonthBookings = bookings.filter(b => {
        const d = new Date(b.booking_date);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

    const completedUploads = currentMonthBookings.filter(b => b.photography_drive_link).length;

    const missingUploads = bookings.filter(b => {
        const d = new Date(b.booking_date);
        d.setHours(0, 0, 0, 0);
        return d < today && !b.photography_drive_link;
    });
    const missingCount = missingUploads.length;

    // Modals
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [uploadModalBooking, setUploadModalBooking] = useState<Booking | null>(null);
    const [showMissingModal, setShowMissingModal] = useState(false);

    useEffect(() => {
        fetchApprovedBookings();
    }, []);

    const fetchApprovedBookings = async () => {
        try {
            const { data, error } = await api.get<Booking[]>('/bookings');
            if (error) throw error;

            if (data) {
                // Filter only approved bookings for the calendar
                const approved = data.filter(b => b.status === 'approved');
                setBookings(approved);
            }
        } catch (error: any) {
            console.error('Error fetching bookings:', error);
            showToast.error(error.message || 'Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate calendar days for the current month view
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Start from the Sunday/Monday before the first day to fill the grid
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday

        const endDate = new Date(lastDay);
        // End on the Saturday after the last day
        if (endDate.getDay() !== 6) {
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        }

        const days = [];
        let day = new Date(startDate);

        while (day <= endDate) {
            // Create local date string YYYY-MM-DD
            const currentYear = day.getFullYear();
            const currentMonthStr = String(day.getMonth() + 1).padStart(2, '0');
            const currentDayStr = String(day.getDate()).padStart(2, '0');
            const dateStr = `${currentYear}-${currentMonthStr}-${currentDayStr}`;

            // Find bookings for this day
            const dayBookings = bookings.filter(b => b.booking_date.startsWith(dateStr));

            // Determine status and label for the Calendar component
            let status: 'available' | 'pending' | 'booked' = 'available';
            let deptName = undefined;

            if (dayBookings.length > 0) {
                status = 'booked'; // Use 'booked' style for days with events
                // Show count or first institution short name?
                // The Calendar component expects departmentShortName string
                deptName = `${dayBookings.length} Event${dayBookings.length > 1 ? 's' : ''}`;
            }

            days.push({
                date: new Date(day),
                isCurrentMonth: day.getMonth() === month, // 'month' variable from outer scope
                status,
                departmentShortName: deptName,
                isPast: new Date(day) < new Date(new Date().setHours(0, 0, 0, 0))
            });

            day.setDate(day.getDate() + 1);
        }
        return days;
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
    };

    const getEventsForDate = (date: Date) => {
        // Construct local date string YYYY-MM-DD manually
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${d}`;

        return bookings.filter(b => b.booking_date.startsWith(localDateStr));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-base p-6">

            {/* Stats Grid */}
            <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Events This Month</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{currentMonthBookings.length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Links Uploaded</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{completedUploads}</p>
                    </div>
                    {currentMonthBookings.length > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                            <div
                                className="bg-green-500 h-1.5 rounded-full"
                                style={{ width: `${(completedUploads / currentMonthBookings.length) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>

                <div
                    onClick={() => missingCount > 0 && setShowMissingModal(true)}
                    className={`rounded-lg shadow-sm border p-6 flex flex-col justify-between transition-all ${missingCount > 0
                        ? 'bg-red-50 border-red-200 cursor-pointer hover:shadow-md hover:border-red-300'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${missingCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                Missing Uploads (Overdue)
                            </p>
                            {missingCount > 0 && <AlertCircle className="w-5 h-5 text-red-500" />}
                        </div>
                        <p className={`text-3xl font-bold mt-2 ${missingCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                            {missingCount}
                        </p>
                    </div>
                    {missingCount > 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">Click to view pending items</p>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-brand-text">Photography Schedule</h1>
                    <p className="text-gray-500 mt-1">View monthly events and upload photography links</p>
                </div>

                {/* Calendar View */}
                <Calendar
                    currentDate={currentDate}
                    onMonthChange={setCurrentDate}
                    days={getCalendarDays()}
                    onDateClick={handleDateClick}
                />
            </div>

            {/* Modals */}

            {/* 1. Day Events List (Opens when date clicked) */}
            {selectedDate && (
                <DayEventsModal
                    date={selectedDate}
                    events={getEventsForDate(selectedDate)}
                    onClose={() => setSelectedDate(null)}
                    onSelectEvent={(booking) => {
                        // User requested click on event -> show upload link modal
                        setUploadModalBooking(booking);
                    }}
                    onUploadLink={(booking) => {
                        setUploadModalBooking(booking);
                    }}
                />
            )}

            {/* 2. Event Details (View Only / Actions) */}
            {selectedBooking && (
                <EventDetailsModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onUpdate={fetchApprovedBookings}
                />
            )}

            {/* 3. Upload Link Modal */}
            {uploadModalBooking && (
                <PhotographyUploadModal
                    booking={uploadModalBooking}
                    onClose={() => setUploadModalBooking(null)}
                    onUpdate={() => {
                        fetchApprovedBookings();
                        // If we are also viewing the day list, we might want to refresh that list?
                        // fetchApprovedBookings updates 'bookings' state, which re-renders Dashboard.
                        // DayEventsModal props 'events' is derived from bookings + selectedDate.
                        // So it should auto-update.
                    }}
                />
            )}

            {/* 4. Missing Uploads List Modal */}
            {showMissingModal && (
                <EventsListModal
                    title="Action Required: Missing Uploads"
                    events={missingUploads}
                    onClose={() => setShowMissingModal(false)}
                    onSelectEvent={(booking) => {
                        setUploadModalBooking(booking);
                    }}
                    onUploadLink={(booking) => {
                        setUploadModalBooking(booking);
                    }}
                />
            )}

        </div>
    );
}
