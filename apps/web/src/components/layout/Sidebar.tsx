import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Users,
  MessageSquare,
  Smartphone,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { useInstanceStore } from '../../stores/instanceStore.ts';
import { authService } from '../../services/auth.service.ts';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Fluxos', path: '/flows', icon: <GitBranch size={18} /> },
  { label: 'Contatos', path: '/contacts', icon: <Users size={18} /> },
  { label: 'Conversas', path: '/conversations', icon: <MessageSquare size={18} /> },
  { label: 'Instâncias', path: '/instances', icon: <Smartphone size={18} /> },
  { label: 'Webhooks', path: '/webhooks', icon: <Webhook size={18} /> },
  { label: 'Configurações', path: '/settings', icon: <Settings size={18} /> },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { instances } = useInstanceStore();
  const navigate = useNavigate();

  const connectedCount = instances.filter((i) => i.status === 'connected').length;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    logout();
    navigate('/');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-bg-secondary border-r border-gold-muted transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center px-4 py-5 border-b border-gold-muted', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
          <Zap size={16} className="text-bg-primary" />
        </div>
        {!collapsed && (
          <span className="font-heading font-bold text-lg text-gold-gradient">FlowZap</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-btn transition-all duration-150 group',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* WhatsApp Status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gold-muted">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                connectedCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-text-muted'
              )}
            />
            <span>
              {connectedCount > 0
                ? `${connectedCount} instância${connectedCount > 1 ? 's' : ''} conectada${connectedCount > 1 ? 's' : ''}`
                : 'Nenhuma instância conectada'}
            </span>
          </div>
        </div>
      )}

      {/* User Section */}
      <div
        className={cn(
          'flex items-center border-t border-gold-muted p-3',
          collapsed ? 'flex-col gap-2' : 'gap-3'
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-bg-primary text-sm font-bold">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-secondary truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex-shrink-0 p-1.5 text-text-secondary hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-bg-secondary border border-gold-muted rounded-full flex items-center justify-center text-text-secondary hover:text-gold hover:border-gold/40 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
