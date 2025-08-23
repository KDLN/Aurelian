'use client';

import { useState, useEffect } from 'react';
import GameButton from '@/components/ui/GameButton';
import { supabase } from '@/lib/supabaseClient';

interface MailComposeProps {
  recipientId?: string;
  recipientName?: string;
  parentMailId?: string;
  replySubject?: string;
  onSent: () => void;
  onCancel: () => void;
}

export default function MailCompose({ 
  recipientId, 
  recipientName, 
  parentMailId,
  replySubject,
  onSent, 
  onCancel 
}: MailComposeProps) {
  const [recipient, setRecipient] = useState(recipientName || '');
  const [subject, setSubject] = useState(replySubject || '');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientSuggestions, setRecipientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (recipient.length > 2 && !recipientId) {
      searchUsers(recipient);
    } else {
      setRecipientSuggestions([]);
      setShowSuggestions(false);
    }
  }, [recipient]);

  const searchUsers = async (query: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/user/search?q=${encodeURIComponent(query)}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecipientSuggestions(data.users || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSend = async () => {
    if (!recipient.trim() || !content.trim()) {
      setError('Recipient and content are required');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const payload: any = {
        content: content.trim(),
        priority,
        parentMailId
      };

      if (recipientId) {
        payload.recipientId = recipientId;
      } else {
        payload.recipientName = recipient.trim();
      }

      if (subject.trim()) {
        payload.subject = subject.trim();
      }

      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSent();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send mail');
      }
    } catch (error) {
      console.error('Error sending mail:', error);
      setError('Failed to send mail');
    } finally {
      setSending(false);
    }
  };

  const handleRecipientSelect = (user: any) => {
    setRecipient(user.displayName);
    setRecipientSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="mail-compose">
      <div className="compose-header">
        <h2>{parentMailId ? 'Reply to Mail' : 'Compose New Mail'}</h2>
        <GameButton size="small" onClick={onCancel}>✕</GameButton>
      </div>

      <div className="compose-form">
        {/* Recipient Field */}
        <div className="form-field">
          <label>To:</label>
          <div className="recipient-input-container">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter player name..."
              className="game-input"
              disabled={!!recipientId}
            />
            
            {showSuggestions && recipientSuggestions.length > 0 && (
              <div className="recipient-suggestions">
                {recipientSuggestions.map(user => (
                  <div
                    key={user.id}
                    className="suggestion-item"
                    onClick={() => handleRecipientSelect(user)}
                  >
                    <span className="suggestion-name">{user.displayName}</span>
                    {user.guildTag && (
                      <span className="suggestion-guild">[{user.guildTag}]</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject Field */}
        <div className="form-field">
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
            className="game-input"
            maxLength={200}
          />
        </div>

        {/* Priority Field */}
        <div className="form-field">
          <label>Priority:</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="game-select"
          >
            <option value="LOW">🔵 Low</option>
            <option value="NORMAL">⚪ Normal</option>
            <option value="HIGH">🟡 High</option>
            <option value="URGENT">🔴 Urgent</option>
          </select>
        </div>

        {/* Content Field */}
        <div className="form-field">
          <label>Message:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message here..."
            className="game-textarea"
            rows={12}
            maxLength={5000}
          />
          <div className="char-count">
            {content.length}/5000
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="compose-actions">
          <GameButton
            onClick={handleSend}
            disabled={sending || !recipient.trim() || !content.trim()}
            variant="primary"
          >
            {sending ? 'Sending...' : '📤 Send Mail'}
          </GameButton>
          <GameButton onClick={onCancel} variant="secondary">
            Cancel
          </GameButton>
        </div>
      </div>

      <style jsx>{`
        .mail-compose {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
        }

        .compose-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #533b2c;
          background: #2e231d;
        }

        .compose-header h2 {
          margin: 0;
          color: #f1e5c8;
          font-size: 18px;
        }

        .compose-form {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .form-field {
          margin-bottom: 16px;
        }

        .form-field label {
          display: block;
          color: #c7b38a;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .recipient-input-container {
          position: relative;
        }

        .recipient-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #231913;
          border: 1px solid #533b2c;
          border-radius: 4px;
          z-index: 100;
          max-height: 200px;
          overflow-y: auto;
        }

        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s ease;
        }

        .suggestion-item:hover {
          background: #2e231d;
        }

        .suggestion-name {
          color: #f1e5c8;
          font-size: 12px;
        }

        .suggestion-guild {
          color: #a36a43;
          font-size: 11px;
        }

        .char-count {
          text-align: right;
          color: #8a7960;
          font-size: 11px;
          margin-top: 4px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fecaca;
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .compose-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 16px;
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