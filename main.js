/* ─── BINARY BACKGROUND ──────────────────────────────────── */
function initBinBg() {
  const bg = document.getElementById('binBg');
  if (!bg) return;
  const cols = Math.floor(window.innerWidth / 22);
  for (let i = 0; i < cols; i++) {
    const c = document.createElement('div');
    c.className = 'bin-col';
    c.style.left = (i * 22) + 'px';
    const d = 8 + Math.random() * 14;
    c.style.animationDuration = d + 's';
    c.style.animationDelay = (-Math.random() * d) + 's';
    let s = '';
    for (let j = 0; j < 30; j++) s += Math.random() > 0.5 ? '1' : '0';
    c.textContent = s;
    bg.appendChild(c);
  }
}

/* ═══════════════════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════════════════ */
window.STATE = {
  currentSection:     'home',
  score:              0,
  aegisHp:            100,
  blocks:             0,
  fails:              0,
  lokiLevel:          1,
  modalActive:        false,
  timerInterval:      null,
  lokiTimeout:        null,
  timerSecs:          15,
  fcIndex:            0,
  fcFlipped:          false,
  rkTab:              'global',
  completedMissions:  [],
  activeMissionId:    1,
  currentMissionPage: 1,
};

var STATE = window.STATE;

/* ─── GUARD ──────────────────────────────────────────────── */
function call(fn, ...args) {
  if (typeof fn === 'function') return fn(...args);
}

/* ─── HUD UPDATE ─────────────────────────────────────────── */
function updateHUD() {
  const S = window.STATE || STATE;
  const $ = id => document.getElementById(id);

  if ($('scoreDisplay'))  $('scoreDisplay').textContent  = S.score;
  if ($('blocksDisplay')) $('blocksDisplay').textContent = S.blocks;
  if ($('failsDisplay'))  $('failsDisplay').textContent  = S.fails;

  const bar = $('aegisHpBar'), hpTxt = $('hpText');
  if (bar && hpTxt) {
    const pct = Math.max(0, S.aegisHp ?? 100);
    bar.style.width      = pct + '%';
    hpTxt.textContent    = pct + '%';
    bar.style.background = pct <= 30 ? 'var(--red)' : pct <= 60 ? 'var(--yellow)' : 'var(--green)';
    bar.style.boxShadow  = pct <= 30 ? '0 0 6px var(--red-glow)' : '0 0 6px var(--green-glow)';
    if (pct <= 30 && pct > 0) bar.classList.add('hp-critical');
    else                      bar.classList.remove('hp-critical');
  }
}

window._grantXP = function(opts) {
  const S = window.STATE;

  if (opts.xp)     S.score   = Math.max(0, (S.score   || 0) + opts.xp);
  if (opts.hp)     S.aegisHp = Math.max(0, Math.min(100, (S.aegisHp ?? 100) + opts.hp));
  if (opts.blocks) S.blocks  = (S.blocks || 0) + opts.blocks;
  if (opts.fails)  S.fails   = (S.fails  || 0) + opts.fails;

  updateHUD();

  if (typeof persistStateLocally === 'function') persistStateLocally();

  if (opts.label) {
    console.log('[_grantXP]', opts.label,
      '| score:', S.score,
      '| hp:', S.aegisHp,
      '| blocks:', S.blocks);
  }

  if (opts.hp && opts.hp < 0) checkAegisDeath();
};

function lokiCanAttack() {
  return (
    typeof MISSION_STATE !== 'undefined' &&
    MISSION_STATE.activeMissionId != null
  );
}

function onMissionStarted(missionId) {
  if (window.STATE.lokiTimeout) {
    clearTimeout(window.STATE.lokiTimeout);
    window.STATE.lokiTimeout = null;
  }
  if (lokiCanAttack()) scheduleAttack();

  if (typeof startMission === 'function' && missionId) {
    startMission(missionId).catch(e => {
      console.warn('[main] startMission erro:', e?.message);
    });
  }
}

function onMissionEnded() {
  if (window.STATE.lokiTimeout) {
    clearTimeout(window.STATE.lokiTimeout);
    window.STATE.lokiTimeout = null;
  }
}

function onMissionCompleted(missionId, xpReward) {
  const S = window.STATE;
  if (S.completedMissions.includes(missionId)) return;

  if (S.aegisHp < 100) {
    S.aegisHp = Math.min(100, (S.aegisHp || 0) + 15);
    updateHUD();
    showHealNotif('+15% integridade // missão concluída!');
  }

  onMissionEnded();

  if (typeof completeMission === 'function') {
    completeMission(missionId, xpReward).catch(e => {
      console.warn('[main] completeMission erro:', e?.message);
    });
  } else {
    const xp = xpReward || 200;
    if (!S.completedMissions.includes(missionId)) {
      S.completedMissions.push(missionId);
    }
    window._grantXP({ xp, blocks: 1, label: 'missao:complete:' + missionId });
    if (typeof syncRankingScore === 'function') syncRankingScore();
  }
}

/* ─── SECTION NAVIGATION ─────────────────────────────────── */
function navigate(section) {
  document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById('view-' + section);
  if (view) view.classList.add('active');

  const navEl = document.querySelector(`[data-section="${section}"]`);
  if (navEl) navEl.classList.add('active');

  window.STATE.currentSection = section;

  const crumb = document.getElementById('breadcrumb-section');
  if (crumb) crumb.textContent = section;

  if (section !== 'estudos' && typeof destroyEstudos === 'function') destroyEstudos();

  if      (section === 'home')       initHome();
  else if (section === 'missoes')    initMissions();
  else if (section === 'flashcards') initFlashcards();
  else if (section === 'progresso')  initProgresso();
  else if (section === 'ranking')    initRanking();
  else if (section === 'estudos')    call(initEstudos);
  else if (section === 'simulados')  call(initSimulados);

  const S = window.STATE;
  if (S.lokiTimeout && section !== 'missoes') {
    clearTimeout(S.lokiTimeout);
    S.lokiTimeout = null;
  }

  if (typeof botReactToSection === 'function') {
    setTimeout(() => botReactToSection(section), 800);
  }
}

/* ─── initRanking ────────────────────────────────────────── */
function initRanking() {
  if (typeof window.refreshRankingView === 'function') {
    window.refreshRankingView();
  }
}

