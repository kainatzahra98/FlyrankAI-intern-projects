const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class JobQueue {
  constructor() {
    this.jobs = new Map(); // Store job states
    this.queue = []; // Array of job IDs waiting to be processed
    this.payloadHashes = new Map(); // Store hashes for idempotency
  }

  _hashPayload(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  addJob(payload) {
    const hash = this._hashPayload(payload);

    if (this.payloadHashes.has(hash)) {
      console.log(`[Queue] Idempotency hit! Payload already exists.`);
      return this.payloadHashes.get(hash);
    }

    const jobId = uuidv4();
    this.jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      payload: payload,
      result: null,
      error: null,
      attempts: 0
    });
    
    this.payloadHashes.set(hash, jobId);
    this.queue.push(jobId);
    
    console.log(`[Queue] Added new job: ${jobId}`);
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  updateJob(jobId, updates) {
    if (this.jobs.has(jobId)) {
      const job = this.jobs.get(jobId);
      this.jobs.set(jobId, { ...job, ...updates });
    }
  }

  getNextJob() {
    if (this.queue.length > 0) {
      return this.queue.shift();
    }
    return null;
  }

  requeueJob(jobId) {
    this.queue.push(jobId);
    console.log(`[Queue] Re-queued job: ${jobId}`);
  }
}

module.exports = new JobQueue();
