// Test webhook endpoint manually
const testWebhook = async () => {
  const mockPayload = {
    type: 'INSERT',
    table: 'users', 
    record: {
      id: 'c7c7261e-42c0-411e-a6b1-d671d0113d45',
      email: 'colinjohnsonw@gmail.com',
      created_at: new Date().toISOString(),
      user_metadata: {
        display_name: 'Colin'
      }
    },
    old_record: null
  };

  try {
    console.log('Testing webhook endpoint...');
    
    const response = await fetch('http://localhost:3000/api/auth/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook succeeded:', result);
    } else {
      console.log('❌ Webhook failed:', result);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
};

testWebhook();