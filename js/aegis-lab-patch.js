/* ═══════════════════════════════════════════════════════════
   aegis-lab-patch.js
   Substitui execTerminalCmd para NÃO mostrar o output direto.
   Em vez disso: mostra o comando, mostra uma dica parcial,
   e convida o Guardião a refletir / perguntar ao ÆGIS.

   Incluir no index.html DEPOIS de missions-ui.js:
   <script src="/js/aegis-lab-patch.js"></script>
═══════════════════════════════════════════════════════════ */

window.addEventListener('load', function () {

  /* ── Dicas por payload — contexto mínimo sem resposta ── */
  var LAB_HINTS = {
    /* Missão 1 — Command Injection */
    'report.pdf; whoami': [
      'O ; diz ao shell: "acabou um comando, começa outro".',
      'O que você acha que o shell executa depois do ponto-e-vírgula?',
    ],
    'x; printenv | grep -i aws': [
      'printenv lista variáveis de ambiente. O | passa a saída adiante.',
      'Pensa: o que uma Lambda AWS tem nas variáveis de ambiente que seria valioso pro Loki?',
    ],
    'file$(id).pdf': [
      '$() é substituição de subshell — o shell executa o que está dentro antes de montar a string.',
      'Se $(id) roda o comando id, o que você acha que aparece no nome do arquivo?',
    ],

    /* Missão 2 — IDOR */
    'curl /api/profile?userId=42 -H "Authorization: Bearer TOKEN"': [
      'Esse é o comportamento esperado — seu userId, seu token.',
      'Agora pensa: o que muda se você trocar o userId na URL?',
    ],
    'curl /api/profile?userId=1 -H "Authorization: Bearer TOKEN"': [
      'userId=1 geralmente é o primeiro usuário criado num sistema.',
      'A função valida se o token corresponde ao userId solicitado?',
    ],
    'for id in 100 101 102 103 104 105; do curl /api/profile?userId=$id; done': [
      'Um loop simples iterando IDs sequenciais.',
      'Se a API retorna dados para cada ID sem checar autorização, o que isso significa em escala?',
    ],

    /* Missão 3 — JWT */
    'echo "eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIn0" | base64 -d': [
      'base64 -d decodifica — não descriptografa. JWT não é criptografia.',
      'O que você encontra quando decodifica o payload de um JWT qualquer?',
    ],
    'node -e "const h=btoa(JSON.stringify({alg:\'none\'})); const p=btoa(JSON.stringify({sub:\'1\',role:\'admin\'})); console.log(h+\'.\'+p+\'.\');"': [
      'alg:none significa: sem algoritmo de assinatura.',
      'Por que um servidor que aceita alg:none está em problema?',
    ],
    'hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt': [
      'hashcat testa combinações até encontrar o secret que gerou a assinatura.',
      'O que torna um secret resistente a esse tipo de ataque?',
    ],

    /* Missão 4 — SSRF */
    'curl "https://api.aegis.com/preview?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/lambda-role"': [
      '169.254.169.254 é o Instance Metadata Service da AWS — acessível de dentro de qualquer Lambda.',
      'O que você acha que esse endpoint retorna sem autenticação adicional?',
    ],
    'AWS_ACCESS_KEY_ID=ASIA3X... AWS_SECRET_ACCESS_KEY=wJalrX... AWS_SESSION_TOKEN=IQoJb3... aws s3 ls': [
      'Credenciais temporárias do IAM role funcionam igual às permanentes — mesmas permissões.',
      'Com acesso de listagem S3, qual seria o próximo passo de um atacante?',
    ],
    'curl "https://api.aegis.com/preview?url=https://evil.com/redirect"': [
      'evil.com está fora da allowlist. Mas o que acontece se evil.com redirecionar para outro lugar?',
      'A Lambda valida o destino final após seguir o redirect?',
    ],

    /* Missão 5 — Supply Chain */
    'npm audit --audit-level=high': [
      'npm audit compara suas dependências com um banco de CVEs conhecidos.',
      'O que aparece é uma vulnerabilidade com CVE registrado. Mas e malware sem CVE ainda?',
    ],
    'npx socket check utils-helper@1.2.5': [
      'Socket.dev analisa comportamento além de CVEs — acesso de rede no install, obfuscação.',
      'O que você acha mais suspeito no resultado: o postinstall ou o novo maintainer?',
    ],
    'npm info lodahs --json | grep -E "name|downloads|maintainers|created"': [
      'lodahs vs lodash — um caractere de diferença, criado há poucos dias.',
      'Quais sinais num pacote npm indicam typosquatting?',
    ],

    /* Missão 6 — Privilege Escalation */
    'aws iam list-roles --query "Roles[?RoleName!=\'limited-lambda-role\'].{Name:RoleName,Arn:Arn}"': [
      'iam:PassRole com Resource:* deixa passar qualquer role da conta.',
      'Por que a permissão de listar roles já é um problema aqui?',
    ],
    'aws lambda create-function --function-name loki-backdoor --runtime nodejs18.x --role arn:aws:iam::123456789:role/AdminRole --handler index.handler --zip-file fileb://backdoor.zip': [
      'Você está criando uma Lambda com um role de admin.',
      'Se a função tem AdministratorAccess, o que ela pode fazer quando invocada?',
    ],
    'aws lambda invoke --function-name loki-backdoor --payload \'{"action":"disable-cloudtrail","region":"us-east-1"}\' /dev/stdout': [
      'CloudTrail registra todas as chamadas API da conta.',
      'Por que desabilitar o CloudTrail é o primeiro movimento de um atacante com acesso admin?',
    ],
  };

  /* ── Fallback genérico quando não tem dica mapeada ── */
  var GENERIC_HINTS = [
    'Execute e observe com atenção — o que você não esperava ver?',
    'Antes de continuar: o que você acha que esse comando vai fazer?',
    'Pense no mecanismo por trás. O que o sistema precisa fazer pra esse comando funcionar?',
    'Observe o output e pergunte: por que isso é possível? O que deveria impedir?',
  ];

  function getHint(payload) {
    var key = payload.trim();
    if (LAB_HINTS[key]) return LAB_HINTS[key];
    /* Busca parcial */
    var keys = Object.keys(LAB_HINTS);
    for (var i = 0; i < keys.length; i++) {
      if (key.indexOf(keys[i].substring(0, 20)) !== -1) return LAB_HINTS[keys[i]];
    }
    return [GENERIC_HINTS[Math.floor(Math.random() * GENERIC_HINTS.length)]];
  }

  /* ── Substituir execTerminalCmd ── */
  window.execTerminalCmd = function (lid, idx) {
    var state = window._terminalState && window._terminalState[lid];
    if (!state) return;

    var ch  = state.lab.terminal.challenges[idx];
    var out = state.outputEl;

    /* 1. Mostrar o comando digitado */
    var promptLine = document.createElement('div');
    promptLine.className = 'tl-line';
    promptLine.innerHTML = '<span class="tl-p">'
      + _escLab(state.lab.terminal.prompt || '$')
      + '</span> <span class="tl-cmd">'
      + _escLab(ch.payload)
      + '</span>';
    out.appendChild(promptLine);

    /* 2. Mostrar "processando..." brevemente */
    var thinkLine = document.createElement('div');
    thinkLine.className = 'tl-line tl-dim';
    thinkLine.textContent = '// processando...';
    out.appendChild(thinkLine);
    out.scrollTop = out.scrollHeight;

    setTimeout(function () {
      thinkLine.remove();

      /* 3. Mostrar dica direcional — não a resposta */
      var hints = getHint(ch.payload);
      hints.forEach(function (h) {
        var hLine = document.createElement('div');
        hLine.className = 'tl-line tl-comment';
        hLine.textContent = '// ' + h;
        out.appendChild(hLine);
      });

      /* 4. Separador + convite para refletir */
      var sep = document.createElement('div');
      sep.className = 'tl-line';
      sep.innerHTML = '<span class="tl-dim">──────────────────────────────────────────</span>';
      out.appendChild(sep);

      var reflect = document.createElement('div');
      reflect.className = 'tl-line';
      reflect.innerHTML = '<span style="color:var(--green);opacity:0.7;">◈ ÆGIS:</span>'
        + ' <span class="tl-comment">Reflita sobre o que deveria acontecer aqui.'
        + ' Quando tiver uma hipótese, avance — ou pergunte ao ÆGIS-BOT.</span>';
      out.appendChild(reflect);

      /* 5. Botão para revelar output (opcional, após reflexão) */
      var revealBtn = document.createElement('button');
      revealBtn.className = 'tl-hint-btn';
      revealBtn.style.marginTop = '8px';
      revealBtn.textContent = '[ ver output após reflexão ]';
      revealBtn.onclick = function () {
        revealBtn.remove();

        /* Mostrar output real */
        ch.expectedOutput.forEach(function (l) {
          var el = document.createElement('div');
          el.className = 'tl-line'
            + (l.startsWith('//') ? ' tl-comment' : '')
            + (
                l.includes('⚠') || l.includes('✗') ||
                l.includes('malicious') || l.includes('Cracked') ||
                l.includes('comprometido') || l.includes('acesso')
                ? ' tl-danger' : ''
              );
          el.textContent = l;
          out.appendChild(el);
        });

        /* Avançar para próximo challenge */
        state.current++;
        if (state.current < state.lab.terminal.challenges.length) {
          _renderNextChallenge(state, lid);
        } else {
          state.challengesEl.innerHTML =
            '<div class="tl-complete">'
            + _escLab(state.lab.terminal.finalMessage || '// Lab completo.')
            + '</div>';
          if (state.lab.xpReward && typeof window._grantXP === 'function') {
            window._grantXP({ xp: state.lab.xpReward, label: 'lab:terminal:' + lid });
          }
        }
        out.scrollTop = out.scrollHeight;
      };
      out.appendChild(revealBtn);
      out.scrollTop = out.scrollHeight;

    }, 600);
  };

  /* ── Helper: renderizar próximo challenge ── */
  function _renderNextChallenge(state, lid) {
    var lab = state.lab;
    var i   = state.current;
    var ch  = lab.terminal.challenges[i];
    state.challengesEl.innerHTML = [
      '<div class="tl-challenge">',
      '  <div class="tl-instruction">',
      '    <span class="tl-idx">[' + (i + 1) + '/' + lab.terminal.challenges.length + ']</span> ',
      _escLab(ch.instruction),
      '  </div>',
      '  <div class="tl-payload-box">',
      '    <div class="tl-prompt-line">',
      '      <span class="tl-prompt">' + _escLab(lab.terminal.prompt || '$') + '</span>',
      '      <span class="tl-payload-text">' + _escLab(ch.payload) + '</span>',
      '      <button class="tl-exec-btn" onclick="execTerminalCmd(\'' + lid + '\', ' + i + ')">[ executar ]</button>',
      '    </div>',
      '  </div>',
      '  <div class="tl-hint" style="display:none" id="' + lid + '-hint-' + i + '">',
      '    <span class="tl-hint-icon">◈</span> ' + _escLab(ch.hint || ''),
      '  </div>',
      '  <button class="tl-hint-btn" onclick="toggleTerminalHint(\'' + lid + '\', ' + i + ')">[ dica ]</button>',
      '</div>',
    ].join('');
  }

  /* ── escaping seguro ── */
  function _escLab(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  console.log('[aegis-lab-patch] terminal lab: guia sem revelar resposta direta.');
});