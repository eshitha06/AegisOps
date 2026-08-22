
interface StatusBadgeProps {
  value: string;
}

export default function StatusBadge({ value }: StatusBadgeProps) {
  const normalizedValue = value.toLowerCase();
  
  let styles = 'bg-slate-800 text-slate-400 border-slate-700';
  let glowClass = '';

  switch (normalizedValue) {
    // Incident statuses, severities & recovery actions
    case 'open':
    case 'critical':
    case 'failed':
      styles = 'bg-brand-danger/10 text-brand-danger border-brand-danger/30';
      glowClass = 'glow-danger';
      break;
    case 'investigating':
    case 'high':
    case 'pending':
      styles = 'bg-brand-warning/10 text-brand-warning border-brand-warning/30';
      glowClass = 'glow-warning';
      break;
    case 'resolved':
    case 'executed':
      styles = 'bg-brand-success/10 text-brand-success border-brand-success/30';
      glowClass = 'glow-success';
      break;
    case 'approved':
    case 'medium':
      styles = 'bg-brand-primary/10 text-brand-primary border-brand-primary/30';
      glowClass = 'glow-primary';
      break;
    case 'low':
      styles = 'bg-brand-accent/10 text-brand-accent border-brand-accent/30';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border transition-all duration-300 ${styles} ${glowClass}`}>
      {value}
    </span>
  );
}
