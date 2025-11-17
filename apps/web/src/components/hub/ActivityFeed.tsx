/**
 * ActivityFeed Component
 *
 * Displays recent account activity with icons, messages, and metadata.
 * Mobile-optimized with responsive layout.
 */

import React from 'react';

export interface ActivityItem {
  icon: string;
  message: string;
  time: string;
  value?: string;
  valueType?: 'gold' | 'neutral' | 'good' | 'bad';
  detailsUrl?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  limit?: number;
}

export function ActivityFeed({ activities, title = 'Recent Activity', limit }: ActivityFeedProps) {
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="ds-card">
      <h3 className="ds-heading-4 ds-mb-md">{title}</h3>

      <div className="ds-stack ds-stack--sm">
        {displayActivities.length === 0 ? (
          <div className="ds-text-sm ds-text-muted ds-text-center ds-py-lg">
            No recent activity
          </div>
        ) : (
          displayActivities.map((activity, index) => (
            <div key={index}>
              <div className="ds-split">
                <div className="ds-flex ds-items-center ds-gap-sm ds-flex-1">
                  <span className="ds-text-lg" role="img" aria-label={activity.icon}>
                    {activity.icon}
                  </span>
                  <div className="ds-stack ds-stack--xs ds-flex-1">
                    <div className="ds-text-sm">{activity.message}</div>
                    <div className="ds-text-xs ds-text-dim">
                      {activity.time}
                      {activity.value && (
                        <>
                          {' • '}
                          <span className={getValueClass(activity.valueType)}>
                            {activity.value}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {activity.detailsUrl && (
                  <a
                    href={activity.detailsUrl}
                    className="ds-btn--link ds-text-sm ds-hide-mobile"
                  >
                    Details
                  </a>
                )}
              </div>

              {index < displayActivities.length - 1 && (
                <div className="ds-divider" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getValueClass(valueType?: string): string {
  switch (valueType) {
    case 'gold':
      return 'ds-text-gold';
    case 'good':
      return 'ds-text-good';
    case 'bad':
      return 'ds-text-bad';
    default:
      return '';
  }
}
