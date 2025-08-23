'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StatCard({ 
  label, 
  value, 
  icon, 
  variant = 'default',
  size = 'md',
  className 
}: StatCardProps) {
  const variantClasses = {
    default: 'stat-card-default',
    positive: 'stat-card-positive',
    negative: 'stat-card-negative',
    neutral: 'stat-card-neutral'
  };

  const sizeClasses = {
    sm: 'stat-card-sm',
    md: 'stat-card-md',
    lg: 'stat-card-lg'
  };

  return (
    <div className={cn(
      'stat-card', 
      variantClasses[variant], 
      sizeClasses[size], 
      className
    )}>
      {icon && (
        <div className="stat-card-icon">
          {icon}
        </div>
      )}
      <div className="stat-card-content">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
      </div>

      <style jsx>{`
        .stat-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 6px;
          transition: all 0.2s ease;
          min-height: 64px;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }

        .stat-card:hover {
          border-color: #533b2c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .stat-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: rgba(163, 106, 67, 0.2);
          color: #a36a43;
        }

        .stat-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .stat-card-label {
          font-size: 11px;
          color: #c7b38a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .stat-card-value {
          font-size: 14px;
          font-weight: 600;
          color: #f1e5c8;
          word-break: break-word;
        }

        /* Variant Styles */
        .stat-card-positive .stat-card-value {
          color: #4ade80;
        }

        .stat-card-positive .stat-card-icon {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        .stat-card-negative .stat-card-value {
          color: #f87171;
        }

        .stat-card-negative .stat-card-icon {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }

        .stat-card-neutral .stat-card-value {
          color: #c7b38a;
        }

        /* Size Variants */
        .stat-card-sm {
          padding: 8px;
          min-height: 48px;
        }

        .stat-card-sm .stat-card-icon {
          width: 24px;
          height: 24px;
        }

        .stat-card-sm .stat-card-label {
          font-size: 10px;
        }

        .stat-card-sm .stat-card-value {
          font-size: 12px;
        }

        .stat-card-lg {
          padding: 16px;
          min-height: 80px;
        }

        .stat-card-lg .stat-card-icon {
          width: 40px;
          height: 40px;
        }

        .stat-card-lg .stat-card-label {
          font-size: 12px;
        }

        .stat-card-lg .stat-card-value {
          font-size: 18px;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .stat-card {
            padding: 8px;
            min-height: 56px;
            gap: 6px;
          }

          .stat-card-icon {
            width: 28px;
            height: 28px;
          }

          .stat-card-label {
            font-size: 10px;
          }

          .stat-card-value {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}