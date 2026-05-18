/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÃO
═══════════════════════════════════════════════════════════ */
const SIM_CONFIG = {
  totalQuestions:   10,
  timerCronometrado: 60,   
  xpBase:           100,   
  xpBonus80:         50,   
  xpPerCorrect:      20,   
  xpPenalty:         10,   
  maxHistory:        10,   
};

/* ═══════════════════════════════════════════════════════════
   ESTADO DA SESSÃO
═══════════════════════════════════════════════════════════ */
const SIM_STATE = {
  active:       false,
  mode:         null,        
  questions:    [],          
  currentIdx:   0,
  correct:      0,
  wrong:        0,
  skipped:      0,
  answers:      [],          
  timerInterval: null,
  timerLeft:    0,
  startedAt:    0,
  lokiActive:   false,
};

/* ═══════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════ */
function _simStorageKey() {
  const uid = window._supabaseSession?.user?.id || null;
  return uid ? `aegis_sim:${uid}` : 'aegis_sim:anonymous';
}

function _simSaveHistory(entry) {
  try {
    const key  = _simStorageKey();
    const hist = JSON.parse(localStorage.getItem(key) || '[]');
    hist.unshift(entry);
    if (hist.length > SIM_CONFIG.maxHistory) hist.length = SIM_CONFIG.maxHistory;
    localStorage.setItem(key, JSON.stringify(hist));
  } catch(e) {}
}

function _simLoadHistory() {
  try {
    return JSON.parse(localStorage.getItem(_simStorageKey()) || '[]');
  } catch(e) { return []; }
}

