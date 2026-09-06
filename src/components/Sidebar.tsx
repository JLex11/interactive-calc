import React from 'react';
import {
  Plus,
  History,
  Bookmark,
  BookOpen,
  ChevronLeft,
  Trash2,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { SolutionSession, MathCategory } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SolutionSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onSelectTopic: (topic: string) => void;
  onSwitchToPractice: (topic?: string) => void;
  mode: 'canvas' | 'practice';
}

const TOPICS: { label: string; query: string; category: MathCategory }[] = [
  { label: 'Integral por partes: x·eˣ', query: 'integral x e^x dx', category: 'integral' },
  { label: 'Integral por partes: x²·sin(x)', query: 'integral x^2 sin(x) dx', category: 'integral' },
  { label: 'Derivada de ln(x)/x', query: 'derivada ln(x)/x', category: 'derivative' },
  { label: 'Regla de la cadena: (3x²-5)⁴', query: 'derivada (3x^2 - 5)^4', category: 'derivative' },
  { label: 'Límite notable: sin(x)/x', query: 'limite x->0 sin(x)/x', category: 'limit' },
  { label: 'Sustitución: 2x/(x²+1)', query: 'integral 2x / (x^2 + 1) dx', category: 'integral' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onSelectTopic,
  onSwitchToPractice,
  mode,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-2xs z-40 md:hidden"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 md:w-72 bg-[#FAFAFA] border-r border-gray-100 flex flex-col p-5 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header with Geometric Sigma Brand and Close on mobile */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xl select-none">
              Σ
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#1A1A1A]">CalculusAI</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Ocultar barra lateral"
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: + Nueva sesión (Geometric Pill) */}
        <button
          type="button"
          onClick={() => {
            onNewSession();
            if (window.innerWidth < 768) onClose();
          }}
          className="w-full py-2.5 px-4 mb-6 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-900 shadow-xs hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-gray-700" />
          <span>+ Nueva sesión</span>
        </button>

        {/* Nav list */}
        <div className="flex-1 overflow-y-auto space-y-6 text-sm pr-1">
          {/* Mode Switcher */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 ml-2">
              Modo de estudio
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onNewSession();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  mode === 'canvas'
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-gray-600" />
                <span>Canvas de Resolución</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSwitchToPractice();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  mode === 'practice'
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Práctica Activa (Tutor)</span>
              </button>
            </div>
          </div>

          {/* Recientes / Historial */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 ml-2">
              Reciente ({sessions.length})
            </div>

            {sessions.length === 0 ? (
              <p className="text-gray-400 text-xs px-2 italic">
                Aún no has resuelto ningún ejercicio.
              </p>
            ) : (
              <div className="space-y-1">
                {sessions.map((sess) => {
                  const isSelected = sess.id === currentSessionId && mode === 'canvas';
                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        onSelectSession(sess.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        isSelected
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <p className="truncate text-xs font-medium leading-snug">
                          {sess.title || sess.expression.rawInput}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          {sess.expression.rawInput}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => onDeleteSession(sess.id, e)}
                        title="Eliminar sesión"
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Temas / Biblioteca */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 ml-2">
              Biblioteca de Ejemplos
            </div>
            <div className="space-y-0.5">
              {TOPICS.map((top, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectTopic(top.query);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 text-xs transition-colors truncate block"
                >
                  {top.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Geometric Balance Footer with Status */}
        <div className="mt-auto pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between select-none">
          <span>Modo Profesor</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-emerald-600 font-medium">Activo</span>
          </span>
        </div>
      </aside>
    </>
  );
};

