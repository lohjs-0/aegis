/* ═══════════════════════════════════════════════════════════
   ÆGIS DEATH SYSTEM
   - checkAegisDeath(): dispara animação quando HP chega a 0
   - triggerAegisDeath(): morte do ÆGIS-BOT + Loki celebra
   - reviveAegis(): revive o ÆGIS após tela de morte
   - Sistema de Recarga de Integridade (heal passivo/ativo)
═══════════════════════════════════════════════════════════ */

/* ── CSS de morte (injetado uma vez) ────────────────────── */
(function injectDeathStyles() {
  if (document.getElementById('aegisDeathStyles')) return;
  const s = document.createElement('style');
  s.id = 'aegisDeathStyles';
  s.textContent = `
    /* ── Overlay de morte do ÆGIS ── */
    #aegisDeathOverlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0); pointer-events: none;
      display: none; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: 'VT323', monospace;
    }
    #aegisDeathOverlay.active {
      display: flex; pointer-events: all;
      animation: deathFadeIn 0.8s ease forwards;
    }
    @keyframes deathFadeIn {
      from { background: rgba(0,0,0,0); }
      to   { background: rgba(2,0,0,0.96); }
    }

    /* ── ÆGIS "morto" — avatar caindo ── */
    #aegisDeadBot {
      font-size: 72px; line-height: 1;
      color: var(--red, #ff1a3c);
      text-shadow: 0 0 30px rgba(255,0,40,0.6), 0 0 60px rgba(255,0,40,0.3);
      animation: aegisFall 1.2s cubic-bezier(0.36,0.07,0.19,0.97) 0.3s both;
    }
    @keyframes aegisFall {
      0%   { opacity:1; transform: rotate(0deg) scale(1); }
      30%  { transform: rotate(-15deg) scale(1.1); }
      60%  { transform: rotate(25deg) scale(0.9); }
      80%  { transform: rotate(-8deg) scale(0.85); }
      100% { opacity:0.5; transform: rotate(15deg) scale(0.7) translateY(20px); }
    }

    #aegisDeadTitle {
      font-size: 52px; letter-spacing: 6px;
      color: var(--red, #ff1a3c);
      text-shadow: 0 0 20px rgba(255,0,40,0.8);
      margin: 16px 0 8px;
      animation: deathFlicker 0.15s steps(1) infinite;
    }
    @keyframes deathFlicker {
      0%,100%{opacity:1;} 50%{opacity:0.7;}
    }

    #aegisDeadSub {
      font-size: 16px; letter-spacing: 3px;
      color: rgba(255,50,50,0.6);
      margin-bottom: 32px;
    }

    /* ── Loki celebrando ── */
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
      font-size: 48px;
      color: rgba(160,80,255,0.9);
      text-shadow: 0 0 20px rgba(140,60,255,0.6);
      animation: lokiPulse 0.8s ease-in-out infinite alternate;
    }
    @keyframes lokiPulse {
      from { transform: scale(1) rotate(-3deg); }
      to   { transform: scale(1.1) rotate(3deg); }
    }
    #lokiCelebText {
      font-size: 14px; letter-spacing: 2px;
      color: rgba(160,80,255,0.8); text-align: center;
      max-width: 380px; line-height: 1.7;
    }

    /* ── Stats de morte ── */
    #aegisDeathStats {
      display: flex; gap: 24px; margin-bottom: 32px;
      animation: deathFadeIn 0.6s ease 2s both;
      border: 1px solid rgba(255,0,40,0.2);
      padding: 12px 24px;
    }
    .death-stat { text-align: center; }
    .death-stat-val { font-size: 32px; color: var(--red, #ff1a3c); }
    .death-stat-label { font-size: 10px; color: rgba(255,100,100,0.5); letter-spacing: 1px; margin-top: 2px; }

    /* ── Botão de reviver ── */
    #aegisReviveBtn {
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px; letter-spacing: 2px;
      padding: 12px 32px;
      border: 1px solid var(--red, #ff1a3c);
      background: transparent;
      color: var(--red, #ff1a3c);
      cursor: pointer;
      position: relative; overflow: hidden;
      animation: deathFadeIn 0.6s ease 2.5s both;
      transition: all 0.3s;
    }
    #aegisReviveBtn:hover {
      background: rgba(255,0,40,0.1);
      box-shadow: 0 0 20px rgba(255,0,40,0.3);
    }
    #aegisReviveBtn::before {
      content: '';
      position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,0,40,0.15), transparent);
      animation: reviveScan 2s linear infinite;
    }
    @keyframes reviveScan {
      to { left: 100%; }
    }

    /* ── Scanlines na tela de morte ── */
    #aegisDeathScanlines {
      position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(255,0,30,0.03) 2px, rgba(255,0,30,0.03) 4px
      );
      animation: scanMove 0.2s linear infinite;
    }

    /* ── Contador de recarga de integridade ── */
    #aegisHealNotif {
      position: fixed; bottom: 70px; right: 20px;
      z-index: 8900; font-family: 'VT323', monospace;
      font-size: 18px; color: var(--green, #00ff41);
      background: rgba(2,8,4,0.95);
      border: 1px solid rgba(0,255,65,0.3);
      padding: 6px 14px;
      opacity: 0; pointer-events: none;
      transform: translateY(8px);
      transition: opacity 0.3s, transform 0.3s;
    }
    #aegisHealNotif.show {
      opacity: 1; transform: translateY(0);
    }

    /* ── Botão de Recarga Manual (para uso no HUD) ── */
    #aegisRechargeBtn {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px; letter-spacing: 1px;
      padding: 5px 12px;
      border: 1px solid rgba(0,255,65,0.25);
      background: transparent; color: rgba(0,255,65,0.6);
      cursor: pointer; transition: all 0.2s;
      margin-top: 8px; width: 100%;
    }
    #aegisRechargeBtn:hover:not(:disabled) {
      border-color: var(--green); color: var(--green);
      box-shadow: 0 0 8px rgba(0,255,65,0.15);
    }
    #aegisRechargeBtn:disabled {
      opacity: 0.3; cursor: not-allowed;
    }
    #aegisRechargeCooldown {
      font-size: 9px; color: rgba(0,255,65,0.4);
      display: block; margin-top: 3px; text-align: right;
    }

    /* ── HP bar pisca quando baixo ── */
    @keyframes hpCritical {
      0%,100%{ box-shadow: 0 0 6px var(--red-glow); }
      50%    { box-shadow: 0 0 16px var(--red-glow), 0 0 30px rgba(255,0,40,0.4); }
    }
    .hp-critical { animation: hpCritical 0.8s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
})();

/* ── checkAegisDeath: chamada após cada dano ────────────── */
function checkAegisDeath() {
  const hp = window.STATE?.aegisHp ?? 100;
  if (hp <= 0) {
    /* Pequeno delay para o HUD atualizar antes da animação */
    setTimeout(triggerAegisDeath, 400);
  } else if (hp <= 30) {
    /* Estado crítico — HP bar pisca */
    const bar = document.getElementById('aegisHpBar');
    if (bar) bar.classList.add('hp-critical');
  }
}

/* ── Loki celebra — frases aleatórias ──────────────────── */
const LOKI_VICTORY_LINES = [
  'O ÆGIS caiu. Como esperado.\nVocê não era páreo para mim, Guardião.',
  'Integridade: ZERO.\nSeu sistema pertence a mim agora.',
  'Cada erro foi uma porta.\nEu as abri todas. O ÆGIS não sobreviveu.',
  'Aprenda com a derrota.\nQuando você renascer — estarei esperando.',
  'Isso não é o fim.\nÉ só o começo do que posso fazer com acesso total.',
];

/* ── triggerAegisDeath: animação completa ───────────────── */
function triggerAegisDeath() {
  const S = window.STATE;

  /* Para ataques do Loki */
  if (typeof stopLokiAttacks === 'function') stopLokiAttacks();
  if (S.lokiTimeout) { clearTimeout(S.lokiTimeout); S.lokiTimeout = null; }

  /* Fecha modal se estiver aberto */
  if (S.modalActive) {
    S.modalActive = false;
    const lokiModal = document.getElementById('lokiModal');
    const backdrop  = document.getElementById('lmBackdrop');
    if (lokiModal) { lokiModal.classList.remove('active'); lokiModal.style.display = 'none'; }
    if (backdrop)  backdrop.classList.remove('show');
    clearInterval(S.timerInterval);
  }

  /* Overlay de morte */
  let overlay = document.getElementById('aegisDeathOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'aegisDeathOverlay';

    const victoryLine = LOKI_VICTORY_LINES[Math.floor(Math.random() * LOKI_VICTORY_LINES.length)];
    const linesBr = victoryLine.replace('\n', '<br>');

    overlay.innerHTML = `
      <div id="aegisDeathScanlines"></div>
      <div id="aegisDeadBot">✕</div>
      <div id="aegisDeadTitle">ÆGIS DESTRUÍDO</div>
      <div id="aegisDeadSub">// integridade: 0% — sistema comprometido</div>
      <div id="lokiCelebrate">
        <div id="lokiCelebIcon">☽</div>
        <div id="lokiCelebText">${linesBr}</div>
      </div>
      <div id="aegisDeathStats">
        <div class="death-stat">
          <div class="death-stat-val">${S.blocks || 0}</div>
          <div class="death-stat-label">bloqueios</div>
        </div>
        <div class="death-stat">
          <div class="death-stat-val">${S.fails || 0}</div>
          <div class="death-stat-label">falhas</div>
        </div>
        <div class="death-stat">
          <div class="death-stat-val">${S.score || 0}</div>
          <div class="death-stat-label">XP acumulado</div>
        </div>
      </div>
      <button id="aegisReviveBtn" onclick="reviveAegis()">
        [ ⟳ REANIMAR O ÆGIS ]
      </button>`;

    document.body.appendChild(overlay);
  } else {
    /* Atualiza stats se overlay já existia */
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

  /* Bot panel — ÆGIS "morto" */
  const botAvatar = document.getElementById('botAvatar');
  const botPill   = document.getElementById('botPill');
  const botName   = document.getElementById('botName');
  const botSub    = document.getElementById('botSub');
  if (botAvatar) { botAvatar.textContent = '✕'; botAvatar.classList.add('damaged'); botAvatar.style.color = 'var(--red)'; }
  if (botPill)   { botPill.className = 'bot-status-pill danger'; botPill.innerHTML = '<span class="sdot r" style="margin-right:4px;"></span>DESTRUÍDO'; }
  if (botName)   { botName.style.color = 'var(--red)'; botName.textContent = '// SISTEMA OFFLINE'; }
  if (botSub)    botSub.textContent = '// integridade zero — aguardando reanimação';

  if (typeof appendMsg === 'function') {
    appendMsg(`<span style="color:var(--red)">⚠ ÆGIS DESTRUÍDO.</span> O Loki's Shadows assumiu controle total. Reanime o sistema para continuar.`, 'loki', 'loki-msg');
  }

  console.log('[aegis] sistema destruído — loki venceu esta rodada');
}

