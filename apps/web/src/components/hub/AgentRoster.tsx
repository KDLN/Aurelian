/**
 * AgentRoster Component
 *
 * Displays agent status cards with color-coded conditions.
 * Nested card design for each agent.
 */

import React from 'react';

export interface Agent {
  name: string;
  condition: 'ready' | 'on_mission' | 'resting' | 'risk_alert';
  role?: string;
  focus?: string;
}

interface AgentRosterProps {
  agents: Agent[];
  title?: string;
}

export function AgentRoster({ agents, title = 'Agent Roster' }: AgentRosterProps) {
  return (
    <div className="ds-card">
      <h3 className="ds-heading-4 ds-mb-md">{title}</h3>

      <div className="ds-stack ds-stack--sm">
        {agents.length === 0 ? (
          <div className="ds-text-sm ds-text-muted ds-text-center ds-py-lg">
            No agents available
          </div>
        ) : (
          agents.map((agent, index) => (
            <div key={index} className="ds-card--nested">
              <div className="ds-split ds-mb-xs">
                <div className="ds-text-sm ds-text-bold">{agent.name}</div>
                <div className={`ds-pill ${getConditionPillClass(agent.condition)}`}>
                  {formatCondition(agent.condition)}
                </div>
              </div>

              {(agent.role || agent.focus) && (
                <div className="ds-text-xs ds-text-muted">
                  {agent.role && <span>{agent.role}</span>}
                  {agent.role && agent.focus && <span> • </span>}
                  {agent.focus && <span>Focus: {agent.focus}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getConditionPillClass(condition: string): string {
  switch (condition) {
    case 'ready':
      return 'ds-pill--good';
    case 'on_mission':
      return 'ds-pill--neutral';
    case 'resting':
      return 'ds-pill--warn';
    case 'risk_alert':
      return 'ds-pill--bad';
    default:
      return 'ds-pill--neutral';
  }
}

function formatCondition(condition: string): string {
  switch (condition) {
    case 'ready':
      return 'Ready';
    case 'on_mission':
      return 'On Mission';
    case 'resting':
      return 'Resting';
    case 'risk_alert':
      return 'Risk Alert';
    default:
      return condition;
  }
}
