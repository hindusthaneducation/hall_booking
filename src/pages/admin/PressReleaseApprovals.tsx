import { useState, useEffect } from 'react';
import { api, API_BASE } from '../../lib/api';
import { CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';
import { showToast } from '../../components/Toast.tsx';

interface PressRelease {
    id: string;
    event_title: string;
    event_date: string;
    coordinator_name: string;
    department_name: string;
    english_writeup: string | null;
    tamil_writeup: string | null;
    photo_description: string | null;
    photos: string; // JSON string
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    institution_name?: string;
    institution_short_name?: string;
}

const PressReleaseApprovals = () => {
    const [requests, setRequests] = useState<PressRelease[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await api.get<PressRelease[]>(`/admin/press-releases?status=${filter}`);
            if (error) throw error;
            if (data) setRequests(data);
        } catch (error: any) {
            console.error('Error fetching press releases:', error);
            showToast.error(`Failed to fetch: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
        if (!window.confirm(`Are you sure you want to ${newStatus} this press release?`)) return;

        try {
            const { error } = await api.put(`/admin/press-releases/${id}/status`, { status: newStatus });
            if (error) throw error;
            showToast.success(`Press release ${newStatus} successfully`);
            fetchRequests(); // Refresh list
        } catch (error) {
            console.error('Error updating status:', error);
            showToast.error('Failed to update status');
        }
    };

    const parsePhotos = (photosJson: string) => {
        try {
            return JSON.parse(photosJson);
        } catch (e) {
            return [];
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileText className="mr-2" />
                    Press Release Approvals
                </h1>
                <div className="flex space-x-2">
                    {(['pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-md capitalize ${filter === s
                                ? 'bg-brand-primary text-white'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-500">No {filter} press releases found.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{req.event_title}</h3>
                                        <div className="mt-1 text-sm text-gray-500 space-y-1">
                                            <p className="flex items-center text-brand-primary font-bold">
                                                <span className="bg-brand-primary/10 px-2 py-0.5 rounded text-xs uppercase tracking-wider mr-2 border border-brand-primary/20 italic">
                                                    College
                                                </span>
                                                {req.institution_short_name || req.institution_name}
                                            </p>
                                            <p>Event Date: {new Date(req.event_date).toLocaleDateString()}</p>
                                            <p>Department: <span className="font-medium text-gray-700">{req.department_name}</span></p>
                                            <p>Coordinator: {req.coordinator_name}</p>
                                            <p>Submitted: {new Date(req.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'approved')}
                                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {req.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Documents</h4>
                                        <div className="space-y-2">
                                            {req.english_writeup && (
                                                <a href={`${API_BASE}${req.english_writeup}`} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    English Write-up
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                                </a>
                                            )}
                                            {req.tamil_writeup && (
                                                <a href={`${API_BASE}${req.tamil_writeup}`} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Tamil Write-up
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                                </a>
                                            )}
                                            {req.photo_description && (
                                                <a href={`${API_BASE}${req.photo_description}`} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Photo Description
                                                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Photos ({parsePhotos(req.photos).length})</h4>
                                        <div className="grid grid-cols-4 gap-2">
                                            {parsePhotos(req.photos).map((photo: string, index: number) => (
                                                <a key={index} href={`${API_BASE}${photo}`} target="_blank" rel="noopener noreferrer" className="block aspect-square relative group">
                                                    <img src={`${API_BASE}${photo}`} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded shadow-sm" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                                        <ExternalLink className="text-white w-5 h-5" />
                                                    </div>
                                                </a>
                                            ))}
                                            {parsePhotos(req.photos).length === 0 && (
                                                <p className="text-sm text-gray-400 col-span-4 italic">No photos attached.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PressReleaseApprovals;