/* ─── HOME INIT ──────────────────────────────────────────── */
function initHome() {
  const S = window.STATE;
  setTimeout(() => {
    document.querySelectorAll('.tm-fill').forEach(f => {
      const w = f.getAttribute('data-width');
      if (w) f.style.width = w;
    });

    const fill = document.getElementById('amcProgressFill');
    if (fill) {
      const pct = S.completedMissions.includes(1)
        ? 100
        : (typeof MISSION_STATE !== 'undefined' && MISSION_STATE.currentStep)
          ? Math.round(((MISSION_STATE.currentStep - 1) / 4) * 100)
          : 0;
      fill.style.width = pct + '%';
    }
  }, 300);
}

/* ─── MISSIONS INIT ──────────────────────────────────────── */
function initMissions() {
  call(refreshMissionsList);
}

/* ─── goTo() ─────────────────────────────────────────────── */
function goTo(n) {
  const missionId = (typeof MISSION_STATE !== 'undefined')
    ? MISSION_STATE.activeMissionId : 1;
  const m = (typeof MISSIONS_DATA !== 'undefined')
    ? MISSIONS_DATA.find(x => x.id === missionId) : null;
  call(goToStep, n, m);
}

/* ─── FLASHCARDS ─────────────────────────────────────────── */
function getFlashcards() {
  if (typeof FLASHCARDS !== 'undefined' && FLASHCARDS.length) return FLASHCARDS;
  return [
    { tag: 'COMANDO',  q: 'O que é Command Injection?',                  a: 'Injeção de <span class="hl">comandos do sistema</span> via input não sanitizado.',    deck: 'missão-01' },
    { tag: 'DEFESA',   q: 'Por que execFile() é mais seguro?',            a: 'Sem shell intermediário — <code>;</code> é texto literal, não separador.',            deck: 'missão-01' },
    { tag: 'REGEX',    q: 'O que faz /^[\\w\\-\\.]+$/?',                 a: 'Whitelist: aceita chars seguros, rejeita <code>; && |</code>.',                       deck: 'missão-01' },
    { tag: 'PATH',     q: 'Para que serve path.basename()?',              a: 'Remove diretórios do path — neutraliza path traversal.',                               deck: 'missão-01' },
    { tag: 'IDOR',     q: 'O que é IDOR?',                                a: 'Acesso a objetos via ID controlável sem verificar autorização.',                       deck: 'missão-02' },
    { tag: 'JWT',      q: 'Por que alg:none é perigoso?',                 a: 'Remove a assinatura — token aceito sem verificação criptográfica.',                   deck: 'missão-03' },
    { tag: 'SSRF',     q: 'O que expõe 169.254.169.254?',                 a: 'Credenciais IAM temporárias da Lambda — acesso total à conta AWS.',                   deck: 'missão-04' },
    { tag: 'SUPPLY',   q: 'Por que versão * no package.json é perigosa?', a: 'Instala qualquer nova versão automaticamente — incluindo comprometidas.',             deck: 'missão-05' },
    { tag: 'IAM',      q: 'O que é Least Privilege?',                     a: 'Cada entidade tem apenas as <span class="hl">permissões mínimas</span> necessárias.', deck: 'missão-06' },
  ];
}

function initFlashcards() {
  window.STATE.fcIndex   = 0;
  window.STATE.fcFlipped = false;
  renderFlashcard();
  updateFcCounter();
}

function renderFlashcard() {
  const cards = getFlashcards();
  const fc    = cards[window.STATE.fcIndex];
  const card  = document.getElementById('flashcard');
  if (!card || !fc) return;
  card.classList.remove('flipped');
  window.STATE.fcFlipped = false;
  const tagEl = document.querySelector('.fc-tag');
  const qEl   = document.querySelector('.fc-q');
  const aEl   = document.querySelector('.fc-answer');
  if (tagEl) tagEl.textContent = fc.tag;
  if (qEl)   qEl.textContent   = fc.q;
  if (aEl)   aEl.innerHTML     = fc.a;
}

function flipCard() {
  const card = document.getElementById('flashcard');
  if (!card) return;
  window.STATE.fcFlipped = !window.STATE.fcFlipped;
  card.classList.toggle('flipped', window.STATE.fcFlipped);

  if (window.STATE.fcFlipped) {
    const S = window.STATE;
    if (S.aegisHp > 0 && S.aegisHp < 100) {
      S.aegisHp = Math.min(100, (S.aegisHp || 0) + 3);
      updateHUD();
      showHealNotif('+3% integridade // flashcard estudado');
    }
  }
}

function nextCard() {
  const cards = getFlashcards();
  window.STATE.fcIndex = (window.STATE.fcIndex + 1) % cards.length;
  renderFlashcard(); updateFcCounter();
}

function prevCard() {
  const cards = getFlashcards();
  window.STATE.fcIndex = (window.STATE.fcIndex - 1 + cards.length) % cards.length;
  renderFlashcard(); updateFcCounter();
}

function updateFcCounter() {
  const cards = getFlashcards();
  const el    = document.getElementById('fcCounter');
  if (el) el.innerHTML = `card <span>${window.STATE.fcIndex + 1}</span> / <span>${cards.length}</span> &nbsp;// deck: <span>${cards[window.STATE.fcIndex]?.deck || '—'}</span>`;
}

/* ─── PROGRESSO ──────────────────────────────────────────── */
function initProgresso() {
  const S  = window.STATE;
  const ps = document.getElementById('progScore');
  const pb = document.getElementById('progBlocks');
  const pm = document.getElementById('progMissions');
  if (ps) ps.textContent = S.score;
  if (pb) pb.textContent = S.blocks;
  if (pm) pm.textContent = Array.isArray(S.completedMissions) ? S.completedMissions.length : 0;

  const m1Progress = S.completedMissions.includes(1)
    ? 100
    : (typeof MISSION_STATE !== 'undefined' && MISSION_STATE.currentStep && MISSION_STATE.activeMissionId === 1)
      ? Math.round(((MISSION_STATE.currentStep - 1) / 4) * 100)
      : 0;

  setTimeout(() => {
    document.querySelectorAll('.skill-fill').forEach(f => {
      const nameEl = f.closest('.skill-item')?.querySelector('.skill-name');
      const isCmd  = nameEl?.textContent?.includes('Command Injection');
      if (isCmd) {
        f.style.width = m1Progress + '%';
        const pctEl = f.closest('.skill-item')?.querySelector('.skill-pct');
        if (pctEl && pctEl.classList.contains('unlocked')) pctEl.textContent = m1Progress + '%';
        if (nameEl) nameEl.innerHTML = `<span class="unlocked">Command Injection</span> — ${
          S.completedMissions.includes(1) ? 'concluída ✓' :
          m1Progress > 0 ? `${m1Progress}% concluído` : 'em progresso'
        }`;
      } else {
        if (!f.classList.contains('locked')) {
          const w = f.getAttribute('data-width');
          if (w) f.style.width = w;
        }
      }
    });
  }, 300);
}

