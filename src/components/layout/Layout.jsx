import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';

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
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`main-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
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
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
