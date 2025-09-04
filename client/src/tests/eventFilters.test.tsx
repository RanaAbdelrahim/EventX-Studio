import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventManagement from '../pages/admin/EventManagement';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock API response
const mockEvents = [
  {
    _id: '1',
    title: 'Summer Music Festival',
    date: '2025-06-15',
    venue: 'Beach Park',
    status: 'upcoming'
  },
  {
    _id: '2',
    title: 'Tech Conference',
    date: '2025-04-20',
    venue: 'Convention Center',
    status: 'pending'
  },
  {
    _id: '3',
    title: 'Art Exhibition',
    date: '2025-05-10',
    venue: 'City Gallery',
    status: 'closed'
  }
];

// Setup mock server
const server = setupServer(
  rest.get('/api/events', (req, res, ctx) => {
    return res(ctx.json(mockEvents));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test components wrapped with Router
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

// Helper functions to test in isolation
export const applyFilters = (events, filters) => {
  let filtered = [...events];
  
  // Filter by status
  if (filters.status.length > 0) {
    filtered = filtered.filter(event => filters.status.includes(event.status));
  }
  
  // Filter by search
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
      eventDate.setHours(0, 0, 0, 0);
      
      if (filters.dateRange.from && filters.dateRange.to) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
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
  
  return filtered;
};

export const applySort = (events, sortBy) => {
  return [...events].sort((a, b) => {
    switch (sortBy) {
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
};

// Unit tests for filter and sort functions
describe('Event filter and sort functions', () => {
  test('applyFilters filters by status correctly', () => {
    const filters = {
      status: ['upcoming'],
      search: '',
      dateRange: { from: '', to: '' }
    };
    
    const filtered = applyFilters(mockEvents, filters);
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Summer Music Festival');
  });
  
  test('applyFilters filters by search term correctly', () => {
    const filters = {
      status: [],
      search: 'tech',
      dateRange: { from: '', to: '' }
    };
    
    const filtered = applyFilters(mockEvents, filters);
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Tech Conference');
  });
  
  test('applyFilters filters by date range correctly', () => {
    const filters = {
      status: [],
      search: '',
      dateRange: { from: '2025-05-01', to: '2025-06-30' }
    };
    
    const filtered = applyFilters(mockEvents, filters);
    expect(filtered.length).toBe(2);
    expect(filtered[0].title).toBe('Summer Music Festival');
    expect(filtered[1].title).toBe('Art Exhibition');
  });
  
  test('applySort sorts events correctly', () => {
    // Sort by title
    const sortedByTitle = applySort(mockEvents, 'title');
    expect(sortedByTitle[0].title).toBe('Art Exhibition');
    expect(sortedByTitle[2].title).toBe('Tech Conference');
    
    // Sort by date
    const sortedByDate = applySort(mockEvents, 'date');
    expect(sortedByDate[0].title).toBe('Tech Conference');
    expect(sortedByDate[2].title).toBe('Summer Music Festival');
  });
});

// Integration test for EventManagement component
describe('EventManagement component', () => {
  test('filters events when status filter is toggled', async () => {
    renderWithRouter(<EventManagement />);
    
    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
      expect(screen.getByText('Tech Conference')).toBeInTheDocument();
      expect(screen.getByText('Art Exhibition')).toBeInTheDocument();
    });
    
    // Open filter dropdown
    fireEvent.click(screen.getByText(/Filter/i));
    
    // Select only 'upcoming' status
    fireEvent.click(screen.getByLabelText(/upcoming/i));
    
    // Check that only upcoming events are shown
    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
      expect(screen.queryByText('Tech Conference')).not.toBeInTheDocument();
      expect(screen.queryByText('Art Exhibition')).not.toBeInTheDocument();
    });
  });
});
