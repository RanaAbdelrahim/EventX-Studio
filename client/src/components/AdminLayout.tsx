import { Link, NavLink, useLocation } from 'react-router-dom'
import React, { useState } from 'react'

// Organize navigation by sections
const navSections = {
  main: [
    { to: '/admin', label: 'Dashboard', icon: '📊' },
    { to: '/admin/events', label: 'Manage Events', icon: '🗂️' },
    { to: '/admin/event-management', label: 'Event Management', icon: '📆' },
    { to: '/admin/booking', label: 'Booking & Tickets', icon: '🎟️' },
    { to: '/admin/insights', label: 'Attendee Insights', icon: '🧠' },
    { to: '/admin/analytics', label: 'Analytics & Reports', icon: '📈' }
  ],
  support: [
    { to: '/admin/support', label: 'Contact Support', icon: '💬' },
    { to: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/admin/settings', label: 'Settings', icon: '⚙️' }
  ],
  features: [
    { to: '/admin/marketing', label: 'Marketing', icon: '📣' },
    { to: '/admin/categories', label: 'Event Categories', icon: '🏷️' }
  ],
  account: [
    { to: '/admin/users', label: 'Manage Users', icon: '👥' },
    { to: '/logout', label: 'Logout', icon: '🚪' }
  ]
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const location = useLocation();
  
  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Render navigation section
  const renderNavSection = (section: string, items: typeof navSections.main, title: string) => {
    return (
      <div className="mb-4">
        <div 
          className="flex items-center justify-between px-3 py-2 text-zinc-400 cursor-pointer"
          onClick={() => toggleSection(section)}
        >
          <span className="text-sm font-medium">{title}</span>
          <span>{collapsed[section] ? '▸' : '▾'}</span>
        </div>
        
        {!collapsed[section] && (
          <nav className="space-y-1">
            {items.map((item) => (
              <NavLink 
                key={item.to} 
                to={item.to} 
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2 rounded ${
                    isActive ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-56px)] grid grid-cols-12 gap-0">
      <aside className="col-span-3 lg:col-span-2 bg-zinc-950 text-zinc-100 p-4 sticky top-[56px] self-start h-[calc(100vh-56px)] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded bg-emerald-400"></div>
          <Link to="/" className="font-semibold">EventX Studio</Link>
        </div>
        <Link to="/admin/events" className="btn w-full !bg-emerald-500 !text-black mb-4">＋ Add Quick Event</Link>
        
        {/* Main Navigation */}
        {renderNavSection('main', navSections.main, 'Main Navigation')}
        
        {/* Support & Management */}
        {renderNavSection('support', navSections.support, 'Support & Management')}
        
        {/* Additional Features */}
        {renderNavSection('features', navSections.features, 'Additional Features')}
        
        {/* Account Management */}
        {renderNavSection('account', navSections.account, 'Account Management')}
      </aside>
      
      <section className="col-span-9 lg:col-span-10 p-4 bg-zinc-100">
        {children}
      </section>
    </div>
  )
}

