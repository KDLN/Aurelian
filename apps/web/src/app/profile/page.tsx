'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GameLayout from '@/components/GameLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDashboard from '@/components/profile/ProfileDashboard';
import ProfileActions from '@/components/profile/ProfileActions';
import { supabase } from '@/lib/supabaseClient';
import { useMissions } from '@/hooks/useMissionsQuery';

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
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true); // User is always online on their own profile
  const { data: missionsData } = useMissions();

  useEffect(() => {
    loadCurrentUserProfile();
  }, []);

  const loadCurrentUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Not authenticated');
        return;
      }

      setCurrentUser(user);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Load the user's own profile using their user ID
      const response = await fetch(`/api/profile/${user.id}`, {
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

  if (loading) {
    return (
      <GameLayout title="My Profile" hideActiveJobs={true}>
        <div className="loading-container">
          <div className="loading-spinner">Loading profile...</div>
        </div>
      </GameLayout>
    );
  }

  if (error || !profileData || !currentUser) {
    return (
      <GameLayout title="My Profile" hideActiveJobs={true}>
        <div className="error-container">
          <h2>Profile Not Found</h2>
          <p>{error || 'Your profile could not be loaded.'}</p>
          <button 
            onClick={() => router.push('/play')} 
            className="back-link"
          >
            ← Back to Game
          </button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="My Profile" hideActiveJobs={true}>
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header-section">
          <ProfileHeader
            user={profileData.user}
            guild={profileData.guild}
            achievements={profileData.achievements}
            isOnline={isOnline}
            isOwnProfile={true}
            activeMissions={missionsData?.activeMissions?.length || 0}
            craftingJobs={0}
            actions={<ProfileActions
              targetUserId={currentUser.id}
              targetUserName={profileData.user.display}
              permissions={profileData.permissions}
              isOwnProfile={true}
              embedded={true}
            />}
          />
        </div>

        {/* Main Dashboard - No Scrolling */}
        <div className="profile-main-content">
          <ProfileDashboard 
            stats={profileData.stats}
            achievements={profileData.achievements}
            canViewPrivateStats={true}
            showUnobtainedAchievements={true}
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
          cursor: pointer;
          font-family: inherit;
        }

        .back-link:hover {
          background: #7b4b2d;
        }
        
      `}</style>
    </GameLayout>
  );
}
