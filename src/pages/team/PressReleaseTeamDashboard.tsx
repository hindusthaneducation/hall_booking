import { useState, useEffect } from 'react';
import { api, API_BASE } from '../../lib/api';
import { FileText, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';
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
}

const PressReleaseTeamDashboard = () => {
    const [releases, setReleases] = useState<PressRelease[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReleases();
    }, []);

    const fetchReleases = async () => {
        try {
            setLoading(true);
            const { data, error } = await api.get<PressRelease[]>('/teams/approved-press-releases');
            if (error) throw error;
            if (data) setReleases(data);
        } catch (error: any) {
            console.error('Error fetching approved releases:', error);
            showToast.error(`Failed to fetch: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
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
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <FileText className="mr-2" />
                        Approved Press Releases
                    </h1>
                    <p className="text-gray-500 mt-1">
                        View and download approved press release content.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            ) : releases.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-500">No approved press releases found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {releases.map((req) => (
                        <div key={req.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="border-b border-gray-100 pb-4 mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{req.event_title}</h3>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                        <p><span className="font-semibold">Department:</span> {req.department_name}</p>
                                        <p><span className="font-semibold">Event Date:</span> {new Date(req.event_date).toLocaleDateString()}</p>
                                        <p><span className="font-semibold">Coordinator:</span> {req.coordinator_name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Documents Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                            Documents
                                        </h4>
                                        <div className="space-y-3">
                                            {req.english_writeup ? (
                                                <a
                                                    href={`${API_BASE}${req.english_writeup}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                                                >
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-100">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="ml-3 flex-1">
                                                        <p className="text-sm font-medium text-gray-900">English Write-up</p>
                                                        <p className="text-xs text-gray-500">Click to view/download</p>
                                                    </div>
                                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                </a>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">No English write-up provided.</p>
                                            )}

                                            {req.tamil_writeup && (
                                                <a
                                                    href={`${API_BASE}${req.tamil_writeup}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                                                >
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-100">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="ml-3 flex-1">
                                                        <p className="text-sm font-medium text-gray-900">Tamil Write-up</p>
                                                        <p className="text-xs text-gray-500">Click to view/download</p>
                                                    </div>
                                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Photos Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                            Event Photos
                                        </h4>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {parsePhotos(req.photos).map((photo: string, index: number) => (
                                                <a
                                                    key={index}
                                                    href={`${API_BASE}${photo}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200"
                                                >
                                                    <img
                                                        src={`${API_BASE}${photo}`}
                                                        alt={`Event ${index + 1}`}
                                                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <ExternalLink className="text-white w-6 h-6" />
                                                    </div>
                                                </a>
                                            ))}
                                            {parsePhotos(req.photos).length === 0 && (
                                                <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                                                    <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500">No photos uploaded</p>
                                                </div>
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

export default PressReleaseTeamDashboard;
