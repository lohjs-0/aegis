/* ═══════════════════════════════════════════════════════════════
   estudos.js  —  v6.0
   INTEGRAÇÃO COM ranking.js v9.0:
   - [v6.0] injectStudyXpIntoState: dispara "aegis:xp-ready" após
            injetar XP. Isso substitui o setTimeout(1200ms) arbitrário
            do ranking.js antigo. O gate de eventos garante que o save
            no Supabase só ocorre com o score correto.
   - [v6.0] onModuleCompleted: removido setTimeout(1500ms) para
            saveScoreToRanking — o Proxy do STATE (ranking.js v9)
            detecta a mudança de score e dispara o save automaticamente
            via debounce. Sem chamadas manuais, sem race conditions.
   - [v6.0] _flushState: removida chamada a syncRankingScore() —
            o Proxy do STATE cuida do debounce e save. Manter a chamada
            causava double-save e potencial race condition.
   - [v6.0] Listener aegis:nick-set: removido loadStudyProgress() +
            injectStudyXpIntoState() redundantes — o ranking.js v9
            já chama syncFromServer() que restaura o STATE com Math.max.
            O evento aegis:xp-ready (disparado no init) garante o XP.
   FIXES ANTERIORES MANTIDOS (v5.1, v5, v4.1):
   - v5.1: setupScrollToBottomDetector com touchmove (iOS Safari),
           threshold 0.75, fallback sem scroll.
   - v5.1: setupSectionObservers com root: panel, threshold: 0.2.
   - v5.1: detachScrollHandler remove touchmove também.
   - v5:   injectStudyXpIntoState soma XP (não sobrescreve).
   - v4.1: chave de storage isolada por userId.
═══════════════════════════════════════════════════════════════ */

var XP_PER_MODULE = 100;

/* ─────────────────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────────────────── */
var LOKI_MIN_INTERVAL = 90000;
var LOKI_MAX_INTERVAL = 240000;
var LOKI_ATTACK_TIMER = 20;
var XP_LOSS_PER_FAIL  = 40;
var HP_LOSS_PER_FAIL  = 15;
var HP_GAIN_PER_WIN   = 5;
var XP_GAIN_PER_WIN   = 25;
var SECTION_READ_TIME = 6000;


/* ─────────────────────────────────────────────────────────
   ESTADO INTERNO
───────────────────────────────────────────────────────── */
var STUDY_STATE = {
  activeModuleId:   null,
  activeSectionIdx: 0,
  sectionStartTime: 0,
  sectionsRead:     {},
  completedModules: [],
  lokiTimer:        null,
  lokiAttackActive: false,
  currentQuestions: [],
  currentQIdx:      0,
  questionTimer:    null,
  questionTimeLeft: 0,
  timerBarInterval: null,
  reachedBottom:    false,
  scrollHandler:    null,
};


/* ─────────────────────────────────────────────────────────
   CHAVE DE STORAGE ISOLADA POR USUÁRIO  [v4.1]
───────────────────────────────────────────────────────── */
function _studyStorageKey() {
  var userId = window._supabaseSession?.user?.id || null;
  if (userId) return 'aegis_study:' + userId;
  return 'aegis_study:anonymous';
}


/* ─────────────────────────────────────────────────────────
   PERSISTÊNCIA
───────────────────────────────────────────────────────── */
function saveStudyProgress() {
  try {
    localStorage.setItem(_studyStorageKey(), JSON.stringify({
      sectionsRead:     STUDY_STATE.sectionsRead,
      completedModules: STUDY_STATE.completedModules,
    }));
  } catch(e) {}
}

function loadStudyProgress() {
  try {
    var key = _studyStorageKey();
    var d = JSON.parse(localStorage.getItem(key) || '{}');
    STUDY_STATE.sectionsRead     = d.sectionsRead     || {};
    STUDY_STATE.completedModules = d.completedModules || [];
    console.log('[estudos] progresso carregado da chave:', key,
      '| módulos completos:', STUDY_STATE.completedModules.length);
  } catch(e) {
    STUDY_STATE.sectionsRead     = {};
    STUDY_STATE.completedModules = [];
  }
  injectStudyXpIntoState();
}

/* ─────────────────────────────────────────────────────────
   injectStudyXpIntoState  [v6.0 — INTEGRAÇÃO ranking.js v9]

   MUDANÇA v6.0:
     Após injetar o XP no STATE, dispara "aegis:xp-ready".
     O ranking.js v9 aguarda esse evento antes de salvar no Supabase,
     garantindo que o score gravado já inclui o XP dos estudos.

     Isso substitui o padrão antigo de setTimeout(1200ms) no ranking.js.
     O save manual via saveScoreToRanking() foi removido daqui —
     o Proxy do STATE detecta a mudança de score e agenda o save
     automaticamente via debounce (ranking.js v9 / _debouncedSave).
───────────────────────────────────────────────────────── */
function injectStudyXpIntoState() {
  if (typeof window.STATE === 'undefined') return;

  var completedCount = STUDY_STATE.completedModules.length;

  /* [v6.0] Sempre dispara xp-ready, mesmo sem módulos completos,
     para não deixar o gate do ranking.js esperando para sempre. */
  if (completedCount === 0) {
    window.dispatchEvent(new CustomEvent('aegis:xp-ready'));
    return;
  }

  var studyXpTotal = completedCount * XP_PER_MODULE;
  var S      = window.STATE;
  var target = S.__target__ || S;
  var currentScore = target.score || 0;

  if (currentScore < studyXpTotal) {
    var diff = studyXpTotal - currentScore;
    target.score = currentScore + diff;
    console.log('[estudos] XP injetado no STATE:', diff,
      '| total agora:', target.score,
      '| módulos completos:', completedCount);
  }

  if ((target.blocks || 0) < completedCount) {
    target.blocks = completedCount;
  }

  /* [v6.0] Sinaliza ao ranking.js v9 que o XP está pronto.
     O save no Supabase ocorrerá agora com o score correto. */
  window.dispatchEvent(new CustomEvent('aegis:xp-ready'));
  console.log('[estudos] aegis:xp-ready disparado ✓ | score:', target.score);

  /* Persiste localmente como camada extra de segurança */
  if (typeof persistStateLocally === 'function') {
    persistStateLocally();
  }
}

/* ─────────────────────────────────────────────────────────
   _flushState()  [v6.0 — sem syncRankingScore]

   MUDANÇA v6.0:
     Removida chamada a syncRankingScore().
     O Proxy do STATE no ranking.js v9 detecta mudanças em
     score/blocks/fails/aegisHp e agenda o save automaticamente
     com debounce de 1200ms. Manter syncRankingScore() aqui
     causava double-save e potencial gravação de score parcial.
───────────────────────────────────────────────────────── */
function _flushState() {
  if (typeof window.updateHUD    === 'function') window.updateHUD();
  if (typeof persistStateLocally === 'function') persistStateLocally();
  /* syncRankingScore() removido — Proxy do STATE cuida disso */
}

/* ─────────────────────────────────────────────────────────
   _estudosGrant — usa _grantXP global se disponível
───────────────────────────────────────────────────────── */
function _estudosGrant(opts) {
  if (typeof window._grantXP === 'function') {
    window._grantXP(opts);
    return;
  }
  var S = window.STATE;
  if (!S) return;
  if (opts.xp)     S.score   = Math.max(0, (S.score   || 0) + opts.xp);
  if (opts.hp)     S.aegisHp = Math.max(0, Math.min(100, (S.aegisHp ?? 100) + opts.hp));
  if (opts.blocks) S.blocks  = (S.blocks || 0) + opts.blocks;
  if (opts.fails)  S.fails   = (S.fails  || 0) + opts.fails;
  _flushState();
}


/* ─────────────────────────────────────────────────────────
   MÓDULOS
───────────────────────────────────────────────────────── */
function isModuleUnlocked(mod) {
  if (!mod.locked) return true;
  return STUDY_STATE.completedModules.indexOf(mod.unlockAfter) !== -1;
}

function isModuleComplete(moduleId) {
  return STUDY_STATE.completedModules.indexOf(moduleId) !== -1;
}

function markSectionRead(moduleId, sectionIdx) {
  if (!STUDY_STATE.sectionsRead[moduleId]) {
    STUDY_STATE.sectionsRead[moduleId] = [];
  }
  if (STUDY_STATE.sectionsRead[moduleId].indexOf(sectionIdx) === -1) {
    STUDY_STATE.sectionsRead[moduleId].push(sectionIdx);
  }
  saveStudyProgress();
  updateStudyUI();
  refreshCheckpointBar(moduleId);
}

function completeModule(moduleId) {
  if (!isModuleComplete(moduleId)) {
    STUDY_STATE.completedModules.push(moduleId);
    saveStudyProgress();
    onModuleCompleted(moduleId);
  }
}

/* ─────────────────────────────────────────────────────────
   onModuleCompleted  [v6.0 — sem save manual]

   MUDANÇA v6.0:
     Removido setTimeout(1500ms) + saveScoreToRanking() manual.
     _estudosGrant() altera S.score → o Proxy do STATE detecta
     e agenda _debouncedSave(1200ms) automaticamente.
     Isso elimina a race condition onde o save ocorria antes
     do Proxy processar a mudança de score.
───────────────────────────────────────────────────────── */
function onModuleCompleted(moduleId) {
  var mod = STUDY_MODULES.find(function(m) { return m.id === moduleId; });
  if (!mod) return;

  /* _estudosGrant muda S.score → Proxy → _debouncedSave automático */
  _estudosGrant({
    xp:     XP_PER_MODULE,
    blocks: 1,
    label:  'estudos:module-complete:' + moduleId,
  });

  /* Mensagem no bot (sem mudança) */
  setTimeout(function() {
    if (typeof appendMsg === 'function') {
      appendMsg(
        'Módulo "' + mod.title + '" concluído, Guardião. +' + XP_PER_MODULE +
        ' XP. O próximo território está desbloqueado — mas o Loki também evoluiu.',
        'bot'
      );
    }
  }, 500);

  renderModuleList();
}


/* ═══════════════════════════════════════════════════════════════
   NAVEGAÇÃO
═══════════════════════════════════════════════════════════════ */

function getActiveModuleIndex() {
  if (!STUDY_STATE.activeModuleId) return -1;
  return STUDY_MODULES.findIndex(function(m) { return m.id === STUDY_STATE.activeModuleId; });
}

function getPrevModule() {
  var idx = getActiveModuleIndex();
  if (idx <= 0) return null;
  return STUDY_MODULES[idx - 1];
}

function getNextModule() {
  var idx = getActiveModuleIndex();
  if (idx === -1 || idx >= STUDY_MODULES.length - 1) return null;
  var next = STUDY_MODULES[idx + 1];
  return isModuleUnlocked(next) ? next : null;
}

function getNextModuleLocked() {
  var idx = getActiveModuleIndex();
  if (idx === -1 || idx >= STUDY_MODULES.length - 1) return null;
  var next = STUDY_MODULES[idx + 1];
  return isModuleUnlocked(next) ? null : next;
}

function navigateToModule(moduleId) {
  openModule(moduleId);
  var panel = document.getElementById('study-content-panel');
  if (panel) panel.scrollTop = 0;
}


/* ═══════════════════════════════════════════════════════════════
   INIT / DESTROY
═══════════════════════════════════════════════════════════════ */

function initEstudos() {
  loadStudyProgress();

  var container = document.getElementById('estudos-container');
  if (!container) { console.error('[estudos.js] #estudos-container nao encontrado'); return; }
  container.innerHTML = '';
  container.appendChild(buildStudyLayout());
  renderModuleList();
  startLokiScheduler();
  setTimeout(function() {
    if (typeof botReactToSection === 'function') botReactToSection('estudos');
  }, 400);
}

function destroyEstudos() {
  stopLokiScheduler();
  stopQuestionTimer();
  detachScrollHandler();
  STUDY_STATE.lokiAttackActive = false;
  STUDY_STATE.activeModuleId   = null;
}

/* ─────────────────────────────────────────────────────────
   detachScrollHandler  [v5.1]
   Remove scroll E touchmove (iOS Safari)
───────────────────────────────────────────────────────── */
function detachScrollHandler() {
  var panel = document.getElementById('study-content-panel');
  if (panel && STUDY_STATE.scrollHandler) {
    panel.removeEventListener('scroll',    STUDY_STATE.scrollHandler);
    panel.removeEventListener('touchmove', STUDY_STATE.scrollHandler);
    STUDY_STATE.scrollHandler = null;
  }
}


/* ─── Layout ─── */
function buildStudyLayout() {
  var wrap    = el('div', 'study-layout');
  var sidebar = el('div', 'study-sidebar');
  sidebar.id  = 'study-sidebar';
  sidebar.appendChild(buildSidebarHeader());
  var moduleList  = el('div', 'study-module-list');
  moduleList.id   = 'study-module-list';
  sidebar.appendChild(moduleList);
  var content = el('div', 'study-content-panel');
  content.id  = 'study-content-panel';
  content.innerHTML = buildWelcomeHTML();
  wrap.appendChild(sidebar);
  wrap.appendChild(content);
  wrap.appendChild(buildLokiOverlay());
  return wrap;
}

function buildSidebarHeader() {
  var h = el('div', 'study-sidebar-header');
  h.innerHTML =
    '<span class="study-sidebar-icon svg-icon">' + SVGI.bookOpen + '</span>' +
    '<span class="study-sidebar-title">ARQUIVOS DE CAMPO</span>';
  return h;
}

function buildWelcomeHTML() {
  return '<div class="study-welcome">' +
    '<div class="study-welcome-icon svg-icon">' + SVGI.hexagon + '</div>' +
    '<h2 class="study-welcome-title">Selecione um modulo</h2>' +
    '<p class="study-welcome-desc">Escolha um arquivo de campo no painel a esquerda.<br>' +
    'Complete a Introducao para desbloquear os demais modulos.<br>' +
    'O Loki pode aparecer a qualquer momento.</p>' +
    '</div>';
}


/* ─── Lista de Módulos ─── */
function renderModuleList() {
  var list = document.getElementById('study-module-list');
  if (!list) return;
  list.innerHTML = '';

  STUDY_MODULES.forEach(function(mod) {
    var unlocked  = isModuleUnlocked(mod);
    var completed = isModuleComplete(mod.id);
    var active    = STUDY_STATE.activeModuleId === mod.id;
    var progress  = getModuleProgress(mod.id, mod.sections.length);

    var item = el('div', 'study-module-item' +
      (unlocked  ? '' : ' locked') +
      (completed ? ' completed' : '') +
      (active    ? ' active' : ''));

    var statusHTML;
    if (!unlocked) {
      statusHTML = '<span class="smi-status svg-icon">' + SVGI.lock + '</span>';
    } else if (completed) {
      statusHTML = '<span class="smi-status svg-icon" style="color:var(--study-green)">' + SVGI.checkCircle + '</span>';
    } else if (progress > 0) {
      statusHTML = '<span class="smi-status" style="font-family:var(--study-font-mono);font-size:10px">' + progress + '%</span>';
    } else {
      statusHTML = '<span class="smi-status"></span>';
    }

    item.innerHTML =
      '<div class="smi-header">' +
        '<span class="smi-icon svg-icon">' + (mod.svgIcon || SVGI.shield) + '</span>' +
        '<div class="smi-info">' +
          '<span class="smi-title">' + escapeHTML(mod.title)    + '</span>' +
          '<span class="smi-sub">'   + escapeHTML(mod.subtitle) + '</span>' +
        '</div>' +
        statusHTML +
      '</div>' +
      (unlocked && !completed && progress > 0
        ? '<div class="smi-progress-bar"><div class="smi-progress-fill" style="width:' + progress + '%"></div></div>'
        : '') +
      (!unlocked
        ? '<div class="smi-lock-msg">Complete "' + escapeHTML(getModuleTitle(mod.unlockAfter)) + '" para desbloquear</div>'
        : '');

    if (unlocked) item.addEventListener('click', function() { openModule(mod.id); });
    list.appendChild(item);
  });
}

