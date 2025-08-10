'use client';

import { useEffect, useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';

export default function GameHub() {
  const { world } = useGameWorld();

  const warehouseItems = Object.entries(world.warehouse)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const recentListings = world.listings
    .slice(-3)
    .reverse();

  const activeMissions = world.missions
    .filter(mission => mission.progress < 100)
    .slice(0, 3);

  const activeCrafting = world.crafting.slice(0, 3);

  return (
    <GameLayout title="Trading Hub" characterActivity="idle" characterLocation="Hub: Verdant">
      <div className="game-flex-col">
        <div>
          <h2>Welcome to Aurelian</h2>
          <p className="game-muted">
            A world-backed trading simulation. Manage your warehouse, trade goods, 
            send caravans on missions, and craft valuable items.
          </p>
        </div>

        <div className="game-grid-2">
          <div className="game-card">
            <h3>Warehouse Overview</h3>
            {warehouseItems.length > 0 ? (
              <div className="game-flex-col">
                {warehouseItems.map(([item, qty]) => (
                  <div key={item} className="game-space-between">
                    <span>{item}</span>
                    <span className="game-pill">{qty}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-muted">No items in warehouse</p>
            )}
          </div>

          <div className="game-card">
            <h3>Market Prices</h3>
            <div className="game-flex-col">
              {Object.keys(world.commodities).map(item => (
                <div key={item} className="game-space-between">
                  <span>{item}</span>
                  <span className="game-pill game-pill-good">{world.priceOf(item)}g</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {recentListings.length > 0 && (
          <div className="game-card">
            <h3>Recent Auction Listings</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Age</th>
                </tr>
              </thead>
              <tbody>
                {recentListings.map(listing => (
                  <tr key={listing.id}>
                    <td>{listing.item}</td>
                    <td>{listing.qty}</td>
                    <td>{listing.price}g</td>
                    <td>{listing.age}min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeMissions.length > 0 && (
          <div className="game-card">
            <h3>Active Missions</h3>
            <div className="game-flex-col">
              {activeMissions.map(mission => (
                <div key={mission.id}>
                  <div className="game-space-between">
                    <span>{mission.item} x{mission.qty}</span>
                    <span className={`game-pill ${
                      mission.risk === 'LOW' ? 'game-pill-good' :
                      mission.risk === 'MEDIUM' ? 'game-pill-warn' : 'game-pill-bad'
                    }`}>
                      {mission.risk}
                    </span>
                  </div>
                  <div className="game-progress">
                    <div 
                      className="game-progress-fill" 
                      style={{ width: `${mission.progress}%` }}
                    >
                      {mission.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCrafting.length > 0 && (
          <div className="game-card">
            <h3>Active Crafting</h3>
            <div className="game-flex-col">
              {activeCrafting.map(job => (
                <div key={job.id} className="game-space-between">
                  <span>{job.out} x{job.qty}</span>
                  <span className="game-muted">
                    {Math.max(0, job.eta - (world.day - 1) * 24 * 60 - world.minute)}min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="game-card">
          <h3>Quick Actions</h3>
          <div className="game-grid-3">
            <a href="/game/auction" className="game-btn">Visit Auction</a>
            <a href="/game/missions" className="game-btn">Send Mission</a>
            <a href="/game/crafting" className="game-btn">Start Crafting</a>
            <a href="/game/contracts" className="game-btn">Trade Contracts</a>
            <a href="/game/warehouse" className="game-btn">Manage Warehouse</a>
            <a href="/lobby" className="game-btn">Return to Lobby</a>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}