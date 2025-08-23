'use client';

import { useState } from 'react';
import GameButton from '../ui/GameButton';
import { ProfilePanel } from './ProfileLayout';
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
  embedded?: boolean;
}

export default function ProfileActions({ 
  targetUserId, 
  targetUserName,
  permissions,
  isOwnProfile,
  embedded = false
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

  const actionsContent = (
    <>
      <div className="actions-grid">
        {permissions.canTrade && (
          <GameButton 
            onClick={handleStartTrade}
            disabled={isLoading}
            className="action-button trade-button"
            title="Start Trade"
          >
            <span className="action-icon">🤝</span>
            {!embedded && <span className="action-text">Trade</span>}
          </GameButton>
        )}

        {permissions.canMessage && (
          <GameButton 
            onClick={handleSendMessage}
            disabled={isLoading}
            className="action-button message-button"
            title="Send Message"
          >
            <span className="action-icon">💬</span>
            {!embedded && <span className="action-text">Message</span>}
          </GameButton>
        )}

        <GameButton 
          onClick={handleViewShop}
          disabled={isLoading}
          className="action-button shop-button"
          title="View Shop"
        >
          <span className="action-icon">🛒</span>
          {!embedded && <span className="action-text">Shop</span>}
        </GameButton>

        <GameButton 
          onClick={handleCompareStats}
          disabled={isLoading}
          className="action-button compare-button"
          title="Compare Stats"
        >
          <span className="action-icon">📊</span>
          {!embedded && <span className="action-text">Compare</span>}
        </GameButton>

        {permissions.canInviteToGuild && !showInviteModal && (
          <GameButton 
            onClick={handleInviteToGuild}
            disabled={isLoading}
            className="action-button invite-button"
          >
            <span className="action-icon">🏰</span>
            <span className="action-text">Invite</span>
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
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        /* When embedded in header, use horizontal row layout */
        :global(.actions-section) .actions-grid {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }
        
        :global(.actions-section) .actions-grid :global(.action-button) {
          flex: 0 0 auto;
          min-width: 36px;
          width: 36px;
          height: 36px;
          padding: 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        :global(.actions-section) .action-icon {
          font-size: 16px;
          margin: 0;
        }

        .actions-grid :global(.action-button) {
          padding: 12px 8px;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 64px;
          text-align: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .actions-grid :global(.action-button):hover {
          transform: translateY(-1px);
        }

        .action-icon {
          font-size: 18px;
        }

        .action-text {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
          font-weight: 600;
          color: #f1e5c8;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .invite-message-input {
          width: 100%;
          padding: 12px;
          background: #231913;
          border: 1px solid #4b3527;
          border-radius: 6px;
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          resize: vertical;
          margin-bottom: 12px;
          transition: border-color 0.2s ease;
        }

        .invite-message-input:focus {
          outline: none;
          border-color: #a36a43;
          background: #2a1f18;
        }

        .invite-message-input::placeholder {
          color: #8a7960;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
        }

        .modal-actions :global(.game-button) {
          flex: 1;
          min-height: 40px;
        }

        .action-result {
          margin-top: 16px;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
        }

        .action-result.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #d1fae5;
        }

        .action-result.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fecaca;
        }

        .close-result {
          background: none;
          border: none;
          color: inherit;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          margin-left: 8px;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }

        .close-result:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .actions-grid :global(.action-button) {
            min-height: 56px;
            padding: 10px 8px;
          }

          .action-icon {
            font-size: 16px;
          }

          .action-text {
            font-size: 10px;
          }
          
          /* Mobile embedded actions - keep horizontal but smaller */
          :global(.actions-section) .actions-grid {
            gap: 4px;
            justify-content: center;
          }
          
          :global(.actions-section) .actions-grid :global(.action-button) {
            min-width: 32px;
            width: 32px;
            height: 32px;
            padding: 6px;
          }
          
          :global(.actions-section) .action-icon {
            font-size: 14px;
          }
        }

        @media (min-width: 1024px) {
          .actions-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .actions-grid :global(.action-button) {
            flex-direction: row;
            min-height: 48px;
            gap: 8px;
            text-align: left;
            justify-content: flex-start;
            padding: 12px 16px;
          }

          .action-icon {
            font-size: 16px;
          }

          .action-text {
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );

  if (embedded) {
    return actionsContent;
  }

  return (
    <ProfilePanel title="Actions">
      {actionsContent}
    </ProfilePanel>
  );
}