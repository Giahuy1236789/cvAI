# Hệ thống AI Hỗ trợ Sinh viên Tạo CV & Tìm kiếm Việc làm Phù hợp

Hệ thống Fullstack được xây dựng bằng **ReactJS (Vite, Tailwind CSS)** và **Node.js (Express, JWT)**, tích hợp **OpenAI API** cho phân tích CV, viết CV, cải thiện CV và gợi ý việc làm.

---

## 👥 Hệ thống Phân quyền 2 Cấp Độ (Role-Based Access Control)

1. **👑 Quản trị viên (Admin)**
   - Dashboard thống kê toàn sàn: Sinh viên, việc làm, doanh nghiệp, CV, đơn ứng tuyển, top kỹ năng.
   - Quản lý & chỉnh sửa tất cả tin tuyển dụng, danh mục kỹ năng, công ty đối tác.
   - Quản lý và duyệt toàn bộ đơn ứng tuyển trên hệ thống.

2. **🎓 Sinh viên (Student)**
   - Quản lý hồ sơ cá nhân đầy đủ 7 phân mục và theo dõi **% hoàn thiện hồ sơ**.
   - **Trình tạo CV thông minh**: Đồng bộ từ profile, có **AI Viết lại** mục tiêu nghề nghiệp, 3 mẫu template, **Xuất PDF chuẩn in ấn**.
   - **AI Chấm điểm CV**: Đánh giá theo chuẩn ATS (Kỹ năng, Kinh nghiệm, Dự án, Học vấn), chỉ ra Điểm mạnh, Điểm yếu, Gợi ý cải thiện, Kỹ năng còn thiếu.
   - **AI Gợi ý Việc làm**: Khớp 5 trọng số (Kỹ năng 60% + Kinh nghiệm 15% + Địa điểm 10% + Lương 10% + Sở thích 5%).
   - Tìm kiếm việc làm, lưu việc yêu thích và nộp đơn ứng tuyển kèm Cover Letter.

---

## 🔑 Tài khoản Mẫu Thử Nghiệm

| Vai trò | Email | Mật khẩu | Chức năng chính |
|---|---|---|---|
| **Sinh viên (Student)** | `student@gmail.com` | `Admin@123` | Tạo CV, AI chấm điểm, Xem việc làm gợi ý, Ứng tuyển |
| **Quản trị viên (Admin)** | `admin@gmail.com` | `Admin@123` | Dashboard toàn hệ thống, Quản lý việc làm, Công ty, Duyệt đơn |

*(Tại trang Đăng nhập có sẵn 2 nút bấm điền nhanh tài khoản thử nghiệm)*

---

## 🚀 Hướng dẫn Khởi chạy

### 0. OpenAI API

