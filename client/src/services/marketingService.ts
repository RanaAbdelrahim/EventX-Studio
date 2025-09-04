import api from '../utils/api';

export interface Campaign {
  _id: string;
  name: string;
  status: 'Scheduled' | 'Active' | 'Completed' | 'Paused';
  eventId?: {
    _id: string;
    title: string;
    date: string;
    venue: string;
  };
  startAt: string;
  endAt: string;
  budget?: number;
  target?: {
    status?: 'all' | 'checked' | 'not_checked';
    interests?: string[];
    locations?: string[];
    minAge?: number;
    maxAge?: number;
  };
  utmCode: string;
  description?: string;
  objective?: 'awareness' | 'consideration' | 'conversion';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  analytics?: {
    reach: number;
    conversions: number;
    email: {
      sent: number;
      delivered: number;
      opens: number;
      clicks: number;
    };
    social: {
      impressions: number;
      clicks: number;
    };
  };
}

export interface EmailCampaign {
  _id: string;
  campaignId: string;
  subject: string;
  templateHtml: string;
  fromEmail: string;
  segment?: any;
  status: 'Draft' | 'Queued' | 'Sending' | 'Sent' | 'Failed';
  provider: 'mock' | 'sendgrid' | 'mailgun';
  stats: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
  };
  scheduledAt?: string;
  sentAt?: string;
  recipients: {
    count: number;
    processed: number;
  };
}

export interface SocialPost {
  _id: string;
  campaignId: string;
  platform: 'facebook' | 'twitter' | 'instagram';
  content: string;
  scheduledAt: string;
  status: 'Draft' | 'Queued' | 'Posted' | 'Failed';
  linkUrl?: string;
  imageUrl?: string;
  postedAt?: string;
  stats?: {
    impressions: number;
    clicks: number;
    likes: number;
    shares: number;
    comments: number;
  };
  error?: string;
}

export interface AnalyticsSummary {
  reach: number;
  conversions: number;
  revenue: number;
  email: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
  };
  social: {
    impressions: number;
    clicks: number;
    engagements: number;
  };
}

export interface TimeseriesData {
  date: string;
  reach: number;
  conversions: number;
  revenue: number;
  email: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
  };
  social: {
    impressions: number;
    clicks: number;
  };
}

const marketingService = {
  // Campaign endpoints
  getCampaigns: async (params?: any) => {
    const response = await api.get('/marketing/campaigns', { params });
    return response.data;
  },
  
  getCampaign: async (id: string) => {
    const response = await api.get(`/marketing/campaigns/${id}`);
    return response.data;
  },
  
  createCampaign: async (data: any) => {
    const response = await api.post('/marketing/campaigns', data);
    return response.data;
  },
  
  updateCampaign: async (id: string, data: any) => {
    const response = await api.put(`/marketing/campaigns/${id}`, data);
    return response.data;
  },
  
  deleteCampaign: async (id: string) => {
    const response = await api.delete(`/marketing/campaigns/${id}`);
    return response.data;
  },
  
  pauseCampaign: async (id: string) => {
    const response = await api.post(`/marketing/campaigns/${id}/pause`);
    return response.data;
  },
  
  activateCampaign: async (id: string) => {
    const response = await api.post(`/marketing/campaigns/${id}/activate`);
    return response.data;
  },
  
  // Email campaign endpoints
  getEmailCampaigns: async (campaignId: string) => {
    const response = await api.get('/marketing/email', { params: { campaignId } });
    return response.data;
  },
  
  getEmailCampaign: async (id: string) => {
    const response = await api.get(`/marketing/email/${id}`);
    return response.data;
  },
  
  createEmailCampaign: async (data: any) => {
    const response = await api.post('/marketing/email', data);
    return response.data;
  },
  
  updateEmailCampaign: async (id: string, data: any) => {
    const response = await api.put(`/marketing/email/${id}`, data);
    return response.data;
  },
  
  sendEmailCampaign: async (id: string, sendNow?: boolean) => {
    const response = await api.post(`/marketing/email/${id}/send`, { sendNow });
    return response.data;
  },
  
  // Social post endpoints
  getSocialPosts: async (campaignId: string) => {
    const response = await api.get('/marketing/social', { params: { campaignId } });
    return response.data;
  },
  
  createSocialPost: async (data: any) => {
    const response = await api.post('/marketing/social', data);
    return response.data;
  },
  
  updateSocialPost: async (id: string, data: any) => {
    const response = await api.put(`/marketing/social/${id}`, data);
    return response.data;
  },
  
  deleteSocialPost: async (id: string) => {
    const response = await api.delete(`/marketing/social/${id}`);
    return response.data;
  },
  
  scheduleSocialPost: async (id: string) => {
    const response = await api.post(`/marketing/social/${id}/schedule`);
    return response.data;
  },
  
  // Analytics endpoints
  getAnalyticsSummary: async (campaignId?: string) => {
    const params = campaignId ? { campaignId } : undefined;
    const response = await api.get('/marketing/analytics/summary', { params });
    return response.data;
  },
  
  getAnalyticsTimeseries: async (campaignId: string, from?: string, to?: string) => {
    const response = await api.get('/marketing/analytics/timeseries', { 
      params: { campaignId, from, to } 
    });
    return response.data;
  }
};

export default marketingService;
