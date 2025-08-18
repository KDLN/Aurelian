'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import GameButton from '@/components/ui/GameButton';
import { useGuild, useGuildInvitations } from '@/hooks/useGuild';
import LoadingSpinner from '@/components/guild/LoadingSpinner';

export default function GuildInvitationsPage() {
  const { invitations, isLoading, error, refresh } = useGuild();
  const { respondToInvitation, isLoading: respondLoading, error: respondError } = useGuildInvitations();
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingInvite(invitationId);
    const success = await respondToInvitation(invitationId, action);
    
    if (success) {
      await refresh(); // Refresh the invitations list
      if (action === 'accept') {
        // Redirect to guild page after accepting
        window.location.href = '/guild';
      }
    }
    setProcessingInvite(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatExpiresIn = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h remaining`;
    return `${diffDays}d remaining`;
  };

  const sidebar = (
    <div>
      <h3>Guild Invitations</h3>
      <p className="game-muted game-small">
        Manage invitations from guilds who want you to join them.
      </p>

      <h3>Quick Actions</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          🏛️ Guild Overview
        </a>
        <a href="/guild/browse" className="game-btn game-btn-small">
          🔍 Browse Guilds
        </a>
        <a href="/guild/create" className="game-btn game-btn-small">
          ➕ Create Guild
        </a>
      </div>

      <h3>Invitation Tips</h3>
      <div className="game-flex-col game-small">
        <div>• Invitations expire in 7 days</div>
        <div>• You can only be in one guild</div>
        <div>• Accepting deletes all other invites</div>
        <div>• Check guild stats before joining</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <GameLayout title="Guild Invitations" sidebar={sidebar}>
        <div className="game-card">
          <LoadingSpinner size="large" text="Loading invitations..." />
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Invitations" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">
            <h3>⚠️ Error Loading Invitations</h3>
            <p>{error}</p>
            <GameButton onClick={refresh} style={{ marginTop: '16px' }}>
              🔄 Try Again
            </GameButton>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Invitations" sidebar={sidebar}>
      <div className="game-flex-col">
        {invitations.length > 0 ? (
          <>
            <div className="game-card">
              <h3>Pending Invitations ({invitations.length})</h3>
              <p className="game-muted game-small">
                You have received {invitations.length} guild invitation{invitations.length === 1 ? '' : 's'}. 
                Review the details and decide which guild to join.
              </p>
            </div>

            {invitations.map(invitation => (
              <div key={invitation.id} className="game-card">
                <div className="game-space-between" style={{ marginBottom: '12px' }}>
                  <div>
                    <h3>[{invitation.guild.tag}] {invitation.guild.name}</h3>
                    <div className="game-small game-muted">
                      Level {invitation.guild.level} • {invitation.guild.memberCount} members
                    </div>
                  </div>
                  <div className="game-center">
                    <div className="game-pill game-pill-small">
                      {formatExpiresIn(invitation.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="game-grid-2" style={{ marginBottom: '12px' }}>
                  <div>
                    <strong>Invited by:</strong> {invitation.inviter.displayName}
                  </div>
                  <div>
                    <strong>Received:</strong> {formatTimeAgo(invitation.createdAt)}
                  </div>
                </div>

                {invitation.message && (
                  <div style={{ 
                    margin: '12px 0', 
                    padding: '8px', 
                    background: 'rgba(83, 59, 44, 0.2)',
                    borderRadius: '4px',
                    fontStyle: 'italic'
                  }}>
                    <div className="game-small game-muted">Personal message:</div>
                    "{invitation.message}"
                  </div>
                )}

                <div className="game-flex" style={{ gap: '8px', marginTop: '16px' }}>
                  <GameButton
                    variant="primary"
                    onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                    disabled={respondLoading || processingInvite === invitation.id}
                  >
                    {processingInvite === invitation.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      '✅ Accept'
                    )}
                  </GameButton>
                  <GameButton
                    variant="warning"
                    onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                    disabled={respondLoading || processingInvite === invitation.id}
                  >
                    {processingInvite === invitation.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      '❌ Decline'
                    )}
                  </GameButton>
                  <a href={`/guild/browse?highlight=${invitation.guild.id}`} className="game-btn game-btn-small">
                    👁️ View Guild Details
                  </a>
                </div>

                {respondError && processingInvite === invitation.id && (
                  <div className="game-small game-bad" style={{ marginTop: '8px' }}>
                    ❌ {respondError}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="game-card">
            <div className="game-center">
              <h3>📭 No Pending Invitations</h3>
              <p className="game-muted">
                You don't have any guild invitations at the moment.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <a href="/guild/browse" className="game-btn game-btn-primary">
                  🔍 Browse Guilds
                </a>
                <a href="/guild/create" className="game-btn">
                  ➕ Create Your Own Guild
                </a>
              </div>
            </div>
          </div>
        )}

        {/* General Guild Information */}
        <div className="game-card">
          <h3>About Guilds</h3>
          <div className="game-flex-col">
            <div>📦 <strong>Shared Resources:</strong> Access guild warehouse and treasury</div>
            <div>👥 <strong>Community:</strong> Private chat channels and group activities</div>
            <div>⚔️ <strong>Competition:</strong> Participate in guild wars and alliances</div>
            <div>🏆 <strong>Achievements:</strong> Unlock guild-wide rewards and bonuses</div>
            <div>🎯 <strong>Missions:</strong> Access to exclusive high-reward group content</div>
            <div>💰 <strong>Benefits:</strong> Shared costs and group purchasing power</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}