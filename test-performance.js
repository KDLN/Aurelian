// Performance Test Script - Test the optimized mission API
console.log('⚡ Testing Performance Optimizations...');

window.testPerformance = async () => {
  console.log('🚀 Starting performance test...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session.access_token;
    
    console.log('📊 Testing mission API performance (5 consecutive requests)...');
    
    const results = [];
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\n--- Request ${i}/5 ---`);
      const startTime = performance.now();
      
      try {
        const response = await fetch('/api/missions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = performance.now();
        const clientTime = Math.round(endTime - startTime);
        
        if (response.ok) {
          const data = await response.json();
          const serverPerf = data.performance || {};
          
          console.log(`✅ Request ${i}: ${clientTime}ms total`);
          console.log(`   Server breakdown: Auth(${serverPerf.authMs}ms) + DB(${serverPerf.dbMs}ms) = ${serverPerf.totalMs}ms`);
          console.log(`   Cache: ${serverPerf.usedCache ? `HIT (age: ${serverPerf.cacheAgeSeconds}s)` : 'MISS'}`);
          console.log(`   Active missions: ${data.activeMissions?.length || 0}`);
          console.log(`   Mission definitions: ${data.missionDefs?.length || 0}`);
          
          results.push({
            requestNumber: i,
            clientMs: clientTime,
            serverMs: serverPerf.totalMs,
            authMs: serverPerf.authMs,
            dbMs: serverPerf.dbMs,
            usedCache: serverPerf.usedCache,
            cacheAge: serverPerf.cacheAgeSeconds
          });
          
        } else {
          console.error(`❌ Request ${i} failed:`, response.status, response.statusText);
        }
        
      } catch (error) {
        console.error(`❌ Request ${i} error:`, error);
      }
      
      // Wait 1 second between requests
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n📈 Performance Summary:');
    console.table(results);
    
    // Calculate averages
    const avgClient = Math.round(results.reduce((sum, r) => sum + r.clientMs, 0) / results.length);
    const avgServer = Math.round(results.reduce((sum, r) => sum + r.serverMs, 0) / results.length);
    const cacheHits = results.filter(r => r.usedCache).length;
    
    console.log(`\n🎯 Key Metrics:`);
    console.log(`   Average client time: ${avgClient}ms`);
    console.log(`   Average server time: ${avgServer}ms`);
    console.log(`   Cache hit rate: ${cacheHits}/${results.length} (${Math.round(cacheHits/results.length*100)}%)`);
    
    // Performance expectations
    console.log(`\n✅ Performance Analysis:`);
    if (avgClient < 500) {
      console.log(`   🚀 EXCELLENT: Client response time under 500ms (${avgClient}ms)`);
    } else if (avgClient < 1000) {
      console.log(`   ⚡ GOOD: Client response time under 1s (${avgClient}ms)`);
    } else {
      console.log(`   ⚠️  NEEDS IMPROVEMENT: Client response time over 1s (${avgClient}ms)`);
    }
    
    if (cacheHits >= 3) {
      console.log(`   💾 EXCELLENT: Server-side caching working effectively`);
    } else {
      console.log(`   ⚠️  Cache may need tuning - only ${cacheHits} hits out of ${results.length} requests`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
};

// Test double-click protection with performance
window.testDoubleClickPerformance = async () => {
  console.log('🎯 Testing double-click protection performance...');
  
  const startTime = performance.now();
  
  // Simulate multiple rapid calls (like double-clicks)
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      fetch('/api/missions')
        .then(response => response.json())
        .then(data => ({
          requestId: i + 1,
          performance: data.performance,
          timestamp: Date.now()
        }))
        .catch(error => ({
          requestId: i + 1,
          error: error.message,
          timestamp: Date.now()
        }))
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = performance.now();
  
  console.log('⚡ Concurrent request results:');
  console.table(results);
  console.log(`Total time for 3 concurrent requests: ${Math.round(endTime - startTime)}ms`);
  
  return results;
};

console.log('🛠️ Available functions:');
console.log('• window.testPerformance() - Test API performance over 5 requests');
console.log('• window.testDoubleClickPerformance() - Test concurrent request handling');
console.log('');
console.log('📋 Expected improvements:');
console.log('• Server response time under 500ms');
console.log('• Cache hits after first request');
console.log('• Immediate UI feedback on mission completion');
console.log('• Reduced polling frequency (60s vs 2s)');