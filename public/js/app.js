(() => {
  const VIEW_HASH_MAP = {
    home: 'trang-chu',
    knowledge: 'kien-thuc',
    'middle-age': 'trung-nien',
    blog: 'blog',
    ai: 'hoi-dap-ai',
    tools: 'cong-cu',
    contact: 'lien-he',
    admin: 'quan-tri'
  };
  const HASH_VIEW_MAP = Object.fromEntries(
    Object.entries(VIEW_HASH_MAP).map(([k, v]) => [v, k])
  );

  const state = {
    profile: null,
    articles: [],
    geminiConfigured: false,
    chatHistory: [],
    activeCategory: 'all'
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==================== FONT SIZE ACCESSIBILITY ====================
  const FONT_KEY = 'ht_font_scale';
  let fontScale = parseFloat(localStorage.getItem(FONT_KEY) || '1');
  if (Number.isNaN(fontScale) || fontScale < 0.85 || fontScale > 1.35) fontScale = 1;

  function applyFontScale() {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
    localStorage.setItem(FONT_KEY, String(fontScale));
  }
  applyFontScale();

  document.getElementById('font-decrease')?.addEventListener('click', () => {
    fontScale = Math.max(0.85, +(fontScale - 0.08).toFixed(2));
    applyFontScale();
  });
  document.getElementById('font-reset')?.addEventListener('click', () => {
    fontScale = 1;
    applyFontScale();
  });
  document.getElementById('font-increase')?.addEventListener('click', () => {
    fontScale = Math.min(1.35, +(fontScale + 0.08).toFixed(2));
    applyFontScale();
  });

  // ==================== NAVIGATION ====================
  const mainNav = document.getElementById('main-nav');
  const menuToggle = document.getElementById('menu-toggle');

  menuToggle?.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  function navigateTo(viewName, updateHash = true) {
    const targetView = VIEW_HASH_MAP[viewName] ? viewName : 'home';
    document.querySelectorAll('.page-view').forEach((el) => el.classList.remove('active'));
    document.getElementById(`view-${targetView}`)?.classList.add('active');

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === targetView);
    });

    if (mainNav.classList.contains('open')) {
      mainNav.classList.remove('open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }

    if (updateHash) {
      window.location.hash = VIEW_HASH_MAP[targetView];
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetView === 'admin' && typeof window.initAdminView === 'function') {
      window.initAdminView();
    }
  }

  document.addEventListener('click', (e) => {
    const navTrigger = e.target.closest('[data-nav]');
    if (navTrigger) {
      e.preventDefault();
      navigateTo(navTrigger.dataset.nav);
      return;
    }

    const catJump = e.target.closest('[data-category-jump]');
    if (catJump) {
      state.activeCategory = catJump.dataset.categoryJump;
      syncCategoryPills();
      navigateTo('knowledge');
      renderKnowledgeArticles();
    }
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    const view = HASH_VIEW_MAP[hash] || 'home';
    navigateTo(view, false);
  });

  // ==================== PROFILE & ARTICLES ====================
  function applyProfile(p) {
    if (!p) return;
    state.profile = p;
    const phoneClean = (p.phone || '0344126866').replace(/\s+/g, '');
    const zaloClean = (p.zalo || phoneClean).replace(/\s+/g, '');

    document.title = `${p.siteName} — ${p.slogan}`;
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const setHref = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.href = val;
    };
    const setSrc = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.src = val;
    };

    setText('top-slogan', `🌿 ${p.slogan}`);
    setText('header-site-name', p.siteName);
    setText('header-owner-name', p.fullName);
    setText('hero-site-title', p.siteName);
    setText('hero-slogan', `“${p.slogan}”`);
    setText('hero-bio', p.bio);
    setText('hero-owner-name', p.fullName);
    setText('contact-owner-name', p.fullName);
    setText('contact-slogan', p.slogan);
    setText('contact-phone', p.phone);
    setText('contact-zalo', `${p.zalo} (Nhắn Zalo ngay)`);
    setText('contact-email', p.email);
    setText('footer-site-name', p.siteName);
    setText('footer-slogan', p.slogan);
    setText('footer-owner-name', p.fullName);
    setText('footer-phone', p.phone);
    setText('footer-email', p.email);
    setText('top-phone-link', `📞 ${p.phone}`);
    setText('hero-call-btn', `📞 Gọi ${p.phone}`);

    setSrc('header-avatar', p.avatar);
    setSrc('hero-avatar', p.avatar);
    setSrc('contact-avatar', p.secondaryPhoto || p.avatar);

    setHref('top-phone-link', `tel:${phoneClean}`);
    setHref('top-zalo-link', `https://zalo.me/${zaloClean}`);
    setHref('hero-call-btn', `tel:${phoneClean}`);
    setHref('hero-zalo-btn', `https://zalo.me/${zaloClean}`);
    setHref('contact-phone', `tel:${phoneClean}`);
    setHref('contact-zalo', `https://zalo.me/${zaloClean}`);
    setHref('contact-email', `mailto:${p.email}`);
    setHref('contact-call-btn', `tel:${phoneClean}`);
    setHref('contact-zalo-btn', `https://zalo.me/${zaloClean}`);
    setHref('dock-call', `tel:${phoneClean}`);
    setHref('dock-zalo', `https://zalo.me/${zaloClean}`);
    setHref('footer-phone', `tel:${phoneClean}`);
    setHref('footer-email', `mailto:${p.email}`);
  }

  function getCategoryIcon(cat) {
    const map = {
      'dinh-duong': '🥗',
      'van-dong': '🚶‍♀️',
      'giac-ngu': '🌙',
      'tinh-than': '🌸',
      'phong-benh': '🛡️',
      'trung-nien': '🌿',
      blog: '📖'
    };
    return map[cat] || '💚';
  }

  function createArticleCard(article) {
    const coverHtml = article.coverImage
      ? `<img src="${escapeHtml(article.coverImage)}" alt="${escapeHtml(article.title)}" loading="lazy" />`
      : `<span>${getCategoryIcon(article.category)}</span>`;

    const sampleBadge = article.isSample
      ? `<span class="tag-sample">Bài viết mẫu</span>`
      : '';

    return `
      <article class="article-card">
        <div class="article-cover">${coverHtml}</div>
        <div class="article-body">
          <div class="article-meta">
            <span class="tag-cat">${escapeHtml(article.categoryLabel || 'Sức khỏe')}</span>
            ${sampleBadge}
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          <button type="button" class="btn btn-outline btn-sm" data-read-article="${escapeHtml(article.id)}">
            Đọc chi tiết →
          </button>
        </div>
      </article>
    `;
  }

  function renderArticleGrid(containerId, list, emptyText = 'Chưa có bài viết phù hợp.') {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!list || list.length === 0) {
      container.innerHTML = `<p class="note-muted">${escapeHtml(emptyText)}</p>`;
      return;
    }
    container.innerHTML = list.map(createArticleCard).join('');
  }

  function syncCategoryPills() {
    document.querySelectorAll('#category-pills .pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === state.activeCategory);
    });
  }

  function renderKnowledgeArticles() {
    const q = (document.getElementById('article-search-input')?.value || '').trim().toLowerCase();
    let list = state.articles;
    if (state.activeCategory !== 'all') {
      list = list.filter((a) => a.category === state.activeCategory);
    }
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.keywords || '').toLowerCase().includes(q)
      );
    }
    renderArticleGrid('knowledge-articles-grid', list, 'Không tìm thấy bài viết phù hợp với từ khóa của bạn.');
  }

  async function loadPublicData() {
    try {
      const [siteRes, artRes] = await Promise.all([
        fetch('/api/site'),
        fetch('/api/articles')
      ]);
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        applyProfile(siteData.profile);
        state.geminiConfigured = Boolean(siteData.geminiConfigured);
        const aiWarn = document.getElementById('ai-config-warning');
        if (aiWarn) aiWarn.classList.toggle('hidden', state.geminiConfigured);
      }
      if (artRes.ok) {
        const artData = await artRes.json();
        state.articles = artData.articles || [];
        renderArticleGrid('featured-articles-grid', state.articles.filter((a) => a.featured).slice(0, 6));
        renderKnowledgeArticles();
        renderArticleGrid(
          'middle-age-articles-grid',
          state.articles.filter((a) => ['trung-nien', 'van-dong', 'dinh-duong'].includes(a.category))
        );
        renderArticleGrid('blog-articles-grid', state.articles);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu website:', err);
    }
  }

  window.reloadPublicData = loadPublicData;

  document.getElementById('category-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    state.activeCategory = pill.dataset.cat;
    syncCategoryPills();
    renderKnowledgeArticles();
  });

  document.getElementById('article-search-btn')?.addEventListener('click', renderKnowledgeArticles);
  document.getElementById('article-search-input')?.addEventListener('input', renderKnowledgeArticles);

  // ==================== ARTICLE MODAL ====================
  const modal = document.getElementById('article-modal');
  const modalBody = document.getElementById('modal-article-body');

  function closeModal() {
    modal?.classList.add('hidden');
  }
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-read-article]');
    if (!btn) return;
    const id = btn.dataset.readArticle;
    modalBody.innerHTML = '<p>Đang tải nội dung bài viết...</p>';
    modal.classList.remove('hidden');

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.article) {
        modalBody.innerHTML = `<p>${escapeHtml(data.error || 'Không tìm thấy bài viết.')}</p>`;
        return;
      }
      const a = data.article;
      modalBody.innerHTML = `
        <span class="tag-cat">${escapeHtml(a.categoryLabel)}</span>
        ${a.isSample ? '<span class="tag-sample" style="margin-left:0.4rem;">Nội dung mẫu minh họa</span>' : ''}
        <h2 id="modal-article-title" style="margin:0.75rem 0 0.5rem; color:var(--green-700);">${escapeHtml(a.title)}</h2>
        <p class="note-muted">Lượt xem: ${a.views || 1}${a.keywords ? ` • Từ khóa: ${escapeHtml(a.keywords)}` : ''}</p>
        ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="${escapeHtml(a.title)}" style="border-radius:14px; max-height:320px; width:100%; object-fit:cover; margin:1rem 0;" />` : ''}
        <div class="article-full-content">${escapeHtml(a.content)}</div>
        <div class="safety-box" style="margin-top:1.5rem; margin-bottom:0;">
          Thông tin trên chỉ mang tính tham khảo phổ thông. Nếu cần tư vấn y khoa chuyên sâu, vui lòng hỏi ý kiến bác sĩ hoặc cơ sở y tế uy tín.
        </div>
      `;
    } catch {
      modalBody.innerHTML = '<p>Không thể tải bài viết lúc này.</p>';
    }
  });

  // ==================== VISITOR AI CHAT ====================
  const chatMessages = document.getElementById('visitor-chat-messages');
  const chatForm = document.getElementById('visitor-chat-form');
  const chatInput = document.getElementById('visitor-chat-input');
  const chatSendBtn = document.getElementById('visitor-chat-send');

  function appendChatBubble({ text, sender = 'bot', emergency = false, tag = '' }) {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}${emergency ? ' emergency' : ''}`;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    if (tag) {
      const span = document.createElement('span');
      span.className = 'ai-tag';
      span.style.display = 'block';
      span.textContent = tag;
      bubble.appendChild(span);
    }

    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  async function sendVisitorQuestion(text) {
    const q = text.trim();
    if (!q) return;

    appendChatBubble({ text: q, sender: 'user' });
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatSendBtn.textContent = 'Đang suy nghĩ...';

    const loadingEl = appendChatBubble({
      text: 'Trợ lý AI đang chuẩn bị câu trả lời thân thiện cho bạn...',
      sender: 'bot'
    });

    try {
      const res = await fetch('/api/ai/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: state.chatHistory.slice(-6)
        })
      });
      const data = await res.json();
      loadingEl.remove();

      if (!res.ok) {
        const msg =
          data.code === 'API_NOT_CONFIGURED'
            ? `${data.error}\n\nHướng dẫn: ${data.setupGuide || ''}`
            : data.error || 'Có lỗi xảy ra khi kết nối AI.';
        appendChatBubble({ text: msg, sender: 'bot', tag: 'Thông báo hệ thống' });
        return;
      }

      appendChatBubble({
        text: data.reply,
        sender: 'bot',
        emergency: Boolean(data.emergency),
        tag: data.disclaimer || 'Nội dung do AI tạo — chỉ mang tính tham khảo'
      });

      if (!data.emergency) {
        state.chatHistory.push({ role: 'user', text: q });
        state.chatHistory.push({ role: 'model', text: data.reply });
      }
    } catch {
      loadingEl.remove();
      appendChatBubble({
        text: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
        sender: 'bot'
      });
    } finally {
      chatSendBtn.disabled = false;
      chatSendBtn.textContent = 'Gửi câu hỏi';
    }
  }

  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendVisitorQuestion(chatInput.value);
  });

  document.querySelectorAll('[data-ai-prompt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sendVisitorQuestion(btn.dataset.aiPrompt);
    });
  });

  // ==================== TOOLS: BMI, WATER & HABITS ====================
  document.getElementById('bmi-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const hCm = parseFloat(document.getElementById('bmi-height').value);
    const wKg = parseFloat(document.getElementById('bmi-weight').value);
    const out = document.getElementById('bmi-result');
    if (!hCm || !wKg || hCm <= 0 || wKg <= 0) return;

    const hM = hCm / 100;
    const bmi = +(wKg / (hM * hM)).toFixed(1);
    let label = '';
    let advice = '';

    if (bmi < 18.5) {
      label = 'Thiếu cân (theo ngưỡng tham khảo)';
      advice = 'Nên bổ sung đầy đủ đạm, tinh bột tốt và chia nhỏ bữa ăn hằng ngày.';
    } else if (bmi < 23) {
      label = 'Cân đối bình thường (theo ngưỡng Châu Á tham khảo)';
      advice = 'Hãy duy trì chế độ ăn nhiều rau xanh, uống đủ nước và vận động nhẹ 30 phút/ngày.';
    } else if (bmi < 25) {
      label = 'Thừa cân nhẹ (theo ngưỡng Châu Á tham khảo)';
      advice = 'Có thể giảm bớt đồ ngọt, tinh bột tinh luyện và tăng cường đi bộ mỗi ngày.';
    } else {
      label = 'Thừa cân / Béo phì (theo ngưỡng Châu Á tham khảo)';
      advice = 'Nên điều chỉnh khẩu phần ăn lành mạnh, hạn chế đồ chiên rán và tham khảo thêm ý kiến bác sĩ hoặc chuyên gia dinh dưỡng.';
    }

    out.innerHTML = `
      <p><strong>Chỉ số BMI của bạn: ${bmi}</strong> — ${escapeHtml(label)}</p>
      <p>${escapeHtml(advice)}</p>
      <p class="note-muted">Lưu ý: Chỉ số BMI chỉ mang tính tham khảo chung, không phản ánh đầy đủ tỷ lệ cơ/mỡ hay tình trạng bệnh lý riêng.</p>
    `;
    out.classList.remove('hidden');
  });

  document.getElementById('water-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('water-weight').value);
    const activity = document.getElementById('water-activity').value;
    const out = document.getElementById('water-result');
    if (!weight || weight <= 0) return;

    const extra = activity === 'active' ? 400 : activity === 'moderate' ? 200 : 0;
    const ml = Math.round(weight * 30 + extra);
    const cups = Math.round(ml / 250);

    out.innerHTML = `
      <p><strong>Lượng nước gợi ý tham khảo:</strong> khoảng <strong>${ml} ml/ngày</strong> (~${cups} ly 250ml, chia đều cả ngày).</p>
      <ul class="clean-list">
        <li><strong>07:00:</strong> 1 ly nước ấm sau khi thức dậy + 10 phút giãn cơ nhẹ.</li>
        <li><strong>09:30:</strong> 1 ly nước + đứng dậy đi lại 5 phút.</li>
        <li><strong>11:30 &amp; 14:30:</strong> 1–2 ly nước trước bữa ăn 20 phút.</li>
        <li><strong>16:30:</strong> 1 ly nước + đi bộ nhẹ hoặc tập thở sâu 20 phút.</li>
        <li><strong>19:30–20:30:</strong> Nhấp ngụm nhỏ nước ấm, tránh uống quá nhiều sát giờ ngủ.</li>
      </ul>
      <p class="note-muted">Nếu bạn có bệnh lý tim mạch hoặc thận cần hạn chế nước, hãy tuân theo chỉ định riêng của bác sĩ.</p>
    `;
    out.classList.remove('hidden');
  });

  // Private Habit Notebook (localStorage only)
  const HABITS_KEY = 'ht_private_habits_v1';
  const DEFAULT_HABITS = [
    { id: 'h1', text: 'Uống 1 ly nước ấm sau khi thức dậy' },
    { id: 'h2', text: 'Đi bộ hoặc giãn cơ nhẹ nhàng 20–30 phút' },
    { id: 'h3', text: 'Ăn đủ rau xanh trong bữa trưa và tối' },
    { id: 'h4', text: 'Thực hành thở sâu thư giãn 5 phút' },
    { id: 'h5', text: 'Ngủ trước 22h30, hạn chế điện thoại trước khi ngủ' }
  ];

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadHabitsState() {
    try {
      const raw = JSON.parse(localStorage.getItem(HABITS_KEY) || '{}');
      const items = Array.isArray(raw.items) && raw.items.length ? raw.items : DEFAULT_HABITS;
      const doneDate = raw.doneDate === todayKey() ? raw.doneIds || [] : [];
      return { items, doneDate: todayKey(), doneIds: doneDate };
    } catch {
      return { items: DEFAULT_HABITS, doneDate: todayKey(), doneIds: [] };
    }
  }

  function saveHabitsState(hState) {
    localStorage.setItem(HABITS_KEY, JSON.stringify(hState));
  }

  function renderHabits() {
    const hState = loadHabitsState();
    const listEl = document.getElementById('habit-list');
    const progEl = document.getElementById('habit-progress-text');
    if (!listEl || !progEl) return;

    const doneSet = new Set(hState.doneIds);
    progEl.textContent = `${doneSet.size}/${hState.items.length} hôm nay`;

    listEl.innerHTML = hState.items
      .map((item) => {
        const checked = doneSet.has(item.id);
        return `
          <div class="habit-item ${checked ? 'done' : ''}">
            <label>
              <input type="checkbox" data-habit-toggle="${escapeHtml(item.id)}" ${checked ? 'checked' : ''} />
              <span>${escapeHtml(item.text)}</span>
            </label>
            <button type="button" class="btn btn-sm btn-soft" data-habit-del="${escapeHtml(item.id)}" title="Xóa thói quen">✕</button>
          </div>
        `;
      })
      .join('');
  }

  document.getElementById('habit-list')?.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-habit-toggle]');
    if (!cb) return;
    const hState = loadHabitsState();
    const id = cb.dataset.habitToggle;
    const set = new Set(hState.doneIds);
    if (cb.checked) set.add(id);
    else set.delete(id);
    hState.doneIds = [...set];
    saveHabitsState(hState);
    renderHabits();
  });

  document.getElementById('habit-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-habit-del]');
    if (!btn) return;
    const hState = loadHabitsState();
    const id = btn.dataset.habitDel;
    hState.items = hState.items.filter((i) => i.id !== id);
    hState.doneIds = hState.doneIds.filter((x) => x !== id);
    saveHabitsState(hState);
    renderHabits();
  });

  document.getElementById('habit-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('habit-new-input');
    const text = input.value.trim();
    if (!text) return;
    const hState = loadHabitsState();
    hState.items.push({ id: `h-${Date.now()}`, text });
    saveHabitsState(hState);
    input.value = '';
    renderHabits();
  });

  renderHabits();

  // ==================== SHARE, CONTACT & NEWSLETTER ====================
  async function shareWebsite() {
    const url = window.location.origin;
    const title = state.profile?.siteName || 'Sống Khỏe Mỗi Ngày Cùng Hồng Thịnh';
    if (navigator.share) {
      try {
        await navigator.share({ title, text: state.profile?.slogan || '', url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Đã sao chép liên kết website: ' + url);
    } catch {
      alert('Liên kết website: ' + url);
    }
  }

  document.getElementById('btn-share-site')?.addEventListener('click', shareWebsite);
  document.getElementById('contact-share-btn')?.addEventListener('click', shareWebsite);

  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = document.getElementById('contact-feedback');
    fb.classList.add('hidden');
    fb.classList.remove('error');

    const payload = {
      name: document.getElementById('c-name').value.trim(),
      phone: document.getElementById('c-phone').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      topic: document.getElementById('c-topic').value,
      message: document.getElementById('c-message').value.trim(),
      website: e.target.querySelector('[name="website"]').value
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      fb.textContent = data.message || data.error;
      if (!res.ok) fb.classList.add('error');
      else e.target.reset();
      fb.classList.remove('hidden');
    } catch {
      fb.textContent = 'Không thể gửi tin nhắn lúc này. Vui lòng thử lại.';
      fb.classList.add('error');
      fb.classList.remove('hidden');
    }
  });

  document.getElementById('newsletter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = document.getElementById('newsletter-feedback');
    fb.classList.add('hidden');
    fb.classList.remove('error');

    const payload = {
      name: document.getElementById('news-name').value.trim(),
      email: document.getElementById('news-email').value.trim(),
      consent: document.getElementById('news-consent').checked,
      website: e.target.querySelector('[name="website"]').value
    };

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      fb.textContent = data.message || data.error;
      if (!res.ok) fb.classList.add('error');
      else e.target.reset();
      fb.classList.remove('hidden');
    } catch {
      fb.textContent = 'Không thể đăng ký lúc này. Vui lòng thử lại.';
      fb.classList.add('error');
      fb.classList.remove('hidden');
    }
  });

  // Init
  loadPublicData();
  const initialHash = window.location.hash.replace('#', '');
  if (HASH_VIEW_MAP[initialHash]) {
    navigateTo(HASH_VIEW_MAP[initialHash], false);
  }
})();
