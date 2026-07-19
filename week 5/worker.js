const queue = require('./queue');

const MAX_RETRIES = 2;

// Simulate a slow AI call (e.g. generating a completion)
const simulateSlowAIOperation = async (payload) => {
  return new Promise((resolve, reject) => {
    console.log(`[Worker] Simulating slow AI call for payload:`, payload);
    setTimeout(() => {
      // Randomly fail 30% of the time to demonstrate retries and error handling
      if (Math.random() < 0.3) {
        reject(new Error("Simulated AI network failure"));
      } else {
        resolve({ completion: `AI analysis complete for: ${JSON.stringify(payload)}` });
      }
    }, 5000); // 5 seconds wait to simulate work
  });
};

const processJobs = async () => {
  const jobId = queue.getNextJob();
  
  if (jobId) {
    const job = queue.getJob(jobId);
    queue.updateJob(jobId, { status: 'processing', attempts: job.attempts + 1 });
    console.log(`[Worker] Processing job ${jobId} (Attempt ${job.attempts + 1})`);

    try {
      const result = await simulateSlowAIOperation(job.payload);
      queue.updateJob(jobId, { status: 'completed', result: result });
      console.log(`[Worker] Job ${jobId} completed successfully.`);
    } catch (error) {
      console.error(`[Worker] Job ${jobId} failed: ${error.message}`);
      
      if (job.attempts < MAX_RETRIES) {
        // Retry
        console.log(`[Worker] Retrying job ${jobId}...`);
        queue.updateJob(jobId, { status: 'pending', error: error.message });
        queue.requeueJob(jobId);
      } else {
        // Fail permanently and alert
        queue.updateJob(jobId, { status: 'failed', error: error.message });
        console.error(`[ALERT] CRITICAL: Job ${jobId} permanently failed after ${MAX_RETRIES + 1} attempts! Need human intervention.`);
      }
    }
  }

  // Poll recursively every 1 second
  setTimeout(processJobs, 1000);
};

// Export start function
module.exports = {
  start: () => {
    console.log('[Worker] Started polling for jobs...');
    processJobs();
  }
};
