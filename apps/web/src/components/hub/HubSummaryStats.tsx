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
    <div className="ds-card">
      {title && (
        <h3 className="ds-heading-4 ds-mb-md">{title}</h3>
      )}

      <div className="ds-grid-4">
        {stats.map((stat, index) => (
          <div key={index} className="ds-card--nested">
            <div className="ds-stack ds-stack--xs">
              <div className="ds-text-xs ds-text-muted ds-text-uppercase">
                {stat.label}
              </div>
              <div className={`ds-text-lg ds-text-bold ${getToneClass(stat.tone)}`}>
                {stat.icon && <span className="ds-mr-xs">{stat.icon}</span>}
                {stat.value}
              </div>
            </div>
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
