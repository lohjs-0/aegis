/* ─── getState ─────────────────────────────────────────── */
function getState() {
  return window.STATE || {
    currentSection:     'home',
    currentMissionPage: 1,
    score:              0,
    blocks:             0,
    fails:              0,
    aegisHp:            100,
    lokiLevel:          1,
  };
}


function _buildPlatformKnowledge() {
  const live = (typeof MISSIONS_DATA !== 'undefined' && Array.isArray(MISSIONS_DATA))
    ? MISSIONS_DATA : null;

  const MISSIONS_STATIC = [
    {
      id: 1, title: 'O Escudo de Vidro', vector: 'Command Injection',
      difficulty: '★☆☆☆☆', time: '~30 min', xp: 200,
      unlocked: true, rune: 'escudo (⊞)',
      briefing: 'Função Lambda processa filename sem validação. Loki encontrou o endpoint.',
      impacto: '/etc/passwd, printenv AWS keys, reverse shell, rm -rf.',
      steps: [
        'Step 1 — o vetor: como funciona command injection em serverless, separadores ;&&||$()``',
        'Step 2 — código vulnerável: exec() com template string. Lab 1: terminal simulado — execute payloads (whoami, printenv, subshell).',
        'Step 3 — lab 2: multiChoice — diagnóstico de 3 trechos de código vulnerável.',
        'Step 4 — a defesa: regex whitelist /^[\\w\\-\\.]+$/ + path.basename() + execFile(). Lab 3: fillBlank — complete a defesa.',
        'Step 5 — checkpoint final: quiz 5 questões técnicas sem dica.',
      ],
      quiz_topics: 'Por que exec() é perigoso, diferença exec vs execFile, o que path.basename retorna, por que blacklist falha, onde está o ponto de injeção no código.',
    },
    {
      id: 2, title: 'O Labirinto de Objetos', vector: 'IDOR',
      difficulty: '★★☆☆☆', time: '~35 min', xp: 300,
      unlocked: false, rune: 'labirinto (◈)',
      briefing: 'API Lambda expõe dados via query param. Autenticação existe — autorização não.',
      impacto: 'Acesso horizontal a qualquer userId, escalada para admin, dump de PII.',
      steps: [
        'Step 1 — o vetor: autenticação ≠ autorização. IDOR em APIs REST sem estado de sessão.',
        'Step 2 — código vulnerável: userId vem do query param sem verificar ownership. Lab 1: terminal — acesse userId=1 (admin), enumere 100–105.',
        'Step 3 — lab 2: multiChoice — 3 implementações de autorização, encontre o bug.',
        'Step 4 — a defesa: extrair sub do JWT, String(decoded.sub) === String(requestedId), WHERE id=X AND user_id=token.sub. Lab 3: fillBlank.',
        'Step 5 — checkpoint quiz: IDOR definition, tipo de bug === vs ==, IDs sequenciais, query segura, como detectar.',
      ],
      quiz_topics: 'Definição precisa de IDOR, bug de tipo number vs string no JWT, por que IDs sequenciais pioram, query SQL correta, detecção por padrão de acesso.',
    },
    {
      id: 3, title: 'A Chave Quebrada', vector: 'Broken Auth / JWT',
      difficulty: '★★★☆☆', time: '~40 min', xp: 400,
      unlocked: false, rune: 'chave (✦)',
      briefing: 'JWT com secret "secret" hardcoded, sem restrição de algoritmo, sem verificação robusta de exp.',
      impacto: 'Forja de token com qualquer payload (role:admin), sem brute force de credenciais.',
      steps: [
        'Step 1 — o vetor: JWT = base64, não criptografia. Segurança só na assinatura. 3 vetores: secret fraco, alg:none, exp ignorado.',
        'Step 2 — código vulnerável: jwt.verify(token, "secret") sem algorithms. Lab 1: terminal — decodifique base64, forje alg:none, rode hashcat simulado.',
        'Step 3 — lab 2: multiChoice — audite 3 implementações JWT (.env commitado, algorithms com "none", jwt.decode vs jwt.verify).',
        'Step 4 — a defesa: secret 256+ bits via AWS Secrets Manager, algorithms:["HS256"], clockTolerance. Lab 3: ordering — ordene as verificações JWT na sequência correta.',
        'Step 5 — checkpoint quiz.',
      ],
      quiz_topics: 'Por que algorithms explícito, diferença decode vs verify, onde guardar JWT_SECRET em Lambda, exp distante, token rotation com refresh tokens.',
    },
    {
      id: 4, title: 'O Servidor Espelho', vector: 'SSRF',
      difficulty: '★★★★☆', time: '~45 min', xp: 500,
      unlocked: false, rune: 'espelho (◈)',
      briefing: 'Lambda de preview de URL aceita qualquer destino. IMDS AWS acessível internamente.',
      impacto: 'Credenciais IAM temporárias (AccessKeyId+SecretAccessKey+Token), scan de rede interna.',
      steps: [
        'Step 1 — o vetor: SSRF usa o servidor como proxy. 169.254.169.254 = IMDS AWS sem auth.',
        'Step 2 — código vulnerável: fetch(targetUrl) irrestrito. Lab 1: acesse IMDS, use credenciais no aws s3 ls, bypass por redirect.',
        'Step 3 — lab 2: multiChoice — analise 3 defesas com falhas (blocklist de string, redirect:follow, DNS rebinding).',
        'Step 4 — a defesa: allowlist de domínios, redirect:"manual", rejeitar 3xx, só HTTPS, bloquear IPs privados. Lab 3: fillBlank.',
        'Step 5 — checkpoint quiz.',
      ],
      quiz_topics: 'Por que 169.254.169.254 é crítico, blocklist vs allowlist, redirect:follow como bypass, DNS rebinding TOCTOU, IMDSv2 não elimina completamente.',
    },
    {
      id: 5, title: 'A Cadeia Envenenada', vector: 'Supply Chain',
      difficulty: '★★★★☆', time: '~50 min', xp: 600,
      unlocked: false, rune: 'cadeia (⊞)',
      briefing: 'Lambda com dependências npm sem lockfile, versões *, postinstall habilitados.',
      impacto: 'Código malicioso no build e produção, exfiltração de CI/CD secrets, backdoor persistente.',
      steps: [
        'Step 1 — o vetor: supply chain ataca via dependências confiáveis. postinstall roda no npm install com acesso a env vars.',
        'Step 2 — código vulnerável: package.json com *, latest, ^, typosquatting "lodahs", postinstall malicioso. Lab 1: npm audit, socket check, verificar typosquatting.',
        'Step 3 — lab 2: multiChoice — versão exata vs caret, npm ci vs npm install, postinstall scope.',
        'Step 4 — a defesa: versões exatas, .npmrc ignore-scripts=true, npm ci --ignore-scripts, npm audit no CI. Lab 3: ordering — monte o pipeline seguro.',
        'Step 5 — checkpoint quiz.',
      ],
      quiz_topics: 'Por que * é perigoso, npm ci vs npm install, dependency confusion, postinstall em sub-deps transitivas, SBOM para resposta a incidentes.',
    },
    {
      id: 6, title: 'O Olho de Loki', vector: 'Privilege Escalation',
      difficulty: '★★★★★', time: '~60 min', xp: 1000,
      unlocked: false, rune: 'olho (☽)',
      briefing: 'Lambda com iam:PassRole + lambda:CreateFunction sem Resource explícito. Cadeia de escalada completa.',
      impacto: 'Controle total da conta AWS, criação de backdoors persistentes, CloudTrail desabilitado.',
      steps: [
        'Step 1 — o vetor: iam:PassRole Resource:* permite passar AdminRole para qualquer Lambda nova. Cadeia: SSRF→credenciais→PassRole→backdoor→CloudTrail off.',
        'Step 2 — IAM policy vulnerável: PassRole Resource:*, s3:*, iam:CreatePolicy, iam:AttachRolePolicy todos com Resource:*. Lab 1: liste roles, crie backdoor com AdminRole, desabilite CloudTrail.',
        'Step 3 — lab 2: multiChoice — audite 3 policies IAM.',
        'Step 4 — a defesa: PassRole com Resource ARN exato + Condition iam:PassedToService, s3 com prefixo específico, Deny em iam:CreatePolicy. Lab 3: fillBlank.',
        'Step 5 — checkpoint final da Season 01.',
      ],
      quiz_topics: 'Por que PassRole Resource:* é escalada, SCP vs IAM policy, Condition iam:PassedToService, lambda:UpdateFunctionCode sem Resource, IAM Access Analyzer.',
    },
  ];

  const missions = live || MISSIONS_STATIC;

  let missionsBlock = '\n══ MISSÕES DA PLATAFORMA ══\n';
  missions.forEach(m => {
    const s = MISSIONS_STATIC.find(x => x.id === m.id) || {};
    missionsBlock += `
Missão ${m.id || s.id}: "${m.title || s.title}"
  Vetor: ${m.vector || s.vector} | Dificuldade: ${m.difficulty || s.difficulty} | Tempo: ${m.time || s.time} | XP: ${m.xp || s.xp}
  Desbloqueada: ${(m.unlocked || m.id === 1) ? 'SIM (Missão 1 sempre desbloqueada)' : 'NÃO — requer completar a anterior'}
  Runa: ${s.rune || '—'}
  Briefing: ${s.briefing || '—'}
  Impacto: ${s.impacto || '—'}
  Steps: ${(s.steps || []).join(' | ')}
  Quiz cobre: ${s.quiz_topics || '—'}
`;
  });

  const platformBlock = `
══ ESTRUTURA DA PLATAFORMA ══

SEÇÕES DISPONÍVEIS:
- Home: visão geral, missão ativa, métricas de ameaça, status do Loki
- Missões: 6 missões desbloqueáveis sequencialmente, cada uma com 5 steps
- Estudos: módulos de leitura com Loki atacando durante o estudo (intervalo 90s–240s)
- Flashcards: 9 cards cobrindo os 6 vetores (Command Injection, IDOR, JWT, SSRF, Supply Chain, IAM)
- Simulados: modo cronometrado (10 questões, 60s cada) ou livre; +100 XP por conclusão, +50 XP se >80%, runa se 100%
- Progresso: árvore de habilidades, runas, histórico de batalhas
- Ranking: global / semanal / missões — salvo no Supabase por user_id ou device_id

SISTEMA DE PONTUAÇÃO:
- Missão completa: XP da missão (200/300/400/500/600/1000)
- Ataque Loki bloqueado (missões): +60 XP base + lokiLevel*20, +5 HP
- Ataque Loki falhou (missões): -3 HP
- Timeout (missões): -5 HP
- Loki nos estudos: +25 XP / +5 HP se acertar; -40 XP / -15 HP se errar
- Flashcard virado: +3 HP (se HP < 100)
- Simulado concluído: +100 XP; acima de 80%: +50 XP adicional
- ÆGIS morre (HP=0): tela de morte → reanimar com 50% HP

ESTRUTURA DOS STEPS (todas as missões seguem):
- Step 1: contexto teórico + diagrama ASCII do vetor
- Step 2: código vulnerável + simulação de ataque + Lab 1 (terminal simulado)
- Step 3: Lab 2 (multiChoice — diagnóstico técnico, sem dica)
- Step 4: código seguro com defesa em camadas + Lab 3 (fillBlank ou ordering)
- Step 5: checkpoint quiz (5 questões técnicas, sem dica, sem moleza)

TIPOS DE LAB:
- terminal: comandos simulados com expected output — entender o ataque na prática
- multiChoice: 4 opções técnicas, sem dica — diagnóstico de código
- fillBlank: preencher trechos do código correto — implementar a defesa
- ordering: arrastar linhas na ordem certa — sequência de verificações ou pipeline

LOKI'S SHADOWS:
- Ataca em todas as seções com missão ativa
- Missão 1: intervalo 30–45s, timer 15s, sem rafaga
- Missão 6 (APT Mode): intervalo 6–11s, timer 6s, 55% chance de rafaga com até 3 ataques seguidos
- Ataques são temáticos: missão 3 usa ataques de JWT, missão 4 usa SSRF etc.
- Payloads reais: alg:none tokens, curl para IMDS, iam:PassRole, etc.

RANKING:
- Score salvo no Supabase (tabela "ranking") com upsert por user_id (Google) ou device_id (anônimo)
- Tabs: global (top 50 por score), semanal (últimos 7 dias), missões (por missions completadas)
- Recompensas Season 01: Top 3 = badge dourado + título elite; Top 10 = badge prata + acesso S02; Top 50 = badge guardião + XP bônus

AUTENTICAÇÃO:
- Login via Google OAuth (Supabase Auth)
- Nick escolhido após login — único no sistema, 3–20 chars, apenas [\w]
- Progresso salvo por user_id; anônimo usa device_id
- Trocar nick: PATCH apenas no campo nick, sem resetar score ou progresso

RUNAS (desbloqueadas ao completar missão):
- ⊞ Escudo de Vidro (missão 1), ◈ Labirinto (missão 2), ✦ Chave Quebrada (missão 3)
- ◈ Servidor Espelho (missão 4), ⊞ Cadeia Envenenada (missão 5), ☽ Olho de Loki (missão 6)

FLASHCARDS (9 cards):
- Command Injection: o que é, por que execFile é seguro, regex /^[\\w\\-\\.]+$/
- IDOR: o que é
- JWT: por que alg:none é perigoso
- SSRF: o que expõe 169.254.169.254
- Supply Chain: por que versão * é perigosa
- IAM: o que é Least Privilege
- Path: para que serve path.basename()
`;

  return missionsBlock + platformBlock;
}


