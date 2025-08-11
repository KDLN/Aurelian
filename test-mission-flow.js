// Test mission flow in browser console
console.log('🧪 Testing mission flow...');

async function testMissionFlow() {
  try {
    console.log('1️⃣ Getting missions...');
    
    // Get current session token
    const supabaseClient = window.supabase || window._supabase;
    if (!supabaseClient) {
      console.error('❌ Supabase client not found');
      return;
    }
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      console.error('❌ No active session');
      return;
    }
    
    const token = session.access_token;
    console.log('✅ Got auth token');
    
    // Fetch missions
    console.log('2️⃣ Fetching missions from API...');
    const missionsResponse = await fetch('/api/missions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!missionsResponse.ok) {
      console.error('❌ Failed to fetch missions:', await missionsResponse.text());
      return;
    }
    
    const missionsData = await missionsResponse.json();
    console.log('✅ Missions fetched:', {
      missionDefs: missionsData.missionDefs?.length,
      activeMissions: missionsData.activeMissions?.length
    });
    
    const availableMissions = missionsData.missionDefs?.filter(m => 
      !missionsData.activeMissions?.some(active => active.missionId === m.id)
    );
    
    if (!availableMissions?.length) {
      console.log('⚠️ No available missions to start');
      return;
    }
    
    const firstMission = availableMissions[0];
    console.log('3️⃣ Starting mission:', firstMission.name);
    
    // Start mission
    const startResponse = await fetch('/api/missions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ missionId: firstMission.id })
    });
    
    if (!startResponse.ok) {
      console.error('❌ Failed to start mission:', await startResponse.text());
      return;
    }
    
    const startResult = await startResponse.json();
    console.log('✅ Mission started:', {
      success: startResult.success,
      instanceId: startResult.missionInstance?.id,
      status: startResult.missionInstance?.status,
      endTime: startResult.missionInstance?.endTime
    });
    
    // Wait a moment then fetch again to see if it persists
    console.log('4️⃣ Waiting 3 seconds then checking persistence...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const checkResponse = await fetch('/api/missions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const checkData = await checkResponse.json();
    const foundMission = checkData.activeMissions?.find(m => m.id === startResult.missionInstance?.id);
    
    if (foundMission) {
      console.log('✅ Mission persisted successfully!', {
        id: foundMission.id,
        status: foundMission.status,
        timeRemaining: Math.ceil((new Date(foundMission.endTime) - new Date()) / 1000) + 's'
      });
    } else {
      console.error('❌ Mission disappeared! Active missions:', checkData.activeMissions?.length);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Make test function available globally
window.testMissionFlow = testMissionFlow;

console.log('🛠️ Run window.testMissionFlow() to test the complete mission flow');

// Also add a quick cache inspector
window.inspectMissionCache = () => {
  const queryClient = window.queryClient;
  if (!queryClient) {
    console.log('❌ Query client not available');
    return;
  }
  
  const missionQuery = queryClient.getQueryCache().find(['missions', 'list']);
  if (missionQuery) {
    console.log('📋 Current mission cache:', {
      status: missionQuery.state.status,
      dataUpdatedAt: new Date(missionQuery.state.dataUpdatedAt).toLocaleString(),
      activeMissions: missionQuery.state.data?.activeMissions?.map(m => ({
        id: m.id.slice(0, 8),
        missionId: m.missionId,
        status: m.status
      }))
    });
  }
};

console.log('🔍 Also available: window.inspectMissionCache()');