// Test double-click protection fix - run in browser console
console.log('🧪 Testing Double-Click Protection Fix...');

// Create a test function to simulate rapid mission completion clicks
window.testDoubleClickProtection = async () => {
  console.log('🎯 Starting double-click protection test...');
  
  try {
    // 1. Check for active missions first
    const data = await window.checkMissionStatus();
    if (!data) return;
    
    if (data.activeMissions?.length === 0) {
      console.log('⚠️ No active missions found. Starting a mission first...');
      await window.testMissionLifecycle();
      return;
    }
    
    const activeMission = data.activeMissions[0];
    console.log(`📋 Found active mission: ${activeMission.mission?.name} (${activeMission.id.substring(0, 8)})`);
    
    // Check if mission is ready for completion
    const timeLeft = Math.max(0, Math.ceil((new Date(activeMission.endTime) - new Date()) / 1000));
    
    if (timeLeft > 0) {
      console.log(`⏰ Mission not ready yet. Time remaining: ${timeLeft}s`);
      console.log('🔄 Will monitor until ready...');
      
      const waitForReady = setInterval(async () => {
        const currentData = await window.checkMissionStatus();
        if (currentData?.activeMissions?.length > 0) {
          const mission = currentData.activeMissions[0];
          const remaining = Math.max(0, Math.ceil((new Date(mission.endTime) - new Date()) / 1000));
          
          if (remaining <= 0) {
            console.log('✅ Mission is now ready!');
            clearInterval(waitForReady);
            
            // Now test the double-click protection
            setTimeout(() => testRapidClicks(mission.id), 1000);
          } else {
            console.log(`⏰ Still waiting... ${remaining}s remaining`);
          }
        } else {
          console.log('❌ Mission disappeared while waiting');
          clearInterval(waitForReady);
        }
      }, 2000);
      
    } else {
      console.log('✅ Mission is ready for completion!');
      testRapidClicks(activeMission.id);
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
};

// Simulate rapid clicks on the completion button
function testRapidClicks(missionId) {
  console.log('\n🚀 Testing rapid clicks on Complete Mission button...');
  console.log('🎯 This should demonstrate double-click protection');
  
  // Find the completion button for this mission
  const missionElements = document.querySelectorAll('[data-mission-id]');
  let targetButton = null;
  
  // Look for buttons containing "Complete Mission" text
  const buttons = document.querySelectorAll('button');
  for (let button of buttons) {
    if (button.textContent.includes('Complete Mission') && !button.disabled) {
      targetButton = button;
      break;
    }
  }
  
  if (!targetButton) {
    console.log('❌ Could not find Complete Mission button');
    console.log('💡 Try refreshing the page and ensuring a mission is ready');
    return;
  }
  
  console.log('🔵 Found Complete Mission button, simulating rapid clicks...');
  
  // Simulate rapid clicks (5 clicks in quick succession)
  for (let i = 1; i <= 5; i++) {
    setTimeout(() => {
      console.log(`Click ${i}: Attempting completion...`);
      targetButton.click();
      
      if (i === 1) {
        console.log('📝 First click should succeed');
      } else {
        console.log('🛡️ Subsequent clicks should be blocked by double-click protection');
      }
    }, i * 200); // 200ms between clicks
  }
  
  console.log('\n📊 Expected Results:');
  console.log('✅ First click: Mission completion starts');
  console.log('🛡️ Clicks 2-5: Blocked by protection (check console for "already being completed" messages)');
  console.log('🎯 Button should show "Completing..." and be disabled');
  console.log('⚠️ No "Mission is not active" errors should appear');
}

// Helper function to wait for mission ready state
window.waitForMissionReady = async () => {
  console.log('⏰ Waiting for any mission to become ready...');
  
  const checkInterval = setInterval(async () => {
    const data = await window.checkMissionStatus();
    if (data?.activeMissions?.length > 0) {
      const readyMissions = data.activeMissions.filter(m => 
        new Date(m.endTime) <= new Date()
      );
      
      if (readyMissions.length > 0) {
        console.log(`✅ ${readyMissions.length} mission(s) ready for completion!`);
        clearInterval(checkInterval);
        testRapidClicks(readyMissions[0].id);
      }
    }
  }, 1000);
  
  // Stop checking after 5 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('⏰ Stopped waiting after 5 minutes');
  }, 5 * 60 * 1000);
};

console.log('🛠️ Available functions:');
console.log('• window.testDoubleClickProtection() - Test complete double-click protection');
console.log('• window.waitForMissionReady() - Wait for any mission to become ready');
console.log('');
console.log('📋 Instructions:');
console.log('1. Ensure you have an active mission (or run the test to start one)');
console.log('2. Run window.testDoubleClickProtection()');
console.log('3. Watch for protection messages in console');
console.log('4. Verify no "Mission is not active" errors appear');