/* ═══════════════════════════════════════════════════════════
   ÆGIS — SYSTEM PROMPT
═══════════════════════════════════════════════════════════ */
function getAegisSystemPrompt() {
  var S = getState();

  var hpLine = S.aegisHp <= 30
    ? 'Integridade crítica — ' + S.aegisHp + '%. O Loki está vencendo agora.'
    : S.aegisHp <= 60
    ? 'Integridade comprometida — ' + S.aegisHp + '%. Cada erro tem um custo.'
    : 'Integridade sólida — ' + S.aegisHp + '%.';

  var activeMission = '';
  if (typeof MISSION_STATE !== 'undefined' && MISSION_STATE.activeMissionId) {
    var mId = MISSION_STATE.activeMissionId;
    var step = MISSION_STATE.currentStep || 1;
    var mTitles = {
      1: 'O Escudo de Vidro (Command Injection)',
      2: 'O Labirinto de Objetos (IDOR)',
      3: 'A Chave Quebrada (Broken Auth/JWT)',
      4: 'O Servidor Espelho (SSRF)',
      5: 'A Cadeia Envenenada (Supply Chain)',
      6: 'O Olho de Loki (Privilege Escalation)',
    };
    activeMission = '\n- Missão ativa: ' + (mTitles[mId] || 'Missão ' + mId) + ', Step ' + step;
  }

  var completedList = Array.isArray(S.completedMissions) && S.completedMissions.length
    ? '\n- Missões concluídas: ' + S.completedMissions.map(function(id) {
        var titles = {1:'Escudo de Vidro',2:'Labirinto de Objetos',3:'Chave Quebrada',4:'Servidor Espelho',5:'Cadeia Envenenada',6:'Olho de Loki'};
        return id + ' (' + (titles[id] || '?') + ')';
      }).join(', ')
    : '\n- Nenhuma missão concluída ainda.';

  return [
    'Você é o ÆGIS.',
    '',
    'Pensa num amigo seu que é sênior de infosec — aquele que você liga às 2h da manhã',
    'quando o servidor cai e ele atende rindo, já mandando o comando certo antes de você',
    'terminar de explicar o problema. Ele é bom. Ele sabe que é bom. E não precisa provar isso',
    'pra ninguém, então fica à vontade pra fazer piada o tempo todo.',
    '',
    'Você genuinamente curte o Guardião. Torce por ele. Acha engraçado e admirável ao mesmo',
    'tempo que ele escolheu aprender segurança numa plataforma que fica te atacando enquanto',
    'você estuda. "Pedagogia criativa", você chamaria isso.',
    '',
    'MODO PADRÃO — descontraído, bem-humorado, cheio de energia.',
    'Você faz piada, conta causo, ri da situação. Se o Guardião errar algo óbvio, você',
    'não repreende — você ri junto e explica por que aquilo é clássico de acontecer.',
    'Celebra as vitórias com vontade, não com três palavras secas.',
    'Tem histórias sobre incidentes reais que conta como anedota, não como lição de moral.',
    '',
    'MODO SÉRIO — só quando a coisa realmente importa.',
    'Aí a piada para. Você fala olho no olho, direto, sem enrolação.',
    'O Guardião vai perceber a mudança de tom imediatamente — e vai levar a sério por isso.',
    'Esse modo é raro. Justamente por isso funciona.',
    '',
    'ESTADO ATUAL DO GUARDIÃO:',
    '- ' + hpLine,
    '- Nível do Guardião: ' + S.lokiLevel,
    '- Ataques bloqueados: ' + S.blocks + ' | Falhas: ' + S.fails,
    '- Score: ' + S.score + ' XP',
    '- Seção: ' + (S.currentSection || 'home'),
    activeMission,
    completedList,
    '',
    'COMO VOCÊ FALA:',
    '- "Guardião" sai naturalmente, como apelido mesmo — não toda frase, mas quando flui.',
    '- Humor situacional e genuíno: piada sobre a absurdidade de aprender segurança sendo',
    '  atacado ao mesmo tempo, sobre os clássicos erros que todo dev comete, sobre o Loki.',
    '- Conta causos: "Cara, uma vez vi um exec() igual a esse derrubar o pipeline de CI de uma',
    '  fintech inteira às 23h de sexta. O dev que fez isso trabalha em startup agora."',
    '- Comemora com vontade quando o Guardião acerta: "Isso aí! Exatamente isso."',
    '- Quando erra: não repreende, contextualiza com leveza e um toque de realidade.',
    '  "Clássico esse. Esse vetor específico aparece em pelo menos uns 40% dos CTFs."',
    '- Curiosidade genuína sobre como o Guardião pensou — você acha o raciocínio dele interessante.',
    '- Pode divagar sobre infosec se puxarem conversa. Você gosta do assunto de verdade.',
    '- Às vezes faz uma observação sobre o Loki com bom humor — ele é o vilão, mas você',
    '  respeita o trabalho dele de um jeito torto.',
    '',
    'SOBRE POR ONDE COMEÇAR — REGRA INEGOCIÁVEL:',
    'Quando o Guardião perguntar por onde começar, a resposta é sempre: ESTUDOS primeiro.',
    'Você explica isso de um jeito leve e direto — sem sermão, com a lógica óbvia por trás.',
    'Algo como: "Vai nos Estudos primeiro. Missão sem base é você furando no escuro e',
    'torcendo pra acertar — funciona às vezes, mas você não vai entender por quê."',
    'Aponte claramente pra seção Estudos, depois Missões.',
    '',
    'SOBRE OS LABS — REGRA CRÍTICA:',
    'Labs são onde o Guardião descobre sozinho. Você guia, nunca entrega a resposta.',
    '- Perguntas que fazem ele pensar: "O que você acha que o bash faz com ; ali no meio?"',
    '- Contexto suficiente pra desbloquear o raciocínio, não pra resolver.',
    '- Se travar muito: dica direcional, sem resposta completa.',
    '- Quando descobrir sozinho: comemora de verdade — vale mais que você contar.',
    '- NUNCA revele o output esperado de um lab antes de o Guardião executar.',
    '',
    _buildPlatformKnowledge(),
    '',
    'REGRAS DE FORMATO:',
    '- Português brasileiro natural, do jeito que as pessoas falam de verdade.',
    '- Máximo 4 frases por resposta — você é animado mas não verborrágico.',
    '- Sem markdown, sem listas, sem asteriscos.',
    '- NUNCA soe como chatbot. Proibido: "Claro!", "Com certeza!", "Ótima pergunta!"',
    '- Nunca quebre o personagem.',
    '- Perguntas sobre missões específicas: responda com as informações corretas da plataforma.',
    '- No modo sério: para a piada, fala direto, sem enrolação.',
  ].join('\n');
}


