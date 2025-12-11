import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Building2, Plus, Edit, Trash2, X, Upload, ArrowLeft, Search, GraduationCap, Users } from 'lucide-react';
import type { Database } from '../../types/database';
import type { Institution, User } from '../../lib/types';
import HindusthanLogo from '../../images/hindusthan_logo.webp';
import { ImageWithFallback } from '../../components/ImageWithFallback';

type Hall = Database['public']['Tables']['halls']['Row'];
type HallInsert = Database['public']['Tables']['halls']['Insert'];

export function HallsManagement() {
  const [halls, setHalls] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInstId, setSelectedInstId] = useState<string | null>(searchParams.get('institution_id'));
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
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

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Sync state with URL
  useEffect(() => {
    const id = searchParams.get('institution_id');
    setSelectedInstId(id);
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [hallsRes, institutionsRes, usersRes] = await Promise.all([
        api.get<Hall[]>('/halls'),
        api.get<Institution[]>('/institutions'),
        api.get<User[]>('/users'),
      ]);

      if (hallsRes.data) setHalls(hallsRes.data);
      if (institutionsRes.data) setInstitutions(institutionsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = (id: string) => {
    setSearchParams({ institution_id: id });
    setSelectedInstId(id);
    setSearchQuery('');
  };

  const handleBackToGrid = () => {
    setSearchParams({});
    setSelectedInstId(null);
    setSearchQuery('');
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
      const { error } = await api.put(`/halls/${hall.id}`, { ...hall, is_active: !hall.is_active });
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Failed to update hall status');
    }
  };

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
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.url }));
    } catch (error) {
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
      institution_id: selectedInstId || '', // Auto-select if inside detail view
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  // --- View Logic ---

  // 1. Detail View (Selected Institution)
  if (selectedInstId) {
    const institution = institutions.find(i => i.id === selectedInstId);
    const filteredHalls = halls
      .filter(h => h.institution_id === selectedInstId)
      .filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.hall_type.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Calculate Counts
    const instUsers = users.filter(u => u.institution_id === selectedInstId);
    const hodCount = instUsers.filter(u => u.role === 'department_user').length;
    const principalCount = instUsers.filter(u => u.role === 'principal').length;

    if (!institution) return <div className="p-8">Institution not found. <button onClick={handleBackToGrid} className="text-blue-600 underline">Go Back</button></div>;

    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div className="flex items-start space-x-4">
            <button onClick={handleBackToGrid} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
                {institution.logo_url ? (
                  <img src={`${import.meta.env.VITE_API_BASE_URL}${institution.logo_url}`} alt="Logo" className="w-8 h-8 object-contain mr-2" />
                ) : (
                  <img src={HindusthanLogo} alt="Logo" className="w-8 h-8 object-contain mr-2" />
                )}
                {institution.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 ml-8">
                <span className="flex items-center px-3 py-1 bg-gray-100 rounded-full">
                  <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                  {filteredHalls.length} Halls
                </span>
                <span className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full">
                  <Users className="w-4 h-4 mr-2" />
                  {hodCount} HODs
                </span>
                <span className="flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  {principalCount} Principals
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search halls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, institution_id: selectedInstId }));
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Hall
            </button>
          </div>
        </div>

        {filteredHalls.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchQuery ? `No halls found matching "${searchQuery}"` : 'No halls found for this institution.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, institution_id: selectedInstId }));
                  setShowForm(true);
                }}
                className="mt-2 text-blue-600 font-medium hover:underline"
              >
                Add the first hall
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHalls.map((hall) => (
              <div
                key={hall.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${!hall.is_active ? 'opacity-60' : ''}`}
              >
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img
                    src={hall.image_url?.startsWith('http') ? hall.image_url : `${import.meta.env.VITE_API_BASE_URL}${hall.image_url}`}
                    alt={hall.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{hall.name}</h3>
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
            ))}
          </div>
        )}

        {renderForm(showForm, editingHall, formData, setFormData, handleSubmit, resetForm, handleImageUpload, uploading, institutions, selectedInstId)}
      </div>
    );
  }

  // 2. Grid View (All Institutions)
  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Halls</h1>
          <p className="text-gray-600">Select an institution to manage its halls</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search colleges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInstitutions.map(inst => {
          const count = halls.filter(h => h.institution_id === inst.id).length;
          return (
            <div
              key={inst.id}
              onClick={() => handleSelectInstitution(inst.id)}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
            >
              <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                <ImageWithFallback
                  src={inst.logo_url}
                  alt={inst.name}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{inst.name}</h3>
              <p className="text-sm text-gray-500">{inst.short_name}</p>
              <div className="mt-4 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {count} Halls
              </div>
            </div>
          )
        })}
        {filteredInstitutions.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No institutions found matching "{searchQuery}".
          </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, institution_id: '' }));
            setShowForm(true);
          }}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Hall Directly
        </button>
      </div>

      {renderForm(showForm, editingHall, formData, setFormData, handleSubmit, resetForm, handleImageUpload, uploading, institutions, null)}
    </div>
  );
}

// Helper to render form to avoid duplication
function renderForm(showForm: boolean, editingHall: any, formData: any, setFormData: any, handleSubmit: any, resetForm: any, handleImageUpload: any, uploading: boolean, institutions: Institution[], lockedInstId: string | null) {
  if (!showForm) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              {editingHall ? 'Edit Hall' : 'Add New Hall'}
            </h2>
            <button onClick={resetForm} className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
            <select
              value={formData.institution_id || ''}
              onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
              required
              disabled={!!lockedInstId}
              className={`w-full px-3 py-2 border rounded-md ${lockedInstId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            >
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hall Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="flex-shrink-0 h-32 w-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {formData.image_url ? (
                  <img
                    src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_API_BASE_URL}${formData.image_url}`}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No Image
                  </div>
                )}
              </div>
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
  );
}
