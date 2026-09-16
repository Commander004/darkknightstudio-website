/* =====================================================
   DARKKNIGHT STUDIO — Main App (Homepage)
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

const App = {
  async init() {
    this.bindNav();
    this.bindMobileMenu();

    if (!DK.isConfigured) {
      this.showDemoMode();
      return;
    }

    await Promise.all([
      this.checkMaintenance(),
      this.loadProjects(),
      this.loadNews(),
      this.loadTeam(),
      this.loadStats(),
      this.loadLinks(),
      this.trackView()
    ]);

    this.startAdminPresence();
  },

  bindNav() {
    const links = DK.$$('.nav-link');
    const sections = DK.$$('section[id]');

    window.addEventListener('scroll', DK.debounce(() => {
      let current = '';
      sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 100) {
          current = sec.id;
        }
      });
      links.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }, 100));
  },

  bindMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
      document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    });

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        nav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  },

  async checkMaintenance() {
    try {
      const { data } = await DK.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (data && (data.value === true || data.value === 'true')) {
        // Allow admins to bypass
        const admin = await DK.getAdminProfile();
        if (!admin) {
          const overlay = document.getElementById('maintenance-overlay');
          if (overlay) overlay.classList.remove('hidden');
        }
      }
    } catch (e) {
      console.warn('Maintenance check failed', e);
    }
  },

  async loadProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    try {
      const { data, error } = await DK.supabase
        .from('projects')
        .select('*')
        .neq('status', 'ARCHIVED')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!data || data.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>هنوز پروژه‌ای ثبت نشده.</p></div>`;
        return;
      }

      grid.innerHTML = data.map(p => `
        <article class="project-card" data-id="${p.id}">
          <div class="project-banner">
            ${p.banner_url ? `<img src="${DK.escapeHtml(p.banner_url)}" alt="${DK.escapeHtml(p.title)}" loading="lazy">` : ''}
            <span class="project-status ${DK.statusClass(p.status)}">${DK.statusLabel(p.status)}</span>
          </div>
          <div class="project-body">
            <h3 class="project-title">${DK.escapeHtml(p.title)}</h3>
            <p class="project-desc">${DK.escapeHtml(DK.truncate(p.description, 100))}</p>
            <div class="project-meta">
              ${(p.tags || []).slice(0, 3).map(t => `<span class="tag">${DK.escapeHtml(t)}</span>`).join('')}
              ${(p.technologies || []).slice(0, 2).map(t => `<span class="tech">${DK.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        </article>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="error-state"><p>خطا در بارگذاری پروژه‌ها</p></div>`;
      console.error(e);
    }
  },

  async loadNews() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    try {
      const { data, error } = await DK.supabase
        .from('news')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (!data || data.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>خبری منتشر نشده.</p></div>`;
        return;
      }

      grid.innerHTML = data.map(n => `
        <article class="news-card">
          <div class="news-image">
            ${n.image_url ? `<img src="${DK.escapeHtml(n.image_url)}" alt="${DK.escapeHtml(n.title)}" loading="lazy">` : ''}
          </div>
          <div class="news-body">
            <div class="news-date">${DK.formatDate(n.published_at || n.created_at)}</div>
            <h3 class="news-title">${DK.escapeHtml(n.title)}</h3>
            <p class="news-excerpt">${DK.escapeHtml(DK.truncate(n.content, 140))}</p>
          </div>
        </article>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="error-state"><p>خطا در بارگذاری اخبار</p></div>`;
    }
  },

  async loadTeam() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    try {
      const { data, error } = await DK.supabase
        .from('team_members')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(8);

      if (error) throw error;

      if (!data || data.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>اعضای تیم هنوز اضافه نشدن.</p></div>`;
        return;
      }

      grid.innerHTML = data.map(m => `
        <div class="team-card">
          <div class="team-avatar">
            ${m.avatar_url
              ? `<img src="${DK.escapeHtml(m.avatar_url)}" alt="${DK.escapeHtml(m.name)}" loading="lazy">`
              : (m.name ? m.name.charAt(0) : '?')}
          </div>
          <div class="team-name">${DK.escapeHtml(m.name)}</div>
          <div class="team-role">${DK.escapeHtml(m.role || '')}</div>
          <div class="team-bio">${DK.escapeHtml(DK.truncate(m.bio, 80))}</div>
        </div>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="error-state"><p>خطا در بارگذاری تیم</p></div>`;
    }
  },

  async loadStats() {
    const grid = document.getElementById('stats-grid');
    const heroStats = document.getElementById('hero-stats');

    try {
      const { data, error } = await DK.supabase
        .from('statistics')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Update hero quick stats
      if (heroStats && data) {
        data.forEach(s => {
          const el = heroStats.querySelector(`[data-stat="${s.key}"]`);
          if (el) el.textContent = s.value ?? 0;
        });
      }

      // Full stats section
      if (grid) {
        if (!data || data.length === 0) {
          grid.innerHTML = `<div class="empty-state"><p>آماری تعریف نشده.</p></div>`;
          return;
        }
        grid.innerHTML = data.map(s => `
          <div class="stat-card">
            <span class="stat-value">${DK.escapeHtml(String(s.value ?? 0))}</span>
            <span class="stat-label">${DK.escapeHtml(s.label)}</span>
          </div>
        `).join('');
      }
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="error-state"><p>خطا در بارگذاری آمار</p></div>`;
    }
  },

  async loadLinks() {
    const grid = document.getElementById('links-grid');
    if (!grid) return;

    try {
      const { data, error } = await DK.supabase
        .from('official_links')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>لینکی ثبت نشده.</p></div>`;
        return;
      }

      grid.innerHTML = data.map(l => `
        <a href="${DK.escapeHtml(l.url)}" class="link-card" target="_blank" rel="noopener noreferrer">
          <span class="link-icon">${l.icon || '🔗'}</span>
          <span>${DK.escapeHtml(l.title)}</span>
        </a>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="error-state"><p>خطا در بارگذاری لینک‌ها</p></div>`;
    }
  },

  async trackView() {
    const el = document.getElementById('view-count');
    try {
      // Get current count
      const { data: stat } = await DK.supabase
        .from('statistics')
        .select('value')
        .eq('key', 'total_views')
        .maybeSingle();

      if (el) el.textContent = (stat?.value ?? 0).toLocaleString('fa-IR');

      // Increment if allowed (client + server side protection)
      if (DK.canIncrementView()) {
        const visitorId = DK.getVisitorId();
        await DK.supabase.from('visitor_events').insert({
          visitor_id: visitorId,
          event_type: 'page_view',
          page: location.pathname,
          user_agent: navigator.userAgent.slice(0, 200)
        });

        // Atomic increment via RPC if available, else fallback
        const { error } = await DK.supabase.rpc('increment_stat', { stat_key: 'total_views' });
        if (error) {
          // Fallback: read-modify-write (less ideal but works)
          if (stat) {
            await DK.supabase
              .from('statistics')
              .update({ value: (parseInt(stat.value) || 0) + 1, updated_at: new Date().toISOString() })
              .eq('key', 'total_views');
          }
        }

        if (el) {
          const newVal = (parseInt(stat?.value) || 0) + 1;
          el.textContent = newVal.toLocaleString('fa-IR');
        }
      }
    } catch (e) {
      if (el) el.textContent = '—';
    }
  },

  startAdminPresence() {
    // Public only reads the count; actual presence is updated from admin panel
    this.refreshAdminOnline();
    setInterval(() => this.refreshAdminOnline(), 30000);
  },

  async refreshAdminOnline() {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await DK.supabase
        .from('admin_presence')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fiveMinAgo);

      const el = document.querySelector('[data-stat="admins_online"]');
      if (el) el.textContent = count ?? 0;

      // Also update stats table if exists
      const statEl = document.querySelector('#stats-grid [data-key="admins_online"] .stat-value');
      if (statEl) statEl.textContent = count ?? 0;
    } catch { /* ignore */ }
  },

  showDemoMode() {
    // Show friendly message when Supabase is not configured
    const grids = ['projects-grid', 'news-grid', 'team-grid', 'stats-grid', 'links-grid'];
    grids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `
          <div class="empty-state">
            <p>برای فعال‌سازی داده‌های واقعی، کلیدهای Supabase را در فایل HTML تنظیم کنید.</p>
            <p style="margin-top:8px;font-size:0.85rem;color:var(--text-muted)">
              window.DK_CONFIG.SUPABASE_URL و SUPABASE_ANON_KEY
            </p>
          </div>`;
      }
    });

    // Demo stats
    const hero = document.getElementById('hero-stats');
    if (hero) {
      hero.querySelector('[data-stat="projects"]').textContent = '—';
      hero.querySelector('[data-stat="members"]').textContent = '—';
      hero.querySelector('[data-stat="admins_online"]').textContent = '—';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