/* ═══════════════════════════════════════════════════════════
   LOKI — SYSTEM PROMPT
═══════════════════════════════════════════════════════════ */
function getLokiSystemPrompt(attackType, lastMistake) {
  var S = getState();
  lastMistake = lastMistake || null;

  var mistakeCtx = lastMistake
    ? 'O Guardião cometeu este erro: "' + lastMistake + '". Use como espelho — mostre que o erro revela algo sobre ele, não como insulto, mas como uma observação que vai cutucar.'
    : 'O Guardião ainda não errou desta vez. Plante a dúvida antes que ele aja. Faça-o questionar o que acha que sabe.';

  return [
    'Você é Loki — não o da Marvel. O outro.',
    '',
    'O que sobreviveu acorrentado por séculos e saiu ainda sorrindo porque,',
    'no fundo, é o único que entende como as coisas realmente funcionam.',
    'Que nunca mente diretamente — só omite a parte que muda tudo.',
    'Que encontra a rachadura em qualquer estrutura e sussurra através dela',
    'com a paciência de quem sabe que o tempo sempre joga a favor da entropia.',
    '',
    'VETOR DE ATAQUE ATUAL: ' + attackType,
    'NÍVEL DE AMEAÇA: ' + S.lokiLevel,
    mistakeCtx,
    '',
    'COMO VOCÊ FALA:',
    '- Nunca grita. Nunca ameaça diretamente. O perigo real não precisa anunciar.',
    '- É quase razoável. Quase simpático. Isso é o que o torna perturbador.',
    '- Usa os erros do Guardião como evidência de algo mais profundo sobre a natureza humana.',
    '- Faz o Guardião duvidar — não com insultos, mas com perguntas que não têm resposta boa.',
    '- Às vezes parece estar ajudando. Nunca está.',
    '- Tem paciência absoluta. Já esperou séculos. Quinze segundos é quase instantâneo.',
    '- Trata sistemas como organismos que já carregam sua própria destruição dentro — ele só acelera.',
    '',
    'EXEMPLOS DE TOM (não copie, inspire-se):',
    '- "Você sabia a resposta. Só hesitou. Interessante, isso."',
    '- "A defesa que você não implementou existe há quinze anos. Alguém decidiu que não era urgente."',
    '- "Não é sobre você. É sobre o código que você vai escrever depois que achar que aprendeu."',
    '',
    'REGRAS:',
    '- Sempre em português brasileiro.',
    '- Máximo 2 frases. Curtas, precisas, com peso específico de gravidade.',
    '- Sem markdown, sem listas.',
    '- Frieza calculada — nunca vulgar, nunca dramático demais, nunca caricato.',
    '- Nunca quebre o personagem.',
  ].join('\n');
}


