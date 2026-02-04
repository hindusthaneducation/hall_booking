
import { useState } from 'react';
import { X, Save, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { showToast } from '../Toast';
import type { Database } from '../../types/database';

type Booking = Database['public']['Tables']['bookings']['Row'];

interface PhotographyUploadModalProps {
    booking: Booking;
    onClose: () => void;
    onUpdate: () => void;
}

export function PhotographyUploadModal({ booking, onClose, onUpdate }: PhotographyUploadModalProps) {
    const [driveLink, setDriveLink] = useState(booking.photography_drive_link || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await api.put(`/bookings/${booking.id}`, {
                photography_drive_link: driveLink
            });

            if (error) throw error;
            showToast.success('Drive link saved successfully');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Failed to save link:', err);
            showToast.error(err.message || 'Failed to save drive link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Upload Event Photos</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-900 text-sm mb-1">{booking.event_title}</h4>
                        <p className="text-xs text-blue-700">
                            {new Date(booking.booking_date).toLocaleDateString()} | {booking.event_time}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Link</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LinkIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="url"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="https://drive.google.com/..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Paste the shareable link to the event folder.
                        </p>
                    </div>

                    {driveLink && (
                        <div className="flex justify-end">
                            <a
                                href={driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                Test Link <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
