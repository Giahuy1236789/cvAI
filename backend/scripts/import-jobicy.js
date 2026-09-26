const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const { initializeDatabase, pool } = require('../config/database');
const { importJobicyJobs } = require('../services/jobs/jobicy-import.service');

const run = async () => {
  try {
    await initializeDatabase();
    const result = await importJobicyJobs();
    console.log(`Jobicy import complete: ${result.inserted} imported, ${result.updated} updated, ${result.skipped} skipped.`);
  } catch (error) {
    console.error(`Jobicy import failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (_) {
      console.error('Could not close the database connection cleanly.');
      process.exitCode = 1;
    }
  }
};

if (require.main === module) run();

module.exports = { run };
