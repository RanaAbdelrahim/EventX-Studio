import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import api from '../../utils/api';
import { downloadFile } from '../../utils/downloadHelper';
import { useToast } from '../../context/ToastContext';

type Period = 'week' | 'month' | 'year';
type SalesPoint = { name: string; value: number };
type SourcePoint = { name: string; value: number };

export default function AnalyticsReports() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    revenue: 0,
    ticketsSold: 0,
    conversionRate: 0,
  });

  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [sourceData, setSourceData] = useState<SourcePoint[]>([]);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

  // Load data based on period
  const loadData = async (selectedPeriod: Period) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/analytics/summary?period=${selectedPeriod}`);

      setAnalytics({
        revenue: Number(response.data?.totalRevenue) || 0,
        ticketsSold: Number(response.data?.ticketsSold) || 0,
        conversionRate: Number(response.data?.conversionRate) || 0,
      });

      setSalesData((response.data?.salesData || []) as SalesPoint[]);
      setSourceData((response.data?.sourceData || []) as SourcePoint[]);
    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError(err?.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const handleExport = () => {
    downloadFile({
      url: `/analytics/export?period=${period}`,
      filename: `analytics-${period}.xlsx`,
      onStart: () => setExporting(true),
      onFinish: () => {
        setExporting(false);
        showToast('Export successful!', 'success');
      },
      onError: (error) => {
        setExporting(false);
        showToast(`Export failed: ${error.message}`, 'error');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics & Reports</h2>
        <div className="flex gap-2">
          <button
            className={`px-4 py-1 rounded ${
              period === 'week' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
          <button
            className={`px-4 py-1 rounded ${
              period === 'month' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
          <button
            className={`px-4 py-1 rounded ${
              period === 'year' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
            onClick={() => setPeriod('year')}
          >
            Year
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading analytics data...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard
              title="Revenue"
              value={`₹${Number(analytics.revenue).toLocaleString()}`}
              hint={`Total revenue (${period})`}
              color="emerald"
            />
            <StatCard
              title="Tickets Sold"
              value={Number(analytics.ticketsSold).toLocaleString()}
              hint={`All events (${period})`}
              color="sky"
            />
            <StatCard
              title="Conversion Rate"
              value={`${Number(analytics.conversionRate)}%`}
              hint="Visitors to bookings"
              color="violet"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Sales Trend</h3>
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [
                        `₹${Number(value).toLocaleString()}`,
                        'Revenue',
                      ]}
                    />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No sales data available for this period
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">Booking Sources</h3>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name}: ${Math.round((percent || 0) * 100)}%`
                      }
                    >
                      {sourceData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${Number(value)}`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No source data available for this period
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="btn"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
