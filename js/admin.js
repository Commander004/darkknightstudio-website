/* =====================================================
   DARKKNIGHT STUDIO — Admin Panel Logic
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

const Admin = {
  profile: null,
  presenceInterval: null,

  async init() {
    if (!DK.isConfigured) {
      DK.toast('ابتدا SUPABASE_URL و ANON_KEY را تنظیم کن', 'error', 6000);
    }

    this.bindLogin();
    this.bindNav();
    this.bindSidebar();
    this.bindModals();
    this.bindActions();

    const session = await DK.getSession();
    if (session) {
      await this.enterDashboard();
    }
  },

  bindLogin() {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      try {
        await DK.signIn(email, password);
        await this.enterDashboard();
      } catch (err) {
        DK.toast(err.message || 'ورود ناموفق', 'error');
      }
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await this.stopPresence();
      await DK.signOut();
      document.getElementById('dashboard').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
    });
  },

  async enterDashboard() {
    this.profile = await DK.getAdminProfile();
    if (!this.profile) {
      await DK.signOut();
      DK.toast('شما ادمین نیستید. اول اکانت Owner را در دیتابیس ثبت کن.', 'error', 6000);
      return;
    }

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('admin-name').textContent =
      this.profile.display_name || this.profile.roles?.name || 'ادمین';

    await this.loadOverview();
    this.startPresence();
    this.logAction('login', 'auth', null, {});
  },

  bindNav() {
    DK.$$('.admin-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        DK.$$('.admin-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        DK.$$('.admin-page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById('page-' + btn.dataset.page);
        if (page) page.classList.add('active');
        this.loadPage(btn.dataset.page);

        // close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('open');
      });
    });
  },

  bindSidebar() {
    document.getElementById('admin-menu-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('open');
    });
  },

  bindModals() {
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal') this.closeModal();
    });
  },

  bindActions() {
    document.getElementById('btn-add-project')?.addEventListener('click', () => this.showProjectForm());
    document.getElementById('btn-add-news')?.addEventListener('click', () => this.showNewsForm());
    document.getElementById('btn-add-member')?.addEventListener('click', () => this.showMemberForm());
    document.getElementById('btn-add-stat')?.addEventListener('click', () => this.showStatForm());
    document.getElementById('btn-add-link')?.addEventListener('click', () => this.showLinkForm());
    document.getElementById('btn-save-theme')?.addEventListener('click', () => this.saveTheme());
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
  },

  openModal(title, bodyHtml, footerHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml || '';
    document.getElementById('modal').classList.add('active');
  },

  closeModal() {
    document.getElementById('modal').classList.remove('active');
  },

  async loadPage(name) {
    const loaders = {
      overview: () => this.loadOverview(),
      projects: () => this.loadProjects(),
      news: () => this.loadNews(),
      team: () => this.loadTeam(),
      stats: () => this.loadStats(),
      links: () => this.loadLinks(),
      tickets: () => this.loadTickets(),
      applications: () => this.loadApplications(),
      theme: () => this.loadThemeSettings(),
      settings: () => this.loadSettings(),
      logs: () => this.loadLogs()
    };
    if (loaders[name]) await loaders[name]();
  },

  // ========== OVERVIEW ==========
  async loadOverview() {
    try {
      const [projects, news, tickets, views] = await Promise.all([
        DK.supabase.from('projects').select('*', { count: 'exact', head: true }),
        DK.supabase.from('news').select('*', { count: 'exact', head: true }),
        DK.supabase.from('tickets').select('*', { count: 'exact', head: true }).neq('status', 'CLOSED'),
        DK.supabase.from('statistics').select('value').eq('key', 'total_views').maybeSingle()
      ]);
      document.getElementById('ov-projects').textContent = projects.count ?? 0;
      document.getElementById('ov-news').textContent = news.count ?? 0;
      document.getElementById('ov-tickets').textContent = tickets.count ?? 0;
      document.getElementById('ov-views').textContent = views.data?.value ?? 0;
    } catch (e) {
      console.error(e);
    }
  },

  // ========== PROJECTS ==========
  async loadProjects() {
    const tbody = document.getElementById('projects-tbody');
    const { data, error } = await DK.supabase
      .from('projects')
      .select('*')
      .order('display_order');

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5">خطا: ${DK.escapeHtml(error.message)}</td></tr>`;
      return;
    }
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="5">پروژه‌ای نیست</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${DK.escapeHtml(p.title)}</td>
        <td><span class="badge badge-info">${DK.statusLabel(p.status)}</span></td>
        <td>${DK.escapeHtml(p.version || '—')}</td>
        <td>${p.display_order}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="Admin.showProjectForm('${p.id}')">ویرایش</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin.deleteProject('${p.id}')">حذف</button>
        </td>
      </tr>
    `).join('');
  },

  showProjectForm(id = null) {
    const isEdit = !!id;
    this.openModal(isEdit ? 'ویرایش پروژه' : 'پروژه جدید', `
      <div class="form-group"><label class="form-label">عنوان</label>
        <input class="form-input" id="f-title" required></div>
      <div class="form-group"><label class="form-label">توضیحات</label>
        <textarea class="form-textarea" id="f-desc"></textarea></div>
      <div class="form-group"><label class="form-label">وضعیت</label>
        <select class="form-select" id="f-status">
          <option value="IN_DEVELOPMENT">در حال توسعه</option>
          <option value="ONLINE">آنلاین</option>
          <option value="OFFLINE">آفلاین</option>
          <option value="ARCHIVED">آرشیو</option>
        </select></div>
      <div class="form-group"><label class="form-label">نسخه</label>
        <input class="form-input" id="f-version" value="1.0.0"></div>
      <div class="form-group"><label class="form-label">تگ‌ها (با کاما)</label>
        <input class="form-input" id="f-tags" placeholder="game, multiplayer"></div>
      <div class="form-group"><label class="form-label">تکنولوژی‌ها (با کاما)</label>
        <input class="form-input" id="f-tech" placeholder="Unity, C#"></div>
      <div class="form-group"><label class="form-label">آدرس بنر</label>
        <input class="form-input" id="f-banner" placeholder="https://..."></div>
      <div class="form-group"><label class="form-label">ترتیب نمایش</label>
        <input class="form-input" id="f-order" type="number" value="0"></div>
    `, `
      <button class="btn btn-secondary" onclick="Admin.closeModal()">انصراف</button>
      <button class="btn btn-primary" id="f-save">ذخیره</button>
    `);

    if (isEdit) {
      DK.supabase.from('projects').select('*').eq('id', id).single().then(({ data }) => {
        if (!data) return;
        document.getElementById('f-title').value = data.title || '';
        document.getElementById('f-desc').value = data.description || '';
        document.getElementById('f-status').value = data.status;
        document.getElementById('f-version').value = data.version || '';
        document.getElementById('f-tags').value = (data.tags || []).join(', ');
        document.getElementById('f-tech').value = (data.technologies || []).join(', ');
        document.getElementById('f-banner').value = data.banner_url || '';
        document.getElementById('f-order').value = data.display_order || 0;
      });
    }

    document.getElementById('f-save').onclick = async () => {
      const row = {
        title: document.getElementById('f-title').value.trim(),
        description: document.getElementById('f-desc').value.trim(),
        status: document.getElementById('f-status').value,
        version: document.getElementById('f-version').value.trim(),
        tags: document.getElementById('f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        technologies: document.getElementById('f-tech').value.split(',').map(s => s.trim()).filter(Boolean),
        banner_url: document.getElementById('f-banner').value.trim() || null,
        display_order: parseInt(document.getElementById('f-order').value) || 0
      };
      if (!row.title) { DK.toast('عنوان الزامی است', 'error'); return; }

      try {
        if (isEdit) {
          await DK.supabase.from('projects').update(row).eq('id', id);
          this.logAction('update', 'project', id, { title: row.title });
        } else {
          const { data } = await DK.supabase.from('projects').insert(row).select().single();
          this.logAction('create', 'project', data?.id, { title: row.title });
        }
        DK.toast('ذخیره شد', 'success');
        this.closeModal();
        this.loadProjects();
      } catch (e) {
        DK.toast(e.message, 'error');
      }
    };
  },

  async deleteProject(id) {
    if (!DK.confirm('پروژه حذف بشه؟')) return;
    await DK.supabase.from('projects').delete().eq('id', id);
    this.logAction('delete', 'project', id, {});
    DK.toast('حذف شد', 'success');
    this.loadProjects();
  },

  // ========== NEWS ==========
  async loadNews() {
    const tbody = document.getElementById('news-tbody');
    const { data } = await DK.supabase.from('news').select('*').order('created_at', { ascending: false });
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="4">خبری نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(n => `
      <tr>
        <td>${DK.escapeHtml(n.title)}</td>
        <td><span class="badge ${n.status === 'PUBLISHED' ? 'badge-success' : 'badge-muted'}">${DK.statusLabel(n.status)}</span></td>
        <td>${DK.formatDate(n.published_at || n.created_at)}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="Admin.showNewsForm('${n.id}')">ویرایش</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin.deleteNews('${n.id}')">حذف</button>
        </td>
      </tr>
    `).join('');
  },

  showNewsForm(id = null) {
    const isEdit = !!id;
    this.openModal(isEdit ? 'ویرایش خبر' : 'خبر جدید', `
      <div class="form-group"><label class="form-label">عنوان</label>
        <input class="form-input" id="f-title" required></div>
      <div class="form-group"><label class="form-label">محتوا</label>
        <textarea class="form-textarea" id="f-content" style="min-height:160px"></textarea></div>
      <div class="form-group"><label class="form-label">آدرس تصویر</label>
        <input class="form-input" id="f-image"></div>
      <div class="form-group"><label class="form-label">نویسنده</label>
        <input class="form-input" id="f-author"></div>
      <div class="form-group"><label class="form-label">وضعیت</label>
        <select class="form-select" id="f-status">
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">منتشر شده</option>
          <option value="ARCHIVED">آرشیو</option>
        </select></div>
    `, `
      <button class="btn btn-secondary" onclick="Admin.closeModal()">انصراف</button>
      <button class="btn btn-primary" id="f-save">ذخیره</button>
    `);

    if (isEdit) {
      DK.supabase.from('news').select('*').eq('id', id).single().then(({ data }) => {
        if (!data) return;
        document.getElementById('f-title').value = data.title;
        document.getElementById('f-content').value = data.content;
        document.getElementById('f-image').value = data.image_url || '';
        document.getElementById('f-author').value = data.author || '';
        document.getElementById('f-status').value = data.status;
      });
    }

    document.getElementById('f-save').onclick = async () => {
      const status = document.getElementById('f-status').value;
      const row = {
        title: document.getElementById('f-title').value.trim(),
        content: document.getElementById('f-content').value.trim(),
        image_url: document.getElementById('f-image').value.trim() || null,
        author: document.getElementById('f-author').value.trim() || null,
        status,
        published_at: status === 'PUBLISHED' ? new Date().toISOString() : null
      };
      if (!row.title || !row.content) { DK.toast('عنوان و محتوا الزامی', 'error'); return; }

      try {
        if (isEdit) {
          await DK.supabase.from('news').update(row).eq('id', id);
        } else {
          await DK.supabase.from('news').insert(row);
        }
        this.logAction(isEdit ? 'update' : 'create', 'news', id, { title: row.title });
        DK.toast('ذخیره شد', 'success');
        this.closeModal();
        this.loadNews();
      } catch (e) {
        DK.toast(e.message, 'error');
      }
    };
  },

  async deleteNews(id) {
    if (!DK.confirm('خبر حذف بشه؟')) return;
    await DK.supabase.from('news').delete().eq('id', id);
    this.logAction('delete', 'news', id, {});
    this.loadNews();
  },

  // ========== TEAM ==========
  async loadTeam() {
    const tbody = document.getElementById('team-tbody');
    const { data } = await DK.supabase.from('team_members').select('*').order('display_order');
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="4">عضوی نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(m => `
      <tr>
        <td>${DK.escapeHtml(m.name)}</td>
        <td>${DK.escapeHtml(m.role || '—')}</td>
        <td>${m.is_visible ? '✅' : '❌'}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="Admin.showMemberForm('${m.id}')">ویرایش</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin.deleteMember('${m.id}')">حذف</button>
        </td>
      </tr>
    `).join('');
  },

  showMemberForm(id = null) {
    const isEdit = !!id;
    this.openModal(isEdit ? 'ویرایش عضو' : 'عضو جدید', `
      <div class="form-group"><label class="form-label">نام</label><input class="form-input" id="f-name"></div>
      <div class="form-group"><label class="form-label">نقش</label><input class="form-input" id="f-role"></div>
      <div class="form-group"><label class="form-label">بیو</label><textarea class="form-textarea" id="f-bio"></textarea></div>
      <div class="form-group"><label class="form-label">آواتار URL</label><input class="form-input" id="f-avatar"></div>
      <div class="form-group"><label class="form-label">نمایش عمومی</label>
        <select class="form-select" id="f-visible"><option value="true">بله</option><option value="false">خیر</option></select></div>
    `, `<button class="btn btn-secondary" onclick="Admin.closeModal()">انصراف</button>
        <button class="btn btn-primary" id="f-save">ذخیره</button>`);

    if (isEdit) {
      DK.supabase.from('team_members').select('*').eq('id', id).single().then(({ data }) => {
        if (!data) return;
        document.getElementById('f-name').value = data.name;
        document.getElementById('f-role').value = data.role || '';
        document.getElementById('f-bio').value = data.bio || '';
        document.getElementById('f-avatar').value = data.avatar_url || '';
        document.getElementById('f-visible').value = String(data.is_visible);
      });
    }

    document.getElementById('f-save').onclick = async () => {
      const row = {
        name: document.getElementById('f-name').value.trim(),
        role: document.getElementById('f-role').value.trim(),
        bio: document.getElementById('f-bio').value.trim(),
        avatar_url: document.getElementById('f-avatar').value.trim() || null,
        is_visible: document.getElementById('f-visible').value === 'true'
      };
      if (!row.name) return DK.toast('نام الزامی', 'error');
      if (isEdit) await DK.supabase.from('team_members').update(row).eq('id', id);
      else await DK.supabase.from('team_members').insert(row);
      DK.toast('ذخیره شد', 'success');
      this.closeModal();
      this.loadTeam();
    };
  },

  async deleteMember(id) {
    if (!DK.confirm('حذف بشه؟')) return;
    await DK.supabase.from('team_members').delete().eq('id', id);
    this.loadTeam();
  },

  // ========== STATS ==========
  async loadStats() {
    const tbody = document.getElementById('stats-tbody');
    const { data } = await DK.supabase.from('statistics').select('*').order('display_order');
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="5">آماری نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(s => `
      <tr>
        <td><code>${DK.escapeHtml(s.key)}</code></td>
        <td>${DK.escapeHtml(s.label)}</td>
        <td>
          <input type="number" class="form-input" style="width:100px;min-height:32px;padding:4px 8px"
            value="${s.value}" data-stat-id="${s.id}" onchange="Admin.updateStatValue('${s.id}', this.value)">
        </td>
        <td>${s.is_visible ? '✅' : '❌'}</td>
        <td><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin.deleteStat('${s.id}')">حذف</button></td>
      </tr>
    `).join('');
  },

  async updateStatValue(id, val) {
    await DK.supabase.from('statistics').update({ value: parseInt(val) || 0 }).eq('id', id);
    DK.toast('آپدیت شد', 'success', 1500);
  },

  showStatForm() {
    this.openModal('آمار جدید', `
      <div class="form-group"><label class="form-label">کلید (انگلیسی)</label><input class="form-input" id="f-key" placeholder="custom_stat"></div>
      <div class="form-group"><label class="form-label">برچسب</label><input class="form-input" id="f-label"></div>
      <div class="form-group"><label class="form-label">مقدار</label><input class="form-input" id="f-value" type="number" value="0"></div>
    `, `<button class="btn btn-secondary" onclick="Admin.closeModal()">انصراف</button>
        <button class="btn btn-primary" id="f-save">ذخیره</button>`);

    document.getElementById('f-save').onclick = async () => {
      const key = document.getElementById('f-key').value.trim();
      const label = document.getElementById('f-label').value.trim();
      const value = parseInt(document.getElementById('f-value').value) || 0;
      if (!key || !label) return DK.toast('کلید و برچسب الزامی', 'error');
      await DK.supabase.from('statistics').insert({ key, label, value, is_visible: true });
      DK.toast('اضافه شد', 'success');
      this.closeModal();
      this.loadStats();
    };
  },

  async deleteStat(id) {
    if (!DK.confirm('حذف؟')) return;
    await DK.supabase.from('statistics').delete().eq('id', id);
    this.loadStats();
  },

  // ========== LINKS ==========
  async loadLinks() {
    const tbody = document.getElementById('links-tbody');
    const { data } = await DK.supabase.from('official_links').select('*').order('display_order');
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="4">لینکی نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(l => `
      <tr>
        <td>${l.icon || ''} ${DK.escapeHtml(l.title)}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${DK.escapeHtml(l.url)}</td>
        <td>${l.is_visible ? '✅' : '❌'}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="Admin.deleteLink('${l.id}')" style="color:var(--danger)">حذف</button>
        </td>
      </tr>
    `).join('');
  },

  showLinkForm() {
    this.openModal('لینک جدید', `
      <div class="form-group"><label class="form-label">عنوان</label><input class="form-input" id="f-title"></div>
      <div class="form-group"><label class="form-label">آدرس</label><input class="form-input" id="f-url" placeholder="https://"></div>
      <div class="form-group"><label class="form-label">آیکون (ایموجی)</label><input class="form-input" id="f-icon" value="🔗"></div>
    `, `<button class="btn btn-secondary" onclick="Admin.closeModal()">انصراف</button>
        <button class="btn btn-primary" id="f-save">ذخیره</button>`);

    document.getElementById('f-save').onclick = async () => {
      const title = document.getElementById('f-title').value.trim();
      const url = document.getElementById('f-url').value.trim();
      const icon = document.getElementById('f-icon').value.trim();
      if (!title || !url) return DK.toast('عنوان و آدرس الزامی', 'error');
      await DK.supabase.from('official_links').insert({ title, url, icon, is_visible: true });
      DK.toast('اضافه شد', 'success');
      this.closeModal();
      this.loadLinks();
    };
  },

  async deleteLink(id) {
    if (!DK.confirm('حذف؟')) return;
    await DK.supabase.from('official_links').delete().eq('id', id);
    this.loadLinks();
  },

  // ========== TICKETS ==========
  async loadTickets() {
    const tbody = document.getElementById('tickets-tbody');
    const { data } = await DK.supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="6">تیکتی نیست</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td>${DK.escapeHtml(t.subject)}</td>
        <td><span class="badge ${t.status === 'OPEN' ? 'badge-success' : t.status === 'CLOSED' ? 'badge-muted' : 'badge-warning'}">${DK.statusLabel(t.status)}</span></td>
        <td>${t.priority}</td>
        <td>${DK.escapeHtml(t.creator_name)}</td>
        <td>${DK.timeAgo(t.created_at)}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm" onclick="Admin.viewTicket('${t.id}')">مشاهده</button>
          ${t.status !== 'CLOSED'
            ? `<button class="btn btn-ghost btn-sm" onclick="Admin.closeTicket('${t.id}')">بستن</button>`
            : `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin.deleteTicket('${t.id}')">حذف</button>`}
        </td>
      </tr>
    `).join('');
  },

  async viewTicket(id) {
    const { data: ticket } = await DK.supabase.from('tickets').select('*').eq('id', id).single();
    const { data: messages } = await DK.supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at');

    const msgsHtml = (messages || []).map(m => `
      <div style="margin-bottom:10px;padding:10px;background:var(--bg);border-radius:8px">
        <strong>${DK.escapeHtml(m.sender_name || m.sender_type)}</strong>
        <span style="color:var(--text-muted);font-size:0.8rem"> · ${DK.timeAgo(m.created_at)}</span>
        <p style="margin-top:4px">${DK.escapeHtml(m.content)}</p>
      </div>
    `).join('');

    this.openModal(`تیکت: ${ticket?.subject || ''}`, `
      <div style="margin-bottom:12px;font-size:0.85rem;color:var(--text-muted)">
        وضعیت: ${DK.statusLabel(ticket?.status)} · اولویت: ${ticket?.priority}<br>
        از: ${DK.escapeHtml(ticket?.creator_name)} ${ticket?.creator_email ? '(' + DK.escapeHtml(ticket.creator_email) + ')' : ''}
      </div>
      <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">${msgsHtml || '<p>پیامی نیست</p>'}</div>
      ${ticket?.status !== 'CLOSED' ? `
        <div class="form-group">
          <label class="form-label">پاسخ ادمین</label>
          <textarea class="form-textarea" id="admin-reply"></textarea>
        </div>
      ` : '<p style="color:var(--warning)">تیکت بسته شده. می‌توانید آن را برای همیشه حذف کنید تا دیگر کسی نتواند ببیند.</p>'}
    `, ticket?.status !== 'CLOSED' ? `
      <button class="btn btn-secondary" onclick="Admin.closeModal()">بستن</button>
      <button class="btn btn-primary" onclick="Admin.replyTicket('${id}')">ارسال پاسخ</button>
      <button class="btn btn-ghost btn-sm" onclick="Admin.closeTicket('${id}')">بستن تیکت</button>
    ` : `
      <button class="btn btn-secondary" onclick="Admin.closeModal()">بستن</button>
      <button class="btn btn-danger" onclick="Admin.deleteTicket('${id}')">حذف کامل تیکت</button>
    `);
  },

  async replyTicket(id) {
    const content = document.getElementById('admin-reply')?.value?.trim();
    if (!content) return DK.toast('پیام خالیه', 'error');

    await DK.supabase.from('ticket_messages').insert({
      ticket_id: id,
      sender_type: 'admin',
      sender_name: this.profile?.display_name || 'Admin',
      sender_admin_id: this.profile?.id,
      content
    });

    await DK.supabase.from('tickets').update({
      status: 'IN_PROGRESS',
      updated_at: new Date().toISOString()
    }).eq('id', id);

    this.logAction('reply', 'ticket', id, {});
    DK.toast('پاسخ ارسال شد', 'success');
    this.closeModal();
    this.loadTickets();
  },

  async closeTicket(id) {
    if (!DK.confirm('تیکت بسته بشه؟ بعد از بستن می‌تونی کامل حذفش کنی.')) return;
    const { error } = await DK.supabase.rpc('close_ticket', { ticket_uuid: id });
    if (error) {
      // fallback if RPC unavailable
      await DK.supabase.from('tickets').update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', id);
    }
    this.logAction('close', 'ticket', id, {});
    DK.toast('تیکت بسته شد. حالا می‌تونی حذف کامل کنی.', 'info');
    this.closeModal();
    this.loadTickets();
    // Immediately open view so delete button is visible
    setTimeout(() => this.viewTicket(id), 200);
  },

  async deleteTicket(id) {
    if (!DK.confirm('تیکت برای همیشه حذف شود؟ دیگر کسی نمی‌تواند آن را ببیند.')) return;
    const { error } = await DK.supabase.from('tickets').delete().eq('id', id);
    if (error) {
      DK.toast('خطا در حذف تیکت: ' + (error.message || 'نامشخص'), 'error');
      return;
    }
    this.logAction('delete', 'ticket', id, {});
    DK.toast('تیکت کامل حذف شد', 'success');
    this.closeModal();
    this.loadTickets();
  },

  // ========== APPLICATIONS ==========
  async loadApplications() {
    const tbody = document.getElementById('apps-tbody');
    const { data } = await DK.supabase
      .from('team_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="5">درخواستی نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(a => `
      <tr>
        <td>${DK.escapeHtml(a.name)}</td>
        <td>${DK.escapeHtml(DK.truncate(a.skills, 40))}</td>
        <td><span class="badge badge-info">${DK.statusLabel(a.status)}</span></td>
        <td>${DK.timeAgo(a.created_at)}</td>
        <td class="admin-actions">
          ${a.status === 'PENDING' ? `
            <button class="btn btn-ghost btn-sm" onclick="Admin.setAppStatus('${a.id}','ACCEPTED')">قبول</button>
            <button class="btn btn-ghost btn-sm" onclick="Admin.setAppStatus('${a.id}','REJECTED')">رد</button>
          ` : ''}
          <button class="btn btn-ghost btn-sm" onclick="Admin.setAppStatus('${a.id}','ARCHIVED')">آرشیو</button>
        </td>
      </tr>
    `).join('');
  },

  async setAppStatus(id, status) {
    await DK.supabase.from('team_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    this.loadApplications();
  },

  // ========== THEME & SETTINGS ==========
  async loadThemeSettings() {
    const { data } = await DK.supabase.from('site_settings').select('value').eq('key', 'active_theme').maybeSingle();
    if (data?.value) {
      const val = typeof data.value === 'string' ? data.value.replace(/"/g, '') : data.value;
      document.getElementById('theme-select').value = val;
    }
  },

  async saveTheme() {
    const theme = document.getElementById('theme-select').value;
    await DK.supabase.from('site_settings').upsert({
      key: 'active_theme',
      value: JSON.stringify(theme),
      updated_at: new Date().toISOString()
    });
    DK.theme.apply(theme);
    this.logAction('theme_change', 'settings', null, { theme });
    DK.toast('تم سراسری ذخیره شد', 'success');
  },

  async loadSettings() {
    const { data } = await DK.supabase.from('site_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
    if (data) {
      const val = data.value === true || data.value === 'true' || data.value === '"true"';
      document.getElementById('maintenance-select').value = val ? 'true' : 'false';
    }
  },

  async saveSettings() {
    const val = document.getElementById('maintenance-select').value === 'true';
    await DK.supabase.from('site_settings').upsert({
      key: 'maintenance_mode',
      value: val,
      updated_at: new Date().toISOString()
    });
    this.logAction('settings_change', 'settings', null, { maintenance: val });
    DK.toast('تنظیمات ذخیره شد', 'success');
  },

  // ========== LOGS ==========
  async loadLogs() {
    const tbody = document.getElementById('logs-tbody');
    const { data } = await DK.supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="4">لاگی نیست</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(l => `
      <tr>
        <td>${DK.escapeHtml(l.action)}</td>
        <td>${DK.escapeHtml(l.entity_type || '—')}</td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${DK.escapeHtml(JSON.stringify(l.details || {}).slice(0, 60))}</td>
        <td>${DK.timeAgo(l.created_at)}</td>
      </tr>
    `).join('');
  },

  async logAction(action, entityType, entityId, details) {
    try {
      await DK.supabase.from('activity_logs').insert({
        admin_id: this.profile?.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      });
    } catch { /* non-critical */ }
  },

  // ========== PRESENCE ==========
  startPresence() {
    this.beatPresence();
    this.presenceInterval = setInterval(() => this.beatPresence(), 30000);
  },

  async beatPresence() {
    if (!this.profile?.id) return;
    try {
      await DK.supabase.from('admin_presence').upsert({
        admin_id: this.profile.id,
        last_seen: new Date().toISOString(),
        is_online: true
      });
    } catch { /* ignore */ }
  },

  async stopPresence() {
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    if (this.profile?.id) {
      try {
        await DK.supabase.from('admin_presence').upsert({
          admin_id: this.profile.id,
          last_seen: new Date().toISOString(),
          is_online: false
        });
      } catch { /* ignore */ }
    }
  }
};

// Expose for inline onclick handlers
window.Admin = Admin;

document.addEventListener('DOMContentLoaded', () => Admin.init());
