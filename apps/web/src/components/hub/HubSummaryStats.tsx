/**
 * HubSummaryStats Component
 *
 * Displays daily summary statistics in a 4-column grid.
 * Responsive: 4-column → 2-column → 1-column
 */

import React from 'react';

interface StatItem {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  icon?: string;
}

interface HubSummaryStatsProps {
  stats: StatItem[];
  title?: string;
}

export function HubSummaryStats({ stats, title = "Today's Summary" }: HubSummaryStatsProps) {
  return (
    <div className="ds-card--nested">
      {title && (
        <h4 className="ds-heading-4 ds-mb-sm">{title}</h4>
      )}

      <div className="ds-grid-2 ds-gap-sm ds-text-sm">
        {stats.map((stat, index) => (
          <div key={index} className="ds-split">
            <span className="ds-text-muted">{stat.label}:</span>
            <span className={`${getToneClass(stat.tone)}`}>
              {stat.icon && <span className="ds-mr-xs">{stat.icon}</span>}
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getToneClass(tone?: string): string {
  switch (tone) {
    case 'good':
      return 'ds-text-good';
    case 'warn':
      return 'ds-text-warn';
    case 'bad':
      return 'ds-text-bad';
    default:
      return '';
  }
}
