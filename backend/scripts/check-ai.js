const path = require('node:path');
const envPath = path.join(__dirname, '../.env');
const inheritedSettings = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('OPENAI_')));
const { parsed = {} } = require('dotenv').config({ path: envPath, quiet: true });
const { analyzeCV, checkOpenAIConnection, checkOpenAIChat, OPENAI_MODEL } = require('../services/ai/openai.service');
const { isOpenAIError } = require('../services/ai/openai.errors');

async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some((arg) => !['--config', '--chat', '--smoke'].includes(arg))) {
    throw Object.assign(new Error('Cách dùng: npm run ai:check -- [--config | --chat | --smoke]'), { code: 'CHECK_USAGE' });
  }
  const overridden = Object.keys(parsed).filter((key) => key.startsWith('OPENAI_')
    && inheritedSettings[key] !== undefined && inheritedSettings[key] !== parsed[key]);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  console.log(JSON.stringify({
    envFile: envPath,
    apiHost: new URL(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').host,
    model: OPENAI_MODEL,
    keySource: inheritedSettings.OPENAI_API_KEY !== undefined ? 'process environment' : 'backend/.env',
    keyConfigured: Boolean(apiKey && apiKey !== 'your_openai_api_key_here'),
    organizationConfigured: Boolean(process.env.OPENAI_ORG_ID),
    projectConfigured: Boolean(process.env.OPENAI_PROJECT_ID),
  }, null, 2));
  if (overridden.length) {
    console.warn(`Biến môi trường process đang ghi đè backend/.env: ${overridden.join(', ')}. Sửa .env sẽ không thay đổi các giá trị này; hãy cập nhật biến môi trường và khởi động lại backend.`);
  }
  if (args.includes('--config')) {
    console.log('Chỉ đọc cấu hình, chưa gọi OpenAI hoặc xác nhận hạn mức API.');
  } else if (args.includes('--chat')) {
    console.log('Đang gửi một yêu cầu Chat Completions ngắn, tối đa 32 token đầu ra...');
    const result = await checkOpenAIChat();
    console.log(JSON.stringify({ success: true, ...result }, null, 2));
    console.log('Chat Completions và JSON schema hoạt động với cấu hình hiện tại.');
  } else if (args.includes('--smoke')) {
    // Do not require models.read: a restricted key can allow chat without it.
    console.log('Đang thử phân tích CV mẫu qua luồng AI thực tế...');
    const started = Date.now();
    const result = await analyzeCV('Sinh viên CNTT, kỹ năng JavaScript, React và Node.js. Dự án: website tìm việc, xây dựng giao diện React và API Node.js. Chưa có kinh nghiệm làm việc. Mong muốn thực tập lập trình web.');
    console.log(JSON.stringify({ success: result.success, seconds: Math.round((Date.now() - started) / 1000), feedback: result.data.overallFeedback, actions: result.data.actionPlan?.length || 0 }, null, 2));
  } else {
    const { model } = await checkOpenAIConnection();
    console.log(`Đã đọc được thông tin model ${model} từ OpenAI. Kiểm tra này chưa xác nhận hạn mức tạo nội dung.`);
    console.log('Chạy npm run ai:check -- --chat để kiểm tra Chat Completions ngắn, hoặc --smoke để phân tích CV mẫu.');
  }
}

if (require.main === module) main().catch((error) => {
  const { code, message } = isOpenAIError(error) || error.code === 'CHECK_USAGE'
    ? error
    : { code: 'CHECK_FAILED', message: 'Không thể hoàn tất kiểm tra OpenAI.' };
  console.error(`Kiểm tra AI thất bại [${code}]: ${message}`);
  if (error.provider) console.error('Chẩn đoán OpenAI:', JSON.stringify(error.provider));
  if (error.retryAfterSeconds) console.error(`OpenAI yêu cầu chờ ${error.retryAfterSeconds} giây trước khi thử lại.`);
  if (error.code === 'OPENAI_QUOTA_EXCEEDED') {
    console.error('Kiểm tra đúng tổ chức/project sở hữu API key ở OpenAI Platform:');
    console.error('Billing: https://platform.openai.com/settings/organization/billing/overview');
    console.error('Limits: https://platform.openai.com/settings/organization/limits');
    console.error('Đổi key trong cùng project không tự bổ sung số dư hoặc tăng giới hạn sử dụng.');
  }
  process.exitCode = 1;
});

module.exports = { main };
