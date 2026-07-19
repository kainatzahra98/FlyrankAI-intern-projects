const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/reports/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('--- POST /api/reports/generate ---');
    console.log('Status Code:', res.statusCode);
    console.log('Response:', response);
    
    if (response.jobId) {
      pollStatus(response.jobId);
    }
  });
});

req.on('error', error => console.error(error));
req.write(JSON.stringify({ type: 'sales_summary_week7' }));
req.end();

function pollStatus(jobId) {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    http.get(`http://localhost:3000/api/reports/status/${jobId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const statusData = JSON.parse(data);
        console.log(`--- GET /api/reports/status/${jobId} (Poll ${attempts}) ---`);
        console.log(statusData);
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          console.log('Test finished. Exiting.');
          process.exit(0);
        }
      });
    }).on('error', (err) => console.log('Error polling:', err.message));
  }, 2000); // Poll every 2 seconds
}
