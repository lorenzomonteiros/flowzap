import React from 'react';
import { cn } from '../../lib/utils.ts';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gold?: boolean;
}

export function Card({ className, children, hover = false, gold = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-secondary border border-gold-muted rounded-card shadow-card',
        hover && 'cursor-pointer transition-all duration-200 hover:border-gold/30 hover:-translate-y-0.5 hover:shadow-gold',
        gold && 'border-gold/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-gold-muted flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('font-heading font-semibold text-text-primary text-lg', className)} {...props}>
      {children}
    </h3>
  );
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-gold-muted flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  );
}
