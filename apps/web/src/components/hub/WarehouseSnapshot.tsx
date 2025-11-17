/**
 * WarehouseSnapshot Component
 *
 * Displays top warehouse items with quantities and metadata.
 * Mobile-optimized with quantity pills.
 */

import React from 'react';

export interface WarehouseItem {
  name: string;
  quantity: number;
  demand?: 'high' | 'medium' | 'low';
  tier?: string;
}

interface WarehouseSnapshotProps {
  items: WarehouseItem[];
  title?: string;
  limit?: number;
}

export function WarehouseSnapshot({
  items,
  title = 'Warehouse Snapshot',
  limit = 4,
}: WarehouseSnapshotProps) {
  const displayItems = items.slice(0, limit);

  return (
    <div className="ds-card">
      <h3 className="ds-heading-4 ds-mb-md">{title}</h3>

      <div className="ds-stack ds-stack--sm">
        {displayItems.length === 0 ? (
          <div className="ds-text-sm ds-text-muted ds-text-center ds-py-lg">
            No items in warehouse
          </div>
        ) : (
          displayItems.map((item, index) => (
            <div key={index}>
              <div className="ds-split">
                <div className="ds-stack ds-stack--xs ds-flex-1">
                  <div className="ds-text-sm ds-text-bold">{item.name}</div>
                  <div className="ds-cluster ds-cluster--xs ds-hide-mobile">
                    {item.demand && (
                      <span className="ds-text-xs ds-text-muted">
                        Demand: {item.demand}
                      </span>
                    )}
                    {item.tier && (
                      <span className="ds-text-xs ds-text-muted">
                        Tier {item.tier}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`ds-pill ${getDemandPillClass(item.demand)}`}>
                  {item.quantity}x
                </div>
              </div>

              {index < displayItems.length - 1 && (
                <div className="ds-divider" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getDemandPillClass(demand?: string): string {
  switch (demand) {
    case 'high':
      return 'ds-pill--good';
    case 'medium':
      return 'ds-pill--warn';
    case 'low':
      return 'ds-pill--neutral';
    default:
      return 'ds-pill--neutral';
  }
}