/* ── reviveAegis: restaura HP e retoma batalha ──────────── */
function reviveAegis() {
  const S = window.STATE;

  /* Restaura HP para 40% */
  S.aegisHp = 40;
  updateHUD();

  /* Remove overlay */
  const overlay = document.getElementById('aegisDeathOverlay');
  if (overlay) overlay.classList.remove('active');

  /* Remove classe crítica da HP bar */
  const bar = document.getElementById('aegisHpBar');
  if (bar) bar.classList.remove('hp-critical');

  /* Restaura bot */
  const botAvatar = document.getElementById('botAvatar');
  const botPill   = document.getElementById('botPill');
  const botName   = document.getElementById('botName');
  const botSub    = document.getElementById('botSub');
  if (botAvatar) { botAvatar.textContent = '◈'; botAvatar.classList.remove('damaged'); botAvatar.style.color = ''; }
  if (botPill)   { botPill.className = 'bot-status-pill'; botPill.innerHTML = '<span class="sdot g"></span>ativo'; }
  if (botName)   { botName.style.color = 'var(--yellow)'; botName.textContent = 'ÆGIS-BOT'; }
  if (botSub)    botSub.textContent = '// reanimado — 40% integridade';

  if (typeof appendMsg === 'function') {
    appendMsg(`<span style="color:var(--yellow)">⟳ Sistema reanimado.</span> ÆGIS online com 40% de integridade. <span class="hl">Não cometa os mesmos erros.</span>`, 'bot');
  }

  /* Retoma ataques se missão ativa */
  if (typeof lokiCanAttack === 'function' && lokiCanAttack()) {
    if (typeof startLokiAttacks === 'function') startLokiAttacks();
  }

  /* Reativa cooldown de recarga */
  updateRechargeBtn();

  console.log('[aegis] sistema reanimado — hp: 40%');
}

