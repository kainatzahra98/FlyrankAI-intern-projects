const queue = require('./queue');
const { getSalesAggregation } = require('./database');
const { generateReport } = require('./pdfGenerator');

const MAX_RETRIES = 2;

const processJobs = async () => {
  const jobId = queue.getNextJob();
  
  if (jobId) {
    const job = queue.getJob(jobId);
    queue.updateJob(jobId, { status: 'processing', attempts: job.attempts + 1 });
    console.log(`[Worker] Processing job ${jobId} (Attempt ${job.attempts + 1})`);

    try {
      // 1. Query the database (SQL aggregation)
      console.log(`[Worker] Querying database...`);
      const data = await getSalesAggregation();
      
      // Simulate delay for realism (3 seconds)
      await new Promise(res => setTimeout(res, 3000));
      
      // Simulate random failure (30% chance)
      if (Math.random() < 0.3) {
        throw new Error("Simulated database timeout or rendering failure");
      }
      
      // 2. Generate PDF Artifact
      console.log(`[Worker] Generating PDF report...`);
      const filename = await generateReport(data, jobId);
      
      // 3. Complete job with artifact link
      const downloadUrl = `/downloads/${filename}`;
      queue.updateJob(jobId, { 
        status: 'completed', 
        result: { message: "Report generated successfully", url: downloadUrl } 
      });
      console.log(`[Worker] Job ${jobId} completed successfully. Artifact available at ${downloadUrl}`);
      
    } catch (error) {
      console.error(`[Worker] Job ${jobId} failed: ${error.message}`);
      
      if (job.attempts < MAX_RETRIES) {
        console.log(`[Worker] Retrying job ${jobId}...`);
        queue.updateJob(jobId, { status: 'pending', error: error.message });
        queue.requeueJob(jobId);
      } else {
        queue.updateJob(jobId, { status: 'failed', error: error.message });
        console.error(`[ALERT] CRITICAL: Job ${jobId} permanently failed!`);
      }
    }
  }

  // Poll recursively every 1 second
  setTimeout(processJobs, 1000);
};

module.exports = {
  start: () => {
    console.log('[Worker] Started polling for report jobs...');
    processJobs();
  }
};
