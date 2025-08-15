'use client';

import { useState } from 'react';
import { GuildInfo, GuildRole } from '@/types/guild';
import { useGuildTreasury } from '@/hooks/useGuild';
import LoadingSpinner from './LoadingSpinner';

interface TreasurySectionProps {
  guild: GuildInfo;
  onUpdate: () => void;
}

export default function TreasurySection({ guild, onUpdate }: TreasurySectionProps) {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const { deposit, withdraw, isLoading, error, clearError } = useGuildTreasury();
  
  const canWithdraw = ['LEADER', 'OFFICER'].includes(guild.userRole);
  
  const handleDeposit = async () => {
    if (amount <= 0) return;
    
    clearError();
    setSuccessMessage('');
    
    const success = await deposit(amount);
    if (success) {
      setSuccessMessage(`Successfully deposited ${amount.toLocaleString()}g to guild treasury`);
      setAmount(0);
      onUpdate();
    }
  };
  
  const handleWithdraw = async () => {
    if (amount <= 0 || amount > guild.treasury) return;
    
    clearError();
    setSuccessMessage('');
    
    const success = await withdraw(amount, reason);
    if (success) {
      setSuccessMessage(`Successfully withdrew ${amount.toLocaleString()}g from guild treasury`);
      setAmount(0);
      setReason('');
      onUpdate();
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString();

  return (
    <div className="game-flex-col">
      {/* Current Balance */}
      <div className="game-card">
        <h3>Guild Treasury</h3>
        <div className="game-center" style={{ margin: '16px 0' }}>
          <div className="game-big game-good">{formatCurrency(guild.treasury)}g</div>
          <div className="game-small game-muted">Current Balance</div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="game-card" style={{ border: '1px solid #2d5016', backgroundColor: '#1a2f0d' }}>
          <div className="game-good">✅ {successMessage}</div>
        </div>
      )}
      
      {error && (
        <div className="game-card" style={{ border: '1px solid #7f1d1d', backgroundColor: '#2d1515' }}>
          <div className="game-bad">❌ {error}</div>
          <button 
            className="game-btn game-btn-small" 
            onClick={clearError}
            style={{ marginTop: '8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Deposit Section */}
      <div className="game-card">
        <h3>💰 Deposit Gold</h3>
        <p className="game-muted game-small">
          Contribute to your guild's treasury to fund shared activities and expenses.
        </p>
        
        <div className="game-flex" style={{ gap: '8px', alignItems: 'center', margin: '16px 0' }}>
          <input
            type="number"
            min="1"
            value={amount || ''}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            className="game-input"
            placeholder="Amount to deposit"
            style={{ flex: 1 }}
            disabled={isLoading}
          />
          <button
            className="game-btn game-btn-primary"
            onClick={handleDeposit}
            disabled={isLoading || !amount || amount <= 0}
          >
            {isLoading ? <LoadingSpinner size="small" /> : 'Deposit'}
          </button>
        </div>
        
        <div className="game-flex" style={{ gap: '8px', marginTop: '8px' }}>
          {[100, 500, 1000, 5000].map(preset => (
            <button
              key={preset}
              className="game-btn game-btn-small"
              onClick={() => setAmount(preset)}
              disabled={isLoading}
            >
              {formatCurrency(preset)}g
            </button>
          ))}
        </div>
      </div>

      {/* Withdraw Section (Officers and Leaders only) */}
      {canWithdraw && (
        <div className="game-card">
          <h3>💸 Withdraw Gold</h3>
          <p className="game-muted game-small">
            Leaders and Officers can withdraw gold for guild expenses and activities.
          </p>
          
          <div className="game-flex-col" style={{ gap: '8px', margin: '16px 0' }}>
            <div className="game-flex" style={{ gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                max={guild.treasury}
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="game-input"
                placeholder="Amount to withdraw"
                style={{ flex: 1 }}
                disabled={isLoading}
              />
              <button
                className="game-btn game-btn-warning"
                onClick={handleWithdraw}
                disabled={isLoading || !amount || amount <= 0 || amount > guild.treasury}
              >
                {isLoading ? <LoadingSpinner size="small" /> : 'Withdraw'}
              </button>
            </div>
            
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="game-input"
              placeholder="Reason for withdrawal (optional)"
              disabled={isLoading}
            />
          </div>
          
          <div className="game-flex" style={{ gap: '8px', marginTop: '8px' }}>
            {[100, 500, 1000, Math.min(5000, guild.treasury)].map(preset => (
              <button
                key={preset}
                className="game-btn game-btn-small"
                onClick={() => setAmount(preset)}
                disabled={isLoading || preset > guild.treasury}
              >
                {formatCurrency(preset)}g
              </button>
            ))}
          </div>
          
          {guild.treasury < 1000 && (
            <div className="game-small game-muted" style={{ marginTop: '8px' }}>
              ⚠️ Treasury is running low. Consider asking members to contribute.
            </div>
          )}
        </div>
      )}

      {/* Recent Treasury Activity */}
      <div className="game-card">
        <h3>Recent Treasury Activity</h3>
        {guild.recentActivity.filter(activity => 
          activity.action === 'treasury_deposit' || activity.action === 'treasury_withdraw'
        ).length > 0 ? (
          <div className="game-flex-col">
            {guild.recentActivity
              .filter(activity => activity.action === 'treasury_deposit' || activity.action === 'treasury_withdraw')
              .slice(0, 5)
              .map((activity, index) => (
              <div key={index} className="game-space-between">
                <div>
                  {activity.action === 'treasury_deposit' ? '💰' : '💸'} 
                  <strong>{activity.user}</strong>
                  <span className="game-small">
                    {' '}{activity.action.replace('treasury_', '').replace('_', ' ')}ed{' '}
                    {activity.details?.amount ? formatCurrency(activity.details.amount) : '?'}g
                  </span>
                  {activity.details?.reason && (
                    <span className="game-small game-muted"> - {activity.details.reason}</span>
                  )}
                </div>
                <div className="game-small game-muted">
                  {formatTimeAgo(activity.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="game-muted">No recent treasury activity</p>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}