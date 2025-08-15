import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80':
              variant === 'default',
            'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80':
              variant === 'secondary',
            'border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80':
              variant === 'destructive',
            'text-gray-950': variant === 'outline',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };