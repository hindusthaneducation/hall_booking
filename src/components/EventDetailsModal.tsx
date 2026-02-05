import { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Building2, Trash2, Edit2, Save, Download, ExternalLink } from 'lucide-react';
import type { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { api, API_URL } from '../lib/api';
import { showToast } from './Toast';
import { downloadFile } from '../lib/utils';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {

    department_name: string;
    start_time?: string;
    end_time?: string;
    is_ac?: boolean;
    is_fan?: boolean;
    is_photography?: boolean;
};

interface EventDetailsModalProps {
    booking: Booking;
    onClose: () => void;
    onUpdate?: () => void; // Refresh calendar after update/delete
}

export function EventDetailsModal({ booking, onClose, onUpdate }: EventDetailsModalProps) {
    const { profile } = useAuth();
    const canEdit = profile?.role === 'super_admin' || profile?.role === 'principal';
    const isPhotography = profile?.role === 'photography_team';

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({
        event_title: booking.event_title,
        event_description: booking.event_description || '',
        event_time: booking.event_time,
        start_time: booking.start_time || '',
        end_time: booking.end_time || '',
        is_ac: booking.is_ac || false,
        is_fan: booking.is_fan || false,
        is_photography: booking.is_photography || false,

        booking_date: booking.booking_date.split('T')[0], // Ensure date format
        reason: '' // Reason for update
    });

    const formatDate = (dateString: string) => {
        const str = dateString.split('T')[0];
        const [year, month, day] = str.split('-').map(Number);
        const date = new Date(year, month - 1, day);

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
            // Update event_time string if times changed
            const timeString = (formData.start_time && formData.end_time)
                ? `${formData.start_time} - ${formData.end_time}`
                : formData.event_time;

            const { error } = await api.put(`/bookings/${booking.id}`, {
                event_title: formData.event_title,
                event_description: formData.event_description,
                event_time: timeString,
                booking_date: formData.booking_date,
                start_time: formData.start_time,


                is_ac: formData.is_ac,
                is_fan: formData.is_fan,
                is_photography: formData.is_photography,
                reason: formData.reason
            });
            if (error) throw error;
            showToast.success('Booking updated successfully');
            setIsEditing(false);
            onClose(); // Close modal after successful update
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('Update failed:', err);
            showToast.error(err.message || 'Failed to update booking');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const reason = prompt("Please enter a reason for deleting this booking:");
        if (reason === null) return; // Cancelled

        setLoading(true);
        try {
            const { error } = await api.delete(`/bookings/${booking.id}`, { reason });
            if (error) throw error;
            showToast.success('Booking deleted successfully');
            onClose();
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('Delete failed:', err);
            showToast.error(err.message || 'Failed to delete booking');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            const { error } = await api.patch(`/bookings/${booking.id}/status`, {
                status: 'approved',
            });

            if (error) throw error;

            showToast.success('Booking approved successfully');
            onClose();
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error approving booking:', error);
            showToast.error(error.message || 'Failed to approve booking');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            showToast.error('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            const { error } = await api.patch(`/bookings/${booking.id}/status`, {
                status: 'rejected',
                rejection_reason: rejectionReason,
            });

            if (error) throw error;

            showToast.success('Booking rejected');
            onClose();
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error rejecting booking:', error);
            showToast.error(error.message || 'Failed to reject booking');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
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

                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Basic Info */}
                        <div className="space-y-6">
                            {/* Title & Status */}
                            <div>
                                {isEditing ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                        <input
                                            type="text"
                                            value={formData.event_title}
                                            onChange={e => setFormData({ ...formData, event_title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 hover:border-blue-400 focus:outline-none"
                                        />
                                    </div>
                                ) : (
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{formData.event_title}</h3>
                                )}

                                {!isEditing && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                        {/* Work Status Badge */}
                                        {booking.work_status === 'completed' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                                                Design Completed
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                                                className="w-full px-2 py-1 mt-1 border border-gray-300 rounded-md text-sm"
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
                                            <div className="flex gap-2 mt-1">
                                                <input
                                                    type="time"
                                                    value={formData.start_time}
                                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                />
                                                <span className="self-center">-</span>
                                                <input
                                                    type="time"
                                                    value={formData.end_time}
                                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm">{formData.event_time}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Department */}
                                <div className="flex items-start text-gray-600">
                                    <Building2 className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Department</p>
                                        <p className="text-sm">{booking.department_name}</p>
                                    </div>
                                </div>

                                {/* Services */}
                                <div className="flex items-start text-gray-600">
                                    <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 mb-1">Additional Services</p>
                                        <div className="flex flex-wrap gap-2">
                                            {isEditing ? (
                                                <>
                                                    <label className="flex items-center space-x-2 border px-2 py-1 rounded bg-white">
                                                        <input type="checkbox" checked={formData.is_ac} onChange={e => setFormData({ ...formData, is_ac: e.target.checked })} />
                                                        <span className="text-sm">AC</span>
                                                    </label>
                                                    <label className="flex items-center space-x-2 border px-2 py-1 rounded bg-white">
                                                        <input type="checkbox" checked={formData.is_fan} onChange={e => setFormData({ ...formData, is_fan: e.target.checked })} />
                                                        <span className="text-sm">Fan</span>
                                                    </label>
                                                    <label className="flex items-center space-x-2 border px-2 py-1 rounded bg-white">
                                                        <input type="checkbox" checked={formData.is_photography} onChange={e => setFormData({ ...formData, is_photography: e.target.checked })} />
                                                        <span className="text-sm">Photography</span>
                                                    </label>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={`px-2 py-1 rounded text-xs border ${formData.is_ac ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>AC: {formData.is_ac ? 'Yes' : 'No'}</span>
                                                    <span className={`px-2 py-1 rounded text-xs border ${formData.is_fan ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>Fan: {formData.is_fan ? 'Yes' : 'No'}</span>
                                                    <span className={`px-2 py-1 rounded text-xs border ${formData.is_photography ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>Photography: {formData.is_photography ? 'Yes' : 'No'}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {isEditing ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                                    <textarea
                                        value={formData.event_description}
                                        onChange={e => setFormData({ ...formData, event_description: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            ) : (
                                (formData.event_description || booking.event_description) && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-900 mb-1">Description</p>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{formData.event_description || booking.event_description}</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Right Column: Additional Details */}
                        <div className="space-y-6">
                            {!isEditing && (
                                <>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm space-y-3">
                                        <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Organizers & Coordinators</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {booking.media_coordinator_name && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Media Coordinator</span>
                                                    <span className="font-medium">{booking.media_coordinator_name}</span>
                                                </div>
                                            )}
                                            {booking.contact_no && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Contact</span>
                                                    <span className="font-medium">{booking.contact_no}</span>
                                                </div>
                                            )}
                                            {booking.event_coordinator_name && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Event Coordinator</span>
                                                    <span className="font-medium">{booking.event_coordinator_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chief Guest */}
                                    {!isPhotography && booking.chief_guest_name && (
                                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-3">Chief Guest</p>
                                            <div className="flex gap-4 items-start">
                                                {booking.chief_guest_photo_url && (
                                                    <img
                                                        src={booking.chief_guest_photo_url.startsWith('http') ? booking.chief_guest_photo_url : `${API_URL}${booking.chief_guest_photo_url}`}
                                                        alt="Chief Guest"
                                                        className="w-16 h-16 object-cover rounded shadow-sm"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{booking.chief_guest_name}</p>
                                                    <p className="text-xs text-gray-500">{booking.chief_guest_designation}</p>
                                                    <p className="text-xs text-gray-500">{booking.chief_guest_organization}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Event Partner */}
                                    {!isPhotography && booking.event_partner_organization && (
                                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                            <p className="text-xs font-semibold uppercase text-gray-500 mb-3">Event Partner</p>
                                            <div className="flex gap-4 items-start">
                                                {booking.event_partner_logo_url && (
                                                    <img
                                                        src={booking.event_partner_logo_url.startsWith('http') ? booking.event_partner_logo_url : `${API_URL}${booking.event_partner_logo_url}`}
                                                        alt="Partner Logo"
                                                        className="w-16 h-16 object-contain rounded border border-gray-100"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{booking.event_partner_organization}</p>
                                                    <p className="text-xs text-gray-500">{booking.event_partner_details}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachments & Final Design */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <p className="text-xs font-semibold uppercase text-gray-500 mb-3">Documents & Assets</p>
                                        <div className="space-y-2">
                                            {booking.files_urls && booking.files_urls.map((url, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => downloadFile(url.startsWith('http') ? url : `${API_URL}${url}`, `attachment_${idx + 1}`)}
                                                    className="w-full flex items-center p-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                                                >
                                                    <Save className="w-4 h-4 mr-2 text-gray-400" />
                                                    Attachment {idx + 1}
                                                </button>
                                            ))}

                                            {booking.final_file_url && (
                                                <button
                                                    onClick={() => downloadFile(booking.final_file_url!, 'final_design_asset')}
                                                    className="w-full flex items-center p-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Final Design Asset
                                                </button>
                                            )}

                                            {/* Photography Link - Hidden from Principal */}
                                            {booking.photography_drive_link && profile?.role !== 'principal' && (
                                                <a
                                                    href={booking.photography_drive_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full flex items-center p-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    View Event Photos
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {isEditing && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Reason for Change (Required)</label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                        rows={3}
                                        placeholder="Reason for editing this booking..."
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm"
                                        required
                                    />
                                </div>
                            )}

                            {!isEditing && profile?.role === 'super_admin' && booking.status === 'pending' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Rejection Reason (Required if rejecting)</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        rows={3}
                                        placeholder="Reason for rejecting this booking..."
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-sm"
                                    />
                                </div>
                            )}
                        </div>
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
                            <div className="flex space-x-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white"
                                >
                                    Close
                                </button>

                                {profile?.role === 'super_admin' && booking.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={handleReject}
                                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                                            disabled={processing}
                                        >
                                            {processing ? 'Processing...' : 'Reject'}
                                        </button>
                                        <button
                                            onClick={handleApprove}
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                                            disabled={processing}
                                        >
                                            {processing ? 'Processing...' : 'Approve'}
                                        </button>
                                    </>
                                )}
                            </div>

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
        </div >
    );
}
