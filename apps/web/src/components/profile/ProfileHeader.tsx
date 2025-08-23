'use client';

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
}

export default function ProfileHeader({ 
  user, 
  guild, 
  achievements, 
  isOnline = false,
  isOwnProfile = false 
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
            size={120}
            showBorder={true}
            activity="idle"
          />
          <div className={`online-indicator ${onlineStatusClass}`} />
        </div>
      </div>

      <div className="info-section">
        <div className="name-row">
          <h2 className="display-name">{user.display}</h2>
          {primaryAchievement && (
            <Badge variant="secondary" className="achievement-badge">
              {primaryAchievement}
            </Badge>
          )}
        </div>

        {guild && (
          <div className="guild-info">
            <span className="guild-tag">[{guild.tag}]</span>
            <span className="guild-name">{guild.name}</span>
            <span className="guild-role">({guild.role})</span>
          </div>
        )}

        <div className="meta-info">
          <div className="joined-date">
            Trader since {joinDate}
          </div>
          {guild && guildJoinDate && (
            <div className="guild-joined">
              Guild member since {guildJoinDate}
            </div>
          )}
          <div className="caravan-info">
            {user.caravanSlotsUnlocked} caravan slots unlocked
          </div>
        </div>

        {achievements.length > 1 && (
          <div className="achievements-preview">
            <span className="achievements-label">Achievements:</span>
            <div className="achievement-badges">
              {achievements.slice(0, 4).map((achievement, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="mini-achievement"
                >
                  {achievement}
                </Badge>
              ))}
              {achievements.length > 4 && (
                <Badge variant="outline" className="more-achievements">
                  +{achievements.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-header {
          display: flex;
          gap: 20px;
          padding: 20px;
          background: #32241d;
          border: 4px solid #533b2c;
          border-radius: 12px;
          box-shadow: 0 4px 0 rgba(0,0,0,.4), inset 0 0 0 2px #1d1410;
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
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
          gap: 8px;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .display-name {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #f1e5c8;
        }

        .achievement-badge {
          background: #7b4b2d;
          color: #f1e5c8;
          border: 2px solid #a36a43;
          font-size: 12px;
          padding: 4px 8px;
        }

        .guild-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .guild-tag {
          color: #a36a43;
          font-weight: bold;
        }

        .guild-name {
          color: #c7b38a;
        }

        .guild-role {
          color: #8a7960;
          text-transform: lowercase;
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #c7b38a;
        }

        .achievements-preview {
          margin-top: 8px;
        }

        .achievements-label {
          font-size: 12px;
          color: #c7b38a;
          margin-right: 8px;
        }

        .achievement-badges {
          display: inline-flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .mini-achievement {
          font-size: 10px;
          padding: 2px 6px;
          background: #2e231d;
          border: 1px solid #533b2c;
          color: #c7b38a;
        }

        .more-achievements {
          font-size: 10px;
          padding: 2px 6px;
          background: #4b3527;
          border: 1px solid #533b2c;
          color: #a36a43;
        }

        @media (max-width: 640px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .name-row {
            justify-content: center;
          }
          
          .guild-info {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}