/* ─── LOKI ATTACK SYSTEM ─────────────────────────────────── */
function getAttacks() {
  if (typeof ATTACKS !== 'undefined' && ATTACKS.length) return ATTACKS;
  return [{
    payload: 'report.pdf; cat /etc/passwd',
    type: 'Command Injection — básico', level: 1,
    taunt: '<span class="lk-hl">Clássico.</span> Funciona quando não há validação.',
    choices: [
      { t: 'Validar com regex /^[\\w\\-\\.]+$/', ok: true,  fb: '✓ Whitelist rejeita ; — bloqueado.' },
      { t: 'Usar exec() com escape manual',      ok: false, fb: '❌ Escape manual falha em edge cases.' },
      { t: 'Converter para lowercase',           ok: false, fb: '❌ Lowercase não remove chars especiais.' },
      { t: 'Logar e processar assim mesmo',      ok: false, fb: '❌ Logar sem bloquear é inútil.' },
    ],
  }];
}

let atkIndex = 0;

const LOKI_WINS = [
  'Você <span style="color:var(--red)">falhou.</span> O ÆGIS sangra.',
  'Muito devagar. <span style="color:var(--red)">Ataques reais não esperam.</span>',
  'Sabia a teoria mas não aplicou. <span style="color:var(--loki-purple)">Essa é a diferença.</span>',
];

const LOKI_LOSES = [
  'Bloqueado desta vez. <span style="color:var(--loki-purple)">Mas tenho outros vetores.</span>',
  'Boa defesa. <span style="color:var(--loki-purple)">Vou precisar escalar.</span>',
  'Você aprendeu bem. <span style="color:var(--red)">Isso me irrita levemente.</span>',
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function scheduleAttack() {
  const S = window.STATE;
  if (S.lokiTimeout) { clearTimeout(S.lokiTimeout); S.lokiTimeout = null; }
  const delay = Math.max(9000, 22000 - (S.lokiLevel - 1) * 3500) + Math.random() * 4000;
  S.lokiTimeout = setTimeout(launchAttack, delay);
}

function launchAttack() {
  const S = window.STATE;
  if (S.modalActive) { scheduleAttack(); return; }
  if (!lokiCanAttack()) return;
  const attacks = getAttacks();
  const atk     = attacks[atkIndex % attacks.length];
  atkIndex++;
  disruptAegis(atk);
  setTimeout(() => openModal(atk), 1200);
}

function disruptAegis(atk) {
  if (typeof triggerHackAnimation === 'function') {
    triggerHackAnimation();
  } else {
    const glitch = document.getElementById('panelGlitch');
    if (glitch) { glitch.classList.add('show'); setTimeout(() => glitch.classList.remove('show'), 500); }
  }
  const $ = id => document.getElementById(id);
  if ($('botAvatar')) { $('botAvatar').classList.add('damaged'); $('botAvatar').textContent = '☽'; }
  if ($('botPill'))   { $('botPill').className = 'bot-status-pill danger'; $('botPill').innerHTML = '<span class="sdot p"></span>INTRUSO'; }
  if ($('botName'))   { $('botName').style.color = 'var(--red)'; $('botName').textContent = '// INTERROMPIDO'; }
  if ($('botSub'))    $('botSub').textContent = '// loki\'s shadows detectado';

  call(appendMsg, `⚡ <span style="color:var(--loki-purple)">LOKI'S SHADOWS</span> <span style="color:var(--red)">interrompe o ÆGIS-BOT...</span>`, 'loki', 'loki-msg');
  setTimeout(() => {
    call(appendMsg, `<span style="color:var(--red)">Guardião.</span> Detectei sua função. <span style="color:var(--loki-purple)">Tipo: ${atk.type}</span>`, 'loki', 'loki-msg');
  }, 600);
}

function openModal(atk) {
  const S = window.STATE;
  S.modalActive = true;
  S.timerSecs   = Math.max(8, 15 - (S.lokiLevel - 1) * 2);
  const $ = id => document.getElementById(id);

  const tauntEl = $('lmTaunt');
  if (tauntEl) {
    tauntEl.innerHTML = atk.taunt;
    if (typeof generateLokiTaunt === 'function') {
      generateLokiTaunt(atk.type).then(t => { if (t && tauntEl) tauntEl.innerHTML = t; });
    }
  }

  if ($('lmPayload'))    $('lmPayload').textContent = atk.payload;
  if ($('lmResult'))     $('lmResult').classList.remove('show');
  if ($('lmChoicesSec')) $('lmChoicesSec').style.display = '';
  if ($('lmPayloadSec')) $('lmPayloadSec').style.display = '';

  const choicesEl = $('lmChoices');
  if (choicesEl) {
    choicesEl.innerHTML = '';
    const shuffled = [...atk.choices].map((c, i) => ({ ...c, origIdx: i })).sort(() => Math.random() - 0.5);
    shuffled.forEach((ch, i) => {
      const b = document.createElement('button');
      b.className   = 'lm-choice-btn';
      b.textContent = ch.t;
      b.id          = 'lmc' + i;
      b.onclick     = () => answerLoki(i, shuffled);
      choicesEl.appendChild(b);
    });
  }

  const fill = $('timerFill');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '100%'; fill.style.background = 'var(--red)'; }
  if ($('timerCount')) $('timerCount').textContent = S.timerSecs + 's';

  const modal    = $('lokiModal');
  const backdrop = $('lmBackdrop');
  if (modal)    { modal.style.display = 'block'; modal.classList.add('active'); }
  if (backdrop) backdrop.classList.add('show');

  setTimeout(() => {
    if (fill) { fill.style.transition = `width ${S.timerSecs}s linear`; fill.style.width = '0%'; }
    startTimer();
  }, 100);

  setTimeout(() => call(appendMsg, `⚡ <span class="danger">Ataque: <span class="hl">${atk.type}</span></span> — <span class="hl">${S.timerSecs}s</span> para defender.`, 'bot'), 400);
}

function startTimer() {
  const S = window.STATE;
  clearInterval(S.timerInterval);
  let elapsed = 0;
  S.timerInterval = setInterval(() => {
    elapsed++;
    const left = S.timerSecs - elapsed;
    const tc   = document.getElementById('timerCount');
    const fill = document.getElementById('timerFill');
    if (tc)   tc.textContent = left + 's';
    if (fill && (left / S.timerSecs) < 0.35) fill.style.background = '#ff1a1a';
    if (left <= 0) { clearInterval(S.timerInterval); onTimeout(); }
  }, 1000);
}

function answerLoki(i, shuffled) {
  clearInterval(window.STATE.timerInterval);
  document.querySelectorAll('.lm-choice-btn').forEach(b => b.disabled = true);
  const ch  = shuffled[i];
  const btn = document.getElementById('lmc' + i);

  if (ch.ok) {
    if (btn) btn.classList.add('correct-anim');
    const xpGain = 60 + window.STATE.lokiLevel * 20;
    window._grantXP({ xp: xpGain, hp: 5, blocks: 1, label: 'missoes:loki-block' });
    window.STATE.lokiLevel++;
    setTimeout(() => showResult(true, ch.fb), 400);
  } else {
    if (btn) btn.classList.add('wrong-anim');
    shuffled.forEach((c, j) => {
      if (c.ok) {
        const b = document.getElementById('lmc' + j);
        if (b) b.classList.add('correct-anim');
      }
    });
    window._grantXP({ hp: -3, fails: 1, label: 'missoes:loki-fail' });
    setTimeout(() => showResult(false, ch.fb, false, ch.t), 400);
  }
}

function onTimeout() {
  document.querySelectorAll('.lm-choice-btn').forEach(b => b.disabled = true);
  window._grantXP({ hp: -5, fails: 1, label: 'missoes:timeout' });
  showResult(false,
    '<span style="color:var(--red)">⏱ Tempo esgotado.</span> No mundo real: comprometimento total.',
    true
  );
}

function showResult(win, feedback, timeout = false, lastChoice = null) {
  const $ = id => document.getElementById(id);
  if ($('lmChoicesSec')) $('lmChoicesSec').style.display = 'none';
  if ($('lmPayloadSec')) $('lmPayloadSec').style.display = 'none';

  const attacks    = getAttacks();
  const attackType = attacks[(atkIndex - 1) % attacks.length]?.type || 'unknown';

  if (win) {
    if ($('lmResIcon'))  { $('lmResIcon').textContent = '⊞'; $('lmResIcon').style.color = 'var(--green)'; }
    if ($('lmResTitle')) { $('lmResTitle').textContent = 'ATAQUE BLOQUEADO'; $('lmResTitle').style.color = 'var(--green)'; }
    if ($('lmResMsg'))   $('lmResMsg').innerHTML = `${feedback}<br><br><span style="color:var(--green)">+${60 + window.STATE.lokiLevel * 20} XP &nbsp;//&nbsp; Loki escala nível ${window.STATE.lokiLevel}</span>`;
    if ($('lmCloseBtn')) { $('lmCloseBtn').className = 'lm-close-btn'; $('lmCloseBtn').textContent = '[ continuar ]'; }
    if ($('lmTaunt')) {
      $('lmTaunt').innerHTML = rnd(LOKI_LOSES);
      if (typeof generateLokiTaunt === 'function') generateLokiTaunt(attackType).then(t => { if (t && $('lmTaunt')) $('lmTaunt').innerHTML = t; });
    }
    setTimeout(recoverAegis, 300);
  } else {
    const currentHp = window.STATE.aegisHp;
    if ($('lmResIcon'))  { $('lmResIcon').textContent = '☽'; $('lmResIcon').style.color = 'var(--red)'; }
    if ($('lmResTitle')) { $('lmResTitle').textContent = 'DEFESA FALHOU'; $('lmResTitle').style.color = 'var(--red)'; }
    if ($('lmResMsg'))   $('lmResMsg').innerHTML = `${feedback}<br><br><span style="color:var(--red)">ÆGIS: ${currentHp <= 0 ? '<strong>CRÍTICO — SISTEMA COMPROMETIDO</strong>' : `-5% integridade → ${currentHp}% restante`}</span>`;
    if ($('lmCloseBtn')) { $('lmCloseBtn').className = 'lm-close-btn red'; $('lmCloseBtn').textContent = '[ reconhecer derrota ]'; }
    if ($('lmTaunt')) {
      $('lmTaunt').innerHTML = rnd(LOKI_WINS);
      if (typeof generateLokiTaunt === 'function') generateLokiTaunt(attackType, lastChoice).then(t => { if (t && $('lmTaunt')) $('lmTaunt').innerHTML = t; });
    }
  }

  if ($('lmTaunt'))  $('lmTaunt').style.display = '';
  if ($('lmResult')) $('lmResult').classList.add('show');

  if (typeof aegisReactToResult === 'function') {
    aegisReactToResult(win, attackType);
  }
}

function recoverAegis() {
  const $ = id => document.getElementById(id);
  if ($('botAvatar')) { $('botAvatar').classList.remove('damaged'); $('botAvatar').textContent = '◈'; }
  if ($('botPill'))   { $('botPill').className = 'bot-status-pill'; $('botPill').innerHTML = '<span class="sdot g"></span>ativo'; }
  if ($('botName'))   { $('botName').style.color = 'var(--green)'; $('botName').textContent = 'ÆGIS-BOT'; }
  if ($('botSub'))    $('botSub').textContent = '// guardião de conhecimento';
}

function closeLokiModal() {
  window.STATE.modalActive = false;
  const $ = id => document.getElementById(id);
  if ($('lokiModal'))  { $('lokiModal').classList.remove('active'); $('lokiModal').style.display = 'none'; }
  if ($('lmBackdrop')) $('lmBackdrop').classList.remove('show');
  clearInterval(window.STATE.timerInterval);
  recoverAegis();
  if (typeof persistStateLocally === 'function') persistStateLocally();
  if (lokiCanAttack()) scheduleAttack();
}

