/* ═══════════════════════════════════════════════════════════
   missions-ui.js — ÆGIS Platform  v4.2
   Novos labs:
   - terminal:    interativo com input real (v3.1)
   - multiChoice: múltipla escolha técnica
   - fillBlank:   preencher trechos de código
   - ordering:    drag-and-drop REAL (mouse + touch)
   - codeReview:  encontre as N linhas bugadas num bloco
   - debugTrace:  siga a execução linha a linha e aponte onde explode
   - threatMap:   ligue vetores de ataque às defesas corretas
   v4.1: alternativas embaralhadas aleatoriamente em multiChoice e quiz
   v4.2: startMission e completeMission renomeados para evitar conflito
         com ranking.js (geração/validação de token de missão)
═══════════════════════════════════════════════════════════ */

/* ─── ESTADO DE MISSÕES ──────────────────────────────────── */
const MISSION_STATE = {
  activeMissionId:   1,
  currentStep:       1,
  quizIndex:         0,
  briefingOpen:      false,
};

/* ─── UNLOCK LOGIC ───────────────────────────────────────── */
function isUnlocked(missionId) {
  if (missionId === 1) return true;
  return (STATE.completedMissions || []).includes(missionId - 1);
}

(function sanitizeActiveMission() {
  try {
    const saved = parseInt(localStorage.getItem('aegis_active_mission'), 10);
    if (saved && !isNaN(saved) && !isUnlocked(saved))
      localStorage.removeItem('aegis_active_mission');
  } catch(e) {}
})();

/* ─── _localCompleteMission ──────────────────────────────── */
/* Atualiza STATE e UI localmente após o servidor confirmar.
   NÃO chame diretamente — use _finalizeMission() que passa
   pelo completeMission() do ranking.js (token). */
function _localCompleteMission(missionId) {
  if (!STATE.completedMissions) STATE.completedMissions = [];
  if (!STATE.completedMissions.includes(missionId))
    STATE.completedMissions.push(missionId);

  const next = _resolveNextActiveMission();
  if (next) {
    STATE.activeMissionId         = next;
    MISSION_STATE.activeMissionId = next;
    try { localStorage.setItem('aegis_active_mission', next); } catch(e) {}
  }

  if (typeof persistStateLocally === 'function') persistStateLocally();
  if (typeof syncRankingScore    === 'function') syncRankingScore();

  refreshMissionsList();
  updateHUD();
  updateActiveMissionCard();
}

/* Chamado ao fim do quiz. Usa completeMission() do ranking.js
   (valida token no servidor) quando disponível. */
async function _finalizeMission(missionId, xpReward) {
  if (typeof completeMission === 'function') {
    try {
      await completeMission(missionId, xpReward);
    } catch(e) {
      console.warn('[missions-ui] completeMission erro:', e?.message);
      _localCompleteMission(missionId);
    }
  } else {
    _localCompleteMission(missionId);
  }

  refreshMissionsList();
  updateHUD();
  updateActiveMissionCard();
}

function _resolveNextActiveMission() {
  const completed = Array.isArray(STATE.completedMissions) ? STATE.completedMissions : [];
  let id = STATE.activeMissionId;
  if (!id || id < 1) {
    try { const s = localStorage.getItem('aegis_active_mission'); if (s) id = parseInt(s,10); } catch(e){}
  }
  if (id && !isUnlocked(id)) id = null;
  if (id && completed.includes(id)) {
    for (let i = id + 1; i <= 6; i++) if (!completed.includes(i) && isUnlocked(i)) return i;
    return null;
  }
  if (!id || id < 1) {
    for (let i = 1; i <= 6; i++) if (!completed.includes(i) && isUnlocked(i)) return i;
    return null;
  }
  return id;
}

