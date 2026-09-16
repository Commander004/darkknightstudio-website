/* =====================================================
   DARKKNIGHT STUDIO — Theme Manager
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

const THEMES = ['darkknight', 'midnight', 'cyber', 'minimal', 'light'];
const STORAGE_KEY = 'dk_theme';

DK.theme = {
  current: 'darkknight',

  init() {
    // Load from localStorage first (instant)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.includes(saved)) {
      this.apply(saved, false);
    }

    // Try load global theme from Supabase (owner controlled)
    this.loadFromServer();

    // Theme toggle button
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.cycle());
    }
  },

  apply(name, save = true) {
    if (!THEMES.includes(name)) name = 'darkknight';
    this.current = name;
    document.documentElement.setAttribute('data-theme', name === 'darkknight' ? '' : name);
    // empty string = default :root (darkknight)
    if (name === 'darkknight') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', name);
    }
    if (save) localStorage.setItem(STORAGE_KEY, name);
  },

  cycle() {
    const idx = THEMES.indexOf(this.current);
    const next = THEMES[(idx + 1) % THEMES.length];
    this.apply(next);
    DK.toast(`تم: ${this.label(next)}`, 'info', 2000);
  },

  label(name) {
    const map = {
      darkknight: 'Darkknight',
      midnight: 'Midnight',
      cyber: 'Cyber',
      minimal: 'Minimal',
      light: 'Light'
    };
    return map[name] || name;
  },

  async loadFromServer() {
    if (!DK.supabase || !DK.isConfigured) return;
    try {
      const { data } = await DK.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'active_theme')
        .maybeSingle();

      if (data && data.value && THEMES.includes(data.value)) {
        this.apply(data.value, true);
      }

      // Also load custom CSS variables if any
      const { data: custom } = await DK.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'theme_custom')
        .maybeSingle();

      if (custom && custom.value) {
        try {
          const vars = typeof custom.value === 'string' ? JSON.parse(custom.value) : custom.value;
          this.applyCustom(vars);
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.warn('[DK Theme] Could not load from server:', e.message);
    }
  },

  applyCustom(vars) {
    if (!vars || typeof vars !== 'object') return;
    const root = document.documentElement;
    for (const [key, val] of Object.entries(vars)) {
      if (key.startsWith('--') && typeof val === 'string') {
        root.style.setProperty(key, val);
      }
    }
  },

  async saveGlobal(themeName) {
    if (!DK.supabase) return;
    await DK.supabase
      .from('site_settings')
      .upsert({ key: 'active_theme', value: themeName, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DK.theme.init();
});

window.DK = DK;