/* ═══════════════════════════════════════════════════════════
   SISTEMA DE RECARGA DE INTEGRIDADE
   - Passivo: +2% a cada 30s (apenas durante missão ativa)
   - Flashcard: +3% ao virar card
   - Quiz correto: +2% por resposta certa
   - Botão manual: +10% com cooldown de 60s
   - Completar missão: +15%
═══════════════════════════════════════════════════════════ */

/* Heal passivo — roda a cada 30s quando missão ativa */
(function startPassiveHeal() {
  setInterval(() => {
    const S = window.STATE;
    if (!S || S.aegisHp <= 0) return;

    /* Só regenera se há missão ativa e hp não está full */
    const missionActive = (typeof MISSION_STATE !== 'undefined') && MISSION_STATE.activeMissionId != null;
    if (!missionActive) return;
    if (S.aegisHp >= 100) return;

    S.aegisHp = Math.min(100, (S.aegisHp || 0) + 2);
    updateHUD();

    /* Remove classe crítica se saiu do danger zone */
    if (S.aegisHp > 30) {
      const bar = document.getElementById('aegisHpBar');
      if (bar) bar.classList.remove('hp-critical');
    }

    showHealNotif('+2% integridade // regeneração passiva');
  }, 30_000);
})();

/* Notificação de cura */
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

