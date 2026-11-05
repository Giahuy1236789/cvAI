const crypto = require('crypto');
const { persistJobImport, finishJobSync, pool } = require('../../config/database');

// Tạo UUID v4 giả lập nhưng có tính nhất quán (deterministic) theo seed để tránh phình to DB khi chạy nhiều lần
const toUUID = (seed) => {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const COMPANIES = [
  {
    slug: 'viettel',
    name: 'Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Viettel.svg',
    description: 'Tập đoàn Viễn thông và Công nghệ Thông tin quy mô toàn cầu hàng đầu Việt Nam, tiên phong nghiên cứu 5G, AI, Cloud và An ninh mạng.',
    address: 'Lô D26, Khu đô thị mới Cầu Giấy, Phường Yên Hòa, Cầu Giấy, Hà Nội',
    website: 'https://viettel.com.vn',
    industry: 'Viễn thông, Công nghệ cao, An ninh mạng',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'Lô D26 Khu đô thị mới Cầu Giấy, Cầu Giấy, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Viettel Complex, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Viettel, 58 Xô Viết Nghệ Tĩnh, Hải Châu, Đà Nẵng' },
      { city: 'Hải Phòng', address: 'Số 1 Lê Hồng Phong, Ngô Quyền, Hải Phòng' },
      { city: 'Cần Thơ', address: 'Số 210 Trần Phú, Ninh Kiều, Cần Thơ' },
      { city: 'Bà Rịa - Vũng Tàu', address: '202 Lê Hồng Phong, TP. Vũng Tàu, Bà Rịa - Vũng Tàu' }
    ]
  },
  {
    slug: 'fpt-software',
    name: 'FPT Software (Tập đoàn FPT)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/FPT_logo_2010.svg/1200px-FPT_logo_2010.svg.png',
    description: 'Công ty xuất khẩu phần mềm lớn nhất Đông Nam Á, cung cấp dịch vụ chuyển đổi số toàn diện cho các tập đoàn Fortune Global 500.',
    address: 'Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    website: 'https://fptsoftware.com',
    industry: 'Gia công & Dịch vụ phần mềm toàn cầu',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'F-Ville, Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'F-Town 3, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'FPT Complex, Đường Nam Kỳ Khởi Nghĩa, Ngũ Hành Sơn, Đà Nẵng' },
      { city: 'Quy Nhơn, Bình Định', address: 'Trung tâm AI FPT, Thung lũng Sáng tạo Quy Nhơn, Bình Định' },
      { city: 'Cần Thơ', address: 'Đường số 1, KĐT Nam Cần Thơ, Ninh Kiều, Cần Thơ' }
    ]
  },
  {
    slug: 'vng',
    name: 'Công ty Cổ phần VNG (VNG Corporation)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/VNG_Logo.png/1200px-VNG_Logo.png',
    description: 'Kỳ lân công nghệ đầu tiên của Việt Nam với các sản phẩm quốc dân như Zalo, ZaloPay, Zing MP3 cùng hệ sinh thái game trực tuyến vươn tầm thế giới.',
    address: 'VNG Campus, Đường số 13, KCX Tân Thuận, Quận 7, TP. Hồ Chí Minh',
    website: 'https://vng.com.vn',
    industry: 'Internet, Game, Nền tảng số, Cloud & AI',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'VNG Campus, Khu Chế Xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà Charmvit, 117 Trần Duy Hưng, Cầu Giấy, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Bach Dang Complex, 50 Bạch Đằng, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'momo',
    name: 'Công ty Cổ phần Dịch vụ Di động Trực tuyến (MoMo)',
    logo: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
    description: 'Siêu ứng dụng thanh toán và tài chính số 1 Việt Nam, phục vụ hơn 30 triệu người dùng với công nghệ bảo mật và AI tiên tiến.',
    address: 'Tòa nhà Phú Mỹ Hưng, Số 8 Hoàng Văn Thái, Quận 7, TP. Hồ Chí Minh',
    website: 'https://momo.vn',
    industry: 'Fintech, Thanh toán di động',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Phú Mỹ Hưng, Số 8 Hoàng Văn Thái, Quận 7, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà HITC, 239 Xuân Thủy, Cầu Giấy, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà ACB, 218 Bạch Đằng, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'vnpt',
    name: 'Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT / VNPT-IT)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/VNPT_Logo.svg/1200px-VNPT_Logo.svg.png',
    description: 'Tập đoàn viễn thông nòng cốt quốc gia đi đầu trong triển khai Chính phủ số, Đô thị thông minh (Smart City) và Y tế, Giáo dục số.',
    address: 'Tòa nhà VNPT, 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội',
    website: 'https://vnpt.com.vn',
    industry: 'Viễn thông & Chuyển đổi số Quốc gia',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà VNPT, 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: '121 Pasteur, Phường 6, Quận 3, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: '346 Đường 2/9, Hải Châu, Đà Nẵng' },
      { city: 'Hải Phòng', address: 'Số 4 Lạch Tray, Ngô Quyền, Hải Phòng' },
      { city: 'Nha Trang, Khánh Hòa', address: 'Số 4 Lê Thánh Tôn, TP. Nha Trang, Khánh Hòa' },
      { city: 'Cần Thơ', address: '02 Nguyễn Trãi, Ninh Kiều, Cần Thơ' }
    ]
  },
  {
    slug: 'shopee',
    name: 'Công ty TNHH Shopee Việt Nam (Sea Group)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/1200px-Shopee.svg.png',
    description: 'Nền tảng thương mại điện tử dẫn đầu Đông Nam Á, trực thuộc tập đoàn công nghệ toàn cầu Sea Group.',
    address: 'Saigon Centre 2, 67 Lê Lợi, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    website: 'https://careers.shopee.vn',
    industry: 'E-commerce, Fintech, Supply Chain',
    size: '5000-10000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Tầng 4-5 Saigon Centre 2, 67 Lê Lợi, Quận 1, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Phi Long, 52 Nguyễn Văn Linh, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'vnpay',
    name: 'Công ty Cổ phần Giải pháp Thanh toán Việt Nam (VNPAY)',
    logo: 'https://upload.wikimedia.org/wikipedia/vi/7/77/Vnpay-logo.png',
    description: 'Kỳ lân Fintech hàng đầu Việt Nam cung cấp giải pháp VNPAY-QR kết nối hàng chục ngân hàng và hàng trăm nghìn điểm chấp nhận thanh toán.',
    address: 'Tòa nhà VNPAY, 22 Láng Hạ, Đống Đa, Hà Nội',
    website: 'https://vnpay.vn',
    industry: 'Fintech, Cổng thanh toán quốc gia',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà VNPAY, 22 Láng Hạ, Đống Đa, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Viconship, 06-08 Đoàn Văn Bơ, Quận 4, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Indochina Riverside, 74 Bạch Đằng, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'vinai',
    name: 'Công ty Cổ phần VinAI (Tập đoàn Vingroup)',
    logo: 'https://vinai.io/wp-content/uploads/2021/08/logo-vinai.png',
    description: 'Viện nghiên cứu và ứng dụng trí tuệ nhân tạo top đầu thế giới về Computer Vision, Xe tự hành (Smart Mobility) và Generative AI.',
    address: 'Tòa nhà TechnoPark Tower, Vinhomes Ocean Park, Gia Lâm, Hà Nội',
    website: 'https://vinai.io',
    industry: 'Trí tuệ nhân tạo (AI), Deep Learning, Mobility',
    size: '500-1000',
    branches: [
      { city: 'Hà Nội', address: 'TechnoPark Tower, Vinhomes Ocean Park, Gia Lâm, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Landmark 81, Vinhomes Central Park, Bình Thạnh, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Softech, 38 Yên Bái, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'vinbigdata',
    name: 'Công ty Cổ phần VinBigData (Tập đoàn Vingroup)',
    logo: 'https://vinbigdata.com/wp-content/uploads/2021/08/logo-vinbigdata.png',
    description: 'Đơn vị tiên phong phát triển trợ lý ảo giọng nói tiếng Việt ViVi, nền tảng phân tích dữ liệu lớn y tế và GenAI cho doanh nghiệp.',
    address: 'Tòa nhà Century Tower, Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội',
    website: 'https://vinbigdata.com',
    industry: 'Khoa học dữ liệu, Big Data, Xử lý ngôn ngữ tự nhiên',
    size: '500-1000',
    branches: [
      { city: 'Hà Nội', address: 'Century Tower, Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Vinhomes Golden River, Số 2 Tôn Đức Thắng, Quận 1, TP. Hồ Chí Minh' }
    ]
  },
  {
    slug: 'techcombank',
    name: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Techcombank_logo.png/1200px-Techcombank_logo.png',
    description: 'Ngân hàng thương mại tiên phong chuyển đổi số toàn diện tại Việt Nam, đầu tư mạnh mẽ vào nền tảng Cloud, Big Data và Agile Banking.',
    address: 'Techcombank Tower, 6 Quang Trung, Hoàn Kiếm, Hà Nội',
    website: 'https://techcombank.com',
    industry: 'Ngân hàng số, Digital Banking & Cloud AWS',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'Techcombank Tower, 6 Quang Trung, Hoàn Kiếm, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Techcombank Saigon Tower, 23 Lê Duẩn, Quận 1, TP. Hồ Chí Minh' },
      { city: 'Hải Phòng', address: 'Số 5 Nguyễn Đức Cảnh, Lê Chân, Hải Phòng' },
      { city: 'Đà Nẵng', address: '244-248 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng' }
    ]
  },
  {
    slug: 'mbbank',
    name: 'Ngân hàng TMCP Quân Đội (MB Bank Innovation Lab)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Logo_MB_new.png/1200px-Logo_MB_new.png',
    description: 'Tập đoàn tài chính đa năng với ứng dụng MBBank dẫn đầu lượt tải về tài chính, đổi mới sáng tạo cùng hệ thống Microservices quy mô lớn.',
    address: 'MB Grand Tower, 63 Lê Văn Lương, Cầu Giấy, Hà Nội',
    website: 'https://mbbank.com.vn',
    industry: 'Ngân hàng số, Fintech, Microservices',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'MB Grand Tower, 63 Lê Văn Lương, Cầu Giấy, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'MB Sunny Tower, 259 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh' },
      { city: 'Cần Thơ', address: '77 Võ Văn Tần, Ninh Kiều, Cần Thơ' },
      { city: 'Đà Nẵng', address: '112 Nguyễn Văn Linh, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'cake-vpbank',
    name: 'Ngân hàng số Cake by VPBank',
    logo: 'https://cake.vn/wp-content/uploads/2021/04/Logo-Cake-1.png',
    description: 'Ngân hàng thuần số thế hệ mới phát triển trên nền tảng Cloud-native, mang tới trải nghiệm mở tài khoản và giải pháp tài chính tức thì.',
    address: 'Tòa nhà VPBank, 89 Láng Hạ, Đống Đa, Hà Nội',
    website: 'https://cake.vn',
    industry: 'Ngân hàng số thế hệ mới (Next-Gen Digital Bank)',
    size: '500-1000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà VPBank, 93-95 Hàm Nghi, Quận 1, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà VPBank, 89 Láng Hạ, Đống Đa, Hà Nội' },
      { city: 'Remote', address: 'Làm việc linh hoạt từ xa toàn quốc (Remote)' }
    ]
  },
  {
    slug: 'onemount',
    name: 'One Mount Group (VinShop, VinID, OneHousing)',
    logo: 'https://onemount.com/wp-content/uploads/2021/03/Logo-One-Mount-Group.png',
    description: 'Hệ sinh thái công nghệ kiến tạo nền tảng số lớn nhất Việt Nam cho mạng lưới bán lẻ tạp hóa, khách hàng thân thiết và bất động sản thông minh.',
    address: 'Tòa nhà T26 Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội',
    website: 'https://onemount.com',
    industry: 'Công nghệ, Nền tảng bán lẻ & PropTech',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà T26 Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Friendship Tower, 31 Lê Duẩn, Quận 1, TP. Hồ Chí Minh' }
    ]
  },
  {
    slug: 'cmc',
    name: 'Tập đoàn Công nghệ CMC (CMC Corporation)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/CMC_Corporation_logo.svg/1200px-CMC_Corporation_logo.svg.png',
    description: 'Tập đoàn công nghệ hàng đầu với các trụ cột CMC Telecom, CMC Cloud, CMC Cyber Security và Viện Nghiên cứu Ứng dụng Công nghệ CMC ATI.',
    address: 'Tòa nhà CMC, Phố Duy Tân, Cầu Giấy, Hà Nội',
    website: 'https://cmc.com.vn',
    industry: 'Hạ tầng Cloud, An ninh mạng & Dịch vụ CNTT',
    size: '5000-10000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà CMC, Phố Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'CMC Creative Space, Khu Chế Xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'Tòa nhà ACB, 218 Bạch Đằng, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'tma-solutions',
    name: 'TMA Solutions (TMA Technology Group)',
    logo: 'https://www.tmasolutions.vn/images/logo.png',
    description: 'Tập đoàn công nghệ hàng đầu Việt Nam với hơn 26 năm kinh nghiệm, sở hữu Công viên Sáng tạo TMA Bình Định và các trung tâm phần mềm lớn.',
    address: 'Công viên Phần mềm Quang Trung, Quận 12, TP. Hồ Chí Minh',
    website: 'https://tmasolutions.vn',
    industry: 'Gia công phần mềm, IoT, Viễn thông, AI',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Công viên Phần mềm Quang Trung, Phường Tân Chánh Hiệp, Quận 12, TP. Hồ Chí Minh' },
      { city: 'Quy Nhơn, Bình Định', address: 'Công viên Sáng tạo TMA Bình Định, Thung lũng Quy Hòa, Quy Nhơn' },
      { city: 'Cần Thơ', address: 'Trung tâm CNTT Cần Thơ, Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ' }
    ]
  },
  {
    slug: 'kms-technology',
    name: 'KMS Technology Vietnam',
    logo: 'https://kms-technology.com/wp-content/uploads/2020/06/kms-technology-logo.png',
    description: 'Công ty dịch vụ phần mềm quốc tế được bình chọn là nơi làm việc tốt nhất Việt Nam, chuyên sâu về xây dựng sản phẩm SaaS cho thị trường Mỹ.',
    address: '123 Cộng Hòa, Phường 12, Tân Bình, TP. Hồ Chí Minh',
    website: 'https://kms-technology.com',
    industry: 'Phát triển phần mềm SaaS, Kiểm thử tự động QA',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: '123 Cộng Hòa, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Phi Long, 52 Nguyễn Văn Linh, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'axon-active',
    name: 'Axon Active Vietnam',
    logo: 'https://www.axonactive.com/wp-content/uploads/2021/08/logo.svg',
    description: 'Doanh nghiệp công nghệ 100% vốn Thụy Sĩ, chuyên phát triển phần mềm chuẩn Scrum/Agile chuyên nghiệp cho khách hàng châu Âu và Bắc Mỹ.',
    address: 'Tòa nhà Hải Âu, 39B Trường Sơn, Tân Bình, TP. Hồ Chí Minh',
    website: 'https://axonactive.com',
    industry: 'Phát triển phần mềm chuẩn Agile Thụy Sĩ',
    size: '500-1000',
    branches: [
      { city: 'Đà Nẵng', address: 'Tòa nhà PVcomBank, 2 Đường 30/4, Hải Châu, Đà Nẵng' },
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Hải Âu, 39B Trường Sơn, Tân Bình, TP. Hồ Chí Minh' },
      { city: 'Cần Thơ', address: 'Tòa nhà Toyota, Số 1 Quang Trung, Ninh Kiều, Cần Thơ' }
    ]
  },
  {
    slug: 'nashtech',
    name: 'NashTech Vietnam (Nash Squared)',
    logo: 'https://nashtechglobal.com/wp-content/themes/nashtech/assets/images/logo.svg',
    description: 'Thành viên tập đoàn Nash Squared từ Vương quốc Anh, cung cấp giải pháp chuyển đổi số, Cloud và Data Analytics cho các doanh nghiệp toàn cầu.',
    address: 'ETown 1, 364 Cộng Hòa, Tân Bình, TP. Hồ Chí Minh',
    website: 'https://nashtechglobal.com',
    industry: 'Tư vấn công nghệ cao & Giải pháp phần mềm UK',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà ETown 1, 364 Cộng Hòa, Tân Bình, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà HITC, 239 Xuân Thủy, Cầu Giấy, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà SHB, 89 Nguyễn Văn Linh, Hải Châu, Đà Nẵng' }
    ]
  },
  {
    slug: 'rikkeisoft',
    name: 'Công ty Cổ phần Rikkeisoft',
    logo: 'https://rikkeisoft.com/wp-content/uploads/2022/07/logo-rikkei.svg',
    description: 'Doanh nghiệp CNTT Việt Nam hàng đầu tại thị trường Nhật Bản và Hoa Kỳ, phát triển mạnh mẽ về mảng AI, Blockchain và Web/Mobile.',
    address: 'Tòa nhà Handico, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    website: 'https://rikkeisoft.com',
    industry: 'Gia công xuất khẩu phần mềm Nhật - Mỹ',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà Handico, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà Bưu điện Đà Nẵng, 271 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng' },
      { city: 'Thừa Thiên Huế', address: 'Tòa nhà Viettel Huế, 11 Lý Thường Kiệt, TP. Huế, Thừa Thiên Huế' },
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Waseco, 10 Phổ Quang, Tân Bình, TP. Hồ Chí Minh' }
    ]
  },
  {
    slug: 'misa',
    name: 'Công ty Cổ phần MISA (MISA JSC)',
    logo: 'https://www.misa.vn/wp-content/uploads/2021/04/Logo-MISA.png',
    description: 'Doanh nghiệp phần mềm quản trị doanh nghiệp và kế toán SaaS số 1 tại Việt Nam, phục vụ hơn 250,000 khách hàng doanh nghiệp và hàng triệu cá nhân.',
    address: 'Tòa nhà Technosoft, Phố Duy Tân, Cầu Giấy, Hà Nội',
    website: 'https://misa.vn',
    industry: 'Phần mềm kế toán & Quản trị doanh nghiệp SaaS',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà Technosoft, Phố Duy Tân, Cầu Giấy, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: 'Lô 5, CVPM Quang Trung, Quận 12, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: '109 Hoàng Hoa Thám, Thanh Khê, Đà Nẵng' },
      { city: 'Cần Thơ', address: '41 Cách Mạng Tháng Tám, Ninh Kiều, Cần Thơ' },
      { city: 'Bình Dương', address: 'Tòa nhà Becamex Tower, Thủ Dầu Một, Bình Dương' }
    ]
  },
  {
    slug: 'bosch',
    name: 'Bosch Global Software Technologies Vietnam (BGSV)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/1200px-Bosch-logo.svg.png',
    description: 'Trung tâm nghiên cứu phần mềm chiến lược của Tập đoàn Bosch tại Đông Nam Á, dẫn đầu trong phát triển phần mềm ô tô tự hành, AIoT và Smart Mobility.',
    address: 'E-Town Central, 11 Đoàn Văn Bơ, Quận 4, TP. Hồ Chí Minh',
    website: 'https://bosch.com.vn',
    industry: 'Phần mềm ô tô nhúng (Automotive Embedded), AIoT',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'E-Town Central, 11 Đoàn Văn Bơ, Quận 4, TP. Hồ Chí Minh' },
      { city: 'Đà Nẵng', address: 'FPT Complex, Đường Nam Kỳ Khởi Nghĩa, Ngũ Hành Sơn, Đà Nẵng' },
      { city: 'Hà Nội', address: 'Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội' },
      { city: 'Đồng Nai', address: 'Nhà máy Công nghệ cao Bosch Long Thành, Long Thành, Đồng Nai' }
    ]
  },
  {
    slug: 'samsung-srv',
    name: 'Trung tâm Nghiên cứu & Phát triển Samsung Việt Nam (SRV)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/1200px-Samsung_Logo.svg.png',
    description: 'Trung tâm R&D quy mô lớn nhất Đông Nam Á của tập đoàn Samsung, chuyên nghiên cứu phần mềm di động AI trên dòng điện thoại Galaxy cao cấp.',
    address: 'Khu đô thị Tây Hồ Tây, Phường Xuân Tảo, Bắc Từ Liêm, Hà Nội',
    website: 'https://samsung.com/vn',
    industry: 'R&D Phần mềm di động, AI camera, 5G',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Khu đô thị Tây Hồ Tây, Phường Xuân Tảo, Bắc Từ Liêm, Hà Nội' },
      { city: 'Bắc Ninh', address: 'KCN Yên Phong, Huyện Yên Phong, Bắc Ninh' },
      { city: 'TP. Hồ Chí Minh', address: 'Samsung CE Complex, Khu Công nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh' }
    ]
  },
  {
    slug: 'lg-rnd',
    name: 'LG Electronics R&D Vietnam & LG CNS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/LG_logo_%282015%29.svg/1200px-LG_logo_%282015%29.svg.png',
    description: 'Trung tâm nghiên cứu phần mềm phụ tùng xe ô tô thông minh (Vehicle Component Solutions) và giải pháp chuyển đổi số thông minh của tập đoàn LG.',
    address: 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    website: 'https://lg.com',
    industry: 'Phần mềm xe điện (EV Telematics), Hệ thống ô tô',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Tòa nhà DITP Tower, Khu đô thị Tây Bắc, Liên Chiểu, Đà Nẵng' },
      { city: 'Hải Phòng', address: 'KCN Tràng Duệ, Huyện An Dương, Hải Phòng' }
    ]
  },
  {
    slug: 'gameloft',
    name: 'Gameloft Vietnam',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Gameloft_Logo_2019.svg/1200px-Gameloft_Logo_2019.svg.png',
    description: 'Nhà phát triển game di động hàng đầu thế giới với các tựa game bom tấn như Asphalt, Dungeon Hunter, Despicable Me: Minion Rush.',
    address: 'Tòa nhà Lilama 10, Phố Tố Hữu, Nam Từ Liêm, Hà Nội',
    website: 'https://gameloft.com',
    industry: 'Phát triển Game 3D di động, Unity, C++',
    size: '1000-5000',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà Lilama 10, Tố Hữu, Nam Từ Liêm, Hà Nội' },
      { city: 'Đà Nẵng', address: 'Danang Software Park, 02 Quang Trung, Hải Châu, Đà Nẵng' },
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Pax Sky, 123 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh' }
    ]
  },
  {
    slug: 'tiki',
    name: 'Công ty Cổ phần Ti Ki (Tiki.vn)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Logo_Tiki_2023.png/1200px-Logo_Tiki_2023.png',
    description: 'Nền tảng thương mại điện tử uy tín tại Việt Nam sở hữu chuỗi logistics thông minh TikiNOW giao hàng 2h tốc hành.',
    address: 'Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh',
    website: 'https://tiki.vn',
    industry: 'Thương mại điện tử & Supply Chain Tech',
    size: '1000-5000',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: 'Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: 'Tòa nhà Handico, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội' },
      { city: 'Bình Dương', address: 'Kho vận Fulfillment TikiNOW, Thuận An, Bình Dương' }
    ]
  },
  {
    slug: 'viettel-post',
    name: 'Tổng Công ty Cổ phần Bưu chính Viettel (Viettel Post)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Viettel.svg',
    description: 'Đơn vị logistics chuyển phát nhanh công nghệ hàng đầu Việt Nam, ứng dụng AI và robot tự hành trong quản lý chuỗi cung ứng.',
    address: 'Tòa nhà Viettel Post, ngõ 15 Duy Tân, Cầu Giấy, Hà Nội',
    website: 'https://viettelpost.com.vn',
    industry: 'Logistics thông minh & Bưu chính số',
    size: '10000+',
    branches: [
      { city: 'Hà Nội', address: 'Tòa nhà Viettel Post, Ngõ 15 Duy Tân, Cầu Giấy, Hà Nội' },
      { city: 'TP. Hồ Chí Minh', address: '285 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh' },
      { city: 'Quảng Ninh', address: 'Số 1 Đường Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh' },
      { city: 'Đà Lạt (Lâm Đồng)', address: 'Số 10 Lê Đại Hành, TP. Đà Lạt, Lâm Đồng' },
      { city: 'Cần Thơ', address: '210 Trần Phú, Ninh Kiều, Cần Thơ' }
    ]
  },
  {
    slug: 'fpt-retail',
    name: 'Công ty Cổ phần Bán lẻ Kỹ thuật số FPT (FPT Long Châu)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/FPT_logo_2010.svg/1200px-FPT_logo_2010.svg.png',
    description: 'Thành viên tập đoàn FPT vận hành chuỗi bán lẻ công nghệ FPT Shop và chuỗi nhà thuốc số hóa lớn nhất Việt Nam FPT Long Châu.',
    address: '261-263 Khánh Hội, Phường 2, Quận 4, TP. Hồ Chí Minh',
    website: 'https://fptretail.com.vn',
    industry: 'Chuỗi bán lẻ Dược phẩm số hóa & Bán lẻ Công nghệ',
    size: '10000+',
    branches: [
      { city: 'TP. Hồ Chí Minh', address: '261-263 Khánh Hội, Quận 4, TP. Hồ Chí Minh' },
      { city: 'Hà Nội', address: '216 Thái Hà, Đống Đa, Hà Nội' },
      { city: 'Bình Dương', address: '123 Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương' },
      { city: 'Bà Rịa - Vũng Tàu', address: '322 Trương Công Định, TP. Vũng Tàu, Bà Rịa - Vũng Tàu' },
      { city: 'Đà Lạt (Lâm Đồng)', address: '45 Phan Đình Phùng, TP. Đà Lạt, Lâm Đồng' }
    ]
  }
];

