import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../hooks/useToast.ts';
import { cn } from '../../lib/utils.ts';

const icons = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

const styles = {
  success: 'border-green-500/20 bg-green-500/5',
  error: 'border-red-500/20 bg-red-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-card border shadow-card animate-slide-in-right',
            'bg-bg-secondary',
            styles[toast.type]
          )}
        >
          <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
          <p className="text-sm text-text-primary flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
