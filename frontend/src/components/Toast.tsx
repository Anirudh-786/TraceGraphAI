import { useEffect, type ReactElement } from 'react';
import { IconCheck, IconAlertTriangle, IconClose } from './Icons';
import type { ToastType } from '../types';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'info',
  onClose,
  duration = 3500,
}: ToastProps): ReactElement | null {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast-notification toast-${type}`} role="status" aria-live="polite">
      <div className="toast-icon">
        {type === 'error' ? (
          <IconAlertTriangle size={15} />
        ) : (
          <IconCheck size={15} />
        )}
      </div>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss toast">
        <IconClose size={12} />
      </button>
    </div>
  );
}
