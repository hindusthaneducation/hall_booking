import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Building2, Plus, Edit, Trash2, X, Upload } from 'lucide-react';
import type { Database } from '../../types/database';
import type { Institution } from '../../lib/types';

type Hall = Database['public']['Tables']['halls']['Row'];
type HallInsert = Database['public']['Tables']['halls']['Insert'];

export function HallsManagement() {
  const [halls, setHalls] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [formData, setFormData] = useState<HallInsert>({
    name: '',
    description: '',
    image_url: '',
    stage_size: '',
    seating_capacity: 0,
    hall_type: '',
    is_active: true,
    institution_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hallsRes, institutionsRes] = await Promise.all([
        api.get<Hall[]>('/halls'),
        api.get<Institution[]>('/institutions'),
      ]);

      if (hallsRes.data) setHalls(hallsRes.data);
      if (institutionsRes.data) setInstitutions(institutionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = { ...formData };

      if (editingHall) {
        const { error } = await api.put(`/halls/${editingHall.id}`, payload);
        if (error) throw error;
      } else {
        const { error } = await api.post('/halls', payload);
        if (error) throw error;
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving hall:', error);
      alert('Failed to save hall');
    }
  };

  const handleEdit = (hall: Hall) => {
    setEditingHall(hall);
    setFormData({
      name: hall.name,
      description: hall.description,
      image_url: hall.image_url,
      stage_size: hall.stage_size,
      seating_capacity: hall.seating_capacity,
      hall_type: hall.hall_type,
      is_active: hall.is_active,
      institution_id: hall.institution_id || '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (hall: Hall) => {
    try {
      const { error } = await api.put(`/halls/${hall.id}`, {
        ...hall,
        is_active: !hall.is_active,
      });

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling hall:', error);
      alert('Failed to update hall status');
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formDataObj = new FormData();
    formDataObj.append('image', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingHall(null);
    setUploading(false);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      stage_size: '',
      seating_capacity: 0,
      hall_type: '',
      is_active: true,
      institution_id: '',
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Halls</h1>
          <p className="text-gray-600">Create, edit, and manage hall information</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Hall
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls.map((hall) => {
          // Use joined data from backend OR fallback to lookup
          const instName = hall.institution_short_name || hall.institution_name || institutions.find(i => i.id === hall.institution_id)?.short_name || institutions.find(i => i.id === hall.institution_id)?.name || '-';
          return (
            <div
              key={hall.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${!hall.is_active ? 'opacity-60' : ''
                }`}
            >
              <div className="aspect-video bg-gray-200 overflow-hidden">
                <img src={hall.image_url} alt={hall.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{hall.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded truncate max-w-[150px]" title={instName}>{instName}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hall.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>{hall.hall_type}</span>
                  <span>{hall.seating_capacity} seats</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(hall)}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(hall)}
                    className={`flex-1 px-3 py-2 rounded-md transition-colors ${hall.is_active
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                  >
                    {hall.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {editingHall ? 'Edit Hall' : 'Add New Hall'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Institution Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                <select value={formData.institution_id || ''} onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                  <option value="">Select Institution</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hall Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hall Image</label>
                <div className="flex items-center space-x-4">
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-md border border-gray-200"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-gray-600">
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hall Type</label>
                  <input
                    type="text"
                    value={formData.hall_type || ''}
                    onChange={(e) => setFormData({ ...formData, hall_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Auditorium, Theatre-style"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.seating_capacity || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, seating_capacity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage Size</label>
                <input
                  type="text"
                  value={formData.stage_size || ''}
                  onChange={(e) => setFormData({ ...formData, stage_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 40ft x 30ft"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active || false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingHall ? 'Update Hall' : 'Create Hall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
