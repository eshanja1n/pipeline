import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <img 
      src="/pipe.png" 
      alt="Pipeline Logo" 
      className={`${sizeClasses[size]} object-contain ${className}`}
      style={{
        filter: 'drop-shadow(0 0 0 transparent)',
        mixBlendMode: 'multiply',
        backgroundColor: 'transparent'
      }}
    />
  );
};