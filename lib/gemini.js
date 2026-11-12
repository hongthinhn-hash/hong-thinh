const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const EMERGENCY_PATTERNS = [
  /đau\s*(thắt\s*)?ngực/i,
  /tức\s*ngực/i,
  /khó\s*thở\s*(nặng|dữ\s*dội|cấp)?/i,
  /ngừng\s*thở/i,
  /liệt\s*(nửa\s*người|tay|chân)/i,
  /méo\s*miệng/i,
  /nói\s*(ngọng|khó|lắp\s*bắp)/i,
  /đột\s*quỵ/i,
  /tai\s*biến/i,
  /ngất\s*xỉu/i,
  /bất\s*tỉnh/i,
  /co\s*giật/i,
  /chảy\s*máu\s*(nhiều|ồ\s*ạt|không\s*cầm)/i,
  /nôn\s*ra\s*máu/i,
  /tự\s*(tử|hại|làm\s*đau)/i,
  /uống\s*nhầm\s*thuốc/i,
  /ngộ\s*độc/i
];

function detectEmergency(text) {
  if (!text || typeof text !== 'string') return false;
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

function getEmergencyResponse() {
  return (
    '⚠️ CẢNH BÁO KHẨN CẤP:\n\n' +
    'Những dấu hiệu bạn vừa mô tả có thể là tình huống y tế khẩn cấp cần được xử lý ngay lập tức.\n\n' +
    '👉 Vui lòng GỌI NGAY CẤP CỨU 115 (tại Việt Nam) hoặc nhờ người thân đưa đến cơ sở y tế / bệnh viện gần nhất ngay lập tức.\n\n' +
    'Trợ lý AI không thể chẩn đoán hay xử lý cấp cứu y khoa. Xin hãy ưu tiên liên hệ nhân viên y tế ngay lúc này!'
  );
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

async function callGemini({ systemInstruction, contents, temperature = 0.7 }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('Chưa cấu hình khóa API Gemini (GEMINI_API_KEY) trên máy chủ.');
    err.code = 'API_NOT_CONFIGURED';
    throw err;
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 2048
        }
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMsg = data?.error?.message || `Lỗi từ Gemini API (HTTP ${response.status})`;
      const err = new Error(apiMsg);
      err.code = response.status === 401 || response.status === 403 ? 'INVALID_API_KEY' : 'GEMINI_ERROR';
      throw err;
    }

    const candidateText = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();

    if (!candidateText) {
      const err = new Error('AI không trả về nội dung phù hợp. Vui lòng thử diễn đạt lại câu hỏi.');
      err.code = 'EMPTY_RESPONSE';
      throw err;
    }

    return candidateText;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Kết nối tới AI quá thời gian chờ. Vui lòng thử lại.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function buildVisitorSystemPrompt({ profile, articles }) {
  const published = (articles || [])
    .filter((a) => a.status === 'published')
    .slice(0, 15)
    .map((a) => `- [${a.categoryLabel}] "${a.title}": ${a.summary}`)
    .join('\n');

  return `Bạn là Trợ lý AI Sức Khỏe thân thiện của website "${profile.siteName}" do cô ${profile.fullName} xây dựng (Slogan: "${profile.slogan}").

NHIỆM VỤ CỦA BẠN:
1. Trò chuyện bằng tiếng Việt tự nhiên, ấm áp, lễ phép, câu chữ rõ ràng, dễ hiểu với người trung niên và cao tuổi.
2. Giải thích kiến thức phổ thông về dinh dưỡng, vận động nhẹ nhàng, giấc ngủ, tinh thần lạc quan và phòng bệnh chủ động.
3. Gợi ý thói quen sống lành mạnh phù hợp với nhu cầu người hỏi.
4. Khi phù hợp, gợi ý người dùng đọc các bài viết hiện có trên website dưới đây:
${published || '- Hiện chưa có bài viết nào.'}
5. Khi người dùng muốn trao đổi trực tiếp hoặc cần kết nối với chủ website, hãy cung cấp thông tin liên hệ chính thức:
   - Chủ website: ${profile.fullName}
   - Điện thoại / Zalo: ${profile.phone}
   - Email: ${profile.email}

QUY TẮC AN TOÀN Y KHOA BẮT BUỘC:
- KHÔNG BAO GIỜ chẩn đoán bệnh, KHÔNG kê đơn thuốc, KHÔNG tự ý khuyên tăng/giảm/ngưng thuốc đang dùng, KHÔNG thay thế bác sĩ.
- KHÔNG yêu cầu người dùng cung cấp bệnh án, số CMND/CCCD hay dữ liệu y tế nhạy cảm.
- KHÔNG bịa đặt chứng nhận y tế, đánh giá khách hàng hay tuyên bố chữa khỏi bệnh.
- Nếu phát hiện bất kỳ dấu hiệu cấp cứu nào (đau ngực, khó thở nặng, yếu liệt nửa người, méo miệng, nói khó, ngất xỉu, chảy máu nhiều, co giật, ý định tự hại...), hãy NGAY LẬP TỨC khuyến nghị gọi Cấp cứu 115 tại Việt Nam hoặc đến cơ sở y tế gần nhất.
- Luôn giữ câu trả lời gọn gàng, chia ý rõ ràng dễ đọc trên màn hình điện thoại.`;
}

function buildAdminPrompt({ task, input, profile, messages, articles }) {
  const baseSystem = `Bạn là Trợ lý AI Biên Tập & Quản Trị Nội Dung riêng cho cô ${profile.fullName}, chủ website "${profile.siteName}".
Phong cách nội dung: Thân thiện, sang trọng, dễ hiểu cho người trung niên và cao tuổi; trung thực, chuẩn mực y khoa phổ thông; không tuyên bố chữa bệnh vô căn cứ; luôn nhắc kiểm chứng thông tin y khoa từ bác sĩ/nguồn chính thống khi cần.`;

  const existingTitles = (articles || [])
    .slice(0, 20)
    .map((a) => `- ${a.title} (${a.categoryLabel})`)
    .join('\n');

  const recentMessages = (messages || [])
    .slice(0, 25)
    .map((m, idx) => `${idx + 1}. [${m.status === 'resolved' ? 'Đã xử lý' : 'Mới'}] ${m.name} (${m.createdAt?.slice(0, 10) || ''}): "${m.message}"`)
    .join('\n');

  switch (task) {
    case 'write_article':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy viết một bài chia sẻ kiến thức sức khỏe hoàn chỉnh bằng tiếng Việt về chủ đề: "${input.topic || 'Chăm sóc sức khỏe tuổi trung niên'}".
Chuyên mục: ${input.categoryLabel || 'Kiến thức sức khỏe'}.
Đối tượng đọc: ${input.audience || 'Người trung niên và cao tuổi'}.
Yêu cầu định dạng trả về RÕ RÀNG theo đúng các mục sau để chủ website dễ duyệt và đăng:
TIÊU ĐỀ: ...
TÓM TẮT: ... (2-3 câu ngắn gọn)
TỪ KHÓA SEO: ... (4-6 từ khóa cách nhau bởi dấu phẩy)
NỘI DUNG:
(Viết rõ ràng, chia đoạn ngắn, có gạch đầu dòng dễ đọc, kèm lưu ý tham khảo y khoa ở cuối bài.)`
      };

    case 'weekly_topics':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy đề xuất 10 chủ đề bài viết mới cho tuần này trên website "${profile.siteName}".
Các bài đã có trên website (tránh trùng lặp):
${existingTitles || 'Chưa có bài viết.'}
Ghi chú thêm của chủ website: ${input.notes || 'Ưu tiên dinh dưỡng, vận động nhẹ, giấc ngủ và tinh thần tuổi trung niên.'}
Với mỗi chủ đề, ghi rõ: Số thứ tự, Tiêu đề gợi ý, Chuyên mục, và Lý do thu hút người đọc.`
      };

    case 'social_posts':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy viết nội dung truyền thông từ chủ đề/bài viết: "${input.topic || 'Sống khỏe mỗi ngày cùng Hồng Thịnh'}".
Ghi chú thêm: ${input.notes || ''}
Hãy viết riêng 3 phiên bản rõ ràng:
1. BÀI ĐĂNG FACEBOOK (ấm áp, gần gũi, có lời kêu gọi tương tác nhẹ nhàng, gắn thông tin liên hệ ${profile.phone})
2. BÀI ĐĂNG ZALO (ngắn gọn, súc tích, dễ đọc trên điện thoại)
3. KỊCH BẢN & MÔ TẢ YOUTUBE NGẮN (tiêu đề video, lời mở đầu 15 giây, 3 ý chính, lời kết & mô tả video).`
      };

    case 'seo_meta':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy tạo bộ tối ưu tìm kiếm (SEO) cho nội dung sau:
Tiêu đề/Chủ đề gốc: "${input.topic || ''}"
Nội dung tóm tắt: "${input.notes || ''}"
Trả về:
- 3 gợi ý Tiêu đề hấp dẫn, dễ hiểu
- 2 gợi ý Mô tả ngắn (Meta Description khoảng 140-160 ký tự)
- Danh sách 8-10 Từ khóa tìm kiếm tiếng Việt phù hợp.`
      };

    case 'reply_visitor':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy soạn giúp cô ${profile.fullName} một câu trả lời nháp lịch sự, ấm áp, an toàn y khoa (không chẩn đoán/kê đơn) cho tin nhắn của khách truy cập dưới đây:
Tên khách: ${input.visitorName || 'Quý khách'}
Nội dung khách hỏi: "${input.topic || input.notes || ''}"
Hướng xử lý mong muốn của chủ website: ${input.guidance || 'Trả lời thân thiện, chia sẻ thông tin phổ thông và mời khách trao đổi thêm qua Zalo nếu cần.'}`
      };

    case 'summarize_messages':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Dưới đây là danh sách tin nhắn khách truy cập đã gửi qua biểu mẫu liên hệ:
${recentMessages || 'Hiện chưa có tin nhắn nào từ khách truy cập.'}

Hãy thực hiện:
1. Tóm tắt ngắn gọn các vấn đề khách đang quan tâm nhất.
2. Phân loại nhu cầu liên hệ theo nhóm (ví dụ: Hỏi kiến thức dinh dưỡng, Hỏi vận động/giấc ngủ, Muốn kết nối trực tiếp, Khác).
3. Gợi ý 2-3 việc chủ website nên ưu tiên phản hồi trước.
Lưu ý: Chỉ tổng hợp từ danh sách trên, không tự bịa thêm tin nhắn.`
      };

    case 'content_plan':
      return {
        systemInstruction: baseSystem,
        userPrompt: `Hãy lập kế hoạch nội dung cho website "${profile.siteName}" của cô ${profile.fullName}.
Phạm vi kế hoạch: ${input.range === '30' ? '30 ngày (4 tuần)' : '7 ngày (1 tuần)'}.
Trọng tâm mong muốn: ${input.notes || 'Cân bằng giữa Dinh dưỡng, Vận động, Giấc ngủ, Tinh thần và Góc sống khỏe tuổi trung niên.'}
Trình bày dạng lịch rõ ràng theo từng ngày/tuần gồm: Ngày/Tuần, Chủ đề, Định dạng (Bài viết / Video / Tin nhắn Zalo), Mục tiêu mang lại cho người đọc.`
      };

    default:
      return {
        systemInstruction: baseSystem,
        userPrompt: input.topic || input.notes || 'Hãy gợi ý 5 ý tưởng cải thiện nội dung chăm sóc sức khỏe cho website.'
      };
  }
}

module.exports = {
  detectEmergency,
  getEmergencyResponse,
  isGeminiConfigured,
  callGemini,
  buildVisitorSystemPrompt,
  buildAdminPrompt
};
