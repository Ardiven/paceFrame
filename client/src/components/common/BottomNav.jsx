import React from 'react';

export default function BottomNav({ activeTab, onSelectTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'plan', label: 'Plan', icon: 'calendar_today' },
    { id: 'log', label: 'Log', icon: 'timer', isFab: true },
    { id: 'coach', label: 'Coach', icon: 'smart_toy' },
    { id: 'profile', label: 'Profil', icon: 'tune' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.06)] border-t border-surface-container">
      <div className="h-16 px-space-xs flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.isFab) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="min-w-[48px] min-h-[48px] flex flex-col items-center justify-center -mt-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_4px_14px_rgba(0,107,71,0.35)] transition-transform active:scale-95">
                  <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
                </div>
                <span className="text-[11px] font-medium text-on-surface-variant mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
