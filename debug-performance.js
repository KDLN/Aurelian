// Performance debugging script for mission pages
console.log('🔍 Starting performance debugging...');

// Add performance observer
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`⏱️ ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  });
  
  observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
}

// Add React DevTools profiler
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('📊 Page load complete. Check Network tab for slow requests.');
    console.log('🔧 Enable React DevTools Profiler to trace component renders.');
  });
}

// Monitor React Query cache
if (typeof window !== 'undefined') {
  window.debugReactQuery = () => {
    const queryClient = window.queryClient;
    if (queryClient) {
      console.log('💾 React Query Cache:', queryClient.getQueryCache().getAll());
      console.log('🔄 Active Queries:', queryClient.getQueryCache().getAll().filter(q => q.state.fetchStatus === 'fetching'));
    } else {
      console.log('❌ React Query client not found on window');
    }
  };
  
  console.log('🛠️ Run window.debugReactQuery() to inspect cache');
}