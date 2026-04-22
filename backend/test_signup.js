const fetch = require('node-fetch');

async function testSignup() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }),
    });
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSignup();
