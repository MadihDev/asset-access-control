const https = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Health Response:', data);
    
    // Test projects endpoint
    const projectOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/project',
      method: 'GET'
    };
    
    const projectReq = https.request(projectOptions, (projectRes) => {
      let projectData = '';
      projectRes.on('data', (chunk) => projectData += chunk);
      projectRes.on('end', () => {
        console.log('Projects Response:', projectData);
      });
    });
    
    projectReq.on('error', (err) => {
      console.error('Projects Error:', err.message);
    });
    
    projectReq.end();
  });
});

req.on('error', (err) => {
  console.error('Health Error:', err.message);
});

req.end();