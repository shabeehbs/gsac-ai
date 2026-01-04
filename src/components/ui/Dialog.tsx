import { ReactNode, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

function Dialog({ open, onClose, children, size = 'md' }: DialogProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        className={`
          relative bg-white rounded-2xl shadow-2xl
          w-full ${sizes[size]} max-h-[85vh] overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
      <div>{children}</div>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -mr-2">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-zinc-900">{children}</h2>;
}

function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-500 mt-0.5">{children}</p>;
}

function DialogContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 overflow-y-auto max-h-[60vh] ${className}`}>{children}</div>;
}

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
      {children}
    </div>
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter };
