require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const { readDb, writeDb, ensureDb, CATEGORY_MAP } = require('./lib/storage');
const {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  verifyAdminPassword,
  signSession,
  verifySession,
  parseCookies,
  requireAdmin,
  createRateLimiter
} = require('./lib/auth');
const {
  detectEmergency,
  getEmergencyResponse,
  isGeminiConfigured,
  callGemini,
  buildVisitorSystemPrompt,
  buildAdminPrompt
} = require('./lib/gemini');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
ensureDb();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer configuration for image uploads (avatar & article covers)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WebP (tối đa 5MB).'));
  }
});

// Rate limiters
const visitorAiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  message: 'Quý khách đang hỏi hơi nhanh. Vui lòng đợi khoảng 1 phút rồi tiếp tục nhé.'
});

const formLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Bạn vừa gửi thông tin rồi. Vui lòng đợi 1 phút trước khi gửi lại.'
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút.'
});

function cleanText(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

// ==================== PUBLIC ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    geminiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/site', (req, res) => {
  const db = readDb();
  res.json({
    profile: db.profile,
    geminiConfigured: isGeminiConfigured(),
    categories: CATEGORY_MAP
  });
});

app.get('/api/articles', (req, res) => {
  const db = readDb();
  const category = cleanText(req.query.category, 50);
  const q = cleanText(req.query.q, 100).toLowerCase();
  const featured = req.query.featured === 'true';

  let list = db.articles.filter((a) => a.status === 'published');

  if (category && category !== 'all') {
    list = list.filter((a) => a.category === category);
  }
  if (featured) {
    list = list.filter((a) => a.featured);
  }
  if (q) {
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.keywords || '').toLowerCase().includes(q) ||
        a.categoryLabel.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ articles: list });
});

app.get('/api/articles/:id', (req, res) => {
  const db = readDb();
  const article = db.articles.find((a) => a.id === req.params.id && a.status === 'published');
  if (!article) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
  }
  article.views = (article.views || 0) + 1;
  writeDb(db);
  return res.json({ article });
});

app.post('/api/contact', formLimiter, (req, res) => {
  // Honeypot chống bot spam
  if (req.body.website) {
    return res.json({ ok: true, message: 'Cảm ơn bạn đã gửi lời nhắn.' });
  }

  const name = cleanText(req.body.name, 100);
  const phone = cleanText(req.body.phone, 30);
  const email = cleanText(req.body.email, 120);
  const topic = cleanText(req.body.topic, 100) || 'Tư vấn sức khỏe';
  const message = cleanText(req.body.message, 1500);

  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập họ và tên của bạn.' });
  }
  if (!phone && !email) {
    return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc email để chủ website liên hệ lại.' });
  }
  if (!message || message.length < 5) {
    return res.status(400).json({ error: 'Vui lòng nhập nội dung lời nhắn (ít nhất 5 ký tự).' });
  }

  const db = readDb();
  const entry = {
    id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name,
    phone,
    email,
    topic,
    message,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  db.messages.unshift(entry);
  writeDb(db);

  return res.status(201).json({
    ok: true,
    message: 'Lời nhắn của bạn đã được gửi riêng tư tới cô Nguyễn Thị Hồng Thịnh. Xin cảm ơn!'
  });
});

app.post('/api/newsletter', formLimiter, (req, res) => {
  if (req.body.website) {
    return res.json({ ok: true, message: 'Đăng ký thành công.' });
  }

  const name = cleanText(req.body.name, 100);
  const email = cleanText(req.body.email, 120).toLowerCase();
  const consent = req.body.consent === true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email hợp lệ.' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'Vui lòng đánh dấu đồng ý nhận bản tin sức khỏe định kỳ.' });
  }

  const db = readDb();
  const exists = db.subscribers.some((s) => s.email === email);
  if (!exists) {
    db.subscribers.unshift({
      id: `sub-${Date.now()}`,
      name: name || 'Bạn đọc',
      email,
      consent: true,
      createdAt: new Date().toISOString()
    });
    writeDb(db);
  }

  return res.status(201).json({
    ok: true,
    message: 'Đăng ký nhận bản tin sống khỏe thành công! Cảm ơn sự đồng hành của bạn.'
  });
});

