import { cn } from '../../lib/utils.ts';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, disabled = false, label, size = 'md' }: ToggleProps) {
  const sizes = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  };

  const s = sizes[size];

  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/40',
          s.track,
          checked ? 'bg-gold' : 'bg-bg-tertiary border border-gold-muted'
        )}
        disabled={disabled}
      >
        <span
          className={cn(
            'absolute left-0.5 inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
            s.thumb,
            checked && s.translate
          )}
        />
      </button>
      {label && (
        <span className="text-sm text-text-secondary">{label}</span>
      )}
    </label>
  );
}
