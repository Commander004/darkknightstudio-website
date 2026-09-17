/* =====================================================
   DARKKNIGHT STUDIO — Support / Tickets
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

const Support = {
  currentTicket: null,
  accessToken: null,
  realtimeChannel: null,

  init() {
    this.bindMobileMenu();
    this.bindForm();
    this.bindAccess();
    this.bindChat();

    // Restore token from URL or localStorage
    const params = new URLSearchParams(location.search);
    const token = params.get('token') || localStorage.getItem('dk_ticket_token');
    if (token) {
      document.getElementById('access-token').value = token;
      this.openTicket(token);
    }
  },

  bindMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
    });
  },

  bindForm() {
    const form = document.getElementById('ticket-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createTicket();
    });
  },

  bindAccess() {
    document.getElementById('access-btn')?.addEventListener('click', () => {
      const token = document.getElementById('access-token').value.trim();
      if (!token) {
        DK.toast('کد دسترسی را وارد کن', 'error');
        return;
      }
      this.openTicket(token);
    });
  },

  bindChat() {
    document.getElementById('chat-send')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    document.getElementById('leave-chat')?.addEventListener('click', () => this.leaveChat());
  },

  async createTicket() {
    if (!DK.isConfigured) {
      DK.toast('Supabase تنظیم نشده. اول کلیدها رو بذار.', 'error');
      return;
    }

    const name = document.getElementById('t-name').value.trim();
    const email = document.getElementById('t-email').value.trim();
    const subject = document.getElementById('t-subject').value.trim();
    const category = document.getElementById('t-category').value;
    const priority = document.getElementById('t-priority').value;
    const message = document.getElementById('t-message').value.trim();

    if (!name || !subject || !message) {
      DK.toast('فیلدهای ضروری رو پر کن', 'error');
      return;
    }

    const accessToken = DK.randomToken(40);

    try {
      const { data: ticket, error } = await DK.supabase
        .from('tickets')
        .insert({
          access_token: accessToken,
          subject,
          category,
          priority,
          status: 'OPEN',
          creator_name: name,
          creator_email: email || null,
          creator_visitor_id: DK.getVisitorId()
        })
        .select()
        .single();

      if (error) throw error;

      // First message
      await DK.supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'visitor',
        sender_name: name,
        content: message
      });

      localStorage.setItem('dk_ticket_token', accessToken);
      DK.toast('تیکت با موفقیت ثبت شد!', 'success');
      document.getElementById('ticket-form').reset();
      await this.openTicket(accessToken);
    } catch (e) {
      console.error(e);
      DK.toast('خطا در ثبت تیکت: ' + (e.message || 'unknown'), 'error');
    }
  },

  async openTicket(token) {
    if (!DK.isConfigured) {
      DK.toast('Supabase تنظیم نشده', 'error');
      return;
    }

    try {
      const { data: ticket, error } = await DK.supabase
        .from('tickets')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();

      if (error) throw error;
      if (!ticket) {
        DK.toast('تیکت پیدا نشد. کد رو چک کن.', 'error');
        return;
      }

      if (ticket.status === 'CLOSED') {
        DK.toast('این تیکت بسته شده است. امکان ارسال پیام جدید وجود ندارد.', 'info');
      }

      this.currentTicket = ticket;
      this.accessToken = token;
      localStorage.setItem('dk_ticket_token', token);

      document.getElementById('access-box').style.display = 'none';
      document.getElementById('chat-box').classList.add('active');

      document.getElementById('ticket-info').innerHTML = `
        <strong>${DK.escapeHtml(ticket.subject)}</strong><br>
        وضعیت: ${DK.statusLabel(ticket.status)} · اولویت: ${ticket.priority} · 
        کد: <code style="user-select:all">${DK.escapeHtml(token.slice(0, 12))}…</code>
      `;

      await this.loadMessages();
      this.subscribeRealtime();
    } catch (e) {
      console.error(e);
      DK.toast('خطا در باز کردن تیکت', 'error');
    }
  },

  async loadMessages() {
    if (!this.currentTicket) return;
    const box = document.getElementById('chat-messages');

    const { data, error } = await DK.supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', this.currentTicket.id)
      .order('created_at', { ascending: true });

    if (error) {
      box.innerHTML = '<p style="color:var(--danger)">خطا در بارگذاری پیام‌ها</p>';
      return;
    }

    box.innerHTML = (data || []).map(m => `
      <div class="chat-msg ${m.sender_type === 'admin' ? 'admin' : 'user'}">
        <div class="bubble">${DK.escapeHtml(m.content)}</div>
        <div class="meta">${DK.escapeHtml(m.sender_name || m.sender_type)} · ${DK.timeAgo(m.created_at)}</div>
      </div>
    `).join('');

    box.scrollTop = box.scrollHeight;
  },

  subscribeRealtime() {
    if (this.realtimeChannel) {
      DK.supabase.removeChannel(this.realtimeChannel);
    }
    if (!this.currentTicket) return;

    this.realtimeChannel = DK.supabase
      .channel(`ticket:${this.currentTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${this.currentTicket.id}`
      }, (payload) => {
        this.appendMessage(payload.new);
      })
      .subscribe();
  },

  appendMessage(m) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${m.sender_type === 'admin' ? 'admin' : 'user'}`;
    div.innerHTML = `
      <div class="bubble">${DK.escapeHtml(m.content)}</div>
      <div class="meta">${DK.escapeHtml(m.sender_name || m.sender_type)} · ${DK.timeAgo(m.created_at)}</div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  async sendMessage() {
    if (!this.currentTicket || this.currentTicket.status === 'CLOSED') {
      DK.toast('تیکت بسته است', 'error');
      return;
    }

    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';

    try {
      const { error } = await DK.supabase.from('ticket_messages').insert({
        ticket_id: this.currentTicket.id,
        sender_type: 'visitor',
        sender_name: this.currentTicket.creator_name,
        content
      });
      if (error) throw error;

      // Update ticket updated_at
      await DK.supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', this.currentTicket.id);
    } catch (e) {
      DK.toast('ارسال ناموفق بود', 'error');
      input.value = content;
    }
  },

  leaveChat() {
    if (this.realtimeChannel) {
      DK.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.currentTicket = null;
    this.accessToken = null;
    document.getElementById('chat-box').classList.remove('active');
    document.getElementById('access-box').style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', () => Support.init());
