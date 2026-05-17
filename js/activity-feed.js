/* ═══════════════════════════════════════════════════════════
   activity-feed.js — ÆGIS Platform
   Sistema de atividades recentes em tempo real.
   Registra eventos reais e renderiza no #view-home.
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  /* ─── STORAGE KEY ──────────────────────────────────────── */
  function _actKey() {
    var uid = window._supabaseSession?.user?.id || 'anon';
    return 'aegis_activity:' + uid;
  }

  /* ─── CONSTANTES ──────────────────────────────────────── */
  var MAX_EVENTS = 20; // máximo no storage
  var MAX_RENDER = 8;  // máximo exibido na tela

  var ICONS = {
    mission_start:    { icon: '⊞', color: 'var(--green)' },
    mission_complete: { icon: '✓', color: 'var(--green)' },
    mission_step:     { icon: '◈', color: 'var(--green)' },
    loki_block:       { icon: '⊞', color: 'var(--green)' },
    loki_fail:        { icon: '☽', color: 'var(--red)'   },
    loki_timeout:     { icon: '⏱', color: 'var(--red)'   },
    xp_gain:          { icon: '⚡', color: 'var(--yellow)'},
    study_section:    { icon: '◈', color: 'var(--green)' },
    study_module:     { icon: '✓', color: 'var(--green)' },
    study_loki_block: { icon: '⊞', color: 'var(--green)' },
    study_loki_fail:  { icon: '☽', color: 'var(--red)'   },
    simulado_start:   { icon: '▣', color: 'var(--green)' },
    simulado_done:    { icon: '▣', color: 'var(--yellow)'},
    flashcard:        { icon: '⚡', color: 'var(--green)' },
    account_created:  { icon: '◈', color: 'var(--green)' },
    aegis_revived:    { icon: '⟳', color: 'var(--yellow)'},
    aegis_died:       { icon: '✕', color: 'var(--red)'   },
  };

  /* ─── LOAD / SAVE ─────────────────────────────────────── */
  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem(_actKey()) || '[]');
    } catch(e) { return []; }
  }

  function saveEvents(events) {
    try {
      localStorage.setItem(_actKey(), JSON.stringify(events.slice(0, MAX_EVENTS)));
    } catch(e) {}
  }

  /* ─── REGISTRAR EVENTO ────────────────────────────────── */
  window.aegisActivity = {
    log: function(type, label, detail) {
      var events = loadEvents();
      var now    = Date.now();

      // Deduplicar: não registrar o mesmo tipo+label em menos de 3s
      if (events.length > 0) {
        var last = events[0];
        if (last.type === type && last.label === label && (now - last.ts) < 3000) {
          return;
        }
      }

      events.unshift({
        type:   type,
        label:  label,
        detail: detail || null,
        ts:     now,
      });

      saveEvents(events);
      renderActivityFeed();
    },

    clear: function() {
      saveEvents([]);
      renderActivityFeed();
    },
  };

  /* ─── FORMATAR TEMPO ──────────────────────────────────── */
  function formatTime(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10)   return 'agora';
    if (diff < 60)   return diff + 's atrás';
    if (diff < 3600) return Math.floor(diff / 60) + 'min atrás';
    var h = Math.floor(diff / 3600);
    if (h < 24)      return h + 'h atrás';
    var d = Math.floor(h / 24);
    if (d === 1)     return 'ontem';
    return d + 'd atrás';
  }

  /* ─── RENDER ──────────────────────────────────────────── */
  function renderActivityFeed() {
    var list = document.querySelector('#view-home .activity-list');
    if (!list) return;

    var events = loadEvents().slice(0, MAX_RENDER);

    if (events.length === 0) {
      list.innerHTML =
        '<div class="activity-item" style="opacity:0.4">' +
          '<div class="ai-icon">◈</div>' +
          '<div class="ai-text">Nenhuma atividade ainda — inicie uma missão!</div>' +
          '<div class="ai-time">—</div>' +
        '</div>';
      return;
    }

    list.innerHTML = events.map(function(ev, i) {
      var meta  = ICONS[ev.type] || { icon: '◈', color: 'var(--green)' };
      var delay = (i * 0.08).toFixed(2);
      var isLoki = ev.type === 'loki_fail' || ev.type === 'loki_timeout' ||
                   ev.type === 'study_loki_fail' || ev.type === 'aegis_died';

      return (
        '<div class="activity-item' + (isLoki ? ' loki-act' : '') + '"' +
             ' style="animation-delay:' + delay + 's">' +
          '<div class="ai-icon" style="color:' + meta.color + '">' + meta.icon + '</div>' +
          '<div class="ai-text">' + escapeAct(ev.label) +
            (ev.detail ? ' <span style="color:var(--text-dim)">— ' + escapeAct(ev.detail) + '</span>' : '') +
          '</div>' +
          '<div class="ai-time">' + formatTime(ev.ts) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function escapeAct(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  /* ─── ATUALIZAR TIMESTAMPS A CADA 30s ────────────────── */
  setInterval(function() {
    var list = document.querySelector('#view-home .activity-list');
    if (!list) return;
    // só re-renderiza se a seção home estiver visível
    var homeView = document.getElementById('view-home');
    if (!homeView || !homeView.classList.contains('active')) return;
    renderActivityFeed();
  }, 30000);

  /* ─── INTERCEPTAR EVENTOS DO JOGO ────────────────────── */

  // Espera o DOM e os outros scripts carregarem
  window.addEventListener('load', function() {
    setTimeout(patchGameEvents, 800);
  });

  function patchGameEvents() {
    _patchMissions();
    _patchLoki();
    _patchStudos();
    _patchSimulado();
    _patchFlashcard();
    _patchDeath();
    _seedInitialEvents();
    renderActivityFeed();
  }

  /* ── Missões ── */
  function _patchMissions() {
    // startMission
    var origStart = window.startMission;
    if (typeof origStart === 'function') {
      window.startMission = function(missionId) {
        var m = (typeof MISSIONS_DATA !== 'undefined')
          ? MISSIONS_DATA.find(function(x) { return x.id === missionId; })
          : null;
        var label = m
          ? '<span>Missão ' + String(missionId).padStart(2,'0') + '</span> iniciada'
          : '<span>Missão</span> iniciada';
        var detail = m ? m.title : null;
        window.aegisActivity.log('mission_start', label, detail);
        return origStart.apply(this, arguments);
      };
    }

    // onMissionCompleted (main.js)
    var origComplete = window.onMissionCompleted;
    if (typeof origComplete === 'function') {
      window.onMissionCompleted = function(missionId, xpReward) {
        var m = (typeof MISSIONS_DATA !== 'undefined')
          ? MISSIONS_DATA.find(function(x) { return x.id === missionId; })
          : null;
        var label = '<span>Missão ' + String(missionId).padStart(2,'0') + '</span> concluída';
        var detail = m ? '+' + (xpReward || 200) + ' XP // ' + (m.rune || '') + ' desbloqueada' : null;
        window.aegisActivity.log('mission_complete', label, detail);
        return origComplete.apply(this, arguments);
      };
    }

    // goToStep
    var origGoTo = window.goToStep;
    if (typeof origGoTo === 'function') {
      window.goToStep = function(n, m) {
        var mid = m ? m.id : (typeof MISSION_STATE !== 'undefined' ? MISSION_STATE.activeMissionId : null);
        if (mid && n && n > 1) {
          var mData = m || ((typeof MISSIONS_DATA !== 'undefined')
            ? MISSIONS_DATA.find(function(x) { return x.id === mid; })
            : null);
          var stepTitle = mData && mData.steps && mData.steps[n-1]
            ? mData.steps[n-1].title
            : 'step ' + n;
          window.aegisActivity.log(
            'mission_step',
            '<span>Missão ' + String(mid).padStart(2,'0') + '</span> › ' + stepTitle,
            null
          );
        }
        return origGoTo.apply(this, arguments);
      };
    }
  }

  /* ── Loki ── */
  function _patchLoki() {
    // answerLoki
    var origAnswer = window.answerLoki;
    if (typeof origAnswer === 'function') {
      window.answerLoki = function(i, shuffled) {
        var ch = shuffled && shuffled[i];
        if (ch) {
          if (ch.ok) {
            window.aegisActivity.log(
              'loki_block',
              '<span>Loki</span> bloqueado',
              ch.t ? ch.t.substring(0, 60) : null
            );
          } else {
            window.aegisActivity.log(
              'loki_fail',
              '<span style="color:var(--red)">Defesa falhou</span>',
              'ataque do Loki passou'
            );
          }
        }
        return origAnswer.apply(this, arguments);
      };
    }

    // onTimeout
    var origTimeout = window.onTimeout;
    if (typeof origTimeout === 'function') {
      window.onTimeout = function() {
        window.aegisActivity.log(
          'loki_timeout',
          '<span style="color:var(--red)">Tempo esgotado</span>',
          'ataque do Loki — sem resposta'
        );
        return origTimeout.apply(this, arguments);
      };
    }
  }

  /* ── Estudos ── */
  function _patchStudos() {
    // markSectionRead
    var origMark = window.markSectionRead;
    if (typeof origMark === 'function') {
      window.markSectionRead = function(moduleId, sectionIdx) {
        var mod = (typeof STUDY_MODULES !== 'undefined')
          ? STUDY_MODULES.find(function(m) { return m.id === moduleId; })
          : null;
        if (mod) {
          var section = mod.sections && mod.sections[sectionIdx];
          var sectionTitle = section ? section.title : ('seção ' + (sectionIdx + 1));
          window.aegisActivity.log(
            'study_section',
            '<span>' + _truncate(mod.title, 28) + '</span> lida',
            _truncate(sectionTitle, 45)
          );
        }
        return origMark.apply(this, arguments);
      };
    }

    // onModuleCompleted (estudos.js)
    var origModDone = window.onModuleCompleted;
    if (typeof origModDone === 'function') {
      window.onModuleCompleted = function(moduleId) {
        var mod = (typeof STUDY_MODULES !== 'undefined')
          ? STUDY_MODULES.find(function(m) { return m.id === moduleId; })
          : null;
        window.aegisActivity.log(
          'study_module',
          '<span>' + (mod ? _truncate(mod.title, 30) : 'Módulo') + '</span> concluído',
          '+100 XP'
        );
        return origModDone.apply(this, arguments);
      };
    }

    // handleLokiAnswer (estudos.js)
    var origLokiAns = window.handleLokiAnswer;
    if (typeof origLokiAns === 'function') {
      window.handleLokiAnswer = function(selectedIdx) {
        // Verificar antes de chamar o original
        var q = (typeof STUDY_STATE !== 'undefined' && STUDY_STATE.currentQuestions)
          ? STUDY_STATE.currentQuestions[STUDY_STATE.currentQIdx]
          : null;
        if (q) {
          var correct = selectedIdx === q.correct;
          if (correct) {
            window.aegisActivity.log(
              'study_loki_block',
              '<span>Loki</span> bloqueado nos estudos',
              '+25 XP'
            );
          } else {
            window.aegisActivity.log(
              'study_loki_fail',
              '<span style="color:var(--red)">Falha nos estudos</span>',
              'Loki passou'
            );
          }
        }
        return origLokiAns.apply(this, arguments);
      };
    }
  }

  /* ── Simulado ── */
  function _patchSimulado() {
    var origStart = window.startSimulado;
    if (typeof origStart === 'function') {
      window.startSimulado = function(mode) {
        window.aegisActivity.log(
          'simulado_start',
          '<span>Simulado</span> iniciado',
          'modo: ' + mode
        );
        return origStart.apply(this, arguments);
      };
    }

    var origFinish = window.finishSimulado;
    if (typeof origFinish === 'function') {
      window.finishSimulado = function() {
        var SS = window.SIMULADO_STATE;
        if (SS && SS.total > 0) {
          var pct = Math.round((SS.correct / SS.total) * 100);
          window.aegisActivity.log(
            'simulado_done',
            '<span>Simulado</span> concluído',
            SS.correct + '/' + SS.total + ' corretas (' + pct + '%)'
          );
        }
        return origFinish.apply(this, arguments);
      };
    }
  }

  /* ── Flashcard ── */
  function _patchFlashcard() {
    var origFlip = window.flipCard;
    if (typeof origFlip === 'function') {
      var _lastFlipLog = 0;
      window.flipCard = function() {
        var now = Date.now();
        // Log no máximo uma vez a cada 60s para não spammar
        if (now - _lastFlipLog > 60000) {
          _lastFlipLog = now;
          window.aegisActivity.log(
            'flashcard',
            '<span>Flashcard</span> estudado',
            null
          );
        }
        return origFlip.apply(this, arguments);
      };
    }
  }

  /* ── Morte / Revive ── */
  function _patchDeath() {
    var origDie = window.triggerAegisDeath;
    if (typeof origDie === 'function') {
      window.triggerAegisDeath = function() {
        window.aegisActivity.log(
          'aegis_died',
          '<span style="color:var(--red)">ÆGIS destruído</span>',
          'integridade zerada'
        );
        return origDie.apply(this, arguments);
      };
    }

    var origRevive = window.reviveAegis;
    if (typeof origRevive === 'function') {
      window.reviveAegis = function() {
        window.aegisActivity.log(
          'aegis_revived',
          '<span style="color:var(--yellow)">ÆGIS reanimado</span>',
          '50% integridade'
        );
        return origRevive.apply(this, arguments);
      };
    }
  }

  /* ── Eventos iniciais baseados no STATE real ── */
  function _seedInitialEvents() {
    var existing = loadEvents();
    // Só faz seed se não há eventos ainda
    if (existing.length > 0) {
      renderActivityFeed();
      return;
    }

    var S = window.STATE;
    if (!S) return;

    var events = [];
    var now    = Date.now();

    // Conta criada — sempre o mais antigo
    events.push({
      type: 'account_created',
      label: '<span>Conta</span> criada — Guardião ativado',
      detail: null,
      ts: now - 86400000, // ontem
    });

    // Loki detectado
    events.push({
      type: 'loki_fail',
      label: '<span style="color:var(--red)">Loki</span> detectado — aguardando missão ativa',
      detail: null,
      ts: now - 60000,
    });

    // Missões concluídas
    if (Array.isArray(S.completedMissions)) {
      S.completedMissions.forEach(function(mid, i) {
        var m = (typeof MISSIONS_DATA !== 'undefined')
          ? MISSIONS_DATA.find(function(x) { return x.id === mid; })
          : null;
        events.unshift({
          type: 'mission_complete',
          label: '<span>Missão ' + String(mid).padStart(2,'0') + '</span> concluída',
          detail: m ? m.title : null,
          ts: now - (S.completedMissions.length - i) * 300000,
        });
      });
    }

    // Módulos de estudos concluídos
    if (typeof STUDY_STATE !== 'undefined' && Array.isArray(STUDY_STATE.completedModules)) {
      STUDY_STATE.completedModules.forEach(function(mid, i) {
        var mod = (typeof STUDY_MODULES !== 'undefined')
          ? STUDY_MODULES.find(function(m) { return m.id === mid; })
          : null;
        events.unshift({
          type: 'study_module',
          label: '<span>' + (mod ? _truncate(mod.title, 30) : 'Módulo') + '</span> concluído',
          detail: '+100 XP',
          ts: now - (STUDY_STATE.completedModules.length - i) * 180000,
        });
      });
    }

    // Missão ativa (se houver)
    var activeId = (typeof MISSION_STATE !== 'undefined') ? MISSION_STATE.activeMissionId : null;
    if (activeId) {
      var am = (typeof MISSIONS_DATA !== 'undefined')
        ? MISSIONS_DATA.find(function(x) { return x.id === activeId; })
        : null;
      events.unshift({
        type: 'mission_start',
        label: '<span>Missão ' + String(activeId).padStart(2,'0') + '</span> iniciada',
        detail: am ? am.title : null,
        ts: now - 5000,
      });
    }

    // XP e bloqueios acumulados
    if (S.blocks > 0) {
      events.unshift({
        type: 'loki_block',
        label: '<span>Loki</span> bloqueado × ' + S.blocks,
        detail: S.score + ' XP acumulado',
        ts: now - 3000,
      });
    }

    saveEvents(events.slice(0, MAX_EVENTS));
    renderActivityFeed();
  }

  /* ─── HELPER ──────────────────────────────────────────── */
  function _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  /* ─── EXPOR renderActivityFeed globalmente ────────────── */
  window.renderActivityFeed = renderActivityFeed;

  /* ─── Re-renderiza quando navega para home ──────────────
     Sobrescreve navigate para injetar o refresh               */
  var _origNavigate = window.navigate;
  window.addEventListener('load', function() {
    setTimeout(function() {
      var _nav = window.navigate;
      if (typeof _nav === 'function' && !_nav._activityPatched) {
        window.navigate = function(section) {
          var result = _nav.apply(this, arguments);
          if (section === 'home') {
            setTimeout(renderActivityFeed, 100);
          }
          return result;
        };
        window.navigate._activityPatched = true;
      }
    }, 1200);
  });

})();