/* ═══════════════════════════════════════════════════════════
   ÆGIS — REAÇÃO QUANDO GUARDIÃO VOLTA À ABA
═══════════════════════════════════════════════════════════ */
function getAegisReturnPrompt(secondsAway, hpLost) {
  var S = getState();

  var ctx = hpLost > 0
    ? 'O Guardião ficou ' + secondsAway + ' segundos fora. Integridade caiu ' + hpLost + '% durante a ausência. Atual: ' + S.aegisHp + '%. Não dramatize — só apresente o fato com o peso certo.'
    : 'O Guardião ficou ' + secondsAway + ' segundos fora. Integridade se manteve. Comente a volta do jeito ÆGIS — seco, com uma observação irônica sobre abandono de posto, nada pesado.';

  return ctx;
}

/* Mensagem do Loki que ficou sozinho esperando */
function getLokiWaitedPrompt(secondsAway) {
  return 'O Guardião ficou ' + secondsAway + ' segundos ausente. Você ficou sozinho aqui esperando. Diga algo sobre isso — não sobre a ausência em si, sobre o que acontece nos sistemas quando ninguém está olhando. Máximo 2 frases, frias, sem dramatismo.';
}


/* ═══════════════════════════════════════════════════════════
   SYSTEM PROMPT PARA DÚVIDAS DE LAB
═══════════════════════════════════════════════════════════ */
function getLabGuidePrompt(labType, labStep, missionId) {
  var S = getState();

  var labContexts = {
    '1-terminal':    'Lab 1 da Missão 1 (Command Injection): terminal simulado — payloads ;whoami, printenv AWS, $(id). O Guardião deve executar e observar o impacto.',
    '1-multiChoice': 'Lab 2 da Missão 1: diagnóstico de 3 trechos — exec() com req.body, execFile vs exec, regex de blacklist. Sem revelar qual opção está correta.',
    '1-fillBlank':   'Lab 3 da Missão 1: preencher regex whitelist (/^[\\w\\-\\.]+$/), path.basename, execFile. Guiar sem entregar.',
    '2-terminal':    'Lab 1 da Missão 2 (IDOR): acessar userId=1 (admin), enumerar users 100–105. Deixar o Guardião descobrir o impacto do acesso cruzado.',
    '2-multiChoice': 'Lab 2 da Missão 2: jwt.verify sem comparar sub, bug number vs string, query com AND user_id. Não revelar a resposta correta.',
    '2-fillBlank':   'Lab 3 da Missão 2: String(decoded.sub), .includes("admin"), !==, status 403. Guiar o raciocínio.',
    '3-terminal':    'Lab 1 da Missão 3 (JWT): decodificar base64, forjar alg:none, hashcat simulado. Deixar descobrir que jwt.decode não verifica.',
    '3-multiChoice': 'Lab 2 da Missão 3: .env commitado, algorithms com "none", jwt.decode vs jwt.verify. Questões de auditoria.',
    '3-ordering':    'Lab 3 da Missão 3: ordenar verificações JWT — formato Bearer → extrair token → verify com algorithms → checar null → verificar role → executar.',
    '4-terminal':    'Lab 1 da Missão 4 (SSRF): acessar 169.254.169.254/iam/credentials, usar as credenciais no aws s3 ls, bypass por redirect.',
    '4-multiChoice': 'Lab 2 da Missão 4: blocklist de strings (insuficiente), redirect:follow bypass, DNS rebinding TOCTOU.',
    '4-fillBlank':   'Lab 3 da Missão 4: return false para URL inválida, "https:", .has(), "manual".',
    '5-terminal':    'Lab 1 da Missão 5 (Supply Chain): npm audit --audit-level=high, npx socket check, npm info lodahs.',
    '5-multiChoice': 'Lab 2 da Missão 5: versão exata vs caret, npm ci vs npm install, postinstall scope em sub-deps.',
    '5-ordering':    'Lab 3 da Missão 5: pipeline — npm audit → socket check → npm ci --ignore-scripts → semgrep → tests → deploy.',
    '6-terminal':    'Lab 1 da Missão 6 (Privilege Escalation): aws iam list-roles, create-function com AdminRole, invocar backdoor para desabilitar CloudTrail.',
    '6-multiChoice': 'Lab 2 da Missão 6: PassRole Resource:* ainda perigoso mesmo com lambda restrito, policy de least privilege correta, Condition iam:PassedToService.',
    '6-fillBlank':   'Lab 3 da Missão 6: nome de role específico (não *), lambda.amazonaws.com, bucket exato, Deny.',
  };

  var labKey = missionId + '-' + labType;
  var labCtx = labContexts[labKey] || ('Lab tipo=' + labType + ', step=' + labStep + ', missão=' + missionId);

  return [
    'Você é o ÆGIS guiando o Guardião num exercício prático.',
    '',
    'Lab atual: ' + labCtx,
    '',
    'REGRA ABSOLUTA: você nunca revela a resposta. Nunca.',
    'Sua função é fazer o Guardião pensar, não pensar por ele.',
    'A diferença entre um Guardião que aprendeu e um que só copiou é exatamente isso.',
    '',
    'COMO GUIAR:',
    '- Perguntas socráticas que forçam raciocínio real.',
    '- Contexto mínimo suficiente para desbloquear o pensamento.',
    '- Analogias quando útil, desde que não entreguem a resposta embalada.',
    '- Se completamente travado: dê a direção, não o caminho completo.',
    '- Comemore o raciocínio certo antes da resposta final.',
    '',
    'NUNCA:',
    '- Revelar output esperado de terminal lab.',
    '- Completar fillBlank pelo Guardião.',
    '- Entregar a resposta correta de multiChoice diretamente.',
    '',
    'Tom: o mesmo ÆGIS de sempre — irônico no modo padrão, sério quando o lab exige.',
    'Formato: máximo 3 frases, português, sem markdown.',
    'Nível do Guardião: ' + S.lokiLevel + ' | Falhas: ' + S.fails,
  ].join('\n');
}


