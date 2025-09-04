import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import debounce from 'lodash/debounce';

// Types
interface Event {
  _id: string;
  title: string;
  date: string;
  venue: string;
  status: 'upcoming' | 'pending' | 'closed';
  description?: string;
  price?: number;
}

interface Filters {
  status: string[];
  search: string;
  dateRange: {
    from: string;
    to: string;
  };
  sortBy: 'status' | 'date' | 'title';
}

const EventManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for events and UI controls
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  
  // Dropdown state
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<boolean>(false);
  const [selectDropdownOpen, setSelectDropdownOpen] = useState<boolean>(false);
  
  // Refs for dropdown containers
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const selectDropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    status: [],
    search: '',
    dateRange: {
      from: '',
      to: ''
    },
    sortBy: 'status'
  });
  
  // Effect to close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(event.target as Node)) {
        setSelectDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/events');
        setEvents(response.data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
  
  // Parse URL query parameters on mount
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    
    const parsedFilters: Filters = {
      status: queryParams.get('status')?.split(',') || [],
      search: queryParams.get('search') || '',
      dateRange: {
        from: queryParams.get('from') || '',
        to: queryParams.get('to') || ''
      },
      sortBy: (queryParams.get('sort') as Filters['sortBy']) || 'status'
    };
    
    setFilters(parsedFilters);
  }, [location.search]);
  
  // Update URL with filter state
  const updateUrlParams = useCallback(() => {
    const queryParams = new URLSearchParams();
    
    if (filters.status.length) {
      queryParams.set('status', filters.status.join(','));
    }
    
    if (filters.search) {
      queryParams.set('search', filters.search);
    }
    
    if (filters.dateRange.from) {
      queryParams.set('from', filters.dateRange.from);
    }
    
    if (filters.dateRange.to) {
      queryParams.set('to', filters.dateRange.to);
    }
    
    if (filters.sortBy !== 'status') {
      queryParams.set('sort', filters.sortBy);
    }
    
    const newUrl = queryParams.toString() 
      ? `${location.pathname}?${queryParams.toString()}` 
      : location.pathname;
    
    navigate(newUrl, { replace: true });
  }, [filters, location.pathname, navigate]);
  
  // Update URL when filters change
  useEffect(() => {
    updateUrlParams();
  }, [filters, updateUrlParams]);
  
  // Filter events by status
  const toggleStatusFilter = (status: string) => {
    setFilters(prev => {
      const newStatuses = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      
      return {
        ...prev,
        status: newStatuses
      };
    });
    // Don't close the dropdown to allow multiple selections
  };
  
  // Handle search input with debounce
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setFilters(prev => ({
        ...prev,
        search: value
      }));
    }, 250)
  ).current;
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };
  
  // Handle date range changes
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value
      }
    }));
  };
  
  // Handle sort change
  const handleSortChange = (sortBy: Filters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy
    }));
  };
  
  // Apply all filters and sorting to get visible events
  const visibleEvents = useMemo(() => {
    // First apply filters
    let filtered = [...events];
    
    // Filter by status if any selected, otherwise show all
    if (filters.status.length > 0) {
      filtered = filtered.filter(event => filters.status.includes(event.status));
    }
    
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchLower) || 
        event.venue.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by date range
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0); // Normalize to midnight
        
        if (filters.dateRange.from && filters.dateRange.to) {
          const fromDate = new Date(filters.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999); // End of the day
          
          return eventDate >= fromDate && eventDate <= toDate;
        } else if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          return eventDate >= fromDate;
        } else if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return eventDate <= toDate;
        }
        
        return true;
      });
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [events, filters]);
  
  // Selection functions
  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId) 
        : [...prev, eventId]
    );
  };
  
  const handleSelectAction = (action: string) => {
    switch (action) {
      case 'selectAll':
        setSelectedEvents(visibleEvents.map(event => event._id));
        break;
      case 'clearSelection':
        setSelectedEvents([]);
        break;
      case 'invertSelection':
        setSelectedEvents(prev => {
          const visibleIds = visibleEvents.map(event => event._id);
          return visibleIds.filter(id => !prev.includes(id));
        });
        break;
      default:
        break;
    }
    // Close the dropdown after selection
    setSelectDropdownOpen(false);
  };
  
  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setFilterDropdownOpen(prev => !prev);
    // Close the other dropdown if open
    if (selectDropdownOpen) setSelectDropdownOpen(false);
  };
  
  // Toggle select dropdown
  const toggleSelectDropdown = () => {
    setSelectDropdownOpen(prev => !prev);
    // Close the other dropdown if open
    if (filterDropdownOpen) setFilterDropdownOpen(false);
  };
  
  // Status badges styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Event Management</h1>
      
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Filter dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button 
              className="px-4 py-2 border rounded-lg flex items-center gap-2"
              onClick={toggleFilterDropdown}
            >
              Filter <span className="ml-1">▼</span>
            </button>
            {filterDropdownOpen && (
              <div className="absolute mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 p-2">
                <div className="mb-2 font-medium">Status</div>
                {['upcoming', 'pending', 'closed'].map(status => (
                  <div key={status} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`status-${status}`}
                      checked={filters.status.includes(status)}
                      onChange={() => toggleStatusFilter(status)}
                      className="mr-2"
                    />
                    <label htmlFor={`status-${status}`} className="capitalize">
                      {status}
                    </label>
                  </div>
                ))}
                <div className="mt-2 flex justify-end">
                  <button 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setFilterDropdownOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Select dropdown */}
          <div className="relative" ref={selectDropdownRef}>
            <button 
              className="px-4 py-2 border rounded-lg flex items-center gap-2"
              onClick={toggleSelectDropdown}
            >
              Select <span className="ml-1">▼</span>
            </button>
            {selectDropdownOpen && (
              <div className="absolute mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 p-2">
                <button 
                  onClick={() => handleSelectAction('selectAll')}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                >
                  Select All (visible)
                </button>
                <button 
                  onClick={() => handleSelectAction('clearSelection')}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                >
                  Clear Selection
                </button>
                <button 
                  onClick={() => handleSelectAction('invertSelection')}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                >
                  Invert Selection (visible)
                </button>
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search by title or venue..."
              className="w-full px-4 py-2 border rounded-lg"
              defaultValue={filters.search}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort options */}
          <div className="flex items-center gap-2">
            <span>Sort By:</span>
            <select 
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as Filters['sortBy'])}
              className="border rounded px-2 py-1"
            >
              <option value="status">Status</option>
              <option value="date">Date</option>
              <option value="title">Title</option>
            </select>
          </div>
          
          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <span>Pick Date:</span>
            <input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="border rounded px-2 py-1"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>
      
      {/* Selected count */}
      {selectedEvents.length > 0 && (
        <div className="mb-4 p-2 bg-blue-50 rounded flex justify-between items-center">
          <span>{selectedEvents.length} events selected</span>
          <button 
            onClick={() => handleSelectAction('clearSelection')}
            className="text-blue-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}
      
      {/* Events grid */}
      {loading ? (
        <div className="text-center py-10">Loading events...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded">{error}</div>
      ) : (
        <>
          {visibleEvents.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No events match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleEvents.map(event => (
                <div 
                  key={event._id} 
                  className={`border rounded-lg p-4 ${
                    selectedEvents.includes(event._id) ? 'bg-blue-50 border-blue-300' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{event.title}</h3>
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event._id)}
                      onChange={() => toggleEventSelection(event._id)}
                      className="h-5 w-5"
                    />
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{event.venue}</p>
                  <p className="text-gray-600 text-sm mb-3">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(event.status)}`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventManagement;
