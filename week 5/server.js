const express = require('express');
const queue = require('./queue');
const worker = require('./worker');

const app = express();
app.use(express.json());

// 1. Accept fast, work in background
app.post('/api/analyze', (req, res) => {
  const payload = req.body;
  
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: "Payload is required" });
  }

  // Queue the job (handles idempotency automatically)
  const jobId = queue.addJob(payload);

  // Return 202 Accepted instantly
  res.status(202).json({
    message: "Job accepted for processing",
    jobId: jobId,
    statusUrl: `/api/status/${jobId}`
  });
});

// 2. Status endpoint reports the result
app.get('/api/status/:jobId', (req, res) => {
  const job = queue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.status(200).json({
    jobId: job.id,
    status: job.status,
    result: job.result,
    error: job.error,
    attempts: job.attempts
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[Server] Background job API listening on port ${PORT}`);
  // Start the worker polling in the background
  worker.start();
});
