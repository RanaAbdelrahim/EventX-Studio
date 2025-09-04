import api from '../utils/api';

export interface ChecklistItem {
  _id?: string;
  name: string;
  isCompleted: boolean;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
}

export interface StaffMember {
  _id?: string;
  user?: string;
  role: string;
  contactInfo?: string;
  notes?: string;
}

export interface Vendor {
  _id?: string;
  name: string;
  service: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  cost?: number;
  notes?: string;
}

export interface Budget {
  allocated: number;
  spent: number;
  notes?: string;
}

export interface Timeline {
  setupStart?: string;
  eventStart?: string;
  eventEnd?: string;
  breakdownEnd?: string;
}

export interface ManageEvent {
  _id: string;
  event: any;
  checklistItems: ChecklistItem[];
  staffMembers: StaffMember[];
  vendors: Vendor[];
  budget: Budget;
  timeline: Timeline;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const eventManagementService = {
  // Get all management data
  getAllManagementData: async () => {
    const response = await api.get('/manage-events');
    return response.data;
  },
  
  // Get management data for a specific event
  getManagementForEvent: async (eventId: string) => {
    const response = await api.get(`/manage-events/event/${eventId}`);
    return response.data;
  },
  
  // Get management data by ID
  getManagementById: async (id: string) => {
    const response = await api.get(`/manage-events/${id}`);
    return response.data;
  },
  
  // Create or update management data
  createOrUpdateManagement: async (data: Partial<ManageEvent>) => {
    const response = await api.post('/manage-events', data);
    return response.data;
  },
  
  // Update checklist
  updateChecklist: async (id: string, checklistItems: ChecklistItem[]) => {
    const response = await api.put(`/manage-events/${id}/checklist`, { checklistItems });
    return response.data;
  },
  
  // Update staff
  updateStaff: async (id: string, staffMembers: StaffMember[]) => {
    const response = await api.put(`/manage-events/${id}/staff`, { staffMembers });
    return response.data;
  },
  
  // Update vendors
  updateVendors: async (id: string, vendors: Vendor[]) => {
    const response = await api.put(`/manage-events/${id}/vendors`, { vendors });
    return response.data;
  },
  
  // Update budget
  updateBudget: async (id: string, budget: Budget) => {
    const response = await api.put(`/manage-events/${id}/budget`, { budget });
    return response.data;
  },
  
  // Update timeline
  updateTimeline: async (id: string, timeline: Timeline) => {
    const response = await api.put(`/manage-events/${id}/timeline`, { timeline });
    return response.data;
  },
  
  // Delete management data
  deleteManagement: async (id: string) => {
    const response = await api.delete(`/manage-events/${id}`);
    return response.data;
  }
};

export default eventManagementService;
