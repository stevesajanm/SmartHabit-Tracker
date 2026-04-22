const http = require('http');

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testHabits() {
  try {
    // 1. Signup to get token
    const signupData = JSON.stringify({
      name: 'Habit Tester',
      email: 'tester' + Date.now() + '@example.com',
      password: 'password123'
    });
    const signupRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(signupData) 
      }
    }, signupData);

    console.log('Signup Status:', signupRes.status);
    const token = signupRes.data.token;
    if (!token) {
      console.log('Signup Response:', signupRes.data);
      throw new Error('No token received');
    }

    // 2. Create Habit
    const habitData = JSON.stringify({
      name: 'Drink Water',
      icon: '💧',
      difficulty: 'Easy'
    });
    const createRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/habits',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(habitData),
        'Authorization': `Bearer ${token}`
      }
    }, habitData);
    if (createRes.status !== 201) {
      console.log('Error Body:', createRes.data);
      throw new Error(`Failed to create habit: ${createRes.status}`);
    }
    console.log('Created Habit:', createRes.data.name);

    // 3. Get Habits
    const getRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/habits',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Get Habits Status:', getRes.status);
    if (getRes.status !== 200) {
      console.log('Error Body:', getRes.data);
    }
    console.log('Habits Count:', getRes.data.length);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testHabits();
