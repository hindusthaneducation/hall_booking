import { X, Clock, MapPin, Link as LinkIcon, Edit2, AlertCircle } from 'lucide-react';
import type { Database } from '../../types/database';

type Booking = Database['public']['Tables']['bookings']['Row'] & {
    hall_name: string;
    department_name: string;
    institution_name?: string;
    user_name: string;
    institution_short_name?: string;
};

interface DayEventsModalProps {
    date: Date;
    events: Booking[];
    onClose: () => void;
    onSelectEvent: (booking: Booking) => void;
    onUploadLink: (booking: Booking) => void;
}

export function DayEventsModal({ date, events, onClose, onSelectEvent, onUploadLink }: DayEventsModalProps) {

    const getEventStatus = (event: Booking) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventDate = new Date(event.booking_date);
        eventDate.setHours(0, 0, 0, 0);

        if (event.photography_drive_link) return 'completed';
        if (eventDate.getTime() === today.getTime()) return 'today';
        if (eventDate < today) return 'overdue';
        return 'future';
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-50 border-green-200 hover:border-green-300';
            case 'today':
                return 'bg-purple-50 border-purple-200 hover:border-purple-300';
            case 'overdue':
                return 'bg-red-50 border-red-200 hover:border-red-300';
            default:
                return 'bg-white border-gray-200 hover:border-brand-primary/50';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-green-100 text-green-800">Uploaded</span>;
            case 'today':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Today</span>;
            case 'overdue':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Missing Upload</span>;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{events.length} Events scheduled</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    {events.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No events scheduled for this day.</p>
                    ) : (
                        events.map(event => {
                            const status = getEventStatus(event);
                            const styles = getStatusStyles(status);

                            return (
                                <div
                                    key={event.id}
                                    className={`group border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${styles}`}
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                {event.institution_short_name && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/50 text-gray-600 border border-gray-200">
                                                        {event.institution_short_name}
                                                    </span>
                                                )}
                                                {getStatusBadge(status)}
                                            </div>
                                            <h4 className="font-semibold text-gray-900 truncate group-hover:text-brand-primary transition-colors">
                                                {event.event_title}
                                            </h4>
                                        </div>
                                        {event.photography_drive_link ? (
                                            <div className="p-1.5 bg-green-100 rounded-full" title="Link Uploaded">
                                                <LinkIcon className="w-4 h-4 text-green-600" />
                                            </div>
                                        ) : status === 'overdue' ? (
                                            <div className="p-1.5 bg-red-100 rounded-full" title="Upload Missing">
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                            </div>
                                        ) : (
                                            <div className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100">
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center">
                                            <Clock className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                            <span>{event.event_time}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                            <span className="truncate">{event.hall_name}</span>
                                        </div>
                                    </div>

                                    <div className={`flex justify-end pt-2 border-t ${status === 'completed' ? 'border-green-200' : status === 'overdue' ? 'border-red-200' : status === 'today' ? 'border-purple-200' : 'border-gray-50'}`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUploadLink(event);
                                            }}
                                            className={`text-xs font-medium flex items-center px-3 py-1.5 rounded border transition-all ${status === 'completed'
                                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                                : status === 'overdue'
                                                    ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                                                    : 'bg-white text-brand-primary border-gray-200 hover:border-brand-primary/30 hover:bg-brand-base'
                                                }`}
                                        >
                                            <Edit2 className="w-3 h-3 mr-1.5" />
                                            {event.photography_drive_link ? 'Edit Drive Link' : 'Upload Drive Link'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