/* Heal ao virar flashcard */
const _origFlipCard = window.flipCard;
window.flipCard = function() {
  if (typeof _origFlipCard === 'function') _origFlipCard();
  const S = window.STATE;
  if (!S || S.fcFlipped) return; /* só ao abrir, não ao fechar */
  if (S.aegisHp <= 0 || S.aegisHp >= 100) return;
  S.aegisHp = Math.min(100, (S.aegisHp || 0) + 3);
  updateHUD();
  showHealNotif('+3% integridade // flashcard estudado');
};

/* Estado do cooldown do botão */
let _rechargeCooldownEnd = 0;
let _rechargeCooldownInterval = null;

/* Injetar botão de recarga na sidebar */
(function injectRechargeBtn() {
  function tryInject() {
    /* Encontra o container dos stats no sidebar-bottom */
    const hpText = document.getElementById('hpText');
    if (!hpText) { setTimeout(tryInject, 500); return; }

    /* Evita duplicata */
    if (document.getElementById('aegisRechargeBtn')) return;

    const container = hpText.parentElement;
    const btn = document.createElement('button');
    btn.id = 'aegisRechargeBtn';
    btn.innerHTML = '⟳ recarga de emergência';
    btn.onclick = activateEmergencyRecharge;

    const coolEl = document.createElement('span');
    coolEl.id = 'aegisRechargeCooldown';
    coolEl.textContent = 'pronto';

    container.appendChild(btn);
    container.appendChild(coolEl);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    setTimeout(tryInject, 1000);
  }
})();

function activateEmergencyRecharge() {
  if (Date.now() < _rechargeCooldownEnd) return;

  const S = window.STATE;
  S.aegisHp = Math.min(100, (S.aegisHp || 0) + 10);
  updateHUD();
  showHealNotif('+10% integridade // recarga de emergência');

  /* Remove crítico se necessário */
  if (S.aegisHp > 30) {
    const bar = document.getElementById('aegisHpBar');
    if (bar) bar.classList.remove('hp-critical');
  }

  /* Cooldown de 60s */
  _rechargeCooldownEnd = Date.now() + 60_000;
  updateRechargeBtn();

  if (_rechargeCooldownInterval) clearInterval(_rechargeCooldownInterval);
  _rechargeCooldownInterval = setInterval(updateRechargeBtn, 1000);
}

function updateRechargeBtn() {
  const btn   = document.getElementById('aegisRechargeBtn');
  const label = document.getElementById('aegisRechargeCooldown');
  if (!btn) return;

  const remaining = Math.max(0, Math.ceil((_rechargeCooldownEnd - Date.now()) / 1000));
  if (remaining > 0) {
    btn.disabled = true;
    if (label) label.textContent = `// cooldown: ${remaining}s`;
  } else {
    btn.disabled = false;
    if (label) label.textContent = '// pronto';
    if (_rechargeCooldownInterval) {
      clearInterval(_rechargeCooldownInterval);
      _rechargeCooldownInterval = null;
    }
  }
}

/* Patch no _grantXP para verificar morte sempre que HP muda */
const _origGrantXP = window._grantXP;
window._grantXP = function(opts) {
  _origGrantXP(opts);
  if (opts.hp && opts.hp < 0) {
    checkAegisDeath();
  }
};

/* Patch em onMissionCompleted para dar +15% HP */
const _origOnMissionCompleted = window.onMissionCompleted;
window.onMissionCompleted = function(missionId, xpReward) {
  if (typeof _origOnMissionCompleted === 'function') _origOnMissionCompleted(missionId, xpReward);
  const S = window.STATE;
  if (S && S.aegisHp < 100) {
    S.aegisHp = Math.min(100, (S.aegisHp || 0) + 15);
    updateHUD();
    showHealNotif('+15% integridade // missão concluída!');
  }
};