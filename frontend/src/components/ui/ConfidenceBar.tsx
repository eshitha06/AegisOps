
interface ConfidenceBarProps {
  score: number; // Supports 0.0-1.0 or 0-100
  showLabel?: boolean;
}

export default function ConfidenceBar({ score, showLabel = true }: ConfidenceBarProps) {
  // Normalize score to percentage (0 - 100)
  const percent = score <= 1.0 ? Math.round(score * 100) : Math.round(score);
  
  // Color configuration based on percentage
  let barColor = 'bg-brand-danger shadow-brand-danger/30';
  let textColor = 'text-brand-danger';
  
  if (percent >= 80) {
    barColor = 'bg-brand-success shadow-brand-success/30';
    textColor = 'text-brand-success';
  } else if (percent >= 50) {
    barColor = 'bg-brand-warning shadow-brand-warning/30';
    textColor = 'text-brand-warning';
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
          <span className="text-slate-400">AI Confidence</span>
          <span className={`${textColor} font-mono`}>{percent}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-brand-darkest/80 border border-brand-border/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor} shadow-[0_0_6px_currentColor]`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
