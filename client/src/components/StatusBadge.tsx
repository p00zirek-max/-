import { Lock, Clock, Moon, AlertTriangle, CheckCircle, FileText, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

type ShiftStatus = 'pending' | 'confirmed' | 'locked' | 'night' | 'draft' | 'overtime' | 'error' | 'accord';

interface StatusBadgeProps {
  status: ShiftStatus;
  className?: string;
  /** Show dot indicator instead of icon */
  dot?: boolean;
}

interface StatusConfig {
  label: string;
  icon: ReactNode;
  textColor: string;
  bgColor: string;
}

const statusConfig: Record<ShiftStatus, StatusConfig> = {
  pending: {
    label: 'Ожидание',
    icon: <Clock className="h-3 w-3" />,
    textColor: 'var(--color-warning)',
    bgColor: 'rgba(245,158,11,0.15)',
  },
  confirmed: {
    label: 'Подтверждено',
    icon: <CheckCircle className="h-3 w-3" />,
    textColor: 'var(--color-success)',
    bgColor: 'rgba(34,197,94,0.15)',
  },
  locked: {
    label: 'Заблокировано',
    icon: <Lock className="h-3 w-3" />,
    textColor: 'var(--color-shift-locked)',
    bgColor: 'rgba(107,114,128,0.15)',
  },
  night: {
    label: 'Ночная',
    icon: <Moon className="h-3 w-3" />,
    textColor: 'var(--color-shift-night)',
    bgColor: 'rgba(167,139,250,0.15)',
  },
  draft: {
    label: 'Черновик',
    icon: <FileText className="h-3 w-3" />,
    textColor: 'var(--color-shift-planned)',
    bgColor: 'rgba(96,165,250,0.15)',
  },
  overtime: {
    label: 'Переработка',
    icon: <Timer className="h-3 w-3" />,
    textColor: '#F97316',
    bgColor: 'rgba(249,115,22,0.15)',
  },
  error: {
    label: 'Ошибка',
    icon: <AlertTriangle className="h-3 w-3" />,
    textColor: 'var(--color-error)',
    bgColor: 'rgba(239,68,68,0.15)',
  },
  accord: {
    label: 'Аккорд',
    icon: <CheckCircle className="h-3 w-3" />,
    textColor: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.15)',
  },
};

export function StatusBadge({ status, className = '', dot = false }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 h-[22px] px-2',
        'rounded-[var(--radius-sm)] text-small font-medium',
        className,
      ].join(' ')}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {dot ? (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.textColor }}
        />
      ) : (
        config.icon
      )}
      {config.label}
    </span>
  );
}
