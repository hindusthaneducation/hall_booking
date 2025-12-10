import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateLocal } from '../lib/utils';
import { X, Calendar as CalendarIcon, Clock, Building2 } from 'lucide-react';

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
  });
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let approvalLetterUrl = '';



      // if (file) { ... } logic removed

      const { error: insertError } = await api.post('/bookings', {
        hall_id: hallId,
        department_id: departmentId,
        user_id: user?.id!,
        booking_date: formatDateLocal(date),
        event_title: formData.eventTitle,
        event_description: formData.eventDescription,
        event_time: `${formData.startTime} - ${formData.endTime}`,
        start_time: formData.startTime, // HH:mm format
        end_time: formData.endTime, // HH:mm format
        approval_letter_url: approvalLetterUrl,
        status: 'pending',
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
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
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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

            {/* File Upload Removed as per request */}
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
