(function() {
  'use strict';

  /* ─── META de cada missão ─────────────────────────────── */
  var SKILL_META = [
    { id: 1, name: 'Command Injection', icon: '⊞', vector: 'command-injection', xp: 200  },
    { id: 2, name: 'IDOR',              icon: '◈', vector: 'idor',              xp: 300  },
    { id: 3, name: 'Broken Auth',       icon: '✦', vector: 'broken-auth',       xp: 400  },
    { id: 4, name: 'SSRF',              icon: '◈', vector: 'ssrf',              xp: 500  },
    { id: 5, name: 'Supply Chain',      icon: '⊞', vector: 'supply-chain',      xp: 600  },
    { id: 6, name: 'Priv. Escalation',  icon: '☽', vector: 'privilege-esc',     xp: 1000 },
  ];

  var RUNA_META = [
    { id: 1, icon: '⊞', label: 'escudo de vidro'    },
    { id: 2, icon: '◈', label: 'labirinto'           },
    { id: 3, icon: '✦', label: 'chave quebrada'      },
    { id: 4, icon: '◈', label: 'servidor espelho'    },
    { id: 5, icon: '⊞', label: 'cadeia envenenada'   },
    { id: 6, icon: '☽', label: 'olho de loki'        },
  ];

  /* ─── Módulos de estudos ──────────────────────────────── */
  var STUDY_SKILL_META = [
    { id: 'intro',   name: 'Intro à Cyberseg.',  icon: '◈' },
    { id: 'blue',    name: 'Team Blue',           icon: '◈' },
    { id: 'red',     name: 'Team Red',            icon: '◈' },
    { id: 'web',     name: 'Segurança Web',       icon: '◈' },
    { id: 'crypto',  name: 'Criptografia',        icon: '◈' },
    { id: 'social',  name: 'Eng. Social',         icon: '◈' },
    { id: 'osint',   name: 'OSINT',               icon: '◈' },
    { id: 'cloud',   name: 'Segurança Cloud',     icon: '◈' },
    { id: 'forense', name: 'Forense Digital',     icon: '◈' },
    { id: 'purple',  name: 'Team Purple',         icon: '◈' },
  ];

  /* ─── helpers ─────────────────────────────────────────── */
  function getCompleted() {
    return Array.isArray(window.STATE && window.STATE.completedMissions)
      ? window.STATE.completedMissions : [];
  }

  function getStudyCompleted() {
    return (typeof STUDY_STATE !== 'undefined' && Array.isArray(STUDY_STATE.completedModules))
      ? STUDY_STATE.completedModules : [];
  }

  function isUnlocked(missionId) {
    if (missionId === 1) return true;
    return getCompleted().includes(missionId - 1);
  }

  function getMissionProgress(missionId) {
    var S = window.STATE;
    if (getCompleted().includes(missionId)) return 100;
    if (typeof MISSION_STATE !== 'undefined' &&
        MISSION_STATE.activeMissionId === missionId &&
        MISSION_STATE.currentStep) {
      return Math.round(((MISSION_STATE.currentStep - 1) / 4) * 100);
    }
    return 0;
  }

  function getStudyProgress(moduleId) {
    if (getStudyCompleted().includes(moduleId)) return 100;
    if (typeof STUDY_STATE === 'undefined') return 0;
    var mod = (typeof STUDY_MODULES !== 'undefined')
      ? STUDY_MODULES.find(function(m) { return m.id === moduleId; }) : null;
    if (!mod) return 0;
    var read = (STUDY_STATE.sectionsRead && STUDY_STATE.sectionsRead[moduleId])
      ? STUDY_STATE.sectionsRead[moduleId].length : 0;
    return mod.sections.length > 0
      ? Math.round((read / mod.sections.length) * 100) : 0;
  }

  /* ─── SKILL TREE ──────────────────────────────────────── */
  function renderSkillTree() {
    var container = document.getElementById('skillTreeDynamic');
    if (!container) return;

    var completed  = getCompleted();
    var studyDone  = getStudyCompleted();
    var html = '<div class="skill-tree-title">SKILLS DESBLOQUEADAS</div>';

    /* Missões */
    html += '<div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;margin:8px 0 4px;">// MISSÕES</div>';
    SKILL_META.forEach(function(sk) {
      var unlocked  = isUnlocked(sk.id);
      var done      = completed.includes(sk.id);
      var pct       = getMissionProgress(sk.id);
      var opacity   = unlocked ? '1' : '0.35';
      var nameColor = done ? 'var(--green)' : unlocked ? 'var(--text-bright,#e8ffe8)' : 'var(--text-dim)';
      var status    = done ? 'concluída ✓' : !unlocked ? 'bloqueada 🔒' : pct > 0 ? pct + '% concluído' : 'disponível';
      var barColor  = done ? 'var(--green)' : 'var(--yellow)';

      html +=
        '<div class="skill-item" style="opacity:' + opacity + '">' +
          '<div class="skill-icon" style="color:' + (unlocked ? 'var(--green)' : 'var(--text-dim)') + '">' + sk.icon + '</div>' +
          '<div class="skill-info">' +
            '<div class="skill-name" style="color:' + nameColor + '">' +
              (done ? '<span class="unlocked">' + sk.name + '</span>' : sk.name) +
              ' — ' + status +
            '</div>' +
            '<div class="skill-bar">' +
              '<div class="skill-fill' + (!unlocked ? ' locked' : '') + '"' +
                ' style="width:' + (unlocked ? pct : 0) + '%;background:' + barColor + ';transition:width 0.8s ease;">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="skill-pct' + (done ? ' unlocked' : '') + '">' +
            (unlocked ? pct + '%' : '🔒') +
          '</div>' +
        '</div>';
    });

    /* Estudos */
    var studyUnlocked = STUDY_SKILL_META.filter(function(m) {
      if (typeof STUDY_MODULES === 'undefined') return false;
      var mod = STUDY_MODULES.find(function(x) { return x.id === m.id; });
      if (!mod) return false;
      if (!mod.locked) return true;
      return studyDone.includes(mod.unlockAfter);
    });

    if (studyUnlocked.length > 0) {
      html += '<div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;margin:12px 0 4px;">// ESTUDOS</div>';
      studyUnlocked.forEach(function(sk) {
        var done  = studyDone.includes(sk.id);
        var pct   = getStudyProgress(sk.id);
        var status = done ? 'concluído ✓' : pct > 0 ? pct + '% lido' : 'em progresso';

        html +=
          '<div class="skill-item">' +
            '<div class="skill-icon" style="color:var(--green)">' + sk.icon + '</div>' +
            '<div class="skill-info">' +
              '<div class="skill-name" style="color:' + (done ? 'var(--green)' : 'var(--text-bright,#e8ffe8)') + '">' +
                (done ? '<span class="unlocked">' + sk.name + '</span>' : sk.name) +
                ' — ' + status +
              '</div>' +
              '<div class="skill-bar">' +
                '<div class="skill-fill"' +
                  ' style="width:' + pct + '%;background:' + (done ? 'var(--green)' : 'var(--yellow)') + ';transition:width 0.8s ease;">' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="skill-pct' + (done ? ' unlocked' : '') + '">' + pct + '%</div>' +
          '</div>';
      });
    }

    container.innerHTML = html;
  }

  /* ─── RUNAS ───────────────────────────────────────────── */
  function renderRunas() {
    var wrap = document.getElementById('runasDynamic');
    if (!wrap) return;

    var completed = getCompleted();
    var html = '';

    RUNA_META.forEach(function(r) {
      var done    = completed.includes(r.id);
      var border  = done ? '1px solid var(--green)' : '1px dashed var(--border)';
      var opacity = done ? '1' : (r.id === 1 ? '0.4' : r.id <= 3 ? '0.3' : '0.2');
      var iconColor = done ? 'var(--green)' : 'var(--text-dim)';
      var glow    = done ? 'text-shadow:0 0 10px var(--green-glow);' : '';

      html +=
        '<div style="border:' + border + ';padding:10px 14px;text-align:center;min-width:80px;' +
              'opacity:' + opacity + ';transition:all 0.4s;' + (done ? 'background:rgba(0,255,65,0.04);' : '') + '">' +
          '<div style="font-size:22px;margin-bottom:4px;color:' + iconColor + ';' + glow + '">' + r.icon + '</div>' +
          '<div style="font-size:9px;color:' + (done ? 'var(--green)' : 'var(--text-dim)') + ';">' + r.label + '</div>' +
          (done ? '<div style="font-size:8px;color:var(--green);margin-top:3px;letter-spacing:1px;">✓ desbloqueada</div>' : '') +
        '</div>';
    });

    wrap.innerHTML = html;
  }

  /* ─── HISTÓRICO DE BATALHAS ───────────────────────────── */
  function renderBattleHistory() {
    var timeline = document.getElementById('battleHistoryDynamic');
    if (!timeline) return;

    /* Pega eventos da activity-feed */
    var events = [];
    try {
      var uid = window._supabaseSession?.user?.id || 'anon';
      events = JSON.parse(localStorage.getItem('aegis_activity:' + uid) || '[]');
    } catch(e) {}

    /* Se não tem eventos ainda, mostra o mínimo */
    if (events.length === 0) {
      timeline.innerHTML =
        '<div class="tl-item">' +
          '<div class="tl-date">hoje — início</div>' +
          '<div class="tl-text">Guardião ativado. <span class="hl">ÆGIS</span> online.</div>' +
        '</div>';
      return;
    }

    /* Formata timestamp */
    function fmtDate(ts) {
      var d    = new Date(ts);
      var now  = new Date();
      var diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60)   return 'agora';
      if (diff < 3600) return Math.floor(diff / 60) + 'min atrás';
      var h = Math.floor(diff / 3600);
      if (h < 24)      return h + 'h atrás';
      if (Math.floor(h/24) === 1) return 'ontem';
      return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    }

    var isLokiType = {
      loki_fail: true, loki_timeout: true,
      study_loki_fail: true, aegis_died: true
    };

    /* Últimos 12 eventos */
    var shown = events.slice(0, 12);
    var html  = '';

    shown.forEach(function(ev) {
      var isLoki = isLokiType[ev.type] || false;
      html +=
        '<div class="tl-item' + (isLoki ? ' loki-tl' : '') + '">' +
          '<div class="tl-date">' + fmtDate(ev.ts) + '</div>' +
          '<div class="tl-text">' +
            ev.label +
            (ev.detail ? ' <span style="color:var(--text-dim)">— ' + ev.detail + '</span>' : '') +
          '</div>' +
        '</div>';
    });

    timeline.innerHTML = html;
  }

  /* ─── SOBRESCREVE initProgresso ───────────────────────── */
  window.addEventListener('load', function() {
    setTimeout(function() {
      var _orig = window.initProgresso;

      window.initProgresso = function() {
        var S  = window.STATE;
        var ps = document.getElementById('progScore');
        var pb = document.getElementById('progBlocks');
        var pm = document.getElementById('progMissions');
        if (ps) ps.textContent = S.score;
        if (pb) pb.textContent = S.blocks;
        if (pm) pm.textContent = Array.isArray(S.completedMissions) ? S.completedMissions.length : 0;

        setTimeout(function() {
          renderSkillTree();
          renderRunas();
          renderBattleHistory();
        }, 150);
      };

    }, 900);
  });

  /* ─── Expõe para uso externo ──────────────────────────── */
  window._renderProgresso = function() {
    renderSkillTree();
    renderRunas();
    renderBattleHistory();
  };

  /* ─── Re-renderiza quando a seção progresso fica ativa ── */
  var _navOrig;
  window.addEventListener('load', function() {
    setTimeout(function() {
      var _nav = window.navigate;
      if (typeof _nav === 'function' && !_nav._progressoPatched) {
        window.navigate = function(section) {
          var r = _nav.apply(this, arguments);
          if (section === 'progresso') {
            setTimeout(function() {
              renderSkillTree();
              renderRunas();
              renderBattleHistory();
            }, 200);
          }
          return r;
        };
        window.navigate._progressoPatched = true;
      }
    }, 1500);
  });

})();