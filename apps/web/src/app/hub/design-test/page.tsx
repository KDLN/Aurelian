'use client';

import Link from 'next/link';
import GameLayout from '@/components/GameLayout';

import './design-test.css';

const summaryStats = [
  { label: 'Gold Earned', value: '+12,450g', tone: 'positive' },
  { label: 'Contracts Closed', value: '7 deals', tone: 'neutral' },
  { label: 'Success Rate', value: '92%', tone: 'positive' },
  { label: 'Average Risk', value: 'Medium', tone: 'warning' },
];

const recentActivity = [
  { id: '1', icon: '🎯', message: 'Completed "Ghost Market Sweep"', meta: '14m ago · +850g' },
  { id: '2', icon: '💰', message: 'Sold 12× Quantum Resin at Auction', meta: '42m ago · +1,320g' },
  { id: '3', icon: '⚒️', message: 'Crafted 2× Arc Alloy Components', meta: '1h ago · Agent Vega' },
  { id: '4', icon: '🛰️', message: 'Unlocked Orbital Relay contract', meta: '2h ago · Reputation +12' },
];

const warehouseItems = [
  { id: 'w1', name: 'Quantum Resin', quantity: 48, meta: 'High demand · Tier III' },
  { id: 'w2', name: 'Arc Alloy', quantity: 31, meta: 'Stable pricing · Tier II' },
  { id: 'w3', name: 'Encrypted Keys', quantity: 19, meta: 'Mission critical · Tier I' },
  { id: 'w4', name: 'Flux Batteries', quantity: 12, meta: 'Crafting input · Tier II' },
];

const missions = [
  { id: 'm1', name: 'Ghost Market Sweep', risk: 'LOW', agent: 'Reyna', eta: '38m', progress: 68 },
  { id: 'm2', name: 'Signal Recovery', risk: 'MEDIUM', agent: 'Harlow', eta: '1h 12m', progress: 42 },
  { id: 'm3', name: 'Vault Intercept', risk: 'HIGH', agent: 'Cael', eta: '2h 04m', progress: 18 },
  { id: 'm4', name: 'Trade Route Escort', risk: 'LOW', agent: 'Nia', eta: '3h 18m', progress: 5 },
];

const serverEvents = [
  {
    id: 'e1',
    name: '⚡ Global Surge: Neon District',
    status: 'active',
    description: 'Deliver 18,000 units of Flux Batteries to stabilize the district grid.',
    progress: 12450,
    target: 18000,
    timeRemaining: '6h 12m'
  },
  {
    id: 'e2',
    name: '🛰️ Satellite Relay Reboot',
    status: 'scheduled',
    description: 'Collect encrypted access keys before the reboot window opens.',
    progress: 3200,
    target: 8500,
    timeRemaining: 'Starts in 2h'
  }
];

const agentRoster = [
  { id: 'a1', name: 'Reyna', role: 'Infiltrator', condition: 'Ready', focus: 'Espionage' },
  { id: 'a2', name: 'Harlow', role: 'Analyst', condition: 'On Mission', focus: 'Signal Mapping' },
  { id: 'a3', name: 'Cael', role: 'Vanguard', condition: 'Risk Alert', focus: 'High-threat Escort' },
  { id: 'a4', name: 'Nia', role: 'Negotiator', condition: 'Resting', focus: 'Diplomatic Trade' },
];

const newsFeed = [
  { id: 'n1', title: 'Aurelian Exchange lifts tariff on rare metals', time: '42m ago' },
  { id: 'n2', title: 'Guild Coalition extends co-op mission bonuses', time: '1h 18m ago' },
  { id: 'n3', title: 'Black Market price index hits 3-week low', time: '3h ago' },
];

const accountSnapshot = {
  gold: 42850,
  agents: '4 / 6',
  missions: 3,
  crafting: 2,
  guild: { tag: 'SYN', name: 'Synthesis Collective' }
};

