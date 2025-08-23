'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GameLayout from '@/components/GameLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDashboard from '@/components/profile/ProfileDashboard';
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
      <GameLayout title="Profile">
        <div className="loading-container">
          <div className="loading-spinner">Loading profile...</div>
        </div>
      </GameLayout>
    );
  }

  if (error || !profileData) {
    return (
      <GameLayout title="Profile">
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
    <GameLayout title={`${profileData.user.display}'s Profile`}>
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header-section">
          <ProfileHeader
            user={profileData.user}
            guild={profileData.guild}
            achievements={profileData.achievements}
            isOnline={isOnline}
            isOwnProfile={isOwnProfile}
            actions={<ProfileActions
              targetUserId={targetUserId}
              targetUserName={profileData.user.display}
              permissions={profileData.permissions}
              isOwnProfile={isOwnProfile}
              embedded={true}
            />}
          />
        </div>

        {/* Main Dashboard - No Scrolling */}
        <div className="profile-main-content">
          <ProfileDashboard 
            stats={profileData.stats}
            achievements={profileData.achievements}
            canViewPrivateStats={profileData.permissions.canViewPrivateStats}
          />
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .profile-header-section {
          flex-shrink: 0;
          margin-bottom: 12px;
        }
        
        .profile-main-content {
          flex: 1;
          overflow: hidden;
          min-height: 0;
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