function _buildQuestionPool() {
  if (typeof MISSIONS_DATA === 'undefined') return [];

  const pool = [];

  MISSIONS_DATA.forEach(m => {
    // inclui questões de missões desbloqueadas
    const accessible = m.unlocked ||
      (typeof isUnlocked === 'function' && isUnlocked(m.id)) ||
      (window.STATE?.completedMissions || []).includes(m.id - 1);

    if (!accessible) return;

    (m.quiz || []).forEach(q => {
      pool.push({
        ...q,
        missionId:    m.id,
        missionTitle: m.title,
        vector:       m.vector,
      });
    });

    const themed = (typeof ATTACKS_BY_MISSION !== 'undefined')
      ? (ATTACKS_BY_MISSION[m.id] || [])
      : [];

    themed.forEach(atk => {
      atk.choices.forEach((choice, ci) => {
      });

      pool.push({
        q:            `Frente ao payload "${atk.payload}" (${atk.type}), qual a defesa correta?`,
        opts:         atk.choices.map(c => c.t),
        correct:      atk.choices.findIndex(c => c.ok),
        exp:          atk.choices.find(c => c.ok)?.fb || '',
        missionId:    m.id,
        missionTitle: m.title,
        vector:       m.vector,
        fromAttack:   true,
      });
    });
  });

  return pool;
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════════════════════════
   ENTRY POINT PÚBLICO — chamado pelos botões da view
═══════════════════════════════════════════════════════════ */
function startSimulado(mode) {
  if (SIM_STATE.active) return;

  const pool = _buildQuestionPool();

  if (pool.length === 0) {
    if (typeof botSay === 'function') {
      botSay('<span class="danger">Banco de questões vazio, Guardião.</span> Complete ao menos a Missão 01 para desbloquear o simulado.');
    }
    return;
  }

  // embaralha e pega N questões
  const questions = _shuffle(pool).slice(0, SIM_CONFIG.totalQuestions);

  SIM_STATE.active      = true;
  SIM_STATE.mode        = mode;
  SIM_STATE.questions   = questions;
  SIM_STATE.currentIdx  = 0;
  SIM_STATE.correct     = 0;
  SIM_STATE.wrong       = 0;
  SIM_STATE.skipped     = 0;
  SIM_STATE.answers     = [];
  SIM_STATE.startedAt   = Date.now();

  if (window.STATE) window.STATE.modalActive = true;

  if (mode === 'cronometrado' && typeof startLokiAttacks === 'function') {
    startLokiAttacks();
    SIM_STATE.lokiActive = true;
  }

  _renderSimSession();

  if (typeof botSay === 'function') {
    const msgs = {
      cronometrado: '⏱ Simulado cronometrado iniciado. <span class="hl">60 segundos por questão.</span> O Loki continua atacando. Não perca o foco.',
      livre:        '◈ Simulado livre iniciado. Sem pressão de tempo — foco no aprendizado.',
    };
    botSay(msgs[mode] || msgs.livre);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER — SESSION CONTAINER
═══════════════════════════════════════════════════════════ */
function _getSimContainer() {
  const view = document.getElementById('view-simulados');
  if (!view) return null;

  let container = document.getElementById('sim-session-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'sim-session-container';
    view.appendChild(container);
  }
  return container;
}

function _renderSimSession() {
  const container = _getSimContainer();
  if (!container) return;

  const chooseSection = document.querySelector('#view-simulados .sim-header');
  const modesSection  = document.querySelector('#view-simulados .sim-modes');
  const bonusSection  = document.querySelector('#view-simulados .section-title');
  [chooseSection, modesSection].forEach(el => { if (el) el.style.display = 'none'; });
  Array.from(document.querySelector('#view-simulados')?.children || []).forEach(child => {
    if (child.id !== 'sim-session-container') child.style.display = 'none';
  });

  container.style.display = 'block';
  _renderQuestion();
}

function _renderQuestion() {
  const container = _getSimContainer();
  if (!container) return;

  const q       = SIM_STATE.questions[SIM_STATE.currentIdx];
  const idx     = SIM_STATE.currentIdx;
  const total   = SIM_STATE.questions.length;
  const pct     = Math.round((idx / total) * 100);
  const isTimed = SIM_STATE.mode === 'cronometrado';

  container.innerHTML = `
    <div class="sim-session">

      <!-- HEADER -->
      <div class="ss-header">
        <div class="ss-mode-badge">${isTimed ? '⏱ CRONOMETRADO' : '◈ LIVRE'}</div>
        <div class="ss-progress-wrap">
          <div class="ss-progress-bar">
            <div class="ss-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="ss-progress-label">${idx + 1} / ${total}</span>
        </div>
        <div class="ss-score-mini">
          <span class="ss-correct">✓ ${SIM_STATE.correct}</span>
          <span class="ss-wrong">✗ ${SIM_STATE.wrong}</span>
        </div>
      </div>

      <!-- TIMER (cronometrado apenas) -->
      ${isTimed ? `
      <div class="ss-timer-wrap" id="ss-timer-wrap">
        <div class="ss-timer-bar">
          <div class="ss-timer-fill" id="ss-timer-fill" style="width:100%"></div>
        </div>
        <div class="ss-timer-label">
          <span>// tempo restante</span>
          <span id="ss-timer-count" class="ss-timer-count">${SIM_CONFIG.timerCronometrado}s</span>
        </div>
      </div>` : ''}

      <!-- CONTEXTO DA MISSÃO -->
      <div class="ss-mission-tag">
        <span class="ss-mission-dot"></span>
        missão ${String(q.missionId).padStart(2,'0')} — ${q.vector}
      </div>

      <!-- QUESTÃO -->
      <div class="ss-question-block">
        <div class="ss-q-num">questão ${idx + 1}</div>
        <div class="ss-q-text" id="ss-q-text">${q.q}</div>
      </div>

      <!-- OPÇÕES -->
      <div class="ss-options" id="ss-options">
        ${q.opts.map((opt, i) => `
          <button class="ss-opt-btn" id="ss-opt-${i}" onclick="answerSimulado(${i})">
            <span class="ss-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span class="ss-opt-text">${opt}</span>
          </button>
        `).join('')}
      </div>

      <!-- FEEDBACK (oculto até responder) -->
      <div class="ss-feedback" id="ss-feedback" style="display:none"></div>

      <!-- NAV -->
      <div class="ss-nav" id="ss-nav" style="display:none">
        <button class="btn" onclick="_simNextQuestion()">
          ${idx + 1 < total ? '[ próxima questão → ]' : '[ ver resultado → ]'}
        </button>
      </div>

      <!-- SKIP (livre apenas) -->
      ${!isTimed ? `
      <div class="ss-skip-wrap">
        <button class="ss-skip-btn" onclick="_simSkip()">[ pular questão ]</button>
      </div>` : ''}

    </div>`;

  if (isTimed) {
    _simStartTimer();
  }

  // scroll to top
  const main = document.querySelector('.main');
  if (main) main.scrollTop = 0;
}

/* ═══════════════════════════════════════════════════════════
   TIMER
═══════════════════════════════════════════════════════════ */
function _simStartTimer() {
  _simStopTimer();
  SIM_STATE.timerLeft = SIM_CONFIG.timerCronometrado;
  _simUpdateTimerUI();

  SIM_STATE.timerInterval = setInterval(() => {
    SIM_STATE.timerLeft -= 0.1;
    _simUpdateTimerUI();

    if (SIM_STATE.timerLeft <= 0) {
      _simStopTimer();
      _simTimeout();
    }
  }, 100);
}

function _simStopTimer() {
  if (SIM_STATE.timerInterval) {
    clearInterval(SIM_STATE.timerInterval);
    SIM_STATE.timerInterval = null;
  }
}

function _simUpdateTimerUI() {
  const fill  = document.getElementById('ss-timer-fill');
  const count = document.getElementById('ss-timer-count');
  const wrap  = document.getElementById('ss-timer-wrap');

  const pct  = (SIM_STATE.timerLeft / SIM_CONFIG.timerCronometrado) * 100;
  const secs = Math.ceil(SIM_STATE.timerLeft);

  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'ss-timer-fill' + (pct < 25 ? ' critical' : pct < 50 ? ' warning' : '');
  }
  if (count) {
    count.textContent = secs + 's';
    count.className = 'ss-timer-count' + (pct < 25 ? ' critical' : '');
  }
  if (wrap && pct < 25) {
    wrap.classList.add('timer-danger');
  }
}

function _simTimeout() {
  const q = SIM_STATE.questions[SIM_STATE.currentIdx];

  SIM_STATE.wrong++;
  SIM_STATE.answers.push({
    q:       q.q,
    chosen:  -1, // timeout
    correct: q.correct,
    time:    SIM_CONFIG.timerCronometrado,
    result:  'timeout',
    missionId: q.missionId,
    vector:    q.vector,
  });

  if (typeof _grantXP === 'function') {
    window._grantXP({ xp: -SIM_CONFIG.xpPenalty, label: 'sim:timeout' });
  }

  _simShowFeedback(null, q, 'timeout');
}

/* ═══════════════════════════════════════════════════════════
   RESPOSTA
═══════════════════════════════════════════════════════════ */
function answerSimulado(chosenIdx) {
  if (!SIM_STATE.active) return;
  _simStopTimer();

  const q          = SIM_STATE.questions[SIM_STATE.currentIdx];
  const isCorrect  = chosenIdx === q.correct;
  const timeSpent  = SIM_CONFIG.timerCronometrado - (SIM_STATE.timerLeft || 0);

  // desabilita botões
  document.querySelectorAll('.ss-opt-btn').forEach(btn => {
    btn.disabled = true;
  });

  // feedback visual nos botões
  const correctBtn = document.getElementById(`ss-opt-${q.correct}`);
  const chosenBtn  = document.getElementById(`ss-opt-${chosenIdx}`);

  if (correctBtn) correctBtn.classList.add('correct');
  if (!isCorrect && chosenBtn) chosenBtn.classList.add('wrong');

  // atualiza contadores
  if (isCorrect) {
    SIM_STATE.correct++;
    if (typeof _grantXP === 'function') {
      window._grantXP({ xp: SIM_CONFIG.xpPerCorrect, blocks: 1, label: 'sim:correct' });
    }
  } else {
    SIM_STATE.wrong++;
    if (SIM_STATE.mode === 'cronometrado' && typeof _grantXP === 'function') {
      window._grantXP({ xp: -SIM_CONFIG.xpPenalty, fails: 1, label: 'sim:wrong' });
    }
  }

  SIM_STATE.answers.push({
    q:         q.q,
    chosen:    chosenIdx,
    correct:   q.correct,
    exp:       q.exp,
    time:      Math.round(timeSpent),
    result:    isCorrect ? 'correct' : 'wrong',
    missionId: q.missionId,
    vector:    q.vector,
  });

  _simShowFeedback(chosenIdx, q, isCorrect ? 'correct' : 'wrong');
}

function _simSkip() {
  _simStopTimer();
  const q = SIM_STATE.questions[SIM_STATE.currentIdx];
  SIM_STATE.skipped++;
  SIM_STATE.answers.push({
    q:         q.q,
    chosen:    -1,
    correct:   q.correct,
    time:      0,
    result:    'skipped',
    missionId: q.missionId,
    vector:    q.vector,
  });
  _simNextQuestion();
}

/* ═══════════════════════════════════════════════════════════
   FEEDBACK
═══════════════════════════════════════════════════════════ */
function _simShowFeedback(chosenIdx, q, result) {
  const fb = document.getElementById('ss-feedback');
  const nav = document.getElementById('ss-nav');
  if (!fb) return;

  const icons = { correct: '✓', wrong: '✗', timeout: '⏱' };
  const icon  = icons[result] || '?';

  let cls = 'ss-feedback';
  if (result === 'correct') cls += ' ss-fb-correct';
  else cls += ' ss-fb-wrong';

  const expText = q.exp ? `<div class="ss-fb-exp">${q.exp}</div>` : '';
  const correctOptText = q.opts[q.correct] || '';

  let body = '';
  if (result === 'correct') {
    body = `<span class="ss-fb-icon">✓</span> <strong>Correto.</strong> ${expText}`;
  } else if (result === 'timeout') {
    body = `<span class="ss-fb-icon">⏱</span> <strong>Tempo esgotado.</strong>
            A resposta correta era: <span class="ss-fb-correct-opt">[${String.fromCharCode(65 + q.correct)}] ${correctOptText}</span>
            ${expText}`;
  } else {
    body = `<span class="ss-fb-icon">✗</span> <strong>Incorreto.</strong>
            Resposta correta: <span class="ss-fb-correct-opt">[${String.fromCharCode(65 + q.correct)}] ${correctOptText}</span>
            ${expText}`;
  }

  fb.className = cls;
  fb.innerHTML = body;
  fb.style.display = 'block';

  if (nav) nav.style.display = 'flex';

  // auto-avança em modo cronometrado após 2.5s
  if (SIM_STATE.mode === 'cronometrado') {
    setTimeout(() => {
      if (SIM_STATE.active) _simNextQuestion();
    }, 2500);
  }
}

function _simNextQuestion() {
  SIM_STATE.currentIdx++;

  if (SIM_STATE.currentIdx >= SIM_STATE.questions.length) {
    _simFinish();
  } else {
    _renderQuestion();
  }
}

/* ═══════════════════════════════════════════════════════════
   FINALIZAÇÃO
═══════════════════════════════════════════════════════════ */
function _simFinish() {
  _simStopTimer();
  SIM_STATE.active = false;

  if (SIM_STATE.lokiActive && typeof stopLokiAttacks === 'function') {
    stopLokiAttacks();
    SIM_STATE.lokiActive = false;
  }

  if (window.STATE) window.STATE.modalActive = false;

  const total    = SIM_STATE.questions.length;
  const correct  = SIM_STATE.correct;
  const pct      = Math.round((correct / total) * 100);
  const elapsed  = Math.round((Date.now() - SIM_STATE.startedAt) / 1000);

  // XP final
  let xpEarned = SIM_CONFIG.xpBase;
  if (pct >= 80) xpEarned += SIM_CONFIG.xpBonus80;
  if (pct === 100) xpEarned += 50; // bônus perfeito

  if (typeof _grantXP === 'function') {
    window._grantXP({ xp: xpEarned, label: 'sim:completed' });
  }

  // salva histórico
  const histEntry = {
    mode:      SIM_STATE.mode,
    date:      new Date().toISOString(),
    correct,
    wrong:     SIM_STATE.wrong,
    skipped:   SIM_STATE.skipped,
    total,
    pct,
    elapsed,
    xpEarned,
  };
  _simSaveHistory(histEntry);

  // breakdown por missão
  const byMission = {};
  SIM_STATE.answers.forEach(a => {
    if (!byMission[a.missionId]) {
      byMission[a.missionId] = { correct: 0, total: 0, vector: a.vector };
    }
    byMission[a.missionId].total++;
    if (a.result === 'correct') byMission[a.missionId].correct++;
  });

  _renderResult(histEntry, byMission);

  if (typeof botSay === 'function') {
    const msgs = [
      pct === 100 && `<span class="hl">Simulado perfeito, Guardião.</span> ${pct}% de acerto. +${xpEarned} XP. O Loki não teve chance.`,
      pct >= 80   && `<span class="hl">Sólido.</span> ${pct}% de acerto. +${xpEarned} XP. Ainda há gaps — revise as questões erradas.`,
      pct >= 50   && `${pct}% de acerto. +${xpEarned} XP. <span class="warn">Abaixo do ideal para um incidente real.</span> Revise os vetores que falhou.`,
      `<span class="danger">${pct}% de acerto.</span> +${xpEarned} XP. O Loki aproveitaria cada uma dessas falhas. Volte para os estudos e missões.`,
    ].find(Boolean);
    botSay(msgs);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER RESULTADO
═══════════════════════════════════════════════════════════ */
function _renderResult(entry, byMission) {
  const container = _getSimContainer();
  if (!container) return;

  const { correct, wrong, skipped, total, pct, elapsed, xpEarned, mode } = entry;

  const gradeIcon  = pct === 100 ? '★' : pct >= 80 ? '✓' : pct >= 50 ? '◈' : '✗';
  const gradeClass = pct === 100 ? 'perfect' : pct >= 80 ? 'good' : pct >= 50 ? 'avg' : 'bad';

  // review das questões
  const reviewHTML = SIM_STATE.answers.map((a, i) => {
    const icon     = a.result === 'correct' ? '✓' : a.result === 'timeout' ? '⏱' : a.result === 'skipped' ? '—' : '✗';
    const cls      = a.result === 'correct' ? 'rv-correct' : 'rv-wrong';
    const correctOptText = SIM_STATE.questions[i]?.opts?.[a.correct] || '';
    return `
      <div class="sim-rv-item ${cls}">
        <div class="rv-header">
          <span class="rv-icon">${icon}</span>
          <span class="rv-num">Q${i + 1}</span>
          <span class="rv-vector">${a.vector}</span>
          ${a.time ? `<span class="rv-time">${a.time}s</span>` : ''}
        </div>
        <div class="rv-q">${a.q}</div>
        ${a.result !== 'correct' && a.result !== 'skipped'
          ? `<div class="rv-correct-ans">✓ ${correctOptText}</div>`
          : ''}
        ${a.exp ? `<div class="rv-exp">${a.exp}</div>` : ''}
      </div>`;
  }).join('');

  // breakdown por missão
  const breakdownHTML = Object.entries(byMission).map(([mId, data]) => {
    const mpct = Math.round((data.correct / data.total) * 100);
    const mcls = mpct >= 80 ? 'good' : mpct >= 50 ? 'avg' : 'bad';
    return `
      <div class="sim-bd-row">
        <div class="sim-bd-label">
          <span class="sim-bd-num">M${String(mId).padStart(2,'0')}</span>
          <span class="sim-bd-vector">${data.vector}</span>
        </div>
        <div class="sim-bd-bar-wrap">
          <div class="sim-bd-bar">
            <div class="sim-bd-fill ${mcls}" style="width:${mpct}%"></div>
          </div>
          <span class="sim-bd-pct ${mcls}">${data.correct}/${data.total}</span>
        </div>
      </div>`;
  }).join('');

  const elapsed_fmt = elapsed >= 60
    ? `${Math.floor(elapsed/60)}m ${elapsed%60}s`
    : `${elapsed}s`;

  container.innerHTML = `
    <div class="sim-result">

      <div class="sr-grade ${gradeClass}">
        <div class="sr-grade-icon">${gradeIcon}</div>
        <div class="sr-grade-pct">${pct}%</div>
        <div class="sr-grade-label">
          ${pct === 100 ? 'PERFEITO' : pct >= 80 ? 'ÓTIMO' : pct >= 50 ? 'REGULAR' : 'INSUFICIENTE'}
        </div>
      </div>

      <div class="sr-stats">
        <div class="sr-stat">
          <div class="sr-stat-val correct">${correct}</div>
          <div class="sr-stat-label">corretas</div>
        </div>
        <div class="sr-stat">
          <div class="sr-stat-val wrong">${wrong}</div>
          <div class="sr-stat-label">erradas</div>
        </div>
        <div class="sr-stat">
          <div class="sr-stat-val dim">${skipped}</div>
          <div class="sr-stat-label">puladas</div>
        </div>
        <div class="sr-stat">
          <div class="sr-stat-val xp">+${xpEarned}</div>
          <div class="sr-stat-label">XP ganho</div>
        </div>
        <div class="sr-stat">
          <div class="sr-stat-val dim">${elapsed_fmt}</div>
          <div class="sr-stat-label">tempo total</div>
        </div>
        <div class="sr-stat">
          <div class="sr-stat-val dim">${mode === 'cronometrado' ? '⏱' : '◈'}</div>
          <div class="sr-stat-label">${mode}</div>
        </div>
      </div>

      ${breakdownHTML ? `
      <div class="sr-section">
        <div class="sr-section-title">// breakdown por vetor</div>
        <div class="sim-breakdown">${breakdownHTML}</div>
      </div>` : ''}

      <div class="sr-section">
        <div class="sr-section-title">// revisão das questões</div>
        <div class="sim-review">${reviewHTML}</div>
      </div>

      <div class="sr-actions">
        <button class="btn btn-ghost" onclick="_simRestart('${mode}')">[ repetir modo ${mode} ]</button>
        <button class="btn" onclick="_simClose()">[ novo simulado ]</button>
      </div>

    </div>`;

  // scroll to top
  const main = document.querySelector('.main');
  if (main) main.scrollTop = 0;
}

/* ═══════════════════════════════════════════════════════════
   CONTROLES
═══════════════════════════════════════════════════════════ */
function _simRestart(mode) {
  const container = document.getElementById('sim-session-container');
  if (container) container.innerHTML = '';
  startSimulado(mode);
}

function _simClose() {
  _simStopTimer();
  SIM_STATE.active = false;
  if (window.STATE) window.STATE.modalActive = false;

  if (SIM_STATE.lokiActive && typeof stopLokiAttacks === 'function') {
    stopLokiAttacks();
    SIM_STATE.lokiActive = false;
  }

  // restaura view original
  const container = document.getElementById('sim-session-container');
  if (container) {
    container.innerHTML = '';
    container.style.display = 'none';
  }

  Array.from(document.querySelector('#view-simulados')?.children || []).forEach(child => {
    if (child.id !== 'sim-session-container') child.style.display = '';
  });

  // atualiza histórico na view
  _simRenderHistory();
}

/* ═══════════════════════════════════════════════════════════
   RENDER HISTÓRICO — substituí o placeholder estático
═══════════════════════════════════════════════════════════ */
function _simRenderHistory() {
  const hist = _simLoadHistory();
  const view = document.getElementById('view-simulados');
  if (!view) return;

  // encontra o container de histórico estático
  let histContainer = document.getElementById('sim-history-container');
  if (!histContainer) {
    histContainer = document.createElement('div');
    histContainer.id = 'sim-history-container';
    view.appendChild(histContainer);
  }

  if (hist.length === 0) {
    histContainer.innerHTML = `
      <div class="sim-recent-title">histórico recente</div>
      <div style="border:1px solid var(--border);padding:20px;background:var(--green-faint);text-align:center;">
        <div style="font-size:12px;color:var(--text-dim);">nenhum simulado concluído ainda</div>
        <div style="font-size:11px;color:rgba(0,255,65,0.3);margin-top:6px;">complete um simulado para ver seu histórico aqui</div>
      </div>`;
    return;
  }

  const rows = hist.map(h => {
    const date = new Date(h.date);
    const dateStr = date.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
      + ' ' + date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const gradeClass = h.pct >= 80 ? 'good' : h.pct >= 50 ? '' : 'bad';
    return `
      <div class="sim-result-row">
        <div>
          <div class="sr-score ${gradeClass}" style="font-family:'VT323',monospace;font-size:24px;">${h.pct}%</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${h.correct}/${h.total} corretas</div>
        </div>
        <div class="sr-info">
          <span>${h.mode === 'cronometrado' ? '⏱ cronometrado' : '◈ livre'}</span>
          <span style="display:block;color:var(--text-dim);font-size:10px;">${dateStr}</span>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--green);">+${h.xpEarned} XP</div>
      </div>`;
  }).join('');

  histContainer.innerHTML = `
    <div class="sim-recent-title" style="margin-top:20px;">histórico recente</div>
    ${rows}`;
}

function initSimulados() {
  const view = document.getElementById('view-simulados');
  if (!view) return;

  view.querySelectorAll('div').forEach(el => {
    if (el.textContent.includes('nenhum simulado concluído ainda') && !el.id) {
      el.remove();
    }
  });

  _simRenderHistory();
}