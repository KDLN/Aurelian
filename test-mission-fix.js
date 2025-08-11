// Quick test to verify mission persistence fix
// Run this in browser console on http://localhost:3000/missions

console.log('🧪 Testing mission persistence fix...');

// Check if we're on the missions page
if (!window.location.pathname.includes('/missions')) {
  console.error('❌ Please navigate to /missions page first');
  console.log('📍 Go to: http://localhost:3000/missions');
} else {
  console.log('✅ On missions page - ready to test');
  
  // Add helper to check React Query cache state
  window.checkMissionCache = () => {
    const queryClient = window.queryClient;
    if (!queryClient) {
      console.log('❌ Query client not available');
      return;
    }
    
    const missionQuery = queryClient.getQueryCache().find(['missions', 'list']);
    if (missionQuery) {
      const data = missionQuery.state.data;
      console.log('📊 Mission Cache Status:', {
        status: missionQuery.state.status,
        dataUpdatedAt: new Date(missionQuery.state.dataUpdatedAt).toLocaleString(),
        missionDefs: data?.missionDefs?.length || 0,
        activeMissions: data?.activeMissions?.length || 0,
        activeMissionsList: data?.activeMissions?.map(m => ({
          id: m.id.slice(-8),
          missionId: m.missionId,
          status: m.status,
          timeLeft: Math.ceil((new Date(m.endTime) - new Date()) / 1000) + 's'
        })) || []
      });
    } else {
      console.log('❌ Mission query not found in cache');
    }
  };
  
  // Test mission persistence
  window.testMissionPersistence = async () => {
    console.log('🚀 Starting mission persistence test...');
    
    try {
      // Get missions data from cache first
      window.checkMissionCache();
      
      // Wait a moment for any pending mutations to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Test complete - check console logs above');
      console.log('💡 Try starting a mission through the UI and run checkMissionCache() again');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };
  
  console.log('🛠️ Available test functions:');
  console.log('• window.checkMissionCache() - Check current React Query cache');
  console.log('• window.testMissionPersistence() - Run persistence test');
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Run window.checkMissionCache() to see current state');
  console.log('2. Start a mission through the UI');
  console.log('3. Immediately run window.checkMissionCache() again');
  console.log('4. Wait 3-5 seconds and run checkMissionCache() once more');
  console.log('5. The mission should persist through all steps');
}