'use client';

/**
 * Hub Design Test Page
 *
 * Living documentation and testing playground for the Aurelian Design System.
 * This page showcases all design tokens, components, and layout patterns.
 *
 * Sections:
 * 1. Design Tokens Showcase (colors, typography, spacing)
 * 2. Component Library (buttons, cards, forms, pills, progress bars)
 * 3. Layout Patterns (grids, stacks, splits)
 * 4. Real Hub UI Preview (actual hub components with mock data)
 */

import React from 'react';
import {
  HubSummaryStats,
  ActivityFeed,
  WarehouseSnapshot,
  AgentRoster,
  NewsFeed,
  ActiveMissionsGrid,
} from '@/components/hub';
import type {
  ActivityItem,
  WarehouseItem,
  Agent,
  NewsItem,
  MissionData,
} from '@/components/hub';

export default function HubDesignTestPage() {
  return (
    <div className="ds">
      {/* Header */}
      <div className="ds-container ds-py-xl">
        <h1 className="ds-heading-1">Aurelian Design System</h1>
        <p className="ds-text-lg ds-text-muted">
          Living documentation and component showcase. Mobile-first, WCAG 2.1 AA compliant.
        </p>
      </div>

      {/* Section 1: Design Tokens Showcase */}
      <section className="ds-container ds-py-xl">
        <h2 className="ds-heading-2 ds-mb-lg">Design Tokens</h2>

        {/* Colors */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Colors</h3>
          <div className="ds-grid-4 ds-mb-lg">
            <ColorSwatch name="Background" var="--ds-bg" />
            <ColorSwatch name="Panel" var="--ds-bg-panel" />
            <ColorSwatch name="Input" var="--ds-bg-input" />
            <ColorSwatch name="Elevated" var="--ds-bg-elevated" />
          </div>
          <div className="ds-grid-4 ds-mb-lg">
            <ColorSwatch name="Text" var="--ds-text" />
            <ColorSwatch name="Text Muted" var="--ds-text-muted" />
            <ColorSwatch name="Text Dim" var="--ds-text-dim" />
            <ColorSwatch name="Border" var="--ds-border" />
          </div>
          <div className="ds-grid-4">
            <ColorSwatch name="Good (Success)" var="--ds-good" />
            <ColorSwatch name="Warn (Caution)" var="--ds-warn" />
            <ColorSwatch name="Bad (Danger)" var="--ds-bad" />
            <ColorSwatch name="Gold (Accent)" var="--ds-gold" />
          </div>
        </div>

        {/* Typography Scale */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Typography Scale</h3>
          <div className="ds-stack ds-stack--sm">
            <div className="ds-text-xs">Extra Small (12px) - Timestamps, metadata</div>
            <div className="ds-text-sm">Small (14px) - Labels, descriptions</div>
            <div className="ds-text-base">Base (16px) - Body text (default)</div>
            <div className="ds-text-lg">Large (18px) - Large body, small headings</div>
            <div className="ds-heading-4">Heading 4 (20px) - Medium headings</div>
            <div className="ds-heading-3">Heading 3 (24px) - Large headings</div>
            <div className="ds-heading-2">Heading 2 (32px) - Main headings</div>
            <div className="ds-heading-1">Heading 1 (40px) - Hero headings</div>
          </div>
        </div>

        {/* Spacing Scale */}
        <div className="ds-card">
          <h3 className="ds-heading-3 ds-mb-md">Spacing Scale (4px increments)</h3>
          <div className="ds-stack ds-stack--sm">
            <SpacingExample size="xs" label="4px" />
            <SpacingExample size="sm" label="8px" />
            <SpacingExample size="md" label="12px" />
            <SpacingExample size="lg" label="16px" />
            <SpacingExample size="xl" label="24px" />
            <SpacingExample size="2xl" label="32px" />
            <SpacingExample size="3xl" label="48px" />
          </div>
        </div>
      </section>

      {/* Section 2: Component Library */}
      <section className="ds-container ds-py-xl">
        <h2 className="ds-heading-2 ds-mb-lg">Component Library</h2>

        {/* Buttons */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Buttons</h3>

          <h4 className="ds-heading-4 ds-mb-sm ds-mt-lg">Variants</h4>
          <div className="ds-cluster ds-mb-lg">
            <button className="ds-btn">Default</button>
            <button className="ds-btn ds-btn--primary">Primary</button>
            <button className="ds-btn ds-btn--secondary">Secondary</button>
            <button className="ds-btn ds-btn--danger">Danger</button>
            <button className="ds-btn ds-btn--warning">Warning</button>
            <button className="ds-btn ds-btn--ghost">Ghost</button>
            <button className="ds-btn ds-btn--link">Link</button>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">Sizes</h4>
          <div className="ds-cluster ds-mb-lg">
            <button className="ds-btn ds-btn--sm">Small (40px)</button>
            <button className="ds-btn">Medium (44px - default)</button>
            <button className="ds-btn ds-btn--lg">Large (48px)</button>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">States</h4>
          <div className="ds-cluster">
            <button className="ds-btn ds-btn--primary">Enabled</button>
            <button className="ds-btn ds-btn--primary" disabled>Disabled</button>
          </div>
        </div>

        {/* Cards */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Cards</h3>

          <div className="ds-grid-3">
            <div className="ds-card">
              <div className="ds-heading-4">Default Card</div>
              <p className="ds-text-sm ds-text-muted">Standard card with default padding and borders.</p>
            </div>

            <div className="ds-card ds-card--elevated">
              <div className="ds-heading-4">Elevated Card</div>
              <p className="ds-text-sm ds-text-muted">Card with shadow for emphasis.</p>
            </div>

            <div className="ds-card">
              <div className="ds-heading-4">Nested Example</div>
              <div className="ds-card--nested ds-mt-sm">
                <div className="ds-text-sm">Nested card inside parent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Form Elements</h3>

          <div className="ds-grid-2">
            <div className="ds-form-group">
              <label className="ds-label">Text Input</label>
              <input type="text" className="ds-input" placeholder="Enter text..." />
              <div className="ds-form-hint">This is a hint text</div>
            </div>

            <div className="ds-form-group">
              <label className="ds-label">Select</label>
              <select className="ds-select">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>

            <div className="ds-form-group">
              <label className="ds-label">Textarea</label>
              <textarea className="ds-textarea" placeholder="Enter multiple lines..." rows={3} />
            </div>

            <div className="ds-form-group">
              <label className="ds-label">Checkbox & Radio</label>
              <div className="ds-cluster">
                <label className="ds-flex ds-items-center ds-gap-sm ds-cursor-pointer">
                  <input type="checkbox" className="ds-checkbox" />
                  <span className="ds-text-sm">Checkbox</span>
                </label>
                <label className="ds-flex ds-items-center ds-gap-sm ds-cursor-pointer">
                  <input type="radio" name="radio-example" className="ds-radio" />
                  <span className="ds-text-sm">Radio 1</span>
                </label>
                <label className="ds-flex ds-items-center ds-gap-sm ds-cursor-pointer">
                  <input type="radio" name="radio-example" className="ds-radio" />
                  <span className="ds-text-sm">Radio 2</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Pills & Badges */}
        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Pills & Badges</h3>
          <div className="ds-cluster">
            <span className="ds-pill ds-pill--neutral">Neutral</span>
            <span className="ds-pill ds-pill--good">Success</span>
            <span className="ds-pill ds-pill--warn">Warning</span>
            <span className="ds-pill ds-pill--bad">Danger</span>
            <span className="ds-pill ds-pill--accent">Accent</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="ds-card">
          <h3 className="ds-heading-3 ds-mb-md">Progress Bars</h3>

          <div className="ds-stack">
            <div className="ds-progress-group">
              <div className="ds-progress-label">
                <span>Default (Success)</span>
                <span className="ds-text-bold">75%</span>
              </div>
              <div className="ds-progress">
                <div className="ds-progress__fill" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="ds-progress-group">
              <div className="ds-progress-label">
                <span>Warning</span>
                <span className="ds-text-bold">50%</span>
              </div>
              <div className="ds-progress">
                <div className="ds-progress__fill ds-progress__fill--warn" style={{ width: '50%' }} />
              </div>
            </div>

            <div className="ds-progress-group">
              <div className="ds-progress-label">
                <span>Danger</span>
                <span className="ds-text-bold">25%</span>
              </div>
              <div className="ds-progress">
                <div className="ds-progress__fill ds-progress__fill--bad" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Layout Patterns */}
      <section className="ds-container ds-py-xl">
        <h2 className="ds-heading-2 ds-mb-lg">Layout Patterns</h2>

        <div className="ds-card ds-mb-xl">
          <h3 className="ds-heading-3 ds-mb-md">Responsive Grids</h3>
          <p className="ds-text-sm ds-text-muted ds-mb-lg">
            Grids automatically collapse to single column on mobile (640px).
          </p>

          <h4 className="ds-heading-4 ds-mb-sm">2-Column Grid</h4>
          <div className="ds-grid-2 ds-mb-lg">
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Column 1</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Column 2</div>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">3-Column Grid</h4>
          <div className="ds-grid-3 ds-mb-lg">
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Column 1</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Column 2</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Column 3</div>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">Auto-Fit Grid (min 220px)</h4>
          <div className="ds-grid-auto">
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Auto 1</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Auto 2</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Auto 3</div>
            <div className="ds-card ds-card--nested ds-text-center ds-py-lg">Auto 4</div>
          </div>
        </div>

        <div className="ds-card">
          <h3 className="ds-heading-3 ds-mb-md">Utility Layouts</h3>

          <h4 className="ds-heading-4 ds-mb-sm">Stack (vertical spacing)</h4>
          <div className="ds-card ds-card--nested ds-mb-lg">
            <div className="ds-stack ds-stack--sm">
              <div className="ds-text-sm">Item 1</div>
              <div className="ds-text-sm">Item 2</div>
              <div className="ds-text-sm">Item 3</div>
            </div>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">Split (space between)</h4>
          <div className="ds-card ds-card--nested ds-mb-lg">
            <div className="ds-split">
              <span>Left content</span>
              <span>Right content</span>
            </div>
          </div>

          <h4 className="ds-heading-4 ds-mb-sm">Cluster (horizontal wrap)</h4>
          <div className="ds-card ds-card--nested">
            <div className="ds-cluster">
              <span className="ds-pill ds-pill--neutral">Tag 1</span>
              <span className="ds-pill ds-pill--neutral">Tag 2</span>
              <span className="ds-pill ds-pill--neutral">Tag 3</span>
              <span className="ds-pill ds-pill--neutral">Tag 4</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Real Hub UI Preview */}
      <section className="ds-container ds-py-xl">
        <h2 className="ds-heading-2 ds-mb-lg">Hub UI Preview</h2>
        <p className="ds-text-lg ds-text-muted ds-mb-xl">
          Real hub components with mock data - this is what the actual hub page looks like.
        </p>

        {/* Hero Section - 2 column grid */}
        <div className="ds-grid-2 ds-mb-xl">
          <div>
            <div className="ds-card ds-mb-lg">
              <h2 className="ds-heading-2 ds-mb-sm">Welcome back, Trader</h2>
              <p className="ds-text-muted ds-mb-lg">
                The markets are bustling today. Your caravan awaits your orders.
              </p>

              <HubSummaryStats stats={mockSummaryStats} />
            </div>

            <ActivityFeed activities={mockActivities} limit={4} />
          </div>

          <div className="ds-stack">
            <WarehouseSnapshot items={mockWarehouseItems} />
            <AgentRoster agents={mockAgents} />
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="ds-stack ds-stack--xl">
          <ActiveMissionsGrid missions={mockMissions} />
          <NewsFeed news={mockNews} limit={3} />
        </div>
      </section>

      {/* Footer */}
      <footer className="ds-container ds-py-xl ds-text-center">
        <div className="ds-divider ds-mb-lg" />
        <p className="ds-text-sm ds-text-muted">
          Aurelian Design System • Mobile-first • WCAG 2.1 AA Compliant
        </p>
      </footer>
    </div>
  );
}

/* ============================================================================
   HELPER COMPONENTS
   ============================================================================ */

function ColorSwatch({ name, var: cssVar }: { name: string; var: string }) {
  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setValue(getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim());
    }
  }, [cssVar]);

  return (
    <div className="ds-card ds-card--nested">
      <div
        className="ds-rounded-md ds-mb-xs"
        style={{
          background: `var(${cssVar})`,
          height: '48px',
          border: '1px solid var(--ds-border-input)'
        }}
      />
      <div className="ds-text-xs ds-text-bold">{name}</div>
      <div className="ds-text-xs ds-text-dim">{value || cssVar}</div>
    </div>
  );
}

