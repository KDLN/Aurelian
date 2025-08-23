'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GameLayout from '@/components/GameLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileAchievements from '@/components/profile/ProfileAchievements';
import ProfileActions from '@/components/profile/ProfileActions';
import { supabase } from '@/lib/supabaseClient';

interface ProfileData {
  user: {
    id: string;
    display: string;
    avatar?: any;
    createdAt: string;
    caravanSlotsUnlocked: number;
    caravanSlotsPremium: number;
  };
  guild?: {
    name: string;
    tag: string;
    role: string;
    contributionPoints: number;
    joinedAt: string;
  } | null;
  wallet: {
    gold: number;
  };
  stats: {
    missions: any;
    crafting: any;
    trading: any;
    allTime: any;
  };
  achievements: string[];
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  permissions: {
    canTrade: boolean;
    canMessage: boolean;
    canInviteToGuild: boolean;
    canViewPrivateStats: boolean;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const targetUserId = params.userId as string;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCurrentUser();
    checkOnlineStatus();
  }, [targetUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/profile/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load profile');
      }

      const data = await response.json();
      setProfileData(data.profile);

    } catch (error) {
      console.error('Error loading profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkOnlineStatus = async () => {
    // In a real implementation, this would check the realtime server
    // For now, we'll simulate online status based on recent activity
    try {
      const response = await fetch(`/api/user/activities?userId=${targetUserId}&recent=true`);
      if (response.ok) {
        const data = await response.json();
        const lastActivity = data.activities?.[0]?.createdAt;
        if (lastActivity) {
          const timeDiff = Date.now() - new Date(lastActivity).getTime();
          setIsOnline(timeDiff < 5 * 60 * 1000); // Online if active within 5 minutes
        }
      }
    } catch (error) {
      console.error('Error checking online status:', error);
    }
  };

  if (loading) {
    return (
      <GameLayout>
        <div className="loading-container">
          <div className="loading-spinner">Loading profile...</div>
        </div>
      </GameLayout>
    );
  }

  if (error || !profileData) {
    return (
      <GameLayout>
        <div className="error-container">
          <h2>Profile Not Found</h2>
          <p>{error || 'The requested profile could not be found.'}</p>
          <a href="/guild/browse" className="back-link">
            ← Browse Traders
          </a>
        </div>
      </GameLayout>
    );
  }

  const isOwnProfile = currentUser?.id === targetUserId;

  return (
    <GameLayout>
      <div className="profile-page">
        <div className="profile-content">
          {/* Header Section */}
          <ProfileHeader
            user={profileData.user}
            guild={profileData.guild}
            achievements={profileData.achievements}
            isOnline={isOnline}
            isOwnProfile={isOwnProfile}
          />

          {/* Main Content Grid */}
          <div className="profile-grid">
            {/* Left Column - Stats */}
            <div className="stats-column">
              <ProfileStats 
                stats={profileData.stats}
                canViewPrivateStats={profileData.permissions.canViewPrivateStats}
              />
            </div>

            {/* Right Column - Achievements and Actions */}
            <div className="sidebar-column">
              <ProfileAchievements achievements={profileData.achievements} />
              
              <ProfileActions
                targetUserId={targetUserId}
                targetUserName={profileData.user.display}
                permissions={profileData.permissions}
                isOwnProfile={isOwnProfile}
              />

              {/* Recent Activity */}
              {profileData.recentActivity.length > 0 && (
                <div className="recent-activity">
                  <h3 className="activity-title">Recent Activity</h3>
                  <div className="activity-list">
                    {profileData.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <span className="activity-message">{activity.message}</span>
                        <span className="activity-time">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: #231913;
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }

        .profile-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .stats-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recent-activity {
          background: #32241d;
          border: 4px solid #533b2c;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 4px 0 rgba(0,0,0,.4), inset 0 0 0 2px #1d1410;
        }

        .activity-title {
          font-size: 16px;
          font-weight: bold;
          color: #f1e5c8;
          margin: 0 0 12px 0;
          border-bottom: 2px solid #533b2c;
          padding-bottom: 8px;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-item {
          padding: 8px;
          background: #2e231d;
          border: 2px solid #4b3527;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .activity-message {
          font-size: 12px;
          color: #c7b38a;
          flex: 1;
        }

        .activity-time {
          font-size: 11px;
          color: #8a7960;
          white-space: nowrap;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          font-size: 18px;
          color: #c7b38a;
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          text-align: center;
        }

        .error-container h2 {
          color: #f1e5c8;
          margin: 0;
        }

        .error-container p {
          color: #c7b38a;
          margin: 0;
        }

        .back-link {
          color: #a36a43;
          text-decoration: none;
          padding: 8px 16px;
          border: 2px solid #a36a43;
          border-radius: 6px;
          background: #32241d;
        }

        .back-link:hover {
          background: #7b4b2d;
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          
          .profile-content {
            padding: 12px;
          }
        }
      `}</style>
    </GameLayout>
  );
}