const JOB_TEMPLATES = [
  {
    slug: 'backend-java',
    title: 'Kỹ sư Phần mềm Backend (Java / Spring Boot)',
    description: 'Thiết kế và phát triển các hệ thống lõi High-traffic quy mô lớn. Yêu cầu thành thạo Java Core, Spring Boot, Microservices, Message Queue (Kafka/RabbitMQ) và cơ sở dữ liệu quan hệ/NoSQL (MySQL, Redis). Có kinh nghiệm tối ưu hiệu năng hệ thống chịu tải cao là một lợi thế lớn.',
    salaryMin: 22000000,
    salaryMax: 45000000,
    skills: ['Java', 'Spring Boot', 'Microservices', 'MySQL', 'Kafka', 'Docker'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'frontend-react',
    title: 'Lập trình viên Frontend (ReactJS / Next.js / TypeScript)',
    description: 'Xây dựng giao diện ứng dụng web hiện đại, mượt mà và tối ưu hóa SEO. Yêu cầu thành thạo TypeScript, ReactJS, Next.js, TailwindCSS và kiến thức vững về State Management (Redux/Zustand), Web Performance và Responsive Design.',
    salaryMin: 18000000,
    salaryMax: 35000000,
    skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS', 'JavaScript', 'HTML/CSS'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'fullstack-node',
    title: 'Kỹ sư Fullstack Developer (Node.js & ReactJS)',
    description: 'Tham gia xây dựng sản phẩm toàn diện từ kiến trúc API backend đến giao diện người dùng. Yêu cầu thành thạo Node.js/Express hoặc NestJS, ReactJS, PostgreSQL/MongoDB và quy trình phát triển Agile CI/CD.',
    salaryMin: 20000000,
    salaryMax: 42000000,
    skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'Express', 'Git'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'ai-engineer',
    title: 'Kỹ sư Trí tuệ Nhân tạo & LLM (Generative AI Engineer)',
    description: 'Nghiên cứu, huấn luyện và triển khai các mô hình ngôn ngữ lớn (LLM), RAG, Agentic AI vào các sản phẩm thực tế của công ty. Yêu cầu thành thạo Python, PyTorch, LangChain/LlamaIndex, kỹ năng Fine-tuning và Prompt Engineering.',
    salaryMin: 30000000,
    salaryMax: 70000000,
    skills: ['Python', 'AI', 'Machine Learning', 'LLM', 'PyTorch', 'LangChain'],
    experience: 'Senior',
    employmentType: 'Full-time'
  },
  {
    slug: 'data-engineer',
    title: 'Kỹ sư Dữ liệu Lớn (Big Data / Data Engineer)',
    description: 'Xây dựng và duy trì các đường ống dữ liệu (Data Pipeline/ETL) xử lý hàng terabyte dữ liệu mỗi ngày. Yêu cầu kinh nghiệm với Apache Spark, Kafka, Airflow, Hadoop và Data Warehouse (ClickHouse, Snowflake hoặc BigQuery).',
    salaryMin: 25000000,
    salaryMax: 55000000,
    skills: ['Python', 'Spark', 'Kafka', 'SQL', 'Airflow', 'Big Data'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'data-analyst',
    title: 'Chuyên viên Phân tích Dữ liệu (Data Analyst / BI Specialist)',
    description: 'Khai thác, trực quan hóa dữ liệu và xây dựng báo cáo phân tích hỗ trợ ban lãnh đạo ra quyết định kinh doanh. Yêu cầu thành thạo SQL nâng cao, Power BI / Tableau, Excel nâng cao và tư duy logic kinh doanh sắc bén.',
    salaryMin: 16000000,
    salaryMax: 30000000,
    skills: ['SQL', 'Power BI', 'Data Analysis', 'Python', 'Excel', 'Tableau'],
    experience: 'Junior',
    employmentType: 'Full-time'
  },
  {
    slug: 'devops-cloud',
    title: 'Kỹ sư DevOps & Điện toán Đám mây (Cloud AWS / Kubernetes)',
    description: 'Quản lý, vận hành và tự động hóa toàn bộ hạ tầng đám mây trên AWS/GCP. Triển khai kiến trúc Kubernetes, quản lý CI/CD pipeline, giám sát bằng Prometheus/Grafana và áp dụng chuẩn bảo mật DevSecOps.',
    salaryMin: 28000000,
    salaryMax: 60000000,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux'],
    experience: 'Senior',
    employmentType: 'Full-time'
  },
  {
    slug: 'qa-automation',
    title: 'Chuyên viên Kiểm thử Tự động (Automation QA / QC Engineer)',
    description: 'Lập kế hoạch kiểm thử, thiết kế test case và phát triển framework kiểm thử tự động cho hệ thống API và Web/Mobile. Yêu cầu kinh nghiệm với Selenium, Cypress, Playwright hoặc Appium, thành thạo viết script Python hoặc Java/TypeScript.',
    salaryMin: 17000000,
    salaryMax: 32000000,
    skills: ['Selenium', 'Cypress', 'Playwright', 'Automation Test', 'QA/QC', 'API Testing'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'mobile-flutter',
    title: 'Lập trình viên Di động (Mobile App Flutter / React Native)',
    description: 'Phát triển ứng dụng di động đa nền tảng iOS & Android với hàng triệu lượt tải. Yêu cầu nắm vững Flutter/Dart hoặc React Native, kiến trúc BLoC/Redux, tối ưu hóa memory leak và tích hợp dịch vụ bên thứ ba.',
    salaryMin: 18000000,
    salaryMax: 38000000,
    skills: ['Flutter', 'Dart', 'React Native', 'Mobile App', 'iOS', 'Android'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'cyber-security',
    title: 'Chuyên gia An toàn Thông tin & Bảo mật (Cyber Security Specialist)',
    description: 'Thực hiện kiểm thử xâm nhập (Penetration Testing), dò quét lỗ hổng ứng dụng web/mạng theo chuẩn OWASP Top 10, xây dựng hệ thống giám sát SIEM/SOC và ứng phó các sự cố an ninh bảo mật.',
    salaryMin: 28000000,
    salaryMax: 65000000,
    skills: ['Cyber Security', 'Pentest', 'OWASP', 'Linux', 'Network Security', 'SOC'],
    experience: 'Senior',
    employmentType: 'Full-time'
  },
  {
    slug: 'business-analyst',
    title: 'Chuyên viên Phân tích Nghiệp vụ (IT Business Analyst - BA)',
    description: 'Khảo sát và thu thập yêu cầu từ người dùng, đối tác kinh doanh; chuyển hóa thành tài liệu đặc tả BRD, SRS, User Stories; phối hợp chặt chẽ cùng đội ngũ kỹ thuật và thiết kế UI/UX để hiện thực hóa tính năng.',
    salaryMin: 18000000,
    salaryMax: 35000000,
    skills: ['Business Analysis', 'UML', 'BPMN', 'Jira', 'SQL', 'Giao tiếp'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'uiux-designer',
    title: 'Thiết kế Giao diện Người dùng (Product UI/UX Designer)',
    description: 'Nghiên cứu hành vi người dùng (User Research), thiết kế wireframe, prototype tương tác cao và xây dựng hệ thống Design System chuẩn mực trên Figma cho các sản phẩm web và ứng dụng di động.',
    salaryMin: 16000000,
    salaryMax: 32000000,
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Design System'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'embedded-automotive',
    title: 'Kỹ sư Hệ thống Nhúng & Ô tô (Embedded Automotive C/C++)',
    description: 'Phát triển phần mềm nhúng và điều khiển vi điều khiển (ECU) cho các dòng xe hơi thông minh thế hệ mới. Yêu cầu thành thạo C/C++, RTOS, chuẩn giao tiếp CAN/LIN/Ethernet và quy trình AUTOSAR.',
    salaryMin: 22000000,
    salaryMax: 50000000,
    skills: ['C', 'C++', 'Embedded Systems', 'RTOS', 'AUTOSAR', 'CAN Bus'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'game-developer',
    title: 'Lập trình viên Game 3D (Game Developer - Unity / C++)',
    description: 'Tham gia sáng tạo các tựa game 3D đỉnh cao phát hành toàn cầu. Lập trình logic gameplay, tối ưu hóa đồ họa Shader, hiệu ứng hạt và đồng bộ mạng trong game nhiều người chơi (Multiplayer).',
    salaryMin: 20000000,
    salaryMax: 45000000,
    skills: ['Unity', 'C#', 'C++', '3D Game', 'Shaders', 'Game Physics'],
    experience: 'Middle',
    employmentType: 'Full-time'
  },
  {
    slug: 'solution-architect',
    title: 'Kiến trúc sư Giải pháp Doanh nghiệp (Enterprise Solution Architect)',
    description: 'Định hình kiến trúc tổng thể cho các giải pháp phần mềm chuyển đổi số quy mô lớn. Tư vấn công nghệ đám mây, bảo mật dữ liệu, tích hợp hệ thống đa nền tảng và dẫn dắt kỹ thuật cho các kỹ sư chủ chốt.',
    salaryMin: 40000000,
    salaryMax: 85000000,
    skills: ['Architecture', 'Cloud', 'Microservices', 'System Design', 'Security', 'Enterprise'],
    experience: 'Lead',
    employmentType: 'Full-time'
  },
  {
    slug: 'computer-vision',
    title: 'Kỹ sư AI Thị giác Máy tính (Computer Vision & Deep Learning)',
    description: 'Nghiên cứu thuật toán phát hiện vật thể, nhận diện khuôn mặt, phân tích hành vi và xử lý hình ảnh thời gian thực ứng dụng trên camera thông minh và phương tiện tự hành. Thành thạo OpenCV, PyTorch, TensorRT.',
    salaryMin: 28000000,
    salaryMax: 60000000,
    skills: ['Computer Vision', 'OpenCV', 'PyTorch', 'Deep Learning', 'TensorRT', 'Python'],
    experience: 'Senior',
    employmentType: 'Full-time'
  },
  {
    slug: 'intern-web',
    title: 'Thực tập sinh Lập trình Web (Web Developer Intern - Trợ cấp tốt)',
    description: 'Chương trình ươm mầm tài năng trẻ dành cho sinh viên năm cuối hoặc mới tốt nghiệp ngành CNTT. Được kỹ sư cấp cao hướng dẫn trực tiếp (1-on-1 mentoring), tham gia dự án thực tế, có cơ hội trở thành nhân viên chính thức.',
    salaryMin: 5000000,
    salaryMax: 9000000,
    skills: ['JavaScript', 'HTML/CSS', 'React', 'Node.js', 'Git', 'Tư duy logic'],
    experience: 'Intern',
    employmentType: 'Internship'
  },
  {
    slug: 'intern-ai',
    title: 'Thực tập sinh AI & Khoa học Dữ liệu (AI / Data Science Intern)',
    description: 'Dành cho các bạn sinh viên đam mê Trí tuệ Nhân tạo và Dữ liệu lớn. Được đào tạo chuyên sâu về xử lý dữ liệu thực tế, huấn luyện mô hình Machine Learning / Deep Learning và tiếp cận hạ tầng tính toán GPU hiện đại.',
    salaryMin: 6000000,
    salaryMax: 10000000,
    skills: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy', 'Toán học/Thống kê'],
    experience: 'Intern',
    employmentType: 'Internship'
  },
  {
    slug: 'helpdesk-sysadmin',
    title: 'Chuyên viên Hỗ trợ Hệ thống & Hạ tầng IT (IT Helpdesk / System Admin)',
    description: 'Vận hành và quản lý mạng nội bộ LAN/WAN, máy chủ Windows Server/Linux, thiết bị tường lửa Firewall và hỗ trợ kỹ thuật phần cứng, phần mềm cho toàn thể nhân sự trong công ty.',
    salaryMin: 12000000,
    salaryMax: 20000000,
    skills: ['Windows Server', 'Linux', 'Network LAN/WAN', 'Firewall', 'Hardware', 'IT Support'],
    experience: 'Junior',
    employmentType: 'Full-time'
  },
  {
    slug: 'product-manager',
    title: 'Quản lý Sản phẩm Kỹ thuật (Technical Product Manager - TPM)',
    description: 'Chịu trách nhiệm định hình chiến lược sản phẩm số, xây dựng Product Roadmap, làm việc cùng ban giám đốc và dẫn dắt đội ngũ kỹ thuật Agile để ra mắt sản phẩm đạt các chỉ số tăng trưởng ấn tượng.',
    salaryMin: 35000000,
    salaryMax: 70000000,
    skills: ['Product Management', 'Agile/Scrum', 'Data-driven', 'Roadmap', 'UX/UI', 'Leadership'],
    experience: 'Senior',
    employmentType: 'Full-time'
  }
];

const importMockVnJobs = async () => {
  try {
    const dbCompanies = [];
    const dbJobs = [];

    // Lập danh sách công ty với ID cố định
    COMPANIES.forEach((compData) => {
      const companyId = toUUID(`mock-comp:${compData.slug}`);
      const company = {
        id: companyId,
        name: compData.name,
        logo: compData.logo,
        description: compData.description,
        address: compData.address,
        website: compData.website,
        email: `recruitment@${compData.slug.replace(/[^a-z0-9]/g, '')}.vn`,
        industry: compData.industry,
        size: compData.size,
        createdAt: new Date().toISOString()
      };
      dbCompanies.push(company);

      // Phân bổ việc làm tới từng chi nhánh/thành phố của công ty
      compData.branches.forEach((branch, branchIndex) => {
        // Chọn từ 1 đến 2 vị trí công việc phù hợp cho chi nhánh này
        const assignedTemplateIndices = [
          (compData.slug.length + branchIndex * 3) % JOB_TEMPLATES.length,
          (compData.slug.length + branchIndex * 5 + 7) % JOB_TEMPLATES.length
        ];
        const uniqueIndices = [...new Set(assignedTemplateIndices)];

        uniqueIndices.forEach((templateIdx) => {
          const template = JOB_TEMPLATES[templateIdx];
          const jobId = toUUID(`mock-job:${compData.slug}:${branch.city}:${template.slug}`);
          
          const now = new Date();
          const deadline = new Date(now);
          deadline.setDate(now.getDate() + 45); // Hạn nộp 45 ngày tới

          dbJobs.push({
            id: jobId,
            companyId: company.id,
            title: `${template.title}`,
            description: `${template.description}\n\nĐịa điểm làm việc cụ thể: ${branch.address}`,
            location: branch.city,
            salaryMin: template.salaryMin,
            salaryMax: template.salaryMax,
            salaryCurrency: 'VND',
            salaryPeriod: 'Tháng',
            experience: template.experience,
            employmentType: template.employmentType,
            skills: template.skills,
            education: template.experience === 'Intern' ? 'Sinh viên các trường ĐH' : 'Tốt nghiệp Đại học/Cao đẳng chuyên ngành CNTT hoặc liên quan',
            benefits: [
              'Lương tháng 13 + Thưởng hiệu quả kinh doanh & dự án hàng năm',
              'Gói bảo hiểm sức khỏe cao cấp (PVI / Bảo Việt) cho nhân viên & người thân',
              'Xét tăng lương định kỳ 2 lần/năm hoặc khi có đóng góp xuất sắc',
              'Hỗ trợ thiết bị làm việc hiện đại (Macbook Pro / Dell XPS, màn hình 4K)',
              'Trợ cấp ăn trưa, trà, cà phê, gửi xe miễn phí',
              'Ngân sách tài trợ thi các chứng chỉ quốc tế (AWS, GCP, PMP, Scrum) 100%'
            ],
            deadline: deadline.toISOString().slice(0, 19).replace('T', ' '),
            status: 'active',
            source: 'MockVN',
            sourceUrl: `https://aicarrer.vn/jobs/${jobId}`,
            externalId: `mock-vn-${compData.slug}-${template.slug}-${branchIndex}`,
            lastSyncedAt: now.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
        });
      });
    });

    // Dọn dẹp các tin mock cũ chưa từng được lưu hoặc ứng tuyển để DB không bị nhân bản
    try {
      await pool.query(`
        DELETE FROM jobs 
        WHERE source = 'MockVN' 
          AND id NOT IN (SELECT job_id FROM saved_jobs UNION SELECT job_id FROM applications)
      `);
    } catch (cleanupErr) {
      console.warn('Cleanup old unreferenced MockVN jobs warning:', cleanupErr.message);
    }

    // Nhập dữ liệu mới vào DB
    await persistJobImport({ companies: dbCompanies, jobs: dbJobs });

    const summary = {
      source: 'MockVN',
      importedAt: new Date().toISOString(),
      companiesCount: dbCompanies.length,
      received: dbJobs.length,
      inserted: dbJobs.length,
      updated: 0,
      skipped: 0
    };

    await finishJobSync('MockVN', { success: true, summary });
    return summary;
  } catch (error) {
    await finishJobSync('MockVN', { success: false, error: error.code || error.message || 'UNKNOWN' });
    throw error;
  }
};

module.exports = { importMockVnJobs };
