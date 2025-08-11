// Test mission status tracking - run in browser console
console.log('🧪 Mission Status Test Starting...');

// Helper to check mission status in database (we'll use the API)
async function checkMissionStatus() {
  try {
    console.log('📊 Checking current mission status...');
    
    // Get current session token
    const supabaseClient = window.supabase || window._supabase;
    if (!supabaseClient) {
      console.error('❌ Supabase client not found');
      return null;
    }
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      console.error('❌ No active session');
      return null;
    }
    
    const token = session.access_token;
    
    // Fetch missions
    const response = await fetch('/api/missions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch missions:', await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log('📋 Current API response:', {
      missionDefs: data.missionDefs?.length || 0,
      activeMissions: data.activeMissions?.length || 0,
      activeMissionDetails: data.activeMissions?.map(m => ({
        id: m.id.substring(0, 8),
        missionName: m.mission?.name,
        status: m.status,
        endTime: m.endTime,
        timeLeft: Math.max(0, Math.ceil((new Date(m.endTime) - new Date()) / 1000)) + 's'
      })) || []
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error checking mission status:', error);
    return null;
  }
}

// Test mission creation and track status changes
async function testMissionLifecycle() {
  console.log('🚀 Testing complete mission lifecycle...');
  
  try {
    // 1. Check initial state
    console.log('\n1️⃣ Initial state check...');
    let data = await checkMissionStatus();
    if (!data) return;
    
    const availableMissions = data.missionDefs?.filter(m => 
      !data.activeMissions?.some(active => active.missionId === m.id)
    );
    
    if (!availableMissions?.length) {
      console.log('⚠️ No available missions to start');
      return;
    }
    
    const firstMission = availableMissions[0];
    console.log(`2️⃣ Starting mission: ${firstMission.name} (Duration: ${firstMission.baseDuration}s)`);
    
    // Get token again
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session.access_token;
    
    // 2. Start mission
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
    
    const missionInstanceId = startResult.missionInstance?.id;
    
    // 3. Track mission status over time
    console.log('\n3️⃣ Tracking mission status every 2 seconds...');
    
    let checkCount = 0;
    const maxChecks = 10; // Check for 20 seconds
    
    const statusInterval = setInterval(async () => {
      checkCount++;
      console.log(`\n--- Status Check ${checkCount} ---`);
      
      const currentData = await checkMissionStatus();
      if (currentData) {
        const ourMission = currentData.activeMissions?.find(m => m.id === missionInstanceId);
        
        if (ourMission) {
          console.log('✅ Mission still active:', {
            id: ourMission.id.substring(0, 8),
            status: ourMission.status,
            timeLeft: Math.max(0, Math.ceil((new Date(ourMission.endTime) - new Date()) / 1000)) + 's'
          });
        } else {
          console.log('❌ Mission disappeared from active missions!');
          
          // Try to check completed/failed missions by calling database
          console.log('🔍 Mission may have been completed/failed automatically');
          clearInterval(statusInterval);
        }
      }
      
      if (checkCount >= maxChecks) {
        console.log('⏹️ Stopped tracking after 10 checks');
        clearInterval(statusInterval);
      }
    }, 2000);
    
    // Store interval ID for manual stopping
    window.stopMissionTracking = () => {
      clearInterval(statusInterval);
      console.log('⏹️ Manual stop requested');
    };
    
    console.log('💡 Use window.stopMissionTracking() to stop tracking early');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Make functions globally available
window.checkMissionStatus = checkMissionStatus;
window.testMissionLifecycle = testMissionLifecycle;

console.log('🛠️ Available functions:');
console.log('• window.checkMissionStatus() - Check current mission status');
console.log('• window.testMissionLifecycle() - Run complete lifecycle test');
console.log('');
console.log('📋 Instructions:');
console.log('1. Run window.testMissionLifecycle() to start comprehensive test');
console.log('2. Watch console for mission status changes');
console.log('3. This will help identify when/why missions disappear');