Tạo API key trên [OpenAI Platform](https://platform.openai.com/api-keys), rồi điền vào `backend/.env`. Key chỉ được dùng ở backend, không đặt trong frontend hoặc biến `VITE_*`.

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=60000
```

Thay giá trị mẫu bằng API key của bạn và khởi động lại backend sau khi sửa `.env`. Backend gửi nội dung CV/hồ sơ cần phân tích đến OpenAI qua HTTPS.

Server và lệnh kiểm tra đều đọc cố định `backend/.env`, kể cả khi chạy từ thư mục gốc bằng `node backend/server.js`. Biến môi trường có sẵn trong process vẫn được ưu tiên hơn `.env`; `ai:check -- --config` hiển thị nguồn key và cảnh báo các biến `OPENAI_*` bị ghi đè, không in key. Nếu cần chỉ định tổ chức/project của key, dùng `OPENAI_ORG_ID` và `OPENAI_PROJECT_ID`.

`OPENAI_TIMEOUT_MS` giới hạn thời gian chờ từ 5.000 đến 60.000 ms, ngắn hơn thời gian chờ của frontend. Backend không tự gửi lại yêu cầu thất bại. Các yêu cầu giống nhau đang chạy được dùng chung; khi OpenAI cung cấp thời gian chờ, backend tạm ngừng gửi yêu cầu mới đến hết khoảng chờ đó.

### Đồng bộ việc làm Jobicy

Jobicy là nguồn việc làm remote quốc tế đầu tiên của hệ thống. Backend tự đồng bộ mỗi 6 giờ (`JOB_SYNC_INTERVAL_HOURS=6`), lưu `source`, `sourceUrl`, khu vực theo đúng tin gốc và đưa ứng viên đến liên kết Jobicy khi ứng tuyển. Import có chống trùng, ghi trạng thái đồng bộ vào database và không phụ thuộc OpenAI.

Khi chưa có quyền mạng, chạy dữ liệu giả lập bằng cách thêm vào `backend/.env`:

```dotenv
JOBICY_MOCK=true
```

Sau đó khởi động backend và gọi `POST /api/jobs/import/jobicy` bằng tài khoản admin, hoặc chạy `npm run import:jobicy`. Dữ liệu giả lập chỉ phục vụ kiểm thử, không phải số tin thực tế từ Jobicy. Xóa biến này hoặc đặt `JOBICY_MOCK=false` trước khi dùng nguồn thật.

Kiểm tra cấu hình, quyền đọc model, Chat Completions ngắn, hoặc toàn bộ luồng phân tích CV mẫu:

```powershell
cd c:\doanAI\backend
npm run ai:check -- --config
npm run ai:check
npm run ai:check -- --chat
npm run ai:check -- --smoke
```

`--config` chỉ đọc cấu hình, không gọi mạng. `ai:check` không kèm cờ chỉ xác nhận đọc được thông tin model; thành công ở bước này không chứng minh tài khoản còn hạn mức tạo nội dung. `--chat` gửi một yêu cầu nhỏ qua cùng endpoint `/v1/chat/completions` và JSON schema như phân tích CV, tối đa 32 token đầu ra. `--smoke` kiểm tra luồng phân tích thực tế. Hai chế độ này sử dụng hạn mức API, không ghi cơ sở dữ liệu và không yêu cầu quyền đọc danh sách/model trước khi gọi chat. Khi lỗi, lệnh in mã lỗi và mã yêu cầu của OpenAI nếu có, không in API key hoặc nội dung CV của người dùng.

HTTP 429 có thể là giới hạn tốc độ hoặc hết hạn mức thanh toán; xem [hướng dẫn lỗi OpenAI](https://developers.openai.com/api/docs/guides/error-codes). Khi gặp lỗi kéo dài:

- `OPENAI_QUOTA_EXCEEDED`: xem mã chẩn đoán từ OpenAI. `credit_balance_exhausted` là hết số dư; `project_spend_limit_exceeded` / `organization_spend_limit_exceeded` là giới hạn chi tiêu của project/tổ chức; `organization_usage_limit_exceeded` là giới hạn sử dụng được cấp. `insufficient_quota` chưa chỉ rõ loại giới hạn: kiểm tra [Billing](https://platform.openai.com/settings/organization/billing/overview) và [Limits](https://platform.openai.com/settings/organization/limits) của đúng tổ chức/project sở hữu API key. Thử lại liên tục hoặc đổi key trong cùng project không tự khôi phục hạn mức.
- `OPENAI_PERMISSION_DENIED`: kiểm tra quyền của API key, project và model. Nếu chỉ lệnh đọc model bị từ chối, dùng `--chat` để kiểm tra trực tiếp quyền tạo nội dung.
- `OPENAI_RATE_LIMITED`: chờ bộ đếm trên trang nếu có; nếu tiếp tục lỗi, kiểm tra hạn mức request/token của project và model. Thời gian chờ lấy từ `Retry-After` hoặc header đặt lại hạn mức đã cạn, không tự đoán là vài phút.
- `OPENAI_USAGE_LIMIT`: OpenAI trả 429 nhưng chưa đủ thông tin xác định nguyên nhân. Quản trị viên kiểm tra log backend hoặc `ai:check -- --smoke` để lấy mã chẩn đoán.

Nếu AI tạm thời không khả dụng, trang việc làm vẫn hiển thị kết quả đối chiếu theo hồ sơ và ghi rõ chưa có nhận xét AI. Lỗi API key không làm đăng xuất tài khoản ứng dụng. Phân tích CV chỉ lưu kết quả thành công và dùng lại bản phân tích của cùng model OpenAI khi CV chưa thay đổi.

### 1. Backend (Port 5000)
```powershell
cd c:\doanAI\backend
npm start
```

### 2. Frontend (Port 5173)
```powershell
cd c:\doanAI\frontend
npm run dev
```
Truy cập: `http://localhost:5173`
