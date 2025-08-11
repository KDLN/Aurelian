// Test mission persistence - check if missions stay active after creation
console.log('🧪 Testing Mission Persistence...');

window.testMissionPersistence = async () => {
  console.log('🚀 Starting mission persistence test...');
  
  try {
    // Step 1: Check current state
    console.log('1️⃣ Checking initial state...');
    let data = await window.checkMissionStatus();
    if (!data) return;
    
    const availableMissions = data.missionDefs?.filter(m => 
      !data.activeMissions?.some(active => active.missionId === m.id)
    );
    
    if (!availableMissions?.length) {
      console.log('⚠️ No available missions to start');
      return;
    }
    
    // Step 2: Start a mission
    const firstMission = availableMissions[0];
    console.log(`2️⃣ Starting mission: ${firstMission.name}`);
    
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session.access_token;
    
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
    const missionInstanceId = startResult.missionInstance?.id;
    
    console.log('✅ Mission started:', {
      instanceId: missionInstanceId,
      status: startResult.missionInstance?.status,
      endTime: startResult.missionInstance?.endTime
    });
    
    // Step 3: Immediately check if it's still active
    console.log('3️⃣ Checking persistence immediately after creation...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    let checkData = await window.checkMissionStatus();
    let foundMission = checkData?.activeMissions?.find(m => m.id === missionInstanceId);
    
    if (foundMission) {
      console.log('✅ Mission persisted immediately after creation:', {
        id: foundMission.id.substring(0, 8),
        status: foundMission.status,
        timeLeft: Math.max(0, Math.ceil((new Date(foundMission.endTime) - new Date()) / 1000)) + 's'
      });
    } else {
      console.log('❌ Mission DISAPPEARED immediately after creation!');
      console.log('💡 This indicates the mission was auto-completed or failed right after creation');
      return;
    }
    
    // Step 4: Check persistence over time
    console.log('4️⃣ Monitoring mission persistence over time...');
    let checkCount = 0;
    const maxChecks = 5;
    
    const persistenceInterval = setInterval(async () => {
      checkCount++;
      console.log(`--- Persistence Check ${checkCount} ---`);
      
      const currentData = await window.checkMissionStatus();
      const currentMission = currentData?.activeMissions?.find(m => m.id === missionInstanceId);
      
      if (currentMission) {
        const timeLeft = Math.max(0, Math.ceil((new Date(currentMission.endTime) - new Date()) / 1000));
        console.log(`✅ Mission still active (${timeLeft}s remaining)`);
        
        if (timeLeft <= 0) {
          console.log('⏰ Mission is now ready for completion!');
          clearInterval(persistenceInterval);
        }
      } else {
        console.log('❌ Mission disappeared during monitoring!');
        console.log('🔍 This suggests automatic completion/failure');
        
        // Check if it was completed/failed
        console.log('📊 Checking if mission was auto-completed...');
        clearInterval(persistenceInterval);
      }
      
      if (checkCount >= maxChecks) {
        console.log('⏹️ Stopped monitoring after 5 checks');
        clearInterval(persistenceInterval);
      }
    }, 3000); // Check every 3 seconds
    
    // Store interval for manual stopping
    window.stopPersistenceTest = () => {
      clearInterval(persistenceInterval);
      console.log('⏹️ Persistence test stopped manually');
    };
    
    console.log('💡 Use window.stopPersistenceTest() to stop monitoring early');
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error);
  }
};

// Quick function to check database directly
window.checkDatabaseDirectly = async () => {
  console.log('📊 Checking database state directly...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session.access_token;
    
    // Call our missions API and log the response
    const response = await fetch('/api/missions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📋 Current database state:', {
      missionDefs: data.missionDefs?.length,
      activeMissions: data.activeMissions?.length,
      timestamp: data.debugTimestamp
    });
    
    if (data.activeMissions?.length > 0) {
      console.table(data.activeMissions.map(m => ({
        id: m.id.substring(0, 8),
        missionName: m.mission?.name,
        status: m.status,
        timeLeft: Math.max(0, Math.ceil((new Date(m.endTime) - new Date()) / 1000)) + 's'
      })));
    } else {
      console.log('⚠️ No active missions in database');
    }
    
  } catch (error) {
    console.error('❌ Failed to check database:', error);
  }
};

console.log('🛠️ Available functions:');
console.log('• window.testMissionPersistence() - Test complete persistence flow');
console.log('• window.checkDatabaseDirectly() - Check current database state');
console.log('• window.stopPersistenceTest() - Stop persistence monitoring');
console.log('');
console.log('📋 This test will help identify:');
console.log('1. If missions persist immediately after creation');
console.log('2. If missions disappear during their active period'); 
console.log('3. What causes missions to change status automatically');