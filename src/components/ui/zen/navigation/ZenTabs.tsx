'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ZenTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ZenTabsProps {
  tabs: ZenTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ZenTabs: React.FC<ZenTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <div className={cn(
      'border-b border-zinc-800',
      className
    )}>
      <nav className="flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={cn(
                'group relative px-6 py-3 text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950',
                isActive && [
                  'text-white',
                  'after:absolute after:bottom-0 after:left-0 after:right-0',
                  'after:h-0.5 after:bg-gradient-to-r after:from-purple-500 after:to-blue-500',
                  'after:shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                ],
                !isActive && !isDisabled && [
                  'text-zinc-400 hover:text-zinc-300',
                  'hover:bg-zinc-800/50'
                ],
                isDisabled && 'text-zinc-600 cursor-not-allowed opacity-50'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.icon && (
                  <span className={cn(
                    'transition-colors',
                    isActive && 'text-purple-400'
                  )}>
                    {tab.icon}
                  </span>
                )}
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
