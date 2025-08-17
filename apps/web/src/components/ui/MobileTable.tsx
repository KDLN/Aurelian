import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MobileTableProps {
  data: any[];
  renderCard: (item: any, index: number) => ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function MobileTable({ 
  data, 
  renderCard, 
  emptyMessage = 'No items found',
  className = '' 
}: MobileTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-[#c7b38a]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item, index) => renderCard(item, index))}
    </div>
  );
}

// Helper component for mobile list items
interface MobileListItemProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>;
  rightContent?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  badges,
  rightContent,
  actions,
  onClick,
  className = ''
}: MobileListItemProps) {
  return (
    <Card 
      className={`bg-[#2e231d] border-[#4b3527] p-3 ${onClick ? 'cursor-pointer hover:bg-[#3a2f29]' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm break-words">{title}</h4>
            {subtitle && (
              <p className="text-xs text-[#c7b38a] mt-1">{subtitle}</p>
            )}
          </div>
          {rightContent && (
            <div className="text-right flex-shrink-0">
              {rightContent}
            </div>
          )}
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((badge, index) => (
              <Badge key={index} variant={badge.variant || 'default'} className="text-xs">
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex gap-2 pt-2 border-t border-[#4b3527]">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}

// Helper for displaying key-value pairs in mobile
interface MobileDataRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileDataRow({ label, value, className = '' }: MobileDataRowProps) {
  return (
    <div className={`flex justify-between items-center py-1 ${className}`}>
      <span className="text-xs text-[#c7b38a]">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}