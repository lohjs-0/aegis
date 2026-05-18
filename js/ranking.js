const SUPABASE_URL  = "https://feyuowaurlwctogamzmk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleXVvd2F1cmx3Y3RvZ2Ftem1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTI5OTgsImV4cCI6MjA5MzkyODk5OH0.1hbK0qhgBLtKSaiMHzkYs4AOeDroZMf6xn2FyTmBKNM";

const NICK_KEY    = "aegis_guardian_nick";
const PERSIST_KEY = "aegis_state_persist"; 

function _getPersistKey() {
  const uid = _getUserId();
  return uid ? `${PERSIST_KEY}:${uid}` : null;
}

if (typeof window._rankingReady === "undefined") {
  window._rankingReady = true;
}

/* ─── Auth ───────────────────────────────────────────────── */
function _getAccessToken() {
  return window._supabaseSession?.access_token || null;
}
function _getAuthHeader() {
  const token = _getAccessToken();
  return "Bearer " + (token || SUPABASE_ANON);
}
function _getUserId() {
  return window._supabaseSession?.user?.id || null;
}

/* ─── Nick ───────────────────────────────────────────────── */
function getNickname() {
  return (
    window.AEGIS_NICK ||
    window.__aegisNickReady?.nick ||
    localStorage.getItem(NICK_KEY) ||
    ""
  );
}

/* ─── Snapshot do STATE local ────────────────────────────── */
function getStateSnapshot() {
  const S         = window.STATE || {};
  const completed = Array.isArray(S.completedMissions) ? S.completedMissions : [];
  return {
    score:             S.score     || 0,
    blocks:            S.blocks    || 0,
    fails:             S.fails     || 0,
    aegisHp:           S.aegisHp   ?? 100,
    lokiLevel:         S.lokiLevel || 1,
    missions:          completed.length,
    completedMissions: completed,
    activeMissionId:   S.activeMissionId || 1,
  };
}

/* ═══════════════════════════════════════════════════════════
   LIMPEZA DE CONTA
═══════════════════════════════════════════════════════════ */
function clearOtherAccountData() {
  const currentUid = _getUserId();
  const currentKey = currentUid ? `${PERSIST_KEY}:${currentUid}` : null;

  Object.keys(localStorage)
    .filter(k => k.startsWith("aegis_") && k !== NICK_KEY && k !== currentKey)
    .forEach(k => {
      console.log("[ranking] removendo chave de outra conta:", k);
      localStorage.removeItem(k);
    });
}

