
import { useState } from 'react';
import { X, Building2, Calendar, Clock, User, School, MapPin, Phone, Briefcase, FileText, Download } from 'lucide-react';
import { downloadFile, formatDateLocal } from '../lib/utils';
import type { Database } from '../types/database';

// Reusing the Booking type
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type Booking = BookingRow & {
    hall_name: string;
    department_name: string;
    user_name: string;
    institution_name?: string;
};

interface DesigningBookingModalProps {
    booking: Booking;
    onClose: () => void;
}

export function DesigningBookingModal({ booking, onClose }: DesigningBookingModalProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Upload using raw fetch for FormData handling
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
            const response = await fetch(`${baseUrl}/bookings/${booking.id}/final-design`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type, let browser set boundary
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const resData = await response.json();

            // Optimistically update or just alert
            booking.work_status = 'completed';
            booking.final_file_url = resData.final_file_url;
            alert('File uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-brand-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center text-white px-4">
                        <h2 className="text-3xl font-bold tracking-tight mb-2 opacity-95">Event Details</h2>
                        <div className="flex items-center justify-center gap-2 text-white/90 text-sm font-medium uppercase tracking-wider">
                            <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Approved</span>
                            <span>•</span>
                            <span>{booking.institution_name || 'Hindusthan Institutions'}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">

                    {/* Section 1: Event Basic Info */}
                    <div className="bg-brand-base border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                            <div className="space-y-2 flex-grow">
                                <h3 className="text-2xl font-bold text-brand-text">{booking.event_title}</h3>
                                <p className="text-gray-600 leading-relaxed max-w-2xl">{booking.event_description || 'No description provided.'}</p>
                            </div>
                            <div className="flex flex-col gap-3 min-w-[200px]">
                                <div className="flex items-center text-gray-700 font-medium">
                                    <Calendar className="w-5 h-5 mr-3 text-brand-primary" />
                                    {formatDateLocal(new Date(booking.booking_date))}
                                </div>
                                <div className="flex items-center text-gray-700 font-medium">
                                    <Clock className="w-5 h-5 mr-3 text-brand-primary" />
                                    {booking.event_time}
                                </div>
                                <div className="flex items-center text-gray-700 font-medium">
                                    <MapPin className="w-5 h-5 mr-3 text-brand-primary" />
                                    {booking.hall_name}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-8">


                            {/* Department Info */}
                            <section>
                                <h4 className="text-lg font-bold text-brand-text border-b border-gray-200 pb-2 mb-4 flex items-center">
                                    <School className="w-5 h-5 mr-2 text-brand-primary" />
                                    Department & Coordinator
                                </h4>
                                <div className="space-y-4">
                                    <div className="bg-brand-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Department</p>
                                        <p className="text-brand-text font-medium text-lg">{booking.department_name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-brand-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Media Coordinator</p>
                                            <p className="text-brand-text font-medium break-words">{booking.media_coordinator_name || 'N/A'}</p>
                                        </div>
                                        <div className="bg-brand-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Contact No</p>
                                            <p className="text-brand-text font-medium flex items-center">
                                                <Phone className="w-3 h-3 mr-1 text-gray-400" />
                                                {booking.contact_no || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Event People */}
                            <section>
                                <h4 className="text-lg font-bold text-brand-text border-b border-gray-200 pb-2 mb-4 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-brand-primary" />
                                    Organizers
                                </h4>
                                <div className="bg-brand-primary/5 rounded-xl p-5 space-y-3 border border-brand-primary/20">
                                    <div className="flex justify-between border-b border-brand-primary/10 pb-2">
                                        <span className="text-gray-600 font-medium">Event Coordinator</span>
                                        <span className="text-brand-text font-semibold">{booking.event_coordinator_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col pb-2">
                                        <span className="text-gray-600 font-medium mb-1">Convenor Details</span>
                                        <span className="text-brand-text text-sm whitespace-pre-wrap">{booking.event_convenor_details || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col pt-2 border-t border-brand-primary/10">
                                        <span className="text-gray-600 font-medium mb-1">In-house Guest</span>
                                        <span className="text-brand-text text-sm whitespace-pre-wrap">{booking.in_house_guest || 'N/A'}</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-8">

                            {/* Chief Guest */}
                            <section>
                                <h4 className="text-lg font-bold text-brand-text border-b border-gray-200 pb-2 mb-4 flex items-center">
                                    <Briefcase className="w-5 h-5 mr-2 text-brand-primary" />
                                    Chief Guest
                                </h4>
                                {booking.chief_guest_name ? (
                                    <div className="flex items-start gap-4 bg-brand-card border border-gray-200 rounded-xl p-5 shadow-sm">
                                        {booking.chief_guest_photo_url ? (
                                            <div className="relative group shrink-0">
                                                <img
                                                    src={booking.chief_guest_photo_url.startsWith('http') ? booking.chief_guest_photo_url : `http://localhost:5001/api${booking.chief_guest_photo_url}`}
                                                    alt="Chief Guest"
                                                    className="w-24 h-24 object-cover rounded-lg shadow-md bg-gray-100"
                                                />
                                                <button
                                                    onClick={() => downloadFile(
                                                        booking.chief_guest_photo_url?.startsWith('http') ? booking.chief_guest_photo_url : `http://localhost:5001/api${booking.chief_guest_photo_url}`,
                                                        `chief_guest_${booking.id}`
                                                    )}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white"
                                                    title="Download Photo"
                                                >
                                                    <Download className="w-6 h-6" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                                <User className="w-10 h-10" />
                                            </div>
                                        )}
                                        <div className="flex-grow">
                                            <h5 className="text-xl font-bold text-brand-text">{booking.chief_guest_name}</h5>
                                            <p className="text-gray-600 font-medium">{booking.chief_guest_designation}</p>
                                            <p className="text-gray-500 text-sm mt-1">{booking.chief_guest_organization}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No Chief Guest details available.</p>
                                )}
                            </section>

                            {/* Partner */}
                            <section>
                                <h4 className="text-lg font-bold text-brand-text border-b border-gray-200 pb-2 mb-4 flex items-center">
                                    <Briefcase className="w-5 h-5 mr-2 text-brand-primary" />
                                    Event Partner
                                </h4>
                                {booking.event_partner_organization ? (
                                    <div className="flex items-start gap-4 bg-brand-card border border-gray-200 rounded-xl p-5 shadow-sm">
                                        {booking.event_partner_logo_url ? (
                                            <div className="relative group shrink-0">
                                                <img
                                                    src={booking.event_partner_logo_url.startsWith('http') ? booking.event_partner_logo_url : `http://localhost:5001/api${booking.event_partner_logo_url}`}
                                                    alt="Partner Logo"
                                                    className="w-24 h-24 object-contain align-middle rounded-lg bg-white border border-gray-100 p-1"
                                                />
                                                <button
                                                    onClick={() => downloadFile(
                                                        booking.event_partner_logo_url?.startsWith('http') ? booking.event_partner_logo_url : `http://localhost:5001/api${booking.event_partner_logo_url}`,
                                                        `partner_logo_${booking.id}`
                                                    )}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white"
                                                    title="Download Logo"
                                                >
                                                    <Download className="w-6 h-6" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                                <Building2 className="w-10 h-10" />
                                            </div>
                                        )}
                                        <div className="flex-grow">
                                            <h5 className="text-xl font-bold text-brand-text">{booking.event_partner_organization}</h5>
                                            <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{booking.event_partner_details}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No Event Partner details available.</p>
                                )}
                            </section>

                        </div>
                    </div>

                    {/* Attachments Footer */}
                    {booking.files_urls && Array.isArray(booking.files_urls) && booking.files_urls.length > 0 && (
                        <div className="pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                Attached Files
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {booking.files_urls.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => downloadFile(
                                            url.startsWith('http') ? url : `http://localhost:5001/api${url}`,
                                            `attachment_${idx + 1}_${booking.id}`
                                        )}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-brand-text rounded-lg text-sm font-medium transition-colors border border-gray-200"
                                    >
                                        <Download className="w-4 h-4" />
                                        File {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Work Status & Final Upload Section */}
                    <div className="pt-8 border-t-2 border-dashed border-gray-200">
                        <h4 className="text-xl font-bold text-brand-text mb-4 flex items-center">
                            <Briefcase className="w-6 h-6 mr-2 text-brand-primary" />
                            Work Status
                        </h4>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Current Status</p>
                                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${booking.work_status === 'completed'
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                        }`}>
                                        {booking.work_status === 'completed' ? (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                                Completed
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
                                                Pending Design
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 w-full md:w-auto">
                                    {booking.work_status === 'completed' ? (
                                        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                                            <div className="p-3 bg-green-50 rounded-full">
                                                <FileText className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-gray-900">Final Design Uploaded</p>
                                                <button
                                                    onClick={() => booking.final_file_url && downloadFile(
                                                        booking.final_file_url.startsWith('http') ? booking.final_file_url : `http://localhost:5001/api${booking.final_file_url}`,
                                                        `final_design_${booking.id}`
                                                    )}
                                                    className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline flex items-center mt-1"
                                                >
                                                    <Download className="w-3 h-3 mr-1" />
                                                    Download Final Asset
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setIsUploading(true)}
                                                className="text-sm text-gray-400 hover:text-gray-600 underline"
                                            >
                                                Re-upload
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Upload Final Design Asset
                                            </label>
                                            <div className="flex gap-4">
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    disabled={isUploading}
                                                    className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-brand-primary file:text-white
                                                    hover:file:bg-brand-secondary
                                                    disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                />
                                                {isUploading && (
                                                    <div className="flex items-center text-brand-primary animate-pulse">
                                                        <Clock className="w-5 h-5 mr-2" />
                                                        <span>Uploading...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Uploading a file will automatically mark this work as <strong>Completed</strong>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Re-upload Logic (Hidden unless state triggers it, handled by condition above mostly) */}
                            {isUploading && booking.work_status === 'completed' && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Upload New Version:</p>
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
