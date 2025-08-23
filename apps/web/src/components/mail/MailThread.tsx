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
  parentSubject?: string;
  parentSender?: string;
  replies: Array<{
    id: string;
    content: string;
    senderName: string;
    createdAt: number;
  }>;
  readAt?: number;
  createdAt: number;
  expiresAt?: number;
}

interface MailThreadProps {
  mailId: string;
  onBack: () => void;
  onReply: (recipientId: string, subject: string, parentMailId: string) => void;
}

export default function MailThread({ mailId, onBack, onReply }: MailThreadProps) {
  const [mail, setMail] = useState<Mail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadMail();
    loadCurrentUser();
  }, [mailId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/mail/${mailId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMail(data.mail);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load mail');
      }
    } catch (error) {
      console.error('Error loading mail:', error);
      setError('Failed to load mail');
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async () => {
    if (!mail) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`/api/mail/${mailId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isStarred: !mail.isStarred })
      });

      setMail(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const handleQuickReply = async () => {
    if (!mail || !replyContent.trim()) return;

    setSendingReply(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: mail.senderId === currentUser?.id ? mail.recipientId : mail.senderId,
          subject: `Re: ${mail.subject}`,
          content: replyContent.trim(),
          parentMailId: mail.id
        })
      });

      if (response.ok) {
        setReplyContent('');
        setShowQuickReply(false);
        loadMail(); // Reload to show the new reply
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
        <div>Loading mail...</div>
      </div>
    );
  }

  if (error || !mail) {
    return (
      <div className="mail-error">
        <h3>Error</h3>
        <p>{error || 'Mail not found'}</p>
        <GameButton onClick={onBack}>← Back to Inbox</GameButton>
      </div>
    );
  }

  const isRecipient = mail.recipientId === currentUser?.id;
  const otherPartyId = isRecipient ? mail.senderId : mail.recipientId;
  const otherPartyName = isRecipient ? mail.senderName : mail.recipientName;

  return (
    <div className="mail-thread">
      {/* Header */}
      <div className="thread-header">
        <div className="header-left">
          <GameButton size="small" onClick={onBack}>
            ← Back
          </GameButton>
          <div className="thread-info">
            <h2 className="mail-subject">
              {getPriorityIcon(mail.priority)}
              {mail.subject}
              {mail.isStarred && <span className="star">⭐</span>}
            </h2>
            <div className="thread-meta">
              Conversation with {otherPartyName} • {formatDate(mail.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <GameButton size="small" onClick={handleStar}>
            {mail.isStarred ? '⭐' : '☆'}
          </GameButton>
          <GameButton 
            size="small" 
            onClick={() => onReply(otherPartyId, `Re: ${mail.subject}`, mail.id)}
          >
            ↩️ Reply
          </GameButton>
        </div>
      </div>

      {/* Thread Content */}
      <div className="thread-content">
        {/* Original Mail */}
        <div className="mail-message original">
          <div className="message-header">
            <div className="message-from">
              <strong>{mail.senderName}</strong>
              {mail.senderGuildTag && (
                <span className="guild-tag">[{mail.senderGuildTag}]</span>
              )}
            </div>
            <div className="message-date">{formatDate(mail.createdAt)}</div>
          </div>
          
          <div className="message-content">
            {mail.content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>

          {mail.attachments && (
            <div className="message-attachments">
              <h4>Attachments:</h4>
              <pre>{JSON.stringify(mail.attachments, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Replies */}
        {mail.replies.map(reply => (
          <div key={reply.id} className="mail-message reply">
            <div className="message-header">
              <div className="message-from">
                <strong>{reply.senderName}</strong>
              </div>
              <div className="message-date">{formatDate(reply.createdAt)}</div>
            </div>
            
            <div className="message-content">
              {reply.content.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Reply */}
        {showQuickReply && (
          <div className="quick-reply">
            <h4>Quick Reply:</h4>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="game-textarea"
              rows={4}
              maxLength={5000}
            />
            <div className="quick-reply-actions">
              <GameButton
                onClick={handleQuickReply}
                disabled={sendingReply || !replyContent.trim()}
                size="small"
              >
                {sendingReply ? 'Sending...' : 'Send'}
              </GameButton>
              <GameButton
                onClick={() => setShowQuickReply(false)}
                variant="secondary"
                size="small"
              >
                Cancel
              </GameButton>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="thread-footer">
          <GameButton
            onClick={() => setShowQuickReply(!showQuickReply)}
            variant="secondary"
          >
            💬 Quick Reply
          </GameButton>
        </div>
      </div>

      <style jsx>{`
        .mail-thread {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
        }

        .thread-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #533b2c;
          background: #2e231d;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .thread-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mail-subject {
          margin: 0;
          color: #f1e5c8;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .star {
          font-size: 14px;
        }

        .thread-meta {
          color: #8a7960;
          font-size: 11px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .thread-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .mail-message {
          background: #2e231d;
          border: 1px solid #533b2c;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .mail-message.original {
          border-left: 3px solid #a36a43;
        }

        .mail-message.reply {
          margin-left: 20px;
          border-left: 3px solid #6b7280;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #533b2c;
        }

        .message-from {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f1e5c8;
          font-size: 13px;
        }

        .guild-tag {
          color: #a36a43;
          font-size: 11px;
        }

        .message-date {
          color: #8a7960;
          font-size: 11px;
        }

        .message-content {
          color: #c7b38a;
          line-height: 1.5;
          font-size: 13px;
        }

        .message-content p {
          margin: 0 0 8px 0;
        }

        .message-content p:last-child {
          margin-bottom: 0;
        }

        .message-attachments {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #533b2c;
        }

        .message-attachments h4 {
          color: #a36a43;
          font-size: 12px;
          margin: 0 0 8px 0;
        }

        .message-attachments pre {
          background: #231913;
          padding: 8px;
          border-radius: 4px;
          font-size: 11px;
          color: #8a7960;
        }

        .quick-reply {
          background: #2a1f18;
          border: 1px solid #533b2c;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .quick-reply h4 {
          color: #c7b38a;
          font-size: 12px;
          margin: 0 0 8px 0;
        }

        .quick-reply-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .thread-footer {
          padding: 16px 20px;
          border-top: 1px solid #533b2c;
          background: #2e231d;
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

        .mail-error h3 {
          color: #f1e5c8;
          margin: 0;
        }
      `}</style>
    </div>
  );
}