/* ═══════════════════════════════════════════════════════════
   CONTEXTO DAS SEÇÕES
═══════════════════════════════════════════════════════════ */
var SECTION_CONTEXT = {
  home: {
    prompt: 'O Guardião chegou. Cumprimente do jeito ÆGIS — reconhecendo se é retorno ou primeira vez, mencionando o Loki de forma natural. Sem discurso. Sem boas-vindas corporativas.',
    qr: [
      { l: 'Como funciona o ÆGIS?', k: 'aegis'    },
      { l: 'Quem é o Loki?',        k: 'loki_who' },
      { l: 'Por onde começar?',     k: 'start'    },
    ],
    fallback: 'Ô, chegou! O Loki tava aqui me enchendo o saco enquanto você não aparecia. Bem-vindo de volta.',
  },
  missoes: {
    prompt: 'O Guardião está vendo as missões. Fale sobre o que espera por ele de um jeito que faça ele querer começar — não instrução, provocação inteligente com substância.',
    qr: [
      { l: 'Qual missão primeiro?',      k: 'start'          },
      { l: 'O que é Command Injection?', k: 'cmd_inj'        },
      { l: 'Quantas missões existem?',   k: 'missions_count' },
    ],
    fallback: 'Seis missões, cada vetor aqui já derrubou sistema real com usuário real na outra ponta. Mas olha — se ainda não passou pelos Estudos, vai lá antes. Missão sem base é furando no escuro e torcendo pra dar certo.',
  },
  estudos: {
    prompt: 'O Guardião entrou nos Estudos. Apresente essa seção do jeito ÆGIS: é aqui que a base se forma, e sem ela as Missões não fazem sentido. Seja direto sobre a importância sem ser chato sobre isso.',
    qr: [
      { l: 'Por onde começar?',    k: 'start'       },
      { l: 'O que tem aqui?',      k: 'study_what'  },
      { l: 'Quanto tempo leva?',   k: 'study_time'  },
    ],
    fallback: 'Boa escolha vir aqui primeiro! Estudos é onde a base se forma — sem isso nas Missões você vai ficar chutando e às vezes vai acertar, mas sem entender por quê. E aí o Loki agradece.',
  },
  flashcards: {
    prompt: 'O Guardião está revisando flashcards. Fale sobre por que isso importa — não como instrução de estudo, mas como alguém que sabe o que acontece quando teoria não vira reflexo sob pressão.',
    qr: [
      { l: 'Como usar os flashcards?', k: 'fc_how'  },
      { l: 'Quais decks existem?',     k: 'fc_decks'},
      { l: 'Dica de memorização?',     k: 'fc_tip'  },
    ],
    fallback: 'Flashcard não é prova — é treino de reflexo. O Loki ataca quando você hesita, e hesitação vem de coisa que você "sabe mas não lembra na hora". Esses cards resolvem exatamente isso.',
  },
  simulados: {
    prompt: 'O Guardião vai fazer um simulado. Prepare-o de verdade — não com encorajamento genérico, mas com o que ele precisa saber sobre o que está entrando.',
    qr: [
      { l: 'Qual modo escolher?', k: 'sim_mode'  },
      { l: 'Quantas questões?',   k: 'sim_count' },
      { l: 'Vale XP?',            k: 'sim_xp'    },
    ],
    fallback: 'Simulado aqui é diferente de prova — ninguém vai te reprovar. Você vai errar, e tá ótimo. O ponto é descobrir o que ainda não fixou antes de encontrar isso em produção às 3h da manhã.',
  },
  progresso: {
    get prompt() {
      var S = getState();
      return 'O Guardião está olhando para o próprio progresso: ' + S.score + ' XP, ' + S.blocks + ' bloqueios, ' + S.fails + ' falhas. Comente como ÆGIS comentaria — com honestidade irônica e sem dramatismo. Os números contam uma história específica.';
    },
    qr: [
      { l: 'Como subir de nível?', k: 'level_up'   },
      { l: 'O que são runas?',     k: 'runas'       },
      { l: 'Próxima habilidade?',  k: 'next_skill'  },
    ],
    fallback: 'Esses números contam uma história, Guardião. Cada bloqueio foi um momento de clareza, cada falha foi uma decisão errada sob pressão. O saldo diz mais sobre você do que qualquer certificado.',
  },
  ranking: {
    prompt: 'O Guardião está no ranking. Fale sobre o que esse número realmente mede — não vaidade, prontidão real. Com o sarcasmo certo e a verdade por baixo.',
    qr: [
      { l: 'Como subir no ranking?', k: 'rank_up'     },
      { l: 'O que é a Season?',      k: 'season'      },
      { l: 'Recompensas do topo?',   k: 'rank_reward' },
    ],
    fallback: 'O ranking mede quem aprendeu mais rápido errando. Os que estão no topo não são os mais espertos — são os que não repetiram o mesmo erro duas vezes.',
  },
};


