import React from 'react';
import { Menu, Plus, Sparkles, BrainCircuit } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNewSession: () => void;
  activeMode: 'canvas' | 'practice';
  onSwitchMode: (mode: 'canvas' | 'practice') => void;
  sessionTitle?: string;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNewSession,
  activeMode,
  onSwitchMode,
  sessionTitle,
  isSidebarOpen = false,
}) => {
  return (
    <header className="h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between border-b border-gray-100 bg-[#FDFDFD]/90 backdrop-blur-md sticky top-0 z-30 transition-all duration-300">
      {/* Left: Menu & Geometric Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            isSidebarOpen
              ? 'text-black bg-gray-100 hover:bg-gray-200/80'
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sigma Mini Brand for Mobile / Desktop */}
        <div className={`items-center gap-2 shrink-0 ${isSidebarOpen ? 'hidden md:flex' : 'flex'}`}>
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm select-none shrink-0">
            Σ
          </div>
          <span className="font-semibold text-base tracking-tight text-[#1A1A1A] hidden sm:inline">
            CalculusAI
          </span>
        </div>

        <span className="text-gray-300 hidden lg:inline shrink-0">/</span>

        {/* Breadcrumb Navigation */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 min-w-0 truncate">
          <span className="shrink-0">Biblioteca</span>
          <span className="shrink-0">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[120px] lg:max-w-xs xl:max-w-sm">
            {activeMode === 'practice' ? 'Práctica Activa' : sessionTitle || 'Cálculo'}
          </span>
        </div>
      </div>

      {/* Center mode switcher - Geometric pills */}
      <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-medium border border-gray-200/60 shrink-0 mx-2">
        <button
          type="button"
          onClick={() => onSwitchMode('canvas')}
          className={`px-3 sm:px-3.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
            activeMode === 'canvas'
              ? 'bg-white text-black shadow-xs font-semibold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode('practice')}
          className={`px-3 sm:px-3.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
            activeMode === 'practice'
              ? 'bg-white text-black shadow-xs font-semibold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Práctica</span>
        </button>
      </div>

      {/* Right: New session button + Profile avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onNewSession}
          className={`items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-900 hover:border-gray-400 shadow-xs transition-colors ${
            isSidebarOpen ? 'hidden xl:flex' : 'hidden sm:flex'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-gray-600" />
          <span>Nueva sesión</span>
        </button>

        <div
          title="Usuario Activo"
          className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-200 cursor-default select-none shrink-0"
        >
          AI
        </div>
      </div>
    </header>
  );
};