/* ═══════════════════════════════════════════════════════════
   BOT HELPERS
═══════════════════════════════════════════════════════════ */
function appendMsg(html, cls = 'bot', extra = '') {
  const area = document.getElementById('chatArea');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'msg ' + cls + (extra ? ' ' + extra : '');
  div.innerHTML = html;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function botSay(html) {
  appendMsg(html, 'bot');
}

function renderQR(qrList) {
  const qr = document.getElementById('quickReplies');
  if (!qr || !qrList?.length) return;
  const label = qr.querySelector('.quick-label');
  qr.innerHTML = '';
  if (label) qr.appendChild(label);
  qrList.forEach(item => {
    const btn = document.createElement('button');
    btn.className   = 'quick-btn';
    btn.textContent = '> ' + item.l;
    btn.onclick     = () => {
      qr.dataset.freeconv = '1';
      handleQuickReply(item.k, item.l);
    };
    qr.appendChild(btn);
  });
}

function showQR() {
  const qr = document.getElementById('quickReplies');
  if (!qr || qr.dataset.freeconv === '1') return;
  const section = window.STATE?.currentSection || 'home';
  if (typeof SECTION_CONTEXT !== 'undefined' && SECTION_CONTEXT[section]) {
    renderQR(SECTION_CONTEXT[section].qr);
  }
}

function hideQR() {
  const qr = document.getElementById('quickReplies');
  if (!qr) return;
  const btns = qr.querySelectorAll('.quick-btn');
  btns.forEach(b => b.remove());
}

/* ─── handleQuickReply ───────────────────────────────────── */
async function handleQuickReply(key, label) {
  appendMsg('> ' + label, 'user');
  hideQR();

  const ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  const quick = (typeof BOT_ANSWERS !== 'undefined') ? BOT_ANSWERS[key] : null;
  if (quick) {
    if (ti) ti.classList.remove('show');
    botSay(quick);
    return;
  }

  if (typeof callMistral === 'function' && typeof getAegisSystemPrompt === 'function') {
    const ans = await callMistral({
      model:        (typeof AI !== 'undefined') ? AI.models.aegis : 'mistral-small-latest',
      systemPrompt: getAegisSystemPrompt(),
      userMessage:  'O Guardião clicou na pergunta rápida: "' + label + '". Responda.',
      maxTokens:    200,
      temperature:  0.8,
    });
    if (ti) ti.classList.remove('show');
    botSay(ans || 'O ÆGIS não encontrou uma resposta específica para isso.');
  } else {
    if (ti) ti.classList.remove('show');
    botSay('Explore as missões para descobrir mais sobre esse tópico, Guardião.');
  }
}

/* ─── sendUserMsg ────────────────────────────────────────── */
async function sendUserMsg() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendMsg(msg, 'user');
  hideQR();

  const ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  if (typeof BOT_ANSWERS !== 'undefined') {
    const lower = msg.toLowerCase();
    const key = Object.keys(BOT_ANSWERS).find(k => lower.includes(k));
    if (key) {
      if (ti) ti.classList.remove('show');
      botSay(BOT_ANSWERS[key]);
      return;
    }
  }

  if (typeof botRespondToUser === 'function') {
    if (ti) ti.classList.remove('show');
    await botRespondToUser(msg);
    return;
  }

  if (typeof callMistral === 'function' && typeof getAegisSystemPrompt === 'function') {
    const ans = await callMistral({
      model:        (typeof AI !== 'undefined') ? AI.models.aegis : 'mistral-small-latest',
      systemPrompt: getAegisSystemPrompt(),
      userMessage:  msg,
      maxTokens:    200,
      temperature:  0.82,
    });
    if (ti) ti.classList.remove('show');
    botSay(ans || 'O ÆGIS processou, mas não encontrou resposta. Pode reformular?');
  } else {
    if (ti) ti.classList.remove('show');
    botSay('Sistema de respostas ainda inicializando. Tente novamente em instantes.');
  }
}

/* ═══════════════════════════════════════════════════════════
   BOT INIT
═══════════════════════════════════════════════════════════ */
function initBot() {
  const nick = window.AEGIS_NICK || 'Guardião';

  if (typeof callMistral === 'function' && typeof getAegisSystemPrompt === 'function') {
    const ti = document.getElementById('typingInd');
    if (ti) ti.classList.add('show');

    callMistral({
      model:        (typeof AI !== 'undefined') ? AI.models.aegis : 'mistral-small-latest',
      systemPrompt: getAegisSystemPrompt(),
      userMessage:  `O Guardião chamado "${nick}" acabou de entrar na plataforma. Dê as boas-vindas do jeito que só o ÆGIS daria — sem cerimônia, sem discurso. Mencione o Loki de forma natural.`,
      maxTokens:    180,
      temperature:  0.85,
    }).then(ans => {
      if (ti) ti.classList.remove('show');
      botSay(ans || `Sistema <span class="hl">ÆGIS</span> online. Bem-vindo, <span class="hl">${nick}</span>. O <span class="warn">Loki's Shadows</span> já está monitorando — inicie uma missão.`);
      setTimeout(() => { if (typeof showQR === 'function') showQR(); }, 600);
    }).catch(() => {
      if (ti) ti.classList.remove('show');
      botSay(`Sistema <span class="hl">ÆGIS</span> online. Bem-vindo, <span class="hl">${nick}</span>. O <span class="warn">Loki's Shadows</span> está em espera.`);
      setTimeout(() => { if (typeof showQR === 'function') showQR(); }, 600);
    });
  } else {
    botSay(`Sistema <span class="hl">ÆGIS</span> online. Bem-vindo, <span class="hl">${nick}</span>. O <span class="warn">Loki's Shadows</span> está em espera — inicie uma missão para ativar o campo de batalha.`);
    setTimeout(() => { if (typeof showQR === 'function') showQR(); }, 1400);
  }

  const inputEl = document.getElementById('chatInput');
  if (!inputEl) return;
  inputEl.addEventListener('focus', () => {
    if (typeof hideQR === 'function') hideQR();
    const qr = document.getElementById('quickReplies');
    if (qr) qr.dataset.freeconv = '1';
  });
  inputEl.addEventListener('blur', () => {
    if (inputEl.value.trim() === '') {
      const qr = document.getElementById('quickReplies');
      if (qr) qr.dataset.freeconv = '0';
      if (typeof showQR === 'function') showQR();
    }
  });
  inputEl.addEventListener('input', () => {
    if (typeof hideQR === 'function') hideQR();
    const qr = document.getElementById('quickReplies');
    if (qr) qr.dataset.freeconv = inputEl.value.trim() !== '' ? '1' : '0';
  });
}

