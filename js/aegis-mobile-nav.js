/* ═══════════════════════════════════════════════════════════
   ÆGIS — MOBILE NAV (fusão de mobile.js + aegis-mobile-nav.js)
   FIX: mob-nav-btn agora faz clone+replace igual ao burger/puller
        evita listeners duplicados ao chamar bind() mais de uma vez
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const BP    = 768;
  const isMob = () => window.innerWidth <= BP;

  /* ══════════════════════════════════════════
     SAFETY CSS
  ══════════════════════════════════════════ */
  function injectSafetyCSS() {
    if (document.getElementById('mob-safety-css')) return;
    const s = document.createElement('style');
    s.id = 'mob-safety-css';
    s.textContent = `
      @media (max-width: 768px) {
        .sidebar:not(.mob-open) {
          transform: translateX(-110%) !important;
          visibility: hidden !important; pointer-events: none !important;
        }
        .sidebar.mob-open {
          transform: translateX(0) !important;
          visibility: visible !important; pointer-events: auto !important;
        }
        .bot-panel:not(.mob-bot-open) {
          transform: translateX(110%) !important;
          visibility: hidden !important; pointer-events: none !important;
        }
        .bot-panel.mob-bot-open {
          transform: translateX(0) !important;
          visibility: visible !important; pointer-events: auto !important;
        }
        #mob-overlay:not(.on) { display: none !important; pointer-events: none !important; }
        #mob-overlay.on       { display: block !important; pointer-events: all !important; }
        .sidebar.mob-open .nav-item {
          position: relative !important; z-index: 5 !important;
          pointer-events: auto !important; min-height: 44px; touch-action: manipulation;
        }
        #mob-bot-puller {
          display: flex !important; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px;
          position: fixed; right: 0; top: 50%; transform: translateY(-50%);
          width: 22px; height: 64px; background: var(--bg);
          border: 1px solid var(--green); border-right: none;
          cursor: pointer; z-index: 341; touch-action: manipulation;
          transition: opacity 0.25s, width 0.2s; border-radius: 4px 0 0 4px;
        }
        #mob-bot-puller.open {
          opacity: 0 !important; pointer-events: none !important;
          width: 0 !important; overflow: hidden !important;
        }
        #mob-bot-puller .pull-bar {
          display: block; width: 2px; height: 12px;
          background: var(--green); opacity: 0.7; border-radius: 1px;
        }
        #mob-bot-puller::after {
          content: '◈'; font-size: 9px; color: var(--green);
          margin-top: 2px; opacity: 0.6;
        }
      }
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════
     INJECT — topbar + drawer + puxador
  ══════════════════════════════════════════ */
  function injectTopbar() {
    if (document.getElementById('mob-topbar')) return;
    const bar = document.createElement('div');
    bar.id = 'mob-topbar';
    bar.innerHTML = [
      '<button id="mob-nav-btn" aria-label="Abrir menu de navegação">≡</button>',
      '<div>',
        '<div class="mob-topbar-logo">ÆGIS</div>',
        '<div class="mob-topbar-sub">> security training platform</div>',
      '</div>',
      '<div class="mob-topbar-pill">',
        '<div class="mob-topbar-sdot"></div>',
        'ativo',
      '</div>',
    ].join('');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function injectDrawer() {
    if (document.getElementById('mob-nav-drawer')) return;

    const NAV_ITEMS = [
      { section: 'home',       icon: '⌂', label: '[ home ]',       badge: null },
      { section: 'missoes',    icon: '⊞', label: '[ missões ]',    badge: '01' },
      { section: 'estudos',    icon: '◈', label: '[ estudos ]',    badge: null },
      { section: 'flashcards', icon: '⚡', label: '[ flashcards ]', badge: '6'  },
      { section: 'simulados',  icon: '▣', label: '[ simulados ]',  badge: null },
      { section: 'progresso',  icon: '◈', label: '[ progresso ]',  badge: null },
      { section: 'ranking',    icon: '✦', label: '[ ranking ]',    badge: null },
    ];

    const backdrop = document.createElement('div');
    backdrop.id = 'mob-nav-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('div');
    drawer.id = 'mob-nav-drawer';
    drawer.setAttribute('role', 'navigation');
    drawer.setAttribute('aria-label', 'Menu principal');
    drawer.innerHTML = [
      '<div class="mob-nav-header">',
        '<div>',
          '<div class="mob-nav-logo">ÆGIS</div>',
          '<div class="mob-nav-logo-sub">> security training platform</div>',
        '</div>',
        '<button class="mob-nav-close" id="mob-nav-close" aria-label="Fechar menu">✕</button>',
      '</div>',
      '<div class="mob-nav-status">',
        '<div class="mob-nav-sdot"></div>sistema ativo',
      '</div>',
      '<nav class="mob-nav-list" id="mob-nav-list"></nav>',
      '<div class="mob-nav-footer">',
        '<div class="mob-nav-score-row">',
          '<span>pontuação</span>',
          '<span class="mob-nav-score-val" id="mob-nav-score">0</span>',
        '</div>',
        '<div class="mob-nav-score-row" style="margin-bottom:4px;">',
          '<span>integridade do ÆGIS</span>',
          '<span id="mob-nav-hp-pct" class="mob-nav-score-val" style="font-size:13px;">100%</span>',
        '</div>',
        '<div class="mob-nav-hp-bar">',
          '<div class="mob-nav-hp-fill" id="mob-nav-hp-fill" style="width:100%"></div>',
        '</div>',
        '<div class="mob-nav-hp-label">',
          'bloqueios: <span id="mob-nav-blocks" style="color:rgba(0,255,65,0.6)">0</span>',
          ' &nbsp; falhas: <span id="mob-nav-fails" style="color:#e74c3c">0</span>',
        '</div>',
        '<button class="mob-nav-nick-btn" onclick="if(typeof exitToNickScreen===\'function\') exitToNickScreen()">',
          '✎ [ trocar nick ]',
        '</button>',
      '</div>',
    ].join('');
    document.body.appendChild(drawer);

    const list = drawer.querySelector('#mob-nav-list');
    NAV_ITEMS.forEach(function (item) {
      const el = document.createElement('button');
      el.className = 'mob-nav-item';
      el.dataset.section = item.section;
      el.innerHTML =
        '<span class="mob-nav-item-icon">' + item.icon + '</span>' +
        '<span class="mob-nav-item-label">' + item.label + '</span>' +
        (item.badge ? '<span class="mob-nav-badge">' + item.badge + '</span>' : '');
      el.addEventListener('click', function () {
        if (typeof navigate === 'function') navigate(item.section);
        closeDrawer();
      });
      list.appendChild(el);
    });
  }

  function injectPuller() {
    if (document.getElementById('mob-bot-puller')) return;
    const p = document.createElement('div');
    p.id = 'mob-bot-puller';
    p.role = 'button'; p.tabIndex = 0;
    p.setAttribute('aria-label', 'Abrir ÆGIS-BOT');
    p.innerHTML = '<span class="pull-bar"></span><span class="pull-bar"></span><span class="pull-bar"></span>';
    document.body.appendChild(p);
  }

  /* ══════════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════════ */
  function forceCloseSidebar() {
    const sidebar = document.getElementById('sidebar');
    const burger  = document.getElementById('mob-burger');
    const overlay = document.getElementById('mob-overlay');
    if (sidebar) {
      sidebar.classList.remove('mob-open');
      if (isMob()) {
        sidebar.style.transform = 'translateX(-110%)';
        sidebar.style.visibility = 'hidden';
        sidebar.style.pointerEvents = 'none';
      } else {
        sidebar.style.transform = sidebar.style.visibility = sidebar.style.pointerEvents = '';
      }
    }
    if (burger) { burger.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); }
    if (overlay) overlay.classList.remove('on');
    document.body.style.overflow = '';
  }

  function openSidebar() {
    if (!isMob()) return;
    forceCloseBot(); closeDrawer();
    const sidebar = document.getElementById('sidebar');
    const burger  = document.getElementById('mob-burger');
    const overlay = document.getElementById('mob-overlay');
    if (sidebar) {
      sidebar.classList.add('mob-open');
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.visibility = 'visible';
      sidebar.style.pointerEvents = 'auto';
    }
    if (burger) { burger.classList.add('on'); burger.setAttribute('aria-expanded', 'true'); }
    if (overlay) overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const burger  = document.getElementById('mob-burger');
    const overlay = document.getElementById('mob-overlay');
    if (sidebar) {
      sidebar.classList.remove('mob-open');
      sidebar.style.transform = 'translateX(-110%)';
      sidebar.style.visibility = 'hidden';
      sidebar.style.pointerEvents = 'none';
    }
    if (burger) { burger.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); }
    if (overlay) overlay.classList.remove('on');
    document.body.style.overflow = '';
  }

  /* ══════════════════════════════════════════
     BOT PANEL
  ══════════════════════════════════════════ */
  function forceCloseBot() {
    const panel  = document.getElementById('botPanel');
    const puller = document.getElementById('mob-bot-puller');
    if (panel) {
      panel.classList.remove('mob-bot-open');
      if (isMob()) {
        panel.style.transform = 'translateX(110%)';
        panel.style.visibility = 'hidden';
        panel.style.pointerEvents = 'none';
      } else {
        panel.style.transform = panel.style.visibility = panel.style.pointerEvents = '';
      }
    }
    if (puller) puller.classList.remove('open');
  }

  function openBot() {
    if (!isMob()) return;
    closeSidebar(); closeDrawer();
    const panel  = document.getElementById('botPanel');
    const puller = document.getElementById('mob-bot-puller');
    if (panel) {
      panel.classList.add('mob-bot-open');
      panel.style.transform = 'translateX(0)';
      panel.style.visibility = 'visible';
      panel.style.pointerEvents = 'auto';
    }
    if (puller) puller.classList.add('open');
    setTimeout(() => {
      const chat  = document.getElementById('chatArea');
      const input = document.getElementById('chatInput');
      if (chat) chat.scrollTop = chat.scrollHeight;
      if (input) input.focus();
    }, 380);
  }

  function closeBot() { forceCloseBot(); }

  /* ══════════════════════════════════════════
     DRAWER (menu de navegação)
  ══════════════════════════════════════════ */
  function openDrawer() {
    const drawer   = document.getElementById('mob-nav-drawer');
    const backdrop = document.getElementById('mob-nav-backdrop');
    const btn      = document.getElementById('mob-nav-btn');
    if (!drawer) return;
    closeSidebar(); forceCloseBot();
    drawer.classList.add('open');
    backdrop.classList.add('visible');
    if (btn) { btn.classList.add('open'); btn.innerHTML = '✕'; btn.setAttribute('aria-label', 'Fechar menu'); }
    syncDrawerStats();
    updateActiveItem();
  }

  function closeDrawer() {
    const drawer   = document.getElementById('mob-nav-drawer');
    const backdrop = document.getElementById('mob-nav-backdrop');
    const btn      = document.getElementById('mob-nav-btn');
    if (!drawer) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('visible');
    if (btn) { btn.classList.remove('open'); btn.innerHTML = '≡'; btn.setAttribute('aria-label', 'Abrir menu de navegação'); }
  }

  /* FIX: usa STATE.aegisHp (não STATE.hp) */
  function syncDrawerStats() {
    if (typeof STATE === 'undefined') return;
    const score  = document.getElementById('mob-nav-score');
    const hpFill = document.getElementById('mob-nav-hp-fill');
    const hpPct  = document.getElementById('mob-nav-hp-pct');
    const blocks = document.getElementById('mob-nav-blocks');
    const fails  = document.getElementById('mob-nav-fails');
    if (score)  score.textContent  = STATE.score  || 0;
    if (blocks) blocks.textContent = STATE.blocks || 0;
    if (fails)  fails.textContent  = STATE.fails  || 0;
    const hp = Math.max(0, STATE.aegisHp ?? 100);
    if (hpFill) {
      hpFill.style.width      = hp + '%';
      hpFill.style.background = hp > 60 ? 'var(--green)' : hp > 30 ? '#ffaa00' : 'var(--red)';
    }
    if (hpPct) hpPct.textContent = hp + '%';
  }

  function updateActiveItem() {
    let active = '';
    document.querySelectorAll('.section-view').forEach(function (v) {
      if (v.classList.contains('active')) active = v.id.replace('view-', '');
    });
    document.querySelectorAll('.mob-nav-item[data-section]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.section === active);
    });
  }

  /* ══════════════════════════════════════════
     BIND EVENTOS
     FIX: todos os botões usam clone+replace para evitar
          listeners duplicados quando bind() é chamado
          mais de uma vez (ex: após nick-screen fechar)
  ══════════════════════════════════════════ */
  function bind() {
    /* Burger (sidebar original) */
    const burger = document.getElementById('mob-burger');
    if (burger) {
      const nb = burger.cloneNode(true);
      burger.parentNode.replaceChild(nb, burger);
      nb.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.getElementById('sidebar')?.classList.contains('mob-open') ? closeSidebar() : openSidebar();
      });
    }

    /* Overlay sidebar */
    const overlay = document.getElementById('mob-overlay');
    if (overlay) {
      const no = overlay.cloneNode(true);
      overlay.parentNode.replaceChild(no, overlay);
      no.addEventListener('click', closeSidebar);
    }

    /* FIX: Botão nav (drawer) — clone+replace igual ao burger */
    const navBtn = document.getElementById('mob-nav-btn');
    if (navBtn) {
      const nb = navBtn.cloneNode(true);
      navBtn.parentNode.replaceChild(nb, navBtn);
      nb.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.getElementById('mob-nav-drawer')?.classList.contains('open') ? closeDrawer() : openDrawer();
      });
    }

    /* Backdrop drawer — clone+replace */
    const backdrop = document.getElementById('mob-nav-backdrop');
    if (backdrop) {
      const nb = backdrop.cloneNode(true);
      backdrop.parentNode.replaceChild(nb, backdrop);
      nb.addEventListener('click', closeDrawer);
    }

    /* Botão fechar drawer — clone+replace */
    const navClose = document.getElementById('mob-nav-close');
    if (navClose) {
      const nc = navClose.cloneNode(true);
      navClose.parentNode.replaceChild(nc, navClose);
      nc.addEventListener('click', closeDrawer);
    }

    /* Botão X do bot — clone+replace */
    const closeB = document.getElementById('mob-bot-close');
    if (closeB) {
      const cb = closeB.cloneNode(true);
      closeB.parentNode.replaceChild(cb, closeB);
      cb.addEventListener('click', (e) => { e.stopPropagation(); closeBot(); });
    }

    /* Puxador — clone+replace */
    const puller = document.getElementById('mob-bot-puller');
    if (puller) {
      const np = puller.cloneNode(true);
      puller.parentNode.replaceChild(np, puller);
      np.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.getElementById('botPanel')?.classList.contains('mob-bot-open') ? closeBot() : openBot();
      });
      np.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.getElementById('botPanel')?.classList.contains('mob-bot-open') ? closeBot() : openBot();
        }
      });
    }

    /* Nav items da sidebar: fechar ao navegar */
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => { if (isMob()) setTimeout(closeSidebar, 50); });
    });

    /* Fechar bot ao clicar fora */
    document.addEventListener('click', (e) => {
      if (!isMob()) return;
      const panel  = document.getElementById('botPanel');
      const puller = document.getElementById('mob-bot-puller');
      if (!panel?.classList.contains('mob-bot-open')) return;
      if (panel?.contains(e.target) || puller?.contains(e.target)) return;
      closeBot();
    }, { capture: true });

    hookNavigate();
  }

  /* ══════════════════════════════════════════
     HOOK navigate()
  ══════════════════════════════════════════ */
  let _navigateHooked = false;
  function hookNavigate() {
    if (_navigateHooked || typeof window.navigate !== 'function') return;
    _navigateHooked = true;
    const _orig = window.navigate;
    window.navigate = function (section) {
      const result = _orig(section);
      if (isMob()) setTimeout(closeSidebar, 50);
      return result;
    };
  }

  /* ══════════════════════════════════════════
     SYNC STATS (topbar XP/HP + drawer)
     FIX: usa STATE.aegisHp consistentemente
  ══════════════════════════════════════════ */
  function syncStats() {
    setInterval(() => {
      if (typeof STATE === 'undefined') return;
      if (isMob()) {
        const xp = document.getElementById('mob-xp');
        const hf = document.getElementById('mob-hp-fill');
        if (xp) xp.textContent = STATE.score ?? 0;
        if (hf) {
          const hp = Math.max(0, STATE.aegisHp ?? 100);
          hf.style.width      = hp + '%';
          hf.style.background = hp > 60 ? 'var(--green)' : hp > 30 ? '#ffaa00' : 'var(--red)';
        }
      }
      const drawer = document.getElementById('mob-nav-drawer');
      if (drawer?.classList.contains('open')) syncDrawerStats();
    }, 500);
  }

  /* ══════════════════════════════════════════
     CHAT AUTO-SCROLL
  ══════════════════════════════════════════ */
  function watchChat() {
    const chat = document.getElementById('chatArea');
    if (!chat) return;
    new MutationObserver(() => {
      if (document.getElementById('botPanel')?.classList.contains('mob-bot-open')) {
        chat.scrollTop = chat.scrollHeight;
      }
    }).observe(chat, { childList: true, subtree: true });
  }

  /* ══════════════════════════════════════════
     OBSERVA MUDANÇAS DE SEÇÃO (ativo no drawer)
  ══════════════════════════════════════════ */
  function watchSections() {
    const observer = new MutationObserver(updateActiveItem);
    document.querySelectorAll('.section-view').forEach(v => {
      observer.observe(v, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ══════════════════════════════════════════
     RESIZE / ESC
  ══════════════════════════════════════════ */
  let _rt;
  window.addEventListener('resize', () => {
    clearTimeout(_rt);
    _rt = setTimeout(() => {
      if (!isMob()) {
        forceCloseSidebar(); forceCloseBot(); closeDrawer();
        document.body.style.overflow = '';
      }
    }, 150);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMob()) { closeSidebar(); closeBot(); closeDrawer(); }
  });

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  function earlyInit() {
    injectSafetyCSS();
    injectTopbar();
    injectDrawer();
    injectPuller();
    forceCloseSidebar();
    forceCloseBot();
    bind();
    syncStats();
    watchChat();
    watchSections();
    hookNavigate();
  }

  function lateInit() {
    forceCloseSidebar();
    forceCloseBot();
    hookNavigate();

    window.addEventListener('aegis:nick-set', () => {
      setTimeout(() => {
        forceCloseSidebar(); forceCloseBot(); closeDrawer();
        bind(); hookNavigate();
      }, 900);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', earlyInit);
  } else {
    earlyInit();
  }
  window.addEventListener('load', lateInit);

  /* ── API pública ── */
  window.AegisMobile   = { openSidebar, closeSidebar, openBot, closeBot, openDrawer, closeDrawer, isMob };
  window.toggleMobMenu = () => document.getElementById('sidebar')?.classList.contains('mob-open') ? closeSidebar() : openSidebar();
  window.closeMobMenu  = closeSidebar;
  window.toggleMobBot  = () => document.getElementById('botPanel')?.classList.contains('mob-bot-open') ? closeBot() : openBot();
  window.closeMobBot   = closeBot;
})();