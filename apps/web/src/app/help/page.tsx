'use client';

import React, { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useUserData } from '@/hooks/useUserData';

type HelpSectionKey = 'getting-started' | 'trading' | 'missions' | 'guilds' | 'crafting' | 'inventory' | 'shortcuts';

export default function HelpPage() {
  const { user } = useUserData();
  const [selectedSection, setSelectedSection] = useState<HelpSectionKey>('getting-started');

  const helpSections: Record<HelpSectionKey, { title: string; icon: string; content: React.JSX.Element }> = {
    'getting-started': {
      title: 'Getting Started',
      icon: '🌟',
      content: (
        <div>
          <h4>Welcome to Aurelian!</h4>
          <p>A multiplayer trading and adventure game where you build your trading empire.</p>
          
          <h5>First Steps:</h5>
          <ol>
            <li><strong>Create your character:</strong> Visit the <a href="/creator">Character Creator</a> to customize your appearance</li>
            <li><strong>Get starter items:</strong> Go to your <a href="/warehouse">Warehouse</a> and click "Populate Starter Inventory" if you don't have items</li>
            <li><strong>Create a wallet:</strong> Visit any page and click "Create Wallet" if you don't have gold</li>
            <li><strong>Hire agents:</strong> Go to <a href="/agents">Agents</a> to hire your first agent for missions</li>
            <li><strong>Start trading:</strong> Use the <a href="/auction">Auction House</a> to buy and sell items</li>
          </ol>

          <h5>Quick Tips:</h5>
          <ul>
            <li>💰 You start with 2000 gold and basic items</li>
            <li>🎯 Missions are a great way to earn gold and items</li>
            <li>🏛️ Join or create a guild for enhanced gameplay</li>
            <li>📊 Check the <a href="/market">Market</a> for price trends</li>
          </ul>
        </div>
      )
    },
    'trading': {
      title: 'Trading System',
      icon: '💰',
      content: (
        <div>
          <h4>How Trading Works</h4>
          
          <h5>Auction House:</h5>
          <ul>
            <li><strong>Listing Items:</strong> Go to <a href="/auction">Auction House</a>, select items from your warehouse</li>
            <li><strong>Duration & Fees:</strong> Longer listings have higher fees (2-12%)</li>
            <li><strong>Buying:</strong> Click "Buy" on any listing you can afford</li>
            <li><strong>Price Strategy:</strong> Check market prices before listing</li>
          </ul>

          <h5>Trading Contracts:</h5>
          <ul>
            <li><strong>Buy Orders:</strong> Create <a href="/contracts">contracts</a> to automatically buy items at set prices</li>
            <li><strong>Gold Lock:</strong> Full payment is locked when creating a contract</li>
            <li><strong>Auto-Execute:</strong> Contracts fill automatically when items are available</li>
            <li><strong>Expiry:</strong> Unused gold is refunded when contracts expire</li>
          </ul>

          <h5>Market Intelligence:</h5>
          <ul>
            <li>📊 <a href="/market">Market Dashboard</a> shows price trends and volume</li>
            <li>📈 Historical data helps predict price movements</li>
            <li>⚡ Real-time price updates every second</li>
          </ul>
        </div>
      )
    },
    'missions': {
      title: 'Missions & Agents',
      icon: '🎯',
      content: (
        <div>
          <h4>Mission System</h4>
          
          <h5>Hiring Agents:</h5>
          <ul>
            <li><strong>Agent Types:</strong> Explorer, Trader, Diplomat, Guard, Scholar</li>
            <li><strong>Equipment:</strong> Better gear improves success rates</li>
            <li><strong>Leveling:</strong> Agents gain experience and improve over time</li>
            <li><strong>Specialization:</strong> Each type excels at different mission types</li>
          </ul>

          <h5>Mission Mechanics:</h5>
          <ul>
            <li><strong>Risk Levels:</strong> LOW (85%), MEDIUM (65%), HIGH (40%) base success</li>
            <li><strong>Agent Bonuses:</strong> Level and equipment add success percentage</li>
            <li><strong>Duration:</strong> Depends on agent speed and distance</li>
            <li><strong>Rewards:</strong> Gold and items, with bonuses for higher-level agents</li>
          </ul>

          <h5>Mission Strategy:</h5>
          <ul>
            <li>🎯 Start with LOW risk missions to build experience</li>
            <li>📈 Invest in agent equipment for better returns</li>
            <li>⚖️ Balance risk vs reward based on your needs</li>
            <li>🗺️ Use the <a href="/world-map">World Map</a> to plan routes</li>
          </ul>
        </div>
      )
    },
    'guilds': {
      title: 'Guild System',
      icon: '🏛️',
      content: (
        <div>
          <h4>Guild Features</h4>
          
          <h5>Guild Benefits:</h5>
          <ul>
            <li><strong>Shared Warehouse:</strong> Store items for guild members</li>
            <li><strong>Treasury:</strong> Pool gold for large purchases</li>
            <li><strong>Alliance Missions:</strong> Multi-guild cooperative missions</li>
            <li><strong>Chat Channels:</strong> Private communication</li>
            <li><strong>Wars:</strong> Competitive guild vs guild conflicts</li>
          </ul>

          <h5>Guild Management:</h5>
          <ul>
            <li><strong>Ranks:</strong> Leader, Officer, Member roles with different permissions</li>
            <li><strong>Invitations:</strong> Send/receive guild invites</li>
            <li><strong>Treasury:</strong> Deposit/withdraw limits based on rank</li>
            <li><strong>Warehouse:</strong> Shared storage for materials</li>
          </ul>

          <h5>Getting Started:</h5>
          <ul>
            <li>🔍 <a href="/guild/browse">Browse Guilds</a> to find one to join</li>
            <li>✨ <a href="/guild/create">Create Guild</a> if you want to lead</li>
            <li>🤝 Alliance system allows cooperation between guilds</li>
          </ul>
        </div>
      )
    },
    'crafting': {
      title: 'Crafting System',
      icon: '🔨',
      content: (
        <div>
          <h4>Crafting & Production</h4>
          
          <h5>Blueprint System:</h5>
          <ul>
            <li><strong>Blueprints:</strong> Recipes that transform raw materials into valuable items</li>
            <li><strong>Categories:</strong> Smelting, Crafting, Alchemy, Smithing</li>
            <li><strong>Time-Based:</strong> Jobs take real time to complete (5-60 minutes)</li>
            <li><strong>Leveling:</strong> Higher level recipes give better rewards</li>
          </ul>

          <h5>Crafting Process:</h5>
          <ul>
            <li><strong>Materials:</strong> Gather items from missions or trading</li>
            <li><strong>Start Job:</strong> Select blueprint and provide materials</li>
            <li><strong>Wait Time:</strong> Jobs complete automatically after duration</li>
            <li><strong>Collect:</strong> Return to collect finished products</li>
          </ul>

          <h5>Strategy Tips:</h5>
          <ul>
            <li>🔄 Chain production: Use outputs as inputs for higher-tier recipes</li>
            <li>⏱️ Start long jobs before going offline</li>
            <li>📦 Keep materials stocked for continuous production</li>
            <li>💡 Check market prices for profitable recipes</li>
          </ul>
        </div>
      )
    },
    'inventory': {
      title: 'Inventory & Storage',
      icon: '📦',
      content: (
        <div>
          <h4>Item Management</h4>
          
          <h5>Storage Locations:</h5>
          <ul>
            <li><strong>Warehouse:</strong> Main storage, accessible for trading and crafting</li>
            <li><strong>Caravan:</strong> Items in transit during missions</li>
            <li><strong>Guild Warehouse:</strong> Shared storage for guild members</li>
          </ul>

          <h5>Item Types:</h5>
          <ul>
            <li><strong>Resources:</strong> Iron Ore, Herbs, Hide, Pearls, Relic Fragments</li>
            <li><strong>Equipment:</strong> Gear for your agents</li>
            <li><strong>Crafted Goods:</strong> Products made from raw materials</li>
            <li><strong>Special Items:</strong> Quest rewards and rare finds</li>
          </ul>

          <h5>Management Tips:</h5>
          <ul>
            <li>📊 Use the <a href="/inventory">Inventory Page</a> to see all locations</li>
            <li>🔄 Move items between personal and guild storage</li>
            <li>💰 Sell excess items to free up space</li>
            <li>📈 Track item values for profitable trading</li>
          </ul>
        </div>
      )
    },
    'shortcuts': {
      title: 'Tips & Shortcuts',
      icon: '⚡',
      content: (
        <div>
          <h4>Pro Tips</h4>
          
          <h5>Navigation:</h5>
          <ul>
            <li><strong>World Map:</strong> <a href="/world-map">Interactive map</a> for planning and fast travel</li>
            <li><strong>Quick Actions:</strong> Most pages have sidebar shortcuts</li>
            <li><strong>Hub Travel:</strong> <a href="/hub-travel">Fast travel</a> between major cities</li>
          </ul>

          <h5>Efficiency Tips:</h5>
          <ul>
            <li>⚡ Queue multiple crafting jobs for continuous production</li>
            <li>📱 Start long missions before logging off</li>
            <li>💡 Use contracts to buy materials automatically</li>
            <li>🎯 Focus on one area at a time (trading OR missions)</li>
          </ul>

          <h5>Economic Strategy:</h5>
          <ul>
            <li>📊 Monitor market trends for profitable opportunities</li>
            <li>🔄 Buy low during market dips, sell high during peaks</li>
            <li>⚖️ Diversify between trading, missions, and crafting</li>
            <li>🏛️ Guild cooperation multiplies individual efforts</li>
          </ul>

          <h5>Debug Tools (Development):</h5>
          <ul>
            <li>🚀 Mission speedup buttons for testing</li>
            <li>📦 Populate starter items when database is empty</li>
            <li>🎯 Create initial missions for new installations</li>
          </ul>
        </div>
      )
    }
  };

  const sidebar = (
    <div>
      <h3>Help Topics</h3>
      <p className="game-muted game-small">
        Select a topic to learn more about game systems and mechanics.
      </p>
      
      <div className="game-flex-col" style={{ gap: '4px', marginTop: '16px' }}>
        {Object.entries(helpSections).map(([key, section]) => (
          <button
            key={key}
            onClick={() => setSelectedSection(key as HelpSectionKey)}
            className={`game-btn ${selectedSection === key ? 'game-btn-primary' : ''}`}
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
        <h3>Need More Help?</h3>
        <p className="game-small game-muted">
          Join our community for tips, strategies, and assistance from other players.
        </p>
        <div className="game-flex-col" style={{ gap: '8px', marginTop: '12px' }}>
          <a href="/guild/browse" className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            🏛️ Find a Guild
          </a>
          <button className="game-btn game-btn-secondary" style={{ fontSize: '12px' }}>
            💬 Community Chat
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Help & Guide" 
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <div className="game-flex" style={{ alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{helpSections[selectedSection].icon}</span>
            <h3>{helpSections[selectedSection].title}</h3>
          </div>
          
          <div className="help-content">
            {helpSections[selectedSection].content}
          </div>
        </div>

        <div className="game-card">
          <h3>Quick Reference</h3>
          <div className="game-grid-2" style={{ gap: '16px' }}>
            <div>
              <h4>Essential Pages</h4>
              <ul className="game-small">
                <li><a href="/warehouse">📦 Warehouse</a> - Your main storage</li>
                <li><a href="/auction">💰 Auction House</a> - Buy and sell items</li>
                <li><a href="/missions">🎯 Mission Control</a> - Send agents on quests</li>
                <li><a href="/crafting">🔨 Crafting</a> - Produce valuable items</li>
                <li><a href="/market">📊 Market</a> - Price trends and analysis</li>
              </ul>
            </div>
            <div>
              <h4>Advanced Features</h4>
              <ul className="game-small">
                <li><a href="/guild">🏛️ Guild</a> - Join a trading company</li>
                <li><a href="/contracts">📋 Contracts</a> - Automated buying</li>
                <li><a href="/world-map">🗺️ World Map</a> - Explore the realm</li>
                <li><a href="/agents">👥 Agents</a> - Hire and manage workers</li>
                <li><a href="/inventory">📋 Inventory</a> - View all your items</li>
              </ul>
            </div>
          </div>
        </div>

        {user && (
          <div className="game-card">
            <h3>Your Progress</h3>
            <p className="game-small game-muted">
              Welcome back, <strong>{user.email}</strong>! Here's a quick overview of your status:
            </p>
            
            <div className="game-grid-3" style={{ marginTop: '12px' }}>
              <div className="game-space-between">
                <span className="game-small">Account:</span>
                <span className="game-good game-small">Active</span>
              </div>
              <div className="game-space-between">
                <span className="game-small">Character:</span>
                <span className="game-good game-small">Created</span>
              </div>
              <div className="game-space-between">
                <span className="game-small">Tutorial:</span>
                <span className="game-warn game-small">In Progress</span>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <h4>Recommended Next Steps:</h4>
              <ol className="game-small">
                <li>Complete your first mission to earn gold and items</li>
                <li>List an item on the auction house to start trading</li>
                <li>Join a guild for enhanced gameplay features</li>
                <li>Try crafting to create valuable products</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .help-content h4 {
            color: #d4af37;
            margin-top: 20px;
            margin-bottom: 8px;
          }
          
          .help-content h5 {
            color: #f1e5c8;
            margin-top: 16px;
            margin-bottom: 6px;
          }
          
          .help-content ul, .help-content ol {
            margin-left: 20px;
            margin-bottom: 12px;
          }
          
          .help-content li {
            margin-bottom: 4px;
            line-height: 1.4;
          }
          
          .help-content a {
            color: #68b06e;
            text-decoration: none;
          }
          
          .help-content a:hover {
            text-decoration: underline;
          }
          
          .help-content strong {
            color: #d4af37;
          }
        `
      }} />
    </GameLayout>
  );
}