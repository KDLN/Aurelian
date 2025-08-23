'use client';

import { useState } from 'react';
import GameButton from '../ui/GameButton';
import GamePanel from '../ui/GamePanel';
import { supabase } from '@/lib/supabaseClient';

interface ProfileActionsProps {
  targetUserId: string;
  targetUserName: string;
  permissions: {
    canTrade: boolean;
    canMessage: boolean;
    canInviteToGuild: boolean;
    canViewPrivateStats: boolean;
  };
  isOwnProfile: boolean;
}

export default function ProfileActions({ 
  targetUserId, 
  targetUserName,
  permissions,
  isOwnProfile 
}: ProfileActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Don't show actions for own profile
  if (isOwnProfile) {
    return null;
  }

  const handleStartTrade = async () => {
    setIsLoading(true);
    try {
      // For now, redirect to auction page with a note to implement direct trading
      // In a full implementation, this would open a trade modal or redirect to a direct trade page
      window.location.href = `/auction?trader=${targetUserId}`;
    } catch (error) {
      setActionResult({ type: 'error', message: 'Failed to initiate trade' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    setIsLoading(true);
    try {
      // For now, redirect to guild chat or general chat
      // In a full implementation, this would open a direct message system
      window.location.href = `/guild/channels?dm=${targetUserId}`;
    } catch (error) {
      setActionResult({ type: 'error', message: 'Failed to send message' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteToGuild = async () => {
    if (!showInviteModal) {
      setShowInviteModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActionResult({ type: 'error', message: 'Not authenticated' });
        return;
      }

      const response = await fetch('/api/guild/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId,
          message: inviteMessage.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setActionResult({ type: 'success', message: `Invitation sent to ${targetUserName}!` });
        setShowInviteModal(false);
        setInviteMessage('');
      } else {
        setActionResult({ type: 'error', message: data.error || 'Failed to send invitation' });
      }
    } catch (error) {
      setActionResult({ type: 'error', message: 'Failed to send guild invitation' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewShop = () => {
    window.location.href = `/auction?seller=${targetUserId}`;
  };

  const handleCompareStats = () => {
    window.location.href = `/missions/leaderboard?compare=${targetUserId}`;
  };

  return (
    <GamePanel className="profile-actions">
      <h3 className="panel-title">Actions</h3>
      
      <div className="actions-grid">
        {permissions.canTrade && (
          <GameButton 
            onClick={handleStartTrade}
            disabled={isLoading}
            className="action-button trade-button"
          >
            🤝 Start Trade
          </GameButton>
        )}

        {permissions.canMessage && (
          <GameButton 
            onClick={handleSendMessage}
            disabled={isLoading}
            className="action-button message-button"
          >
            💬 Send Message
          </GameButton>
        )}

        <GameButton 
          onClick={handleViewShop}
          disabled={isLoading}
          className="action-button shop-button"
        >
          🛒 View Shop
        </GameButton>

        <GameButton 
          onClick={handleCompareStats}
          disabled={isLoading}
          className="action-button compare-button"
        >
          📊 Compare Stats
        </GameButton>

        {permissions.canInviteToGuild && !showInviteModal && (
          <GameButton 
            onClick={handleInviteToGuild}
            disabled={isLoading}
            className="action-button invite-button"
          >
            🏰 Invite to Guild
          </GameButton>
        )}
      </div>

      {/* Guild Invitation Modal */}
      {showInviteModal && (
        <div className="invite-modal">
          <h4 className="modal-title">Invite {targetUserName} to Guild</h4>
          <textarea
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="Add a personal message (optional)..."
            className="invite-message-input"
            maxLength={500}
            rows={3}
          />
          <div className="modal-actions">
            <GameButton 
              onClick={handleInviteToGuild}
              disabled={isLoading}
              className="send-invite-button"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </GameButton>
            <GameButton 
              onClick={() => setShowInviteModal(false)}
              disabled={isLoading}
              variant="secondary"
              className="cancel-button"
            >
              Cancel
            </GameButton>
          </div>
        </div>
      )}

      {/* Action Result Display */}
      {actionResult && (
        <div className={`action-result ${actionResult.type}`}>
          {actionResult.message}
          <button 
            onClick={() => setActionResult(null)}
            className="close-result"
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        .profile-actions {
          background: #32241d;
          border: 4px solid #533b2c;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 4px 0 rgba(0,0,0,.4), inset 0 0 0 2px #1d1410;
        }

        .panel-title {
          font-size: 16px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0 0 16px 0;
          border-bottom: 2px solid #533b2c;
          padding-bottom: 8px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .action-button {
          padding: 12px 16px;
          font-size: 14px;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .trade-button {
          background: #065f46;
          border-color: #10b981;
        }

        .trade-button:hover {
          background: #047857;
        }

        .message-button {
          background: #1e40af;
          border-color: #3b82f6;
        }

        .message-button:hover {
          background: #1e3a8a;
        }

        .shop-button {
          background: #7c2d12;
          border-color: #ea580c;
        }

        .shop-button:hover {
          background: #9a3412;
        }

        .compare-button {
          background: #581c87;
          border-color: #a855f7;
        }

        .compare-button:hover {
          background: #6b21a8;
        }

        .invite-button {
          background: #be123c;
          border-color: #f43f5e;
        }

        .invite-button:hover {
          background: #be185d;
        }

        .invite-modal {
          margin-top: 16px;
          padding: 16px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 8px;
        }

        .modal-title {
          font-size: 14px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0 0 12px 0;
        }

        .invite-message-input {
          width: 100%;
          padding: 8px;
          background: #231913;
          border: 2px solid #4b3527;
          border-radius: 6px;
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          resize: vertical;
          margin-bottom: 12px;
        }

        .invite-message-input:focus {
          outline: none;
          border-color: #a36a43;
        }

        .invite-message-input::placeholder {
          color: #8a7960;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
        }

        .send-invite-button {
          background: #be123c;
          border-color: #f43f5e;
        }

        .cancel-button {
          background: #4b3527;
          border-color: #6b5b47;
        }

        .action-result {
          margin-top: 12px;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .action-result.success {
          background: #065f46;
          border: 2px solid #10b981;
          color: #d1fae5;
        }

        .action-result.error {
          background: #7f1d1d;
          border: 2px solid #ef4444;
          color: #fecaca;
        }

        .close-result {
          background: none;
          border: none;
          color: inherit;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          margin-left: 8px;
        }

        .close-result:hover {
          opacity: 0.7;
        }

        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </GamePanel>
  );
}