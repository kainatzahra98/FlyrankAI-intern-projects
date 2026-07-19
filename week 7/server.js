const express = require('express');
const path = require('path');
const queue = require('./queue');
const worker = require('./worker');

const app = express();
app.use(express.json());

// Expose the reports directory so users can download artifacts
app.use('/downloads', express.static(path.join(__dirname, 'reports')));

// 1. Request Report Generation
app.post('/api/reports/generate', (req, res) => {
  const payload = req.body || { type: 'sales_summary' }; // Default payload

  const jobId = queue.addJob(payload);

  // Return 202 Accepted instantly
  res.status(202).json({
    message: "Report generation started in the background",
    jobId: jobId,
    statusUrl: `/api/reports/status/${jobId}`
  });
});

// 2. Check Job Status
app.get('/api/reports/status/:jobId', (req, res) => {
  const job = queue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.status(200).json({
    jobId: job.id,
    status: job.status,
    result: job.result, // Contains the download URL when completed
    error: job.error,
    attempts: job.attempts
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[Server] Report generation API listening on port ${PORT}`);
  worker.start();
});