app.post('/api/ai/visitor', visitorAiLimiter, async (req, res) => {
  const message = cleanText(req.body.message, 1000);
  if (!message) {
    return res.status(400).json({ error: 'Vui lòng nhập câu hỏi của bạn.' });
  }

  // Kiểm tra khẩn cấp ngay lập tức
  if (detectEmergency(message)) {
    return res.json({
      reply: getEmergencyResponse(),
      emergency: true,
      aiGenerated: false,
      disclaimer: 'Khuyến nghị an toàn khẩn cấp — hãy gọi 115 hoặc tới cơ sở y tế gần nhất.'
    });
  }

  const db = readDb();
  db.stats.aiVisitorCount = (db.stats.aiVisitorCount || 0) + 1;
  writeDb(db);

  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: 'Trợ lý AI hiện chưa được cấu hình khóa API (GEMINI_API_KEY) trên máy chủ.',
      code: 'API_NOT_CONFIGURED',
      setupGuide:
        'Chủ website vui lòng lấy khóa tại Google AI Studio (aistudio.google.com/apikey), mở file .env và điền GEMINI_API_KEY=... sau đó khởi động lại máy chủ.'
    });
  }

  const rawHistory = Array.isArray(req.body.history) ? req.body.history.slice(-6) : [];
  const contents = [];
  for (const item of rawHistory) {
    if (!item || typeof item.text !== 'string') continue;
    const role = item.role === 'model' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: item.text.slice(0, 800) }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const reply = await callGemini({
      systemInstruction: buildVisitorSystemPrompt({
        profile: db.profile,
        articles: db.articles
      }),
      contents,
      temperature: 0.65
    });

    return res.json({
      reply,
      emergency: false,
      aiGenerated: true,
      disclaimer:
        'Nội dung do Trợ lý AI tạo — chỉ mang tính tham khảo phổ thông, không thay thế chẩn đoán hay chỉ định của bác sĩ.'
    });
  } catch (err) {
    return res.status(502).json({
      error: err.message || 'Không thể kết nối tới dịch vụ AI lúc này. Vui lòng thử lại sau.',
      code: err.code || 'AI_ERROR'
    });
  }
});

// ==================== ADMIN AUTH ROUTES ====================

app.get('/api/admin/me', (req, res) => {
  const cookies = parseCookies(req);
  const session = verifySession(cookies[SESSION_COOKIE_NAME]);
  res.json({
    authenticated: Boolean(session),
    usingDefaultPassword: !process.env.ADMIN_PASSWORD
  });
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Mật khẩu quản trị không đúng.' });
  }

  const token = signSession('hongthinh-admin');
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/'
  });

  return res.json({ ok: true, message: 'Đăng nhập quản trị thành công!' });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// ==================== PROTECTED ADMIN ROUTES ====================

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const db = readDb();
  const totalViews = db.articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const publishedCount = db.articles.filter((a) => a.status === 'published').length;
  const draftCount = db.articles.filter((a) => a.status !== 'published').length;
  const newMessagesCount = db.messages.filter((m) => m.status === 'new').length;

  res.json({
    profile: db.profile,
    articles: db.articles,
    messages: db.messages,
    subscribers: db.subscribers,
    geminiConfigured: isGeminiConfigured(),
    usingDefaultPassword: !process.env.ADMIN_PASSWORD,
    stats: {
      totalArticles: db.articles.length,
      publishedCount,
      draftCount,
      totalViews,
      totalMessages: db.messages.length,
      newMessagesCount,
      totalSubscribers: db.subscribers.length,
      aiVisitorCount: db.stats?.aiVisitorCount || 0,
      aiAdminCount: db.stats?.aiAdminCount || 0
    }
  });
});

app.put('/api/admin/profile', requireAdmin, (req, res) => {
  const db = readDb();
  const p = db.profile;
  p.fullName = cleanText(req.body.fullName, 100) || p.fullName;
  p.siteName = cleanText(req.body.siteName, 150) || p.siteName;
  p.phone = cleanText(req.body.phone, 30) || p.phone;
  p.zalo = cleanText(req.body.zalo, 30) || p.zalo;
  p.email = cleanText(req.body.email, 120) || p.email;
  p.slogan = cleanText(req.body.slogan, 200) || p.slogan;
  p.bio = cleanText(req.body.bio, 1500) || p.bio;
  if (typeof req.body.avatar === 'string' && req.body.avatar.trim()) {
    p.avatar = cleanText(req.body.avatar, 300);
  }
  if (typeof req.body.secondaryPhoto === 'string' && req.body.secondaryPhoto.trim()) {
    p.secondaryPhoto = cleanText(req.body.secondaryPhoto, 300);
  }

  writeDb(db);
  res.json({ ok: true, profile: db.profile });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Không thể tải ảnh lên.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn tệp hình ảnh.' });
    }
    return res.json({ ok: true, url: `/uploads/${req.file.filename}` });
  });
});

