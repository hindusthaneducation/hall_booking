import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateLocal } from '../lib/utils';
import { showToast } from './Toast';
import { X, Clock } from 'lucide-react';

interface BookingFormProps {
  hallId: string;
  hallName: string;
  date: Date;
  departmentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface OccupiedSlot {
  id: string;
  start_time: string;
  end_time: string;
  user_role: string;
  user_name: string;
}

export function BookingForm({ hallId, hallName, date, departmentId, onClose, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    eventTitle: '',
    eventDescription: '',
    startTime: '',
    endTime: '',
    isAc: false,
    isFan: false,
    isPhotography: false,
    // New Fields
    mediaCoordinatorName: '',
    contactNo: '',
    chiefGuestName: '',
    chiefGuestDesignation: '',
    chiefGuestOrganization: '',
    eventPartnerOrganization: '',
    eventPartnerDetails: '',
    eventCoordinatorName: '',
    eventConvenorDetails: '',
    inHouseGuest: '',
  });

  // File states
  const [chiefGuestPhoto, setChiefGuestPhoto] = useState<File | null>(null);
  const [eventPartnerLogo, setEventPartnerLogo] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);

  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);

  useEffect(() => {
    if (hallId && date) {
      const fetchOccupancy = async () => {
        try {
          const dateStr = formatDateLocal(date);
          const { data } = await api.get<OccupiedSlot[]>(`/bookings?hall_id=${hallId}&date=${dateStr}&status=approved`);
          // Note: status=approved or pending? User said "already one select". Usually checks approved + pending.
          // Since my API returns all by default (filtered by role), I might need to ensure Department Users can SEE these bookings for availability.
          // My backend logic specifically said: "Department User sees only their own... UNLESS checking availability".
          // So this request should work.
          if (data) {
            // Filter out rejected
            // And format/sort
            setOccupiedSlots(data.filter((b: any) => b.status !== 'rejected').sort((a, b) => a.start_time.localeCompare(b.start_time)));
          }
        } catch (err) {
          console.error("Failed to fetch slots", err);
        }
      };
      fetchOccupancy();
    }
  }, [hallId, date]);
  // const [file, setFile] = useState<File | null>(null); // Feature removed


  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data, error } = await api.post<{ url: string }>('/upload', formData);
    if (error || !data) throw error || new Error('Upload failed');
    return data.url;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Upload Files
      let chiefGuestPhotoUrl = null;
      if (chiefGuestPhoto) {
        chiefGuestPhotoUrl = await uploadFile(chiefGuestPhoto);
      }

      let eventPartnerLogoUrl = null;
      if (eventPartnerLogo) {
        eventPartnerLogoUrl = await uploadFile(eventPartnerLogo);
      }

      const filesUrls: string[] = [];
      if (extraFiles.length > 0) {
        // Upload concurrently
        const uploadPromises = extraFiles.map(file => uploadFile(file));
        const urls = await Promise.all(uploadPromises);
        filesUrls.push(...urls);
      }

      // 2. Submit Booking
      const { error: insertError } = await api.post('/bookings', {
        hall_id: hallId,
        department_id: departmentId,
        user_id: user?.id!,
        booking_date: formatDateLocal(date),
        event_title: formData.eventTitle,
        event_description: formData.eventDescription,
        event_time: `${formData.startTime} - ${formData.endTime}`,
        start_time: formData.startTime,
        end_time: formData.endTime,
        status: 'pending',
        is_ac: formData.isAc,
        is_fan: formData.isFan,
        is_photography: formData.isPhotography,

        // New Fields
        media_coordinator_name: formData.mediaCoordinatorName,
        contact_no: formData.contactNo,
        chief_guest_name: formData.chiefGuestName,
        chief_guest_designation: formData.chiefGuestDesignation,
        chief_guest_organization: formData.chiefGuestOrganization,
        chief_guest_photo_url: chiefGuestPhotoUrl,
        event_partner_organization: formData.eventPartnerOrganization,
        event_partner_details: formData.eventPartnerDetails,
        event_partner_logo_url: eventPartnerLogoUrl,
        event_coordinator_name: formData.eventCoordinatorName,
        event_convenor_details: formData.eventConvenorDetails,
        in_house_guest: formData.inHouseGuest,
        files_urls: filesUrls.length > 0 ? filesUrls : null
      });

      if (insertError) throw insertError;

      showToast.success('Booking request submitted!');
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">New Booking Request</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Hall:</span> {hallName}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Date:</span> {date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title
              </label>
              <input
                id="eventTitle"
                type="text"
                value={formData.eventTitle}
                onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Annual Tech Symposium"
              />
            </div>

            <div>
              <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Event Description
              </label>
              <textarea
                id="eventDescription"
                value={formData.eventDescription}
                onChange={(e) => setFormData({ ...formData, eventDescription: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide details about the event..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-sm font-medium text-gray-700">Optional Services</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-gray-50 bg-white">
                  <input
                    type="checkbox"
                    checked={formData.isAc}
                    onChange={(e) => setFormData({ ...formData, isAc: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">AC</span>
                </label>

                <label className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-gray-50 bg-white">
                  <input
                    type="checkbox"
                    checked={formData.isFan}
                    onChange={(e) => setFormData({ ...formData, isFan: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Fan</span>
                </label>

                <label className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-gray-50 bg-white">
                  <input
                    type="checkbox"
                    checked={formData.isPhotography}
                    onChange={(e) => setFormData({ ...formData, isPhotography: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Photography</span>
                </label>
              </div>
            </div>

            {occupiedSlots.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                <h4 className="text-sm font-medium text-orange-800 mb-2">Occupied Slots:</h4>
                <ul className="space-y-1">
                  {occupiedSlots.map(slot => (
                    <li key={slot.id} className="text-sm text-orange-700 flex items-center">
                      <Clock className="w-3 h-3 mr-2" />
                      <span className="font-medium mr-2">{slot.start_time} - {slot.end_time}</span>
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full capitalize">
                        Booked by {slot.user_role ? slot.user_role.replace('_', ' ') : 'User'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {/* New Sections */}
            <hr className="border-gray-200 my-4" />
            <h3 className="font-semibold text-gray-900">Event Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media Coordinator Name</label>
                <input
                  type="text"
                  value={formData.mediaCoordinatorName}
                  onChange={(e) => setFormData({ ...formData, mediaCoordinatorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <input
                  type="text"
                  value={formData.contactNo}
                  onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Chief Guest Details</h4>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.chiefGuestName}
                    onChange={(e) => setFormData({ ...formData, chiefGuestName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Designation"
                    value={formData.chiefGuestDesignation}
                    onChange={(e) => setFormData({ ...formData, chiefGuestDesignation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Organization"
                    value={formData.chiefGuestOrganization}
                    onChange={(e) => setFormData({ ...formData, chiefGuestOrganization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="mt-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Chief Guest Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setChiefGuestPhoto(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Event Partner</h4>
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={formData.eventPartnerOrganization}
                  onChange={(e) => setFormData({ ...formData, eventPartnerOrganization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                />
                <textarea
                  placeholder="Other Details"
                  value={formData.eventPartnerDetails}
                  onChange={(e) => setFormData({ ...formData, eventPartnerDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  rows={2}
                />
                <div className="mt-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Partner Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEventPartnerLogo(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Coordinator</label>
                  <input
                    type="text"
                    value={formData.eventCoordinatorName}
                    onChange={(e) => setFormData({ ...formData, eventCoordinatorName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">In-house Guest</label>
                  <textarea
                    value={formData.inHouseGuest}
                    onChange={(e) => setFormData({ ...formData, inHouseGuest: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={1}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Convenor Details</label>
                <textarea
                  value={formData.eventConvenorDetails}
                  onChange={(e) => setFormData({ ...formData, eventConvenorDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Files (Max 10, up to 1GB)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      if (files.length > 10) {
                        alert('Max 10 files allowed');
                        return;
                      }
                      setExtraFiles(files);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">{extraFiles.length} file(s) selected</p>
              </div>

            </div>

          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
