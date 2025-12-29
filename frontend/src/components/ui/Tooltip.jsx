/**
 * Tooltip - Composant de Tooltip Unifié (Style Mauve)
 * 
 * Style unique pour toute l'application :
 * - Fond mauve/violet (#7c3aed / purple-600)
 * - Texte blanc
 * - Radius doux
 * - Ombre légère
 * - Taille compacte
 */

import React, { useState, memo } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = memo(({
  content,
  children,
  position = 'top',
  icon = false,
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  let timeoutId;

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[#005EA8]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#005EA8]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[#005EA8]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[#005EA8]'
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon ? (
        <HelpCircle className="w-3.5 h-3.5 text-[#005EA8] cursor-help" />
      ) : (
        children
      )}

      {isVisible && content && (
        <>
          {/* Tooltip */}
          <div
            className={`
              absolute z-50 px-3 py-2 text-xs text-white bg-[#005EA8] rounded-lg shadow-lg
              whitespace-nowrap max-w-xs
              ${positionClasses[position]}
            `}
            style={{
              animation: 'fadeIn 0.15s ease-in-out',
              pointerEvents: 'none'
            }}
          >
            {content}

            {/* Arrow */}
            <div
              className={`
                absolute w-0 h-0 
                border-4 border-transparent
                ${arrowClasses[position]}
              `}
            />
          </div>
        </>
      )}
    </div>
  );
});

Tooltip.displayName = 'Tooltip';

// Composants compatibles avec l'API existante
export function TooltipProvider({ children }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className = "" }) {
  return <div className={"hidden " + className}>{children}</div>;
}

export default Tooltip;