function SpacingExample({ size, label }: { size: string; label: string }) {
  return (
    <div className="ds-flex ds-items-center ds-gap-md">
      <div className="ds-text-xs ds-text-muted" style={{ width: '60px' }}>{label}</div>
      <div
        className="ds-bg-input ds-border ds-rounded-sm"
        style={{ width: `var(--ds-space-${size})`, height: '24px' }}
      />
    </div>
  );
}

/* ============================================================================
   MOCK DATA for Hub UI Preview
   ============================================================================ */

const mockSummaryStats = [
  { label: 'Gold Earned', value: '+12,450g', tone: 'good' as const, icon: '💰' },
  { label: 'Contracts Closed', value: '7 deals', tone: 'neutral' as const, icon: '📜' },
  { label: 'Success Rate', value: '92%', tone: 'good' as const, icon: '✅' },
  { label: 'Average Risk', value: 'Medium', tone: 'warn' as const, icon: '⚠️' },
];

const mockActivities: ActivityItem[] = [
  {
    icon: '🎯',
    message: 'Mission completed: Silk Road Expedition',
    time: '5 minutes ago',
    value: '+2,500g',
    valueType: 'gold',
    detailsUrl: '#',
  },
  {
    icon: '💼',
    message: 'Sold 50 Iron Ore on auction',
    time: '1 hour ago',
    value: '+1,250g',
    valueType: 'gold',
    detailsUrl: '#',
  },
  {
    icon: '⚒️',
    message: 'Crafting job completed: Steel Sword',
    time: '2 hours ago',
    valueType: 'good',
    detailsUrl: '#',
  },
  {
    icon: '🏆',
    message: 'Achievement unlocked: Master Trader',
    time: '3 hours ago',
    valueType: 'good',
    detailsUrl: '#',
  },
];