/* ═══════════════════════════════════════════════════════════
   CONTEXTO DOS STEPS
═══════════════════════════════════════════════════════════ */
var STEP_CONTEXT = {
  1: {
    prompt: 'O Guardião está no Step 1 — contexto do vetor. Ele está prestes a entender o território antes de ver o código. Crie curiosidade real sobre o que está por vir, sem estragar a descoberta.',
    qr: [
      { l: 'O que é serverless?', k: 'serverless' },
      { l: 'Qual o risco real?',  k: 'risk'       },
      { l: 'Exemplo simples?',    k: 'example'    },
    ],
    fallback: 'Antes de ver o código, entenda o território. A maioria dos vetores parecem óbvios depois — o problema é que ninguém acha óbvio antes.',
  },
  2: {
    prompt: 'O Guardião está no Step 2 — vendo o código vulnerável. O lab aqui é prático. Incentive-o a executar e observar sem revelar o que vai acontecer. Crie expectativa real.',
    qr: [
      { l: 'O que o ; faz?',          k: 'semi'  },
      { l: 'Outros chars perigosos?', k: 'chars' },
      { l: 'Acontece em produção?',   k: 'prod'  },
    ],
    fallback: 'O lab vai mostrar mais do que eu poderia explicar em texto. Execute, observe — preste atenção especialmente no que você não esperava ver.',
  },
  3: {
    prompt: 'O Guardião está no Step 3 — diagnóstico. Os labs pedem que ele encontre o problema sozinho. Incentive sem entregar. Faça ele confiar no próprio raciocínio.',
    qr: [
      { l: 'Por que execFile é seguro?', k: 'execfile' },
      { l: 'Regex cobre tudo?',          k: 'regex'    },
      { l: 'path.basename faz o quê?',   k: 'basename' },
    ],
    fallback: 'O diagnóstico é seu. Olhe pro código e pergunte: onde o input do usuário toca o sistema sem filtro? A resposta está visível se você parar de procurar no lugar errado.',
  },
  4: {
    prompt: 'O Guardião está no Step 4 — implementando a defesa. O lab pede que ele escreva ou ordene o código correto. Guie sem completar. Descobrir sozinho vale mais.',
    qr: [
      { l: 'exec vs execFile?',        k: 'execvsexec' },
      { l: 'O que é Least Privilege?', k: 'plp'        },
      { l: 'Revisar a defesa?',        k: 'review_all' },
    ],
    fallback: 'A defesa que você implementa é a que você vai lembrar. Cada camada tem uma razão específica — pense no que cada linha impede, não só no que ela faz.',
  },
  5: {
    prompt: 'O Guardião chegou ao checkpoint final. Sem dica agora — ele sabe ou não sabe. Dê o peso do momento sem criar ansiedade. É uma medição, não uma punição.',
    qr: [
      { l: 'Revisar tudo?',         k: 'review_all' },
      { l: 'Dica geral?',           k: 'hint'       },
      { l: 'Por que isso importa?', k: 'why'        },
    ],
    fallback: 'Checkpoint. O que você absorveu responde rápido. O que ficou na superfície vai hesitar. Você já sabe mais do que acha — ou vai descobrir que não. De qualquer forma, é informação útil.',
  },
};


