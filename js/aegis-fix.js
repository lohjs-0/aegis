/* ═══════════════════════════════════════════════════════════
   aegis-fix.js — patch para missions-ui.js
   Corrige: 1) steps-bar cobrindo conteúdo
            2) lab não aparece (loop infinito no override de renderLab)
   Incluir DEPOIS de missions-ui.js:
   <script src="aegis-fix.js"></script>
═══════════════════════════════════════════════════════════ */

(function applyAegisFix() {

  /* ── 1. FIX CSS: steps-bar não cobre mais o conteúdo ── */
  const style = document.createElement('style');
  style.id = 'aegis-fix-styles';
  style.textContent = `
    /* Remove qualquer sticky/fixed acidental na barra de steps */
    .steps-bar {
      position: static !important;
      overflow-x: auto !important;
      overflow-y: visible !important;
      flex-wrap: nowrap !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .steps-bar::-webkit-scrollbar { display: none !important; }

    /* Garante que a página de missão começa ABAIXO da barra */
    #missionDetailView .steps-bar {
      margin-bottom: 0 !important;
    }
    .mission-page {
      margin-top: 0 !important;
      padding-top: 16px !important;
    }

    /* Lab block sempre visível */
    .lab-block {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    .lab-body {
      display: block !important;
      visibility: visible !important;
    }

    /* step labels sempre visíveis */
    .step-lbl {
      display: inline !important;
    }

    /* step bar não sobrepõe */
    .mission-header + .steps-bar {
      border-top: 1px solid var(--border);
    }
  `;
  document.head.appendChild(style);

  /* ── 2. FIX JS: corrige o override recursivo de renderLab ── */
  /* O problema: no final de missions-ui.js há:
       window.renderLab = function(lab, mId, stepN) {
         if (lab?.type === 'multiChoice') { ... }
         return renderLab(lab, mId, stepN);  // ← chama a si mesmo!
       };
     Isso cria recursão infinita. A solução: desfazer o override
     e reimplementar o registro de mcLabs de forma segura. */

  /* Salvar a função atual (que pode ser o override bugado) */
  const _brokenRenderLab = window.renderLab;

  /* Restaurar ao comportamento correto:
     renderLab é definida como função local em missions-ui.js.
     O override global precisamos reimplementar sem recursão. */
  window.renderLab = function renderLabFixed(lab, mId, stepN) {
    /* Registrar labs multiChoice no registry global */
    if (lab?.type === 'multiChoice') {
      const labId = `lab-${mId}-${stepN}`;
      window._mcLabs = window._mcLabs || {};
      window._mcLabs[labId] = lab;
    }

    /* Gerar o HTML do lab — reimplementado para evitar recursão */
    if (!lab) return '';
    const labId = `lab-${mId}-${stepN}`;

    /* Determinar o body do lab */
    let bodyHtml = '';
    switch (lab.type) {
      case 'terminal':
        bodyHtml = _renderTerminalBodyFix(lab, labId);
        break;
      case 'multiChoice':
        bodyHtml = _renderMCBodyFix(lab, labId, mId, stepN);
        break;
      case 'fillBlank':
        bodyHtml = _renderFillBlankBodyFix(lab, labId, mId, stepN);
        break;
      case 'ordering':
        bodyHtml = _renderOrderingBodyFix(lab, labId);
        break;
      default:
        bodyHtml = '';
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
          ${bodyHtml}
        </div>
      </div>`;
  };

  /* ── Helpers de renderização (cópias das funções internas) ── */

  function _esc(str = '') {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function _renderTerminalBodyFix(lab, labId) {
    const t = lab.terminal || {};
    const prelude = (t.prelude || []).map(l => `<div class="tl-line tl-dim">${_esc(l)}</div>`).join('');
    return `
      <div class="terminal-lab" id="${labId}-terminal">
        <div class="tl-topbar">
          <span class="tl-dot red"></span><span class="tl-dot yellow"></span><span class="tl-dot green"></span>
          <span class="tl-title">${_esc(t.prompt || 'lambda@aegis:~$')}</span>
        </div>
        <div class="tl-output" id="${labId}-output">${prelude}</div>
        <div class="tl-challenges" id="${labId}-challenges"></div>
      </div>`;
  }

  function _renderMCBodyFix(lab, labId, mId, stepN) {
    if (!lab.questions?.length) return '';
    /* Registrar para answerMC */
    window._mcLabs = window._mcLabs || {};
    window._mcLabs[labId] = lab;
    setTimeout(() => {
      if (typeof renderMCQuestion === 'function') renderMCQuestion(lab, labId, 0);
    }, 120);
    return `
      <div class="mc-lab" id="${labId}-mc" data-current="0" data-score="0">
        <div class="mc-progress-bar"><div class="mc-progress-fill" id="${labId}-mc-fill" style="width:0%"></div></div>
        <div id="${labId}-mc-question"></div>
      </div>`;
  }

  function _renderFillBlankBodyFix(lab, labId, mId, stepN) {
    const tmpl = lab.template || '';
    let rendered = tmpl;
    (lab.blanks || []).forEach(b => {
      rendered = rendered.replace(
        `___${b.id}___`,
        `<span class="fb-blank-wrap"><input type="text" class="fb-input" id="${labId}-${b.id}" placeholder="${_esc(b.label)}" spellcheck="false"><label class="fb-label">${_esc(b.label)}</label></span>`
      );
    });
    return `
      <div class="fillblank-lab">
        <div class="fb-template code-block">${rendered}</div>
        <button class="btn fb-check-btn" onclick="checkFillBlank('${labId}', '${mId}', ${stepN})">[ verificar respostas ]</button>
        <div class="fb-results" id="${labId}-fb-results"></div>
      </div>`;
  }

  function _renderOrderingBodyFix(lab, labId) {
    const shuffled = [...(lab.items || [])].sort(() => Math.random() - 0.5);
    return `
      <div class="ord-instructions">${_esc(lab.instructions || 'Arraste as linhas na ordem correta:')}</div>
      <div class="ord-container" id="${labId}-ordering">
        ${shuffled.map(item => `
          <div class="ord-item" draggable="true" data-id="${item.id}">
            <span class="ord-handle">⠿</span>
            <span class="ord-label">${_esc(item.label)}</span>
            <code class="ord-code">${_esc(item.code)}</code>
          </div>`).join('')}
      </div>
      <button class="btn ord-check-btn" id="${labId}-ord-check">[ verificar ordem ]</button>
      <div class="mc-feedback" id="${labId}-ord-result" style="display:none;margin-top:10px;"></div>`;
  }

  /* ── 3. Garantir que initTerminalLab é chamado após render ── */
  /* Intercepta renderStepContent para chamar initTerminalLab
     e initOrderingLab nos labs corretos após o DOM ser montado */
  const _origGoToStep = window.goToStep;
  if (typeof _origGoToStep === 'function') {
    window.goToStep = function(n, m) {
      _origGoToStep(n, m);
      /* Após render, inicializar labs interativos */
      if (!m) m = (typeof MISSIONS_DATA !== 'undefined')
        ? MISSIONS_DATA.find(x => x.id === (window.MISSION_STATE?.activeMissionId || 1))
        : null;
      if (!m) return;
      const step = m.steps[n - 1];
      if (!step?.lab) return;
      const labId = `lab-${m.id}-${n}`;
      requestAnimationFrame(() => {
        if (step.lab.type === 'terminal' && typeof initTerminalLab === 'function') {
          /* Evitar dupla inicialização */
          if (!document.getElementById(`${labId}-challenges`)?._initialized) {
            initTerminalLab(step.lab, m.id, n);
            const ch = document.getElementById(`${labId}-challenges`);
            if (ch) ch._initialized = true;
          }
        }
        if (step.lab.type === 'ordering' && typeof initOrderingLab === 'function') {
          initOrderingLab(step.lab, m.id, n);
        }
        if (step.lab.type === 'multiChoice') {
          window._mcLabs = window._mcLabs || {};
          window._mcLabs[labId] = step.lab;
          if (typeof renderMCQuestion === 'function') {
            setTimeout(() => renderMCQuestion(step.lab, labId, 0), 150);
          }
        }
      });
    };
  }

  console.log('[aegis-fix] patch aplicado: steps-bar + lab render corrigidos.');
})();