/* ─── Zera STATE em memória (sem disparar Proxy/save) ───── */
function _resetStateToZero() {
  const S = window.STATE?.__target__ || window.STATE;
  if (!S) return;
  _syncingFromServer = true;
  try {
    S.score             = 0;
    S.blocks            = 0;
    S.fails             = 0;
    S.aegisHp           = 100;
    S.lokiLevel         = 1;
    S.completedMissions = [];
    S.activeMissionId   = 1;
  } finally {
    _syncingFromServer = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   PERSISTÊNCIA LOCAL — chave isolada por user_id
═══════════════════════════════════════════════════════════ */
function persistStateLocally() {
  const key = _getPersistKey();
  if (!key) return;
  try {
    const snap = getStateSnapshot();
    const MS   = typeof MISSION_STATE !== "undefined" ? MISSION_STATE : {};

    localStorage.setItem(key, JSON.stringify({
      score:              snap.score,
      blocks:             snap.blocks,
      fails:              snap.fails,
      aegisHp:            snap.aegisHp,
      lokiLevel:          snap.lokiLevel,
      completedMissions:  snap.completedMissions,
      activeMissionId:    MS.activeMissionId || snap.activeMissionId || 1,
      missionCurrentStep: MS.currentStep || 0,
    }));
  } catch (e) {
    console.warn("[ranking] erro ao persistir localmente:", e.message);
  }
}

/* ─── Restaura STATE do localStorage da conta atual ──────── */
function restoreStateFromLocal() {
  const key = _getPersistKey();
  if (!key) return false;
  _syncingFromServer = true;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const S    = window.STATE;
    if (!S) return false;

    S.score     = data.score    || 0;
    S.blocks    = data.blocks   || 0;
    S.fails     = data.fails    || 0;
    S.lokiLevel = data.lokiLevel || 1;
    S.aegisHp   = data.aegisHp ?? S.aegisHp ?? 100;
    S.completedMissions = Array.isArray(data.completedMissions) ? data.completedMissions : [];
    S.activeMissionId   = data.activeMissionId || 1;

    if (typeof MISSION_STATE !== "undefined") {
      MISSION_STATE.activeMissionId = S.activeMissionId;
      if (!S.completedMissions.includes(S.activeMissionId)) {
        MISSION_STATE.currentStep = data.missionCurrentStep || 0;
      }
    }

    console.log("[ranking] STATE restaurado do localStorage ✓", data);
    return true;
  } catch (e) {
    console.warn("[ranking] erro ao restaurar estado:", e.message);
    return false;
  } finally {
    _syncingFromServer = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   SAVE — via /api/ranking/save
═══════════════════════════════════════════════════════════ */
async function saveScoreToRanking(nick) {
  if (!nick) return;

  const token = _getAccessToken();
  if (!token) {
    console.warn("[ranking] sem token — save ignorado (usuário não autenticado)");
    return;
  }

  const snap = getStateSnapshot();

  const payload = {
    nick,
    score:              snap.score,
    blocks:             snap.blocks,
    fails:              snap.fails,
    aegis_hp:           snap.aegisHp,
    missions:           snap.missions,
    completed_missions: snap.completedMissions,
  };

  console.log("[ranking] salvando via servidor →", {
    nick,
    score:    snap.score,
    blocks:   snap.blocks,
    fails:    snap.fails,
    aegis_hp: snap.aegisHp,
    missions: snap.missions,
  });

  try {
    const res = await fetch('/api/ranking/save', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[ranking] save rejeitado pelo servidor:", err.error, err.details);
      return;
    }

    const confirmed = await res.json();

    if (confirmed?.score !== undefined && window.STATE) {
      const S = window.STATE.__target__ || window.STATE;

      /* Aplica todos os valores confirmados pelo servidor */
      if (confirmed.score !== S.score) {
        console.log(`[ranking] score corrigido: ${S.score} → ${confirmed.score} (server-side)`);
        S.score = confirmed.score;
      }
      if (confirmed.blocks !== undefined && confirmed.blocks !== S.blocks) {
        S.blocks = confirmed.blocks;
      }
      if (confirmed.fails !== undefined && confirmed.fails !== S.fails) {
        S.fails = confirmed.fails;
      }
      if (confirmed.aegis_hp !== undefined && confirmed.aegis_hp !== S.aegisHp) {
        S.aegisHp = confirmed.aegis_hp;
      }

      if (typeof updateHUD === 'function') updateHUD();
      persistStateLocally();
    }

    console.log("[ranking] salvo ✓ score server-side:", confirmed?.score);

  } catch (e) {
    console.warn("[ranking] erro ao salvar:", e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   MISSÃO: START
═══════════════════════════════════════════════════════════ */
let _activeMissionToken = null;

async function startMission(missionId) {
  const token = _getAccessToken();
  if (!token) {
    console.warn("[ranking] startMission: sem token de autenticação");
    return null;
  }

  try {
    const res = await fetch('/api/mission/start', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ mission_id: missionId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[ranking] startMission rejeitado:", err.error);
      return null;
    }

    const data = await res.json();
    if (data.already_completed) {
      console.log(`[ranking] missão ${missionId} já concluída anteriormente`);
      return null;
    }

    _activeMissionToken = data.mission_token;
    console.log(`[ranking] missão ${missionId} iniciada ✓ token obtido`);
    return data.mission_token;

  } catch (e) {
    console.warn("[ranking] erro ao iniciar missão:", e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   MISSÃO: COMPLETE
═══════════════════════════════════════════════════════════ */
async function completeMission(missionId, xpReward) {
  const token = _getAccessToken();

  if (!_activeMissionToken) {
    console.warn("[ranking] completeMission: sem mission_token — usando fluxo legado");
    if (typeof onMissionCompleted === 'function') {
      onMissionCompleted(missionId, xpReward);
    }
    return;
  }

  if (!token) {
    console.warn("[ranking] completeMission: sem token de autenticação");
    return;
  }

  const missionToken = _activeMissionToken;
  _activeMissionToken = null;

  try {
    const res = await fetch('/api/mission/complete', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ mission_token: missionToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[ranking] completeMission rejeitado:", err.error);
      return;
    }

    const confirmed = await res.json();

    if (confirmed?.ok && window.STATE) {
      const S         = window.STATE.__target__ || window.STATE;
      const stateSnap = getStateSnapshot();

      if (!stateSnap.completedMissions.includes(missionId)) {
        S.completedMissions = [...stateSnap.completedMissions, missionId];
      }
      if (confirmed.score  !== undefined) S.score  = confirmed.score;
      if (confirmed.blocks !== undefined) S.blocks = confirmed.blocks;

      if (typeof updateHUD           === 'function') updateHUD();
      if (typeof persistStateLocally === 'function') persistStateLocally();

      console.log(`[ranking] missão ${missionId} concluída ✓ score=${confirmed.score}`);
    }

  } catch (e) {
    console.warn("[ranking] erro ao concluir missão:", e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   UPDATE NICK
═══════════════════════════════════════════════════════════ */
async function updateNickInRanking(newNick) {
  if (!newNick) return;
  const token = _getAccessToken();
  if (!token) return;

  try {
    const snap = getStateSnapshot();
    const res  = await fetch('/api/ranking/save', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        nick:               newNick,
        score:              snap.score,
        blocks:             snap.blocks,
        fails:              snap.fails,
        aegis_hp:           snap.aegisHp,
        missions:           snap.missions,
        completed_missions: snap.completedMissions,
      }),
    });
    if (res.ok) console.log("[ranking] nick atualizado ✓", newNick);
  } catch (e) {
    console.warn("[ranking] erro ao atualizar nick:", e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   SYNC DO SERVIDOR → STATE local
═══════════════════════════════════════════════════════════ */
let _syncingFromServer = false;

async function syncFromServer() {
  if (_syncingFromServer) return;
  const token = _getAccessToken();
  if (!token) return;

  _syncingFromServer = true;
  try {
    const res = await fetch('/api/ranking/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return;
    const remote = await res.json();
    if (!remote) {
      console.log("[ranking] sem registro no servidor ainda");
      return;
    }

    const S      = window.STATE;
    if (!S) return;
    const target = S.__target__ || S;

    /* score: pega o maior */
    if ((remote.score || 0) >= (target.score || 0)) {
      target.score = remote.score || 0;
    }

    /* blocks: pega o maior */
    if ((remote.blocks || 0) > (target.blocks || 0)) {
      target.blocks = remote.blocks;
    }

    /* fails: pega o maior */
    if ((remote.fails || 0) > (target.fails || 0)) {
      target.fails = remote.fails;
    }

    /* aegis_hp: pega o menor (hp só cai) */
    if (remote.aegis_hp != null && remote.aegis_hp < (target.aegisHp ?? 100)) {
      target.aegisHp = remote.aegis_hp;
    }

    target.lokiLevel = Math.max(target.lokiLevel || 1, remote.loki_level || 1);

    if (
      Array.isArray(remote.completed_missions) &&
      remote.completed_missions.length > (target.completedMissions?.length || 0)
    ) {
      target.completedMissions = remote.completed_missions;
      const maxCompleted = Math.max(0, ...remote.completed_missions);
      const nextId       = maxCompleted + 1;
      if (nextId >= 1 && nextId <= 6) {
        target.activeMissionId = nextId;
        if (typeof MISSION_STATE !== "undefined") MISSION_STATE.activeMissionId = nextId;
      }
    }

    persistStateLocally();
    if (typeof updateActiveMissionCard === "function") updateActiveMissionCard();
    if (typeof updateHUD               === "function") updateHUD();

    console.log("[ranking] STATE sincronizado com servidor ✓", remote);
  } catch (e) {
    console.warn("[ranking] erro ao sincronizar:", e.message);
  } finally {
    _syncingFromServer = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   BUSCAR RANKING
═══════════════════════════════════════════════════════════ */
async function fetchRanking(tab = "global") {
  try {
    const res = await fetch(`/api/ranking?tab=${tab}`);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    console.warn("[ranking] erro ao buscar ranking:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS UI
═══════════════════════════════════════════════════════════ */
function getLevelTitle(score) {
  if (score >= 5000) return "ELITE";
  if (score >= 4000) return "Guardião V";
  if (score >= 3000) return "Guardião IV";
  if (score >= 2000) return "Guardião III";
  if (score >= 1000) return "Guardião II";
  return "Guardião I";
}
function getLevelColor(pos) {
  if (pos === 1) return "var(--yellow)";
  if (pos === 2) return "#c0c0c0";
  if (pos === 3) return "#cd7f32";
  return "var(--green)";
}
function getHpColor(hp) {
  if (hp <= 30) return "var(--red, #ff1a3c)";
  if (hp <= 60) return "var(--yellow, #f5c518)";
  return "var(--green, #00ff41)";
}
function getMissionDots(count, total = 6) {
  let dots = "";
  for (let i = 0; i < total; i++) {
    const filled = i < count;
    dots += `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:2px;
      background:${filled ? "var(--green,#00ff41)" : "rgba(0,255,65,0.15)"};
      box-shadow:${filled ? "0 0 4px var(--green-glow,rgba(0,255,65,.4))" : "none"};
      vertical-align:middle;"></span>`;
  }
  return dots;
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return m + "min atrás";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h atrás";
  return Math.floor(h / 24) + "d atrás";
}

/* ═══════════════════════════════════════════════════════════
   RENDER DA LISTA — layout responsivo mobile/desktop
═══════════════════════════════════════════════════════════ */
function renderRankingList(rows, myNick) {
  const list = document.getElementById("rankingList");
  if (!list) return;
  const tab = window.STATE?.rkTab || "global";

  if (!rows || rows.length === 0) {
    const emptyMsg =
      tab === "missoes" ? "// nenhum guardião completou missões ainda — seja o primeiro" :
      tab === "semanal" ? "// nenhuma atividade esta semana" :
                          "// nenhum guardião no ranking ainda — seja o primeiro";
    list.innerHTML = `<div style="text-align:center;padding:40px 16px;font-size:12px;color:var(--text-dim);letter-spacing:1px;">${emptyMsg}</div>`;
    return;
  }

  const mySnap       = getStateSnapshot();
  const lastColLabel = tab === "missoes" ? "MISSÕES" : "XP";
  const isMyRow      = (row) => myNick && row.nick === myNick;

  let html = `
    <div style="display:grid;grid-template-columns:32px 1fr auto auto;gap:0 8px;
      padding:6px 12px;font-size:9px;letter-spacing:2px;color:var(--text-dim);
      border-bottom:1px solid rgba(0,255,65,0.08);margin-bottom:4px;">
      <span>#</span>
      <span>GUARDIÃO</span>
      <span style="text-align:right">HP</span>
      <span style="text-align:right;${tab === "missoes" ? "color:var(--green);" : ""}">${lastColLabel}</span>
    </div>`;

  const buildRow = (row, pos, isMe, myData) => {
    const color    = getLevelColor(pos);
    const hp       = row ? (row.aegis_hp ?? 100) : (myData?.aegisHp ?? 100);
    const hpColor  = getHpColor(hp);
    const missions = row ? (row.missions || 0) : (myData?.missions || 0);
    const score    = row ? (row.score || 0) : (myData?.score || 0);
    const blocks   = row ? (row.blocks || 0) : (myData?.blocks || 0);
    const nick     = row ? row.nick : myNick;
    const updAt    = row ? row.updated_at : null;
    const medal    = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "";
    const posLabel = medal || String(pos === 0 ? "—" : pos).padStart(2, "0");

    const rowStyle = isMe
      ? "background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.25);"
      : pos <= 3
        ? "background:rgba(0,255,65,0.03);border:1px solid rgba(0,255,65,0.1);"
        : "border:1px solid transparent;";

    const rightColMissoes = `
      <div style="text-align:right;min-width:48px;">
        <div style="font-size:9px;color:var(--text-dim);margin-bottom:1px;">integ.</div>
        <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);border-radius:2px;height:4px;width:48px;overflow:hidden;margin-left:auto;">
          <div style="height:100%;width:${hp}%;background:${hpColor};box-shadow:0 0 4px ${hpColor};transition:width 0.4s;"></div>
        </div>
        <div style="font-size:9px;color:${hpColor};margin-top:1px;">${hp}%</div>
        <div style="font-size:9px;color:var(--green);margin-top:4px;">${missions}/6</div>
        <div style="font-size:15px;font-family:'VT323',monospace;color:${color};line-height:1;">${score}<span style="font-size:9px;color:var(--text-dim);margin-left:2px;">xp</span></div>
      </div>`;

    const rightColDefault = `
      <div style="text-align:right;min-width:48px;">
        <div style="font-size:9px;color:var(--text-dim);margin-bottom:1px;">integ.</div>
        <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);border-radius:2px;height:4px;width:48px;overflow:hidden;margin-left:auto;">
          <div style="height:100%;width:${hp}%;background:${hpColor};box-shadow:0 0 4px ${hpColor};transition:width 0.4s;"></div>
        </div>
        <div style="font-size:9px;color:${hpColor};margin-top:1px;">${hp}%</div>
        <div style="font-size:15px;font-family:'VT323',monospace;color:${color};line-height:1;margin-top:4px;">${score}</div>
        <div style="font-size:9px;color:var(--text-dim);">XP</div>
      </div>`;

    const rightCol = tab === "missoes" ? rightColMissoes : rightColDefault;

    return `
      <div ${isMe ? 'id="myRankRow"' : ""} style="display:grid;grid-template-columns:32px 1fr auto;gap:0 8px;
        align-items:center;padding:10px 12px;margin-bottom:4px;${rowStyle}transition:background 0.2s;cursor:default;">

        <div style="font-size:13px;font-family:'VT323',monospace;color:${color};text-align:center;">${posLabel}</div>

        <div style="min-width:0;">
          <div style="font-size:12px;color:${isMe ? "var(--green)" : "var(--text-bright,#e8ffe8)"};letter-spacing:1px;
            display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${escapeHtml(nick)}</span>
            ${isMe ? '<span style="font-size:9px;color:var(--text-dim);letter-spacing:2px;flex-shrink:0;">// você</span>' : ""}
          </div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:3px;">
            <span style="color:${color};letter-spacing:1px;">${getLevelTitle(score)}</span>
          </div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            <span>${getMissionDots(missions)}</span>
            <span style="font-size:9px;color:var(--text-dim);">${missions}/6 missões</span>
            ${updAt ? `<span style="font-size:9px;color:var(--text-dim);">${timeAgo(updAt)}</span>` : ""}
          </div>
          ${blocks > 0 || (row?.fails) ? `
          <div style="margin-top:3px;font-size:9px;color:var(--text-dim);display:flex;gap:8px;">
            ${blocks > 0 ? `<span style="color:var(--green);">${blocks} bloqueios</span>` : ""}
            ${row?.fails ? `<span style="color:var(--red,#ff1a3c);">${row.fails} falhas</span>` : ""}
          </div>` : ""}
        </div>

        ${rightCol}
      </div>`;
  };

  rows.forEach((row, idx) => {
    const pos  = idx + 1;
    const isMe = isMyRow(row);
    html += buildRow(row, pos, isMe, null);
  });

  const myRow = rows.find(isMyRow);
  if (myNick && !myRow) {
    html += `
      <div style="text-align:center;padding:6px;font-size:10px;color:var(--text-dim);letter-spacing:2px;">• • •</div>`;
    html += buildRow(null, 0, true, mySnap);
  }

  list.innerHTML = html;

  const myPos     = rows.findIndex(isMyRow);
  const rankPosEl = document.getElementById("myRankPos");
  if (rankPosEl) rankPosEl.textContent = myPos >= 0 ? "#" + (myPos + 1) : "#—";
}

async function initRanking() {
  const nick = getNickname();

  restoreStateFromLocal();
  if (typeof updateHUD === 'function') updateHUD();
  await syncFromServer();
  if (nick) await saveScoreToRanking(nick);

  await refreshRankingView(nick);

  if (!nick) {
    window.addEventListener("aegis:nick-set", async (e) => {
      await saveScoreToRanking(e.detail.nick);
      await refreshRankingView(e.detail.nick);
    }, { once: true });
  }
}

async function refreshRankingView(nick) {
  const list = document.getElementById("rankingList");
  if (list) {
    list.innerHTML = `<div style="text-align:center;padding:40px;font-size:12px;color:var(--text-dim);letter-spacing:1px;">
      <span style="animation:blink 1s infinite;display:inline-block;">// carregando ranking...</span></div>`;
  }
  const rows = await fetchRanking(window.STATE?.rkTab || "global");
  renderRankingList(rows, nick || getNickname());
}

function setRkTab(tab) {
  if (window.STATE) window.STATE.rkTab = tab;
  document.querySelectorAll(".rk-tab").forEach((t) => {
    t.classList.toggle("active", t.getAttribute("data-tab") === tab);
  });
  refreshRankingView(getNickname());
}

/* ═══════════════════════════════════════════════════════════
   SYNC — debounced 800ms
═══════════════════════════════════════════════════════════ */
async function syncRankingScore() {
  const nick = getNickname();
  if (!nick) return;
  persistStateLocally();
  await new Promise(resolve => setTimeout(resolve, 0));
  await saveScoreToRanking(nick);

  if (window.STATE?.currentSection === "ranking") {
    await refreshRankingView(nick);
    return;
  }
  const myRow = document.getElementById("myRankRow");
  if (myRow) {
    const scoreEl = myRow.querySelector("#rankScore");
    if (scoreEl) scoreEl.textContent = getStateSnapshot().score;
  }
}

/* ═══════════════════════════════════════════════════════════
   PROXY — monitora STATE, debounce 800ms
═══════════════════════════════════════════════════════════ */
let _syncTimer = null;
function debouncedSync(delay = 800) {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => syncRankingScore(), delay);
}

function watchState() {
  if (!window.STATE) { setTimeout(watchState, 200); return; }
  if (window.STATE.__isProxy) return;

  const rawTarget = window.STATE;
  const handler = {
    set(target, prop, value) {
      target[prop] = value;
      if (!_syncingFromServer && [
        "score", "blocks", "fails",
        "aegisHp", "lokiLevel",
        "completedMissions", "activeMissionId",
      ].includes(prop)) {
        persistStateLocally();
        debouncedSync(800);
      }
      return true;
    },
  };

  const proxy      = new Proxy(rawTarget, handler);
  proxy.__isProxy  = true;
  proxy.__target__ = rawTarget;
  window.STATE     = proxy;
  console.log("[ranking] STATE monitorado via Proxy ✓");
}

/* ─── Auto-save 30s ─────────────────────────────────────── */
setInterval(() => {
  if (!_getAccessToken()) return;
  persistStateLocally();
  const nick = getNickname();
  if (nick) saveScoreToRanking(nick);
}, 30_000);

/* ─── Save no fechamento ─────────────────────────────────── */
window.addEventListener("beforeunload", () => {
  if (!_getAccessToken()) return;
  persistStateLocally();
});

/* ─── Nick atualizado ────────────────────────────────────── */
window.addEventListener("aegis:nick-set", async (e) => {
  setTimeout(async () => {
    await updateNickInRanking(e.detail.nick);
    await syncFromServer();
    await refreshRankingView(e.detail.nick);
  }, 150);
});

/* ═══════════════════════════════════════════════════════════
   aegis:session-ready
═══════════════════════════════════════════════════════════ */
window.addEventListener("aegis:session-ready", async () => {
  console.log("[ranking] sessão detectada — isolando conta...");
  clearOtherAccountData();
  _resetStateToZero();
  const restored = restoreStateFromLocal();
  if (restored && typeof updateHUD === 'function') updateHUD();
  await syncFromServer();
  const nick = getNickname();
  if (nick) await saveScoreToRanking(nick);
  await refreshRankingView(nick);
});

/* ─── Expõe funções globais ──────────────────────────────── */
window.updateNickInRanking   = updateNickInRanking;
window.syncRankingScore      = syncRankingScore;
window.refreshRankingView    = refreshRankingView;
window.startMission          = startMission;
window.completeMission       = completeMission;
window.persistStateLocally   = persistStateLocally;
window.restoreStateFromLocal = restoreStateFromLocal;

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", watchState);
else watchState();