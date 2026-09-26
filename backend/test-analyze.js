require('dotenv').config();
const { analyzeCV } = require('./services/ai/gemini.service.js');

async function test() {
  try {
    const res = await analyzeCV("Họ tên: Nguyễn Văn A\nKỹ năng: React, Node.js");
    console.log("Thành công:", res);
  } catch (error) {
    console.error("Lỗi:", error);
  }
}
test();
