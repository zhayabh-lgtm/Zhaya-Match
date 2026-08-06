import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layers, Palette, FileText, Eye, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Repository } from '../../lib/repository';
import { PublishStatusBar } from './PublishStatusBar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    Repository.getAppearance()
      .then((app) => {
        if (!isMounted) return;
        setLogoUrl(app?.logoBlackUrl || app?.logoWhiteUrl || null);
      })
      .catch((err) => {
        console.error('Erro ao carregar logo no layout admin:', err);
      })
      .finally(() => {
        if (isMounted) setLogoLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Tipos e medidas', path: '/admin/tipos-medidas', icon: Layers },
    { label: 'Aparência', path: '/admin/aparencia', icon: Palette },
    { label: 'Textos e imagens', path: '/admin/textos-imagens', icon: FileText },
    { label: 'Visualização', path: '/admin/visualizacao', icon: Eye },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between min-h-[76px]">
          <div>
            {logoLoading ? (
              <div className="h-7 w-28 bg-neutral-200 animate-pulse rounded" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Zhaya"
                decoding="async"
                className="h-7 max-w-[160px] object-contain block"
              />
            ) : (
              <div className="h-7 w-28 bg-neutral-100 rounded border border-dashed border-neutral-300 flex items-center justify-center">
                <span className="text-[10px] text-neutral-400 font-mono">LOGO ZHAYA</span>
              </div>
            )}
            <div className="text-[11px] text-neutral-500 uppercase tracking-widest font-mono mt-1">
              Painel de Controle
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 space-y-2">
          {user?.email && (
            <div className="px-3 py-1 text-[11px] text-neutral-500 font-mono truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PublishStatusBar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
};