export default function HubDesignTestPage() {
  const sidebar = (
    <aside className="hub-test-sidebar">
      <section className="hub-test-sidebar-section">
        <h3>Account Status</h3>
        <dl className="hub-test-statlist">
          <div className="hub-test-stat">
            <dt>Gold</dt>
            <dd className="game-good game-small">{accountSnapshot.gold.toLocaleString()}g</dd>
          </div>
          <div className="hub-test-stat">
            <dt>Agents</dt>
            <dd className="game-good game-small">{accountSnapshot.agents}</dd>
          </div>
          <div className="hub-test-stat">
            <dt>Active Missions</dt>
            <dd className="game-warn game-small">{accountSnapshot.missions}</dd>
          </div>
          <div className="hub-test-stat">
            <dt>Crafting Jobs</dt>
            <dd className="game-good game-small">{accountSnapshot.crafting}</dd>
          </div>
          <div className="hub-test-stat">
            <dt>Guild</dt>
            <dd className="game-good game-small">[{accountSnapshot.guild.tag}] {accountSnapshot.guild.name}</dd>
          </div>
        </dl>
      </section>

      <nav className="hub-test-sidebar-links" aria-label="Hub shortcuts">
        <Link href="/profile" className="game-btn game-btn-secondary hub-test-sidebar-link">
          👤 Profile
        </Link>
        <Link href="/guild" className="game-btn game-btn-secondary hub-test-sidebar-link">
          🏰 Guild Hall
        </Link>
        <Link href="/crafting" className="game-btn game-btn-secondary hub-test-sidebar-link">
          ⚒️ Crafting Bay
        </Link>
        <Link href="/missions" className="game-btn game-btn-secondary hub-test-sidebar-link">
          🚀 Mission Control
        </Link>
      </nav>
    </aside>
  );

  return (
    <GameLayout title="Hub Design Test" sidebar={sidebar} showChat={false}>
      <div className="hub-design-test">
        <section className="hub-design-test__header">
          <article className="game-card hub-card">
            <header>
              <h2>Welcome back, Operative.</h2>
              <p className="game-muted">
                Review progress, coordinate missions, and keep the trading pipeline stable before shipping these updates to the live hub.
              </p>
            </header>
            <div className="hub-summary-grid">
              {summaryStats.map(stat => (
                <div key={stat.label} className="hub-summary-item">
                  <span className="hub-summary-label">{stat.label}</span>
                  <span className="hub-summary-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="game-card hub-card">
            <header>
              <h3>Daily Snapshot</h3>
              <p className="game-muted game-small">Pulse metrics for layout validation</p>
            </header>
            <div className="hub-mission-grid hub-mission-grid--duo">
              {missions.slice(0, 2).map(mission => (
                <div key={mission.id} className="hub-mission-card">
                  <div className="hub-mission-header">
                    <span className="game-small">{mission.name}</span>
                    <span className={`hub-tag hub-tag--${mission.risk.toLowerCase()}`}>
                      {mission.risk}
                    </span>
                  </div>
                  <span className="hub-inline-meta">
                    <span>Agent {mission.agent}</span>
                    <span>ETA {mission.eta}</span>
                  </span>
                  <div className="hub-progress">
                    <div className="hub-progress__fill" style={{ width: `${mission.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="hub-design-test__grid" aria-label="Activity and inventory">
          <article className="game-card hub-card">
            <header>
              <h3>Recent Activity</h3>
              <p className="game-muted game-small">Verify spacing, truncation, and responsive stack</p>
            </header>
            <div className="hub-activity-list">
              {recentActivity.map(item => (
                <div key={item.id} className="hub-activity-item">
                  <div>
                    <div className="game-small">{item.icon} {item.message}</div>
                    <div className="hub-activity-meta">{item.meta}</div>
                  </div>
                  <Link href="#" className="game-btn game-btn-link game-small">
                    Details
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="game-card hub-card">
            <header>
              <h3>Top Warehouse Items</h3>
              <p className="game-muted game-small">Validate pill spacing and wrapping</p>
            </header>
            <div className="hub-resource-list">
              {warehouseItems.map(item => (
                <div key={item.id} className="hub-resource-item">
                  <div>
                    <div className="game-small">{item.name}</div>
                    <div className="hub-resource-meta">{item.meta}</div>
                  </div>
                  <span className="game-pill game-pill-good">{item.quantity}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="game-card hub-card" aria-label="Mission grid">
          <header>
            <h3>Mission Overview</h3>
            <p className="game-muted game-small">Cards auto-fit without collapsing details below 320px</p>
          </header>
          <div className="hub-mission-grid">
            {missions.map(mission => (
              <div key={mission.id} className="hub-mission-card">
                <div className="hub-mission-header">
                  <span className="game-small">{mission.name}</span>
                  <span className={`hub-tag hub-tag--${mission.risk.toLowerCase()}`}>
                    {mission.risk}
                  </span>
                </div>
                <span className="hub-inline-meta">
                  <span>Agent {mission.agent}</span>
                  <span>ETA {mission.eta}</span>
                </span>
                <div className="hub-progress">
                  <div className="hub-progress__fill" style={{ width: `${mission.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hub-design-test__grid--three" aria-label="Events, roster, and news">
          <article className="game-card hub-card">
            <header>
              <h3>Server Events</h3>
              <p className="game-muted game-small">Test stacked metadata and progress bars</p>
            </header>
            <div className="hub-activity-list">
              {serverEvents.map(event => {
                const percent = Math.min(100, Math.round((event.progress / event.target) * 100));
                return (
                  <div key={event.id} className="hub-mission-card">
                    <div className="hub-mission-header">
                      <span className="game-small">{event.name}</span>
                      <span className={`hub-tag hub-tag--${event.status === 'active' ? 'medium' : 'low'}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="game-muted game-small">{event.description}</p>
                    <div className="hub-inline-meta">
                      <span>{percent}% complete</span>
                      <span>{event.timeRemaining}</span>
                    </div>
                    <div className="hub-progress">
                      <div className="hub-progress__fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="game-card hub-card">
            <header>
              <h3>Agent Readiness</h3>
              <p className="game-muted game-small">Use stacked cards for roster checks</p>
            </header>
            <div className="hub-roster-list">
              {agentRoster.map(agent => (
                <div key={agent.id} className="hub-roster-item">
                  <strong>{agent.name}</strong>
                  <div className="hub-roster-meta">
                    <span>{agent.role}</span>
                    <span>{agent.condition}</span>
                  </div>
                  <span className="game-muted game-small">Focus: {agent.focus}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="game-card hub-card">
            <header>
              <h3>World News</h3>
              <p className="game-muted game-small">Ensure typography scales down cleanly</p>
            </header>
            <div className="hub-news-list">
              {newsFeed.map(item => (
                <div key={item.id} className="hub-news-item">
                  <strong>{item.title}</strong>
                  <time dateTime={item.time}>{item.time}</time>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </GameLayout>
  );
}