app.post('/api/admin/articles', requireAdmin, (req, res) => {
  const title = cleanText(req.body.title, 200);
  const category = CATEGORY_MAP[req.body.category] ? req.body.category : 'blog';
  const summary = cleanText(req.body.summary, 400);
  const content = cleanText(req.body.content, 15000);
  const coverImage = cleanText(req.body.coverImage, 300);
  const mediaType = ['article', 'video', 'blog'].includes(req.body.mediaType) ? req.body.mediaType : 'article';
  const videoUrl = cleanText(req.body.videoUrl, 300);
  const keywords = cleanText(req.body.keywords, 300);
  const featured = Boolean(req.body.featured);
  const status = req.body.status === 'draft' ? 'draft' : 'published';

  if (!title || !content) {
    return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung bài viết.' });
  }

  const db = readDb();
  const now = new Date().toISOString();
  const article = {
    id: `art-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title,
    category,
    categoryLabel: CATEGORY_MAP[category],
    summary: summary || content.slice(0, 160) + '...',
    content,
    coverImage,
    mediaType,
    videoUrl,
    keywords,
    featured,
    status,
    isSample: false,
    views: 0,
    createdAt: now,
    updatedAt: now
  };

  db.articles.unshift(article);
  writeDb(db);
  res.status(201).json({ ok: true, article });
});

app.put('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = db.articles.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
  }

  const current = db.articles[idx];
  const category = CATEGORY_MAP[req.body.category] ? req.body.category : current.category;
  const updated = {
    ...current,
    title: cleanText(req.body.title, 200) || current.title,
    category,
    categoryLabel: CATEGORY_MAP[category],
    summary: typeof req.body.summary === 'string' ? cleanText(req.body.summary, 400) : current.summary,
    content: typeof req.body.content === 'string' ? cleanText(req.body.content, 15000) : current.content,
    coverImage: typeof req.body.coverImage === 'string' ? cleanText(req.body.coverImage, 300) : current.coverImage,
    mediaType: ['article', 'video', 'blog'].includes(req.body.mediaType) ? req.body.mediaType : current.mediaType,
    videoUrl: typeof req.body.videoUrl === 'string' ? cleanText(req.body.videoUrl, 300) : current.videoUrl,
    keywords: typeof req.body.keywords === 'string' ? cleanText(req.body.keywords, 300) : current.keywords,
    featured: typeof req.body.featured === 'boolean' ? req.body.featured : current.featured,
    status: req.body.status === 'draft' ? 'draft' : req.body.status === 'published' ? 'published' : current.status,
    isSample: false,
    updatedAt: new Date().toISOString()
  };

  db.articles[idx] = updated;
  writeDb(db);
  res.json({ ok: true, article: updated });
});

app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const before = db.articles.length;
  db.articles = db.articles.filter((a) => a.id !== req.params.id);
  if (db.articles.length === before) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết để xóa.' });
  }
  writeDb(db);
  res.json({ ok: true });
});

app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const msg = db.messages.find((m) => m.id === req.params.id);
  if (!msg) {
    return res.status(404).json({ error: 'Không tìm thấy tin nhắn.' });
  }
  msg.status = req.body.status === 'resolved' ? 'resolved' : 'new';
  writeDb(db);
  res.json({ ok: true, message: msg });
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.messages = db.messages.filter((m) => m.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/admin/ai', requireAdmin, async (req, res) => {
  const task = cleanText(req.body.task, 50);
  const input = req.body.input && typeof req.body.input === 'object' ? req.body.input : {};

  const db = readDb();
  db.stats.aiAdminCount = (db.stats.aiAdminCount || 0) + 1;
  writeDb(db);

  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: 'Chưa cấu hình khóa API Gemini (GEMINI_API_KEY) trong tệp .env trên máy chủ.',
      code: 'API_NOT_CONFIGURED'
    });
  }

  const { systemInstruction, userPrompt } = buildAdminPrompt({
    task,
    input,
    profile: db.profile,
    messages: db.messages,
    articles: db.articles
  });

  try {
    const result = await callGemini({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      temperature: 0.7
    });

    return res.json({
      ok: true,
      task,
      draft: result,
      aiGenerated: true,
      note: 'Đây là bản nháp do Trợ lý AI tạo. Vui lòng xem lại, chỉnh sửa và phê duyệt trước khi đăng hoặc gửi.'
    });
  } catch (err) {
    return res.status(502).json({
      error: err.message || 'Lỗi khi gọi Gemini AI.',
      code: err.code || 'AI_ERROR'
    });
  }
});

// Fallback for SPA hash/routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API không tồn tại.' });
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`Website: SONG KHOE MOI NGAY CUNG HONG THINH`);
  console.log(`Dang chay tai: http://localhost:${PORT}`);
  console.log(`Trang thai Gemini API: ${isGeminiConfigured() ? 'DA CAU HINH' : 'CHUA CAU HINH (Can them GEMINI_API_KEY vao .env)'}`);
  console.log(`========================================================`);
});
