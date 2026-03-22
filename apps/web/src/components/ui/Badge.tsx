import React from 'react';
import { cn } from '../../lib/utils.ts';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-bg-tertiary text-text-secondary border border-gold-muted',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    gold: 'bg-gold/10 text-gold border border-gold/20',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string; dot?: string }> = {
    connected: { variant: 'success', label: 'Conectado', dot: 'status-dot-connected' },
    connecting: { variant: 'warning', label: 'Conectando', dot: 'status-dot-connecting' },
    qr: { variant: 'warning', label: 'QR Code', dot: 'status-dot-connecting' },
    disconnected: { variant: 'danger', label: 'Desconectado', dot: 'status-dot-disconnected' },
    running: { variant: 'info', label: 'Executando' },
    completed: { variant: 'success', label: 'Concluído' },
    failed: { variant: 'danger', label: 'Falhou' },
    active: { variant: 'success', label: 'Ativo' },
    inactive: { variant: 'default', label: 'Inativo' },
  };

  const cfg = config[status] || { variant: 'default', label: status };

  return (
    <Badge variant={cfg.variant}>
      {cfg.dot && <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />}
      {cfg.label}
    </Badge>
  );
}
