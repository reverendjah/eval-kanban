import clsx from 'clsx';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'blue' | 'white';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const colorClasses: Record<SpinnerColor, string> = {
  blue: 'border-blue-500',
  white: 'border-white',
};

export function Spinner({ size = 'md', color = 'blue', className }: SpinnerProps) {
  return (
    <span
      className={clsx(
        'animate-spin border-2 border-t-transparent rounded-full inline-block',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
}