/* ═══════════════════════════════════════════════════════════
   ÆGIS DEATH SYSTEM
═══════════════════════════════════════════════════════════ */
(function injectDeathStyles() {
  if (document.getElementById('aegisDeathStyles')) return;
  const s = document.createElement('style');
  s.id = 'aegisDeathStyles';
  s.textContent = `
    #aegisDeathOverlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0); pointer-events: none;
      display: none; flex-direction: column;
      align-items: center; justify-content: flex-start;
      font-family: 'VT323', monospace;
      overflow-y: auto; padding: 24px 16px 40px; box-sizing: border-box;
    }
    #aegisDeathOverlay.active {
      display: flex; pointer-events: all;
      animation: deathFadeIn 0.8s ease forwards;
    }
    @keyframes deathFadeIn {
      from { background: rgba(0,0,0,0); }
      to   { background: rgba(2,0,0,0.96); }
    }
    #aegisDeadBot {
      font-size: 72px; line-height: 1; color: var(--red, #ff1a3c);
      text-shadow: 0 0 30px rgba(255,0,40,0.6), 0 0 60px rgba(255,0,40,0.3);
      animation: aegisFall 1.2s cubic-bezier(0.36,0.07,0.19,0.97) 0.3s both;
      margin-top: 16px;
    }
    @keyframes aegisFall {
      0%   { opacity:1; transform: rotate(0deg) scale(1); }
      30%  { transform: rotate(-15deg) scale(1.1); }
      60%  { transform: rotate(25deg) scale(0.9); }
      80%  { transform: rotate(-8deg) scale(0.85); }
      100% { opacity:0.5; transform: rotate(15deg) scale(0.7) translateY(20px); }
    }
    #aegisDeadTitle {
      font-size: 52px; letter-spacing: 6px; color: var(--red, #ff1a3c);
      text-shadow: 0 0 20px rgba(255,0,40,0.8);
      margin: 16px 0 8px; text-align: center;
      animation: deathFlicker 0.15s steps(1) infinite;
    }
    @keyframes deathFlicker { 0%,100%{opacity:1;} 50%{opacity:0.7;} }
    #aegisDeadSub {
      font-size: 16px; letter-spacing: 3px;
      color: rgba(255,50,50,0.6); margin-bottom: 32px; text-align: center;
    }
    #lokiCelebrate {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; margin-bottom: 32px;
      animation: lokiRise 0.8s ease 1.4s both;
    }
    @keyframes lokiRise {
      from { opacity:0; transform: translateY(20px); }
      to   { opacity:1; transform: translateY(0); }
    }
    #lokiCelebIcon {
      font-size: 48px; color: rgba(160,80,255,0.9);
      text-shadow: 0 0 20px rgba(140,60,255,0.6);
      animation: lokiPulse 0.8s ease-in-out infinite alternate;
    }
    @keyframes lokiPulse {
      from { transform: scale(1) rotate(-3deg); }
      to   { transform: scale(1.1) rotate(3deg); }
    }
    #lokiCelebText {
      font-size: 14px; letter-spacing: 2px; color: rgba(160,80,255,0.8);
      text-align: center; max-width: 380px; line-height: 1.7; padding: 0 8px;
    }
    #aegisDeathStats {
      display: flex; gap: 24px; margin-bottom: 32px;
      animation: deathFadeIn 0.6s ease 2s both;
      border: 1px solid rgba(255,0,40,0.2); padding: 12px 24px;
    }
    .death-stat { text-align: center; }
    .death-stat-val { font-size: 32px; color: var(--red, #ff1a3c); }
    .death-stat-label { font-size: 10px; color: rgba(255,100,100,0.5); letter-spacing: 1px; margin-top: 2px; }
    #aegisReviveBtn {
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px; letter-spacing: 2px; padding: 12px 32px;
      border: 1px solid var(--red, #ff1a3c); background: transparent;
      color: var(--red, #ff1a3c); cursor: pointer; position: relative;
      overflow: hidden; animation: deathFadeIn 0.6s ease 2.5s both;
      transition: all 0.3s; width: 100%; max-width: 320px; margin-bottom: 32px;
    }
    #aegisReviveBtn:hover { background: rgba(255,0,40,0.1); box-shadow: 0 0 20px rgba(255,0,40,0.3); }
    #aegisReviveBtn::before {
      content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,0,40,0.15), transparent);
      animation: reviveScan 2s linear infinite;
    }
    @keyframes reviveScan { to { left: 100%; } }
    #aegisDeathScanlines {
      position: fixed; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,30,0.03) 2px, rgba(255,0,30,0.03) 4px);
    }
    @media (max-width: 480px) {
      #aegisDeadBot    { font-size: 52px; }
      #aegisDeadTitle  { font-size: 34px; letter-spacing: 3px; }
      #aegisDeadSub    { font-size: 13px; letter-spacing: 1px; margin-bottom: 20px; }
      #lokiCelebIcon   { font-size: 36px; }
      #lokiCelebText   { font-size: 13px; letter-spacing: 1px; }
      #aegisDeathStats { gap: 16px; padding: 10px 16px; margin-bottom: 24px; }
      .death-stat-val  { font-size: 26px; }
      #aegisReviveBtn  { font-size: 13px; padding: 10px 20px; }
    }
    #aegisHealNotif {
      position: fixed; bottom: 70px; right: 20px; z-index: 8900;
      font-family: 'VT323', monospace; font-size: 18px;
      color: var(--green, #00ff41); background: rgba(2,8,4,0.95);
      border: 1px solid rgba(0,255,65,0.3); padding: 6px 14px;
      opacity: 0; pointer-events: none; transform: translateY(8px);
      transition: opacity 0.3s, transform 0.3s;
    }
    #aegisHealNotif.show { opacity: 1; transform: translateY(0); }
    #aegisRechargeBtn {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: 'Share Tech Mono', monospace; font-size: 11px;
      letter-spacing: 1px; padding: 5px 12px;
      border: 1px solid rgba(0,255,65,0.25); background: transparent;
      color: rgba(0,255,65,0.6); cursor: pointer; transition: all 0.2s;
      margin-top: 8px; width: 100%;
    }
    #aegisRechargeBtn:hover:not(:disabled) {
      border-color: var(--green); color: var(--green);
      box-shadow: 0 0 8px rgba(0,255,65,0.15);
    }
    #aegisRechargeBtn:disabled { opacity: 0.3; cursor: not-allowed; }
    #aegisRechargeCooldown {
      font-size: 9px; color: rgba(0,255,65,0.4);
      display: block; margin-top: 3px; text-align: right;
    }
    .aegis-recharge-mob {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: 'Share Tech Mono', monospace; font-size: 11px;
      letter-spacing: 1px; padding: 7px 12px;
      border: 1px solid rgba(0,255,65,0.25); background: transparent;
      color: rgba(0,255,65,0.6); cursor: pointer; transition: all 0.2s;
      margin-top: 10px; width: 100%;
    }
    .aegis-recharge-mob:hover:not(:disabled) {
      border-color: var(--green); color: var(--green);
      box-shadow: 0 0 8px rgba(0,255,65,0.15);
    }
    .aegis-recharge-mob:disabled { opacity: 0.3; cursor: not-allowed; }
    .aegis-recharge-cool-mob {
      font-size: 9px; color: rgba(0,255,65,0.4);
      display: block; margin-top: 3px; text-align: right;
    }
    @keyframes hpCritical {
      0%,100%{ box-shadow: 0 0 6px var(--red-glow); }
      50%    { box-shadow: 0 0 16px var(--red-glow), 0 0 30px rgba(255,0,40,0.4); }
    }
    .hp-critical { animation: hpCritical 0.8s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
})();

function checkAegisDeath() {
  const hp = window.STATE?.aegisHp ?? 100;
  if (hp <= 0) setTimeout(triggerAegisDeath, 400);
}

const LOKI_VICTORY_LINES = [
  'O ÆGIS caiu. Como esperado.\nVocê não era páreo para mim, Guardião.',
  'Integridade: ZERO.\nSeu sistema pertence a mim agora.',
  'Cada erro foi uma porta.\nEu as abri todas. O ÆGIS não sobreviveu.',
  'Aprenda com a derrota.\nQuando você renascer — estarei esperando.',
  'Isso não é o fim.\nÉ só o começo do que posso fazer com acesso total.',
];

function triggerAegisDeath() {
  const S = window.STATE;

  if (typeof stopLokiAttacks === 'function') stopLokiAttacks();
  if (S.lokiTimeout) { clearTimeout(S.lokiTimeout); S.lokiTimeout = null; }

  if (S.modalActive) {
    S.modalActive = false;
    const lokiModal = document.getElementById('lokiModal');
    const backdrop  = document.getElementById('lmBackdrop');
    if (lokiModal) { lokiModal.classList.remove('active'); lokiModal.style.display = 'none'; }
    if (backdrop)  backdrop.classList.remove('show');
    clearInterval(S.timerInterval);
  }

  let overlay = document.getElementById('aegisDeathOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'aegisDeathOverlay';
    const victoryLine = LOKI_VICTORY_LINES[Math.floor(Math.random() * LOKI_VICTORY_LINES.length)];
    overlay.innerHTML = `
      <div id="aegisDeathScanlines"></div>
      <div id="aegisDeadBot">✕</div>
      <div id="aegisDeadTitle">ÆGIS DESTRUÍDO</div>
      <div id="aegisDeadSub">// integridade: 0% — sistema comprometido</div>
      <div id="lokiCelebrate">
        <div id="lokiCelebIcon">☽</div>
        <div id="lokiCelebText">${victoryLine.replace('\n', '<br>')}</div>
      </div>
      <div id="aegisDeathStats">
        <div class="death-stat"><div class="death-stat-val">${S.blocks || 0}</div><div class="death-stat-label">bloqueios</div></div>
        <div class="death-stat"><div class="death-stat-val">${S.fails  || 0}</div><div class="death-stat-label">falhas</div></div>
        <div class="death-stat"><div class="death-stat-val">${S.score  || 0}</div><div class="death-stat-label">XP acumulado</div></div>
      </div>
      <button id="aegisReviveBtn" onclick="reviveAegis()">[ ⟳ REANIMAR O ÆGIS ]</button>`;
    document.body.appendChild(overlay);
  } else {
    const sv = overlay.querySelectorAll('.death-stat-val');
    if (sv[0]) sv[0].textContent = S.blocks || 0;
    if (sv[1]) sv[1].textContent = S.fails  || 0;
    if (sv[2]) sv[2].textContent = S.score  || 0;
    const ct = overlay.querySelector('#lokiCelebText');
    if (ct) {
      const vl = LOKI_VICTORY_LINES[Math.floor(Math.random() * LOKI_VICTORY_LINES.length)];
      ct.innerHTML = vl.replace('\n', '<br>');
    }
  }

  overlay.classList.add('active');

  const $ = id => document.getElementById(id);
  if ($('botAvatar')) { $('botAvatar').textContent = '✕'; $('botAvatar').classList.add('damaged'); $('botAvatar').style.color = 'var(--red)'; }
  if ($('botPill'))   { $('botPill').className = 'bot-status-pill danger'; $('botPill').innerHTML = '<span class="sdot r" style="margin-right:4px;"></span>DESTRUÍDO'; }
  if ($('botName'))   { $('botName').style.color = 'var(--red)'; $('botName').textContent = '// SISTEMA OFFLINE'; }
  if ($('botSub'))    $('botSub').textContent = '// integridade zero — aguardando reanimação';

  appendMsg(`<span style="color:var(--red)">⚠ ÆGIS DESTRUÍDO.</span> O Loki's Shadows assumiu controle total. Reanime o sistema para continuar.`, 'loki', 'loki-msg');
}

function reviveAegis() {
  const S = window.STATE;
  S.aegisHp = 50;
  updateHUD();

  const overlay = document.getElementById('aegisDeathOverlay');
  if (overlay) overlay.classList.remove('active');

  const $ = id => document.getElementById(id);
  if ($('botAvatar')) { $('botAvatar').textContent = '◈'; $('botAvatar').classList.remove('damaged'); $('botAvatar').style.color = ''; }
  if ($('botPill'))   { $('botPill').className = 'bot-status-pill'; $('botPill').innerHTML = '<span class="sdot g"></span>ativo'; }
  if ($('botName'))   { $('botName').style.color = 'var(--yellow)'; $('botName').textContent = 'ÆGIS-BOT'; }
  if ($('botSub'))    $('botSub').textContent = '// reanimado — 50% integridade';

  appendMsg(`<span style="color:var(--yellow)">⟳ Sistema reanimado.</span> ÆGIS online com 50% de integridade. <span class="hl">Não cometa os mesmos erros.</span>`, 'bot');

  if (lokiCanAttack() && typeof startLokiAttacks === 'function') startLokiAttacks();
  updateRechargeBtn();
}

function showHealNotif(msg) {
  let el = document.getElementById('aegisHealNotif');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aegisHealNotif';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

(function startPassiveHeal() {
  setInterval(() => {
    const S = window.STATE;
    if (!S || S.aegisHp <= 0 || S.aegisHp >= 100) return;
    if (S.aegisHp > 10) return;
    const missionActive = (typeof MISSION_STATE !== 'undefined') && MISSION_STATE.activeMissionId != null;
    if (!missionActive) return;
    S.aegisHp = Math.min(100, (S.aegisHp || 0) + 2);
    updateHUD();
    showHealNotif('+2% integridade // regeneração passiva');
  }, 30_000);
})();

let _rechargeCooldownEnd      = 0;
let _rechargeCooldownInterval = null;

(function injectRechargeBtn() {
  function tryInject() {
    const hpText = document.getElementById('hpText');
    if (!hpText) { setTimeout(tryInject, 500); return; }

    if (!document.getElementById('aegisRechargeBtn')) {
      const container = hpText.parentElement;
      const btn = document.createElement('button');
      btn.id = 'aegisRechargeBtn';
      btn.innerHTML = '⟳ recarga de emergência';
      btn.onclick = activateEmergencyRecharge;
      const coolEl = document.createElement('span');
      coolEl.id = 'aegisRechargeCooldown';
      coolEl.textContent = '// pronto';
      container.appendChild(btn);
      container.appendChild(coolEl);
    }

    if (!document.getElementById('aegisRechargeBtnMob')) {
      function tryInjectMob() {
        const footer = document.querySelector('#mob-nav-drawer .mob-nav-footer');
        if (!footer) { setTimeout(tryInjectMob, 600); return; }
        const btnMob = document.createElement('button');
        btnMob.id = 'aegisRechargeBtnMob';
        btnMob.className = 'aegis-recharge-mob';
        btnMob.innerHTML = '⟳ recarga de emergência';
        btnMob.onclick = activateEmergencyRecharge;
        const coolMob = document.createElement('span');
        coolMob.id = 'aegisRechargeCooldownMob';
        coolMob.className = 'aegis-recharge-cool-mob';
        coolMob.textContent = '// pronto';
        footer.appendChild(btnMob);
        footer.appendChild(coolMob);
      }
      tryInjectMob();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInject);
  else setTimeout(tryInject, 1200);
})();

function activateEmergencyRecharge() {
  if (Date.now() < _rechargeCooldownEnd) return;
  const S = window.STATE;
  if (!S || S.aegisHp >= 100) return;
  S.aegisHp = Math.min(100, (S.aegisHp || 0) + 10);
  updateHUD();
  showHealNotif('+10% integridade // recarga de emergência');
  if (S.aegisHp > 30) {
    const bar = document.getElementById('aegisHpBar');
    if (bar) bar.classList.remove('hp-critical');
  }
  _rechargeCooldownEnd = Date.now() + 7_200_000;
  updateRechargeBtn();
  if (_rechargeCooldownInterval) clearInterval(_rechargeCooldownInterval);
  _rechargeCooldownInterval = setInterval(updateRechargeBtn, 1000);
}

function updateRechargeBtn() {
  const remaining = Math.max(0, Math.ceil((_rechargeCooldownEnd - Date.now()) / 1000));
  function syncPair(btnId, labelId) {
    const btn   = document.getElementById(btnId);
    const label = document.getElementById(labelId);
    if (!btn) return;
    if (remaining > 0) {
      btn.disabled = true;
      const hrs    = Math.floor(remaining / 3600);
      const mins   = Math.floor((remaining % 3600) / 60);
      const secs   = remaining % 60;
      const timeStr = hrs > 0
        ? `${hrs}h ${String(mins).padStart(2,'0')}m ${String(secs).padStart(2,'0')}s`
        : `${mins}m ${String(secs).padStart(2,'0')}s`;
      if (label) label.textContent = `// cooldown: ${timeStr}`;
    } else {
      btn.disabled = false;
      if (label) label.textContent = '// pronto';
    }
  }
  syncPair('aegisRechargeBtn',    'aegisRechargeCooldown');
  syncPair('aegisRechargeBtnMob', 'aegisRechargeCooldownMob');
  if (remaining <= 0 && _rechargeCooldownInterval) {
    clearInterval(_rechargeCooldownInterval);
    _rechargeCooldownInterval = null;
  }
}

window.addEventListener('load', () => {
  if (!window.STATE.completedMissions) window.STATE.completedMissions = [];

  initBinBg();

  requestAnimationFrame(() => {
    updateHUD();
    navigate('home');

    setTimeout(initBot, 800);

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendUserMsg();
      });
    }

    setTimeout(() => call(refreshMissionsList), 200);
  });

  /* Sync de displays a cada segundo */
  setInterval(() => {
    const S = window.STATE;
    if (!S) return;
    const $ = id => document.getElementById(id);
    if ($('scoreDisplay'))     $('scoreDisplay').textContent     = S.score;
    if ($('blocksDisplay'))    $('blocksDisplay').textContent    = S.blocks;
    if ($('failsDisplay'))     $('failsDisplay').textContent     = S.fails;
    if ($('progScore'))        $('progScore').textContent        = S.score;
    if ($('progBlocks'))       $('progBlocks').textContent       = S.blocks;
    if ($('progMissions'))     $('progMissions').textContent     = Array.isArray(S.completedMissions) ? S.completedMissions.length : 0;
    if ($('lokiLevelDisplay')) $('lokiLevelDisplay').textContent = S.lokiLevel;
    const sr = $('heroSuccessRate');
    if (sr) {
      const total = (S.blocks || 0) + (S.fails || 0);
      sr.textContent = total > 0 ? Math.round((S.blocks / total) * 100) + '%' : '0%';
    }
    const rs = $('rankScore');
    if (rs) rs.textContent = S.score;
  }, 1000);
});