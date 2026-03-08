interface BadgeProps {
  variant: 'success' | 'error' | 'info' | 'warning' | 'neutral';
  children: React.ReactNode;
}

const variants = {
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  neutral: 'bg-gray-100 text-gray-600',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
