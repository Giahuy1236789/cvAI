const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DATA_DIR = path.join(__dirname, '../data');
const jsonFields = new Set(['desiredPositions', 'education', 'skills', 'experiences', 'projects', 'certificates', 'languages', 'benefits', 'personalInfo', 'analysis', 'breakdown', 'matchedSkills', 'missingSkills', 'reasons', 'strengths', 'weaknesses', 'suggestions', 'additionalSkills', 'formatting']);
const tables = {
  users: { table: 'users', columns: ['id', 'email', 'password', 'role', 'fullName', 'companyId', 'createdAt'] },
  companies: { table: 'companies', columns: ['id', 'name', 'logo', 'description', 'address', 'website', 'email', 'industry', 'size', 'createdAt'] },
  students: { table: 'students', columns: ['id', 'userId', 'fullName', 'avatar', 'phone', 'email', 'dateOfBirth', 'address', 'university', 'major', 'graduationYear', 'careerObjective', 'desiredPositions', 'desiredLocation', 'desiredSalary', 'education', 'skills', 'experiences', 'projects', 'certificates', 'languages', 'createdAt', 'updatedAt'] },
  skills: { table: 'skills', columns: ['id', 'name', 'category'] },
  jobs: { table: 'jobs', columns: ['id', 'companyId', 'title', 'description', 'location', 'salaryMin', 'salaryMax', 'salaryCurrency', 'salaryPeriod', 'experience', 'employmentType', 'skills', 'education', 'benefits', 'deadline', 'status', 'source', 'sourceUrl', 'externalId', 'lastSyncedAt', 'createdAt', 'updatedAt'] },
  cvs: { table: 'cvs', columns: ['id', 'studentId', 'title', 'template', 'personalInfo', 'careerObjective', 'summary', 'education', 'skills', 'experiences', 'projects', 'certificates', 'languages', 'aiGenerated', 'createdAt', 'updatedAt'] },
  applications: { table: 'applications', columns: ['id', 'studentId', 'jobId', 'cvId', 'coverLetter', 'status', 'appliedAt', 'updatedAt'] },
  savedJobs: { table: 'saved_jobs', columns: ['id', 'studentId', 'jobId', 'savedAt'] },
  cvAnalysis: { table: 'cv_analyses', columns: ['id', 'studentId', 'cvId', 'analysis', 'createdAt'] },
  recommendations: { table: 'recommendations', columns: ['id', 'studentId', 'jobId', 'matchScore', 'breakdown', 'matchedSkills', 'missingSkills', 'reasons', 'createdAt'] },
};

const columnName = (name) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_cv_job_db', waitForConnections: true, connectionLimit: 10,
});
let cache = {};
let writeQueue = Promise.resolve();

