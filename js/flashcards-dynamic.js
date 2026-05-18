

(function() {
  'use strict';

  /* ─── META dos decks (1 por missão) ──────────────────── */
  var DECK_META = [
    { missionId: 1, num: '01', name: 'Command Injection', deck: 'missão-01', tag: 'command-injection' },
    { missionId: 2, num: '02', name: 'IDOR',              deck: 'missão-02', tag: 'idor'              },
    { missionId: 3, num: '03', name: 'Broken Auth',       deck: 'missão-03', tag: 'broken-auth'       },
    { missionId: 4, num: '04', name: 'SSRF',              deck: 'missão-04', tag: 'ssrf'              },
    { missionId: 5, num: '05', name: 'Supply Chain',      deck: 'missão-05', tag: 'supply-chain'      },
    { missionId: 6, num: '06', name: 'Priv. Escalation',  deck: 'missão-06', tag: 'privilege-esc'     },
  ];

  /* ─── helpers ─────────────────────────────────────────── */
  function getCompleted() {
    return (window.STATE && Array.isArray(window.STATE.completedMissions))
      ? window.STATE.completedMissions : [];
  }

  function isDeckUnlocked(missionId) {
    // deck 1 sempre disponível; demais precisam que a missão anterior esteja concluída
    if (missionId === 1) return true;
    return getCompleted().includes(missionId - 1);
  }

  function isDeckCompleted(missionId) {
    return getCompleted().includes(missionId);
  }

  function countUnlockedDecks() {
    return DECK_META.filter(function(d) { return isDeckUnlocked(d.missionId); }).length;
  }

  function countCards() {
    if (typeof getFlashcards === 'function') return getFlashcards().length;
    return 9;
  }

  /* ─── Atualiza badge na nav ───────────────────────────── */
  function updateNavBadge() {
    var badges = document.querySelectorAll('[data-section="flashcards"] .nav-badge, .nav-item[data-section="flashcards"] .nav-badge');
    var count  = countUnlockedDecks();
    badges.forEach(function(b) { b.textContent = count; });
  }

  /* ─── Atualiza deck info bar ──────────────────────────── */
  function updateDeckInfoBar() {
    var bar = document.querySelector('.fc-deck-info');
    if (!bar) return;
    var total = countCards();
    bar.innerHTML =
      '<div>deck ativo: <span>Command Injection</span></div>' +
      '<div>status: <span>em estudo</span></div>' +
      '<div>total de cards: <span>' + total + '</span></div>' +
      '<div>XP por conclusão: <span>+30 XP</span></div>';
  }

  /* ─── Renderiza lista de decks ────────────────────────── */
  function renderDeckList() {
    // Procura o grid de decks dentro da view de flashcards
    var view = document.getElementById('view-flashcards');
    if (!view) return;

    // O grid de decks é o segundo .missions-grid dentro da view
    var grids = view.querySelectorAll('.missions-grid');
    var grid  = grids[grids.length - 1]; // último grid = lista de decks
    if (!grid) return;

    var completed = getCompleted();
    var html = '';

    DECK_META.forEach(function(d) {
      var unlocked  = isDeckUnlocked(d.missionId);
      var done      = isDeckCompleted(d.missionId);
      var isActive  = d.missionId === 1; // deck 1 sempre ativo por padrão

      // Conta cards deste deck
      var cardCount = '?';
      if (typeof getFlashcards === 'function') {
        var cards = getFlashcards().filter(function(c) { return c.deck === d.deck; });
        cardCount = cards.length > 0 ? cards.length : '?';
      }

      var statusClass = done ? 'done' : isActive && unlocked ? 'active-s' : '';
      var statusText  = done ? '✓ concluído'
                      : !unlocked ? '🔒 bloqueado'
                      : isActive ? 'ativo'
                      : '◈ disponível';

      html +=
        '<div class="mission-card' +
          (isActive && unlocked ? ' active-card' : '') +
          (!unlocked ? ' locked-card' : '') +
        '"' +
        (unlocked ? ' onclick="switchDeck(' + d.missionId + ')" style="cursor:pointer"' : '') +
        '>' +
          '<div class="mc-num"' + (!unlocked ? ' style="color:var(--text-dim)"' : '') + '>' + d.num + '</div>' +
          '<div class="mc-body">' +
            '<div class="mc-title"' + (!unlocked ? ' style="color:var(--text-dim)"' : '') + '>' + d.name + '</div>' +
            '<div class="mc-meta">' +
              '<span>' + cardCount + ' cards</span>' +
              '<span>' + d.deck + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="mc-side">' +
            '<div class="mc-status ' + statusClass + '">' + statusText + '</div>' +
          '</div>' +
        '</div>';
    });

    grid.innerHTML = html;
  }

  /* ─── switchDeck — troca deck ativo ──────────────────── */
  window.switchDeck = function(missionId) {
    if (!isDeckUnlocked(missionId)) return;

    // Filtra flashcards do deck selecionado
    var deck = DECK_META.find(function(d) { return d.missionId === missionId; });
    if (!deck) return;

    // Reseta índice e renderiza
    if (window.STATE) {
      window.STATE.fcIndex   = 0;
      window.STATE.fcFlipped = false;
    }

    // Filtra os cards pelo deck
    window._activeDeckFilter = deck.deck;
    renderFlashcard();
    updateFcCounter();

    // Atualiza deck info bar
    var bar = document.querySelector('.fc-deck-info');
    if (bar) {
      var cards = typeof getFlashcards === 'function'
        ? getFlashcards().filter(function(c) { return c.deck === deck.deck; })
        : [];
      bar.innerHTML =
        '<div>deck ativo: <span>' + deck.name + '</span></div>' +
        '<div>status: <span>em estudo</span></div>' +
        '<div>total de cards: <span>' + (cards.length || '?') + '</span></div>' +
        '<div>XP por conclusão: <span>+30 XP</span></div>';
    }

    // Rerender lista para atualizar o "ativo"
    // Marca o deck selecionado como ativo visualmente
    var view  = document.getElementById('view-flashcards');
    if (!view) return;
    var grids = view.querySelectorAll('.missions-grid');
    var grid  = grids[grids.length - 1];
    if (!grid) return;

    grid.querySelectorAll('.mission-card').forEach(function(card, i) {
      card.classList.remove('active-card');
      var statusEl = card.querySelector('.mc-status');
      if (DECK_META[i] && DECK_META[i].missionId === missionId) {
        card.classList.add('active-card');
        if (statusEl) { statusEl.className = 'mc-status active-s'; statusEl.textContent = 'ativo'; }
      } else if (statusEl && statusEl.textContent === 'ativo') {
        statusEl.className = 'mc-status';
        statusEl.textContent = '◈ disponível';
      }
    });
  };

  /* ─── Patch getFlashcards para filtrar por deck ativo ── */
  window.addEventListener('load', function() {
    setTimeout(function() {
      var _origGetFC = window.getFlashcards;
      if (typeof _origGetFC === 'function') {
        window.getFlashcards = function() {
          var all = _origGetFC();
          if (window._activeDeckFilter) {
            var filtered = all.filter(function(c) { return c.deck === window._activeDeckFilter; });
            return filtered.length > 0 ? filtered : all;
          }
          return all;
        };
      }

      // Patch initFlashcards para re-renderizar deck list
      var _origInit = window.initFlashcards;
      if (typeof _origInit === 'function') {
        window.initFlashcards = function() {
          window._activeDeckFilter = null; // reseta filtro ao entrar na seção
          _origInit.apply(this, arguments);
          setTimeout(function() {
            renderDeckList();
            updateNavBadge();
            updateDeckInfoBar();
          }, 100);
        };
      }

      // Atualiza badge imediatamente
      updateNavBadge();
      renderDeckList();

    }, 1000);
  });

  /* ─── Re-renderiza ao navegar para flashcards ─────────── */
  window.addEventListener('load', function() {
    setTimeout(function() {
      var _nav = window.navigate;
      if (typeof _nav === 'function' && !_nav._flashcardsPatched) {
        window.navigate = function(section) {
          var r = _nav.apply(this, arguments);
          if (section === 'flashcards') {
            setTimeout(function() {
              renderDeckList();
              updateNavBadge();
              updateDeckInfoBar();
            }, 150);
          }
          return r;
        };
        window.navigate._flashcardsPatched = true;
      }
    }, 1600);
  });

  /* ─── Atualiza badge a cada 2s (reage a missões novas) ── */
  setInterval(updateNavBadge, 2000);

})();