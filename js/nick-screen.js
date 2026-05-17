/* ═══════════════════════════════════════════════════════════
   ÆGIS — AUTH SCREEN  v8.1
   Fix v8.1:
   - aegis:nick-set disparado com delay de 300ms para garantir
     que ranking.js v9.3 execute _handleAccountSwitch() antes
     de processar o evento, evitando race condition que causava
     score da conta anterior aparecer na conta nova.
   - restoreStateFromServer NÃO restaura score/blocks/fails.
     Isso é responsabilidade exclusiva do ranking.js (v9.3).
═══════════════════════════════════════════════════════════ */

(function () {
  const SUPABASE_URL  = 'https://feyuowaurlwctogamzmk.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleXVvd2F1cmx3Y3RvZ2Ftem1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTI5OTgsImV4cCI6MjA5MzkyODk5OH0.1hbK0qhgBLtKSaiMHzkYs4AOeDroZMf6xn2FyTmBKNM';

  function getSupabase() { return window._aegisSupabase; }

  /* ── Fecha sidebar/bot no mobile ── */
  function forceMobileClosed() {
    const sidebar = document.getElementById('sidebar');
    const burger  = document.getElementById('mob-burger');
    const overlay = document.getElementById('mob-overlay');
    const bot     = document.getElementById('botPanel');
    const puller  = document.getElementById('mob-bot-puller');
    if (sidebar) { sidebar.classList.remove('mob-open'); sidebar.style.transform = 'translateX(-110%)'; sidebar.style.visibility = 'hidden'; sidebar.style.pointerEvents = 'none'; }
    if (burger)  { burger.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); }
    if (overlay)   overlay.classList.remove('on');
    if (bot)     { bot.classList.remove('mob-bot-open'); bot.style.transform = 'translateX(110%)'; bot.style.visibility = 'hidden'; bot.style.pointerEvents = 'none'; }
    if (puller)    puller.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Verifica se nick já existe no DB ── */
  async function nickExistsInDB(nick) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ranking?select=nick&nick=eq.${encodeURIComponent(nick)}&limit=1`,
        { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON } }
      );
      if (!res.ok) return false;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0;
    } catch { return false; }
  }

  /* ── Busca entrada do usuário no ranking pelo user_id ── */
  async function fetchUserRanking(userId, accessToken) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${userId}&select=nick,score,blocks,fails,aegis_hp,loki_level,missions,completed_missions&limit=1`,
        { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + accessToken } }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch { return null; }
  }

  /* ── Cria entrada no ranking para novo usuário ── */
  async function createRankingEntry(userId, nick, accessToken) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ranking`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id:  userId,
        nick,
        score:    0, blocks: 0, fails: 0,
        aegis_hp: 100, loki_level: 1, missions: 0,
        completed_missions: [],
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  }

  /* ── Atualiza só o nick (preserva progresso) ── */
  async function updateNickInDB(userId, nick, accessToken) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON, Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ nick, updated_at: new Date().toISOString() }),
      }
    );
    return res.ok;
  }

  /* ── [v8.1] Restaura STATE com dados do servidor ──────────
     ✅ CORRIGIDO: NÃO restaura score, blocks, fails, lokiLevel.
     O ranking.js v9.3 é autoritário para contas Google e
     sincroniza esses valores direto do banco.
     Restaurar aqui causava o Proxy a salvar valores antigos
     de volta no banco antes do ranking.js sincronizar.
     Aqui só restauramos: missões completadas e aegisHp.
  ─────────────────────────────────────────────────────── */
  function restoreStateFromServer(entry) {
    if (!entry) return;
    function tryRestore(attempts) {
      const S = window.STATE;
      if (!S && attempts > 0) {
        setTimeout(() => tryRestore(attempts - 1), 150);
        return;
      }
      if (!S) return;

      /* ✅ NÃO toca em score, blocks, fails, lokiLevel.
         ranking.js v9.3 cuida disso com autoridade do servidor. */

      if (entry.aegis_hp != null) S.aegisHp = entry.aegis_hp;

      if (Array.isArray(entry.completed_missions) && entry.completed_missions.length > 0) {
        S.completedMissions = entry.completed_missions;
        const maxDone = Math.max(0, ...entry.completed_missions);
        const nextId  = maxDone + 1;
        if (nextId >= 1 && nextId <= 6) {
          S.activeMissionId = nextId;
          if (typeof MISSION_STATE !== 'undefined') MISSION_STATE.activeMissionId = nextId;
          try { localStorage.setItem('aegis_active_mission', nextId); } catch (_) {}
        }
      }

      if (typeof updateActiveMissionCard === 'function') updateActiveMissionCard();
      console.log('[auth] STATE restaurado do servidor ✓', entry);
    }
    tryRestore(20);
  }

  /* ═══════════════════════════════════════════════════════
     ESTILOS
  ═══════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('ns-styles')) return;
    const s = document.createElement('style');
    s.id = 'ns-styles';
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=Fira+Code:wght@300;400;500&display=swap');

      body.ns-active .wrapper,
      body.ns-active #mob-topbar,
      body.ns-active #mob-bot-btn,
      body.ns-active #mob-bot-puller {
        visibility: hidden !important;
        pointer-events: none !important;
      }
      html, body { overflow-x: hidden !important; }

      #ns-overlay {
        position: fixed !important;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        background: #020b04;
        display: block !important;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        font-family: 'Share Tech Mono', monospace;
        transition: opacity 0.7s ease;
      }
      #ns-overlay.ns-out { opacity: 0; pointer-events: none; }
      #ns-overlay * { box-sizing: border-box; }

      #ns-overlay .ns-scan {
        position: fixed; inset: 0; pointer-events: none; z-index: 1;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px);
      }
      #ns-rain {
        position: fixed; inset: 0; z-index: 0;
        pointer-events: none; overflow: hidden;
        filter: blur(2.5px); width: 100%; height: 100%;
      }
      .ns-rain-col {
        position: absolute; top: 0;
        font-family: 'Share Tech Mono', monospace;
        font-size: 14px; color: #00ff41; opacity: 0.03;
        writing-mode: vertical-rl; white-space: nowrap;
        letter-spacing: 4px;
        animation: ns-rain linear infinite; user-select: none;
      }
      @keyframes ns-rain {
        0%   { transform: translateY(-100%); opacity: 0; }
        10%  { opacity: 0.04; }
        90%  { opacity: 0.02; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      #ns-overlay .ns-glitch-bar {
        position: fixed; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, #00ff41, transparent);
        z-index: 2; pointer-events: none;
        animation: ns-scanline 5s linear infinite; opacity: 0.6;
      }
      @keyframes ns-scanline { 0% { top: 0; } 100% { top: 100%; } }

      #ns-overlay .ns-center {
        position: relative; z-index: 10;
        width: 100%; max-width: 480px;
        margin: 0 auto;
        padding: 32px 24px;
        padding-bottom: max(48px, env(safe-area-inset-bottom, 24px));
        min-height: 100vh;
        display: flex; flex-direction: column; justify-content: center;
      }
      @media (max-height: 620px), (max-width: 400px) {
        #ns-overlay .ns-center {
          justify-content: flex-start;
          padding-top: 20px;
        }
      }

      #ns-overlay .ns-logo {
        font-family: 'VT323', monospace;
        font-size: 72px; letter-spacing: 8px;
        color: #00ff41; line-height: 1; margin-bottom: 2px;
        text-shadow: 0 0 30px rgba(0,255,65,0.3), 0 0 60px rgba(0,255,65,0.1);
        animation: ns-glitch 8s infinite;
        max-width: 100%; overflow: hidden; white-space: nowrap;
      }
      @keyframes ns-glitch {
        0%,100% { text-shadow: 0 0 30px rgba(0,255,65,0.3); }
        33% { text-shadow: -2px 0 #ff0040, 2px 0 #00ffff; }
        66% { text-shadow:  2px 0 #ff0040, -2px 0 #00ffff; }
      }
      #ns-overlay .ns-sub {
        font-size: 11px; color: rgba(0,255,65,0.45);
        letter-spacing: 3px; margin-bottom: 20px;
      }
      #ns-overlay .ns-boot {
        font-size: 12px; color: rgba(0,255,65,0.6);
        letter-spacing: 1px; line-height: 1.9; margin-bottom: 12px;
        word-break: break-word; overflow-wrap: break-word;
      }
      #ns-overlay .ns-boot-line { opacity: 0; animation: ns-fadein 0.1s forwards; }
      @keyframes ns-fadein { to { opacity: 1; } }

      #ns-overlay .ns-typing-line {
        font-size: 11px; color: rgba(0,255,65,0.45);
        letter-spacing: 2px; min-height: 18px; margin-bottom: 12px;
      }
      #ns-overlay .ns-cursor-blink {
        display: inline-block; width: 7px; height: 12px;
        background: rgba(0,255,65,0.7); vertical-align: middle;
        margin-left: 2px; animation: ns-cur 0.9s infinite;
      }
      @keyframes ns-cur { 0%,100%{opacity:1} 50%{opacity:0} }

      #ns-overlay .ns-box {
        border: 1px solid rgba(0,255,65,0.25);
        padding: 24px 22px;
        background: rgba(0,255,65,0.06);
        position: relative; overflow: hidden; width: 100%;
      }
      #ns-overlay .ns-box::after {
        content: ''; position: absolute; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, #00ff41, transparent);
        animation: ns-scanline 4s linear infinite;
      }
      #ns-overlay .ns-box-label {
        position: absolute; top: -10px; left: 16px;
        font-size: 10px; color: rgba(0,255,65,0.5);
        background: #020b04; padding: 0 8px; letter-spacing: 2px;
      }
      #ns-overlay .ns-label {
        display: block; font-size: 10px;
        color: rgba(0,255,65,0.55); letter-spacing: 2px; margin-bottom: 8px;
      }
      #ns-overlay .ns-label::before { content: '// '; color: rgba(0,255,65,0.3); }

      #ns-overlay .ns-google-btn {
        width: 100%; background: transparent;
        border: 1px solid #00ff41; color: #00ff41;
        font-family: 'Share Tech Mono', monospace;
        font-size: 13px; letter-spacing: 3px;
        padding: 13px 16px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 12px;
        position: relative; overflow: hidden; transition: color 0.2s;
        min-height: 48px;
      }
      #ns-overlay .ns-google-btn::before {
        content: ''; position: absolute; inset: 0;
        background: #00ff41; transform: translateX(-100%);
        transition: transform 0.2s; z-index: 0;
      }
      #ns-overlay .ns-google-btn:hover::before { transform: translateX(0); }
      #ns-overlay .ns-google-btn:hover { color: #020b04; }
      #ns-overlay .ns-google-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      #ns-overlay .ns-google-btn span,
      #ns-overlay .ns-google-btn svg { position: relative; z-index: 1; }

      #ns-overlay .ns-btn {
        width: 100%; background: transparent;
        border: 1px solid #00ff41; color: #00ff41;
        font-family: 'Share Tech Mono', monospace;
        font-size: 13px; letter-spacing: 4px;
        padding: 13px; cursor: pointer; text-transform: uppercase;
        position: relative; overflow: hidden; transition: color 0.2s;
        min-height: 48px;
      }
      #ns-overlay .ns-btn::before {
        content: ''; position: absolute; inset: 0;
        background: #00ff41; transform: translateX(-100%);
        transition: transform 0.2s; z-index: -1;
      }
      #ns-overlay .ns-btn:hover::before { transform: translateX(0); }
      #ns-overlay .ns-btn:hover { color: #020b04; }
      #ns-overlay .ns-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      #ns-overlay .ns-signout-btn {
        width: 100%; background: transparent;
        border: 1px solid rgba(255,60,60,0.35); color: rgba(255,60,60,0.6);
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px; letter-spacing: 3px;
        padding: 10px; cursor: pointer; text-transform: uppercase;
        position: relative; overflow: hidden;
        transition: color 0.2s, border-color 0.2s;
        min-height: 44px; margin-top: 10px;
      }
      #ns-overlay .ns-signout-btn:hover {
        border-color: rgba(255,60,60,0.7);
        color: #ff3c3c;
      }
      #ns-overlay .ns-signout-btn:disabled { opacity: 0.3; cursor: not-allowed; }

      #ns-overlay .ns-input-wrap {
        display: flex; align-items: center;
        border: 1px solid rgba(0,255,65,0.25);
        background: rgba(0,255,65,0.04);
        margin-bottom: 5px; transition: border-color 0.2s; width: 100%;
      }
      #ns-overlay .ns-input-wrap:focus-within { border-color: #00ff41; }
      #ns-overlay .ns-prefix {
        font-size: 14px; color: rgba(0,255,65,0.45);
        padding: 0 10px; user-select: none; flex-shrink: 0;
      }
      #ns-overlay #ns-input {
        flex: 1; background: transparent; border: none; outline: none;
        font-family: 'Share Tech Mono', monospace;
        font-size: 16px; color: #00ff41;
        padding: 12px 8px 12px 0; letter-spacing: 2px;
        caret-color: #00ff41; min-width: 0; width: 100%;
      }
      #ns-overlay #ns-input::placeholder { color: rgba(0,255,65,0.18); }
      #ns-overlay .ns-hint {
        font-size: 10px; color: rgba(0,255,65,0.3);
        letter-spacing: 1px; margin-bottom: 12px; line-height: 1.6;
      }
      #ns-overlay .ns-error {
        display: block; font-size: 11px; color: #ff3c3c;
        letter-spacing: 1px; margin-bottom: 10px; min-height: 16px;
      }
      #ns-overlay .ns-user-info {
        font-size: 11px; color: rgba(0,255,65,0.5);
        letter-spacing: 1px; margin-bottom: 14px;
        padding: 8px 10px;
        border: 1px solid rgba(0,255,65,0.12);
        background: rgba(0,255,65,0.03);
        line-height: 1.7; word-break: break-all;
      }
      #ns-overlay .ns-loki-warn {
        margin-top: 14px; font-size: 11px;
        color: rgba(255,60,60,0.55); letter-spacing: 1px;
        border: 1px solid rgba(255,60,60,0.18);
        background: rgba(255,60,60,0.05);
        padding: 8px 12px;
        animation: ns-warn-pulse 2.4s infinite; width: 100%;
      }
      @keyframes ns-warn-pulse { 0%,100%{opacity:.7} 50%{opacity:.25} }
      #ns-overlay .ns-footer {
        margin-top: 14px; font-size: 10px;
        color: rgba(0,255,65,0.2); letter-spacing: 2px; line-height: 1.9;
      }
      #ns-overlay .ns-status-bar {
        display: flex; justify-content: space-between;
        font-size: 10px; color: rgba(0,255,65,0.3);
        letter-spacing: 1px; margin-top: 6px;
        border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;
      }
      #ns-overlay .ns-status-bar span { flex: 1; text-align: center; }
      #ns-overlay .ns-status-bar span:first-child { text-align: left; }
      #ns-overlay .ns-status-bar span:last-child  { text-align: right; }
      #ns-overlay .ns-dot {
        display: inline-block; width: 6px; height: 6px;
        border-radius: 50%; background: #00ff41;
        box-shadow: 0 0 6px #00ff41; margin-right: 5px;
        animation: ns-blink 1.5s infinite; vertical-align: middle;
      }
      @keyframes ns-blink { 0%,100%{opacity:1} 50%{opacity:0} }

      @media (max-width: 480px) {
        #ns-overlay .ns-logo { font-size: 52px; letter-spacing: 5px; }
        #ns-overlay .ns-center { padding: 24px 16px 48px; }
        #ns-overlay .ns-box { padding: 18px 14px; }
        #ns-overlay .ns-google-btn { font-size: 11px; letter-spacing: 1px; }
        #ns-overlay .ns-boot { font-size: 11px; }
      }
      @media (max-width: 380px) {
        #ns-overlay .ns-logo { font-size: 40px; letter-spacing: 3px; }
        #ns-overlay .ns-center { padding: 16px 12px 48px; }
        #ns-overlay .ns-box { padding: 14px 10px; }
        #ns-overlay .ns-btn, #ns-overlay .ns-google-btn { font-size: 11px; letter-spacing: 1px; }
        #ns-overlay .ns-sub { font-size: 9px; letter-spacing: 2px; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Colunas binárias (rain) ── */
  function buildRain() {
    const rain = document.getElementById('ns-rain');
    if (!rain) return;
    const w    = document.documentElement.clientWidth;
    const cols = Math.floor(w / 20);
    for (let i = 0; i < cols; i++) {
      const col = document.createElement('div');
      col.className = 'ns-rain-col';
      col.style.left = (i * 20) + 'px';
      const dur = 6 + Math.random() * 14;
      col.style.animationDuration = dur + 's';
      col.style.animationDelay   = (-Math.random() * dur) + 's';
      let txt = '';
      for (let j = 0; j < 20 + Math.floor(Math.random() * 20); j++)
        txt += Math.random() > 0.5 ? '1' : '0';
      col.textContent = txt;
      rain.appendChild(col);
    }
  }

  /* ── Boot sequence ── */
  const BOOT_LINES = [
    '> inicializando ÆGIS v1.0.0...',
    '> verificando integridade do sistema... <span style="color:#00ff41">OK</span>',
    '> carregando módulos de defesa... <span style="color:#00ff41">OK</span>',
    '> detectando ameaças ativas... <span style="color:#ff3c3c">LOKI SHADOW [ATIVO]</span>',
    '> aguardando autenticação do guardião...',
  ];

  function runBootSequence(container, onDone) {
    const bootEl = document.createElement('div');
    bootEl.className = 'ns-boot';
    const box = container.querySelector('.ns-box');
    container.insertBefore(bootEl, box);
    let i = 0;
    function nextLine() {
      if (i >= BOOT_LINES.length) { setTimeout(onDone, 200); return; }
      const line = document.createElement('div');
      line.className = 'ns-boot-line';
      line.innerHTML = BOOT_LINES[i];
      bootEl.appendChild(line);
      i++;
      setTimeout(nextLine, 260 + Math.random() * 180);
    }
    nextLine();
  }

  /* ── Typing animado ── */
  const TYPING_MSGS = [
    '// escaneando vetores de ataque...',
    '// aguardando credencial OAuth...',
    '// criptografando canal de entrada...',
  ];
  function runTyping(el) {
    let msgIdx = 0;
    function typeMsg(msg, charIdx) {
      if (charIdx <= msg.length) {
        el.innerHTML = msg.slice(0, charIdx) + '<span class="ns-cursor-blink"></span>';
        setTimeout(() => typeMsg(msg, charIdx + 1), 38 + Math.random() * 30);
      } else {
        setTimeout(() => eraseMsg(msg, msg.length), 1800);
      }
    }
    function eraseMsg(msg, len) {
      if (len >= 0) {
        el.innerHTML = msg.slice(0, len) + '<span class="ns-cursor-blink"></span>';
        setTimeout(() => eraseMsg(msg, len - 1), 18);
      } else {
        msgIdx = (msgIdx + 1) % TYPING_MSGS.length;
        setTimeout(() => typeMsg(TYPING_MSGS[msgIdx], 0), 300);
      }
    }
    typeMsg(TYPING_MSGS[0], 0);
  }

  /* ── Relógio ── */
  function startClock() {
    function tick() {
      const el = document.getElementById('ns-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    }
    tick();
    return setInterval(tick, 1000);
  }

  /* ── SVG do Google ── */
  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>`;

  /* ── Build overlay ── */
  function buildOverlay(mode = 'login') {
    document.body.classList.add('ns-active');
    const overlay = document.createElement('div');
    overlay.id = 'ns-overlay';
    const boxContent = mode === 'nick' ? buildNickBox() : buildLoginBox();
    overlay.innerHTML = `
      <div class="ns-scan"></div>
      <div class="ns-glitch-bar"></div>
      <div id="ns-rain"></div>
      <div class="ns-center">
        <div class="ns-logo">ÆGIS</div>
        <div class="ns-sub">&gt; security training platform</div>
        <div class="ns-typing-line" id="ns-typing"></div>
        <div class="ns-box" id="ns-box" style="display:none;">
          ${boxContent}
        </div>
        <div class="ns-footer">
          ÆGIS // Season 01 — Sombras de Loki &nbsp;·&nbsp; autenticado via Google
        </div>
        <div class="ns-status-bar">
          <span><span class="ns-dot"></span>SYS: ONLINE</span>
          <span id="ns-clock">--:--:--</span>
          <span>ENC: AES-256</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  function buildLoginBox() {
    return `
      <div class="ns-box-label">// AUTENTICAÇÃO DO GUARDIÃO</div>
      <span class="ns-label">ACESSO SEGURO</span>
      <p style="font-size:11px;color:rgba(0,255,65,0.5);letter-spacing:1px;margin:0 0 20px;line-height:1.7;">
        Entre com sua conta Google para salvar seu progresso,<br>XP e posição no ranking entre sessões.
      </p>
      <button class="ns-google-btn" id="ns-google-btn" onclick="window.__nsGoogleLogin()">
        ${GOOGLE_SVG}
        <span>[ entrar com Google ]</span>
      </button>
      <div class="ns-loki-warn" style="margin-top:16px;">
        <span class="ns-dot"></span>LOKI'S SHADOWS está monitorando esta frequência
      </div>`;
  }

  function buildNickBox() {
    return `
      <div class="ns-box-label">// IDENTIFICAÇÃO DO GUARDIÃO</div>
      <div class="ns-user-info" id="ns-user-info">// carregando...</div>
      <span class="ns-label">ESCOLHA SEU CODINOME</span>
      <div class="ns-input-wrap">
        <span class="ns-prefix">&gt;_</span>
        <input type="text" id="ns-input"
          placeholder="seu_nick_aqui"
          maxlength="20" autocomplete="off" spellcheck="false"/>
      </div>
      <div class="ns-hint">// 3–20 chars · letras, números e _ permitidos · único no sistema</div>
      <span class="ns-error" id="ns-error"></span>
      <button class="ns-btn" id="ns-btn" onclick="window.__nsChooseNick()">
        [ ativar guardião ]
      </button>
      <button class="ns-signout-btn" id="ns-signout-btn" onclick="window.__nsSignOut()">
        [ sair da conta Google ]
      </button>
      <div class="ns-loki-warn">
        <span class="ns-dot"></span>LOKI'S SHADOWS está monitorando esta frequência
      </div>`;
  }

  /* ── Validação do nick ── */
  function validate(nick) {
    if (!nick || nick.length < 3)  return 'codinome muito curto — mínimo 3 caracteres';
    if (nick.length > 20)          return 'codinome muito longo — máximo 20 caracteres';
    if (!/^[\w]+$/.test(nick))     return 'apenas letras, números e _ são permitidos';
    return null;
  }

  /* ── Sign out ── */
  window.__nsSignOut = async function () {
    const btn = document.getElementById('ns-signout-btn');
    if (btn) { btn.disabled = true; btn.textContent = '[ saindo... ]'; }
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    window.AEGIS_NICK       = null;
    window.AEGIS_USER       = null;
    window.__aegisNickReady = null;
    window._supabaseSession = null;
    location.reload();
  };

  /* ── Dismiss ── */
  function dismiss(nick, userData, session, clockId) {
    clearInterval(clockId);
    window.AEGIS_NICK           = nick;
    window.AEGIS_USER           = userData;
    window.__aegisNickReady     = { nick, ts: Date.now() };
    window._supabaseSession     = session;

    const overlay = document.getElementById('ns-overlay');
    if (overlay) {
      overlay.classList.add('ns-out');
      setTimeout(() => {
        overlay.remove();
        document.getElementById('ns-styles')?.remove();
        forceMobileClosed();
        document.body.classList.remove('ns-active');
        requestAnimationFrame(() => {
          forceMobileClosed();
          /* ✅ v8.1: delay de 300ms para garantir que ranking.js
             execute _handleAccountSwitch() antes de processar
             o aegis:nick-set, evitando race condition. */
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('aegis:nick-set', {
              detail: { nick, user: userData }
            }));
          }, 300);
        });
      }, 750);
    }
  }

  /* ── Tela de nick ── */
  function setupNickScreen(session, isChanging) {
    const infoEl = document.getElementById('ns-user-info');
    if (infoEl) {
      const email = session.user?.email || '';
      infoEl.innerHTML = isChanging
        ? `// autenticado como: <span style="color:#00ff41">${email}</span><br><span style="color:rgba(0,255,65,0.35)">// score e progresso serão mantidos</span>`
        : `// autenticado como: <span style="color:#00ff41">${email}</span>`;
    }

    const btn = document.getElementById('ns-btn');
    if (btn && isChanging) btn.textContent = '[ confirmar novo codinome ]';

    setTimeout(() => document.getElementById('ns-input')?.focus(), 120);

    window.__nsChooseNick = async function () {
      const input = document.getElementById('ns-input');
      const errEl = document.getElementById('ns-error');
      const btn   = document.getElementById('ns-btn');
      if (!input || !session) return;

      const nick = input.value.trim();
      const err  = validate(nick);
      if (err) {
        errEl.textContent = '⚠ ' + err;
        input.style.color = '#ff3c3c';
        setTimeout(() => { if (input) input.style.color = '#00ff41'; }, 600);
        input.focus();
        return;
      }

      errEl.textContent = '';
      btn.disabled      = true;
      btn.textContent   = '[ verificando disponibilidade... ]';

      const taken = await nickExistsInDB(nick);
      if (taken) {
        errEl.textContent = '⚠ codinome já em uso — escolha outro';
        btn.disabled      = false;
        btn.textContent   = isChanging ? '[ confirmar novo codinome ]' : '[ ativar guardião ]';
        input.focus();
        return;
      }

      const userId      = session.user.id;
      const accessToken = session.access_token;

      if (isChanging) {
        btn.textContent = '[ atualizando codinome... ]';
        const updated = await updateNickInDB(userId, nick, accessToken);
        if (!updated) {
          errEl.textContent = '⚠ erro ao atualizar — tente novamente';
          btn.disabled      = false;
          btn.textContent   = '[ confirmar novo codinome ]';
          return;
        }
      } else {
        btn.textContent = '[ inicializando guardião... ]';
        const created = await createRankingEntry(userId, nick, accessToken);
        if (!created) {
          errEl.textContent = '⚠ erro ao criar perfil — tente novamente';
          btn.disabled      = false;
          btn.textContent   = '[ ativar guardião ]';
          return;
        }
      }

      dismiss(nick, { id: userId, email: session.user.email }, session, window.__nsClockId);
    };
  }

  /* ── Mostra a tela ── */
  function showScreen(mode, session, isChanging = false) {
    injectStyles();
    buildOverlay(mode);
    buildRain();
    window.__nsClockId = startClock();

    const typingEl = document.getElementById('ns-typing');
    if (typingEl) runTyping(typingEl);

    const center = document.querySelector('#ns-overlay .ns-center');
    if (center) {
      runBootSequence(center, () => {
        const box = document.getElementById('ns-box');
        if (box) {
          box.style.display    = '';
          box.style.opacity    = '0';
          box.style.transition = 'opacity 0.5s';
          requestAnimationFrame(() => { box.style.opacity = '1'; });
        }
        if (mode === 'nick' && session) setupNickScreen(session, isChanging);
      });
    }

    window.__nsGoogleLogin = async function () {
      const btn = document.getElementById('ns-google-btn');
      if (btn) { btn.disabled = true; btn.querySelector('span').textContent = '[ autenticando... ]'; }
      const supabase = getSupabase();
      if (!supabase) { console.error('[auth] Supabase não inicializado'); return; }
      window.__nsAwaitingOAuth = true;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
    };

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Enter' && document.getElementById('ns-overlay')) {
        if (mode === 'nick') window.__nsChooseNick?.();
        else window.__nsGoogleLogin?.();
      } else if (!document.getElementById('ns-overlay')) {
        document.removeEventListener('keydown', onKey);
      }
    });
  }

  /* ── API pública — trocar nick ── */
  window.__aegisShowNickChange = async function () {
    const supabase = getSupabase();
    if (!supabase) { location.reload(); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { location.reload(); return; }
    if (typeof STATE !== 'undefined' && STATE.lokiTimeout) clearTimeout(STATE.lokiTimeout);
    showScreen('nick', session, true);
  };

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  async function init() {
    let tries = 0;
    while (!window._aegisSupabase && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }

    const supabase = getSupabase();
    if (!supabase) { console.error('[auth] Supabase client não encontrado'); return; }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      showScreen('login', null);
      return;
    }

    window._supabaseSession = session;

    const entry = await fetchUserRanking(session.user.id, session.access_token);

    if (!entry) {
      showScreen('nick', session, false);
      return;
    }

    const nick = entry.nick;
    window.AEGIS_NICK        = nick;
    window.AEGIS_USER        = { id: session.user.id, email: session.user.email };
    window.__aegisNickReady  = { nick, ts: Date.now() };
    window.__aegisServerData = entry;

    /* ✅ restoreStateFromServer NÃO toca em score/blocks/fails.
       ranking.js v9.3 sincroniza esses valores com autoridade do servidor. */
    restoreStateFromServer(entry);

    window.dispatchEvent(new CustomEvent('aegis:nick-set', {
      detail: { nick, user: window.AEGIS_USER }
    }));
  }

  /* ── Escuta mudanças de auth ── */
  async function setupAuthListener() {
    let tries = 0;
    while (!window._aegisSupabase && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window._supabaseSession = session;

        const overlay = document.getElementById('ns-overlay');
        if (!overlay) return;

        if (!window.__nsAwaitingOAuth) return;
        window.__nsAwaitingOAuth = false;

        const entry = await fetchUserRanking(session.user.id, session.access_token);

        if (entry) {
          const nick = entry.nick;
          window.AEGIS_NICK        = nick;
          window.AEGIS_USER        = { id: session.user.id, email: session.user.email };
          window.__aegisNickReady  = { nick, ts: Date.now() };
          window.__aegisServerData = entry;

          restoreStateFromServer(entry);

          overlay.classList.add('ns-out');
          setTimeout(() => {
            overlay.remove();
            document.getElementById('ns-styles')?.remove();
            document.body.classList.remove('ns-active');
            forceMobileClosed();
            /* ✅ v8.1: delay de 300ms para evitar race condition
               com _handleAccountSwitch do ranking.js */
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('aegis:nick-set', {
                detail: { nick, user: window.AEGIS_USER }
              }));
            }, 300);
          }, 600);
        } else {
          overlay.remove();
          document.getElementById('ns-styles')?.remove();
          document.body.classList.remove('ns-active');
          document.getElementById('ns-rain')?.remove();
          showScreen('nick', session, false);
        }
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        window._supabaseSession = session;
      }

      if (event === 'SIGNED_OUT') {
        window.AEGIS_NICK       = null;
        window.AEGIS_USER       = null;
        window.__aegisNickReady = null;
        window._supabaseSession = null;
        location.reload();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setupAuthListener(); init(); });
  } else {
    setupAuthListener();
    init();
  }
})();