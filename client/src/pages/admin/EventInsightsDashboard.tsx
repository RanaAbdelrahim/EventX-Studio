import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { downloadFile } from "../../utils/downloadHelper";
import { useToast } from "../../context/ToastContext";

/* ----------------------------- Types & helpers ----------------------------- */

interface Attendee {
  _id: string;
  name: string;
  email: string;
  checkInStatus: boolean;
  age?: number;
  gender?: string;
  location?: string;
  interests?: string[];
}

interface EventData {
  title: string;
  venue: string;
  date: string; // formatted for display
  time: string;
  attendees: number;
}

interface AnalyticsResponse {
  totals: {
    attendees: number;
    engagements?: {
      instagram?: number;
      facebook?: number;
      twitter?: number;
      checkins?: number;
      total?: number;
    };
  };
  charts: {
    ageBuckets?: { label: string; count: number }[];
    interests?: { label: string; count: number }[];
    locations?: { label: string; count: number }[];
  };
  sample?: Attendee[];
}

type StatusFilter = "all" | "checked" | "not_checked";

const DEFAULT_AGE_BUCKETS = ["18-24", "25-34", "35-44", "45+"] as const;

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatDate(d?: string) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

/* -------------------------------- Component -------------------------------- */

export default function EventInsightsDashboard() {
  const { id } = useParams();
  const { showToast } = useToast();

  // Filters & controls
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounced(searchQuery, 350);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // Data state
  const [eventData, setEventData] = useState<EventData>({
    title: "Loading...",
    venue: "",
    date: "",
    time: "6.00PM – 10.30PM",
    attendees: 0,
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number }[]>(
    []
  );
  const [engagementData, setEngagementData] = useState<
    { name: string; value: number; icon: string }[]
  >([]);
  const [totalEngagement, setTotalEngagement] = useState(0);
  const [interestsData, setInterestsData] = useState<
    { name: string; value: number; percentage: string; color: string }[]
  >([]);
  const [locationData, setLocationData] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  const isDataEmpty = useMemo(
    () => !loading && eventData.attendees === 0,
    [loading, eventData.attendees]
  );

  // Color helpers
  const interestColor = (label: string) => {
    if (/music/i.test(label)) return "#4f46e5";
    if (/innovation/i.test(label)) return "#f59e0b";
    if (/edm/i.test(label)) return "#ef4444";
    return "#10b981";
  };

  /* --------------------------- Build query parameters --------------------------- */

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set("status", status); // "all" | "checked" | "not_checked"
    if (dateRange.from) params.set("start", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    return params;
  };

  /* --------------------------------- Fetching --------------------------------- */

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        setError("");

        // Fetch event basic data
        const [eventRes, analyticsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get<AnalyticsResponse>(
            `/analytics/event/${id}/insights?${buildParams().toString()}`
          ),
        ]);

        if (cancelled) return;

        const event = eventRes.data || {};
        const insights = analyticsRes.data || ({} as AnalyticsResponse);

        // Event
        setEventData({
          title: event.title ?? "—",
          venue: event.venue ?? "—",
          date: formatDate(event.date),
          time: event.time || "6.00PM – 10.30PM",
          attendees: insights?.totals?.attendees ?? 0,
        });

        // Age buckets (ensure all shown)
        const map = new Map<string, number>();
        (insights.charts?.ageBuckets ?? []).forEach((b) =>
          map.set(b.label, b.count)
        );
        setAgeData(
          DEFAULT_AGE_BUCKETS.map((label) => ({
            name: label,
            value: map.get(label) ?? 0,
          }))
        );

        // Engagement
        const em = insights.totals?.engagements ?? {};
        const eData = [
          { name: "Instagram Mentions", value: em.instagram ?? 0, icon: "📸" },
          { name: "Facebook Shares", value: em.facebook ?? 0, icon: "👍" },
          { name: "Twitter Tweets", value: em.twitter ?? 0, icon: "🐦" },
          { name: "Event Check-ins", value: em.checkins ?? 0, icon: "📱" },
        ];
        setEngagementData(eData);
        setTotalEngagement(em.total ?? eData.reduce((a, b) => a + b.value, 0));

        // Interests
        const attendeesCount = insights.totals?.attendees ?? 0;
        const iData =
          insights.charts?.interests?.map((i) => {
            const pct =
              ((i.count / Math.max(1, attendeesCount)) * 100).toFixed(1) + "%";
            return {
              name: i.label,
              value: i.count,
              percentage: pct,
              color: interestColor(i.label),
            };
          }) ?? [];
        setInterestsData(iData);

        // Locations
        const colorMap: Record<string, string> = {
          Colombo: "#4f46e5",
          Kandy: "#f59e0b",
          Galle: "#ef4444",
          Jaffna: "#10b981",
          International: "#8b5cf6",
        };
        const lData =
          insights.charts?.locations?.map((l) => ({
            name: l.label,
            value: l.count,
            color: colorMap[l.label] ?? "#6b7280",
          })) ?? [];
        setLocationData(lData);

        // Sample attendees (if you later want to render them)
        setAttendees(insights.sample ?? []);
      } catch (e: any) {
        if (cancelled) return;
        console.error("Error fetching insights:", e);
        setError(e?.response?.data?.message || "Failed to load insights data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status, dateRange.from, dateRange.to, debouncedSearch]);

  /* --------------------------------- Handlers --------------------------------- */

  const handleExport = () => {
    if (!id) return;
    const params = buildParams();
    downloadFile({
      url: `/analytics/event/${id}/insights/export?${params.toString()}`,
      filename: `event-insights-${id}.xlsx`,
      onStart: () => setExporting(true),
      onFinish: () => {
        setExporting(false);
        showToast("Event insights exported successfully!", "success");
      },
      onError: (err) => {
        setExporting(false);
        showToast(`Export failed: ${err.message}`, "error");
      },
    });
  };

  const handleDateChange = (type: "from" | "to", value: string) =>
    setDateRange((prev) => ({ ...prev, [type]: value }));

  /* ---------------------------------- Render ---------------------------------- */

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Attendee Insights – {eventData.title}
          </h1>
          <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-6">
            <span>Event Venue: {eventData.venue || "—"}</span>
            <span>Event Date: {eventData.date || "—"}</span>
            <span>Event Time: {eventData.time || "—"}</span>
          </div>
        </div>

        <button
          className="btn !bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExport}
          disabled={exporting || isDataEmpty}
        >
          {exporting ? "Exporting..." : "Export Insights"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm px-6 py-3 mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search attendees..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2 font-medium">
          <span className="text-gray-600">Attendees:</span>
          <span className="text-indigo-600 text-lg">
            {eventData.attendees.toLocaleString()}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateRange.from}
            onChange={(e) => handleDateChange("from", e.target.value)}
          />
          <input
            type="date"
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateRange.to}
            onChange={(e) => handleDateChange("to", e.target.value)}
          />
        </div>

        <div>
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All Attendees</option>
            <option value="checked">Checked-in Only</option>
            <option value="not_checked">Not Checked-in</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loader">Loading insights data...</div>
          </div>
        ) : isDataEmpty ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              No data available
            </h2>
            <p className="text-gray-500">
              There are no attendees matching your current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Age chart */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">Attendee Age</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => [v, "Attendees"]} />
                      <Legend />
                      <Bar dataKey="value" name="Attendees" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Engagement */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">
                  How attendees engaged with the event
                </h2>
                <div className="space-y-4 mt-6">
                  {engagementData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-gray-700">TOTAL COUNT:</span>
                      <span className="text-gray-900">
                        {totalEngagement.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Interests pie */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">
                  Attendee Interests
                </h2>
                {interestsData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    No interest data available
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={interestsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {interestsData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                          <LabelList dataKey="name" position="outside" />
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => {
                            const it = interestsData.find((d) => d.name === name);
                            return [`${value} (${it?.percentage})`, name];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Locations bar */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">
                  Attendee Locations
                </h2>
                {locationData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    No location data available
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locationData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip
                          formatter={(value: any) => [
                            Number(value).toLocaleString(),
                            "Attendees",
                          ]}
                        />
                        <Bar dataKey="value">
                          {locationData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Locations table */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">
                  Attendee Locations
                </h2>
                {locationData.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No location data available
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {locationData.map((loc) => (
                        <tr key={loc.name}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="h-3 w-3 rounded-full mr-2"
                                style={{ backgroundColor: loc.color }}
                              />
                              <div className="text-sm font-medium text-gray-900">
                                {loc.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            {loc.value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
