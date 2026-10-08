import React from 'react';
import { Menu } from 'lucide-react';

/**
 * Mobile-only top bar. On desktop (lg+) the sidebar carries the menu toggle,
 * Sync Data, user badge and Logout, so no top bar is rendered.
 */
export function Navbar({ onToggleSidebar }) {
  return (
    <header className="lg:hidden h-14 shrink-0 bg-white border-b border-slate-100 flex items-center px-4 sticky top-0 z-30">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>
    </header>
  );
}
