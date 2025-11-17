/**
 * ActiveMissionsGrid Component
 *
 * Displays active missions in a responsive auto-fit grid.
 * Uses existing MissionCard component for individual missions.
 */

import React from 'react';

export interface MissionData {
  name: string;
  risk: 'low' | 'medium' | 'high';
  agentName?: string;
  eta?: string;
  progress: number; // 0-100
}

interface ActiveMissionsGridProps {
  missions: MissionData[];
  title?: string;
}

export function ActiveMissionsGrid({ missions, title = 'Active Missions' }: ActiveMissionsGridProps) {
  return (
    <div className="ds-card">
      <h3 className="ds-heading-4 ds-mb-md">{title}</h3>

      {missions.length === 0 ? (
        <div className="ds-text-sm ds-text-muted ds-text-center ds-py-lg">
          No active missions
        </div>
      ) : (
        <div className="ds-grid-auto">
          {missions.map((mission, index) => (
            <MissionCard key={index} mission={mission} />
          ))}
        </div>
      )}
    </div>
  );
}

// Mission card component (simplified version using design system)
function MissionCard({ mission }: { mission: MissionData }) {
  return (
    <div className="ds-card--nested">
      <div className="ds-stack ds-stack--xs">
        {/* Mission header with name and risk tag */}
        <div className="ds-split ds-mb-xs">
          <div className="ds-text-sm ds-text-bold ds-flex-1">{mission.name}</div>
          <div className={`ds-pill ${getRiskPillClass(mission.risk)}`}>
            {mission.risk.toUpperCase()}
          </div>
        </div>

        {/* Agent and ETA info */}
        {(mission.agentName || mission.eta) && (
          <div className="ds-text-xs ds-text-muted">
            {mission.agentName && <span>{mission.agentName}</span>}
            {mission.agentName && mission.eta && <span> • </span>}
            {mission.eta && <span>ETA: {mission.eta}</span>}
          </div>
        )}

        {/* Progress bar */}
        <div className="ds-progress-group ds-mt-sm">
          <div className="ds-progress-label">
            <span>Progress</span>
            <span className="ds-text-bold">{mission.progress}%</span>
          </div>
          <div className="ds-progress">
            <div
              className={`ds-progress__fill ${getProgressFillClass(mission.risk)}`}
              style={{ width: `${mission.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getRiskPillClass(risk: string): string {
  switch (risk) {
    case 'low':
      return 'ds-pill--good';
    case 'medium':
      return 'ds-pill--warn';
    case 'high':
      return 'ds-pill--bad';
    default:
      return 'ds-pill--neutral';
  }
}

function getProgressFillClass(risk: string): string {
  switch (risk) {
    case 'low':
      return '';
    case 'medium':
      return 'ds-progress__fill--warn';
    case 'high':
      return 'ds-progress__fill--bad';
    default:
      return '';
  }
}
