
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { showToast } from '../../components/Toast';
import { Building2, Calendar, Clock, Search, School } from 'lucide-react';
import type { Database } from '../../types/database';
import { DesigningBookingModal } from '../../components/DesigningBookingModal';

// Using the same Booking type
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
    hall_name: string;
    department_name: string;
    user_name: string;
    institution_name?: string;
};

export function DesigningDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchApprovedBookings();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredBookings(bookings);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredBookings(bookings.filter(b =>
                b.event_title.toLowerCase().includes(lower) ||
                b.hall_name.toLowerCase().includes(lower) ||
                (b.institution_name && b.institution_name.toLowerCase().includes(lower))
            ));
        }
    }, [searchQuery, bookings]);

    const fetchApprovedBookings = async () => {
        try {
            // The backend 'designing_team' role logic returns ALL approved bookings
            const { data, error } = await api.get<Booking[]>('/bookings');

            if (error) throw error;

            if (data) {
                setBookings(data);
                setFilteredBookings(data);
            }
        } catch (error: any) {
            console.error('Error fetching bookings:', error);
            showToast.error(error.message || 'Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
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
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-text">Designing Team Dashboard</h1>
                        <p className="text-gray-500 mt-1">View approved events and download assets</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary w-full md:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                {filteredBookings.length === 0 ? (
                    <div className="text-center py-20 bg-brand-card rounded-2xl shadow-sm border border-gray-200">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg text-gray-500">No approved events found.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(
                            filteredBookings.reduce((acc, booking) => {
                                const instName = booking.institution_name || 'Other Institutions';
                                if (!acc[instName]) acc[instName] = [];
                                acc[instName].push(booking);
                                return acc;
                            }, {} as Record<string, Booking[]>)
                        ).map(([institutionName, institutionBookings]) => (
                            <div key={institutionName}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-brand-primary/10 rounded-lg">
                                        <School className="w-6 h-6 text-brand-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-brand-text">
                                        {institutionName}
                                    </h2>
                                    <div className="h-px bg-gray-200 flex-grow ml-4"></div>
                                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        {institutionBookings.length} Events
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {institutionBookings.map((booking) => (
                                        <div
                                            key={booking.id}
                                            className="bg-brand-card rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-brand-primary/30 transition-all duration-200 cursor-pointer flex flex-col group overflow-hidden"
                                            onClick={() => setSelectedBooking(booking)}
                                        >
                                            {/* Card Header Status Line */}
                                            <div className="h-1 bg-gradient-to-r from-brand-primary to-brand-secondary w-full"></div>

                                            <div className="p-6 flex-grow">
                                                <div className="flex justify-between items-start mb-4">
                                                    {booking.institution_name && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-brand-primary/10 text-brand-primary mb-2">
                                                            <School className="w-3 h-3 mr-1" />
                                                            {booking.institution_name}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-bold text-brand-text mb-3 group-hover:text-brand-primary transition-colors line-clamp-2">
                                                    {booking.event_title}
                                                </h3>

                                                <div className="space-y-2.5 text-sm text-gray-600">
                                                    <div className="flex items-center">
                                                        <Calendar className="w-4 h-4 mr-2.5 text-brand-primary/70 shrink-0" />
                                                        <span>{new Date(booking.booking_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Clock className="w-4 h-4 mr-2.5 text-brand-primary/70 shrink-0" />
                                                        <span>{booking.event_time}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Building2 className="w-4 h-4 mr-2.5 text-brand-primary/70 shrink-0" />
                                                        <span className="truncate">{booking.hall_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto flex justify-between items-center group-hover:bg-brand-primary/5 transition-colors">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Click for details</span>
                                                <span className="text-brand-primary text-sm font-semibold group-hover:translate-x-1 transition-transform">View &rarr;</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedBooking && (
                <DesigningBookingModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                />
            )}
        </div>
    );
}
