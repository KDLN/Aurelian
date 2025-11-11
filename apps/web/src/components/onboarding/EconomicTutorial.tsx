'use client';

/**
 * EconomicTutorial Component
 *
 * Interactive tutorial explaining the core economic gameplay loop (Step 5).
 * Teaches: Gather → Craft → Sell → Repeat
 */

import { useState } from 'react';

interface EconomicTutorialProps {
  onComplete: () => void;
}

export default function EconomicTutorial({ onComplete }: EconomicTutorialProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="bg-[#1a1410] border-2 border-[#8b7355] rounded-lg p-6 text-[#f1e5c8]">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Economic Loop Tutorial</span>
          <span>
            {currentPage} / {totalPages}
          </span>
        </div>
        <div className="w-full bg-[#231913] rounded-full h-2">
          <div
            className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          />
        </div>
      </div>

      {/* Page Content */}
      <div className="min-h-[400px]">
        {currentPage === 1 && <Page1 />}
        {currentPage === 2 && <Page2 />}
        {currentPage === 3 && <Page3 />}
        {currentPage === 4 && <Page4 />}
        {currentPage === 5 && <Page5 />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6 pt-6 border-t border-[#8b7355]">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className="px-6 py-2 border border-[#8b7355] hover:bg-[#231913] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        >
          Previous
        </button>
        <div className="flex gap-2">
          {[...Array(totalPages)].map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx + 1 === currentPage ? 'bg-yellow-600' : 'bg-[#8b7355]'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextPage}
          className="px-6 py-2 bg-[#8b7355] hover:bg-[#a0846b] rounded transition-colors font-bold"
        >
          {currentPage === totalPages ? 'Complete Tutorial' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function Page1() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">💰 The Economic Loop</h2>
      <p className="mb-4 text-lg">
        Welcome to the heart of The Exchange! Understanding the economic loop is key to building
        your trading empire.
      </p>
      <div className="bg-[#231913] border border-yellow-600 rounded-lg p-6 mb-4">
        <div className="text-center text-6xl mb-4">🔄</div>
        <h3 className="text-xl font-bold text-center mb-4 text-yellow-400">
          The Core Loop
        </h3>
        <div className="flex items-center justify-center gap-3 text-3xl">
          <span>🗺️ Gather</span>
          <span>→</span>
          <span>🔨 Craft</span>
          <span>→</span>
          <span>🏪 Sell</span>
          <span>→</span>
          <span>💰 Profit</span>
        </div>
      </div>
      <p className="text-[#d4c5a9]">
        Master this loop and you'll unlock wealth, prestige, and guild dominance. Let's break down
        each step...
      </p>
    </div>
  );
}

function Page2() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🗺️ Step 1: Gather Resources</h2>
      <p className="mb-4">
        Your agents are the backbone of your operation. Send them on missions to gather raw
        materials from across the realm.
      </p>
      <div className="space-y-3 mb-4">
        <div className="bg-[#231913] border border-[#8b7355] rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚒️</span>
            <div>
              <h4 className="font-bold mb-1">Iron Ore</h4>
              <p className="text-sm text-[#d4c5a9]">
                Basic material for weapons and tools. Low-risk missions, steady income.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#231913] border border-[#8b7355] rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🌿</span>
            <div>
              <h4 className="font-bold mb-1">Herbs</h4>
              <p className="text-sm text-[#d4c5a9]">
                Essential for potions and tonics. Medium risk, good market demand.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#231913] border border-[#8b7355] rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💎</span>
            <div>
              <h4 className="font-bold mb-1">Rare Materials</h4>
              <p className="text-sm text-[#d4c5a9]">
                Pearls, relic fragments. High risk, high reward. Used for premium crafts.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3">
        <p className="text-sm">
          <strong>💡 Pro Tip:</strong> Balance risk and reward. LOW-risk missions are safe but give
          common materials. HIGH-risk missions can fail but yield rare items.
        </p>
      </div>
    </div>
  );
}

function Page3() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🔨 Step 2: Craft Items</h2>
      <p className="mb-4">
        Transform raw materials into valuable goods through crafting. Higher-tier items = bigger
        profits!
      </p>
      <div className="bg-[#231913] border border-yellow-600 rounded-lg p-4 mb-4">
        <h4 className="font-bold mb-3 text-yellow-400">Crafting Formula:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-32">Raw Materials</span>
            <span>+</span>
            <span className="w-32">Time</span>
            <span>+</span>
            <span className="w-32">Skill</span>
            <span>=</span>
            <span className="text-yellow-400 font-bold">Valuable Item</span>
          </div>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="bg-[#231913] border border-[#8b7355] rounded p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">⚔️ Iron Sword</p>
              <p className="text-xs text-[#d4c5a9]">10 Iron Ore → 1 Sword</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">Sells for 500g</p>
              <p className="text-xs text-[#d4c5a9]">2h craft time</p>
            </div>
          </div>
        </div>
        <div className="bg-[#231913] border border-[#8b7355] rounded p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">🧪 Healing Tonic</p>
              <p className="text-xs text-[#d4c5a9]">5 Herbs → 3 Tonics</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">Sells for 150g each</p>
              <p className="text-xs text-[#d4c5a9]">1h craft time</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3">
        <p className="text-sm">
          <strong>💡 Pro Tip:</strong> Level up crafting by completing jobs. Higher levels unlock
          better blueprints and faster crafting times.
        </p>
      </div>
    </div>
  );
}

function Page4() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🏪 Step 3: Sell on Market</h2>
      <p className="mb-4">
        List your crafted items on the auction house. Smart pricing = maximum profit!
      </p>
      <div className="bg-[#231913] border border-[#8b7355] rounded-lg p-4 mb-4">
        <h4 className="font-bold mb-3">Market Strategies:</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <div>
              <p className="font-bold text-sm">Check Market Prices</p>
              <p className="text-xs text-[#d4c5a9]">
                See what others are selling for. Undercut slightly to sell fast.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <div>
              <p className="font-bold text-sm">Consider Supply & Demand</p>
              <p className="text-xs text-[#d4c5a9]">
                Rare items = higher prices. Flooded market = lower prices.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <div>
              <p className="font-bold text-sm">Time Your Sales</p>
              <p className="text-xs text-[#d4c5a9]">
                Sell healing tonics before guild wars. Weapons before PvP events.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded p-4 mb-4">
        <h4 className="font-bold mb-2 text-yellow-400">Example: Profit Calculation</h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Iron Sword Sell Price:</span>
            <span className="text-green-400">+500g</span>
          </div>
          <div className="flex justify-between">
            <span>Material Cost (10 Iron Ore @ 20g):</span>
            <span className="text-red-400">-200g</span>
          </div>
          <div className="flex justify-between">
            <span>Listing Fee (5%):</span>
            <span className="text-red-400">-25g</span>
          </div>
          <div className="flex justify-between border-t border-[#8b7355] pt-1 font-bold">
            <span>Net Profit:</span>
            <span className="text-yellow-400">+275g</span>
          </div>
        </div>
      </div>
      <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3">
        <p className="text-sm">
          <strong>💡 Pro Tip:</strong> Watch market trends. Buy materials when cheap, craft during
          downtime, sell when demand spikes!
        </p>
      </div>
    </div>
  );
}

function Page5() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🚀 Mastering the Loop</h2>
      <p className="mb-4">
        Now that you understand the basics, here's how to scale your empire:
      </p>
      <div className="space-y-3 mb-4">
        <div className="bg-[#231913] border border-purple-600 rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h4 className="font-bold text-purple-300">Automate & Scale</h4>
              <p className="text-sm text-[#d4c5a9]">
                Hire multiple agents. Run missions in parallel. Queue multiple craft jobs. The more
                you do, the more you earn.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#231913] border border-blue-600 rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">📈</span>
            <div>
              <h4 className="font-bold text-blue-300">Specialize for Profit</h4>
              <p className="text-sm text-[#d4c5a9]">
                Find your niche. Master potions? Focus on herb missions and potion crafting.
                Monopolize that market segment.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#231913] border border-green-600 rounded p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚔️</span>
            <div>
              <h4 className="font-bold text-green-300">Join a Guild</h4>
              <p className="text-sm text-[#d4c5a9]">
                Guilds unlock cooperative missions, guild wars, and shared markets. Team up to
                dominate the economy!
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-6 text-center">
        <div className="text-5xl mb-3">🎯</div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2">You're Ready!</h3>
        <p className="text-[#d4c5a9]">
          The economic loop is your path to wealth. Gather smart, craft efficiently, sell
          strategically. Your empire awaits!
        </p>
      </div>
    </div>
  );
}
