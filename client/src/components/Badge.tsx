interface BadgeProps {
  variant: 'success' | 'error' | 'info' | 'warning' | 'neutral' | 'ai';
  children: React.ReactNode;
  dot?: boolean;
}

const variants: Record<BadgeProps['variant'], string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  error:   'bg-red-100   dark:bg-red-900/30   text-red-700   dark:text-red-400',
  info:    'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-400',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  neutral: 'bg-slate-100 dark:bg-slate-800    text-slate-600 dark:text-slate-400',
  ai:      'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
};

const dotColors: Record<BadgeProps['variant'], string> = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  neutral: 'bg-slate-400',
  ai:      'bg-violet-500',
};

export function Badge({ variant, children, dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