const mockWarehouseItems: WarehouseItem[] = [
  { name: 'Iron Ore', quantity: 240, demand: 'high', tier: 'Common' },
  { name: 'Silk Cloth', quantity: 85, demand: 'medium', tier: 'Rare' },
  { name: 'Pearl', quantity: 12, demand: 'high', tier: 'Epic' },
  { name: 'Herb Bundle', quantity: 156, demand: 'low', tier: 'Common' },
];

const mockAgents: Agent[] = [
  { name: 'Marcus Swift', condition: 'ready', role: 'Scout', focus: 'Speed' },
  { name: 'Elena Goldhand', condition: 'on_mission', role: 'Merchant', focus: 'Negotiation' },
  { name: 'Thor Ironforge', condition: 'resting', role: 'Guard', focus: 'Combat' },
  { name: 'Aria Moonwhisper', condition: 'risk_alert', role: 'Spy', focus: 'Stealth' },
];

const mockMissions: MissionData[] = [
  { name: 'Desert Caravan', risk: 'low', agentName: 'Marcus Swift', eta: '2 hours', progress: 75 },
  { name: 'Mountain Pass Delivery', risk: 'medium', agentName: 'Elena Goldhand', eta: '4 hours', progress: 45 },
  { name: 'Bandit Ambush Response', risk: 'high', agentName: 'Thor Ironforge', eta: '1 hour', progress: 90 },
  { name: 'Spy Infiltration', risk: 'medium', agentName: 'Aria Moonwhisper', eta: '6 hours', progress: 30 },
];

const mockNews: NewsItem[] = [
  { title: 'Iron prices surge after mine collapse', timestamp: '1 day ago', readUrl: '#' },
  { title: 'New trade route opened to Eastern Kingdoms', timestamp: '2 days ago', readUrl: '#' },
  { title: 'Bandit activity increased on Silk Road', timestamp: '3 days ago', readUrl: '#' },
];
