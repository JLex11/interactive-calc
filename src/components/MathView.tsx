import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  displayMode?: boolean;
  className?: string;
  onClickPart?: (part: string) => void;
  highlightPart?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  displayMode = false,
  className = '',
  onClickPart,
  highlightPart,
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      console.warn('KaTeX render error for:', math, e);
      return `<span class="text-stone-500 font-mono text-sm">${math}</span>`;
    }
  }, [math, displayMode]);

  return (
    <div
      className={`inline-block select-text ${displayMode ? 'w-full text-center py-1 overflow-x-auto max-w-full' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