function getModuleProgress(moduleId, totalSections) {
  if (!totalSections) return 0;
  return Math.round(((STUDY_STATE.sectionsRead[moduleId] || []).length / totalSections) * 100);
}

function getModuleTitle(moduleId) {
  var mod = STUDY_MODULES.find(function(m) { return m.id === moduleId; });
  return mod ? mod.title : moduleId;
}


/* ─── Abrir Módulo ─── */
function openModule(moduleId) {
  var mod = STUDY_MODULES.find(function(m) { return m.id === moduleId; });
  if (!mod || !isModuleUnlocked(mod)) return;
  detachScrollHandler();
  STUDY_STATE.activeModuleId   = moduleId;
  STUDY_STATE.activeSectionIdx = 0;
  STUDY_STATE.sectionStartTime = Date.now();
  STUDY_STATE.reachedBottom    = isModuleComplete(moduleId);
  renderModuleList();
  renderModuleContent(mod);
}


/* ─── Render conteúdo ─── */
function renderModuleContent(mod) {
  var panel = document.getElementById('study-content-panel');
  if (!panel) return;

  var progress   = getModuleProgress(mod.id, mod.sections.length);
  var prevMod    = getPrevModule();
  var nextMod    = getNextModule();
  var lockedNext = getNextModuleLocked();
  var modIdx     = getActiveModuleIndex();

  var html = '<div class="study-module-view">';

  html += '<div class="smv-header">' +
    '<span class="smv-icon svg-icon">' + (mod.svgIcon || SVGI.shield) + '</span>' +
    '<div class="smv-titles">' +
      '<h1 class="smv-title">'   + escapeHTML(mod.title)    + '</h1>' +
      '<p class="smv-subtitle">' + escapeHTML(mod.subtitle) + '</p>' +
    '</div>' +
    '<span class="smv-time">~' + mod.estimatedMin + ' min</span>' +
  '</div>';

  html += '<div class="smv-progress-wrap">' +
    '<div class="smv-progress-bar">' +
      '<div class="smv-progress-fill" id="smv-progress-fill" style="width:' + progress + '%"></div>' +
    '</div>' +
    '<span class="smv-progress-label" id="smv-progress-label">' + progress + '% lido</span>' +
  '</div>';

  html += buildModuleNavHTML(prevMod, nextMod, lockedNext, mod, modIdx, 'top');

  html += '<div class="smv-sections" id="smv-sections">';
  mod.sections.forEach(function(section, idx) {
    html += buildSectionHTML(section, idx, mod.id);
  });
  html += '</div>';

  html += buildCheckpointHTML(mod);
  html += buildModuleNavHTML(prevMod, nextMod, lockedNext, mod, modIdx, 'bottom');
  html += '</div>';

  panel.innerHTML = html;
  setupSectionObservers(mod);
  setupScrollToBottomDetector(mod);
}


/* ═══════════════════════════════════════════════════════════════
   CHECKPOINT
═══════════════════════════════════════════════════════════════ */

function buildCheckpointHTML(mod) {
  var completed = isModuleComplete(mod.id);
  var readCount = (STUDY_STATE.sectionsRead[mod.id] || []).length;
  var total     = mod.sections.length;
  var readPct   = total > 0 ? Math.round((readCount / total) * 100) : 0;
  var unlocked  = STUDY_STATE.reachedBottom || completed;

  if (completed) {
    return '<div id="smv-checkpoint" class="smv-checkpoint-wrap completed">' +
      '<div class="smv-checkpoint-done">' +
        '<span class="svg-icon" style="color:var(--study-green)">' + SVGI.checkCircle + '</span>' +
        '<span>Modulo concluido — +100 XP conquistado</span>' +
      '</div>' +
    '</div>';
  }

  return '<div id="smv-checkpoint" class="smv-checkpoint-wrap">' +
    '<span class="smv-checkpoint-title">Checkpoint</span>' +
    '<p class="smv-checkpoint-msg">' +
      'Confirme que voce absorveu o conteudo deste modulo para avancar e ganhar +100 XP.' +
    '</p>' +
    '<div class="smv-checkpoint-progress">' +
      '<div class="smv-checkpoint-progress-fill" id="smv-cp-fill" style="width:' + readPct + '%"></div>' +
    '</div>' +
    (!unlocked
      ? '<span class="smv-checkpoint-hint" id="smv-cp-hint">' +
          '<span class="svg-icon">' + SVGI.scroll + '</span>' +
          ' Role ate o final do modulo para desbloquear' +
        '</span>'
      : '') +
    '<button id="smv-checkpoint-btn"' +
      ' class="smv-checkpoint-btn' + (unlocked ? ' ready' : ' needs-scroll') + '"' +
      (unlocked ? '' : ' disabled') +
      ' onclick="handleCheckpointClick(\'' + mod.id + '\')">' +
        '<span class="svg-icon">' + SVGI.checkCircle + '</span>' +
        ' Conteudo Finalizado — +100 XP' +
    '</button>' +
  '</div>';
}