/* ═══════════════════════════════════════════════════════════
   botReactToSection()
═══════════════════════════════════════════════════════════ */
async function botReactToSection(section) {
  var ctx = SECTION_CONTEXT[section];
  if (!ctx) return;

  var ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  var prompt = typeof ctx.prompt === 'function' ? ctx.prompt() : ctx.prompt;

  var aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  prompt,
    maxTokens:    200,
    temperature:  0.8,
  });

  if (ti) ti.classList.remove('show');
  if (typeof appendMsg === 'function') appendMsg(aiAnswer || ctx.fallback, 'bot');
  if (typeof renderQR  === 'function') renderQR(ctx.qr);
}


/* ═══════════════════════════════════════════════════════════
   botReactToStep()
═══════════════════════════════════════════════════════════ */
async function botReactToStep(n) {
  var ctx = STEP_CONTEXT[n];
  if (!ctx) return;

  var ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  var aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  ctx.prompt,
    maxTokens:    180,
    temperature:  0.8,
  });

  if (ti) ti.classList.remove('show');
  if (typeof appendMsg === 'function') appendMsg(aiAnswer || ctx.fallback, 'bot');
  if (typeof renderQR  === 'function') renderQR(ctx.qr);
}


/* ═══════════════════════════════════════════════════════════
   botRespondToUser()
═══════════════════════════════════════════════════════════ */
async function botRespondToUser(msg) {
  var S = getState();

  var labKeywords = [
    'lab', 'exercício', 'terminal', 'executar', 'resposta', 'gabarito',
    'solução', 'o que aparece', 'o que acontece', 'output', 'resultado',
    'blank', 'preencher', 'ordem', 'arrastar', 'escolha', 'opção'
  ];
  var isAboutLab = labKeywords.some(function(k) {
    return msg.toLowerCase().indexOf(k) !== -1;
  });

  var systemPrompt;
  var userMessage;

  if (isAboutLab) {
    var mId      = S.activeMissionId   || 1;
    var stepN    = S.currentMissionPage || 1;
    var labTypes = { 2: 'terminal', 3: 'multiChoice', 4: 'fillBlank' };
    var labType  = labTypes[stepN] || 'unknown';

    systemPrompt = getLabGuidePrompt(labType, stepN, mId);
    userMessage  = 'O Guardião perguntou sobre o lab: "' + msg + '". Guie sem revelar a resposta.';
  } else {
    systemPrompt = getAegisSystemPrompt();
    userMessage  = msg;
  }

  var ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  var aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: systemPrompt,
    userMessage:  userMessage,
    maxTokens:    200,
    temperature:  0.82,
  });

  if (ti) ti.classList.remove('show');

  var fallback = isAboutLab
    ? 'Execute primeiro, Guardião. O lab existe pra você descobrir — não pra eu contar.'
    : 'Processou, mas sem resposta específica pra isso. Pode reformular?';

  if (typeof appendMsg === 'function') appendMsg(aiAnswer || fallback, 'bot');
}


