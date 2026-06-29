import React from 'react';
import { NavLink } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

const tabClass = (isActive: boolean) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
  }`;

const AdminShell: React.FC<Props> = ({ children }) => (
  <div className="min-h-screen bg-brand-background text-brand-secondary">
    <header className="px-4 sm:px-8 pt-4 sm:pt-8 pb-2">
      <h1 className="text-2xl font-bold mb-3">Flicksee Admin</h1>
      <nav className="flex gap-2 flex-wrap">
        <NavLink to="/admin" end className={({ isActive }) => tabClass(isActive)}>
          Дашборд
        </NavLink>
        <NavLink to="/admin/broadcast" className={({ isActive }) => tabClass(isActive)}>
          Рассылка
        </NavLink>
      </nav>
    </header>
    <main className="px-4 sm:px-8 pb-8">{children}</main>
  </div>
);

export default AdminShell;
