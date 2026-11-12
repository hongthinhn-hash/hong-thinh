const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function createInitialData() {
  const now = new Date().toISOString();
  return {
    profile: {
      fullName: 'NGUYỄN THỊ HỒNG THỊNH',
      siteName: 'SỐNG KHỎE MỖI NGÀY CÙNG HỒNG THỊNH',
      phone: '0344126866',
      zalo: '0344126866',
      email: 'hongthinh6866@gmail.com',
      avatar: '/images/ao-dai-thinh.jpg',
      secondaryPhoto: '/images/anh-the-thinh.jpg',
      slogan: 'Sức khỏe là tài sản quý giá nhất.',
      bio: 'Xin chào quý cô bác, anh chị và các bạn! Tôi là Nguyễn Thị Hồng Thịnh. Tôi xây dựng ngôi nhà nhỏ này với mong muốn lan tỏa những kiến thức chăm sóc sức khỏe chủ động, thói quen ăn uống lành mạnh, vận động nhẹ nhàng và tinh thần lạc quan mỗi ngày — đặc biệt dành cho lứa tuổi trung niên và cao tuổi.'
    },
    articles: [
      {
        id: 'art-dinh-duong-1',
        title: 'Nguyên tắc ăn uống cân bằng cho tuổi trung niên: Giảm mặn, tăng rau xanh',
        category: 'dinh-duong',
        categoryLabel: 'Dinh dưỡng',
        summary: 'Hướng dẫn cách điều chỉnh khẩu phần ăn hằng ngày nhẹ nhàng, giảm muối và đường tinh luyện, ưu tiên thực phẩm tươi giúp tim mạch và tiêu hóa khỏe mạnh hơn.',
        content: `Ở tuổi trung niên và cao tuổi, tốc độ trao đổi chất chậm lại nên cơ thể cần ít năng lượng hơn nhưng lại cần nhiều vi chất hơn.\n\n1. Ăn nhạt hơn một chút mỗi ngày: Hạn chế nước chấm mặn, đồ muối chua và thực phẩm chế biến sẵn. Có thể dùng gừng, tỏi, hành, rau thơm để món ăn đậm đà tự nhiên.\n\n2. Đĩa ăn nhiều màu sắc: Nên có ít nhất nửa đĩa là rau xanh và củ quả luộc hoặc hấp. Ưu tiên cá, đậu phụ, thịt nạc gia cầm thay cho thịt mỡ.\n\n3. Chia nhỏ bữa ăn và nhai kỹ: Nhai chậm giúp dạ dày nhẹ nhàng hơn, đồng thời giúp cơ thể nhận biết cảm giác no đúng lúc.\n\nLưu ý: Thông tin mang tính tham khảo phổ thông. Nếu bạn đang có bệnh lý nền cần kiêng khem riêng, hãy trao đổi trực tiếp với bác sĩ điều trị.`,
        coverImage: '',
        mediaType: 'article',
        videoUrl: '',
        keywords: 'dinh dưỡng trung niên, ăn nhạt, rau xanh, sống khỏe',
        featured: true,
        status: 'published',
        isSample: true,
        views: 128,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-van-dong-1',
        title: '5 động tác giãn cơ nhẹ nhàng mỗi sáng giúp khớp dẻo dai',
        category: 'van-dong',
        categoryLabel: 'Vận động',
        summary: 'Chỉ mất 10 phút buổi sáng với các động tác xoay cổ tay, vươn vai, nghiêng lườn chậm rãi giúp lưu thông khí huyết và giảm cứng khớp.',
        content: `Vận động đều đặn không cần quá nặng nhọc. Quan trọng nhất là sự kiên trì và lắng nghe cơ thể.\n\n1. Khởi động trên giường: Co duỗi nhẹ hai bàn chân và bàn tay 10 lần trước khi ngồi dậy.\n\n2. Xoay vai nhẹ nhàng: Ngồi thẳng lưng, xoay vai từ trước ra sau 8 vòng, thở đều.\n\n3. Vươn tay hít thở sâu: Hai tay đan vào nhau vươn lên cao khi hít vào, hạ xuống chậm rãi khi thở ra.\n\n4. Đi bộ chậm 20–30 phút: Nên chọn giày êm, đi trên mặt phẳng, tránh đi khi trời quá nắng hoặc quá lạnh.\n\nNếu cảm thấy chóng mặt hoặc đau nhói khớp, hãy dừng lại nghỉ ngơi ngay.`,
        coverImage: '',
        mediaType: 'video',
        videoUrl: '',
        keywords: 'vận động nhẹ nhàng, giãn cơ buổi sáng, người cao tuổi',
        featured: true,
        status: 'published',
        isSample: true,
        views: 96,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-giac-ngu-1',
        title: 'Bí quyết ngủ ngon tự nhiên và thư thái ở tuổi ngoài 50',
        category: 'giac-ngu',
        categoryLabel: 'Giấc ngủ',
        summary: 'Thiết lập giờ đi ngủ cố định, hạn chế trà đặc buổi chiều và ngâm chân nước ấm giúp cơ thể dễ dàng đi vào giấc ngủ sâu.',
        content: `Giấc ngủ chất lượng giúp cơ thể phục hồi năng lượng và ổn định tinh thần.\n\n- Giữ giờ ngủ cố định: Nên đi ngủ trước 22h30 và thức dậy vào cùng một khung giờ mỗi sáng.\n- Không gian phòng ngủ: Yên tĩnh, thoáng khí, ánh sáng dịu nhẹ, tránh xem điện thoại trước khi ngủ 30 phút.\n- Thư giãn buổi tối: Uống một ngụm nước ấm nhỏ, ngâm chân nước ấm khoảng 10–15 phút hoặc nghe nhạc nhẹ.\n- Hạn chế cà phê, trà đặc sau 14h chiều.\n\nNếu tình trạng mất ngủ kéo dài ảnh hưởng nhiều đến sinh hoạt, bạn nên đi khám để được bác sĩ tư vấn phù hợp.`,
        coverImage: '',
        mediaType: 'article',
        videoUrl: '',
        keywords: 'giấc ngủ ngon, mất ngủ tuổi trung niên, thư giãn buổi tối',
        featured: true,
        status: 'published',
        isSample: true,
        views: 112,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-tinh-than-1',
        title: 'Giữ tâm an và niềm vui mỗi ngày: Thực hành thở sâu 5 phút',
        category: 'tinh-than',
        categoryLabel: 'Sức khỏe tinh thần',
        summary: 'Tinh thần lạc quan là liều thuốc quý. Bài tập thở bụng chậm 4-4-6 giúp giảm căng thẳng và ổn định nhịp thở.',
        content: `Sức khỏe thể chất và tinh thần luôn gắn bó mật thiết với nhau.\n\nBài tập thở bụng đơn giản:\n1. Ngồi thoải mái trên ghế có tựa lưng, thả lỏng hai vai.\n2. Hít vào nhẹ nhàng bằng mũi trong 4 giây, cảm nhận bụng phình lên.\n3. Giữ nhẹ hơi thở 2–4 giây.\n4. Thở ra chậm rãi qua miệng trong 6 giây.\n\nLặp lại 6–10 lần mỗi ngày, kết hợp trò chuyện cùng người thân, chăm sóc cây xanh hoặc đọc sách để tâm trí luôn tươi vui.`,
        coverImage: '',
        mediaType: 'article',
        videoUrl: '',
        keywords: 'sức khỏe tinh thần, thở sâu, sống lạc quan',
        featured: false,
        status: 'published',
        isSample: true,
        views: 74,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-phong-benh-1',
        title: 'Chủ động phòng bệnh: Khám sức khỏe định kỳ và uống đủ nước',
        category: 'phong-benh',
        categoryLabel: 'Phòng bệnh',
        summary: 'Khám sức khỏe định kỳ 6–12 tháng một lần giúp phát hiện sớm các thay đổi của cơ thể và chăm sóc kịp thời.',
        content: `Phòng bệnh hơn chữa bệnh luôn là nguyên tắc vàng để sống khỏe bền lâu.\n\n- Khám sức khỏe tổng quát định kỳ theo hướng dẫn của cơ sở y tế.\n- Uống đủ nước chia đều trong ngày, không đợi khát mới uống.\n- Giữ ấm cơ thể khi thời tiết chuyển mùa, rửa tay sạch trước khi ăn.\n- Không tự ý dùng thuốc theo lời truyền miệng; luôn hỏi ý kiến bác sĩ hoặc dược sĩ trước khi sử dụng thuốc hay thực phẩm bổ sung.`,
        coverImage: '',
        mediaType: 'article',
        videoUrl: '',
        keywords: 'phòng bệnh, khám sức khỏe định kỳ, uống đủ nước',
        featured: false,
        status: 'published',
        isSample: true,
        views: 85,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-trung-nien-1',
        title: 'Gợi ý thực đơn 1 ngày thanh đạm, đủ chất cho tuổi trung niên',
        category: 'trung-nien',
        categoryLabel: 'Góc sống khỏe tuổi trung niên',
        summary: 'Thực đơn mẫu dễ nấu tại nhà với bữa sáng ấm bụng, bữa trưa cân đối đạm – rau và bữa tối nhẹ nhàng dễ tiêu.',
        content: `Một thực đơn đơn giản, dễ thực hiện bằng nguyên liệu quen thuộc:\n\n- Bữa sáng (7h00): 1 bát cháo yến mạch hoặc bún/phở ít béo kèm rau thơm, thêm 1 quả trứng luộc hoặc ly sữa hạt ấm ít đường.\n- Bữa phụ sáng (9h30): 1 quả chuối chín hoặc vài múi bưởi.\n- Bữa trưa (11h30): 1 chén cơm gạo lứt/gạo trắng vừa phải, cá hấp gừng, canh rau ngót nấu thịt bằm, đĩa rau củ luộc.\n- Bữa tối (18h00): Ăn nhẹ hơn bữa trưa, ưu tiên canh rau, đậu phụ sốt cà chua nhạt, tránh ăn quá no sau 19h30.\n\nĐây là thực đơn tham khảo phổ thông, bạn có thể linh hoạt thay đổi theo khẩu vị gia đình.`,
        coverImage: '',
        mediaType: 'blog',
        videoUrl: '',
        keywords: 'thực đơn trung niên, món ăn thanh đạm, sống khỏe',
        featured: true,
        status: 'published',
        isSample: true,
        views: 143,
        createdAt: now,
        updatedAt: now
      }
    ],
    messages: [],
    subscribers: [],
    stats: {
      aiVisitorCount: 0,
      aiAdminCount: 0
    }
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  return null;
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

const CATEGORY_MAP = {
  'dinh-duong': 'Dinh dưỡng',
  'van-dong': 'Vận động',
  'giac-ngu': 'Giấc ngủ',
  'tinh-than': 'Sức khỏe tinh thần',
  'phong-benh': 'Phòng bệnh',
  'trung-nien': 'Góc sống khỏe tuổi trung niên',
  'blog': 'Blog chia sẻ'
};

module.exports = {
  readDb,
  writeDb,
  ensureDb,
  CATEGORY_MAP
};
