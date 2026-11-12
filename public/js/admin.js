(() => {
  const adminState = {
    authenticated: false,
    dashboard: null
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showFeedback(elId, message, isError = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.classList.remove('hidden');
  }

  function switchAdminTab(tabName) {
    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.adminTab === tabName);
    });
    document.querySelectorAll('.admin-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `admin-tab-${tabName}`);
    });
  }

  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchAdminTab(btn.dataset.adminTab));
  });

  async function initAdminView() {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      adminState.authenticated = Boolean(data.authenticated);
      document.getElementById('admin-login-box')?.classList.toggle('hidden', adminState.authenticated);
      document.getElementById('admin-dashboard')?.classList.toggle('hidden', !adminState.authenticated);

      if (adminState.authenticated) {
        await loadDashboard();
      }
    } catch (err) {
      console.error('Lỗi kiểm tra phiên quản trị:', err);
    }
  }

  window.initAdminView = initAdminView;

  async function loadDashboard() {
    const res = await fetch('/api/admin/dashboard');
    if (res.status === 401) {
      adminState.authenticated = false;
      initAdminView();
      return;
    }
    const data = await res.json();
    adminState.dashboard = data;

    document.getElementById('admin-default-pw-alert')?.classList.toggle('hidden', !data.usingDefaultPassword);

    // Stats
    const s = data.stats || {};
    document.getElementById('admin-stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-value">${s.publishedCount || 0}</div><div class="stat-label">Bài đã đăng</div></div>
      <div class="stat-card"><div class="stat-value">${s.draftCount || 0}</div><div class="stat-label">Bản nháp</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalViews || 0}</div><div class="stat-label">Lượt đọc bài</div></div>
      <div class="stat-card"><div class="stat-value">${s.newMessagesCount || 0}/${s.totalMessages || 0}</div><div class="stat-label">Tin nhắn mới</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalSubscribers || 0}</div><div class="stat-label">Đăng ký bản tin</div></div>
    `;

    // Profile form
    const p = data.profile || {};
    document.getElementById('adm-fullName').value = p.fullName || '';
    document.getElementById('adm-siteName').value = p.siteName || '';
    document.getElementById('adm-phone').value = p.phone || '';
    document.getElementById('adm-zalo').value = p.zalo || '';
    document.getElementById('adm-email').value = p.email || '';
    document.getElementById('adm-slogan').value = p.slogan || '';
    document.getElementById('adm-bio').value = p.bio || '';
    document.getElementById('adm-avatar').value = p.avatar || '';
    document.getElementById('adm-secondaryPhoto').value = p.secondaryPhoto || '';

    renderAdminArticles(data.articles || []);
    renderAdminMessages(data.messages || []);
    renderAdminSubscribers(data.subscribers || []);
  }

  function renderAdminArticles(articles) {
    const listEl = document.getElementById('admin-articles-list');
    if (!articles.length) {
      listEl.innerHTML = '<p class="note-muted">Chưa có bài viết nào.</p>';
      return;
    }
    listEl.innerHTML = articles
      .map((a) => {
        const statusLabel = a.status === 'published' ? '✅ Đã đăng' : '📝 Bản nháp';
        return `
          <div class="admin-row">
            <div style="flex:1; min-width:240px;">
              <strong>${escapeHtml(a.title)}</strong>
              <div class="note-muted">
                ${escapeHtml(a.categoryLabel)} • ${statusLabel} • Lượt xem: ${a.views || 0}
                ${a.featured ? ' • ⭐ Nổi bật' : ''}
                ${a.isSample ? ' • [Bài mẫu]' : ''}
              </div>
            </div>
            <div class="admin-row-actions">
              ${a.status !== 'published' ? `<button type="button" class="btn btn-sm btn-primary" data-art-approve="${escapeHtml(a.id)}">Phê duyệt &amp; Đăng</button>` : ''}
              <button type="button" class="btn btn-sm btn-outline" data-art-edit="${escapeHtml(a.id)}">Sửa</button>
              <button type="button" class="btn btn-sm btn-danger" data-art-del="${escapeHtml(a.id)}">Xóa</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderAdminMessages(messages) {
    const listEl = document.getElementById('admin-messages-list');
    if (!messages.length) {
      listEl.innerHTML = '<p class="note-muted">Chưa có tin nhắn nào từ khách truy cập.</p>';
      return;
    }
    listEl.innerHTML = messages
      .map((m) => {
        const isResolved = m.status === 'resolved';
        return `
          <div class="admin-row">
            <div style="flex:1; min-width:260px;">
              <strong>${escapeHtml(m.name)}</strong>
              <span class="tag-cat" style="margin-left:0.4rem;">${isResolved ? 'Đã xử lý' : 'Mới'}</span>
              <div class="note-muted">
                SĐT: ${escapeHtml(m.phone || 'Không có')} • Email: ${escapeHtml(m.email || 'Không có')} • Chủ đề: ${escapeHtml(m.topic)}
              </div>
              <p style="margin:0.5rem 0 0;">${escapeHtml(m.message)}</p>
            </div>
            <div class="admin-row-actions">
              <button type="button" class="btn btn-sm btn-sky" data-msg-ai-reply="${escapeHtml(m.id)}">🤖 AI soạn trả lời</button>
              <button type="button" class="btn btn-sm btn-outline" data-msg-toggle="${escapeHtml(m.id)}" data-next-status="${isResolved ? 'new' : 'resolved'}">
                ${isResolved ? 'Đánh dấu Mới' : 'Đã xử lý'}
              </button>
              <button type="button" class="btn btn-sm btn-danger" data-msg-del="${escapeHtml(m.id)}">Xóa</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderAdminSubscribers(subs) {
    const listEl = document.getElementById('admin-subscribers-list');
    if (!subs.length) {
      listEl.innerHTML = '<p class="note-muted">Chưa có người đăng ký nhận bản tin.</p>';
      return;
    }
    listEl.innerHTML = subs
      .map(
        (s) => `
        <div class="admin-row">
          <div>
            <strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.email)}
            <div class="note-muted">Đã đồng ý nhận tin • Ngày: ${escapeHtml((s.createdAt || '').slice(0, 10))}</div>
          </div>
        </div>
      `
      )
      .join('');
  }

  // ==================== LOGIN & LOGOUT ====================
  document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('admin-login-error');
    errEl.classList.add('hidden');

    const password = document.getElementById('admin-password-input').value;
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Đăng nhập thất bại.';
      errEl.classList.remove('hidden');
      return;
    }
    document.getElementById('admin-password-input').value = '';
    await initAdminView();
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    adminState.authenticated = false;
    await initAdminView();
  });

  // ==================== UPLOAD IMAGE HELPER ====================
  async function uploadImage(fileInputId, targetInputId) {
    const fileInput = document.getElementById(fileInputId);
    const file = fileInput?.files?.[0];
    if (!file) {
      alert('Vui lòng chọn một tệp ảnh (JPG, PNG hoặc WebP) trước khi tải lên.');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Không thể tải ảnh lên.');
      return;
    }
    document.getElementById(targetInputId).value = data.url;
    fileInput.value = '';
    alert('Tải ảnh lên thành công! Hãy bấm nút Lưu để áp dụng.');
  }

  document.getElementById('adm-upload-avatar-btn')?.addEventListener('click', () =>
    uploadImage('adm-avatar-file', 'adm-avatar')
  );
  document.getElementById('adm-upload-photo2-btn')?.addEventListener('click', () =>
    uploadImage('adm-photo2-file', 'adm-secondaryPhoto')
  );
  document.getElementById('art-upload-cover-btn')?.addEventListener('click', () =>
    uploadImage('art-cover-file', 'art-coverImage')
  );

  // ==================== SAVE PROFILE ====================
  document.getElementById('admin-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fullName: document.getElementById('adm-fullName').value.trim(),
      siteName: document.getElementById('adm-siteName').value.trim(),
      phone: document.getElementById('adm-phone').value.trim(),
      zalo: document.getElementById('adm-zalo').value.trim(),
      email: document.getElementById('adm-email').value.trim(),
      slogan: document.getElementById('adm-slogan').value.trim(),
      bio: document.getElementById('adm-bio').value.trim(),
      avatar: document.getElementById('adm-avatar').value.trim(),
      secondaryPhoto: document.getElementById('adm-secondaryPhoto').value.trim()
    };
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback('admin-profile-feedback', data.error || 'Không thể lưu thông tin.', true);
      return;
    }
    showFeedback('admin-profile-feedback', 'Đã cập nhật thông tin website thành công!');
    if (typeof window.reloadPublicData === 'function') window.reloadPublicData();
  });

  // ==================== ARTICLE CRUD ====================
  function resetArticleForm() {
    document.getElementById('art-id').value = '';
    document.getElementById('art-title').value = '';
    document.getElementById('art-category').value = 'dinh-duong';
    document.getElementById('art-summary').value = '';
    document.getElementById('art-content').value = '';
    document.getElementById('art-keywords').value = '';
    document.getElementById('art-status').value = 'published';
    document.getElementById('art-coverImage').value = '';
    document.getElementById('art-featured').checked = false;
    document.getElementById('article-form-heading').textContent = '✍️ Thêm Bài Viết Mới';
    document.getElementById('article-cancel-edit-btn').classList.add('hidden');
  }

  document.getElementById('article-cancel-edit-btn')?.addEventListener('click', resetArticleForm);

  document.getElementById('admin-article-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('art-id').value;
    const payload = {
      title: document.getElementById('art-title').value.trim(),
      category: document.getElementById('art-category').value,
      summary: document.getElementById('art-summary').value.trim(),
      content: document.getElementById('art-content').value.trim(),
      keywords: document.getElementById('art-keywords').value.trim(),
      status: document.getElementById('art-status').value,
      coverImage: document.getElementById('art-coverImage').value.trim(),
      featured: document.getElementById('art-featured').checked
    };

    const url = id ? `/api/admin/articles/${encodeURIComponent(id)}` : '/api/admin/articles';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback('admin-article-feedback', data.error || 'Không thể lưu bài viết.', true);
      return;
    }

    showFeedback('admin-article-feedback', id ? 'Đã cập nhật bài viết!' : 'Đã lưu bài viết mới!');
    resetArticleForm();
    await loadDashboard();
    if (typeof window.reloadPublicData === 'function') window.reloadPublicData();
  });

  document.getElementById('admin-articles-list')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-art-edit]');
    if (editBtn) {
      const a = adminState.dashboard?.articles?.find((x) => x.id === editBtn.dataset.artEdit);
      if (!a) return;
      document.getElementById('art-id').value = a.id;
      document.getElementById('art-title').value = a.title;
      document.getElementById('art-category').value = a.category;
      document.getElementById('art-summary').value = a.summary || '';
      document.getElementById('art-content').value = a.content || '';
      document.getElementById('art-keywords').value = a.keywords || '';
      document.getElementById('art-status').value = a.status || 'published';
      document.getElementById('art-coverImage').value = a.coverImage || '';
      document.getElementById('art-featured').checked = Boolean(a.featured);
      document.getElementById('article-form-heading').textContent = '✏️ Chỉnh Sửa Bài Viết';
      document.getElementById('article-cancel-edit-btn').classList.remove('hidden');
      document.getElementById('admin-article-form').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const approveBtn = e.target.closest('[data-art-approve]');
    if (approveBtn) {
      await fetch(`/api/admin/articles/${encodeURIComponent(approveBtn.dataset.artApprove)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });
      await loadDashboard();
      if (typeof window.reloadPublicData === 'function') window.reloadPublicData();
      return;
    }

    const delBtn = e.target.closest('[data-art-del]');
    if (delBtn) {
      if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
      await fetch(`/api/admin/articles/${encodeURIComponent(delBtn.dataset.artDel)}`, {
        method: 'DELETE'
      });
      await loadDashboard();
      if (typeof window.reloadPublicData === 'function') window.reloadPublicData();
    }
  });

  // ==================== ADMIN AI STUDIO ====================
  const aiTaskSelect = document.getElementById('adm-ai-task');
  aiTaskSelect?.addEventListener('change', () => {
    document
      .getElementById('adm-ai-range-wrap')
      ?.classList.toggle('hidden', aiTaskSelect.value !== 'content_plan');
  });

  async function runAdminAi(task, input) {
    const errEl = document.getElementById('adm-ai-error');
    const runBtn = document.getElementById('adm-ai-run-btn');
    errEl.classList.add('hidden');
    runBtn.disabled = true;
    runBtn.textContent = '⏳ AI đang soạn bản nháp...';

    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, input })
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Không thể tạo nội dung bằng AI.';
        errEl.classList.remove('hidden');
        return;
      }
      document.getElementById('adm-ai-output').value = data.draft || '';
      document.getElementById('adm-ai-result-wrap').classList.remove('hidden');
    } catch {
      errEl.textContent = 'Lỗi kết nối máy chủ khi gọi AI.';
      errEl.classList.remove('hidden');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '✨ Tạo bản nháp bằng AI';
    }
  }

  document.getElementById('admin-ai-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    runAdminAi(aiTaskSelect.value, {
      topic: document.getElementById('adm-ai-topic').value.trim(),
      notes: document.getElementById('adm-ai-notes').value.trim(),
      range: document.getElementById('adm-ai-range').value
    });
  });

  document.getElementById('adm-ai-copy-btn')?.addEventListener('click', async () => {
    const text = document.getElementById('adm-ai-output').value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    alert('Đã sao chép bản nháp!');
  });

  document.getElementById('adm-ai-to-article-btn')?.addEventListener('click', () => {
    const raw = document.getElementById('adm-ai-output').value;
    if (!raw) return;

    const titleMatch = raw.match(/TIÊU ĐỀ:\s*(.+)/i);
    const summaryMatch = raw.match(/TÓM TẮT:\s*(.+)/i);
    const kwMatch = raw.match(/TỪ KHÓA SEO:\s*(.+)/i);
    const contentIdx = raw.search(/NỘI DUNG:\s*/i);

    resetArticleForm();
    document.getElementById('art-title').value = titleMatch ? titleMatch[1].trim() : 'Bài viết mới từ Trợ lý AI';
    document.getElementById('art-summary').value = summaryMatch ? summaryMatch[1].trim() : '';
    document.getElementById('art-keywords').value = kwMatch ? kwMatch[1].trim() : '';
    document.getElementById('art-content').value =
      contentIdx !== -1 ? raw.slice(contentIdx).replace(/NỘI DUNG:\s*/i, '').trim() : raw;
    document.getElementById('art-status').value = 'draft';

    switchAdminTab('articles');
    document.getElementById('admin-article-form').scrollIntoView({ behavior: 'smooth' });
  });

  // ==================== MESSAGES MANAGEMENT ====================
  document.getElementById('adm-summarize-msgs-btn')?.addEventListener('click', () => {
    switchAdminTab('ai-studio');
    aiTaskSelect.value = 'summarize_messages';
    document.getElementById('adm-ai-topic').value = 'Tóm tắt và phân loại tin nhắn khách hàng';
    runAdminAi('summarize_messages', {});
  });

  document.getElementById('admin-messages-list')?.addEventListener('click', async (e) => {
    const aiBtn = e.target.closest('[data-msg-ai-reply]');
    if (aiBtn) {
      const m = adminState.dashboard?.messages?.find((x) => x.id === aiBtn.dataset.msgAiReply);
      if (!m) return;
      switchAdminTab('ai-studio');
      aiTaskSelect.value = 'reply_visitor';
      document.getElementById('adm-ai-topic').value = m.message;
      document.getElementById('adm-ai-notes').value = `Khách tên: ${m.name}`;
      runAdminAi('reply_visitor', { visitorName: m.name, topic: m.message });
      return;
    }

    const toggleBtn = e.target.closest('[data-msg-toggle]');
    if (toggleBtn) {
      await fetch(`/api/admin/messages/${encodeURIComponent(toggleBtn.dataset.msgToggle)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toggleBtn.dataset.nextStatus })
      });
      await loadDashboard();
      return;
    }

    const delBtn = e.target.closest('[data-msg-del]');
    if (delBtn) {
      if (!confirm('Xóa tin nhắn này?')) return;
      await fetch(`/api/admin/messages/${encodeURIComponent(delBtn.dataset.msgDel)}`, {
        method: 'DELETE'
      });
      await loadDashboard();
    }
  });
})();
