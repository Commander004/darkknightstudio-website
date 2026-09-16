/* =====================================================
   DARKKNIGHT STUDIO — Supabase Client
   Uses CDN version of @supabase/supabase-js
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

DK.supabase = null;
DK.isConfigured = false;

/**
 * Initialize Supabase client.
 * Reads from window.DK_CONFIG
 */
DK.initSupabase = function () {
  const cfg = window.DK_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn('[DK] Supabase credentials not set. Edit window.DK_CONFIG in index.html (or each page).');
    DK.isConfigured = false;
    return null;
  }

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[DK] Supabase JS library not loaded from CDN.');
    return null;
  }

  DK.supabase = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: { eventsPerSecond: 5 }
    }
  });

  DK.isConfigured = true;
  return DK.supabase;
};

/**
 * Get current session
 */
DK.getSession = async function () {
  if (!DK.supabase) return null;
  const { data: { session } } = await DK.supabase.auth.getSession();
  return session;
};

/**
 * Get current user
 */
DK.getUser = async function () {
  if (!DK.supabase) return null;
  const { data: { user } } = await DK.supabase.auth.getUser();
  return user;
};

/**
 * Sign in with email/password
 */
DK.signIn = async function (email, password) {
  if (!DK.supabase) throw new Error('Supabase not configured');
  const { data, error } = await DK.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/**
 * Sign out
 */
DK.signOut = async function () {
  if (!DK.supabase) return;
  await DK.supabase.auth.signOut();
};

/**
 * Check if current user is admin/owner (via profiles or admins table)
 */
DK.getAdminProfile = async function () {
  if (!DK.supabase) return null;
  const user = await DK.getUser();
  if (!user) return null;

  const { data, error } = await DK.supabase
    .from('admins')
    .select('*, roles(name, permissions)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('[DK] getAdminProfile error:', error.message);
    return null;
  }
  return data;
};

/**
 * Safe select helper
 */
DK.db = {
  async select(table, options = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    let q = DK.supabase.from(table).select(options.select || '*');
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) q = q.eq(k, v);
    }
    if (options.neq) {
      for (const [k, v] of Object.entries(options.neq)) q = q.neq(k, v);
    }
    if (options.order) {
      q = q.order(options.order.column, { ascending: options.order.asc !== false });
    }
    if (options.limit) q = q.limit(options.limit);
    if (options.single) q = q.maybeSingle();
    return q;
  },

  async insert(table, row) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    return DK.supabase.from(table).insert(row).select().maybeSingle();
  },

  async update(table, id, updates) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    return DK.supabase.from(table).update(updates).eq('id', id).select().maybeSingle();
  },

  async delete(table, id) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    return DK.supabase.from(table).delete().eq('id', id);
  },

  async rpc(fn, params = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    return DK.supabase.rpc(fn, params);
  }
};

// Auto-init when script loads (after config is set)
document.addEventListener('DOMContentLoaded', () => {
  DK.initSupabase();
});

window.DK = DK;
