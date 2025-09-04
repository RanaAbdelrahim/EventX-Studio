import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

/** ---------- Select options ---------- */
const currencies = [
  { value: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' }
];

const timezones = [
  { value: 'Asia/Colombo', label: 'Asia/Colombo' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore' }
];

const providers = {
  email: [
    { value: 'smtp', label: 'SMTP' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'ses', label: 'Amazon SES' }
  ],
  sms: [
    { value: 'twilio', label: 'Twilio' },
    { value: 'nexmo', label: 'Vonage (Nexmo)' }
  ],
  push: [
    { value: 'fcm', label: 'Firebase Cloud Messaging' },
    { value: 'onesignal', label: 'OneSignal' },
    { value: 'expo', label: 'Expo Push' }
  ]
} as const;

/** ---------- Types ---------- */
type EmailProvider = (typeof providers.email)[number]['value'];
type SmsProvider = (typeof providers.sms)[number]['value'];
type PushProvider = (typeof providers.push)[number]['value'];

interface EmailChannel {
  enabled: boolean;
  fromEmail: string;
  provider: EmailProvider;
}
interface SmsChannel {
  enabled: boolean;
  fromNumber: string;
  provider: SmsProvider;
}
interface PushChannel {
  enabled: boolean;
  provider: PushProvider;
}

interface NotificationsSettings {
  channels: {
    email: EmailChannel;
    sms: SmsChannel;
    push: PushChannel;
  };
  events: {
    bookingCreated: { email: boolean; sms: boolean; push: boolean };
    eventReminderHrs: { hoursBefore: number; email: boolean; push: boolean };
  };
  preferences: {
    quietHours: { start: string; end: string };
    digest: { enabled: boolean; frequency: 'daily' | 'weekly'; hour: number };
  };
}

interface SecuritySettings {
  twoFactor: { enabled: boolean };
  passwordPolicy: {
    minLength: number;
    requireUpper: boolean;
    requireLower: boolean;
    requireNumber: boolean;
    requireSymbol: boolean;
  };
  sessionPolicy: {
    maxSessions: number;
    ttlHours: number;
    forceReauthSensitive: boolean;
  };
  loginAlerts: { email: boolean; push: boolean };
}

interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark';
  accentColor: string; // e.g. hex
  density: 'comfortable' | 'compact';
}

interface SettingsShape {
  // General
  notificationEmail: string;
  defaultCurrency: string;
  timezone: string;

  // Appearance
  appearance: AppearanceSettings;

  // Notifications
  notifications: NotificationsSettings;

  // Security
  security: SecuritySettings;
}

interface SessionInfo {
  id: string;
  userAgent: string;
  ip: string;
  lastSeen: string; // ISO string
  current: boolean;
}

/** ---------- Defaults ---------- */
const defaultSettings: SettingsShape = {
  notificationEmail: 'admin@eventx.dev',
  defaultCurrency: 'LKR',
  timezone: 'Asia/Colombo',

  appearance: {
    theme: 'system',
    accentColor: '#2563eb',
    density: 'comfortable'
  },

  notifications: {
    channels: {
      email: { enabled: true, fromEmail: 'noreply@eventx.dev', provider: 'smtp' },
      sms: { enabled: false, fromNumber: '', provider: 'twilio' },
      push: { enabled: false, provider: 'fcm' }
    },
    events: {
      bookingCreated: { email: true, sms: false, push: false },
      eventReminderHrs: { hoursBefore: 24, email: true, push: false }
    },
    preferences: {
      quietHours: { start: '22:00', end: '07:00' },
      digest: { enabled: false, frequency: 'daily', hour: 9 }
    }
  },

  security: {
    twoFactor: { enabled: false },
    passwordPolicy: {
      minLength: 8,
      requireUpper: true,
      requireLower: true,
      requireNumber: true,
      requireSymbol: false
    },
    sessionPolicy: {
      maxSessions: 5,
      ttlHours: 24,
      forceReauthSensitive: true
    },
    loginAlerts: { email: true, push: false }
  }
};

/** ---------- Helpers ---------- */
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s: string) => /^\+?[0-9]{7,15}$/.test(s);

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (Array.isArray(base)) return (override as any) ?? (base as any);
  if (typeof base === 'object' && base !== null) {
    const out: any = { ...base };
    for (const k of Object.keys(override ?? {})) {
      const bv: any = (base as any)[k];
      const ov: any = (override as any)[k];
      out[k] =
        typeof bv === 'object' && bv !== null && !Array.isArray(bv)
          ? deepMerge(bv, ov ?? {})
          : ov ?? bv;
    }
    return out;
  }
  return (override as any) ?? base;
}

