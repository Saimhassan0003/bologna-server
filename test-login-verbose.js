const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const postData = JSON.stringify({
  email: 'admin@ibes.com',
  password: 'password123'
});

console.log('Sending request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Payload:', postData);

const req = http.request(options, (res) => {
  console.log(`\nResponse Status: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nRaw Response:', data);
    console.log('Response Length:', data.length);
    
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Failed to parse JSON:', e.message);
      }
    } else {
      console.log('Response is not JSON');
    }
    
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`\nRequest Error: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();

setTimeout(() => {
  console.log('Request timeout - no response received');
  process.exit(1);
}, 5000);
