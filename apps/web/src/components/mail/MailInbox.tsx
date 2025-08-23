'use client';

import { useState, useEffect } from 'react';
import GameButton from '@/components/ui/GameButton';
import { supabase } from '@/lib/supabaseClient';

interface Mail {
  id: string;
  subject: string;
  content: string;
  status: string;
  priority: string;
  isStarred: boolean;
  senderId: string;
  senderName: string;
  senderGuildTag?: string;
  recipientId: string;
  recipientName: string;
  attachments?: any;
  parentMailId?: string;
  replyCount: number;
  readAt?: number;
  createdAt: number;
  expiresAt?: number;
}

interface MailInboxProps {
  folder: string;
  folderName: string;
  onMailSelect: (mailId: string) => void;
  onCompose: (recipientId?: string) => void;
  onFoldersUpdate: () => void;
}

export default function MailInbox({ 
  folder, 
  folderName, 
  onMailSelect, 
  onCompose,
  onFoldersUpdate 
}: MailInboxProps) {
  const [mails, setMails] = useState<Mail[]>([]);
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadMails();
  }, [folder]);

  const loadMails = async (before?: number) => {
    try {
      if (!before) {
        setLoading(true);
        setError(null);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        folder,
        limit: '25'
      });

      if (before) {
        params.append('before', before.toString());
      }

      const response = await fetch(`/api/mail?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (before) {
          setMails(prev => [...prev, ...data.mails]);
        } else {
          setMails(data.mails);
        }
        setHasMore(data.hasMore);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load mails');
      }
    } catch (error) {
      console.error('Error loading mails:', error);
      setError('Failed to load mails');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (mailIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await Promise.all(
        mailIds.map(mailId =>
          fetch(`/api/mail/${mailId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'READ' })
          })
        )
      );

      loadMails();
      onFoldersUpdate();
      setSelectedMails(new Set());
    } catch (error) {
      console.error('Error marking mails as read:', error);
    }
  };

  const handleDeleteMails = async (mailIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await Promise.all(
        mailIds.map(mailId =>
          fetch(`/api/mail/${mailId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
        )
      );

      loadMails();
      onFoldersUpdate();
      setSelectedMails(new Set());
    } catch (error) {
      console.error('Error deleting mails:', error);
    }
  };

  const toggleMailSelection = (mailId: string) => {
    const newSelection = new Set(selectedMails);
    if (newSelection.has(mailId)) {
      newSelection.delete(mailId);
    } else {
      newSelection.add(mailId);
    }
    setSelectedMails(newSelection);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟡';
      case 'LOW': return '🔵';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="mail-loading">
        <div>Loading {folderName.toLowerCase()}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mail-error">
        <h3>Error</h3>
        <p>{error}</p>
        <GameButton onClick={() => loadMails()}>Retry</GameButton>
      </div>
    );
  }

  return (
    <div className="mail-inbox">
      {/* Header */}
      <div className="inbox-header">
        <div className="header-left">
          <h2>{folderName}</h2>
          <span className="mail-count">
            {mails.length} {mails.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        
        <div className="header-actions">
          {selectedMails.size > 0 && (
            <>
              <GameButton
                size="small"
                onClick={() => handleMarkAsRead([...selectedMails])}
              >
                ✓ Mark Read
              </GameButton>
              <GameButton
                size="small"
                variant="danger"
                onClick={() => handleDeleteMails([...selectedMails])}
              >
                🗑️ Delete
              </GameButton>
              <GameButton
                size="small"
                variant="secondary"
                onClick={() => setSelectedMails(new Set())}
              >
                Cancel
              </GameButton>
            </>
          )}
          <GameButton
            size="small"
            onClick={() => onCompose()}
          >
            ✉️ Compose
          </GameButton>
        </div>
      </div>

      {/* Mail List */}
      <div className="mail-list">
        {mails.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📬</div>
            <h3>No mail in {folderName.toLowerCase()}</h3>
            <p>
              {folder === 'inbox' 
                ? 'When other players send you mail, it will appear here.'
                : 'No sent mail found.'
              }
            </p>
          </div>
        ) : (
          mails.map(mail => (
            <div
              key={mail.id}
              className={`mail-item ${mail.status === 'UNREAD' ? 'unread' : ''} ${selectedMails.has(mail.id) ? 'selected' : ''}`}
            >
              <div className="mail-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMails.has(mail.id)}
                  onChange={() => toggleMailSelection(mail.id)}
                />
              </div>
              
              <div className="mail-info" onClick={() => onMailSelect(mail.id)}>
                <div className="mail-header">
                  <div className="mail-from">
                    {getPriorityIcon(mail.priority)}
                    <span className="sender-name">
                      {folder === 'sent' ? mail.recipientName : mail.senderName}
                    </span>
                    {mail.senderGuildTag && (
                      <span className="guild-tag">[{mail.senderGuildTag}]</span>
                    )}
                    {mail.isStarred && <span className="star">⭐</span>}
                  </div>
                  <div className="mail-date">{formatDate(mail.createdAt)}</div>
                </div>
                
                <div className="mail-subject">
                  {mail.subject}
                  {mail.replyCount > 0 && (
                    <span className="reply-count">({mail.replyCount})</span>
                  )}
                </div>
                
                <div className="mail-preview">
                  {mail.content.substring(0, 120)}
                  {mail.content.length > 120 && '...'}
                </div>

                {mail.attachments && (
                  <div className="mail-attachments">
                    📎 Attachments
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <div className="load-more">
            <GameButton
              onClick={() => loadMails(mails[mails.length - 1]?.createdAt)}
              variant="secondary"
              size="small"
            >
              Load More
            </GameButton>
          </div>
        )}
      </div>

      <style jsx>{`
        .mail-inbox {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .inbox-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #2e231d;
          border: 2px solid #533b2c;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .header-left h2 {
          margin: 0;
          color: #f1e5c8;
          font-size: 18px;
        }

        .mail-count {
          color: #8a7960;
          font-size: 12px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .mail-list {
          flex: 1;
          overflow-y: auto;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #8a7960;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: #c7b38a;
          margin: 0 0 8px 0;
        }

        .mail-item {
          display: flex;
          padding: 12px 16px;
          border-bottom: 1px solid #533b2c;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .mail-item:hover {
          background: #3a2b21;
        }

        .mail-item.unread {
          background: rgba(163, 106, 67, 0.1);
          border-left: 3px solid #a36a43;
        }

        .mail-item.selected {
          background: rgba(163, 106, 67, 0.2);
        }

        .mail-checkbox {
          padding-right: 12px;
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
        }

        .mail-info {
          flex: 1;
          min-width: 0;
        }

        .mail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .mail-from {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #f1e5c8;
        }

        .sender-name {
          font-size: 13px;
        }

        .guild-tag {
          color: #a36a43;
          font-size: 11px;
        }

        .star {
          font-size: 12px;
        }

        .mail-date {
          color: #8a7960;
          font-size: 11px;
        }

        .mail-subject {
          font-weight: 500;
          color: #f1e5c8;
          font-size: 13px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .reply-count {
          color: #a36a43;
          font-size: 11px;
        }

        .mail-preview {
          color: #c7b38a;
          font-size: 12px;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mail-attachments {
          color: #a36a43;
          font-size: 11px;
          margin-top: 4px;
        }

        .load-more {
          padding: 16px;
          text-align: center;
          border-top: 1px solid #533b2c;
        }

        .mail-loading, .mail-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          text-align: center;
          color: #c7b38a;
        }
      `}</style>
    </div>
  );
}