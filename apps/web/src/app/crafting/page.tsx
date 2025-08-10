'use client';

import { useState } from 'react';
import GameLayout from '@/components/GameLayout';
import { useGameWorld } from '@/lib/game/world';

export default function CraftingPage() {
  const { world } = useGameWorld();
  const [selectedRecipe, setSelectedRecipe] = useState('Iron Ingot');
  const [quantity, setQuantity] = useState(1);

  const recipes = {
    'Iron Ingot': { input: 'Iron Ore', ratio: 2, time: 12 },
    'Leather Roll': { input: 'Hide', ratio: 2, time: 12 },
    'Healing Tonic': { input: 'Herb', ratio: 2, time: 12 }
  };

  const handleCraft = () => {
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (!world.craft(selectedRecipe, quantity)) {
      alert(`Not enough ${recipes[selectedRecipe as keyof typeof recipes].input} in warehouse. Need ${quantity * recipes[selectedRecipe as keyof typeof recipes].ratio} units.`);
      return;
    }

    alert(`Started crafting ${quantity} ${selectedRecipe}!`);
    setQuantity(1);
  };

  const canCraft = (recipe: string, qty: number) => {
    const recipeData = recipes[recipe as keyof typeof recipes];
    const required = qty * recipeData.ratio;
    const available = world.warehouse[recipeData.input] || 0;
    return available >= required;
  };

  const sidebar = (
    <div>
      <h3>Crafting Guide</h3>
      <p className="game-muted game-small">
        Transform raw materials into valuable goods. Each recipe takes time to complete.
      </p>
      
      <h3>Recipes</h3>
      <div className="game-flex-col">
        {Object.entries(recipes).map(([output, data]) => (
          <div key={output} className="game-small">
            <strong>{output}</strong>
            <div className="game-muted">
              {data.ratio} {data.input} → 1 {output}
            </div>
            <div className="game-muted">
              {data.time}min per unit
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <GameLayout 
      title="Crafting Workshop" 
      characterActivity="crafting" 
      characterLocation="Workshop"
      sidebar={sidebar}
    >
      <div className="game-flex-col">
        <div className="game-card">
          <h3>Start New Crafting Job</h3>
          <div className="game-grid-2">
            <div>
              <label className="game-small">Recipe</label>
              <select 
                value={selectedRecipe}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                style={{ width: '100%' }}
              >
                {Object.entries(recipes).map(([output, data]) => (
                  <option key={output} value={output}>
                    {output} (needs {data.ratio} {data.input})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="game-small">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                max="50"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div className="game-flex-col" style={{ marginTop: '12px' }}>
            <div className="game-grid-2">
              <div className="game-space-between">
                <span>Required:</span>
                <span>
                  {quantity * recipes[selectedRecipe as keyof typeof recipes].ratio} {recipes[selectedRecipe as keyof typeof recipes].input}
                </span>
              </div>
              <div className="game-space-between">
                <span>Available:</span>
                <span className={
                  canCraft(selectedRecipe, quantity) ? 'game-good' : 'game-bad'
                }>
                  {world.warehouse[recipes[selectedRecipe as keyof typeof recipes].input] || 0}
                </span>
              </div>
              <div className="game-space-between">
                <span>Time:</span>
                <span>{quantity * recipes[selectedRecipe as keyof typeof recipes].time}min</span>
              </div>
              <div className="game-space-between">
                <span>Output:</span>
                <span className="game-good">{quantity} {selectedRecipe}</span>
              </div>
            </div>
            
            <button 
              className="game-btn game-btn-primary"
              onClick={handleCraft}
              disabled={!canCraft(selectedRecipe, quantity)}
            >
              Start Crafting
            </button>
          </div>
        </div>

        <div className="game-card">
          <h3>Active Crafting Jobs ({world.crafting.length})</h3>
          {world.crafting.length > 0 ? (
            <div className="game-flex-col">
              {world.crafting.map(job => {
                const timeLeft = Math.max(0, job.eta - (world.day - 1) * 24 * 60 - world.minute);
                const isComplete = timeLeft === 0;
                
                return (
                  <div key={job.id} className="game-card">
                    <div className="game-space-between">
                      <div>
                        <strong>{job.out} x{job.qty}</strong>
                        <div className="game-muted game-small">
                          ID: {job.id.slice(0, 8)}
                        </div>
                      </div>
                      <span className={`game-pill ${isComplete ? 'game-pill-good' : 'game-pill-warn'}`}>
                        {isComplete ? 'Ready' : `${timeLeft}min`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="game-muted">No active crafting jobs</p>
          )}
        </div>

        <div className="game-card">
          <h3>Material Inventory</h3>
          <div className="game-grid-2">
            {Object.entries(recipes).map(([output, data]) => (
              <div key={output} className="game-space-between">
                <span>{data.input}:</span>
                <span className="game-pill">
                  {world.warehouse[data.input] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="game-card">
          <h3>Finished Goods</h3>
          <div className="game-grid-2">
            {Object.keys(recipes).map(item => (
              <div key={item} className="game-space-between">
                <span>{item}:</span>
                <span className="game-pill game-pill-good">
                  {world.warehouse[item] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}