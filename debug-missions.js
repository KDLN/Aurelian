// Mission debugging script - run in browser console
console.log('🔍 Starting mission debugging...');

// Monitor React Query cache changes
if (typeof window !== 'undefined') {
  window.debugMissions = () => {
    const queryClient = window.queryClient;
    if (!queryClient) {
      console.log('❌ React Query client not found');
      return;
    }
    
    const missionCache = queryClient.getQueryCache().find(['missions', 'list']);
    if (missionCache) {
      console.log('📊 Mission Cache State:', {
        state: missionCache.state.status,
        data: missionCache.state.data,
        activeMissions: missionCache.state.data?.activeMissions?.length || 0,
        lastUpdated: new Date(missionCache.state.dataUpdatedAt).toLocaleTimeString(),
        isFetching: missionCache.state.isFetching,
        isStale: queryClient.getQueryState(['missions', 'list'])?.isStale
      });
      
      if (missionCache.state.data?.activeMissions) {
        console.table(missionCache.state.data.activeMissions.map(m => ({
          id: m.id.substring(0, 8),
          missionId: m.missionId,
          status: m.status,
          endTime: new Date(m.endTime).toLocaleTimeString()
        })));
      }
    }
    
    // Show all queries
    console.log('🗄️ All Queries:', queryClient.getQueryCache().getAll().map(q => ({
      key: q.queryKey,
      status: q.state.status,
      isFetching: q.state.isFetching
    })));
  };
  
  // Monitor mutations
  window.debugMutations = () => {
    const mutationCache = queryClient?.getMutationCache();
    if (mutationCache) {
      console.log('🔄 Active Mutations:', mutationCache.getAll().map(m => ({
        mutationId: m.mutationId,
        status: m.state.status,
        variables: m.state.variables
      })));
    }
  };
  
  // Auto-refresh debug info
  let debugInterval;
  window.startMissionDebug = (intervalMs = 2000) => {
    if (debugInterval) clearInterval(debugInterval);
    debugInterval = setInterval(() => {
      console.log('--- Mission Debug Update ---');
      window.debugMissions();
    }, intervalMs);
    console.log(`🔄 Started auto-debug (${intervalMs}ms intervals). Use stopMissionDebug() to stop.`);
  };
  
  window.stopMissionDebug = () => {
    if (debugInterval) {
      clearInterval(debugInterval);
      debugInterval = null;
      console.log('⏹️ Stopped auto-debug');
    }
  };
  
  console.log('🛠️ Debug functions available:');
  console.log('- window.debugMissions() - Show mission cache state');
  console.log('- window.debugMutations() - Show active mutations');  
  console.log('- window.startMissionDebug() - Auto-refresh debug info');
  console.log('- window.stopMissionDebug() - Stop auto-refresh');
}