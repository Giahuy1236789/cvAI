const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const { initializeDatabase, pool } = require('../config/database');
const { importMockVnJobs } = require('../services/jobs/vn-mock-import.service');

const run = async () => {
  try {
    await initializeDatabase();
    const result = await importMockVnJobs();
    console.log(`Mock VN Jobs import complete: ${result.inserted} imported, ${result.updated} updated, ${result.skipped} skipped.`);
  } catch (error) {
    console.error(`Mock VN Jobs import failed: ${error.message}`);
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
