import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import type { Institution } from '../../lib/types';
import { ImageWithFallback } from '../../components/ImageWithFallback';

export function InstitutionsManagement() {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Institution | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        short_name: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await api.get<Institution[]>('/institutions');
            if (error) throw error;
            if (data) setInstitutions(data);
        } catch (error) {
            console.error('Error fetching institutions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('short_name', formData.short_name);
            if (logoFile) {
                data.append('logo', logoFile);
            }

            if (editingItem) {
                // For PUT request with file, we need to send FormData. 
                // Note: lib/api might default to json. We need to ensure it handles multipart or use fetch directly? 
                // Looking at api wrapper usually handles headers? 
                // If api wrapper is simple, force headers to be undefined so browser sets boundary.
                // Assuming api.put handles this or we pass config.
                // Let's assume standard axios/fetch pattern: if body is FormData, headers set auto.
                const { error } = await api.put(`/institutions/${editingItem.id}`, data as any);
                if (error) throw error;
            } else {
                const { error } = await api.post('/institutions', data as any);
                if (error) throw error;
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Failed to save institution');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will delete all connected departments, users, and halls!')) return;
        try {
            const { error } = await api.delete(`/institutions/${id}`);
            if (error) throw error;
            fetchData();
        } catch (error) {
            alert('Failed to delete institution');
        }
    };

    const handleEdit = (item: Institution) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            short_name: item.short_name || '',
        });
        setLogoFile(null); // Reset file input on edit start
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setFormData({ name: '', short_name: '' });
        setLogoFile(null);
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Institutions</h1>
                    <p className="text-gray-600">Add or edit Colleges/Institutions</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Institution
                </button>
            </div>

            <div className="bg-brand-card rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-base/20">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Short Name</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {institutions?.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <ImageWithFallback
                                        src={item.logo_url}
                                        alt="Logo"
                                        className="h-10 w-10 object-contain"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.name}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{item.short_name || '-'}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(item)} className="text-brand-primary hover:text-brand-secondary mr-3"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between">
                            <h2 className="text-2xl font-semibold text-gray-900">{editingItem ? 'Edit Institution' : 'Add Institution'}</h2>
                            <button onClick={resetForm}><X className="w-5 h-5 text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Institution Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload a PNG or JPG logo.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Short Name (Optional)</label>
                                <input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
