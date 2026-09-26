const { importJobicyJobs } = require('./jobicy-import.service');

const HOUR_MS = 60 * 60 * 1000;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
let activeStop = null;
let importInFlight = null;

// Call after the database and HTTP listener are ready. The importer owns
// JOB_SYNC_COUNT; this scheduler only controls enabling and cadence.
const startJobSync = () => {
  if (activeStop) return activeStop;
  if (String(process.env.JOB_SYNC_ENABLED).trim().toLowerCase() === 'false') return () => {};

  const configuredHours = Number(process.env.JOB_SYNC_INTERVAL_HOURS ?? 6);
  const intervalMs = Math.min(MAX_TIMER_DELAY_MS,
    Math.max(1, Number.isFinite(configuredHours) ? configuredHours : 6) * HOUR_MS);
  let stopped = false;
  let timer = null;

  const stop = () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (activeStop === stop) activeStop = null;
  };

  const schedule = (delay) => {
    if (stopped) return;
    timer = setTimeout(run, Math.min(delay, MAX_TIMER_DELAY_MS));
    timer.unref?.();
  };

  const run = async () => {
    timer = null;
    if (stopped) return;
    // Also cover a scheduler restarted while an earlier import is finishing.
    if (importInFlight) {
      schedule(intervalMs);
      return;
    }

    let nextDelay = intervalMs;
    try {
      importInFlight = Promise.resolve().then(() => importJobicyJobs());
      const result = await importInFlight;
      console.log(`[Jobicy] Sync complete: ${result.inserted} imported, ${result.updated} updated, ${result.skipped} skipped.`);
    } catch (error) {
      if (error?.code === 'IMPORT_RATE_LIMIT') {
        const retryAfterMs = Number(error.retryAfterSeconds) * 1000;
        if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
          nextDelay = Math.max(intervalMs, retryAfterMs);
        }
        console.warn('[Jobicy] Sync deferred: source rate limit; will retry on the next scheduled run.');
      } else {
        // Error messages from upstream may contain response bodies or secrets.
        console.warn('[Jobicy] Sync failed; will retry on the next scheduled run.');
      }
    } finally {
      importInFlight = null;
      schedule(nextDelay);
    }
  };

  activeStop = stop;
  schedule(1000);
  return stop;
};

module.exports = { startJobSync };
