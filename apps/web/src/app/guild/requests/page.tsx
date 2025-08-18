'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import GameButton from '@/components/ui/GameButton';
import { useGuildRequests } from '@/hooks/useGuild';
import LoadingSpinner from '@/components/guild/LoadingSpinner';

interface GuildRequest {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatar?: any;
    email?: string;
  };
  message: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function GuildRequestsPage() {
  const [requests, setRequests] = useState<GuildRequest[]>([]);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const { getGuildRequests, manageRequest, isLoading: actionLoading, error: actionError, clearError } = useGuildRequests();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getGuildRequests();
      
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data.requests) {
        setRequests(data.requests);
        setGuild(data.guild);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Failed to load guild requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingRequest(requestId);
    clearError();
    
    const success = await manageRequest(requestId, action, reason);
    
    if (success) {
      // Remove the processed request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      alert(`Request has been ${actionText} successfully!`);
    } else if (actionError) {
      alert(actionError);
    }
    
    setProcessingRequest(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

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
    if (diffHours < 48) return `${diffHours}h remaining`;
    return `${diffDays}d remaining`;
  };

  const sidebar = (
    <div>
      <h3>Guild Requests</h3>
      <p className="game-muted game-small">
        Manage incoming join requests from players who want to join your guild.
      </p>

      {guild && (
        <>
          <h3>Guild Info</h3>
          <div className="game-flex-col">
            <div className="game-space-between">
              <span>Guild:</span>
              <span>[{guild.tag}] {guild.name}</span>
            </div>
            <div className="game-space-between">
              <span>Pending:</span>
              <span className="game-good">{requests.length}</span>
            </div>
          </div>
        </>
      )}

      <h3>Quick Actions</h3>
      <div className="game-flex-col">
        <a href="/guild" className="game-btn game-btn-small">
          🏛️ Guild Overview
        </a>
        <a href="/guild/members" className="game-btn game-btn-small">
          👥 Manage Members
        </a>
        <GameButton
          size="small"
          onClick={loadRequests}
          disabled={loading}
        >
          🔄 Refresh
        </GameButton>
      </div>

      <h3>Request Guidelines</h3>
      <div className="game-flex-col game-small">
        <div>• Review each request carefully</div>
        <div>• Consider guild capacity and fit</div>
        <div>• Requests expire in 30 days</div>
        <div>• Approved members start as "Member" role</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <GameLayout title="Guild Requests" sidebar={sidebar}>
        <div className="game-card">
          <LoadingSpinner size="large" text="Loading guild requests..." />
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Guild Requests" sidebar={sidebar}>
        <div className="game-card">
          <div className="game-center game-bad">
            <h3>⚠️ Error Loading Requests</h3>
            <p>{error}</p>
            <GameButton onClick={loadRequests} style={{ marginTop: '16px' }}>
              🔄 Try Again
            </GameButton>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Guild Requests" sidebar={sidebar}>
      <div className="game-flex-col">
        {requests.length > 0 ? (
          <>
            <div className="game-card">
              <h3>Pending Join Requests ({requests.length})</h3>
              <p className="game-muted game-small">
                Review and manage players requesting to join your guild.
              </p>
            </div>

            {requests.map(request => (
              <div key={request.id} className="game-card">
                <div className="game-space-between" style={{ marginBottom: '12px' }}>
                  <div>
                    <h4>{request.user.displayName}</h4>
                    <div className="game-small game-muted">
                      {request.user.email && `${request.user.email} • `}
                      Requested {formatTimeAgo(request.createdAt)}
                    </div>
                  </div>
                  <div className="game-center">
                    <div className="game-pill game-pill-small">
                      {formatExpiresIn(request.expiresAt)}
                    </div>
                  </div>
                </div>

                {request.message && (
                  <div style={{ 
                    margin: '12px 0', 
                    padding: '8px', 
                    background: 'rgba(83, 59, 44, 0.2)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #6eb5ff'
                  }}>
                    <div className="game-small game-muted">Message from applicant:</div>
                    <div style={{ fontStyle: 'italic', marginTop: '4px' }}>
                      "{request.message}"
                    </div>
                  </div>
                )}

                <div className="game-flex" style={{ gap: '8px', marginTop: '16px' }}>
                  <GameButton
                    variant="primary"
                    onClick={() => handleRequestAction(request.id, 'approve')}
                    disabled={actionLoading || processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      '✅ Approve'
                    )}
                  </GameButton>
                  
                  <GameButton
                    variant="warning"
                    onClick={() => {
                      const reason = prompt('Reason for rejection (optional):');
                      if (reason !== null) { // User didn't cancel
                        handleRequestAction(request.id, 'reject', reason);
                      }
                    }}
                    disabled={actionLoading || processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      '❌ Reject'
                    )}
                  </GameButton>
                  
                  <a 
                    href={`/guild/browse?highlight=${guild?.id}`} 
                    className="game-btn game-btn-small"
                  >
                    👁️ View Guild Page
                  </a>
                </div>

                {actionError && processingRequest === request.id && (
                  <div className="game-small game-bad" style={{ marginTop: '8px' }}>
                    ❌ {actionError}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="game-card">
            <div className="game-center">
              <h3>📭 No Pending Requests</h3>
              <p className="game-muted">
                Your guild doesn't have any pending join requests at the moment.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <a href="/guild/browse" className="game-btn game-btn-primary">
                  🔍 Browse Other Guilds
                </a>
                <a href="/guild/members" className="game-btn">
                  👥 Manage Members
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="game-card">
          <h3>Managing Join Requests</h3>
          <div className="game-flex-col">
            <div><strong>Approving:</strong> Adds the player to your guild as a Member</div>
            <div><strong>Rejecting:</strong> Denies the request (player can reapply after 24 hours)</div>
            <div><strong>Capacity:</strong> Check guild member limits before approving</div>
            <div><strong>Communication:</strong> Use guild chat to discuss with other officers</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}