/* ─── MISSIONS LIST ──────────────────────────────────────── */
function refreshMissionsList() {
  const grid = document.querySelector('#view-missoes .missions-grid');
  if (!grid) return;
  grid.innerHTML = '';
  MISSIONS_DATA.forEach((m) => {
    const unlocked  = isUnlocked(m.id);
    const completed = (STATE.completedMissions || []).includes(m.id);
    const active    = m.id === MISSION_STATE.activeMissionId && unlocked && !completed;
    const card = document.createElement('div');
    card.className = `mission-card ${active ? 'active-card' : ''} ${!unlocked ? 'locked-card' : ''}`;
    if (unlocked && !completed) card.onclick = () => openMissionById(m.id);
    card.innerHTML = `
      <div class="mc-num" style="${!unlocked ? 'color:var(--text-dim)' : ''}">${String(m.id).padStart(2,'0')}</div>
      <div class="mc-body">
        <div class="mc-title" style="${!unlocked ? 'color:var(--text-dim)' : ''}">${m.title}</div>
        <div class="mc-meta">
          <span>${m.vector}</span><span>${m.difficulty}</span><span>${m.time}</span>
        </div>
      </div>
      <div class="mc-side">
        <div class="mc-xp" style="${!unlocked ? 'color:var(--text-dim)' : ''}">+${m.xp} XP</div>
        <div class="mc-status ${completed ? 'done' : active ? 'active-s' : ''}">
          ${completed ? '✓ concluída' : !unlocked ? '🔒 bloqueada' : active ? 'em progresso' : '◈ disponível'}
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ─── BRIEFING MODAL ─────────────────────────────────────── */
function openBriefing(missionId) {
  const m = MISSIONS_DATA.find(x => x.id === missionId);
  if (!m) return;
  const existing = document.getElementById('briefingModal');
  if (existing) existing.remove();
  MISSION_STATE.briefingOpen = true;

  const modal = document.createElement('div');
  modal.id = 'briefingModal';
  modal.innerHTML = `
    <div class="bm-backdrop" onclick="closeBriefing()"></div>
    <div class="bm-box">
      <div class="bm-scanline"></div>
      <div class="bm-header">
        <div class="bm-num">${String(m.id).padStart(2,'0')}</div>
        <div class="bm-title-block">
          <div class="bm-vector">// ${m.vector.toUpperCase()}</div>
          <div class="bm-title">${m.title}</div>
        </div>
        <button class="bm-close" onclick="closeBriefing()">[ × ]</button>
      </div>
      <div class="bm-meta">
        <div class="bm-meta-item"><span class="bm-meta-label">dificuldade</span><span class="bm-meta-val">${m.difficulty}</span></div>
        <div class="bm-meta-item"><span class="bm-meta-label">tempo</span><span class="bm-meta-val">${m.time}</span></div>
        <div class="bm-meta-item"><span class="bm-meta-label">recompensa</span><span class="bm-meta-val" style="color:var(--green)">+${m.xp} XP</span></div>
        <div class="bm-meta-item"><span class="bm-meta-label">runa</span><span class="bm-meta-val">${m.runeIcon} ${m.rune}</span></div>
      </div>
      <div class="bm-section">
        <div class="bm-section-title">// objetivo</div>
        <div class="bm-text">${m.briefing.objetivo}</div>
      </div>
      <div class="bm-section">
        <div class="bm-section-title">// cenário</div>
        <div class="bm-text">${m.briefing.contexto}</div>
      </div>
      <div class="bm-section">
        <div class="bm-section-title bm-danger">// impacto do ataque</div>
        <div class="bm-text bm-danger-text">${m.briefing.impacto}</div>
      </div>
      <div class="bm-footer">
        <button class="bm-cancel" onclick="closeBriefing()">[ cancelar ]</button>
        <button class="bm-start" onclick="_launchMissionFromBriefing(${m.id})">[ iniciar missão → ]</button>
      </div>
    </div>`;
  document.documentElement.appendChild(modal);
  document.body.style.overflow = 'hidden';
  _injectBriefingStyles();
}

function closeBriefing() {
  document.body.style.overflow = '';
  const modal = document.getElementById('briefingModal');
  if (modal) modal.remove();
  MISSION_STATE.briefingOpen = false;
}

function openMissionById(id) {
  if (!isUnlocked(id)) {
    if (typeof botSay === 'function') botSay(`<span class="danger">Missão ${id} bloqueada.</span> Complete a anterior primeiro.`);
    return;
  }
  openBriefing(id);
}

/* ─── LAUNCH MISSION (substitui startMission local) ─────── */
/* _launchMission: abre a UI da missão.
   Não confundir com startMission() do ranking.js
   que gera o token no servidor. */
function _launchMission(missionId) {
  const m = MISSIONS_DATA.find(x => x.id === missionId);
  if (!m) return;

  MISSION_STATE.activeMissionId = missionId;
  STATE.activeMissionId         = missionId;
  try { localStorage.setItem('aegis_active_mission', missionId); } catch(e) {}
  MISSION_STATE.currentStep = 1;
  MISSION_STATE.quizIndex   = 0;

  /* Notifica main.js (agenda ataque do Loki etc.)
     onMissionStarted no main.js também chama startMission()
     do ranking.js — não chamar aqui de novo. */
  if (typeof onMissionStarted === 'function') onMissionStarted(missionId);

  renderMissionDetail(m);
  const detail = document.getElementById('missionDetailView');
  if (detail) {
    detail.style.display = 'block';
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  goToStep(1, m);
  updateActiveMissionCard();
  if (typeof persistStateLocally === 'function') persistStateLocally();
}

/* Chamada pelo botão [ iniciar missão → ] no briefing.
   Solicita token ao servidor via startMission() do ranking.js,
   depois abre a missão. */
async function _launchMissionFromBriefing(missionId) {
  closeBriefing();

  /* startMission() vem do ranking.js — gera token no servidor */
  if (typeof startMission === 'function') {
    try {
      await startMission(missionId);
    } catch(e) {
      console.warn('[missions-ui] erro ao obter token:', e?.message);
    }
  }

  _launchMission(missionId);
}

/* ─── RENDER MISSION DETAIL ──────────────────────────────── */
function renderMissionDetail(m) {
  let container = document.getElementById('missionDetailView');
  if (!container) {
    container = document.createElement('div');
    container.id = 'missionDetailView';
    const mv = document.getElementById('view-missoes');
    if (mv) mv.appendChild(container);
  }
  container.innerHTML = `
    <div class="mission-header" style="margin-top:24px;">
      <div class="tag">[ mission-${String(m.id).padStart(2,'0')} ] // ${m.vector.toUpperCase()}</div>
      <h1>${m.title}<span style="display:inline-block;width:10px;height:3px;background:var(--green);margin-left:6px;animation:blink 1s infinite;vertical-align:middle;"></span></h1>
      <div class="meta">
        <div>vetor: <span>${m.vector}</span></div>
        <div>dif: <span>${m.difficulty}</span></div>
        <div>xp: <span>+${m.xp}</span></div>
        <div>tempo: <span>${m.time}</span></div>
      </div>
    </div>
    <div class="steps-bar" id="stepsBar-${m.id}">
      ${m.steps.map((s,i) => `<div class="step" id="mstep-${m.id}-${i+1}" onclick="goToStep(${i+1}, MISSIONS_DATA.find(x=>x.id===${m.id}))">
        <span class="step-dot"></span><span class="step-lbl">${s.title}</span>
      </div>`).join('')}
    </div>
    <div id="missionPages-${m.id}">
      ${m.steps.map((_,i) => `<div class="mission-page" id="mpage-${m.id}-${i+1}"></div>`).join('')}
    </div>`;
}

/* ─── STEP NAVIGATION ────────────────────────────────────── */
function goToStep(n, m) {
  if (!m) m = MISSIONS_DATA.find(x => x.id === MISSION_STATE.activeMissionId);
  if (!m) return;
  MISSION_STATE.currentStep = n;
  if (typeof persistStateLocally === 'function') persistStateLocally();

  const step = m.steps[n - 1];
  m.steps.forEach((_,i) => {
    const dot = document.getElementById(`mstep-${m.id}-${i+1}`);
    if (!dot) return;
    dot.classList.remove('done','active');
    if (i + 1 < n)        dot.classList.add('done');
    else if (i + 1 === n) dot.classList.add('active');
  });

  m.steps.forEach((_,i) => {
    const page = document.getElementById(`mpage-${m.id}-${i+1}`);
    if (page) page.classList.remove('active');
  });
  const activePage = document.getElementById(`mpage-${m.id}-${n}`);
  if (activePage) { activePage.classList.add('active'); renderStepContent(activePage, step, n, m); }
}

/* ─── RENDER STEP CONTENT ────────────────────────────────── */
function renderStepContent(container, step, n, m) {
  if (container.dataset.rendered === 'true') return;
  container.dataset.rendered = 'true';

  const isFirst = n === 1;
  const isLast  = n === m.steps.length;

  const prevBtn = isFirst
    ? `<button class="btn btn-ghost" disabled>[ anterior ]</button>`
    : `<button class="btn btn-ghost" onclick="goToStep(${n-1}, MISSIONS_DATA.find(x=>x.id===${m.id}))">[ ← anterior ]</button>`;
  const nextBtn = isLast ? '' : `<button class="btn" onclick="goToStep(${n+1}, MISSIONS_DATA.find(x=>x.id===${m.id}))">${n === m.steps.length - 1 ? '[ checkpoint → ]' : '[ próximo → ]'}</button>`;

  let html = '';

  if (n === 1) {
    html = `
      <div class="section">
        <div class="section-title">contexto <div class="line"></div></div>
        <div class="content-block">${step.content}</div>
      </div>
      ${step.diagram ? `
      <div class="section">
        <div class="section-title">anatomia do ataque <div class="line"></div></div>
        <div class="code-block" style="font-size:11px;line-height:1.6;white-space:pre;overflow-x:auto;">${escapeHtml(step.diagram)}</div>
      </div>` : ''}
      ${renderAegisTip(step.aegisTip)}
      <div class="nav-btns">${prevBtn}${nextBtn}</div>`;
  }
  else if (n === 2) {
    html = `
      <div class="section">
        <div class="section-title">o código vulnerável <div class="line"></div></div>
        <div class="code-block-label vulnerable">${step.vulnLabel || '⚠ vulnerável'}</div>
        <div class="code-block">${step.vulnCode}</div>
      </div>
      ${step.attackBox ? `
      <div class="section">
        <div class="section-title">como o loki ataca <div class="line"></div></div>
        <div class="challenge-box">
          <div class="ch-title">${step.attackBox.title}</div>
          <div style="font-size:12px;color:var(--text-mid);line-height:1.8;">${step.attackBox.content}</div>
        </div>
      </div>` : ''}
      ${renderAegisTip(step.aegisTip)}
      ${renderLab(step.lab, m.id, n)}
      <div class="nav-btns">${prevBtn}${nextBtn}</div>`;
  }
  else if (n === 3) {
    html = `
      ${renderAegisTip(step.aegisTip)}
      ${renderLab(step.lab, m.id, n)}
      <div class="nav-btns">${prevBtn}${nextBtn}</div>`;
  }
  else if (n === 4) {
    const defPoints = step.defensePoints || [];
    html = `
      <div class="section">
        <div class="section-title">a defesa <div class="line"></div></div>
        <div class="content-block">
          ${defPoints.map((p,i) => `<span class="hl">${i+1}.</span> ${p}${i < defPoints.length-1 ? '<br><br>' : ''}`).join('')}
        </div>
        <div class="code-block-label secure" style="margin-top:12px;">${step.secureLabel || '✓ seguro'}</div>
        <div class="code-block">${step.secureCode}</div>
      </div>
      ${renderAegisTip(step.aegisTip)}
      ${renderLab(step.lab, m.id, n)}
      <div class="nav-btns">${prevBtn}${nextBtn}</div>`;
  }
  else if (n === 5) {
    html = `
      <div class="section">
        <div class="section-title">checkpoint final <div class="line"></div></div>
        <div class="quiz-header">
          <div class="quiz-count-label">0 / ${m.quiz.length} questões</div>
          <div class="quiz-xp-label">+${m.quiz.length * 50} XP disponível</div>
        </div>
        <div id="quiz-${m.id}"></div>
      </div>
      ${renderAegisTip(step.aegisTip)}
      <div class="nav-btns">
        ${prevBtn}
        <button class="btn" id="nextMissionBtn-${m.id}" style="display:none" onclick="onMissionComplete(${m.id})">[ → próxima missão ]</button>
      </div>`;
  }

  container.innerHTML = html;

  if (n === 5) {
    MISSION_STATE.quizIndex = 0;
    setTimeout(() => renderMissionQuiz(m), 300);
  }
  if (step.lab?.type === 'terminal')   initTerminalLab(step.lab, m.id, n);
  if (step.lab?.type === 'ordering')   initOrderingLab(step.lab, m.id, n);
  if (step.lab?.type === 'codeReview') initCodeReviewLab(step.lab, m.id, n);
  if (step.lab?.type === 'debugTrace') initDebugTraceLab(step.lab, m.id, n);
  if (step.lab?.type === 'threatMap')  initThreatMapLab(step.lab, m.id, n);

  if (typeof botReactToStep === 'function') setTimeout(() => botReactToStep(n), 600);
}

/* ═══════════════════════════════════════════════════════════
   LAB ROUTER
═══════════════════════════════════════════════════════════ */
function renderLab(lab, mId, stepN) {
  if (!lab) return '';
  const labId = `lab-${mId}-${stepN}`;
  if (lab.type === 'multiChoice') {
    window._mcLabs = window._mcLabs || {};
    window._mcLabs[labId] = lab;
  }
  return `
    <div class="lab-block" id="${labId}">
      <div class="lab-header">
        <span class="lab-tag">LAB</span>
        <span class="lab-title">${lab.title || ''}</span>
        ${lab.xpReward ? `<span class="lab-xp">+${lab.xpReward} XP</span>` : ''}
      </div>
      <div class="lab-desc">${lab.description || ''}</div>
      <div class="lab-body" id="${labId}-body">
        ${_renderLabBody(lab, mId, stepN, labId)}
      </div>
    </div>`;
}

function _renderLabBody(lab, mId, stepN, labId) {
  switch (lab.type) {
    case 'terminal':    return renderTerminalBody(lab, labId);
    case 'multiChoice': return renderMultiChoiceBody(lab, labId);
    case 'fillBlank':   return renderFillBlankBody(lab, labId, mId, stepN);
    case 'ordering':    return renderOrderingBody(lab, labId);
    case 'codeReview':  return renderCodeReviewBody(lab, labId);
    case 'debugTrace':  return renderDebugTraceBody(lab, labId);
    case 'threatMap':   return renderThreatMapBody(lab, labId);
    default: return '';
  }
}

/* ═══════════════════════════════════════════════════════════
   TERMINAL LAB
═══════════════════════════════════════════════════════════ */
function renderTerminalBody(lab, labId) {
  const t = lab.terminal;
  const prelude = (t.prelude || [])
    .map(l => `<div class="tl-line tl-dim">${escapeHtml(l)}</div>`)
    .join('');
  return `
    <div class="terminal-lab" id="${labId}-terminal">
      <div class="tl-topbar">
        <span class="tl-dot red"></span><span class="tl-dot yellow"></span><span class="tl-dot green"></span>
        <span class="tl-title">${escapeHtml(t.prompt || 'lambda@aegis:~$')}</span>
        <span class="tl-progress-tag" id="${labId}-prog">0/${t.challenges.length}</span>
      </div>
      <div class="tl-output" id="${labId}-output">${prelude}</div>
      <div class="tl-input-area" id="${labId}-input-area">
        <span class="tl-prompt-inline" id="${labId}-prompt-inline">${escapeHtml(t.prompt || '$')}</span>
        <input class="tl-real-input" id="${labId}-real-input" type="text"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          placeholder="digite o comando..."/>
        <button class="tl-run-btn" id="${labId}-run-btn">↵</button>
      </div>
      <div class="tl-hint-area" id="${labId}-hint-area" style="display:none">
        <span class="tl-hint-icon">◈</span>
        <span class="tl-hint-text" id="${labId}-hint-text"></span>
      </div>
      <div class="tl-controls">
        <button class="tl-hint-btn" id="${labId}-hint-btn">[ dica ]</button>
        <span class="tl-attempts" id="${labId}-attempts"></span>
      </div>
    </div>`;
}

function initTerminalLab(lab, mId, stepN) {
  const labId      = `lab-${mId}-${stepN}`;
  const outputEl   = document.getElementById(`${labId}-output`);
  const inputEl    = document.getElementById(`${labId}-real-input`);
  const runBtn     = document.getElementById(`${labId}-run-btn`);
  const hintArea   = document.getElementById(`${labId}-hint-area`);
  const hintText   = document.getElementById(`${labId}-hint-text`);
  const hintBtn    = document.getElementById(`${labId}-hint-btn`);
  const attemptsEl = document.getElementById(`${labId}-attempts`);
  const progEl     = document.getElementById(`${labId}-prog`);
  if (!outputEl || !inputEl) return;

  const t = lab.terminal;
  let currentIdx = 0;
  let errorCount = 0;
  let cmdHistory = [];
  let historyPos = -1;

  function appendLine(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    outputEl.appendChild(tmp.firstChild || tmp);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function showChallenge(i) {
    if (i >= t.challenges.length) return completeLab();
    const ch = t.challenges[i];
    errorCount = 0;
    hintArea.style.display = 'none';
    attemptsEl.textContent = '';
    progEl.textContent = `${i}/${t.challenges.length}`;
    appendLine(`<div class="tl-line tl-separator">──────────────────────────────────────</div>`);
    appendLine(`<div class="tl-line tl-challenge-num">[ desafio ${i + 1} / ${t.challenges.length} ]</div>`);
    appendLine(`<div class="tl-line tl-instruction-line">${escapeHtml(ch.instruction)}</div>`);
    appendLine(`<div class="tl-line tl-dim">// digite o comando abaixo e pressione ↵</div>`);
    inputEl.value = '';
    inputEl.focus();
  }

  function normalize(str) { return str.trim().replace(/\s+/g,' ').replace(/'/g,'"').toLowerCase(); }
  function isCorrect(input, expected) {
    if (normalize(input) === normalize(expected)) return true;
    if (normalize(input).replace(/"/g,"'") === normalize(expected).replace(/"/g,"'")) return true;
    return false;
  }

  function handleSubmit() {
    const raw = inputEl.value;
    if (!raw.trim()) { inputEl.focus(); return; }
    const ch = t.challenges[currentIdx];
    cmdHistory.unshift(raw);
    if (cmdHistory.length > 50) cmdHistory.pop();
    historyPos = -1;
    appendLine(`<div class="tl-line"><span class="tl-p">${escapeHtml(t.prompt || '$')}</span> <span class="tl-cmd">${escapeHtml(raw)}</span></div>`);
    inputEl.value = '';
    if (isCorrect(raw, ch.payload)) handleCorrect(ch);
    else { errorCount++; handleWrong(ch, raw, errorCount); }
  }

  function handleCorrect(ch) {
    hintArea.style.display = 'none';
    attemptsEl.textContent = '';
    setTimeout(() => {
      ch.expectedOutput.forEach(line => {
        const cls = line.startsWith('//') ? 'tl-comment'
          : (line.includes('⚠')||line.includes('Cracked')||line.includes('malicious')) ? 'tl-danger'
          : (line.startsWith('{')||line.startsWith('[')) ? 'tl-json' : '';
        appendLine(`<div class="tl-line ${cls}">${escapeHtml(line)}</div>`);
      });
      appendLine(`<div class="tl-line tl-success">✓ correto</div>`);
      currentIdx++;
      progEl.textContent = `${currentIdx}/${t.challenges.length}`;
      setTimeout(() => showChallenge(currentIdx), 700);
    }, 320);
  }

  function handleWrong(ch, typed, attempts) {
    const msgs = [
      '// comando não reconhecido — verifique a sintaxe e tente novamente',
      '// ainda incorreto — pense: qual ferramenta? quais argumentos?',
      '// dica desbloqueada automaticamente — veja abaixo ↓',
    ];
    appendLine(`<div class="tl-line tl-danger">${msgs[Math.min(attempts-1, 2)]}</div>`);
    attemptsEl.textContent = `${attempts} erro${attempts > 1 ? 's' : ''}`;
    if (attempts >= 2 && ch.hint) {
      hintText.textContent = ch.hint;
      hintArea.style.display = 'flex';
    }
    inputEl.focus();
  }

  function completeLab() {
    progEl.textContent = `${t.challenges.length}/${t.challenges.length} ✓`;
    appendLine(`<div class="tl-line tl-separator">──────────────────────────────────────</div>`);
    appendLine(`<div class="tl-line tl-complete">${escapeHtml(t.finalMessage || '// Lab completo.')}</div>`);
    inputEl.disabled = true; runBtn.disabled = true;
    inputEl.placeholder = 'lab concluído';
    hintBtn.style.display = 'none'; attemptsEl.textContent = '';
    if (lab.xpReward && typeof window._grantXP === 'function')
      window._grantXP({ xp: lab.xpReward, label: `lab:terminal:${labId}` });
  }

  runBtn.addEventListener('click', handleSubmit);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyPos < cmdHistory.length - 1) { historyPos++; inputEl.value = cmdHistory[historyPos] || ''; }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyPos > 0 ? (historyPos--, inputEl.value = cmdHistory[historyPos] || '') : (historyPos = -1, inputEl.value = '');
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ch = t.challenges[currentIdx];
      if (!ch) return;
      const typed = inputEl.value.trim();
      const firstWord = ch.payload.split(' ')[0];
      if (typed.length > 0 && firstWord.startsWith(typed) && typed !== firstWord)
        inputEl.value = firstWord + ' ';
    }
  });
  hintBtn.addEventListener('click', () => {
    const ch = t.challenges[currentIdx];
    if (!ch?.hint) return;
    hintText.textContent = ch.hint;
    hintArea.style.display = 'flex';
  });
  document.getElementById(`${labId}-terminal`)?.addEventListener('click', () => {
    if (!inputEl.disabled) inputEl.focus();
  });
  showChallenge(0);
}

/* ═══════════════════════════════════════════════════════════
   MULTICHOICE LAB
═══════════════════════════════════════════════════════════ */
function renderMultiChoiceBody(lab, labId) {
  if (!lab.questions?.length) return '';
  let html = `<div class="mc-lab" id="${labId}-mc" data-current="0" data-score="0">`;
  html += `<div class="mc-progress-bar"><div class="mc-progress-fill" id="${labId}-mc-fill" style="width:0%"></div></div>`;
  html += `<div id="${labId}-mc-question"></div></div>`;
  setTimeout(() => renderMCQuestion(lab, labId, 0), 100);
  return html;
}

function renderMCQuestion(lab, labId, idx) {
  const qEl  = document.getElementById(`${labId}-mc-question`);
  const fill = document.getElementById(`${labId}-mc-fill`);
  if (!qEl) return;

  if (idx >= lab.questions.length) {
    const mc    = document.getElementById(`${labId}-mc`);
    const score = parseInt(mc?.dataset.score || 0);
    qEl.innerHTML = `
      <div class="mc-complete">
        <div class="mc-complete-icon">${score === lab.questions.length ? '✓' : '◈'}</div>
        <div class="mc-complete-title">${score === lab.questions.length ? 'Perfeito.' : `${score}/${lab.questions.length} corretas`}</div>
        <div class="mc-complete-sub">Diagnóstico concluído. Continue para a defesa.</div>
      </div>`;
    if (lab.xpReward && typeof window._grantXP === 'function')
      window._grantXP({ xp: Math.round(lab.xpReward * score / lab.questions.length), label: `lab:mc:${labId}` });
    return;
  }

  const q = lab.questions[idx];
  if (fill) fill.style.width = `${(idx / lab.questions.length) * 100}%`;

  const shuffled = q.opts
    .map((text, i) => ({ text, isCorrect: i === q.correct }))
    .sort(() => Math.random() - 0.5);
  const correctShuffled = shuffled.findIndex(o => o.isCorrect);

  qEl.innerHTML = `
    <div class="mc-q-wrap">
      <div class="mc-q-counter">${idx + 1} / ${lab.questions.length}</div>
      ${q.code ? `<div class="code-block mc-code">${escapeHtml(q.code)}</div>` : ''}
      <div class="mc-question">${q.q}</div>
      <div class="mc-options" id="${labId}-opts-${idx}">
        ${shuffled.map((o, i) => `
          <button class="mc-opt" id="${labId}-opt-${idx}-${i}"
            onclick="answerMC('${labId}', ${idx}, ${i}, ${correctShuffled})">
            <span class="mc-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span class="mc-opt-text">${escapeHtml(o.text)}</span>
          </button>`).join('')}
      </div>
      <div class="mc-feedback" id="${labId}-fb-${idx}" style="display:none"></div>
    </div>`;
}

window.answerMC = function(labId, qIdx, answerIdx, correctIdx) {
  const mc  = document.getElementById(`${labId}-mc`);
  const lab = window._mcLabs?.[labId];
  if (!lab || !mc) return;

  const q    = lab.questions[qIdx];
  const opts = document.querySelectorAll(`#${labId}-opts-${qIdx} .mc-opt`);
  opts.forEach(o => o.disabled = true);

  const correct = answerIdx === correctIdx;
  if (correct) {
    mc.dataset.score = String(parseInt(mc.dataset.score || 0) + 1);
    opts[answerIdx].classList.add('mc-opt-correct');
  } else {
    opts[answerIdx].classList.add('mc-opt-wrong');
    opts[correctIdx].classList.add('mc-opt-correct');
  }

  const fb = document.getElementById(`${labId}-fb-${qIdx}`);
  if (fb) {
    fb.style.display = 'block';
    fb.innerHTML = `<span class="${correct ? 'mc-fb-ok' : 'mc-fb-err'}">${correct ? '✓' : '✗'}</span> ${escapeHtml(q.exp)}`;
  }

  setTimeout(() => renderMCQuestion(lab, labId, qIdx + 1), 1600);
};

/* ═══════════════════════════════════════════════════════════
   ORDERING LAB
═══════════════════════════════════════════════════════════ */
function renderOrderingBody(lab, labId) {
  const shuffled = [...lab.items].sort(() => Math.random() - 0.5);
  return `
    <div class="ord-instructions">${escapeHtml(lab.instructions || 'Arraste as linhas na ordem correta:')}</div>
    <div class="ord-hint-tip">// segure e arraste cada linha para reordenar</div>
    <div class="ord-container" id="${labId}-ordering">
      ${shuffled.map(item => `
        <div class="ord-item" data-id="${item.id}">
          <span class="ord-handle" title="arrastar">⠿</span>
          <div class="ord-content">
            <span class="ord-label">${escapeHtml(item.label)}</span>
            <code class="ord-code">${escapeHtml(item.code)}</code>
          </div>
        </div>`).join('')}
    </div>
    <button class="btn ord-check-btn" id="${labId}-ord-check">[ verificar ordem ]</button>
    <div class="mc-feedback" id="${labId}-ord-result" style="display:none;margin-top:10px;"></div>`;
}

function initOrderingLab(lab, mId, stepN) {
  const labId = `lab-${mId}-${stepN}`;
  setTimeout(() => {
    const container = document.getElementById(`${labId}-ordering`);
    if (!container) return;

    let dragging    = null;
    let ghost       = null;
    let offsetX     = 0;
    let offsetY     = 0;
    let placeholder = null;

    function createPlaceholder(height) {
      const ph = document.createElement('div');
      ph.className = 'ord-placeholder';
      ph.style.height = height + 'px';
      return ph;
    }

    function getDragAfterElement(y) {
      const items = [...container.querySelectorAll('.ord-item:not(.ord-dragging)')];
      return items.reduce((closest, child) => {
        const box    = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    container.querySelectorAll('.ord-item').forEach(item => {
      item.querySelector('.ord-handle').addEventListener('mousedown', startDragMouse);
      item.addEventListener('touchstart', startDragTouch, { passive: false });
    });

    function startDragMouse(e) {
      e.preventDefault();
      const item = e.currentTarget.closest('.ord-item');
      beginDrag(item, e.clientX, e.clientY);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
    }

    function onMouseMove(e) { moveGhost(e.clientX, e.clientY); updatePlaceholder(e.clientY); }
    function onMouseUp()    { endDrag(); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }

    function startDragTouch(e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      beginDrag(e.currentTarget, touch.clientX, touch.clientY);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend',  onTouchEnd);
    }

    function onTouchMove(e) {
      e.preventDefault();
      const touch = e.touches[0];
      moveGhost(touch.clientX, touch.clientY);
      updatePlaceholder(touch.clientY);
    }

    function onTouchEnd() {
      endDrag();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',  onTouchEnd);
    }

    function beginDrag(item, cx, cy) {
      dragging = item;
      const rect = item.getBoundingClientRect();
      offsetX = cx - rect.left;
      offsetY = cy - rect.top;

      ghost = item.cloneNode(true);
      ghost.className = 'ord-ghost';
      ghost.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        width:${rect.width}px; opacity:0.92;
        box-shadow:0 8px 24px rgba(0,255,65,0.25);
        border:1px solid var(--green);
        background:rgba(0,30,8,0.97);
        transform:scale(1.02);
        transition:transform 0.1s, box-shadow 0.1s;
      `;
      ghost.style.left = (cx - offsetX) + 'px';
      ghost.style.top  = (cy - offsetY) + 'px';
      document.body.appendChild(ghost);

      placeholder = createPlaceholder(rect.height);
      item.classList.add('ord-dragging');
      item.after(placeholder);
      item.style.display = 'none';
    }

    function moveGhost(cx, cy) {
      if (!ghost) return;
      ghost.style.left = (cx - offsetX) + 'px';
      ghost.style.top  = (cy - offsetY) + 'px';
    }

    function updatePlaceholder(cy) {
      if (!placeholder || !dragging) return;
      const after = getDragAfterElement(cy);
      if (after) after.before(placeholder);
      else        container.appendChild(placeholder);
    }

    function endDrag() {
      if (!dragging) return;
      if (placeholder && placeholder.parentNode)
        placeholder.replaceWith(dragging);
      else
        container.appendChild(dragging);

      dragging.style.display = '';
      dragging.classList.remove('ord-dragging');

      if (ghost) { ghost.remove(); ghost = null; }
      placeholder = null;
      dragging    = null;
    }

    const checkBtn = document.getElementById(`${labId}-ord-check`);
    if (checkBtn) checkBtn.onclick = () => checkOrdering(lab, labId);
  }, 250);
}

window.checkOrdering = function(lab, labId) {
  const container = document.getElementById(`${labId}-ordering`);
  if (!container) return;
  const items   = [...container.querySelectorAll('.ord-item')];
  const current = items.map(i => i.dataset.id);
  const correct = lab.correctOrder;
  const isOk    = JSON.stringify(current) === JSON.stringify(correct);

  const resultEl = document.getElementById(`${labId}-ord-result`);
  if (resultEl) {
    resultEl.style.display = 'block';
    if (isOk) {
      resultEl.innerHTML = `<span class="mc-fb-ok">✓ Ordem correta.</span> ${escapeHtml(lab.explanation || '')}`;
      if (lab.xpReward && typeof window._grantXP === 'function')
        window._grantXP({ xp: lab.xpReward, label: `lab:ordering:${labId}` });
      items.forEach((el, i) => {
        setTimeout(() => el.classList.add('ord-correct'), i * 80);
      });
    } else {
      let hits = 0;
      items.forEach((el, i) => {
        if (el.dataset.id === correct[i]) { el.classList.add('ord-hit'); hits++; }
        else el.classList.add('ord-miss');
      });
      resultEl.innerHTML = `<span class="mc-fb-err">✗ ${hits}/${correct.length} na posição certa.</span> Verifique a sequência.`;
      setTimeout(() => items.forEach(el => el.classList.remove('ord-hit','ord-miss')), 1500);
    }
  }
};

/* ═══════════════════════════════════════════════════════════
   FILLBLANK LAB
═══════════════════════════════════════════════════════════ */
function renderFillBlankBody(lab, labId, mId, stepN) {
  const tmpl = lab.template || '';
  let rendered = tmpl;
  lab.blanks.forEach(b => {
    rendered = rendered.replace(
      `___${b.id}___`,
      `<span class="fb-blank-wrap"><input type="text" class="fb-input" id="${labId}-${b.id}" placeholder="${escapeHtml(b.label)}" spellcheck="false"><label class="fb-label">${escapeHtml(b.label)}</label></span>`
    );
  });
  return `
    <div class="fillblank-lab">
      <div class="fb-template code-block">${rendered}</div>
      <button class="btn fb-check-btn" onclick="checkFillBlank('${labId}', '${mId}', ${stepN})">[ verificar respostas ]</button>
      <div class="fb-results" id="${labId}-fb-results"></div>
    </div>`;
}

window.checkFillBlank = function(labId, mId, stepN) {
  const m   = MISSIONS_DATA.find(x => x.id === parseInt(mId));
  if (!m) return;
  const step = m.steps[stepN - 1];
  const lab  = step?.lab;
  if (!lab?.blanks) return;
  const resultsEl = document.getElementById(`${labId}-fb-results`);
  if (!resultsEl) return;
  let correct = 0;
  let html = '';
  lab.blanks.forEach(b => {
    const input   = document.getElementById(`${labId}-${b.id}`);
    if (!input) return;
    const val     = input.value.trim().replace(/\s+/g,' ');
    const answers = [b.answer,...(b.alternatives||[])].map(a => a.toLowerCase().replace(/\s+/g,''));
    const isOk    = answers.includes(val.toLowerCase().replace(/\s+/g,''));
    input.classList.remove('fb-ok','fb-err');
    input.classList.add(isOk ? 'fb-ok' : 'fb-err');
    if (isOk) correct++;
    html += `<div class="fb-result-item ${isOk?'fb-r-ok':'fb-r-err'}">
      <span class="fb-r-icon">${isOk?'✓':'✗'}</span>
      <span class="fb-r-label">${escapeHtml(b.label)}</span>
      ${isOk ? '' : `<span class="fb-r-hint"> Dica: ${escapeHtml(b.hint || '')}</span>`}
    </div>`;
  });
  resultsEl.innerHTML = html + `
    <div class="fb-score">${correct}/${lab.blanks.length} corretos
      ${correct === lab.blanks.length ? ` — <span style="color:var(--green)">Lab concluído! +${lab.xpReward} XP</span>` : ''}
    </div>`;
  if (correct === lab.blanks.length && lab.xpReward && typeof window._grantXP === 'function')
    window._grantXP({ xp: lab.xpReward, label: `lab:fillblank:${labId}` });
};

/* ═══════════════════════════════════════════════════════════
   CODE REVIEW LAB
═══════════════════════════════════════════════════════════ */
function renderCodeReviewBody(lab, labId) {
  const lines = lab.code.split('\n');
  const linesHtml = lines.map((ln, i) => {
    const num = i + 1;
    return `<div class="cr-line" id="${labId}-cr-line-${num}" data-line="${num}" onclick="toggleCrLine('${labId}', ${num})">
      <span class="cr-linenum">${String(num).padStart(2,'0')}</span>
      <span class="cr-code">${escapeHtml(ln)}</span>
      <span class="cr-marker" id="${labId}-cr-marker-${num}"></span>
    </div>`;
  }).join('');

  const bugCount = lab.bugs.length;

  return `
    <div class="cr-lab" id="${labId}-cr">
      <div class="cr-instructions">
        Clique nas <span style="color:var(--red)">${bugCount} linha${bugCount>1?'s':''} vulnerável${bugCount>1?'s':''}</span> do código abaixo.
        <span class="cr-score-tag" id="${labId}-cr-score">0/${bugCount} encontradas</span>
      </div>
      <div class="cr-code-block">${linesHtml}</div>
      <button class="btn cr-check-btn" id="${labId}-cr-check" onclick="checkCodeReview('${labId}')">[ verificar seleção ]</button>
      <div class="mc-feedback" id="${labId}-cr-result" style="display:none;margin-top:10px;"></div>
    </div>`;
}

window.toggleCrLine = function(labId, lineNum) {
  const lineEl   = document.getElementById(`${labId}-cr-line-${lineNum}`);
  const markerEl = document.getElementById(`${labId}-cr-marker-${lineNum}`);
  if (!lineEl) return;

  const isSelected = lineEl.classList.toggle('cr-selected');
  if (markerEl) markerEl.textContent = isSelected ? '◀ suspeita' : '';

  const lab    = _crLabs[labId];
  if (!lab) return;
  const selected = document.querySelectorAll(`#${labId}-cr .cr-line.cr-selected`).length;
  const scoreTag = document.getElementById(`${labId}-cr-score`);
  if (scoreTag) scoreTag.textContent = `${selected}/${lab.bugs.length} marcadas`;
};

const _crLabs = {};
function initCodeReviewLab(lab, mId, stepN) {
  const labId = `lab-${mId}-${stepN}`;
  _crLabs[labId] = lab;
}

window.checkCodeReview = function(labId) {
  const lab      = _crLabs[labId];
  const resultEl = document.getElementById(`${labId}-cr-result`);
  if (!lab || !resultEl) return;

  const bugLines    = new Set(lab.bugs.map(b => b.line));
  const selectedEls = document.querySelectorAll(`#${labId}-cr .cr-line.cr-selected`);
  const selected    = new Set([...selectedEls].map(el => parseInt(el.dataset.line)));

  let hits   = 0;
  let missed = 0;
  let false_  = 0;

  bugLines.forEach(l => { if (selected.has(l)) hits++; else missed++; });
  selected.forEach(l  => { if (!bugLines.has(l)) false_++; });

  document.querySelectorAll(`#${labId}-cr .cr-line`).forEach(el => {
    const ln = parseInt(el.dataset.line);
    el.classList.remove('cr-correct','cr-false-positive','cr-missed');
    if (bugLines.has(ln) && selected.has(ln)) el.classList.add('cr-correct');
    else if (!bugLines.has(ln) && selected.has(ln)) el.classList.add('cr-false-positive');
    else if (bugLines.has(ln) && !selected.has(ln)) el.classList.add('cr-missed');
  });

  const perfect = hits === bugLines.size && false_ === 0;
  let html = '';
  if (perfect) {
    html = `<span class="mc-fb-ok">✓ Auditoria perfeita.</span> Você identificou todas as linhas vulneráveis sem falsos positivos.<br>`;
  } else {
    html = `<span class="mc-fb-err">✗ ${hits}/${bugLines.size} corretas</span>`;
    if (false_ > 0) html += `, ${false_} falso${false_>1?'s':''} positivo${false_>1?'s':''}`;
    html += `.<br>`;
  }
  lab.bugs.forEach(b => {
    const found = selected.has(b.line);
    html += `<div class="cr-explain ${found?'cr-ex-ok':'cr-ex-miss'}">
      <span>${found?'✓':'✗'}</span> linha ${b.line}: ${escapeHtml(b.reason)}
    </div>`;
  });

  resultEl.style.display = 'block';
  resultEl.innerHTML = html;

  if (perfect && lab.xpReward && typeof window._grantXP === 'function')
    window._grantXP({ xp: lab.xpReward, label: `lab:codeReview:${labId}` });
  else if (hits > 0 && typeof window._grantXP === 'function')
    window._grantXP({ xp: Math.round(lab.xpReward * hits / bugLines.size * 0.6), label: `lab:codeReview:partial:${labId}` });
};

/* ═══════════════════════════════════════════════════════════
   DEBUG TRACE LAB
═══════════════════════════════════════════════════════════ */
function renderDebugTraceBody(lab, labId) {
  const stepsHtml = lab.steps.map((s, i) => `
    <div class="dt-step" id="${labId}-dt-${s.id}" data-id="${s.id}" data-safe="${s.safe}" onclick="clickDebugStep('${labId}', '${s.id}')">
      <div class="dt-arrow">${i === 0 ? '▶' : '↓'}</div>
      <div class="dt-box">
        <div class="dt-num">linha ${i + 1}</div>
        <code class="dt-code">${escapeHtml(s.code)}</code>
        ${s.note ? `<div class="dt-note">${escapeHtml(s.note)}</div>` : ''}
      </div>
      <div class="dt-status" id="${labId}-dt-status-${s.id}"></div>
    </div>`).join('');

  return `
    <div class="dt-lab" id="${labId}-dt">
      <div class="dt-instructions">
        Clique na linha onde a execução se torna <span style="color:var(--red)">perigosa</span> — onde o input do atacante pode causar dano.
      </div>
      <div class="dt-trace">${stepsHtml}</div>
      <div class="mc-feedback" id="${labId}-dt-result" style="display:none;margin-top:12px;"></div>
    </div>`;
}

const _dtLabs = {};
function initDebugTraceLab(lab, mId, stepN) {
  const labId = `lab-${mId}-${stepN}`;
  _dtLabs[labId] = lab;
}

window.clickDebugStep = function(labId, stepId) {
  const lab = _dtLabs[labId];
  if (!lab) return;

  lab.steps.forEach(s => {
    const el = document.getElementById(`${labId}-dt-${s.id}`);
    if (el) el.style.pointerEvents = 'none';
  });

  const step    = lab.steps.find(s => s.id === stepId);
  const resultEl = document.getElementById(`${labId}-dt-result`);
  const isBoom  = step?.boom === true;

  const clickedEl = document.getElementById(`${labId}-dt-${stepId}`);
  if (clickedEl) clickedEl.classList.add(isBoom ? 'dt-boom' : 'dt-wrong-pick');

  lab.steps.forEach(s => {
    const st = document.getElementById(`${labId}-dt-status-${s.id}`);
    if (!st) return;
    if (s.boom)       st.textContent = '💥 PONTO DE INJEÇÃO';
    else if (!s.safe) st.textContent = '⚠ suspeito';
    else              st.textContent = '✓ seguro';
  });

  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = isBoom
      ? `<span class="mc-fb-ok">✓ Correto.</span> ${escapeHtml(lab.explanation || '')}`
      : `<span class="mc-fb-err">✗ Não é aqui.</span> ${escapeHtml(lab.explanation || '')}`;

    if (isBoom && lab.xpReward && typeof window._grantXP === 'function')
      window._grantXP({ xp: lab.xpReward, label: `lab:debugTrace:${labId}` });
  }
};

/* ═══════════════════════════════════════════════════════════
   THREAT MAP LAB
═══════════════════════════════════════════════════════════ */
function renderThreatMapBody(lab, labId) {
  const shuffledDefenses = [...lab.defenses].sort(() => Math.random() - 0.5);
  return `
    <div class="tm-lab" id="${labId}-tm">
      <div class="tm-instructions">
        Conecte cada <span style="color:var(--red)">ameaça</span> à sua <span style="color:var(--green)">defesa</span> correta.
      </div>
      <div class="tm-grid">
        <div class="tm-col tm-col-threats">
          <div class="tm-col-title">// AMEAÇAS</div>
          ${lab.threats.map(t => `
            <div class="tm-card tm-threat" id="${labId}-threat-${t.id}" data-id="${t.id}" onclick="selectThreat('${labId}','${t.id}')">
              ${escapeHtml(t.label)}
            </div>`).join('')}
        </div>
        <div class="tm-col tm-col-lines">
          <svg class="tm-svg" id="${labId}-svg"></svg>
        </div>
        <div class="tm-col tm-col-defenses">
          <div class="tm-col-title">// DEFESAS</div>
          ${shuffledDefenses.map(d => `
            <div class="tm-card tm-defense" id="${labId}-defense-${d.id}" data-id="${d.id}" onclick="selectDefense('${labId}','${d.id}')">
              ${escapeHtml(d.label)}
            </div>`).join('')}
        </div>
      </div>
      <button class="btn ord-check-btn" id="${labId}-tm-check" onclick="checkThreatMap('${labId}')">[ verificar conexões ]</button>
      <div class="mc-feedback" id="${labId}-tm-result" style="display:none;margin-top:10px;"></div>
    </div>`;
}

const _tmState = {};
function initThreatMapLab(lab, mId, stepN) {
  const labId = `lab-${mId}-${stepN}`;
  _tmState[labId] = { lab, selected: null, pairs: {} };
  setTimeout(() => _tmResizeSvg(labId), 300);
  window.addEventListener('resize', () => _tmResizeSvg(labId));
}

function _tmResizeSvg(labId) {
  const svg = document.getElementById(`${labId}-svg`);
  const col = svg?.closest('.tm-col-lines');
  if (!svg || !col) return;
  svg.setAttribute('width',  col.offsetWidth);
  svg.setAttribute('height', col.offsetHeight || 300);
  _tmRedraw(labId);
}

function _tmRedraw(labId) {
  const state = _tmState[labId];
  if (!state) return;
  const svg = document.getElementById(`${labId}-svg`);
  if (!svg) return;
  svg.innerHTML = '';

  const svgRect = svg.getBoundingClientRect();

  Object.entries(state.pairs).forEach(([tId, dId]) => {
    const tEl = document.getElementById(`${labId}-threat-${tId}`);
    const dEl = document.getElementById(`${labId}-defense-${dId}`);
    if (!tEl || !dEl) return;

    const tRect = tEl.getBoundingClientRect();
    const dRect = dEl.getBoundingClientRect();

    const x1 = 0;
    const y1 = tRect.top + tRect.height / 2 - svgRect.top;
    const x2 = svgRect.width;
    const y2 = dRect.top + dRect.height / 2 - svgRect.top;
    const cx = svgRect.width / 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`);
    path.setAttribute('stroke','rgba(0,255,65,0.5)');
    path.setAttribute('stroke-width','2');
    path.setAttribute('fill','none');
    path.setAttribute('stroke-dasharray','5,3');
    svg.appendChild(path);

    [[x1,y1],[x2,y2]].forEach(([px,py]) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
      dot.setAttribute('cx',px); dot.setAttribute('cy',py); dot.setAttribute('r','4');
      dot.setAttribute('fill','var(--green)');
      svg.appendChild(dot);
    });
  });
}

window.selectThreat = function(labId, tId) {
  const state = _tmState[labId];
  if (!state) return;
  if (state.pairs[tId]) {
    const dId = state.pairs[tId];
    delete state.pairs[tId];
    document.getElementById(`${labId}-threat-${tId}`)?.classList.remove('tm-paired');
    document.getElementById(`${labId}-defense-${dId}`)?.classList.remove('tm-paired');
    _tmRedraw(labId);
    return;
  }
  document.querySelectorAll(`#${labId}-tm .tm-threat`).forEach(el => el.classList.remove('tm-active'));
  state.selected = { type:'threat', id:tId };
  document.getElementById(`${labId}-threat-${tId}`)?.classList.add('tm-active');
};

window.selectDefense = function(labId, dId) {
  const state = _tmState[labId];
  if (!state) return;
  if (state.selected?.type === 'threat') {
    const tId = state.selected.id;
    Object.entries(state.pairs).forEach(([t,d]) => {
      if (d === dId) {
        delete state.pairs[t];
        document.getElementById(`${labId}-threat-${t}`)?.classList.remove('tm-paired');
      }
    });
    state.pairs[tId] = dId;
    document.getElementById(`${labId}-threat-${tId}`)?.classList.remove('tm-active');
    document.getElementById(`${labId}-threat-${tId}`)?.classList.add('tm-paired');
    document.getElementById(`${labId}-defense-${dId}`)?.classList.add('tm-paired');
    state.selected = null;
    _tmRedraw(labId);
  } else {
    document.querySelectorAll(`#${labId}-tm .tm-defense`).forEach(el => el.classList.remove('tm-active'));
    state.selected = { type:'defense', id:dId };
    document.getElementById(`${labId}-defense-${dId}`)?.classList.add('tm-active');
  }
};

window.checkThreatMap = function(labId) {
  const state    = _tmState[labId];
  const resultEl = document.getElementById(`${labId}-tm-result`);
  if (!state || !resultEl) return;

  const lab = state.lab;
  const correctPairs = Object.fromEntries(lab.pairs);
  let hits = 0;

  lab.threats.forEach(t => {
    const tEl = document.getElementById(`${labId}-threat-${t.id}`);
    const dEl = state.pairs[t.id] ? document.getElementById(`${labId}-defense-${state.pairs[t.id]}`) : null;
    const isOk = state.pairs[t.id] === correctPairs[t.id];
    if (isOk) { hits++; tEl?.classList.add('tm-correct'); dEl?.classList.add('tm-correct'); }
    else       { tEl?.classList.add('tm-wrong');  dEl?.classList.add('tm-wrong'); }
  });

  const perfect = hits === lab.threats.length;
  resultEl.style.display = 'block';
  resultEl.innerHTML = perfect
    ? `<span class="mc-fb-ok">✓ Mapa perfeito.</span> Cada vetor ligado à sua defesa correta.`
    : `<span class="mc-fb-err">✗ ${hits}/${lab.threats.length} conexões corretas.</span> Revise os pares destacados em vermelho.`;

  if (perfect && lab.xpReward && typeof window._grantXP === 'function')
    window._grantXP({ xp: lab.xpReward, label: `lab:threatMap:${labId}` });
};

/* ═══════════════════════════════════════════════════════════
   AEGIS TIP
═══════════════════════════════════════════════════════════ */
function renderAegisTip(tip) {
  if (!tip) return '';
  return `
    <div class="aegis-tip-block">
      <div class="aegis-tip-label">◈ ÆGIS</div>
      <div class="aegis-tip-text">${tip}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   QUIZ — Step 5
═══════════════════════════════════════════════════════════ */
function renderMissionQuiz(m) {
  const quizEl = document.getElementById(`quiz-${m.id}`);
  if (!quizEl) return;
  if (MISSION_STATE.quizIndex >= m.quiz.length) return;

  const q     = m.quiz[MISSION_STATE.quizIndex];
  const qNum  = MISSION_STATE.quizIndex + 1;
  const total = m.quiz.length;

  const countEl = quizEl.closest('.section')?.querySelector('.quiz-count-label');
  if (countEl) countEl.textContent = `${MISSION_STATE.quizIndex} / ${total} questões`;

  const shuffled = q.opts
    .map((text, i) => ({ text, isCorrect: i === q.correct }))
    .sort(() => Math.random() - 0.5);
  const correctShuffled = shuffled.findIndex(o => o.isCorrect);

  quizEl.innerHTML = `
    <div class="quiz-q-wrap">
      <div class="quiz-q-header">
        <div class="quiz-q-bar"><div class="quiz-q-bar-fill" style="width:${((qNum-1)/total)*100}%"></div></div>
        <div class="quiz-q-num">${qNum} / ${total}</div>
      </div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-opts" id="quiz-opts-${m.id}-${MISSION_STATE.quizIndex}">
        ${shuffled.map((o, i) => `
          <button class="quiz-opt" id="qopt-${m.id}-${MISSION_STATE.quizIndex}-${i}"
            onclick="answerMissionQuiz(${i}, ${m.id}, ${correctShuffled})">
            <span class="quiz-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span class="quiz-opt-text">${o.text}</span>
          </button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quiz-fb-${m.id}-${MISSION_STATE.quizIndex}" style="display:none"></div>
    </div>`;
}

function answerMissionQuiz(i, missionId, correctShuffled) {
  const m = MISSIONS_DATA.find(x => x.id === missionId);
  if (!m) return;
  const qIdx = MISSION_STATE.quizIndex;
  const q    = m.quiz[qIdx];

  document.querySelectorAll(`[id^="qopt-${m.id}-${qIdx}-"]`).forEach(o => o.disabled = true);

  const correct = i === correctShuffled;
  const selBtn  = document.getElementById(`qopt-${m.id}-${qIdx}-${i}`);
  const corBtn  = document.getElementById(`qopt-${m.id}-${qIdx}-${correctShuffled}`);

  if (correct) {
    selBtn?.classList.add('quiz-opt-correct');
    if (typeof window._grantXP === 'function') window._grantXP({ xp: 50, label: 'quiz:correct' });
  } else {
    selBtn?.classList.add('quiz-opt-wrong');
    corBtn?.classList.add('quiz-opt-correct');
  }

  if (typeof botSay === 'function')
    botSay(`<span class="${correct?'hl':'danger'}">${correct?'✓ Correto.':'✗ Incorreto.'}</span> ${q.exp}`);

  const fb = document.getElementById(`quiz-fb-${m.id}-${qIdx}`);
  if (fb) {
    fb.style.display = 'block';
    fb.innerHTML = `<span class="${correct?'mc-fb-ok':'mc-fb-err'}">${correct?'✓':'✗'}</span> ${q.exp}`;
  }

  setTimeout(() => {
    MISSION_STATE.quizIndex++;
    if (MISSION_STATE.quizIndex < m.quiz.length) {
      renderMissionQuiz(m);
    } else {
      const quizEl = document.getElementById(`quiz-${m.id}`);
      if (quizEl) quizEl.innerHTML += `
        <div class="content-block quiz-complete-block" style="margin-top:16px;">
          <div style="color:var(--green);font-size:14px;margin-bottom:8px;">✓ Checkpoint concluído</div>
          <div style="color:var(--text-mid);font-size:12px;line-height:1.7;">Missão ${m.id} — <span style="color:var(--green)">${m.vector}</span> dominado.</div>
          <div class="xp-badge">+ ${m.xp} XP // runa: ${m.runeIcon} ${m.rune}</div>
        </div>`;
      const nextBtn = document.getElementById(`nextMissionBtn-${m.id}`);
      if (nextBtn) nextBtn.style.display = 'inline-block';
      if (typeof window._grantXP === 'function') window._grantXP({ xp: m.xp, label: `missao:${m.id}` });
      if (typeof botSay === 'function') botSay(`<span class="hl">Missão ${m.id} concluída, Guardião.</span> +${m.xp} XP. Runa ${m.runeIcon} ${m.rune} desbloqueada.`);

      /* ── USA _finalizeMission em vez de completeMission diretamente ── */
      _finalizeMission(m.id, m.xp);

      if (typeof onMissionEnded === 'function') onMissionEnded();
    }
  }, 1800);
}

/* ─── MISSION COMPLETE ───────────────────────────────────── */
function onMissionComplete(missionId) {
  if (typeof onMissionEnded === 'function') onMissionEnded();
  const detail = document.getElementById('missionDetailView');
  if (detail) detail.style.display = 'none';
  const nextM = MISSIONS_DATA.find(x => x.id === missionId + 1);
  if (!nextM) { if (typeof botSay === 'function') botSay(`<span class="hl">ÆGIS completamente blindado, Guardião.</span> Season 01 concluída.`); return; }
  setTimeout(() => { refreshMissionsList(); openBriefing(missionId + 1); }, 600);
}

/* ═══════════════════════════════════════════════════════════
   ACTIVE MISSION CARD
═══════════════════════════════════════════════════════════ */
const MISSIONS_META = [
  null,
  { title: 'Missão 01 — O Escudo de Vidro',       type: 'Command Injection', dif: '★☆☆☆☆', xp: '+200'  },
  { title: 'Missão 02 — O Labirinto de Objetos',  type: 'IDOR',              dif: '★★☆☆☆', xp: '+300'  },
  { title: 'Missão 03 — A Chave Quebrada',        type: 'Broken Auth',       dif: '★★★☆☆', xp: '+400'  },
  { title: 'Missão 04 — O Servidor Espelho',      type: 'SSRF',              dif: '★★★★☆', xp: '+500'  },
  { title: 'Missão 05 — A Cadeia Envenenada',     type: 'Supply Chain',      dif: '★★★★☆', xp: '+600'  },
  { title: 'Missão 06 — O Olho de Loki',          type: 'APT Final',         dif: '★★★★★', xp: '+1000' },
];

function updateActiveMissionCard() {
  if (typeof STATE === 'undefined') return;
  const completed = Array.isArray(STATE.completedMissions) ? STATE.completedMissions : [];
  const id        = _resolveNextActiveMission();
  const allDone   = (id === null);
  if (id && STATE.activeMissionId !== id) { STATE.activeMissionId = id; MISSION_STATE.activeMissionId = id; }

  const fill = document.getElementById('amcProgressFill');
  if (fill) fill.style.width = Math.round((completed.length / 6) * 100) + '%';

  const titleEl = document.getElementById('activeMissionTitle');
  const typeEl  = document.getElementById('activeMissionType');
  const difEl   = document.getElementById('activeMissionDif');
  const xpEl    = document.getElementById('activeMissionXp');
  const tagEl   = document.querySelector('.active-mission-card .amc-tag');
  const card    = document.querySelector('.active-mission-card');

  if (allDone) {
    if (titleEl) titleEl.textContent = 'Todas as missões concluídas!';
    if (typeEl)  typeEl.textContent  = 'Season 01 completa';
    if (tagEl)   tagEl.innerHTML     = '<div class="amc-pulse" style="background:var(--yellow)"></div> season completa';
    if (card)    card.onclick        = () => navigate('progresso');
    return;
  }
  const meta = MISSIONS_META[id];
  if (!meta) return;
  if (titleEl) titleEl.textContent = meta.title;
  if (typeEl)  typeEl.textContent  = meta.type;
  if (difEl)   difEl.textContent   = meta.dif;
  if (xpEl)    xpEl.textContent    = meta.xp;
  if (tagEl)   tagEl.innerHTML     = '<div class="amc-pulse"></div> em progresso';
  if (card)    card.onclick        = () => navigate('missoes');
}

setTimeout(updateActiveMissionCard, 800);
setInterval(updateActiveMissionCard, 2000);

/* ─── HELPERS ────────────────────────────────────────────── */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function openMission() { openMissionById(1); }
window._mcLabs = window._mcLabs || {};

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
(function injectMissionStyles() {
  if (document.getElementById('missionUiStyles')) return;
  const style = document.createElement('style');
  style.id = 'missionUiStyles';
  style.textContent = `

    /* ── Steps Bar ── */
    .steps-bar { display:flex;gap:0;margin:20px 0 0;border-bottom:1px solid var(--border);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
    .steps-bar::-webkit-scrollbar { display:none; }
    .step { display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;position:relative;font-size:11px;color:var(--text-dim);letter-spacing:1px;transition:color 0.2s;white-space:nowrap;flex-shrink:0; }
    .step:hover { color:var(--text-mid); }
    .step.active { color:var(--green);border-bottom:2px solid var(--green);margin-bottom:-1px; }
    .step.done::after { content:'✓';margin-left:4px;color:var(--green);font-size:10px; }
    .step-dot { width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0; }
    .step.active .step-dot { box-shadow:0 0 6px var(--green-glow); }
    .step-lbl { display:none; }
    @media (min-width:600px) { .step-lbl { display:inline; } }

    /* ── Mission Page ── */
    .mission-page { display:none;animation:fadeUp 0.35s ease both; }
    .mission-page.active { display:block; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }

    /* ── ÆGIS Tip ── */
    .aegis-tip-block { border:1px solid var(--border);border-left:3px solid var(--green);padding:10px 14px;background:rgba(0,255,65,0.04);margin:16px 0;display:flex;gap:12px;align-items:flex-start; }
    .aegis-tip-label { font-family:'VT323',monospace;font-size:16px;color:var(--green);flex-shrink:0;line-height:1.4; }
    .aegis-tip-text  { font-size:12px;color:var(--text-mid);line-height:1.7; }
    .aegis-tip-text code { font-family:'Fira Code',monospace;background:rgba(0,255,65,0.08);border:1px solid var(--border);padding:1px 5px;font-size:11px;color:var(--green); }

    /* ── Lab Block ── */
    .lab-block { margin:20px 0;border:1px solid var(--border);border-top:2px solid var(--green);background:rgba(0,255,65,0.02); }
    .lab-header { display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);background:rgba(0,20,6,0.6);flex-wrap:wrap; }
    .lab-tag    { font-family:'VT323',monospace;font-size:14px;color:var(--bg);background:var(--green);padding:1px 8px;letter-spacing:2px; }
    .lab-title  { font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--green);flex:1; }
    .lab-xp     { font-size:11px;color:var(--text-dim);letter-spacing:1px; }
    .lab-desc   { padding:10px 16px;font-size:12px;color:var(--text-mid);line-height:1.7;border-bottom:1px solid var(--border); }
    .lab-body   { padding:16px; }

    /* ── Terminal Lab ── */
    .terminal-lab { background:rgba(2,5,2,0.95);border:1px solid var(--border);font-family:'Share Tech Mono',monospace;overflow:hidden; }
    .tl-topbar { display:flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(0,20,6,0.8);border-bottom:1px solid var(--border); }
    .tl-dot { width:10px;height:10px;border-radius:50%; }
    .tl-dot.red{background:#ff5f56;}.tl-dot.yellow{background:#ffbd2e;}.tl-dot.green{background:#27c93f;}
    .tl-title { font-size:11px;color:var(--text-dim);margin-left:8px;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0; }
    .tl-progress-tag { font-size:10px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;letter-spacing:1px;flex-shrink:0; }
    .tl-output { padding:12px 16px;min-height:80px;max-height:260px;overflow-y:auto;border-bottom:1px solid var(--border); }
    .tl-line { font-size:11px;line-height:1.8;color:var(--text-mid);white-space:pre-wrap;word-break:break-all;overflow-wrap:break-word; }
    .tl-dim{color:var(--text-dim);}.tl-comment{color:var(--text-dim);font-style:italic;}.tl-danger{color:var(--red);}
    .tl-p{color:var(--green);}.tl-cmd{color:#fff;}.tl-json{color:#7ec8e3;}.tl-success{color:var(--green);margin:4px 0;}
    .tl-separator{color:var(--border);}.tl-challenge-num{color:var(--green);font-size:10px;letter-spacing:2px;margin:4px 0 2px;}
    .tl-instruction-line{color:var(--text-mid);font-size:12px;line-height:1.6;margin-bottom:4px;}
    .tl-complete{color:var(--green);font-size:11px;padding:8px 0;border-top:1px solid var(--border);margin-top:6px;letter-spacing:1px;}
    .tl-input-area { display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--border);background:rgba(0,15,4,0.9);flex-wrap:nowrap; }
    .tl-prompt-inline { color:var(--green);font-family:'Share Tech Mono',monospace;font-size:11px;flex-shrink:0;white-space:nowrap; }
    .tl-real-input { flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:'Share Tech Mono',monospace;font-size:11px;caret-color:var(--green);min-width:0; }
    .tl-real-input::placeholder { color:var(--text-dim);font-size:10px; }
    .tl-real-input:disabled { opacity:0.4; }
    .tl-run-btn { font-family:'Share Tech Mono',monospace;font-size:13px;border:1px solid var(--green);background:transparent;color:var(--green);padding:3px 10px;cursor:pointer;transition:all 0.15s;flex-shrink:0;line-height:1; }
    .tl-run-btn:hover { background:var(--green);color:var(--bg); }
    .tl-run-btn:disabled { opacity:0.3;cursor:not-allowed; }
    .tl-hint-area { display:flex;align-items:flex-start;gap:8px;padding:8px 14px;background:rgba(0,255,65,0.04);border-top:1px solid var(--border);border-left:3px solid var(--green); }
    .tl-hint-icon { color:var(--green);font-size:14px;flex-shrink:0;margin-top:1px; }
    .tl-hint-text { font-size:11px;color:var(--text-mid);line-height:1.6;font-family:'Share Tech Mono',monospace; }
    .tl-controls { display:flex;align-items:center;gap:12px;padding:6px 14px;border-top:1px solid var(--border);background:rgba(0,10,3,0.7); }
    .tl-hint-btn { font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1px;border:1px solid var(--border);background:transparent;color:var(--text-dim);padding:3px 10px;cursor:pointer;transition:all 0.2s; }
    .tl-hint-btn:hover { border-color:var(--green);color:var(--green); }
    .tl-attempts { font-size:10px;color:var(--red);font-family:'Share Tech Mono',monospace;letter-spacing:0.5px; }

    /* ── MultiChoice ── */
    .mc-progress-bar{height:2px;background:var(--border);margin-bottom:16px;}
    .mc-progress-fill{height:100%;background:var(--green);transition:width 0.4s;}
    .mc-q-counter{font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px;}
    .mc-code{font-size:10px;line-height:1.7;margin-bottom:12px;white-space:pre;overflow-x:auto;max-height:180px;}
    .mc-question{font-size:13px;color:var(--text-mid);margin-bottom:14px;line-height:1.6;}
    .mc-options{display:flex;flex-direction:column;gap:6px;}
    .mc-opt{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;font-family:'Share Tech Mono',monospace;font-size:11px;padding:9px 14px;border:1px solid var(--border);background:transparent;color:var(--text-mid);cursor:pointer;transition:all 0.2s;line-height:1.5;}
    .mc-opt:hover:not(:disabled){border-color:var(--green);color:var(--green);}
    .mc-opt:disabled{cursor:default;}
    .mc-opt-letter{color:var(--green);flex-shrink:0;min-width:16px;}
    .mc-opt-correct{border-color:var(--green)!important;color:var(--green)!important;background:rgba(0,255,65,0.06)!important;}
    .mc-opt-wrong{border-color:var(--red)!important;color:var(--red)!important;background:rgba(255,0,40,0.06)!important;}
    .mc-feedback{font-size:11px;color:var(--text-mid);line-height:1.7;margin-top:10px;padding:8px 12px;background:rgba(0,0,0,0.3);border-left:2px solid var(--border);}
    .mc-fb-ok{color:var(--green);margin-right:6px;}.mc-fb-err{color:var(--red);margin-right:6px;}
    .mc-complete{text-align:center;padding:24px 0;}
    .mc-complete-icon{font-size:40px;color:var(--green);margin-bottom:10px;}
    .mc-complete-title{font-family:'VT323',monospace;font-size:24px;color:var(--green);margin-bottom:6px;}
    .mc-complete-sub{font-size:12px;color:var(--text-dim);}

    /* ── FillBlank ── */
    .fb-template{font-size:11px;line-height:2;white-space:pre-wrap;overflow-x:auto;margin-bottom:14px;}
    .fb-blank-wrap{display:inline-flex;flex-direction:column;vertical-align:middle;margin:0 4px;}
    .fb-input{font-family:'Share Tech Mono',monospace;font-size:11px;background:rgba(0,255,65,0.06);border:0;border-bottom:1px solid var(--green);color:var(--green);padding:2px 6px;min-width:140px;outline:none;transition:border-color 0.2s,background 0.2s;}
    .fb-input:focus{background:rgba(0,255,65,0.1);}
    .fb-input.fb-ok{border-color:var(--green);background:rgba(0,255,65,0.1);}
    .fb-input.fb-err{border-color:var(--red);color:var(--red);background:rgba(255,0,40,0.08);}
    .fb-label{font-size:9px;color:var(--text-dim);letter-spacing:1px;}
    .fb-check-btn{font-family:'Share Tech Mono',monospace;font-size:12px;border:1px solid var(--green);background:transparent;color:var(--green);padding:8px 16px;cursor:pointer;transition:all 0.2s;}
    .fb-check-btn:hover{background:var(--green);color:var(--bg);}
    .fb-results{margin-top:12px;}
    .fb-result-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;}
    .fb-r-ok{color:var(--green);}.fb-r-err{color:var(--red);}
    .fb-r-icon{flex-shrink:0;width:14px;}.fb-r-label{color:var(--text-mid);}.fb-r-hint{color:var(--text-dim);font-style:italic;}
    .fb-score{margin-top:10px;font-size:12px;color:var(--text-mid);}

    /* ── Ordering ── */
    .ord-instructions { font-size:12px;color:var(--text-dim);margin-bottom:4px; }
    .ord-hint-tip     { font-size:10px;color:rgba(0,255,65,0.3);margin-bottom:12px;letter-spacing:1px; }
    .ord-container    { display:flex;flex-direction:column;gap:6px;margin-bottom:14px;min-height:40px; }
    .ord-item { display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);background:rgba(2,8,4,0.85);cursor:default;transition:border-color 0.15s,background 0.15s,opacity 0.15s;user-select:none;touch-action:none; }
    .ord-item:hover { border-color:rgba(0,255,65,0.35); }
    .ord-item.ord-dragging { opacity:0.35; }
    .ord-item.ord-correct  { border-color:var(--green)!important;background:rgba(0,255,65,0.08)!important;animation:ordPop 0.3s ease; }
    .ord-item.ord-hit      { border-color:var(--green);background:rgba(0,255,65,0.06); }
    .ord-item.ord-miss     { border-color:var(--red);background:rgba(255,0,40,0.06); }
    @keyframes ordPop { 0%{transform:scale(1);}50%{transform:scale(1.02);}100%{transform:scale(1);} }
    .ord-placeholder { border:1px dashed rgba(0,255,65,0.4);background:rgba(0,255,65,0.03);border-radius:0;transition:height 0.1s; }
    .ord-handle { color:rgba(0,255,65,0.5);font-size:18px;flex-shrink:0;cursor:grab;padding:0 4px;line-height:1;touch-action:none; }
    .ord-handle:active { cursor:grabbing; }
    .ord-content { display:flex;flex-direction:column;gap:3px;flex:1;min-width:0; }
    .ord-label   { font-size:11px;color:var(--text-mid); }
    .ord-code    { font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--red);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .ord-check-btn { font-family:'Share Tech Mono',monospace;font-size:12px;border:1px solid var(--green);background:transparent;color:var(--green);padding:8px 16px;cursor:pointer;transition:all 0.2s; }
    .ord-check-btn:hover { background:var(--green);color:var(--bg); }

    /* ── Code Review ── */
    .cr-lab { font-family:'Share Tech Mono',monospace; }
    .cr-instructions { font-size:12px;color:var(--text-dim);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px; }
    .cr-score-tag    { font-size:10px;color:var(--green);letter-spacing:1px;border:1px solid rgba(0,255,65,0.2);padding:2px 8px; }
    .cr-code-block   { border:1px solid var(--border);background:rgba(2,5,2,0.95);margin-bottom:14px;overflow-x:auto; }
    .cr-line { display:flex;align-items:center;gap:0;padding:3px 0;cursor:pointer;border-left:3px solid transparent;transition:background 0.15s,border-color 0.15s; }
    .cr-line:hover            { background:rgba(0,255,65,0.04);border-left-color:rgba(0,255,65,0.2); }
    .cr-line.cr-selected      { background:rgba(255,150,0,0.08);border-left-color:rgba(255,150,0,0.7); }
    .cr-line.cr-correct       { background:rgba(0,255,65,0.08)!important;border-left-color:var(--green)!important; }
    .cr-line.cr-false-positive{ background:rgba(255,0,40,0.08)!important;border-left-color:var(--red)!important; }
    .cr-line.cr-missed        { background:rgba(255,100,0,0.08)!important;border-left-color:rgba(255,100,0,0.7)!important; }
    .cr-linenum { font-size:10px;color:var(--text-dim);min-width:36px;text-align:right;padding:0 10px;flex-shrink:0;user-select:none; }
    .cr-code    { font-size:11px;color:var(--text-mid);white-space:pre;flex:1; }
    .cr-marker  { font-size:10px;color:rgba(255,150,0,0.7);padding:0 10px;flex-shrink:0;min-width:80px;text-align:right; }
    .cr-check-btn { font-family:'Share Tech Mono',monospace;font-size:12px;border:1px solid var(--green);background:transparent;color:var(--green);padding:8px 16px;cursor:pointer;transition:all 0.2s;margin-bottom:4px; }
    .cr-check-btn:hover { background:var(--green);color:var(--bg); }
    .cr-explain { font-size:11px;padding:4px 0 4px 12px;border-left:2px solid var(--border);margin-top:4px;color:var(--text-mid); }
    .cr-ex-ok  { border-left-color:var(--green);color:var(--green); }
    .cr-ex-miss{ border-left-color:var(--red);color:rgba(255,100,80,0.8); }

    /* ── Debug Trace ── */
    .dt-lab { font-family:'Share Tech Mono',monospace; }
    .dt-instructions { font-size:12px;color:var(--text-dim);margin-bottom:16px;line-height:1.6; }
    .dt-trace { display:flex;flex-direction:column; }
    .dt-step  { display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:4px 0;transition:opacity 0.2s; }
    .dt-step:hover .dt-box { border-color:rgba(0,255,65,0.4);background:rgba(0,255,65,0.04); }
    .dt-step.dt-boom       .dt-box { border-color:var(--red)!important;background:rgba(255,0,40,0.1)!important;animation:shake 0.3s ease; }
    .dt-step.dt-wrong-pick .dt-box { border-color:rgba(255,100,0,0.6)!important;background:rgba(255,80,0,0.06)!important; }
    @keyframes shake { 0%{transform:translateX(0);}25%{transform:translateX(-4px);}75%{transform:translateX(4px);}100%{transform:translateX(0);} }
    .dt-arrow  { font-size:14px;color:var(--text-dim);padding-top:12px;flex-shrink:0;width:16px;text-align:center; }
    .dt-box    { flex:1;border:1px solid var(--border);padding:8px 12px;transition:border-color 0.15s,background 0.15s; }
    .dt-num    { font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px; }
    .dt-code   { font-size:11px;color:#fff;display:block;white-space:pre-wrap;word-break:break-all; }
    .dt-note   { font-size:10px;color:var(--text-dim);margin-top:4px;font-style:italic; }
    .dt-status { font-size:10px;padding-top:12px;flex-shrink:0;width:110px;text-align:right;color:var(--text-dim);white-space:nowrap; }

    /* ── Threat Map ── */
    .tm-lab { font-family:'Share Tech Mono',monospace; }
    .tm-instructions { font-size:12px;color:var(--text-dim);margin-bottom:14px;line-height:1.6; }
    .tm-grid { display:grid;grid-template-columns:1fr 60px 1fr;gap:0;margin-bottom:14px;align-items:start;min-height:200px; }
    .tm-col  { display:flex;flex-direction:column;gap:8px; }
    .tm-col-title { font-size:10px;letter-spacing:2px;padding:4px 0;margin-bottom:4px; }
    .tm-col-threats  .tm-col-title { color:var(--red); }
    .tm-col-defenses .tm-col-title { color:var(--green);text-align:right; }
    .tm-col-lines { position:relative; }
    .tm-svg { position:absolute;inset:0;width:100%;height:100%; }
    .tm-card { padding:8px 10px;border:1px solid var(--border);font-size:11px;line-height:1.5;cursor:pointer;transition:border-color 0.15s,background 0.15s; }
    .tm-threat  { color:var(--red);border-color:rgba(255,0,40,0.25); }
    .tm-defense { color:var(--green);border-color:rgba(0,255,65,0.2);text-align:right; }
    .tm-card:hover     { background:rgba(0,255,65,0.04);border-color:rgba(0,255,65,0.4); }
    .tm-card.tm-active { border-color:var(--green)!important;background:rgba(0,255,65,0.08);box-shadow:0 0 8px rgba(0,255,65,0.15); }
    .tm-card.tm-paired { opacity:0.7; }
    .tm-card.tm-correct{ border-color:var(--green)!important;background:rgba(0,255,65,0.1)!important;opacity:1!important; }
    .tm-card.tm-wrong  { border-color:var(--red)!important;background:rgba(255,0,40,0.08)!important;opacity:1!important; }

    /* ── Quiz ── */
    .quiz-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
    .quiz-count-label{font-size:10px;color:var(--text-dim);letter-spacing:1px;}
    .quiz-xp-label{font-size:10px;color:var(--green);}
    .quiz-q-bar{height:2px;background:var(--border);margin-bottom:6px;}
    .quiz-q-bar-fill{height:100%;background:var(--green);transition:width 0.4s;}
    .quiz-q-num{font-size:10px;color:var(--text-dim);text-align:right;letter-spacing:1px;}
    .quiz-question{font-size:13px;color:var(--text-mid);margin-bottom:16px;line-height:1.7;}
    .quiz-opts{display:flex;flex-direction:column;gap:7px;}
    .quiz-opt{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;font-family:'Share Tech Mono',monospace;font-size:12px;padding:11px 16px;border:1px solid var(--border);background:transparent;color:var(--text-mid);cursor:pointer;transition:all 0.2s;line-height:1.5;}
    .quiz-opt:hover:not(:disabled){border-color:var(--green);color:var(--green);background:rgba(0,255,65,0.04);}
    .quiz-opt:disabled{cursor:default;}
    .quiz-opt-letter{color:var(--green);flex-shrink:0;min-width:18px;font-size:13px;}
    .quiz-opt-correct{border-color:var(--green)!important;color:var(--green)!important;background:rgba(0,255,65,0.07)!important;}
    .quiz-opt-wrong{border-color:var(--red)!important;color:var(--red)!important;background:rgba(255,0,40,0.07)!important;}
    .quiz-feedback{font-size:11px;color:var(--text-mid);line-height:1.8;margin-top:12px;padding:10px 14px;background:rgba(0,0,0,0.3);border-left:2px solid var(--border);}
    .quiz-q-wrap{animation:fadeUp 0.3s ease both;}

    /* ── Nav ── */
    .nav-btns{display:flex;gap:10px;margin-top:20px;justify-content:space-between;}
    .btn{font-family:'Share Tech Mono',monospace;font-size:12px;padding:9px 18px;border:1px solid var(--green);background:transparent;color:var(--green);cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;}
    .btn::before{content:'';position:absolute;inset:0;background:var(--green);transform:translateX(-100%);transition:transform 0.2s;z-index:-1;}
    .btn:hover::before{transform:translateX(0);}.btn:hover{color:var(--bg);}
    .btn:disabled{opacity:0.3;cursor:not-allowed;}
    .btn.btn-ghost{border-color:var(--border);color:var(--text-dim);}
    .btn.btn-ghost::before{background:var(--border);}
    .btn.btn-ghost:hover{color:var(--text-mid);}

    /* ── Mobile ── */
    @media (max-width:768px) {
      #briefingModal{padding:0!important;align-items:flex-end!important;}
      .bm-box{width:100%!important;max-width:100%!important;max-height:92vh!important;overflow-y:auto!important;border-radius:0!important;border-left:none!important;border-right:none!important;border-bottom:none!important;border-top:2px solid var(--green)!important;animation:slideUpSheet 0.35s ease both!important;}
      @keyframes slideUpSheet{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
      .bm-meta{grid-template-columns:repeat(2,1fr)!important;}
      .bm-footer{flex-direction:column!important;gap:8px!important;padding:14px!important;}
      .bm-cancel,.bm-start{width:100%!important;text-align:center!important;padding:13px!important;}
      .ord-item{padding:8px 10px!important;}
      .ord-label{font-size:10px!important;}
      .ord-code{font-size:9px!important;}
      .tm-grid{grid-template-columns:1fr 40px 1fr!important;}
      .tm-card{font-size:10px!important;padding:6px 8px!important;}
      .cr-code{font-size:10px!important;}
      .dt-code{font-size:10px!important;}
      .dt-status{width:80px!important;font-size:9px!important;}
      .nav-btns{flex-direction:column!important;gap:8px!important;}
      .nav-btns .btn{width:100%!important;text-align:center!important;min-height:42px!important;}
    }
    @media (max-width:380px) {
      .tm-grid{grid-template-columns:1fr 30px 1fr!important;}
      .tm-card{font-size:9px!important;padding:5px 6px!important;}
    }
  `;
  document.head.appendChild(style);
})();

/* ─── BRIEFING STYLES ────────────────────────────────────── */
function _injectBriefingStyles() {
  if (document.getElementById('briefingModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'briefingModalStyles';
  style.textContent = `
    @keyframes bmEntry{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    #briefingModal{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;z-index:9999!important;display:flex!important;align-items:center;justify-content:center;padding:40px 24px;overflow-y:auto;}
    .bm-backdrop{position:fixed;inset:0;background:rgba(2,11,4,0.85);z-index:0;}
    .bm-box{position:relative;z-index:1;border:1px solid var(--green);background:rgba(2,8,4,0.98);animation:bmEntry 0.35s ease both;width:min(520px,100%);margin:0 auto 40px;}
    .bm-scanline{position:absolute;left:0;right:0;height:1px;pointer-events:none;z-index:5;background:linear-gradient(90deg,transparent,var(--green),transparent);animation:scanline 4s linear infinite;}
    .bm-header{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border);background:rgba(0,20,6,0.8);}
    .bm-num{font-family:'VT323',monospace;font-size:48px;line-height:1;color:var(--green);text-shadow:0 0 15px var(--green-glow);opacity:0.5;}
    .bm-vector{font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:3px;}
    .bm-title{font-family:'VT323',monospace;font-size:26px;letter-spacing:1px;text-shadow:0 0 10px var(--green-glow);}
    .bm-close{margin-left:auto;font-family:'Share Tech Mono',monospace;font-size:12px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;padding:4px 10px;transition:all 0.2s;}
    .bm-close:hover{border-color:var(--red);color:var(--red);}
    .bm-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;border-bottom:1px solid var(--border);background:var(--border);}
    .bm-meta-item{display:flex;flex-direction:column;padding:10px 14px;background:rgba(0,10,3,0.9);}
    .bm-meta-label{font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:3px;}
    .bm-meta-val{font-family:'VT323',monospace;font-size:18px;color:var(--text-mid);}
    .bm-section{padding:12px 20px;border-bottom:1px solid var(--border);}
    .bm-section-title{font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px;}
    .bm-section-title.bm-danger{color:rgba(255,60,60,0.5);}
    .bm-text{font-size:12px;color:var(--text-mid);line-height:1.7;}
    .bm-danger-text{color:rgba(255,60,60,0.65);}
    .bm-footer{display:flex;gap:10px;padding:14px 20px;background:rgba(0,10,3,0.8);justify-content:flex-end;}
    .bm-cancel{font-family:'Share Tech Mono',monospace;font-size:12px;padding:8px 16px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all 0.2s;}
    .bm-cancel:hover{border-color:var(--border-bright);color:var(--text-mid);}
    .bm-start{font-family:'Share Tech Mono',monospace;font-size:12px;padding:8px 20px;border:1px solid var(--green);background:transparent;color:var(--green);cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;}
    .bm-start::before{content:'';position:absolute;inset:0;background:var(--green);transform:translateX(-100%);transition:transform 0.2s;z-index:-1;}
    .bm-start:hover::before{transform:translateX(0);}.bm-start:hover{color:var(--bg);}
  `;
  document.head.appendChild(style);
}