'use client';

import { useState, useEffect } from 'react';
import GameLayout from '@/components/GameLayout';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';
import MailInbox from '@/components/mail/MailInbox';
import MailCompose from '@/components/mail/MailCompose';
import MailThread from '@/components/mail/MailThread';
import { supabase } from '@/lib/supabaseClient';

interface MailFolder {
  id: string;
  name: string;
  isSystem: boolean;
  mailCount: number;
  unreadCount: number;
  sortOrder: number;
}

export default function MailPage() {
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState<string | undefined>();
  const [composeRecipientName, setComposeRecipientName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
    
    // Check URL parameters for compose mode
    const urlParams = new URLSearchParams(window.location.search);
    const compose = urlParams.get('compose') === 'true';
    const recipientId = urlParams.get('to');
    const recipientName = urlParams.get('name');
    
    if (compose) {
      setShowCompose(true);
      setComposeRecipientId(recipientId || undefined);
      setComposeRecipientName(recipientName || undefined);
    }
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/mail/folders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load folders');
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      setError('Failed to load mail folders');
    } finally {
      setLoading(false);
    }
  };

  const handleMailSelect = (mailId: string) => {
    setSelectedMailId(mailId);
    setShowCompose(false);
  };

  const handleCompose = (recipientId?: string) => {
    setSelectedMailId(null);
    setShowCompose(true);
  };

  const handleBack = () => {
    setSelectedMailId(null);
    setShowCompose(false);
  };

  const activeFolderData = folders.find(f => f.id === activeFolder);

  if (loading) {
    return (
      <GameLayout title="Mail System">
        <div className="mail-loading">Loading mail system...</div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout title="Mail System">
        <div className="mail-error">
          <h3>Error</h3>
          <p>{error}</p>
          <GameButton onClick={() => window.location.reload()}>
            Retry
          </GameButton>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Mail System" showChat={false}>
      <div className="mail-container">
        
        {/* Folder Sidebar */}
        <div className="mail-sidebar">
          <div className="mail-sidebar-header">
            <GameButton 
              onClick={() => handleCompose()}
              className="compose-button"
              variant="primary"
            >
              ✉️ New Mail
            </GameButton>
          </div>
          
          <div className="folder-list">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={`folder-item ${activeFolder === folder.id ? 'active' : ''}`}
              >
                <span className="folder-name">{folder.name}</span>
                <div className="folder-counts">
                  {folder.unreadCount > 0 && (
                    <span className="unread-badge">{folder.unreadCount}</span>
                  )}
                  <span className="total-count">{folder.mailCount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="mail-content">
          {showCompose ? (
            <MailCompose 
              recipientId={composeRecipientId}
              recipientName={composeRecipientName}
              onSent={() => {
                setShowCompose(false);
                setComposeRecipientId(undefined);
                setComposeRecipientName(undefined);
                loadFolders();
                // Clear URL parameters
                window.history.replaceState({}, '', '/mail');
              }}
              onCancel={handleBack}
            />
          ) : selectedMailId ? (
            <MailThread
              mailId={selectedMailId}
              onBack={handleBack}
              onReply={() => handleCompose()}
            />
          ) : (
            <MailInbox
              folder={activeFolder}
              folderName={activeFolderData?.name || 'Inbox'}
              onMailSelect={handleMailSelect}
              onCompose={handleCompose}
              onFoldersUpdate={loadFolders}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .mail-container {
          display: flex;
          height: 100%;
          gap: 16px;
        }

        .mail-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #2e231d;
          border: 2px solid #533b2c;
          border-radius: 8px;
          padding: 16px;
          height: fit-content;
        }

        .mail-sidebar-header {
          margin-bottom: 16px;
        }

        .compose-button {
          width: 100%;
          font-weight: 600;
        }

        .folder-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .folder-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: none;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #c7b38a;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .folder-item:hover {
          background: #3a2b21;
          border-color: #533b2c;
        }

        .folder-item.active {
          background: #4b3527;
          border-color: #a36a43;
          color: #f1e5c8;
        }

        .folder-name {
          font-weight: 500;
        }

        .folder-counts {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .unread-badge {
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }

        .total-count {
          color: #8a7960;
          font-size: 11px;
        }

        .mail-content {
          flex: 1;
          min-height: 0;
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

        @media (max-width: 768px) {
          .mail-container {
            flex-direction: column;
          }

          .mail-sidebar {
            width: 100%;
            order: 2;
          }

          .mail-content {
            order: 1;
          }
        }
      `}</style>
    </GameLayout>
  );
}