import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../state/AuthContext';
import { debounce } from '../../utils/helpers';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

interface EditUserFormData {
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', role: '' });
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<EditUserFormData>({
    name: '',
    email: '',
    role: '',
    status: ''
  });
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  
  // Validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on new search
      fetchUsers();
    }, 300),
    []
  );
  
  // Effect to fetch users
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters.status, filters.role]);
  
  // Handle search change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };
  
  // Fetch users with current filters and pagination
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      
      setUsers(response.data.items);
      setPagination({
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        pages: response.data.pages
      });
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      showToast(error.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Open edit modal
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setFormErrors({});
    setEditModalOpen(true);
    setTimeout(() => {
      const nameInput = document.getElementById('edit-name') as HTMLInputElement;
      if (nameInput) nameInput.focus();
    }, 100);
  };
  
  // Form change handler
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when field is changed
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validate edit form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editFormData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!editFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Save user changes
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setActionLoading(selectedUser.id);
      
      const response = await api.put(`/admin/users/${selectedUser.id}`, editFormData);
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? response.data : user
        )
      );
      
      setEditModalOpen(false);
      showToast('User updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update user:', error);
      showToast(error.message || 'Failed to update user', 'error');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Toggle user status (activate/deactivate)
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }
    
    try {
      setActionLoading(user.id);
      
      const response = await api.patch(`/admin/users/${user.id}/status`, {
        status: newStatus
      });
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? response.data : u
        )
      );
      
      showToast(`User ${action}d successfully`, 'success');
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      showToast(error.message || `Failed to ${action} user`, 'error');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Open delete modal
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteConfirmEmail('');
    setDeleteModalOpen(true);
    setTimeout(() => {
      const confirmInput = document.getElementById('confirm-email') as HTMLInputElement;
      if (confirmInput) confirmInput.focus();
    }, 100);
  };
  
  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    // Confirm email matches
    if (deleteConfirmEmail !== selectedUser.email) {
      showToast('Email does not match', 'error');
      return;
    }
    
    try {
      setActionLoading(selectedUser.id);
      
      await api.delete(`/admin/users/${selectedUser.id}`);
      
      // Remove user from the list
      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      
      setDeleteModalOpen(false);
      showToast('User deleted successfully', 'success');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showToast(error.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.pages || newPage === pagination.page) {
      return;
    }
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setEditModalOpen(false);
        setDeleteModalOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditModalOpen(false);
        setDeleteModalOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manage Users</h2>
        <button className="btn">Add New User</button>
      </div>
      
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <input 
              ref={searchInputRef}
              className="input"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select 
              name="status"
              className="input max-w-xs"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select 
              name="role"
              className="input max-w-xs"
              value={filters.role}
              onChange={handleFilterChange}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No users found matching your search criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Last Login</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b">
                      <td className="py-2">{user.name}</td>
                      <td className="py-2">{user.email}</td>
                      <td className="py-2 capitalize">{user.role}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-2">{formatDate(user.lastLogin)}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-500 hover:underline disabled:opacity-50"
                            onClick={() => handleEdit(user)}
                            disabled={!!actionLoading}
                          >
                            Edit
                          </button>
                          
                          <button 
                            className={`hover:underline disabled:opacity-50 ${
                              user.status === 'active' ? 'text-red-500' : 'text-green-500'
                            }`}
                            onClick={() => handleToggleStatus(user)}
                            disabled={!!actionLoading || (currentUser?.id === user.id)}
                          >
                            {actionLoading === user.id ? (
                              <span className="inline-block animate-pulse">...</span>
                            ) : (
                              user.status === 'active' ? 'Deactivate' : 'Activate'
                            )}
                          </button>
                          
                          <button 
                            className="text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDeleteClick(user)}
                            disabled={!!actionLoading || (currentUser?.id === user.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </div>
                
                <div className="flex gap-1">
                  <button 
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                  >
                    &laquo;
                  </button>
                  
                  <button 
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    &lsaquo;
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    // Show pages around current page
                    let pageToShow;
                    if (pagination.pages <= 5) {
                      pageToShow = i + 1;
                    } else if (pagination.page <= 3) {
                      pageToShow = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageToShow = pagination.pages - 4 + i;
                    } else {
                      pageToShow = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button 
                        key={pageToShow}
                        className={`px-3 py-1 rounded border ${
                          pagination.page === pageToShow ? 'bg-gray-200 font-medium' : ''
                        }`}
                        onClick={() => handlePageChange(pageToShow)}
                      >
                        {pageToShow}
                      </button>
                    );
                  })}
                  
                  <button 
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    &rsaquo;
                  </button>
                  
                  <button 
                    className="px-3 py-1 rounded border disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  name="name"
                  className={`input ${formErrors.name ? 'border-red-500' : ''}`}
                  value={editFormData.name}
                  onChange={handleFormChange}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  name="email"
                  className={`input ${formErrors.email ? 'border-red-500' : ''}`}
                  value={editFormData.email}
                  onChange={handleFormChange}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="edit-role"
                  name="role"
                  className="input"
                  value={editFormData.role}
                  onChange={handleFormChange}
                  disabled={currentUser?.id === selectedUser.id}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {currentUser?.id === selectedUser.id && (
                  <p className="mt-1 text-sm text-yellow-600">You cannot change your own role.</p>
                )}
              </div>
              
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-status"
                  name="status"
                  className="input"
                  value={editFormData.status}
                  onChange={handleFormChange}
                  disabled={currentUser?.id === selectedUser.id}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {currentUser?.id === selectedUser.id && (
                  <p className="mt-1 text-sm text-yellow-600">You cannot change your own status.</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={!!actionLoading}
                >
                  {actionLoading === selectedUser.id ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete User Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete User</h3>
            
            <p className="mb-4">
              Are you sure you want to delete <strong>{selectedUser.name}</strong>? This action cannot be undone.
            </p>
            
            <p className="mb-4 text-sm text-gray-700">
              Type <strong>{selectedUser.email}</strong> to confirm deletion:
            </p>
            
            <input
              id="confirm-email"
              type="text"
              className="input mb-4"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Enter user email to confirm"
            />
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border rounded-lg"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn !bg-red-600"
                disabled={deleteConfirmEmail !== selectedUser.email || !!actionLoading}
                onClick={handleDeleteUser}
              >
                {actionLoading === selectedUser.id ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    <span className="ml-2">Deleting...</span>
                  </>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
