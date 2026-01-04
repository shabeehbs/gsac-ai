import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  Search,
  Shield
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface SidebarProps {
  user: { email: string } | null;
  onSignOut: () => void;
  onNewIncident: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  incidentCount: number;
}

function Sidebar({ user, onSignOut, onNewIncident, activeView, onViewChange, incidentCount }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, count: incidentCount },
    { id: 'reports', label: 'RCA Reports', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-zinc-950 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">HSE Investigator</h1>
            <p className="text-xs text-zinc-500">Incident Analysis</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <Button
          onClick={onNewIncident}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Plus className="h-4 w-4" />
          New Incident
        </Button>
      </div>

      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full
                    ${isActive ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400'}
                  `}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Quick Actions
          </p>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors duration-150">
            <Settings className="h-4 w-4" />
            Settings
            <ChevronRight className="h-4 w-4 ml-auto" />
          </button>
        </div>
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition-colors duration-150 cursor-pointer group">
          <Avatar name={user?.email || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onSignOut}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all duration-150"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export { Sidebar };
