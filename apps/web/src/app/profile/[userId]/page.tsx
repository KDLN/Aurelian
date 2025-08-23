'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GameLayout from '@/components/GameLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileAchievements from '@/components/profile/ProfileAchievements';
import ProfileActions from '@/components/profile/ProfileActions';
import { ProfileLayout, ProfileHeader as LayoutHeader, ProfileMain, ProfileSidebar, ProfileActions as LayoutActions } from '@/components/profile/ProfileLayout';
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
        <ProfileLayout>
          <div className="loading-container">
            <div className="loading-spinner">Loading profile...</div>
          </div>
        </ProfileLayout>
      </GameLayout>
    );
  }

  if (error || !profileData) {
    return (
      <GameLayout>
        <ProfileLayout>
          <div className="error-container">
            <h2>Profile Not Found</h2>
            <p>{error || 'The requested profile could not be found.'}</p>
            <a href="/guild/browse" className="back-link">
              ← Browse Traders
            </a>
          </div>
        </ProfileLayout>
      </GameLayout>
    );
  }

  const isOwnProfile = currentUser?.id === targetUserId;

  return (
    <GameLayout>
      <ProfileLayout>
        <LayoutHeader>
          <ProfileHeader
            user={profileData.user}
            guild={profileData.guild}
            achievements={profileData.achievements}
            isOnline={isOnline}
            isOwnProfile={isOwnProfile}
          />
        </LayoutHeader>

        <ProfileMain>
          <ProfileStats 
            stats={profileData.stats}
            canViewPrivateStats={profileData.permissions.canViewPrivateStats}
          />
        </ProfileMain>

        <ProfileSidebar>
          <ProfileAchievements achievements={profileData.achievements} />
          
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
        </ProfileSidebar>

        <LayoutActions>
          <ProfileActions
            targetUserId={targetUserId}
            targetUserName={profileData.user.display}
            permissions={profileData.permissions}
            isOwnProfile={isOwnProfile}
          />
        </LayoutActions>
      </ProfileLayout>

      <style jsx>{`
        .recent-activity {
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .activity-title {
          font-size: 14px;
          font-weight: 600;
          color: #f1e5c8;
          margin: 0 0 12px 0;
          border-bottom: 1px solid #4b3527;
          padding-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-item {
          padding: 12px;
          background: #2e231d;
          border: 1px solid #4b3527;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          transition: background-color 0.2s ease;
        }

        .activity-item:hover {
          background: #342920;
        }

        .activity-message {
          font-size: 12px;
          color: #c7b38a;
          flex: 1;
          line-height: 1.4;
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
          transition: background-color 0.2s ease;
        }

        .back-link:hover {
          background: #7b4b2d;
        }
      `}</style>
    </GameLayout>
  );
}