/* ─────────────────────────────────────────────────────────
   setupScrollToBottomDetector  [v5.1]
───────────────────────────────────────────────────────── */
function setupScrollToBottomDetector(mod) {
  var panel = document.getElementById('study-content-panel');
  if (!panel) return;

  if (STUDY_STATE.reachedBottom || isModuleComplete(mod.id)) {
    activateCheckpointBtn();
    return;
  }

  /* Fallback: conteúdo menor que o panel → desbloqueia direto */
  if (panel.scrollHeight <= panel.clientHeight + 50) {
    STUDY_STATE.reachedBottom = true;
    activateCheckpointBtn();
    return;
  }

  function onScroll() {
    if (STUDY_STATE.reachedBottom) return;
    var scrolled  = panel.scrollTop + panel.clientHeight;
    var threshold = panel.scrollHeight * 0.75;
    if (scrolled >= threshold) {
      STUDY_STATE.reachedBottom = true;
      activateCheckpointBtn();
      panel.removeEventListener('scroll',    onScroll);
      panel.removeEventListener('touchmove', onScroll);
      STUDY_STATE.scrollHandler = null;
    }
  }

  STUDY_STATE.scrollHandler = onScroll;
  panel.addEventListener('scroll',    onScroll, { passive: true });
  panel.addEventListener('touchmove', onScroll, { passive: true });
}

function activateCheckpointBtn() {
  var btn  = document.getElementById('smv-checkpoint-btn');
  var hint = document.getElementById('smv-cp-hint');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('needs-scroll');
    btn.classList.add('ready');
  }
  if (hint) hint.style.display = 'none';
}

function refreshCheckpointBar(moduleId) {
  if (STUDY_STATE.activeModuleId !== moduleId) return;
  var mod = STUDY_MODULES.find(function(m) { return m.id === moduleId; });
  if (!mod) return;
  var readCount = (STUDY_STATE.sectionsRead[moduleId] || []).length;
  var total     = mod.sections.length;
  var readPct   = total > 0 ? Math.round((readCount / total) * 100) : 0;
  var fill = document.getElementById('smv-cp-fill');
  if (fill) fill.style.width = readPct + '%';
}

