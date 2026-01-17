import { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex items-center justify-center h-full text-gray-400', className)}>
      <div className="text-center">
        {icon && (
          <div className="w-12 h-12 mx-auto mb-3 opacity-50">
            {icon}
          </div>
        )}
        <p>{title}</p>
        {description && (
          <p className="text-sm mt-1 text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}
