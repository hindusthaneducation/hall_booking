import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import { Save, Upload, FileText, CheckCircle, AlertCircle, X, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PressRelease() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [eligibleEvents, setEligibleEvents] = useState<any[]>([]);
    const [overdueEvents, setOverdueEvents] = useState<any[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState('');

    const [formData, setFormData] = useState({
        coordinator_name: '',
        event_title: '',
        event_date: ''
    });

    useEffect(() => {
        fetchEligibleEvents();
        fetchOverdue();
    }, []);

    const fetchOverdue = async () => {
        try {
            const { data } = await api.get<any[]>('/notifications/press-release-overdue');
            if (data) setOverdueEvents(data);
        } catch (err) {
            console.error('Failed to fetch overdue events:', err);
        }
    };

    const fetchEligibleEvents = async () => {
        try {
            const { data, error } = await api.get<any[]>('/bookings/pending-press-release');
            if (error) throw error;
            setEligibleEvents(data || []);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    };

    const [files, setFiles] = useState<{
        english_writeup: File | null;
        tamil_writeup: File | null;
        photo_description: File | null;
        photos: File[];
    }>({
        english_writeup: null,
        tamil_writeup: null,
        photo_description: null,
        photos: []
    });

    const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({});

    const handleDrag = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(prev => ({ ...prev, [field]: true }));
        } else if (e.type === 'dragleave') {
            setDragActive(prev => ({ ...prev, [field]: false }));
        }
    };

    const validateFile = (file: File, type: 'image' | 'doc') => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            showToast.error(`File "${file.name}" exceeds 50MB limit.`);
            return false;
        }
        if (type === 'image' && !file.type.startsWith('image/')) {
            showToast.error(`File "${file.name}" is not a valid image.`);
            return false;
        }
        if (type === 'doc' && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
            // Allow generic check if strict mime types fail, but warn
            if (!file.name.match(/\.(doc|docx|pdf)$/i)) {
                showToast.error(`File "${file.name}" is not a valid document (PDF/DOC).`);
                return false;
            }
        }
        return true;
    };

    const handleDrop = (e: React.DragEvent, field: keyof typeof files) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(prev => ({ ...prev, [field]: false }));

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files, field);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files, field);
        }
    };

    const processFiles = (fileList: FileList, field: keyof typeof files) => {
        if (field === 'photos') {
            const newPhotos: File[] = [];
            Array.from(fileList).forEach(file => {
                if (validateFile(file, 'image')) {
                    newPhotos.push(file);
                }
            });
            setFiles(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
        } else {
            const file = fileList[0];
            if (validateFile(file, 'doc')) {
                setFiles(prev => ({ ...prev, [field]: file }));
            }
        }
    };

    const removePhoto = (index: number) => {
        setFiles(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const removeDoc = (field: keyof typeof files) => {
        setFiles(prev => ({ ...prev, [field]: null }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!selectedBookingId || !formData.coordinator_name) {
            showToast.error('Please fill all required fields');
            return;
        }

        if (!confirm("Are you sure you want to submit? This cannot be edited later.")) {
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('booking_id', selectedBookingId);
        data.append('coordinator_name', formData.coordinator_name);
        data.append('event_title', formData.event_title);
        data.append('event_date', formData.event_date);

        if (files.english_writeup) data.append('english_writeup', files.english_writeup);
        if (files.tamil_writeup) data.append('tamil_writeup', files.tamil_writeup);
        if (files.photo_description) data.append('photo_description', files.photo_description);

        if (files.photos.length > 0) {
            files.photos.forEach(photo => {
                data.append('photos', photo);
            });
        }

        try {
            const { error } = await api.post('/press-releases', data);
            if (error) throw error;

            setSuccess(true);
            showToast.success('Press Release submitted successfully!');
            // Reset form
            setFormData({ coordinator_name: '', event_title: '', event_date: '' });
            setSelectedBookingId('');
            setFiles({ english_writeup: null, tamil_writeup: null, photo_description: null, photos: [] });

            // Refresh lists
            fetchEligibleEvents();
            fetchOverdue();
        } catch (err: any) {
            console.error('Submission failed:', err);
            showToast.error(err.message || 'Failed to submit press release');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
                <p className="text-gray-600 mb-6">Your press release data has been securely submitted.</p>
                <button
                    onClick={() => setSuccess(false)}
                    className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary"
                >
                    Submit Another
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-brand-primary/5 p-6 border-b border-brand-primary/10">
                    <h1 className="text-2xl font-bold text-brand-text flex items-center">
                        <FileText className="w-6 h-6 mr-2 text-brand-primary" />
                        Press Release Submission
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Submit event details and media for press release.
                        <span className="font-semibold text-red-500 ml-1">Note: Cannot be edited after submission.</span>
                    </p>
                </div>

                {overdueEvents.length > 0 && (
                    <div className="p-6 bg-red-50 border-b border-red-100">
                        <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">Action Required: Overdue Submissions</h3>
                                <p className="text-xs text-red-700 mt-1">
                                    The following events have ended but haven't had their press release submitted yet:
                                </p>
                                <ul className="mt-2 space-y-1">
                                    {overdueEvents.map(event => (
                                        <li key={event.id} className="text-xs text-red-600 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                                            {event.event_title} ({new Date(event.booking_date).toLocaleDateString()})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Event <span className="text-red-500">*</span>
                            </label>

                            {eligibleEvents.length === 0 && !loading ? (
                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                                    No events are currently eligible for press release submission (Must be approved and event date reached).
                                </div>
                            ) : (
                                <select
                                    required
                                    value={selectedBookingId}
                                    onChange={e => {
                                        const bId = e.target.value;
                                        setSelectedBookingId(bId);
                                        const event = eligibleEvents.find(ev => ev.id === bId);
                                        if (event) {
                                            setFormData(prev => ({
                                                ...prev,
                                                event_title: event.event_title,
                                                event_date: event.booking_date.split('T')[0],
                                                coordinator_name: event.event_coordinator_name || ''
                                            }));
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                >
                                    <option value="">-- Select an Event --</option>
                                    {eligibleEvents.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.event_title} ({new Date(event.booking_date).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name of the Coordinator <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.coordinator_name}
                                onChange={e => setFormData({ ...formData, coordinator_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                disabled
                                value={profile?.department?.name || profile?.department_id || ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 mt-1">Auto-filled from your profile</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Institution <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                disabled
                                value={profile?.institution?.name || ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 mt-1">Auto-filled from your profile</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Title
                            </label>
                            <input
                                type="text"
                                disabled
                                value={formData.event_title}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Date
                            </label>
                            <input
                                type="text"
                                disabled
                                value={formData.event_date ? new Date(formData.event_date).toLocaleDateString() : ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 my-6"></div>

                    {/* File Uploads */}
                    <div className="space-y-6">

                        {/* English Write-up */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                English Write-up
                            </label>
                            <div
                                onDragEnter={(e) => handleDrag(e, 'english_writeup')}
                                onDragLeave={(e) => handleDrag(e, 'english_writeup')}
                                onDragOver={(e) => handleDrag(e, 'english_writeup')}
                                onDrop={(e) => handleDrop(e, 'english_writeup')}
                                className={cn(
                                    "flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors",
                                    dragActive.english_writeup ? "border-brand-primary bg-brand-primary/5" : "border-gray-300 hover:border-brand-primary"
                                )}
                            >
                                <div className="space-y-1 text-center w-full">
                                    {files.english_writeup ? (
                                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200 text-left">
                                            <div className="flex items-center overflow-hidden">
                                                <FileText className="w-8 h-8 text-green-600 mr-3 shrink-0" />
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-green-800 truncate">{files.english_writeup.name}</p>
                                                    <p className="text-xs text-green-600">{(files.english_writeup.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDoc('english_writeup')}
                                                className="p-1 hover:bg-green-100 rounded-full text-green-700 transition-colors ml-2"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className={cn("mx-auto h-12 w-12", dragActive.english_writeup ? "text-brand-primary" : "text-gray-400")} />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="english-file" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="english-file" name="english-file" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'english_writeup')} accept=".doc,.docx,.pdf" />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                PDF or Word up to 50MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tamil Write-up */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Tamil Write-up
                            </label>
                            <div
                                onDragEnter={(e) => handleDrag(e, 'tamil_writeup')}
                                onDragLeave={(e) => handleDrag(e, 'tamil_writeup')}
                                onDragOver={(e) => handleDrag(e, 'tamil_writeup')}
                                onDrop={(e) => handleDrop(e, 'tamil_writeup')}
                                className={cn(
                                    "flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors",
                                    dragActive.tamil_writeup ? "border-brand-primary bg-brand-primary/5" : "border-gray-300 hover:border-brand-primary"
                                )}
                            >
                                <div className="space-y-1 text-center w-full">
                                    {files.tamil_writeup ? (
                                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200 text-left">
                                            <div className="flex items-center overflow-hidden">
                                                <FileText className="w-8 h-8 text-green-600 mr-3 shrink-0" />
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-green-800 truncate">{files.tamil_writeup.name}</p>
                                                    <p className="text-xs text-green-600">{(files.tamil_writeup.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDoc('tamil_writeup')}
                                                className="p-1 hover:bg-green-100 rounded-full text-green-700 transition-colors ml-2"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className={cn("mx-auto h-12 w-12", dragActive.tamil_writeup ? "text-brand-primary" : "text-gray-400")} />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="tamil-file" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="tamil-file" name="tamil-file" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'tamil_writeup')} accept=".doc,.docx,.pdf" />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                PDF or Word up to 50MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Photos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Photos (Upload up to 10)
                            </label>
                            <div
                                onDragEnter={(e) => handleDrag(e, 'photos')}
                                onDragLeave={(e) => handleDrag(e, 'photos')}
                                onDragOver={(e) => handleDrag(e, 'photos')}
                                onDrop={(e) => handleDrop(e, 'photos')}
                                className={cn(
                                    "px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors",
                                    dragActive.photos ? "border-brand-primary bg-brand-primary/5" : "border-gray-300 hover:border-brand-primary"
                                )}
                            >
                                <div className="space-y-1 text-center">
                                    <Upload className={cn("mx-auto h-12 w-12", dragActive.photos ? "text-brand-primary" : "text-gray-400")} />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label htmlFor="photos-file" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                            <span>Upload images</span>
                                            <input id="photos-file" name="photos-file" type="file" multiple className="sr-only" onChange={(e) => handleFileChange(e, 'photos')} accept="image/*" />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Max 50MB per file
                                    </p>
                                </div>

                                {/* Photo List */}
                                {files.photos.length > 0 && (
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {files.photos.map((file, idx) => (
                                            <div key={idx} className="relative group bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center">
                                                <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    <ImageIcon className="w-6 h-6 text-gray-500" />
                                                </div>
                                                <div className="ml-3 min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>
                                                        {file.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Photo Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Photo Description
                            </label>
                            <div
                                onDragEnter={(e) => handleDrag(e, 'photo_description')}
                                onDragLeave={(e) => handleDrag(e, 'photo_description')}
                                onDragOver={(e) => handleDrag(e, 'photo_description')}
                                onDrop={(e) => handleDrop(e, 'photo_description')}
                                className={cn(
                                    "flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors",
                                    dragActive.photo_description ? "border-brand-primary bg-brand-primary/5" : "border-gray-300 hover:border-brand-primary"
                                )}
                            >
                                <div className="space-y-1 text-center w-full">
                                    {files.photo_description ? (
                                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200 text-left">
                                            <div className="flex items-center overflow-hidden">
                                                <FileText className="w-8 h-8 text-green-600 mr-3 shrink-0" />
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-green-800 truncate">{files.photo_description.name}</p>
                                                    <p className="text-xs text-green-600">{(files.photo_description.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDoc('photo_description')}
                                                className="p-1 hover:bg-green-100 rounded-full text-green-700 transition-colors ml-2"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className={cn("mx-auto h-12 w-12", dragActive.photo_description ? "text-brand-primary" : "text-gray-400")} />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="desc-file" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="desc-file" name="desc-file" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'photo_description')} accept=".doc,.docx,.pdf" />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                PDF or Word up to 50MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="flex items-center justify-end pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center px-6 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all ${overdueEvents.length > 0 ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-brand-primary hover:bg-brand-secondary'
                                }`}
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    {overdueEvents.length > 0 ? 'Submit Overdue Press Release' : 'Submit Press Release'}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