function handleCheckpointClick(moduleId) {
  var mod = STUDY_MODULES.find(function(m) { return m.id === moduleId; });
  if (!mod) return;
  if (!STUDY_STATE.reachedBottom && !isModuleComplete(moduleId)) return;

  var btn = document.getElementById('smv-checkpoint-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="svg-icon">' + SVGI.checkCircle + '</span> Concluindo...';
  }

  setTimeout(function() {
    completeModule(moduleId);

    var cpEl = document.getElementById('smv-checkpoint');
    if (cpEl) cpEl.outerHTML = buildCheckpointHTML(mod);

    refreshNavButtons(mod, 'top');
    refreshNavButtons(mod, 'bottom');

    setTimeout(function() {
      var navEl = document.querySelector('.smv-module-nav--bottom');
      if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, 400);
}


/* ═══════════════════════════════════════════════════════════════
   NAVEGAÇÃO — HTML
═══════════════════════════════════════════════════════════════ */

function buildModuleNavHTML(prevMod, nextMod, lockedNext, currentMod, currentIdx, position) {
  var posClass = position === 'top' ? 'smv-module-nav--top' : 'smv-module-nav--bottom';
  var html = '<div class="smv-module-nav ' + posClass + '" data-nav-pos="' + position + '">';

  html += '<div class="smv-nav-side smv-nav-prev">';
  if (prevMod) {
    html +=
      '<button class="smv-nav-btn smv-nav-btn--prev" onclick="navigateToModule(\'' + prevMod.id + '\')">' +
        '<span class="smv-nav-arrow svg-icon">' + SVGI.arrowLeft + '</span>' +
        '<div class="smv-nav-info">' +
          '<span class="smv-nav-label">Modulo Anterior</span>' +
          '<span class="smv-nav-name">' + escapeHTML(prevMod.title) + '</span>' +
        '</div>' +
      '</button>';
  } else {
    html += '<div class="smv-nav-placeholder"></div>';
  }
  html += '</div>';

  var unlockedMods = STUDY_MODULES.filter(isModuleUnlocked);
  html += '<div class="smv-nav-center">';
  unlockedMods.forEach(function(m) {
    html += '<span class="smv-nav-dot' +
      (m.id === currentMod.id ? ' active' : '') +
      (isModuleComplete(m.id) ? ' done'   : '') +
      '" onclick="navigateToModule(\'' + m.id + '\')" title="' + escapeHTML(m.title) + '"></span>';
  });
  html += '</div>';

  html += '<div class="smv-nav-side smv-nav-next">';
  if (nextMod) {
    html +=
      '<button class="smv-nav-btn smv-nav-btn--next" onclick="navigateToModule(\'' + nextMod.id + '\')">' +
        '<div class="smv-nav-info">' +
          '<span class="smv-nav-label">Proximo Modulo</span>' +
          '<span class="smv-nav-name">' + escapeHTML(nextMod.title) + '</span>' +
        '</div>' +
        '<span class="smv-nav-arrow svg-icon">' + SVGI.arrowRight + '</span>' +
      '</button>';
  } else if (lockedNext) {
    html +=
      '<button class="smv-nav-btn smv-nav-btn--next smv-nav-btn--locked" disabled>' +
        '<div class="smv-nav-info">' +
          '<span class="smv-nav-label">Proximo Modulo</span>' +
          '<span class="smv-nav-name">' +
            '<span class="svg-icon" style="vertical-align:middle;margin-right:4px">' + SVGI.lock + '</span>' +
            escapeHTML(lockedNext.title) +
          '</span>' +
          '<span class="smv-nav-lock-hint">Conclua este modulo para desbloquear</span>' +
        '</div>' +
        '<span class="smv-nav-arrow smv-nav-arrow--dim svg-icon">' + SVGI.arrowRight + '</span>' +
      '</button>';
  } else {
    html +=
      '<div class="smv-nav-placeholder smv-nav-end">' +
        '<span class="smv-nav-end-label">[ FIM DO ARQUIVO ]</span>' +
      '</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

function refreshNavButtons(mod, position) {
  var panel = document.getElementById('study-content-panel');
  if (!panel) return;

  var navEl = panel.querySelector('.smv-module-nav[data-nav-pos="' + position + '"]');
  if (!navEl) return;

  var prevMod    = getPrevModule();
  var nextMod    = getNextModule();
  var lockedNext = getNextModuleLocked();
  var modIdx     = getActiveModuleIndex();

  var tmp = document.createElement('div');
  tmp.innerHTML = buildModuleNavHTML(prevMod, nextMod, lockedNext, mod, modIdx, position);
  var newNav = tmp.firstElementChild;

  navEl.parentNode.replaceChild(newNav, navEl);
}


/* ═══════════════════════════════════════════════════════════════
   SEÇÕES — RENDER
═══════════════════════════════════════════════════════════════ */

function buildSectionHTML(section, idx, moduleId) {
  var readClass = (STUDY_STATE.sectionsRead[moduleId] || []).indexOf(idx) !== -1 ? ' read' : '';
  var html = '<div class="smv-section' + readClass + '" data-section-idx="' + idx + '">';
  switch (section.type) {
    case 'text':  html += buildTextSection(section);  break;
    case 'cards': html += buildCardsSection(section); break;
    case 'code':  html += buildCodeSection(section);  break;
  }
  return html + '</div>';
}

function buildTextSection(s) {
  var paragraphs = s.content.split(/\n\n+/).map(function(p) {
    return '<p class="sec-body">' + escapeHTML(p).replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return '<div class="sec-text"><h3 class="sec-title">' + escapeHTML(s.title) + '</h3>' + paragraphs + '</div>';
}

function buildCardsSection(s) {
  var cardsHTML = s.cards.map(function(c) {
    return '<div class="sec-card">' +
      '<span class="sec-card-icon svg-icon">' + (c.svgIcon || SVGI.shield) + '</span>' +
      '<strong class="sec-card-term">' + escapeHTML(c.term) + '</strong>' +
      '<p class="sec-card-def">'       + escapeHTML(c.def)  + '</p>' +
    '</div>';
  }).join('');
  return '<div class="sec-cards-wrap"><h3 class="sec-title">' + escapeHTML(s.title) + '</h3>' +
    '<div class="sec-cards">' + cardsHTML + '</div></div>';
}

function buildCodeSection(s) {
  return '<div class="sec-code-wrap">' +
    '<h3 class="sec-title">' + escapeHTML(s.title) + '</h3>' +
    (s.description ? '<p class="sec-code-desc">' + escapeHTML(s.description) + '</p>' : '') +
    '<div class="sec-code-block">' +
      '<div class="sec-code-lang">' + escapeHTML(s.language || 'code') + '</div>' +
      '<pre class="sec-code"><code>' + escapeHTML(s.code) + '</code></pre>' +
    '</div></div>';
}

/* ─────────────────────────────────────────────────────────
   setupSectionObservers  [v5.1]
   root: panel (corrige mobile), threshold: 0.2
───────────────────────────────────────────────────────── */
function setupSectionObservers(mod) {
  if (!('IntersectionObserver' in window)) return;

  var panel    = document.getElementById('study-content-panel');
  var sections = document.querySelectorAll('#smv-sections .smv-section');
  var readTimers = {};

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var idx = parseInt(entry.target.dataset.sectionIdx, 10);
      if (entry.isIntersecting) {
        if (readTimers[idx]) return;
        readTimers[idx] = setTimeout(function() {
          markSectionRead(mod.id, idx);
          entry.target.classList.add('read');
          updateProgressUI(mod);
          delete readTimers[idx];
        }, SECTION_READ_TIME);
      } else {
        if (readTimers[idx]) {
          clearTimeout(readTimers[idx]);
          delete readTimers[idx];
        }
      }
    });
  }, {
    root:      panel,
    threshold: 0.2,
  });

  sections.forEach(function(s) { observer.observe(s); });
}

function updateProgressUI(mod) {
  var progress = getModuleProgress(mod.id, mod.sections.length);
  var fill  = document.getElementById('smv-progress-fill');
  var label = document.getElementById('smv-progress-label');
  if (fill)  fill.style.width  = progress + '%';
  if (label) label.textContent = progress + '% lido';
}

function updateStudyUI() {
  renderModuleList();
  if (STUDY_STATE.activeModuleId) {
    var mod = STUDY_MODULES.find(function(m) { return m.id === STUDY_STATE.activeModuleId; });
    if (mod) updateProgressUI(mod);
  }
}


/* ═══════════════════════════════════════════════════════════════
   LOKI — SCHEDULER (estudos)
═══════════════════════════════════════════════════════════════ */

function startLokiScheduler()  { scheduleNextLokiAttack(); }

function stopLokiScheduler() {
  if (STUDY_STATE.lokiTimer) { clearTimeout(STUDY_STATE.lokiTimer); STUDY_STATE.lokiTimer = null; }
}

function scheduleNextLokiAttack() {
  stopLokiScheduler();
  var delay = LOKI_MIN_INTERVAL + Math.random() * (LOKI_MAX_INTERVAL - LOKI_MIN_INTERVAL);
  STUDY_STATE.lokiTimer = setTimeout(triggerLokiAttack, delay);
}

function triggerLokiAttack() {
  if (!STUDY_STATE.activeModuleId || STUDY_STATE.lokiAttackActive) { scheduleNextLokiAttack(); return; }
  if (window.STATE && window.STATE.modalActive)                    { scheduleNextLokiAttack(); return; }

  var mod = STUDY_MODULES.find(function(m) { return m.id === STUDY_STATE.activeModuleId; });
  if (!mod || !mod.lokiQuestions || !mod.lokiQuestions.length)    { scheduleNextLokiAttack(); return; }

  if (!mod.unlockAfter) { scheduleNextLokiAttack(); return; }

  var currentIdx = STUDY_MODULES.findIndex(function(m) { return m.id === mod.id; });
  var pool = mod.lokiQuestions.slice();
  for (var i = 0; i < currentIdx; i++) {
    var prev = STUDY_MODULES[i];
    if (isModuleComplete(prev.id) && prev.lokiQuestions && prev.lokiQuestions.length) {
      pool = pool.concat(prev.lokiQuestions);
    }
  }

  var available = shuffleArray(pool);
  var count = Math.min(1 + Math.floor(Math.random() * 3), available.length);

  STUDY_STATE.currentQuestions = available.slice(0, count);
  STUDY_STATE.currentQIdx      = 0;
  STUDY_STATE.lokiAttackActive = true;
  if (window.STATE) window.STATE.modalActive = true;

  showLokiOverlay(mod);
}

function buildLokiOverlay() {
  var overlay = el('div', 'loki-study-overlay');
  overlay.id  = 'loki-study-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML =
    '<div class="loki-glitch-bar"></div>' +
    '<div class="loki-overlay-inner">' +
      '<div class="loki-header">' +
        '<span class="loki-moon svg-icon">' + SVGI.moon + '</span>' +
        '<div class="loki-titles">' +
          '<div class="loki-name">LOKI\'S SHADOWS</div>' +
          '<div class="loki-sub">// intrusion detectada - responda agora, Guardiao</div>' +
        '</div>' +
        '<div class="loki-q-counter" id="loki-q-counter">1 / 1</div>' +
      '</div>' +
      '<div class="loki-taunt-wrap"><p class="loki-taunt" id="loki-taunt">...</p></div>' +
      '<div class="loki-timer-wrap">' +
        '<div class="loki-timer-bar"><div class="loki-timer-fill" id="loki-timer-fill"></div></div>' +
        '<span class="loki-timer-label" id="loki-timer-label">20</span>' +
      '</div>' +
      '<div class="loki-question" id="loki-question"></div>' +
      '<div class="loki-options"  id="loki-options"></div>' +
      '<div class="loki-result"   id="loki-result" style="display:none"></div>' +
    '</div>';
  return overlay;
}

async function showLokiOverlay(mod) {
  var overlay = document.getElementById('loki-study-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.classList.add('glitch-in');
  setTimeout(function() { overlay.classList.remove('glitch-in'); }, 600);

  var tauntEl = document.getElementById('loki-taunt');
  tauntEl.textContent = '...';
  if (typeof generateLokiTaunt === 'function') {
    var taunt = await generateLokiTaunt(mod.title, null);
    tauntEl.textContent = taunt || 'Entao voce acha que leu o suficiente para me parar, Guardiao?';
  } else {
    tauntEl.textContent = 'Entao voce acha que leu o suficiente para me parar, Guardiao?';
  }
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  var q       = STUDY_STATE.currentQuestions[STUDY_STATE.currentQIdx];
  var total   = STUDY_STATE.currentQuestions.length;
  var current = STUDY_STATE.currentQIdx + 1;
  if (!q) return;

  var counter = document.getElementById('loki-q-counter');
  if (counter) counter.textContent = current + ' / ' + total;

  var qEl = document.getElementById('loki-question');
  if (qEl) qEl.textContent = q.question;

  var oEl = document.getElementById('loki-options');
  if (oEl) {
    oEl.innerHTML = '';
    q.options.forEach(function(opt, idx) {
      var btn = el('button', 'loki-option');
      btn.textContent = opt;
      btn.addEventListener('click', function() { handleLokiAnswer(idx); });
      oEl.appendChild(btn);
    });
  }

  var rEl = document.getElementById('loki-result');
  if (rEl) rEl.style.display = 'none';
  startQuestionTimer();
}


/* ═══════════════════════════════════════════════════════════════
   LOKI — RESPOSTA (estudos)
═══════════════════════════════════════════════════════════════ */

function handleLokiAnswer(selectedIdx) {
  stopQuestionTimer();
  var q       = STUDY_STATE.currentQuestions[STUDY_STATE.currentQIdx];
  var correct = selectedIdx === q.correct;

  document.querySelectorAll('.loki-option').forEach(function(btn, i) {
    btn.disabled = true;
    if (i === q.correct)               btn.classList.add('correct');
    if (i === selectedIdx && !correct) btn.classList.add('wrong');
  });

  var rEl = document.getElementById('loki-result');
  if (rEl) {
    rEl.style.display = 'block';
    rEl.className = 'loki-result ' + (correct ? 'win' : 'fail');
    rEl.innerHTML = correct
      ? '<span class="lr-icon svg-icon">' + SVGI.checkCircle + '</span> <strong>Bloqueado.</strong> ' + escapeHTML(q.explanation)
      : '<span class="lr-icon svg-icon">' + SVGI.alertTri   + '</span> <strong>Falha.</strong> '     + escapeHTML(q.explanation);
  }

  correct ? applyLokiReward() : applyLokiPenalty();

  setTimeout(function() {
    STUDY_STATE.currentQIdx++;
    STUDY_STATE.currentQIdx < STUDY_STATE.currentQuestions.length
      ? renderCurrentQuestion()
      : endLokiAttack(correct);
  }, 2800);
}

function handleLokiTimeout() {
  stopQuestionTimer();
  applyLokiPenalty();

  var rEl = document.getElementById('loki-result');
  if (rEl) {
    rEl.style.display = 'block';
    rEl.className = 'loki-result fail';
    rEl.innerHTML = '<span class="lr-icon svg-icon">' + SVGI.alertTri + '</span> <strong>Tempo esgotado.</strong> No mundo real: comprometimento total.';
  }
  document.querySelectorAll('.loki-option').forEach(function(btn) { btn.disabled = true; });

  setTimeout(function() {
    STUDY_STATE.currentQIdx++;
    STUDY_STATE.currentQIdx < STUDY_STATE.currentQuestions.length
      ? renderCurrentQuestion()
      : endLokiAttack(false);
  }, 2800);
}

function endLokiAttack(lastCorrect) {
  STUDY_STATE.lokiAttackActive = false;
  if (window.STATE) window.STATE.modalActive = false;
  var overlay = document.getElementById('loki-study-overlay');
  if (overlay) {
    overlay.classList.add('glitch-out');
    setTimeout(function() { overlay.style.display = 'none'; overlay.classList.remove('glitch-out'); }, 500);
  }
  if (typeof aegisReactToResult === 'function') aegisReactToResult(lastCorrect, STUDY_STATE.activeModuleId || 'estudos');
  if (window.STATE && window.STATE.aegisHp <= 0) { handleStudyGameOver(); return; }
  scheduleNextLokiAttack();
}

function startQuestionTimer() {
  stopQuestionTimer();
  STUDY_STATE.questionTimeLeft = LOKI_ATTACK_TIMER;
  updateTimerUI();
  STUDY_STATE.timerBarInterval = setInterval(function() {
    STUDY_STATE.questionTimeLeft -= 0.1;
    updateTimerUI();
    if (STUDY_STATE.questionTimeLeft <= 0) { stopQuestionTimer(); handleLokiTimeout(); }
  }, 100);
}

function stopQuestionTimer() {
  if (STUDY_STATE.timerBarInterval) { clearInterval(STUDY_STATE.timerBarInterval); STUDY_STATE.timerBarInterval = null; }
}

function updateTimerUI() {
  var pct   = (STUDY_STATE.questionTimeLeft / LOKI_ATTACK_TIMER) * 100;
  var fill  = document.getElementById('loki-timer-fill');
  var label = document.getElementById('loki-timer-label');
  if (fill)  { fill.style.width = pct + '%'; fill.className = 'loki-timer-fill' + (pct < 30 ? ' critical' : ''); }
  if (label) label.textContent = Math.ceil(STUDY_STATE.questionTimeLeft);
}


/* ═══════════════════════════════════════════════════════════════
   LOKI — RECOMPENSA / PENALIDADE
═══════════════════════════════════════════════════════════════ */

function applyLokiReward() {
  _estudosGrant({
    xp:     XP_GAIN_PER_WIN,
    hp:     HP_GAIN_PER_WIN,
    blocks: 1,
    label:  'estudos:loki-reward',
  });
}

function applyLokiPenalty() {
  _estudosGrant({
    xp:    -XP_LOSS_PER_FAIL,
    hp:    -HP_LOSS_PER_FAIL,
    fails:  1,
    label:  'estudos:loki-penalty',
  });
}

function handleStudyGameOver() {
  var overlay = document.getElementById('loki-study-overlay');
  if (overlay) overlay.style.display = 'none';
  stopLokiScheduler();
  if (typeof appendMsg === 'function') {
    appendMsg('Integridade zerada, Guardiao. O Loki atravessou todas as defesas. ' +
      'Isso nao e o fim - e o custo de estudar sem absorver. Reinicie e volte mais forte.', 'bot');
  }
  if (window.STATE) window.STATE.aegisHp = 100;
  _flushState();
  setTimeout(scheduleNextLokiAttack, 60000);
}


/* ═══════════════════════════════════════════════════════════════
   LISTENER aegis:nick-set  [v6.0 — simplificado]

   MUDANÇA v6.0:
     Removidos loadStudyProgress() + injectStudyXpIntoState()
     redundantes. O ranking.js v9 já chama syncFromServer() que
     restaura o STATE com Math.max (nunca regride).
     O aegis:xp-ready disparado no loadStudyProgress() do init
     garante que o XP dos módulos é somado antes do save.
     Re-injetar aqui causava double-dispatch de aegis:xp-ready.
═══════════════════════════════════════════════════════════════ */
/* (listener removido — ranking.js v9 cuida da sincronização) */


/* ═══════════════════════════════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════════════════════════════ */

function el(tag, className) {
  var e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function getState() {
  return window.STATE || { score: 0, aegisHp: 100, blocks: 0, fails: 0 };
}