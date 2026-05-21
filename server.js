require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const MISTRAL_KEY          = process.env.MISTRAL_KEY;

if (!SUPABASE_URL) {
  console.error('\n[server] FATAL: SUPABASE_URL não configurada.');
  console.error('[server] Copie .env.example para .env e preencha as variáveis.\n');
  process.exit(1);
}
/* ═══════════════════════════════════════════════════════════
   TABELA DE VERDADE DO JOGO
═══════════════════════════════════════════════════════════ */
const MISSION_XP = {
  1: 200,
  2: 300,
  3: 400,
  4: 500,
  5: 600,
  6: 1000,
};

const VALID_MISSION_IDS     = new Set([1, 2, 3, 4, 5, 6]);
const XP_PER_LOKI_BLOCK     = 80;
const MAX_LOKI_BLOCKS_TOTAL = 200;
const MAX_FAILS             = 9999;
const HP_MIN                = 0;
const HP_MAX                = 100;
const _missionTokens = new Map();
const MISSION_TOKEN_TTL = 2 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of _missionTokens) {
    if (data.expiresAt < now) _missionTokens.delete(token);
  }
}, 30 * 60 * 1000);

/* ═══════════════════════════════════════════════════════════
   recalculateScore
═══════════════════════════════════════════════════════════ */
function recalculateScore(completedMissions, rawBlocks) {
  const missions    = Array.isArray(completedMissions) ? completedMissions : [];
  const uniqueValid = [...new Set(missions)].filter(id => VALID_MISSION_IDS.has(Number(id)));
  const missionXP   = uniqueValid.reduce((sum, id) => sum + (MISSION_XP[Number(id)] || 0), 0);
  const blocks      = Math.min(Math.max(0, Math.floor(Number(rawBlocks) || 0)), MAX_LOKI_BLOCKS_TOTAL);
  const blocksXP    = blocks * XP_PER_LOKI_BLOCK;

  return {
    score:         missionXP + blocksXP,
    cleanMissions: uniqueValid,
    cleanBlocks:   blocks,
  };
}