const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const fromRow = (key, row) => {
  const item = {};
  tables[key].columns.forEach((field) => { const value = row[columnName(field)]; item[field] = jsonFields.has(field) ? parseJson(value, []) : value; });
  if (key === 'cvs') item.aiGenerated = Boolean(item.aiGenerated);
  return item;
};
const valueForDb = (field, value) => {
  if (jsonFields.has(field)) return JSON.stringify(value || []);
  if ((field === 'dateOfBirth' || field === 'deadline') && !value) return null;
  if ((field === 'companyId' || field === 'cvId') && !value) return null;
  if (field === 'fullName' && !value) return 'Người dùng';
  if (field.endsWith('At') && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  return value === undefined ? null : value;
};

const ensureCompatibilityColumns = async () => {
  const compatibilityColumns = [
    ['students', 'skills', 'JSON NULL'],
    ['jobs', 'skills', 'JSON NULL'],
    ['jobs', 'source', 'VARCHAR(64) NULL'],
    ['jobs', 'source_url', 'TEXT NULL'],
    ['jobs', 'external_id', 'VARCHAR(255) NULL'],
    ['jobs', 'salary_currency', 'VARCHAR(16) NULL'],
    ['jobs', 'salary_period', 'VARCHAR(32) NULL'],
    ['jobs', 'last_synced_at', 'DATETIME NULL'],
    ['cv_analyses', 'analysis', 'JSON NULL'],
  ];
  for (const [table, column, definition] of compatibilityColumns) {
    const [rows] = await pool.query('SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column]);
    if (rows.length === 0) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
  // Older Jobicy imports predate last_synced_at. Preserve those records and
  // use their latest known write time until the next source synchronization.
  await pool.query("UPDATE jobs SET last_synced_at = COALESCE(last_synced_at, updated_at, created_at) WHERE source = 'Jobicy' AND last_synced_at IS NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS job_sync_state (
    source VARCHAR(64) PRIMARY KEY,
    last_attempt_at BIGINT NOT NULL DEFAULT 0,
    last_success_at BIGINT NOT NULL DEFAULT 0,
    last_error VARCHAR(128) NULL,
    summary JSON NULL
  )`);
};
const persistRecord = async (key, item, executor = pool) => {
  const config = tables[key];
  if (!config || !item?.id) return;
  const columns = config.columns.map(columnName);
  const values = config.columns.map((field) => valueForDb(field, item[field]));
  const updates = columns.filter((column) => column !== 'id').map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(', ');
  await executor.query(`INSERT INTO \`${config.table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`, values);
};
const importJsonData = async () => {
  for (const key of ['companies', 'users', 'students', 'skills', 'jobs', 'cvs', 'applications', 'savedJobs', 'cvAnalysis', 'recommendations']) {
    const file = path.join(DATA_DIR, `${key}.json`);
    if (!fs.existsSync(file)) continue;
    for (const row of JSON.parse(fs.readFileSync(file, 'utf8'))) await persistRecord(key, row);
  }
};
const loadCache = async () => {
  cache = {};
  for (const [key, config] of Object.entries(tables)) {
    const [rows] = await pool.query(`SELECT * FROM \`${config.table}\``);
    cache[key] = rows.map((row) => fromRow(key, row));
  }
};
const initializeDatabase = async () => {
  await pool.query('SELECT 1');
  await ensureCompatibilityColumns();
  const sourceUsers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
  const [users] = await pool.query('SELECT COUNT(*) AS total FROM users');
  // A previous interrupted import can leave only part of the seed data behind.
  if (users[0].total < sourceUsers.length) await importJsonData();
  await loadCache();
  console.log('MySQL connected and application data loaded.');
};
const queueWrite = (operation) => {
  writeQueue = writeQueue.then(operation).catch((error) => console.error('MySQL write error:', error.message));
  return writeQueue;
};
const flushWrites = () => writeQueue;

// Imports must reach MySQL before becoming visible, and must not report success
// when persistence fails. Existing application writes stay ahead in the queue.
const persistJobImport = ({ companies = [], jobs = [] }) => {
  const pending = writeQueue.then(async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const company of companies) await persistRecord('companies', company, connection);
      for (const job of jobs) await persistRecord('jobs', job, connection);
      await connection.commit();
      for (const [table, records] of [['companies', companies], ['jobs', jobs]]) {
        if (!cache[table]) cache[table] = [];
        for (const record of records) {
          const existing = cache[table].find((item) => item.id === record.id);
          if (existing) Object.assign(existing, record);
          else cache[table].push(record);
        }
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
  // Keep the queue usable after a rejected import; its caller still receives it.
  writeQueue = pending.catch(() => {});
  return pending;
};

// Store the attempt time before accessing the source. Row locking prevents
// clicks, another server process or a restart from bypassing the source limit.
const claimJobSync = async (source, intervalMs = 3600000) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT IGNORE INTO job_sync_state (source) VALUES (?)', [source]);
    const [rows] = await connection.query('SELECT last_attempt_at FROM job_sync_state WHERE source = ? FOR UPDATE', [source]);
    const now = Date.now();
    const remaining = Number(rows[0].last_attempt_at) + Math.max(3600000, intervalMs) - now;
    if (remaining > 0) {
      await connection.commit();
      return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000) };
    }
    await connection.query('UPDATE job_sync_state SET last_attempt_at = ?, last_error = NULL WHERE source = ?', [now, source]);
    await connection.commit();
    return { allowed: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const finishJobSync = async (source, { success, error, summary }) => {
  if (success) {
    await pool.query('UPDATE job_sync_state SET last_success_at = ?, last_error = NULL, summary = ? WHERE source = ?', [Date.now(), JSON.stringify(summary || {}), source]);
  } else {
    const code = typeof error === 'string' && /^[A-Z0-9_]{1,128}$/.test(error) ? error : 'JOB_SYNC_FAILED';
    await pool.query('UPDATE job_sync_state SET last_error = ? WHERE source = ?', [code, source]);
  }
};

const getJobSyncState = async (source = 'Jobicy') => {
  const [rows] = await pool.query('SELECT * FROM job_sync_state WHERE source = ?', [source]);
  const row = rows[0];
  return {
    source,
    lastAttemptAt: row?.last_attempt_at ? new Date(Number(row.last_attempt_at)).toISOString() : null,
    lastSuccessAt: row?.last_success_at ? new Date(Number(row.last_success_at)).toISOString() : null,
    lastError: row?.last_error || null,
    summary: parseJson(row?.summary, null),
  };
};
const readJSON = (filename) => cache[filename] || [];
const writeJSON = (filename, data) => { cache[filename] = data; queueWrite(async () => { for (const item of data) await persistRecord(filename, item); }); };
const findById = (filename, id) => (cache[filename] || []).find((item) => item.id === id) || null;
const findBy = (filename, field, value) => (cache[filename] || []).filter((item) => item[field] === value);
const findOneBy = (filename, field, value) => (cache[filename] || []).find((item) => item[field] === value) || null;
const insert = (filename, item) => { if (!cache[filename]) cache[filename] = []; cache[filename].push(item); queueWrite(() => persistRecord(filename, item)); return item; };
const updateById = (filename, id, updates) => { const item = findById(filename, id); if (!item) return null; Object.assign(item, updates); queueWrite(() => persistRecord(filename, item)); return item; };
const deleteById = (filename, id) => {
  const config = tables[filename]; const items = cache[filename] || []; const index = items.findIndex((item) => item.id === id);
  if (index === -1 || !config) return false;
  items.splice(index, 1); queueWrite(() => pool.query(`DELETE FROM \`${config.table}\` WHERE id = ?`, [id])); return true;
};
module.exports = { pool, initializeDatabase, readJSON, writeJSON, findById, findBy, findOneBy, insert, updateById, deleteById, flushWrites, persistJobImport, claimJobSync, finishJobSync, getJobSyncState };
