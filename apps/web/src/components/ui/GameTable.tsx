import React from 'react';
import { cn } from '@/lib/utils';

interface GameTableProps {
  children: React.ReactNode;
  variant?: 'default' | 'auction';
  mobile?: boolean;
  className?: string;
}

interface GameTableHeaderProps {
  children: React.ReactNode;
}

interface GameTableBodyProps {
  children: React.ReactNode;
}

interface GameTableRowProps {
  children: React.ReactNode;
  className?: string;
}

interface GameTableCellProps {
  children: React.ReactNode;
  header?: boolean;
  className?: string;
}

export function GameTable({ children, variant = 'default', mobile = false, className }: GameTableProps) {
  const tableClasses = cn(
    'game-table',
    variant === 'auction' && 'game-table-auction',
    mobile && 'game-table-mobile',
    className
  );

  return (
    <div className="game-table-container">
      <table className={tableClasses}>
        {children}
      </table>
    </div>
  );
}

export function GameTableHeader({ children }: GameTableHeaderProps) {
  return <thead>{children}</thead>;
}

export function GameTableBody({ children }: GameTableBodyProps) {
  return <tbody>{children}</tbody>;
}

export function GameTableRow({ children, className }: GameTableRowProps) {
  return <tr className={className}>{children}</tr>;
}

export function GameTableCell({ children, header = false, className }: GameTableCellProps) {
  const Component = header ? 'th' : 'td';
  return <Component className={className}>{children}</Component>;
}

// Export as default for convenience
export default GameTable;