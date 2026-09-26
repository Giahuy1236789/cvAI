const sampleIds = new Set(require('../../data/jobs.json').map((job) => job.id));
const MAX_SOURCE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const isSampleJob = (job) => job?.source === 'Demo' || (!job?.source && sampleIds.has(job?.id));

const isPublicJob = (job, now = Date.now()) => {
  if (!job || isSampleJob(job) || (job.status && job.status !== 'active')) return false;
  if (job.deadline) {
    // MySQL DATE represents the entire deadline day in the backend's timezone.
    const deadline = new Date(job.deadline);
    if (Number.isNaN(deadline.getTime())) return false;
    deadline.setHours(23, 59, 59, 999);
    if (deadline.getTime() < now) return false;
  }
  if (job.source === 'Jobicy') {
    const syncedAt = new Date(job.lastSyncedAt || 0).getTime();
    if (!syncedAt || !Number.isFinite(syncedAt) || now - syncedAt > MAX_SOURCE_AGE_MS) return false;
  }
  return true;
};

module.exports = { isSampleJob, isPublicJob };