/* ─── Middlewares ────────────────────────────────────────── */
app.use(cors({ origin: [`http://localhost:${PORT}`, 'http://127.0.0.1:' + PORT] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

/* ═══════════════════════════════════════════════════════════
   requireAuth — verifica JWT do Supabase
═══════════════════════════════════════════════════════════ */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const user = await verifyRes.json();
    if (!user?.id) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.userId    = user.id;
    req.userToken = token;
    next();
  } catch (e) {
    console.error('[server] erro ao verificar token:', e.message);
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
}

/* ═══════════════════════════════════════════════════════════
   validateBasicPayload
═══════════════════════════════════════════════════════════ */
function validateBasicPayload(body) {
  const errors = [];

  const fails   = Number(body.fails    ?? 0);
  const aegisHp = Number(body.aegis_hp ?? 100);
  const blocks  = Number(body.blocks   ?? 0);

  if (!Number.isFinite(fails) || fails < 0 || fails > MAX_FAILS)
    errors.push(`fails inválido: ${fails}`);

  if (!Number.isFinite(aegisHp) || aegisHp < HP_MIN || aegisHp > HP_MAX)
    errors.push(`aegis_hp inválido: ${aegisHp}`);

  if (!Number.isFinite(blocks) || blocks < 0)
    errors.push(`blocks inválido: ${blocks}`);

  if (body.completed_missions !== undefined) {
    if (!Array.isArray(body.completed_missions)) {
      errors.push('completed_missions deve ser array');
    } else {
      const invalid = body.completed_missions.filter(m => !VALID_MISSION_IDS.has(Number(m)));
      if (invalid.length > 0)
        errors.push(`completed_missions contém IDs desconhecidos: ${invalid}`);
      if (body.completed_missions.length > VALID_MISSION_IDS.size)
        errors.push('completed_missions tem mais itens que o total de missões');
    }
  }

  if (body.score !== undefined) {
    const sentScore = Number(body.score);
    const { score: expectedScore } = recalculateScore(body.completed_missions, body.blocks);
    if (sentScore > expectedScore * 1.10 + 50) {
      console.warn(`[server] ⚠ score suspeito: enviado=${sentScore}, esperado≤${expectedScore}`);
    }
  }

  return errors;
}

async function fetchCurrentStats(userId) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${userId}&select=fails,aegis_hp,blocks`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (r.ok) {
      const rows = await r.json();
      if (rows[0]) {
        return {
          fails:    rows[0].fails    ?? 0,
          aegis_hp: rows[0].aegis_hp ?? 100,
          blocks:   rows[0].blocks   ?? 0,
        };
      }
    }
  } catch (e) {
    console.warn('[server] aviso ao buscar stats atuais:', e.message);
  }
  return { fails: 0, aegis_hp: 100, blocks: 0 };
}

/* ═══════════════════════════════════════════════════════════
   POST /api/ranking/save
═══════════════════════════════════════════════════════════ */
app.post('/api/ranking/save', requireAuth, async (req, res) => {
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY não configurada' });
  }

  const errors = validateBasicPayload(req.body);
  if (errors.length > 0) {
    console.warn('[server] ⚠ payload rejeitado:', errors, '| user:', req.userId);
    return res.status(400).json({ error: 'Dados inválidos', details: errors });
  }

  const { nick, fails, aegis_hp, completed_missions } = req.body;

  const { score, cleanMissions, cleanBlocks } = recalculateScore(
    completed_missions,
    req.body.blocks
  );

  const current = await fetchCurrentStats(req.userId);

  const incomingFails = Math.floor(Number(fails    ?? 0));
  const incomingHp    = Math.floor(Number(aegis_hp ?? 100));

  const finalBlocks = Math.max(current.blocks, cleanBlocks);

  const { score: finalScore } = recalculateScore(cleanMissions, finalBlocks);

  const payload = {
    user_id:            req.userId,
    nick:               String(nick || 'Guardião').slice(0, 30),
    score:              finalScore,
    blocks:             finalBlocks,
    fails:              Math.max(current.fails, incomingFails),
    aegis_hp:           Math.min(current.aegis_hp, incomingHp),
    missions:           cleanMissions.length,
    completed_missions: cleanMissions,
    updated_at:         new Date().toISOString(),
  };

  console.log('[server] ranking save →', {
    userId:   req.userId,
    nick:     payload.nick,
    score:    payload.score,
    missions: payload.missions,
    blocks:   payload.blocks,
    fails:    payload.fails,
    aegis_hp: payload.aegis_hp,
  });

  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${req.userId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!patchRes.ok) throw new Error(await patchRes.text());
    const updated = await patchRes.json();

    if (!Array.isArray(updated) || updated.length === 0) {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ranking`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(payload),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        if (!errText.includes('23505')) throw new Error(errText);
      }
    }

    return res.json({
      ok:       true,
      score:    payload.score,
      blocks:   payload.blocks,
      fails:    payload.fails,
      aegis_hp: payload.aegis_hp,
      missions: cleanMissions.length,
    });

  } catch (e) {
    console.error('[server] erro ao salvar ranking:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   GET /api/ranking
═══════════════════════════════════════════════════════════ */
app.get('/api/ranking', async (req, res) => {
  const tab     = req.query.tab || 'global';
  const anonKey = SUPABASE_ANON_KEY;

  let endpoint = `${SUPABASE_URL}/rest/v1/ranking?select=nick,score,blocks,fails,aegis_hp,missions,updated_at&order=score.desc&limit=50`;

  if (tab === 'semanal') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    endpoint += `&updated_at=gte.${weekAgo}`;
  }
  if (tab === 'missoes') {
    endpoint = `${SUPABASE_URL}/rest/v1/ranking?select=nick,score,blocks,fails,aegis_hp,missions,updated_at&order=missions.desc,score.desc&limit=50&missions=gte.1`;
  }

  try {
    const r = await fetch(endpoint, {
      headers: {
        'apikey':        anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });
    if (!r.ok) throw new Error(await r.text());
    return res.json(await r.json());
  } catch (e) {
    console.error('[server] erro ao buscar ranking:', e.message);
    return res.status(500).json([]);
  }
});

/* ═══════════════════════════════════════════════════════════
   GET /api/ranking/me
═══════════════════════════════════════════════════════════ */
app.get('/api/ranking/me', requireAuth, async (req, res) => {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${req.userId}&select=score,blocks,fails,aegis_hp,missions,completed_missions,nick`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    return res.json(rows[0] || null);
  } catch (e) {
    console.error('[server] erro ao buscar /me:', e.message);
    return res.status(500).json(null);
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/mission/start
═══════════════════════════════════════════════════════════ */
app.post('/api/mission/start', requireAuth, async (req, res) => {
  const missionId = Number(req.body?.mission_id);

  if (!VALID_MISSION_IDS.has(missionId)) {
    return res.status(400).json({ error: `mission_id inválido: ${missionId}` });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${req.userId}&select=completed_missions`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (r.ok) {
      const rows      = await r.json();
      const completed = rows[0]?.completed_missions || [];
      if (completed.includes(missionId)) {
        console.log(`[server] missão ${missionId} já concluída para user ${req.userId}`);
        return res.json({ already_completed: true });
      }
    }
  } catch (e) {
    console.warn('[server] aviso ao checar missão concluída:', e.message);
  }

  const token = crypto.randomBytes(32).toString('hex');
  _missionTokens.set(token, {
    userId:    req.userId,
    missionId,
    expiresAt: Date.now() + MISSION_TOKEN_TTL,
  });

  console.log(`[server] missão ${missionId} iniciada para user ${req.userId} ✓`);
  return res.json({ mission_token: token });
});

/* ═══════════════════════════════════════════════════════════
   POST /api/mission/complete
═══════════════════════════════════════════════════════════ */
app.post('/api/mission/complete', requireAuth, async (req, res) => {
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY não configurada' });
  }

  const { mission_token } = req.body;

  if (!mission_token) {
    return res.status(400).json({ error: 'mission_token não fornecido' });
  }

  const tokenData = _missionTokens.get(mission_token);

  if (!tokenData) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  if (tokenData.userId !== req.userId) {
    console.warn(`[server] ⚠ token de outro usuário! owner=${tokenData.userId} req=${req.userId}`);
    return res.status(403).json({ error: 'Token não pertence a este usuário' });
  }

  if (tokenData.expiresAt < Date.now()) {
    _missionTokens.delete(mission_token);
    return res.status(400).json({ error: 'Token expirado — reinicie a missão' });
  }

  const { missionId } = tokenData;
  _missionTokens.delete(mission_token);

  console.log(`[server] concluindo missão ${missionId} para user ${req.userId}...`);

  try {
    const meRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${req.userId}&select=score,blocks,fails,aegis_hp,missions,completed_missions,nick`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    let currentRow = null;
    if (meRes.ok) {
      const rows = await meRes.json();
      currentRow = rows[0] || null;
    }

    const existingMissions = Array.isArray(currentRow?.completed_missions)
      ? currentRow.completed_missions
      : [];

    if (existingMissions.includes(missionId)) {
      console.log(`[server] missão ${missionId} já estava concluída`);
      const { score, cleanBlocks } = recalculateScore(existingMissions, currentRow?.blocks || 0);
      return res.json({
        ok:       true,
        score,
        blocks:   cleanBlocks,
        missions: existingMissions.length,
      });
    }

    const updatedMissions = [...existingMissions, missionId];

    const { score, cleanMissions, cleanBlocks } = recalculateScore(
      updatedMissions,
      currentRow?.blocks || 0
    );

    const payload = {
      user_id:            req.userId,
      nick:               currentRow?.nick || 'Guardião',
      score,
      blocks:             cleanBlocks,
      fails:              currentRow?.fails    ?? 0,
      aegis_hp:           currentRow?.aegis_hp ?? 100,
      missions:           cleanMissions.length,
      completed_missions: cleanMissions,
      updated_at:         new Date().toISOString(),
    };

    if (currentRow) {
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/ranking?user_id=eq.${req.userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify(payload),
        }
      );
      if (!patchRes.ok) throw new Error(await patchRes.text());
    } else {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ranking`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (!insertRes.ok) throw new Error(await insertRes.text());
    }

    console.log(`[server] missão ${missionId} concluída ✓ score=${score} missions=${cleanMissions.length}`);

    return res.json({
      ok:       true,
      score,
      blocks:   cleanBlocks,
      missions: cleanMissions.length,
    });

  } catch (e) {
    console.error('[server] erro ao concluir missão:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/chat — proxy Mistral (autenticado)
═══════════════════════════════════════════════════════════ */
app.post('/api/chat', requireAuth, async (req, res) => {
  if (!MISTRAL_KEY) {
    return res.status(500).json({ error: 'MISTRAL_KEY não configurada no .env' });
  }

  const { model, messages, max_tokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Campo messages obrigatório' });
  }

  const safeMaxTokens = Math.min(Number(max_tokens) || 300, 500);

  try {
    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`,
      },
      body: JSON.stringify({
        model:       model       || 'mistral-small-latest',
        max_tokens:  safeMaxTokens,
        temperature: temperature || 0.7,
        messages,
      }),
    });

    if (!mistralRes.ok) {
      const errText = await mistralRes.text();
      console.error('[server] Mistral error:', mistralRes.status, errText);
      return res.status(mistralRes.status).json({ error: errText });
    }

    return res.json(await mistralRes.json());

  } catch (e) {
    console.error('[server] fetch Mistral error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* ─── Start ──────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n ✓ ÆGIS server em http://localhost:${PORT}`);
  console.log(` ✓ Score:    calculado server-side — frontend não controla`);
  console.log(` ✓ fails:    só sobe — nunca sobrescreve com valor menor`);
  console.log(` ✓ blocks:   só sobe — nunca sobrescreve com valor menor`);
  console.log(` ✓ aegis_hp: só cai  — nunca sobrescreve com valor maior`);
  console.log(` ✓ Mistral:  ${MISTRAL_KEY          ? 'configurado ✓' : '⚠ MISTRAL_KEY ausente'}`);
  console.log(` ✓ Supabase: ${SUPABASE_SERVICE_KEY ? 'service key ✓' : '⚠ SUPABASE_SERVICE_KEY ausente'}\n`);
});
