import Link from 'next/link';
import { useState } from 'react';
import { LayoutDashboard, User, Settings, LogOut } from 'lucide-react';
import styles from '@/components/Sidebar.module.css';

const links = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/login', label: 'Login', icon: LogOut },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
  { label: 'Logout', icon: LogOut, logout: true },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <aside className={open ? styles.sidebarOpen : styles.sidebarClosed}>
      <button className={styles.toggleBtn} onClick={() => setOpen(o => !o)}>
        {open ? '☰' : '☰'}
      </button>
      <nav className={styles.sidebarNav}>
        <ul>
          {links.map(link => (
            <li key={link.label}>
              {link.logout ? (
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    localStorage.removeItem('auth');
                    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    window.location.href = '/login';
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                >
                  {link.icon && <link.icon size={22} />}
                  {open && link.label}
                </a>
              ) : (
                <Link href={link.href!} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {link.icon && <link.icon size={22} />}
                  {open && link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}