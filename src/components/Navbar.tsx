import React from 'react';
import { Menu, Plus, Sparkles, BrainCircuit } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNewSession: () => void;
  activeMode: 'canvas' | 'practice';
  onSwitchMode: (mode: 'canvas' | 'practice') => void;
  sessionTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNewSession,
  activeMode,
  onSwitchMode,
  sessionTitle,
}) => {
  return (
    <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-gray-100 bg-[#FDFDFD]/90 backdrop-blur-md sticky top-0 z-30">
      {/* Left: Menu & Geometric Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Abrir menú y sesiones"
          className="p-2 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sigma Mini Brand for Mobile / Desktop */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
            Σ
          </div>
          <span className="font-semibold text-base tracking-tight text-[#1A1A1A] hidden sm:inline">
            CalculusAI
          </span>
        </div>

        <span className="text-gray-300 hidden md:inline">/</span>

        {/* Breadcrumb Navigation */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
          <span>Biblioteca</span>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-xs">
            {activeMode === 'practice' ? 'Práctica Activa' : sessionTitle || 'Cálculo'}
          </span>
        </div>
      </div>

      {/* Center mode switcher - Geometric pills */}
      <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-medium border border-gray-200/60">
        <button
          type="button"
          onClick={() => onSwitchMode('canvas')}
          className={`px-3.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
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
          className={`px-3.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
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
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onNewSession}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-900 hover:border-gray-400 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-gray-600" />
          <span>Nueva sesión</span>
        </button>

        <div
          title="Usuario Activo"
          className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-200 cursor-default select-none"
        >
          AI
        </div>
      </div>
    </header>
  );
};

