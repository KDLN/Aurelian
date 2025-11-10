'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';

type WikiSection = {
  id: string;
  title: string;
  icon: string;
  content: React.JSX.Element;
};

export default function WikiPage() {
  const [selectedSection, setSelectedSection] = useState('overview');

  const wikiSections: WikiSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📖',
      content: (
        <div>
          <h4>Welcome to Aurelian</h4>
          <p>
            Aurelian is a multiplayer 2D trading and exploration game where players manage agents,
            complete missions, craft items, and trade in a dynamic economy. Players can form guilds,
            participate in server-wide events, and compete on leaderboards.
          </p>

          <h5>Core Gameplay Loop</h5>
          <ol>
            <li><strong>Hire Agents</strong> - Build your team of specialized operatives</li>
            <li><strong>Send on Missions</strong> - Earn gold and gather resources</li>
            <li><strong>Craft Items</strong> - Transform raw materials into valuable goods</li>
            <li><strong>Trade</strong> - Buy and sell on the auction house</li>
            <li><strong>Upgrade</strong> - Level up agents and unlock new blueprints</li>
            <li><strong>Collaborate</strong> - Join guilds and participate in server events</li>
          </ol>
        </div>
      )
    },
    {
      id: 'economy',
      title: 'Economy',
      icon: '💰',
      content: (
        <div>
          <h4>Gold System</h4>

          <h5>Earning Gold</h5>
          <ul>
            <li>Complete missions (50-500g depending on risk)</li>
            <li>Sell items on the auction house</li>
            <li>Complete crafting jobs for profit</li>
            <li>Participate in server events</li>
          </ul>

          <h5>Spending Gold</h5>
          <ul>
            <li>Hire agents (100-400g depending on type)</li>
            <li>Buy items from auction house</li>
            <li>Pay auction fees (2-12% based on listing duration)</li>
            <li>Pay travel tolls on trade routes</li>
          </ul>

          <h5>Market Dynamics</h5>
          <ul>
            <li><strong>Dynamic Pricing:</strong> Item prices fluctuate based on supply and demand</li>
            <li><strong>Market Events:</strong> Special events that affect prices</li>
            <li><strong>Price Tracking:</strong> Historical price data available</li>
            <li><strong>Hub-Specific Prices:</strong> Different locations have different prices</li>
          </ul>
        </div>
      )
    },
    {
      id: 'trading',
      title: 'Trading',
      icon: '🏪',
      content: (
        <div>
          <h4>Auction House</h4>
          <p>Real-time multiplayer trading system using WebSocket connections.</p>

          <h5>Listing Items</h5>
          <ul>
            <li>Item must be in your warehouse</li>
            <li>Choose quantity and price per unit</li>
            <li>Select duration (6, 12, 24, 36, or 60 minutes)</li>
          </ul>

          <h5>Auction Fees</h5>
          <table className="game-table">
            <thead>
              <tr>
                <th>Duration</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>6 minutes</td><td>2%</td></tr>
              <tr><td>12 minutes</td><td>3%</td></tr>
              <tr><td>24 minutes</td><td>5%</td></tr>
              <tr><td>36 minutes</td><td>8%</td></tr>
              <tr><td>60 minutes</td><td>12%</td></tr>
            </tbody>
          </table>

          <h5>Example</h5>
          <div className="game-card-nested">
            <p>List 10 Iron Ore at 50g each for 24 minutes:</p>
            <ul>
              <li>Total value: 500g</li>
              <li>Fee (5%): 25g</li>
              <li>You receive: 475g when sold</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'crafting',
      title: 'Crafting',
      icon: '🔨',
      content: (
        <div>
          <h4>Blueprint System</h4>
          <p>Recipes for creating items from raw materials.</p>

          <h5>Blueprint Properties</h5>
          <ul>
            <li><strong>Required Level:</strong> Minimum crafting level needed</li>
            <li><strong>Time:</strong> Base crafting duration (10-60+ minutes)</li>
            <li><strong>Category:</strong> general, weapons, armor, tools, etc.</li>
            <li><strong>Inputs:</strong> Required materials and quantities</li>
            <li><strong>Output:</strong> Item produced and quantity</li>
            <li><strong>XP Reward:</strong> Experience gained on completion</li>
          </ul>

          <h5>Crafting Process</h5>
          <ol>
            <li><strong>Select Blueprint:</strong> Choose from unlocked recipes</li>
            <li><strong>Check Materials:</strong> Ensure you have required items</li>
            <li><strong>Set Quantity:</strong> Craft multiple (10% time reduction for batches)</li>
            <li><strong>Start Job:</strong> Items are queued for crafting</li>
            <li><strong>Wait:</strong> Job completes after time elapses</li>
            <li><strong>Claim Rewards:</strong> Receive items and XP</li>
          </ol>

          <h5>Leveling</h5>
          <p>Gain XP by completing crafting jobs. Level up to unlock new blueprints and recipes.</p>
          <div className="game-card-nested">
            <p><strong>XP Formula:</strong> XP Required = Current Level × 100</p>
            <p className="game-small game-muted">Example: Level 3 → 4 requires 300 XP</p>
          </div>
        </div>
      )
    },
    {
      id: 'missions',
      title: 'Missions',
      icon: '🎯',
      content: (
        <div>
          <h4>Mission System</h4>
          <p>Send agents on timed expeditions to earn rewards.</p>

          <h5>Mission Properties</h5>
          <ul>
            <li><strong>Route:</strong> From Hub → To Hub</li>
            <li><strong>Distance:</strong> Travel distance in km</li>
            <li><strong>Duration:</strong> Time to complete (5-60 minutes)</li>
            <li><strong>Risk Level:</strong> LOW, MEDIUM, or HIGH</li>
            <li><strong>Rewards:</strong> Gold and items</li>
          </ul>

          <h5>Risk Levels</h5>
          <table className="game-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Success Rate</th>
                <th>Duration</th>
                <th>Rewards</th>
              </tr>
            </thead>
            <tbody>
              <tr className="game-good">
                <td>LOW</td>
                <td>85%</td>
                <td>5-10 min</td>
                <td>1.0x</td>
              </tr>
              <tr className="game-warn">
                <td>MEDIUM</td>
                <td>65%</td>
                <td>15-30 min</td>
                <td>1.5x</td>
              </tr>
              <tr className="game-bad">
                <td>HIGH</td>
                <td>40%</td>
                <td>30-60 min</td>
                <td>2.5x</td>
              </tr>
            </tbody>
          </table>

          <h5>Success Calculation</h5>
          <div className="game-card-nested">
            <p>Base Success Rate (by risk level)</p>
            <p>+ Agent's Success Bonus</p>
            <p>+ Equipment Bonuses</p>
            <p className="game-good">= Final Success Rate</p>
          </div>

          <h5>Mission Completion</h5>
          <ul>
            <li><strong>Success:</strong> Full gold + items + agent XP</li>
            <li><strong>Failure:</strong> Partial gold (25-50%) + agent XP</li>
          </ul>
        </div>
      )
    },
    {
      id: 'agents',
      title: 'Agents',
      icon: '👥',
      content: (
        <div>
          <h4>Agent System</h4>
          <p>Hire specialized NPCs to handle missions and operations.</p>

          <h5>Agent Types</h5>
          <table className="game-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Success</th>
                <th>Speed</th>
                <th>Reward</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Scout</td>
                <td>+5%</td>
                <td>+15%</td>
                <td>+0%</td>
                <td>100g</td>
              </tr>
              <tr>
                <td>Trader</td>
                <td>+0%</td>
                <td>+0%</td>
                <td>+25%</td>
                <td>200g</td>
              </tr>
              <tr>
                <td>Guard</td>
                <td>+20%</td>
                <td>-5%</td>
                <td>+0%</td>
                <td>150g</td>
              </tr>
              <tr>
                <td>Specialist</td>
                <td>+10%</td>
                <td>+5%</td>
                <td>+10%</td>
                <td>400g</td>
              </tr>
            </tbody>
          </table>

          <h5>Equipment Slots</h5>
          <ol>
            <li>⚔️ <strong>Weapon</strong> - Offensive bonuses</li>
            <li>🛡️ <strong>Armor</strong> - Defensive bonuses</li>
            <li>🔧 <strong>Tool</strong> - Utility bonuses</li>
            <li>💎 <strong>Accessory</strong> - Special bonuses</li>
          </ol>

          <h5>Equipment Properties</h5>
          <ul>
            <li><strong>Rarity:</strong> COMMON → LEGENDARY</li>
            <li><strong>Success Bonus:</strong> Improves mission success rate</li>
            <li><strong>Speed Bonus:</strong> Reduces mission duration</li>
            <li><strong>Reward Bonus:</strong> Increases gold earned</li>
            <li><strong>Min Level:</strong> Required agent level</li>
          </ul>

          <h5>Agent Limits</h5>
          <p>Maximum 4 agents per player</p>
        </div>
      )
    },
    {
      id: 'items',
      title: 'Items & Inventory',
      icon: '📦',
      content: (
        <div>
          <h4>Item System</h4>

          <h5>Core Trading Items</h5>
          <ol>
            <li><strong>Iron Ore</strong> - Basic metal resource</li>
            <li><strong>Herb</strong> - Alchemical ingredient</li>
            <li><strong>Hide</strong> - Leather material</li>
            <li><strong>Pearl</strong> - Valuable gem</li>
            <li><strong>Relic Fragment</strong> - Rare artifact piece</li>
          </ol>

          <h5>Item Locations</h5>
          <ul>
            <li><strong>Warehouse:</strong> Default storage, used for crafting and trading</li>
            <li><strong>Caravan:</strong> Items being transported on missions</li>
            <li><strong>Escrow:</strong> Items held in contracts</li>
          </ul>

          <h5>Item Rarity</h5>
          <div className="game-grid-2">
            <span className="game-pill game-pill-neutral">COMMON</span>
            <span className="game-pill game-pill-good">UNCOMMON</span>
            <span className="game-pill game-pill-warn">RARE</span>
            <span className="game-pill game-pill-bad">EPIC</span>
            <span className="game-pill" style={{background: '#f59e0b'}}>LEGENDARY</span>
          </div>
        </div>
      )
    },
    {
      id: 'guilds',
      title: 'Guilds',
      icon: '🏛️',
      content: (
        <div>
          <h4>Guild System</h4>
          <p>Player organizations for collaboration and competition.</p>

          <h5>Guild Roles</h5>
          <table className="game-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>LEADER</td>
                <td>All permissions, can disband guild</td>
              </tr>
              <tr>
                <td>OFFICER</td>
                <td>Invite/kick members, manage warehouse</td>
              </tr>
              <tr>
                <td>TRADER</td>
                <td>Access guild warehouse, contribute</td>
              </tr>
              <tr>
                <td>MEMBER</td>
                <td>Basic guild features, chat access</td>
              </tr>
            </tbody>
          </table>

          <h5>Guild Features</h5>
          <ul>
            <li><strong>Guild Warehouse:</strong> Shared item storage</li>
            <li><strong>Guild Treasury:</strong> Shared gold pool</li>
            <li><strong>Guild Channels:</strong> Private chat channels</li>
            <li><strong>Guild Achievements:</strong> Unlock guild bonuses</li>
            <li><strong>Guild Leveling:</strong> Progress together for rewards</li>
          </ul>

          <h5>Guild Alliances</h5>
          <p>Form relationships with other guilds:</p>
          <ul>
            <li><strong>ALLIANCE:</strong> Friendly cooperation
              <ul className="game-small">
                <li>35% travel tax reduction</li>
                <li>12% auction fee reduction</li>
                <li>Shared alliance chat</li>
                <li>Joint alliance missions</li>
              </ul>
            </li>
            <li><strong>RIVALRY:</strong> Competitive relationship</li>
            <li><strong>NEUTRAL:</strong> No special relationship</li>
          </ul>
        </div>
      )
    },
    {
      id: 'social',
      title: 'Social Features',
      icon: '💬',
      content: (
        <div>
          <h4>Chat System</h4>

          <h5>Channel Types</h5>
          <ul>
            <li><strong>GENERAL:</strong> Server-wide public chat</li>
            <li><strong>TRADE:</strong> Trade announcements and deals</li>
            <li><strong>GUILD:</strong> Guild-only chat (per guild channel)</li>
            <li><strong>ALLIANCE:</strong> Alliance-wide chat</li>
            <li><strong>DIRECT:</strong> Private messages between players</li>
          </ul>

          <h5>Chat Features</h5>
          <ul>
            <li>Mention other players with @username</li>
            <li>React to messages with emoji</li>
            <li>Thread-style conversations</li>
            <li>Edit/delete your messages</li>
            <li>Persistent chat history</li>
          </ul>

          <h4>Mail System</h4>
          <p>Asynchronous player-to-player messaging.</p>

          <h5>Mail Status</h5>
          <ul>
            <li><strong>UNREAD:</strong> Not yet viewed</li>
            <li><strong>READ:</strong> Opened by recipient</li>
            <li><strong>ARCHIVED:</strong> Saved for later</li>
            <li><strong>DELETED:</strong> Moved to trash</li>
          </ul>

          <h5>Mail Priority</h5>
          <div className="game-flex" style={{gap: '0.5rem'}}>
            <span className="game-pill game-pill-neutral">LOW</span>
            <span className="game-pill game-pill-good">NORMAL</span>
            <span className="game-pill game-pill-warn">HIGH</span>
            <span className="game-pill game-pill-bad">URGENT</span>
          </div>
        </div>
      )
    },
    {
      id: 'world',
      title: 'World & Travel',
      icon: '🗺️',
      content: (
        <div>
          <h4>Hub System</h4>
          <p>Trading posts and settlements connected by routes.</p>

          <h5>Hub Properties</h5>
          <ul>
            <li><strong>Position:</strong> X, Y coordinates on map</li>
            <li><strong>Safe Zone:</strong> Whether PvP is disabled</li>
            <li><strong>Market:</strong> Local pricing for goods</li>
            <li><strong>Links:</strong> Connected routes to other hubs</li>
          </ul>

          <h5>Travel Routes</h5>
          <ul>
            <li><strong>Distance:</strong> Affects travel time</li>
            <li><strong>Risk:</strong> Danger level of route</li>
            <li><strong>Toll:</strong> Cost to use route</li>
            <li><strong>Capacity:</strong> Max simultaneous travelers</li>
          </ul>

          <h5>Custom Trade Routes</h5>
          <p>Players can create custom routes using TrailNodes:</p>
          <ul>
            <li>Define waypoints between locations</li>
            <li>Set custom risk levels</li>
            <li>Create private paths</li>
            <li>Share with guild members</li>
          </ul>
        </div>
      )
    },
    {
      id: 'events',
      title: 'Server Events',
      icon: '🌍',
      content: (
        <div>
          <h4>Server-Wide Missions</h4>
          <p>Massive collaborative events for all players.</p>

          <h5>Event Types</h5>
          <ul>
            <li><strong>Gathering Events:</strong> Collect X total items</li>
            <li><strong>Trading Events:</strong> Complete Y trades</li>
            <li><strong>Gold Events:</strong> Donate Z gold collectively</li>
          </ul>

          <h5>Reward Tiers</h5>
          <table className="game-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Requirement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bronze</td>
                <td>Minimal participation</td>
              </tr>
              <tr>
                <td>Silver</td>
                <td>Moderate contribution</td>
              </tr>
              <tr>
                <td>Gold</td>
                <td>High contribution</td>
              </tr>
              <tr>
                <td>Platinum</td>
                <td>Top contributors</td>
              </tr>
            </tbody>
          </table>

          <h5>Participation</h5>
          <ul>
            <li>Donate items from warehouse</li>
            <li>Complete specific missions</li>
            <li>Make qualifying trades</li>
            <li>Track your contribution rank</li>
            <li>Claim tiered rewards</li>
          </ul>
        </div>
      )
    },
    {
      id: 'progression',
      title: 'Progression',
      icon: '📈',
      content: (
        <div>
          <h4>Character Progression</h4>

          <h5>Crafting Progression</h5>
          <div className="game-card-nested">
            <p><strong>XP Formula:</strong> XP Required = Current Level × 100</p>
            <ul className="game-small">
              <li>Complete crafting jobs to gain XP</li>
              <li>Level up to unlock new blueprints</li>
              <li>Access rare recipes at higher levels</li>
            </ul>
          </div>

          <h5>Agent Progression</h5>
          <div className="game-card-nested">
            <p><strong>XP Gain:</strong> Complete missions (success or failure)</p>
            <ul className="game-small">
              <li>Higher risk missions = more XP</li>
              <li>Level up for increased base stats</li>
              <li>Unlock higher equipment tiers</li>
            </ul>
          </div>

          <h5>Daily Statistics</h5>
          <p>Track your daily performance:</p>
          <ul>
            <li>Gold earned and spent</li>
            <li>Missions completed and failed</li>
            <li>Items traded and crafted</li>
            <li>Active time and login count</li>
          </ul>

          <h5>Activity Log</h5>
          <p>All significant actions are recorded:</p>
          <ul>
            <li>Mission completions</li>
            <li>Purchases and sales</li>
            <li>Crafting jobs</li>
            <li>Guild activities</li>
            <li>Achievements unlocked</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips for New Players',
      icon: '💡',
      content: (
        <div>
          <h4>Getting Started</h4>
          <ol>
            <li>Complete the tutorial and onboarding steps</li>
            <li>Hire your first agent (Scout is cheap and fast)</li>
            <li>Run low-risk missions to build gold safely</li>
            <li>Claim starter equipment to gear up your agent</li>
            <li>Start crafting basic blueprints</li>
            <li>Join the auction house to trade</li>
            <li>Find a guild for support and collaboration</li>
          </ol>

          <h4>Efficient Progression</h4>
          <ul>
            <li><strong>Balance Risk/Reward:</strong> Mix low and medium risk missions</li>
            <li><strong>Upgrade Equipment:</strong> Better gear = better success rates</li>
            <li><strong>Batch Crafting:</strong> Save 10% time on quantity crafting</li>
            <li><strong>Market Timing:</strong> Buy low, sell high based on events</li>
            <li><strong>Agent Specialization:</strong> Use right agent for each mission</li>
            <li><strong>Guild Collaboration:</strong> Share resources and knowledge</li>
          </ul>

          <h4>Advanced Strategies</h4>
          <ul>
            <li>Find profitable hub-to-hub trade routes</li>
            <li>Capitalize on market event price fluctuations</li>
            <li>Maximize alliance benefits (35% travel tax reduction)</li>
            <li>Participate in server events for unique rewards</li>
            <li>Diversify income streams (trading, missions, crafting)</li>
            <li>Never over-commit resources to risky ventures</li>
          </ul>
        </div>
      )
    }
  ];

  const sidebar = (
    <div>
      <h3>Wiki Sections</h3>
      <p className="game-muted game-small">
        Comprehensive guide to all game systems and mechanics.
      </p>

      <div className="game-flex-col" style={{ gap: '4px', marginTop: '16px' }}>
        {wikiSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className={`game-btn ${selectedSection === section.id ? 'game-btn-primary' : ''}`}
            style={{
              textAlign: 'left',
              fontSize: '12px',
              justifyContent: 'flex-start',
              gap: '8px'
            }}
          >
            <span>{section.icon}</span>
            <span>{section.title}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3>Quick Links</h3>
        <div className="game-flex-col" style={{ gap: '8px' }}>
          <a href="/help" className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            ℹ️ Help & Guide
          </a>
          <a href="/missions" className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            🎯 Mission Control
          </a>
          <a href="/auction" className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            🏪 Auction House
          </a>
          <a href="/crafting" className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            🔨 Crafting
          </a>
        </div>
      </div>
    </div>
  );

  const currentSection = wikiSections.find(s => s.id === selectedSection) || wikiSections[0];

  return (
    <GameLayout
      title="Gameplay Wiki"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <div className="game-flex" style={{ alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{currentSection.icon}</span>
            <h3>{currentSection.title}</h3>
          </div>

          <div className="wiki-content">
            {currentSection.content}
          </div>
        </div>

        <div className="game-card">
          <h3>Additional Resources</h3>
          <div className="game-grid-2">
            <div>
              <h4>In-Game Pages</h4>
              <ul className="game-small">
                <li><a href="/warehouse">📦 Warehouse</a></li>
                <li><a href="/inventory">📋 Inventory</a></li>
                <li><a href="/agents">👥 Agents</a></li>
                <li><a href="/missions/stats">📊 Mission Stats</a></li>
                <li><a href="/market">💹 Market Analysis</a></li>
              </ul>
            </div>
            <div>
              <h4>Community</h4>
              <ul className="game-small">
                <li><a href="/guild/browse">🏛️ Browse Guilds</a></li>
                <li><a href="/missions/leaderboard">🏆 Leaderboards</a></li>
                <li><a href="/help">ℹ️ Quick Help</a></li>
                <li><a href="/feedback">💬 Send Feedback</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .wiki-content h4 {
            color: #d4af37;
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 18px;
          }

          .wiki-content h5 {
            color: #f1e5c8;
            margin-top: 16px;
            margin-bottom: 8px;
            font-size: 15px;
          }

          .wiki-content ul, .wiki-content ol {
            margin-left: 24px;
            margin-bottom: 12px;
            line-height: 1.6;
          }

          .wiki-content li {
            margin-bottom: 6px;
          }

          .wiki-content li ul {
            margin-top: 6px;
          }

          .wiki-content a {
            color: #68b06e;
            text-decoration: none;
          }

          .wiki-content a:hover {
            text-decoration: underline;
          }

          .wiki-content strong {
            color: #d4af37;
          }

          .wiki-content p {
            margin-bottom: 12px;
            line-height: 1.5;
          }

          .wiki-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }

          .wiki-content table th,
          .wiki-content table td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #533b2c;
          }

          .wiki-content table th {
            background: #2a1f19;
            color: #d4af37;
            font-weight: bold;
          }

          .wiki-content table tbody tr:hover {
            background: rgba(83, 59, 44, 0.3);
          }
        `
      }} />
    </GameLayout>
  );
}
