import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => {
  return (
    <div className={`relative group flex items-center ${className}`}>
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 bg-brand-dark border border-brand-purple/50 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-nowrap">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
