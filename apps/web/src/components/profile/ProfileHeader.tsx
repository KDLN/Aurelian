'use client';

import React from 'react';
import CharacterViewer from '../CharacterViewer';
import { Badge } from '../ui/badge';

interface ProfileHeaderProps {
  user: {
    id: string;
    display: string;
    avatar?: any;
    createdAt: string;
    caravanSlotsUnlocked: number;
  };
  guild?: {
    name: string;
    tag: string;
    role: string;
    contributionPoints: number;
    joinedAt: string;
  } | null;
  achievements: string[];
  isOnline?: boolean;
  isOwnProfile?: boolean;
  actions?: React.ReactNode;
}

export default function ProfileHeader({ 
  user, 
  guild, 
  achievements, 
  isOnline = false,
  isOwnProfile = false,
  actions
}: ProfileHeaderProps) {
  const joinDate = new Date(user.createdAt).toLocaleDateString();
  const guildJoinDate = guild ? new Date(guild.joinedAt).toLocaleDateString() : null;
  
  // Extract avatar data for CharacterViewer
  const avatarData = user.avatar || {};
  const skinTone = avatarData.skinTone || 'v00';
  const outfit = avatarData.outfit || 'fstr';
  const hair = avatarData.hair || 'dap1';
  const hat = avatarData.hat || '';
  
  // Get primary achievement badge
  const primaryAchievement = achievements[0];
  
  // Determine online status styling
  const onlineStatusClass = isOnline ? 'online' : 'offline';
  
  return (
    <div className="profile-header">
      <div className="avatar-section">
        <div className="avatar-container">
          <CharacterViewer
            skinTone={skinTone}
            outfit={outfit}
            hair={hair}
            hat={hat}
            size={80}
            showBorder={true}
            activity="idle"
          />
          <div className={`online-indicator ${onlineStatusClass}`} />
        </div>
      </div>

      <div className="info-section">
        <div className="profile-info">
          <div className="name-section">
            <h2 className="display-name">{user.display}</h2>
            {guild && (
              <div className="guild-tag-inline">[{guild.tag}]</div>
            )}
            {primaryAchievement && (
              <Badge variant="secondary" className="achievement-badge">
                {primaryAchievement}
              </Badge>
            )}
          </div>
          
          <div className="meta-line">
            <span className="meta-item">Trader since {joinDate}</span>
            <span className="meta-separator">•</span>
            <span className="meta-item">{user.caravanSlotsUnlocked} caravan slots</span>
            {guild && (
              <>
                <span className="meta-separator">•</span>
                <span className="meta-item">{guild.name} {guild.role}</span>
              </>
            )}
            {achievements.length > 1 && (
              <>
                <span className="meta-separator">•</span>
                <span className="meta-item" title={achievements.slice(1).join(', ')}>
                  {achievements.length} achievements
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      {actions && (
        <div className="actions-section">
          {actions}
        </div>
      )}

      <style jsx>{`
        .profile-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          position: relative;
          overflow: hidden;
        }

        .profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #a36a43, #7b4b2d);
        }

        .avatar-section {
          flex-shrink: 0;
        }

        .avatar-container {
          position: relative;
          display: inline-block;
        }

        .online-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #32241d;
        }

        .online-indicator.online {
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
        }

        .online-indicator.offline {
          background: #6b7280;
        }

        .info-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .name-section {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .display-name {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          color: #f1e5c8;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .guild-tag-inline {
          font-size: 14px;
          color: #a36a43;
          font-weight: bold;
        }

        .achievement-badge {
          background: #7b4b2d;
          color: #f1e5c8;
          border: 2px solid #a36a43;
          font-size: 12px;
          padding: 4px 8px;
        }

        .meta-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #c7b38a;
          flex-wrap: wrap;
          line-height: 1.3;
        }
        
        .meta-item {
          white-space: nowrap;
        }
        
        .meta-separator {
          color: #8a7960;
          font-weight: bold;
        }

        .actions-section {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
        }

        @media (max-width: 640px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
            gap: 12px;
          }

          .display-name {
            font-size: 20px;
          }
          
          .name-row {
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .guild-info {
            justify-content: center;
            flex-wrap: wrap;
          }

          .achievements-preview {
            width: 100%;
          }

          .achievement-badges {
            justify-content: center;
          }
          
          .actions-section {
            width: 100%;
            margin-top: 12px;
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}