/** ---------- Component ---------- */
export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'security'>('general');

  // Full settings state (single source of truth)
  const [settings, setSettings] = useState<SettingsShape>(defaultSettings);
  const [original, setOriginal] = useState<SettingsShape>(defaultSettings);

  // UI/validation
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Notifications testing
  const [testNotificationChannel, setTestNotificationChannel] = useState<{
    channel?: 'email' | 'sms' | 'push';
    recipient: string;
    loading: boolean;
  }>({ channel: undefined, recipient: '', loading: false });

  // 2FA state
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    qrCode: string | null;
    token: string;
    recoveryCodes: string[];
  }>({ qrCode: null, token: '', recoveryCodes: [] });

  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [saving, setSaving] = useState(false); // for discrete actions (2FA, revoke, tests)

  /** Load settings + sessions on mount */
  useEffect(() => {
    (async () => {
      try {
        const [sRes] = await Promise.all([
          api.get('/settings') // unify on your backend
        ]);
        const merged = deepMerge(defaultSettings, sRes.data || {});
        setSettings(merged);
        setOriginal(merged);
      } catch (e) {
        console.error('Failed to load settings:', e);
        showToast('Failed to load settings', 'error');
      }
      fetchSessions();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sessions fetch */
  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get('/auth/sessions');
      setSessions(res.data || []);
    } catch (e) {
      console.error('Failed to load sessions:', e);
      showToast('Failed to load sessions', 'error');
    } finally {
      setSessionsLoading(false);
    }
  };

  /** Change handlers (generic) */
  const onGeneralChange = (name: keyof SettingsShape, value: any) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
    if (errors[name as string]) {
      setErrors((e) => {
        const c = { ...e }; delete c[name as string]; return c;
      });
    }
  };

  const onNestedChange = <K extends keyof SettingsShape>(
    section: K,
    updater: (val: SettingsShape[K]) => SettingsShape[K]
  ) => {
    setSettings((prev) => {
      const nextSection = updater(prev[section]);
      return { ...prev, [section]: nextSection };
    });
  };

  /** Validation */
  const validateAll = (): boolean => {
    const errs: Record<string, string> = {};

    // General
    if (!isEmail(settings.notificationEmail)) errs.notificationEmail = 'Please enter a valid email address';
    if (!currencies.some((c) => c.value === settings.defaultCurrency)) errs.defaultCurrency = 'Please select a valid currency';
    if (!timezones.some((t) => t.value === settings.timezone)) errs.timezone = 'Please select a valid timezone';

    // Notifications: email
    if (settings.notifications.channels.email.enabled) {
      if (!isEmail(settings.notifications.channels.email.fromEmail)) errs.fromEmail = 'Enter a valid sender email';
      if (!providers.email.some((p) => p.value === settings.notifications.channels.email.provider)) errs.emailProvider = 'Select a valid email provider';
    }
    // Notifications: sms
    if (settings.notifications.channels.sms.enabled) {
      if (!isPhone(settings.notifications.channels.sms.fromNumber)) errs.fromNumber = 'Enter a valid E.164 phone number';
      if (!providers.sms.some((p) => p.value === settings.notifications.channels.sms.provider)) errs.smsProvider = 'Select a valid SMS provider';
    }
    // Notifications: push
    if (settings.notifications.channels.push.enabled) {
      if (!providers.push.some((p) => p.value === settings.notifications.channels.push.provider)) errs.pushProvider = 'Select a valid push provider';
    }
    // Events
    const hrs = settings.notifications.events.eventReminderHrs.hoursBefore;
    if (!(hrs >= 1 && hrs <= 72)) errs.eventReminderHrs = 'Hours must be between 1 and 72';

    // Preferences: digest hour
    const digestHour = settings.notifications.preferences.digest.hour;
    if (settings.notifications.preferences.digest.enabled && !(digestHour >= 0 && digestHour <= 23)) {
      errs.digestHour = 'Hour must be between 0 and 23';
    }

    // Security: password policy
    const minLen = settings.security.passwordPolicy.minLength;
    if (!(minLen >= 6 && minLen <= 32)) errs.minLength = 'Min length must be 6–32';

    // Security: session policy
    const maxS = settings.security.sessionPolicy.maxSessions;
    if (!(maxS >= 1 && maxS <= 50)) errs.maxSessions = 'Max sessions must be 1–50';
    const ttl = settings.security.sessionPolicy.ttlHours;
    if (!(ttl >= 1 && ttl <= 720)) errs.ttlHours = 'Timeout must be 1–720 hours';

    // Appearance
    const accent = settings.appearance.accentColor;
    if (!/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(accent)) errs.accentColor = 'Enter a valid hex color';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Save */
  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(original),
    [settings, original]
  );

  const saveAll = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateAll()) {
      showToast('Please correct the errors in the form', 'error');
      return;
    }
    try {
      setIsSaving(true);
      // You may split endpoints if your backend separates scopes. Here we send the whole object.
      await api.put('/settings', settings);
      setOriginal(settings);
      setShowSuccess(true);
      showToast('Settings saved successfully', 'success');
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      if (err?.response?.status === 400 && err?.response?.data?.errors) {
        const serverErrors: Record<string, string> = {};
        for (const it of err.response.data.errors) {
          serverErrors[it.param] = it.msg;
        }
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
      showToast(err?.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /** Notifications: test */
  const testNotification = async (channel: 'email' | 'sms' | 'push') => {
    if (!testNotificationChannel.recipient) {
      showToast('Enter a recipient to test', 'warning');
      return;
    }
    try {
      setTestNotificationChannel((s) => ({ ...s, loading: true, channel }));
      await api.post('/settings/notifications/test', {
        channel,
        recipient: testNotificationChannel.recipient
      });
      showToast(`Test ${channel.toUpperCase()} sent`, 'success');
    } catch (e) {
      console.error('Test notification error:', e);
      showToast(`Failed to send test ${channel}`, 'error');
    } finally {
      setTestNotificationChannel((s) => ({ ...s, loading: false }));
    }
  };

  /** 2FA */
  const setupTwoFactor = async () => {
    try {
      setSaving(true);
      const res = await api.post('/auth/2fa/setup'); // returns { qrCode: 'data:image/png;base64,...' }
      setTwoFactorSetup({ qrCode: res.data?.qrCode || null, token: '', recoveryCodes: [] });
      setShowTwoFactorModal(true);
    } catch (e) {
      console.error('2FA setup failed:', e);
      showToast('Failed to start 2FA setup', 'error');
    } finally {
      setSaving(false);
    }
  };

  const verifyTwoFactor = async () => {
    try {
      setSaving(true);
      const res = await api.post('/auth/2fa/verify', { token: twoFactorSetup.token });
      // Expect { recoveryCodes: string[] }
      const rec = Array.isArray(res.data?.recoveryCodes) ? res.data.recoveryCodes : [];
      onNestedChange('security', (sec) => ({ ...sec, twoFactor: { enabled: true } }));
      setTwoFactorSetup((t) => ({ ...t, recoveryCodes: rec }));
      setShowRecoveryCodesModal(true);
      setShowTwoFactorModal(false);
      showToast('Two-factor authentication enabled', 'success');
    } catch (e) {
      console.error('2FA verify failed:', e);
      showToast('Verification failed. Check the 6-digit code and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disableTwoFactor = async () => {
    try {
      setSaving(true);
      await api.post('/auth/2fa/disable');
      onNestedChange('security', (sec) => ({ ...sec, twoFactor: { enabled: false } }));
      showToast('Two-factor disabled', 'success');
    } catch (e) {
      console.error('2FA disable failed:', e);
      showToast('Failed to disable 2FA', 'error');
    } finally {
      setSaving(false);
    }
  };

  /** Sessions */
  const revokeSession = async (id?: string) => {
    try {
      setSaving(true);
      if (id) {
        await api.delete(`/auth/sessions/${id}`);
      } else {
        await api.delete('/auth/sessions'); // revoke all other
      }
      await fetchSessions();
      showToast('Session(s) revoked', 'success');
    } catch (e) {
      console.error('Revoke session failed:', e);
      showToast('Failed to revoke session(s)', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="flex border-b">
        {(['general', 'appearance', 'notifications', 'security'] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 ${activeTab === tab ? 'border-b-2 border-black font-medium' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        {/* ---------- GENERAL ---------- */}
        {activeTab === 'general' && (
          <form onSubmit={saveAll} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Notification Email</label>
              <input
                type="email"
                className={`input ${errors.notificationEmail ? 'border-red-500' : ''}`}
                value={settings.notificationEmail}
                onChange={(e) => onGeneralChange('notificationEmail', e.target.value)}
              />
              {errors.notificationEmail && <p className="text-red-500 text-xs mt-1">{errors.notificationEmail}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Default Currency</label>
              <select
                className={`input ${errors.defaultCurrency ? 'border-red-500' : ''}`}
                value={settings.defaultCurrency}
                onChange={(e) => onGeneralChange('defaultCurrency', e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.defaultCurrency && <p className="text-red-500 text-xs mt-1">{errors.defaultCurrency}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Timezone</label>
              <select
                className={`input ${errors.timezone ? 'border-red-500' : ''}`}
                value={settings.timezone}
                onChange={(e) => onGeneralChange('timezone', e.target.value)}
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {errors.timezone && <p className="text-red-500 text-xs mt-1">{errors.timezone}</p>}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : showSuccess ? (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>

              {showSuccess && <span className="text-green-600 text-sm">Settings saved successfully!</span>}
            </div>
          </form>
        )}

        {/* ---------- APPEARANCE ---------- */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <h3 className="font-medium">Theme Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Theme</label>
                <select
                  className="input"
                  value={settings.appearance.theme}
                  onChange={(e) =>
                    onNestedChange('appearance', (a) => ({ ...a, theme: e.target.value as AppearanceSettings['theme'] }))
                  }
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Accent Color (Hex)</label>
                <input
                  type="text"
                  className={`input ${errors.accentColor ? 'border-red-500' : ''}`}
                  value={settings.appearance.accentColor}
                  onChange={(e) => onNestedChange('appearance', (a) => ({ ...a, accentColor: e.target.value }))}
                  placeholder="#2563eb"
                />
                {errors.accentColor && <p className="text-red-500 text-xs mt-1">{errors.accentColor}</p>}
              </div>

              <div>
                <label className="block text-sm mb-1">Density</label>
                <select
                  className="input"
                  value={settings.appearance.density}
                  onChange={(e) =>
                    onNestedChange('appearance', (a) => ({ ...a, density: e.target.value as AppearanceSettings['density'] }))
                  }
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                onClick={saveAll}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? 'Saving...' : 'Save Appearance'}
              </button>
            </div>
          </div>
        )}

        {/* ---------- NOTIFICATIONS ---------- */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Notification Channels</h3>

              {/* Email */}
              <div className="card mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.notifications.channels.email.enabled}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          channels: { ...n.channels, email: { ...n.channels.email, enabled: e.target.checked } }
                        }))
                      }
                    />
                    Enable
                  </label>
                </div>

                {settings.notifications.channels.email.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Email</label>
                      <input
                        type="email"
                        className={`input ${errors.fromEmail ? 'border-red-500' : ''}`}
                        value={settings.notifications.channels.email.fromEmail}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            channels: { ...n.channels, email: { ...n.channels.email, fromEmail: e.target.value } }
                          }))
                        }
                        placeholder="noreply@yourdomain.com"
                      />
                      {errors.fromEmail && <p className="mt-1 text-sm text-red-600">{errors.fromEmail}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Email Provider</label>
                      <select
                        className={`input ${errors.emailProvider ? 'border-red-500' : ''}`}
                        value={settings.notifications.channels.email.provider}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            channels: { ...n.channels, email: { ...n.channels.email, provider: e.target.value as EmailProvider } }
                          }))
                        }
                      >
                        {providers.email.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {errors.emailProvider && <p className="mt-1 text-sm text-red-600">{errors.emailProvider}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter test email address..."
                        value={testNotificationChannel.recipient}
                        onChange={(e) => setTestNotificationChannel((s) => ({ ...s, recipient: e.target.value }))}
                      />
                      <button className="btn" onClick={() => testNotification('email')} disabled={testNotificationChannel.loading}>
                        {testNotificationChannel.loading && testNotificationChannel.channel === 'email' ? 'Sending...' : 'Test Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SMS */}
              <div className="card mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">SMS Notifications</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.notifications.channels.sms.enabled}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          channels: { ...n.channels, sms: { ...n.channels.sms, enabled: e.target.checked } }
                        }))
                      }
                    />
                    Enable
                  </label>
                </div>

                {settings.notifications.channels.sms.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Number</label>
                      <input
                        type="text"
                        className={`input ${errors.fromNumber ? 'border-red-500' : ''}`}
                        value={settings.notifications.channels.sms.fromNumber}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            channels: { ...n.channels, sms: { ...n.channels.sms, fromNumber: e.target.value } }
                          }))
                        }
                        placeholder="+94771234567"
                      />
                      {errors.fromNumber && <p className="mt-1 text-sm text-red-600">{errors.fromNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">SMS Provider</label>
                      <select
                        className={`input ${errors.smsProvider ? 'border-red-500' : ''}`}
                        value={settings.notifications.channels.sms.provider}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            channels: { ...n.channels, sms: { ...n.channels.sms, provider: e.target.value as SmsProvider } }
                          }))
                        }
                      >
                        {providers.sms.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {errors.smsProvider && <p className="mt-1 text-sm text-red-600">{errors.smsProvider}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter test phone number..."
                        value={testNotificationChannel.recipient}
                        onChange={(e) => setTestNotificationChannel((s) => ({ ...s, recipient: e.target.value }))}
                      />
                      <button className="btn" onClick={() => testNotification('sms')} disabled={testNotificationChannel.loading}>
                        {testNotificationChannel.loading && testNotificationChannel.channel === 'sms' ? 'Sending...' : 'Test SMS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Push */}
              <div className="card mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Push Notifications</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.notifications.channels.push.enabled}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          channels: { ...n.channels, push: { ...n.channels.push, enabled: e.target.checked } }
                        }))
                      }
                    />
                    Enable
                  </label>
                </div>

                {settings.notifications.channels.push.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Push Provider</label>
                      <select
                        className={`input ${errors.pushProvider ? 'border-red-500' : ''}`}
                        value={settings.notifications.channels.push.provider}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            channels: { ...n.channels, push: { ...n.channels.push, provider: e.target.value as PushProvider } }
                          }))
                        }
                      >
                        {providers.push.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {errors.pushProvider && <p className="mt-1 text-sm text-red-600">{errors.pushProvider}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter test device ID..."
                        value={testNotificationChannel.recipient}
                        onChange={(e) => setTestNotificationChannel((s) => ({ ...s, recipient: e.target.value }))}
                      />
                      <button className="btn" onClick={() => testNotification('push')} disabled={testNotificationChannel.loading}>
                        {testNotificationChannel.loading && testNotificationChannel.channel === 'push' ? 'Sending...' : 'Test Push'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events */}
            <div>
              <h3 className="text-lg font-medium mb-4">Notification Events</h3>

              <div className="card mb-4">
                <h4 className="font-medium mb-3">Booking Created</h4>
                <div className="flex flex-wrap gap-4">
                  {(['email', 'sms', 'push'] as const).map((k) => (
                    <label key={k} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={settings.notifications.events.bookingCreated[k]}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            events: {
                              ...n.events,
                              bookingCreated: { ...n.events.bookingCreated, [k]: e.target.checked }
                            }
                          }))
                        }
                      />
                      {k.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="card mb-4">
                <h4 className="font-medium mb-3">Event Reminder</h4>
                <div className="flex items-center gap-3 mb-3">
                  <span>Send reminder</span>
                  <input
                    type="number"
                    className={`input w-20 ${errors.eventReminderHrs ? 'border-red-500' : ''}`}
                    min={1}
                    max={72}
                    value={settings.notifications.events.eventReminderHrs.hoursBefore}
                    onChange={(e) =>
                      onNestedChange('notifications', (n) => ({
                        ...n,
                        events: {
                          ...n.events,
                          eventReminderHrs: {
                            ...n.events.eventReminderHrs,
                            hoursBefore: Number(e.target.value) || 24
                          }
                        }
                      }))
                    }
                  />
                  <span>hours before event</span>
                </div>
                {errors.eventReminderHrs && <p className="mt-1 text-sm text-red-600">{errors.eventReminderHrs}</p>}

                <div className="flex flex-wrap gap-4">
                  {(['email', 'push'] as const).map((k) => (
                    <label key={k} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={settings.notifications.events.eventReminderHrs[k]}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            events: {
                              ...n.events,
                              eventReminderHrs: { ...n.events.eventReminderHrs, [k]: e.target.checked }
                            }
                          }))
                        }
                      />
                      {k.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>

              <div className="card mb-4">
                <h4 className="font-medium mb-3">Quiet Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={settings.notifications.preferences.quietHours.start}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          preferences: { ...n.preferences, quietHours: { ...n.preferences.quietHours, start: e.target.value } }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={settings.notifications.preferences.quietHours.end}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          preferences: { ...n.preferences, quietHours: { ...n.preferences.quietHours, end: e.target.value } }
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Notifications will not be sent during quiet hours.</p>
              </div>

              <div className="card mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Notification Digest</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.notifications.preferences.digest.enabled}
                      onChange={(e) =>
                        onNestedChange('notifications', (n) => ({
                          ...n,
                          preferences: { ...n.preferences, digest: { ...n.preferences.digest, enabled: e.target.checked } }
                        }))
                      }
                    />
                    Enable
                  </label>
                </div>

                {settings.notifications.preferences.digest.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Frequency</label>
                      <select
                        className="input"
                        value={settings.notifications.preferences.digest.frequency}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            preferences: {
                              ...n.preferences,
                              digest: { ...n.preferences.digest, frequency: e.target.value as 'daily' | 'weekly' }
                            }
                          }))
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hour of Day</label>
                      <input
                        type="number"
                        className={`input ${errors.digestHour ? 'border-red-500' : ''}`}
                        min={0}
                        max={23}
                        value={settings.notifications.preferences.digest.hour}
                        onChange={(e) =>
                          onNestedChange('notifications', (n) => ({
                            ...n,
                            preferences: {
                              ...n.preferences,
                              digest: { ...n.preferences.digest, hour: Number(e.target.value) || 9 }
                            }
                          }))
                        }
                      />
                      {errors.digestHour && <p className="mt-1 text-sm text-red-600">{errors.digestHour}</p>}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">Receive a digest of all notifications instead of individual alerts.</p>
              </div>

              <div className="pt-2">
                <button
                  className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  onClick={saveAll}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? 'Saving...' : 'Save Notifications'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- SECURITY ---------- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* 2FA */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                {settings.security.twoFactor.enabled ? (
                  <button className="btn !bg-red-600" onClick={disableTwoFactor} disabled={saving}>
                    {saving ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                ) : (
                  <button className="btn !bg-green-600" onClick={setupTwoFactor} disabled={saving}>
                    {saving ? 'Setting up...' : 'Enable 2FA'}
                  </button>
                )}
              </div>

              <div className="text-sm">
                {settings.security.twoFactor.enabled ? (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Two-factor authentication is enabled</span>
                    </div>
                    <p className="mt-1">Your account is protected with authenticator app verification.</p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Two-factor authentication is not enabled</span>
                    </div>
                    <p className="mt-1">Protect your account with an authenticator app for additional security.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Password policy */}
            <div className="card">
              <h3 className="text-lg font-medium mb-4">Password Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Password Length</label>
                  <input
                    type="number"
                    min={6}
                    max={32}
                    className={`input ${errors.minLength ? 'border-red-500' : ''}`}
                    value={settings.security.passwordPolicy.minLength}
                    onChange={(e) =>
                      onNestedChange('security', (s) => ({
                        ...s,
                        passwordPolicy: { ...s.passwordPolicy, minLength: Number(e.target.value) || 8 }
                      }))
                    }
                  />
                  {errors.minLength && <p className="mt-1 text-sm text-red-600">{errors.minLength}</p>}
                </div>

                <div className="space-y-2">
                  {([
                    ['requireUpper', 'Require uppercase letter'],
                    ['requireLower', 'Require lowercase letter'],
                    ['requireNumber', 'Require number'],
                    ['requireSymbol', 'Require special character']
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={(settings.security.passwordPolicy as any)[key]}
                        onChange={(e) =>
                          onNestedChange('security', (s) => ({
                            ...s,
                            passwordPolicy: { ...s.passwordPolicy, [key]: e.target.checked } as SecuritySettings['passwordPolicy']
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Session policy */}
            <div className="card">
              <h3 className="text-lg font-medium mb-4">Session Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Sessions</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className={`input ${errors.maxSessions ? 'border-red-500' : ''}`}
                    value={settings.security.sessionPolicy.maxSessions}
                    onChange={(e) =>
                      onNestedChange('security', (s) => ({
                        ...s,
                        sessionPolicy: { ...s.sessionPolicy, maxSessions: Number(e.target.value) || 5 }
                      }))
                    }
                  />
                  {errors.maxSessions && <p className="mt-1 text-sm text-red-600">{errors.maxSessions}</p>}
                  <p className="mt-1 text-xs text-gray-500">Maximum number of concurrent sessions allowed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Session Timeout (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className={`input ${errors.ttlHours ? 'border-red-500' : ''}`}
                    value={settings.security.sessionPolicy.ttlHours}
                    onChange={(e) =>
                      onNestedChange('security', (s) => ({
                        ...s,
                        sessionPolicy: { ...s.sessionPolicy, ttlHours: Number(e.target.value) || 24 }
                      }))
                    }
                  />
                  {errors.ttlHours && <p className="mt-1 text-sm text-red-600">{errors.ttlHours}</p>}
                  <p className="mt-1 text-xs text-gray-500">Sessions will expire after this many hours</p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.security.sessionPolicy.forceReauthSensitive}
                      onChange={(e) =>
                        onNestedChange('security', (s) => ({
                          ...s,
                          sessionPolicy: { ...s.sessionPolicy, forceReauthSensitive: e.target.checked }
                        }))
                      }
                    />
                    Require re-authentication for sensitive actions
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-6">
                    Users will need to confirm their password for sensitive operations like changing security settings
                  </p>
                </div>
              </div>
            </div>

            {/* Login alerts */}
            <div className="card">
              <h3 className="text-lg font-medium mb-4">Login Alerts</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700 mb-2">Receive alerts when there's a new login to your account:</p>
                {(['email', 'push'] as const).map((k) => (
                  <label key={k} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={settings.security.loginAlerts[k]}
                      onChange={(e) =>
                        onNestedChange('security', (s) => ({
                          ...s,
                          loginAlerts: { ...s.loginAlerts, [k]: e.target.checked }
                        }))
                      }
                    />
                    {k === 'email' ? 'Email alerts' : 'Push notifications'}
                  </label>
                ))}
              </div>
            </div>

            {/* Active sessions */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Active Sessions</h3>
                <button className="btn !bg-red-600" onClick={() => revokeSession()} disabled={saving || sessionsLoading}>
                  {saving ? 'Revoking...' : 'Revoke All Other Sessions'}
                </button>
              </div>

              {sessionsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-gray-500">No active sessions found.</div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border ${s.current ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium flex items-center">
                            {s.current && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>}
                            {s.current ? 'Current Session' : 'Other Device'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{s.userAgent}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            IP: {s.ip} • Last active: {new Date(s.lastSeen).toLocaleString()}
                          </div>
                        </div>
                        {!s.current && (
                          <button className="text-red-600 hover:text-red-800 text-sm" onClick={() => revokeSession(s.id)} disabled={saving}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                onClick={saveAll}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? 'Saving...' : 'Save Security'}
              </button>
            </div>
          </div>
        )}

        {/* ---------- 2FA Setup Modal ---------- */}
        {showTwoFactorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Set Up Two-Factor Authentication</h3>

              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
                </p>

                <div className="flex justify-center">
                  {twoFactorSetup.qrCode && <img src={twoFactorSetup.qrCode} alt="QR Code" className="border p-2 rounded" />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter 6-digit code from app"
                    value={twoFactorSetup.token}
                    onChange={(e) =>
                      setTwoFactorSetup((t) => ({
                        ...t,
                        token: e.target.value.replace(/\D/g, '').substring(0, 6)
                      }))
                    }
                    maxLength={6}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" className="px-4 py-2 border rounded-lg" onClick={() => setShowTwoFactorModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn" onClick={verifyTwoFactor} disabled={saving || twoFactorSetup.token.length !== 6}>
                    {saving ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Recovery Codes Modal ---------- */}
        {showRecoveryCodesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Recovery Codes</h3>

              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  <strong>Important:</strong> Save these recovery codes in a secure location. They allow you to regain access to your account if you lose your
                  authenticator device.
                </p>

                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    {twoFactorSetup.recoveryCodes.map((code, idx) => (
                      <div key={idx} className="font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500">Each code can only be used once. Keep them private and secure.</p>

                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" className="btn" onClick={() => setShowRecoveryCodesModal(false)}>
                    I've Saved These Codes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
