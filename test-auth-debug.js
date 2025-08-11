// Authentication Debug Script - Test Supabase auth issues
console.log('🔐 Testing Authentication Issues...');

window.testAuth = async () => {
  console.log('🚀 Starting authentication test...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    
    if (!supabaseClient) {
      console.error('❌ No Supabase client found');
      return;
    }
    
    console.log('1️⃣ Getting current session...');
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('❌ No session found - user not logged in');
      return;
    }
    
    console.log('✅ Session found:', {
      user: session.user?.id,
      tokenType: session.token_type,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token
    });
    
    // Check token format
    if (session.access_token) {
      const tokenParts = session.access_token.split('.');
      console.log('🔍 Token analysis:', {
        parts: tokenParts.length,
        expectedParts: 3,
        isValidFormat: tokenParts.length === 3,
        header: tokenParts[0]?.substring(0, 20) + '...',
        payload: tokenParts[1]?.substring(0, 20) + '...'
      });
      
      if (tokenParts.length !== 3) {
        console.error('❌ Invalid JWT token format!');
        
        console.log('2️⃣ Attempting to refresh session...');
        const { data: { session: newSession }, error: refreshError } = await supabaseClient.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Refresh failed:', refreshError);
        } else if (newSession) {
          console.log('✅ Session refreshed successfully');
          const newTokenParts = newSession.access_token.split('.');
          console.log('🔍 New token analysis:', {
            parts: newTokenParts.length,
            isValidFormat: newTokenParts.length === 3
          });
        }
      }
    }
    
    // Test API call with current token
    console.log('3️⃣ Testing API call...');
    const testStartTime = performance.now();
    
    try {
      const response = await fetch('/api/missions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const testEndTime = performance.now();
      const testTime = Math.round(testEndTime - testStartTime);
      
      console.log(`⚡ API test completed in ${testTime}ms (status: ${response.status})`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful:', {
          missionDefs: data.missionDefs?.length,
          activeMissions: data.activeMissions?.length,
          hasPerformance: !!data.performance,
          debugTimestamp: data.debugTimestamp
        });
        
        if (data.performance) {
          console.log('📊 Server performance:', data.performance);
        }
        
        // Check if we got mock data
        if (data.missionDefs?.length === 3 && !data.performance) {
          console.warn('⚠️ Received mock data - API may have fallen back due to DB issues');
        }
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API call failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData
        });
      }
      
    } catch (apiError) {
      console.error('❌ API call exception:', apiError);
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
  }
};

// Test session refresh specifically
window.testSessionRefresh = async () => {
  console.log('🔄 Testing session refresh...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session: oldSession } } = await supabaseClient.auth.getSession();
    
    console.log('📊 Current session expires at:', 
      oldSession ? new Date(oldSession.expires_at * 1000).toISOString() : 'No session'
    );
    
    const { data: { session: newSession }, error } = await supabaseClient.auth.refreshSession();
    
    if (error) {
      console.error('❌ Refresh failed:', error);
    } else {
      console.log('✅ Session refreshed:', {
        newExpiresAt: new Date(newSession.expires_at * 1000).toISOString(),
        tokenChanged: oldSession?.access_token !== newSession?.access_token
      });
    }
    
  } catch (error) {
    console.error('❌ Session refresh test failed:', error);
  }
};

// Test re-authentication
window.testReauth = async () => {
  console.log('🔑 Testing re-authentication...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    
    // Sign out and back in
    console.log('1️⃣ Signing out...');
    await supabaseClient.auth.signOut();
    
    console.log('2️⃣ Current session after signout:');
    const { data: { session: afterSignout } } = await supabaseClient.auth.getSession();
    console.log('Session exists:', !!afterSignout);
    
    // You would need to implement sign-in here based on your auth flow
    console.log('💡 To complete re-auth, user needs to sign in again through your auth flow');
    
  } catch (error) {
    console.error('❌ Re-auth test failed:', error);
  }
};

console.log('🛠️ Available functions:');
console.log('• window.testAuth() - Complete authentication diagnostic');
console.log('• window.testSessionRefresh() - Test session refresh');
console.log('• window.testReauth() - Test sign out/in flow');
console.log('');
console.log('📋 This will help identify:');
console.log('• Invalid JWT token format');
console.log('• Expired or missing sessions'); 
console.log('• API authentication failures');
console.log('• Mock data fallback causes');