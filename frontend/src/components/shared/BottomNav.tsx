import { NavLink } from 'react-router-dom';
import { Calendar, DollarSign, Users, ImageIcon, User } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/payments', icon: DollarSign, label: 'Payments' },
  { to: '/gallery', icon: ImageIcon, label: 'Photos' },
  { to: '/attendees', icon: Users, label: 'Crew' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/30 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center w-full h-full px-2 transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )
            }
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
