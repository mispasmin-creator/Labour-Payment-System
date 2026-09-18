import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import { NewEntryModal } from '../common/NewEntryModal';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('labour_sys_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('labour_sys_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onToggleSidebar={() => {
            if (window.innerWidth <= 1024) {
              setSidebarOpen(prev => !prev);
            } else {
              toggleCollapse();
            }
          }}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col p-3 md:p-5">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
      <NewEntryModal />
    </div>
  );
}
