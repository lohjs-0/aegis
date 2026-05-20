# Contributing to ÆGIS

```
> ÆGIS CONTRIBUTION PROTOCOL
> Every Guardian who improves this platform defends all others.
```

Thank you for considering contributing to ÆGIS. This document explains how to get involved, whether you're fixing a bug, adding a mission, improving the AI tutor, or proposing new attack vectors.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What You Can Contribute](#what-you-can-contribute)
- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding Missions](#adding-missions)
- [Adding Loki Attacks](#adding-loki-attacks)
- [Reporting Bugs](#reporting-bugs)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful. Be constructive. Help each other learn.

---

## What You Can Contribute

```
TYPE              EXAMPLES
──────────────────────────────────────────────────────────────
Bug fixes         UI glitches, logic errors, broken state sync
New missions      New security vectors, attack scenarios
Loki attacks      New payload types, adaptive taunts
AI improvements   Better system prompts, local answer coverage
Translations      Platform content in other languages
Documentation     Setup guides, architecture explanations
Accessibility     Screen reader support, keyboard navigation
Performance       Load time, animation, state management
```

---

## Getting Started

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/aegis.git
cd aegis

# 3. Install dependencies
npm install

# 4. Copy the environment file
cp .env.example .env
# Fill in your MISTRAL_KEY, SUPABASE keys

# 5. Run in development mode
npm run dev

# 6. Open the platform
# http://localhost:3000
```

---

## Branch Naming

```
feature/short-description       → new features
fix/what-was-broken             → bug fixes
mission/mission-name            → new missions
attack/attack-type              → new Loki attacks
docs/what-was-documented        → documentation only
refactor/what-was-refactored    → code improvements without behavior change
```

Examples:
```
feature/pvp-guardian-mode
fix/ranking-score-not-persisting
mission/07-deserialization
attack/jwt-none-algorithm
docs/supabase-rls-setup
```

---

## Commit Messages

Follow this format:

```
type(scope): short description

Optional longer explanation if needed.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(missions): add Mission 07 — Insecure Deserialization
fix(ranking): prevent score regression on page reload
docs(contributing): add mission authoring guide
refactor(ai-router): replace Mistral endpoint with server proxy
```

---

## Pull Request Process

1. Make sure your branch is up to date with `main`
2. Keep PRs focused — one concern per PR
3. Include a clear description of what changed and why
4. Reference any related issues (`Closes #42`)
5. Screenshots or console logs are welcome for UI/behavior changes
6. A maintainer will review within a few days

```bash
# Keep your branch updated
git fetch origin
git rebase origin/main
```

---

## Adding Missions

Missions live in `js/missions-data.js`. Each mission follows this structure:

```javascript
{
  id:         7,
  slug:       'insecure-deserialization',
  title:      'The Corrupted Object',
  vector:     'Insecure Deserialization',
  difficulty: '★★★★☆',
  time:       '~40 min',
  xp:         500,
  unlocked:   false,
  rune:       'object',
  runeIcon:   '◈',

  briefing: {
    objetivo: 'Identify and block insecure deserialization in Lambda functions.',
    contexto: '...',
    impacto:  '...',
  },

  steps: [
    { id: 1, title: 'context',   content: '...', diagram: '...', aegisTip: '...' },
    { id: 2, title: 'the attack', vulnLabel: '...', vulnCode: '...', attackBox: { title: '...', content: '...' }, aegisTip: '...' },
    { id: 3, title: 'the defense', defensePoints: [], secureLabel: '...', secureCode: '...', aegisTip: '...' },
    { id: 4, title: 'checkpoint', aegisTip: '...' },
  ],

  quiz: [
    { q: '...', opts: ['...', '...', '...', '...'], correct: 0, exp: '...' },
  ],
}
```

**Mission authoring guidelines:**
- Vulnerable code must reflect a real, documented CVE class
- Defense must implement at least 2 independent layers
- Quiz questions should test understanding, not memorization
- `aegisTip` should read as ÆGIS-BOT talking directly to the Guardian
- Keep HTML in content fields minimal — use `<span class="hl">`, `<code>`, `<span class="danger">`, `<span class="warn">`

---

## Adding Loki Attacks

Attacks live in `js/missions-attacks.js`. Each attack:

```javascript
{
  payload:    'report.pdf; cat /etc/passwd',
  type:       'Command Injection — chained',
  level:      2,
  missionId:  1,
  taunt:      '<span class="lk-hl">Classic chain.</span> You left the shell exposed.',
  choices: [
    { t: 'Validate with execFile()',       ok: true,  fb: '✓ No shell — ; is literal text.' },
    { t: 'Sanitize with replace()',        ok: false, fb: '❌ String replacement misses edge cases.' },
    { t: 'Log and continue',              ok: false, fb: '❌ Logging without blocking is useless.' },
    { t: 'Convert input to uppercase',    ok: false, fb: '❌ Case doesn\'t neutralize ; or &&.' },
  ],
}
```

**Attack authoring guidelines:**
- Payloads must be realistic — based on actual exploit patterns
- Always include exactly one correct choice
- Wrong feedback should explain *why* the approach fails
- `taunt` should be cold and technically specific, never generic

---

## Reporting Bugs

Open an [issue](https://github.com/lohjs-0/aegis/issues) with:

```
**Description**
What happened vs what you expected.

**Steps to reproduce**
1. Go to...
2. Click...
3. See...

**Environment**
- Browser:
- OS:
- Node version:

**Console errors** (if any)
```

---

## Security Vulnerabilities

If you find a real security vulnerability in the ÆGIS platform itself — not a simulated one — **do not open a public issue.**

Contact the maintainer directly via GitHub or email before disclosing publicly. We'll work together to fix it responsibly.

---

```
> The Loki's Shadows threat model improves with every contribution.
> Every Guardian who contributes makes the platform stronger.
```