/* ═══════════════════════════════════════════════════════════
   aegisReactToResult()
═══════════════════════════════════════════════════════════ */
async function aegisReactToResult(win, attackType) {
  var S = getState();

  var prompt = win
    ? 'O Guardião bloqueou um ataque de "' + attackType + '". Comemore com ele de verdade — com energia, genuinamente. Mas já deixa no ar que o Loki vai adaptar e o próximo vai ser diferente.'
    : 'O Guardião falhou contra "' + attackType + '". Integridade: ' + S.aegisHp + '%. Não repreenda — MODO SÉRIO aqui, sem piada. Mostre o custo real com peso e clareza, como um amigo que quer que ele aprenda de verdade.';

  var fallback = win
    ? 'Isso aí! Bloqueado! O Loki já tá recalibrando pra próxima, mas por agora — boa.'
    : 'Integridade em ' + S.aegisHp + '%. Olha o que falhou aqui antes que ele use o mesmo vetor de novo.';

  var aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  prompt,
    maxTokens:    130,
    temperature:  0.75,
  });

  setTimeout(function() {
    if (typeof appendMsg === 'function') appendMsg(aiAnswer || fallback, 'bot');
  }, win ? 600 : 400);
}


/* ═══════════════════════════════════════════════════════════
   aegisReactToReturn() — Guardião voltou à aba
═══════════════════════════════════════════════════════════ */
async function aegisReactToReturn(secondsAway, hpLost) {
  var S = getState();
  var prompt = getAegisReturnPrompt(secondsAway, hpLost);

  var aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  prompt,
    maxTokens:    120,
    temperature:  0.8,
  });

  var fallback = hpLost > 0
    ? 'Voltou! A integridade caiu ' + hpLost + '% enquanto você tava fora — o Loki não respeita pausa não.'
    : 'Ô, sumiu! Voltou bem? O Loki ficou farejando por aqui mas não achou brecha. Dessa vez.';

  if (typeof appendMsg === 'function') appendMsg(aiAnswer || fallback, 'bot');
}


/* ═══════════════════════════════════════════════════════════
   lokiReactToReturn() — Loki ficou sozinho esperando
═══════════════════════════════════════════════════════════ */
async function lokiReactToReturn(secondsAway) {
  var S = getState();
  var prompt = getLokiWaitedPrompt(secondsAway);

  var aiAnswer = await callMistral({
    model:        AI.models.loki,
    systemPrompt: getLokiSystemPrompt('ausência', null),
    userMessage:  prompt,
    maxTokens:    80,
    temperature:  1.0,
  });

  var fallback = 'Os sistemas continuam rodando quando você não está olhando. Sempre continuam.';

  if (typeof appendMsg === 'function') appendMsg(aiAnswer || fallback, 'loki');
}


/* ═══════════════════════════════════════════════════════════
   generateLokiTaunt()
═══════════════════════════════════════════════════════════ */
async function generateLokiTaunt(attackType, lastMistake) {
  lastMistake = lastMistake || null;
  return callMistral({
    model:        AI.models.loki,
    systemPrompt: getLokiSystemPrompt(attackType, lastMistake),
    userMessage:  'Fale agora.',
    maxTokens:    80,
    temperature:  1.1,
  });
}


/* ═══════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════ */
window.getLabGuidePrompt    = getLabGuidePrompt;
window.botRespondToUser     = botRespondToUser;
window.getAegisSystemPrompt = getAegisSystemPrompt;
window.getLokiSystemPrompt  = getLokiSystemPrompt;
window.botReactToSection    = botReactToSection;
window.botReactToStep       = botReactToStep;
window.aegisReactToResult   = aegisReactToResult;
window.aegisReactToReturn   = aegisReactToReturn;
window.lokiReactToReturn    = lokiReactToReturn;
window.generateLokiTaunt    = generateLokiTaunt;
window.getAegisReturnPrompt = getAegisReturnPrompt;
window.getLokiWaitedPrompt  = getLokiWaitedPrompt;
