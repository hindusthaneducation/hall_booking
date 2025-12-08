import { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Building2, Trash2, Edit2, Save } from 'lucide-react';
import type { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
    department_name: string;
};

interface EventDetailsModalProps {
    booking: Booking;
    onClose: () => void;
    onUpdate?: () => void; // Refresh calendar after update/delete
}

export function EventDetailsModal({ booking, onClose, onUpdate }: EventDetailsModalProps) {
    const { profile } = useAuth();
    const canEdit = profile?.role === 'super_admin' || profile?.role === 'principal';

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        event_title: booking.event_title,
        event_description: booking.event_description || '',
        event_time: booking.event_time
    });

    const formatDate = (dateString: string) => {
        // Handle "YYYY-MM-DD" or ISO string safely
        const str = dateString.split('T')[0];
        const [year, month, day] = str.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local midnight

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const { error } = await api.put(`/bookings/${booking.id}`, {
                event_title: formData.event_title,
                event_description: formData.event_description,
                event_time: formData.event_time
            });
            if (error) throw error;
            setIsEditing(false);
            if (onUpdate) onUpdate();
            // We might want to close or just show updated state? 
            // Staying open with updated state is nice.
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update booking');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;

        setLoading(true);
        try {
            const { error } = await api.delete(`/bookings/${booking.id}`);
            if (error) throw error;
            onClose();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete booking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Edit Event' : 'Event Details'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        {isEditing ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    value={formData.event_title}
                                    onChange={e => setFormData({ ...formData, event_title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 hover:border-blue-400 focus:outline-none" // Add hover:border-blue-400 to make it consistent
                                />
                            </div>
                        ) : (
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{formData.event_title}</h3> // Use formData to reflect updates immediately
                        )}

                        {!isEditing && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Date */}
                        <div className="flex items-start text-gray-600">
                            <CalendarIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Date</p>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={formData.booking_date}
                                        onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                                        className="w-full px-2 py-1 mt-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                ) : (
                                    <p className="text-sm">{formatDate(booking.booking_date)}</p>
                                )}
                            </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-start text-gray-600">
                            <Clock className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Time</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.event_time}
                                        onChange={e => setFormData({ ...formData, event_time: e.target.value })}
                                        className="w-full px-2 py-1 mt-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                ) : (
                                    <p className="text-sm">{formData.event_time}</p>
                                )}
                            </div>
                        </div>

                        {/* Department - Read Only */}
                        <div className="flex items-start text-gray-600">
                            <Building2 className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Department</p>
                                <p className="text-sm">{booking.department_name}</p>
                            </div>
                        </div>

                        {/* Description */}
                        {isEditing ? (
                            <div className="flex items-start text-gray-600">
                                <div className="w-5 h-5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                                    <textarea
                                        value={formData.event_description}
                                        onChange={e => setFormData({ ...formData, event_description: e.target.value })}
                                        rows={3}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            (formData.event_description || booking.event_description) && (
                                <div className="flex items-start text-gray-600">
                                    <div className="w-5 h-5 mr-3 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Description</p>
                                        <p className="text-sm">{formData.event_description || booking.event_description}</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-between">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                disabled={loading}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white"
                            >
                                Close
                            </button>

                            {canEdit && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center"
                                        disabled={loading}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
