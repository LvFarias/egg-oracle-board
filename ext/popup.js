const EMOJI_MAP = { "1️⃣": 1, "2️⃣": 2, "3️⃣": 3, "4️⃣": 4, "5️⃣": 5, "6️⃣": 6, "7️⃣": 7, "8️⃣": 8, "9️⃣": 9, "🔟": 10 };
let currentPendingScores = null;

function formatName(rawName) {
    return (rawName.trim().split(' ')[0] || "Unknown").substring(0, 13);
}

function setStatus(msg) {
    document.getElementById('status').innerText = msg;
}
function setOutput(html) {
    document.getElementById('output').innerHTML = html;
}

function getDbKey() {
    return "prediction_db_" + document.getElementById('groupSelect').value;
}

async function loadDB() {
    return new Promise(resolve => {
        chrome.storage.local.get([getDbKey()], (res) => {
            resolve(res[getDbKey()] || {});
        });
    });
}

async function saveDB(db) {
    const obj = {};
    obj[getDbKey()] = db;
    return new Promise(resolve => {
        chrome.storage.local.set(obj, resolve);
    });
}

async function switchGroup() {
    currentPendingScores = null;
    document.getElementById('btnUpdateGlobal').style.display = 'none';
    const db = await loadDB();
    renderTable(db, `${document.getElementById('groupSelect').value} Prediction Leaderboard`);
}

document.getElementById('groupSelect').addEventListener('change', switchGroup);
document.addEventListener('DOMContentLoaded', switchGroup);

document.getElementById('btnExport').addEventListener('click', async () => {
    const db = await loadDB();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `ranking_${document.getElementById('groupSelect').value}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
});

document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('dbImport').click();
});

document.getElementById('dbImport').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const db = JSON.parse(e.target.result);
            await saveDB(db);
            await switchGroup();
            setStatus("Backup importado com sucesso.");
        } catch (err) {
            setStatus("Erro ao importar: Arquivo inválido.");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', async () => {
    if (confirm("Tem certeza que deseja zerar o ranking deste grupo?")) {
        await saveDB({});
        switchGroup();
        setStatus("Ranking zerado.");
    }
});

async function fetchDiscord(url, token) {
    const res = await fetch(`https://discord.com/api/v9${url}`, {
        headers: { 'Authorization': token }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

document.getElementById('btnProcess').addEventListener('click', () => {
    const answers = {
        'S': parseInt(document.getElementById('correctSize').value),
        'E': parseInt(document.getElementById('correctEgg').value),
        'T': parseInt(document.getElementById('correctToken').value),
        'R': parseInt(document.getElementById('correctReward').value)
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab.url.includes('discord.com/channels/')) {
            return setStatus("Abra a página do canal no Discord.");
        }
        
        const channelId = tab.url.split('/').pop();
        setStatus("Extraindo token...");

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: () => {
                let extractedToken = null;
                try {
                    window.webpackChunkdiscord_app.push([
                        [Math.random()],
                        {},
                        (req) => {
                            for (const key in req.c) {
                                const m = req.c[key].exports;
                                if (m && m.default && typeof m.default.getToken === 'function') {
                                    const t = m.default.getToken();
                                    if (typeof t === 'string' && t.split('.').length === 3) {
                                        extractedToken = t;
                                        break;
                                    }
                                }
                                if (m && typeof m.getToken === 'function') {
                                    const t = m.getToken();
                                    if (typeof t === 'string' && t.split('.').length === 3) {
                                        extractedToken = t;
                                        break;
                                    }
                                }
                            }
                        }
                    ]);
                } catch(e) {}
                return extractedToken;
            }
        }, async (results) => {
            const token = results && results[0] && results[0].result;
            if (!token) return setStatus("Falha ao extrair token.");

            setStatus("Buscando enquetes...");
            
            try {
                const messages = await fetchDiscord(`/channels/${channelId}/messages?limit=5`, token);
                const polls = messages.filter(m => m.embeds && m.embeds[0] && m.embeds[0].title && 
                    ['size', 'egg', 'token', 'reward'].some(kw => m.embeds[0].title.toLowerCase().includes(kw)));
                
                if (polls.length === 0) return setStatus("Nenhuma enquete encontrada.");

                const scores = {}; 

                for (const msg of polls) {
                    const title = msg.embeds[0].title.toLowerCase();
                    let category = null;
                    if (title.includes('size')) category = 'S';
                    else if (title.includes('egg')) category = 'E';
                    else if (title.includes('token')) category = 'T';
                    else if (title.includes('reward')) category = 'R';
                    
                    if (!category) continue;

                    setStatus(`Lendo reações: ${title}...`);
                    const userVotes = {}; 

                    for (const rx of (msg.reactions || [])) {
                        const optionNum = EMOJI_MAP[rx.emoji.name];
                        if (!optionNum) continue;

                        const emojiEncoded = rx.emoji.id ? `${rx.emoji.name}:${rx.emoji.id}` : encodeURIComponent(rx.emoji.name);
                        await new Promise(r => setTimeout(r, 1000)); 
                        const users = await fetchDiscord(`/channels/${channelId}/messages/${msg.id}/reactions/${emojiEncoded}?limit=50`, token);

                        users.forEach(u => {
                            if (u.bot) return;
                            const id = u.id;
                            const name = formatName(u.global_name || u.username);
                            if (!userVotes[id]) userVotes[id] = { name: name, votes: [] };
                            userVotes[id].votes.push(optionNum);
                        });
                    }

                    for (const [id, data] of Object.entries(userVotes)) {
                        if (!scores[id]) scores[id] = { name: data.name, S: 0, E: 0, T: 0, R: 0, Total: 0 };
                        scores[id].name = data.name; 

                        if (data.votes.length > 1) continue; 
                        
                        if (data.votes[0] === answers[category]) {
                            scores[id][category] = 1;
                            scores[id].Total += 1;
                        }
                    }
                }

                currentPendingScores = scores;
                document.getElementById('btnUpdateGlobal').style.display = 'block';
                renderTable(scores, `Contract Board - ${document.getElementById('groupSelect').value}`);
                setStatus("Cálculo concluído.");
            } catch (e) {
                setStatus("Erro: " + e.message);
            }
        });
    });
});

document.getElementById('btnUpdateGlobal').addEventListener('click', async () => {
    if (!currentPendingScores) return;
    const db = await loadDB();
    
    for (const [id, score] of Object.entries(currentPendingScores)) {
        if (!db[id]) db[id] = { name: score.name, S: 0, E: 0, T: 0, R: 0, Total: 0 };
        db[id].name = score.name; 
        db[id].S += score.S;
        db[id].E += score.E;
        db[id].T += score.T;
        db[id].R += score.R;
        db[id].Total += score.Total;
    }
    
    await saveDB(db);
    currentPendingScores = null;
    document.getElementById('btnUpdateGlobal').style.display = 'none';
    renderTable(db, `${document.getElementById('groupSelect').value} Prediction Leaderboard`);
    setStatus("Ranking atualizado!");
});

function renderTable(db, titleOverride) {
    const players = Object.values(db);
    if (players.length === 0) return setOutput(`## ${titleOverride || 'Leaderboard'}\nNenhum dado.`);

    players.sort((a, b) => {
        if (b.Total !== a.Total) return b.Total - a.Total;
        if (b.E !== a.E) return b.E - a.E;
        if (b.R !== a.R) return b.R - a.R;
        if (b.T !== a.T) return b.T - a.T;
        if (b.S !== a.S) return b.S - a.S;
        return a.name.localeCompare(b.name);
    });

    let maxNameLen = 13;
    players.forEach(p => { if (p.name.length > maxNameLen) maxNameLen = p.name.length; });

    let out = `\`\`\`\n`;
    out += `  # | Player${' '.repeat(maxNameLen - 6)} | E | R | T | S | Total\n`;
    out += `—`.repeat(maxNameLen + 31) + `\n`;

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const rStr = String(i + 1).padStart(2, ' ');
        const nStr = p.name.padEnd(maxNameLen, ' ');
        const tStr = String(p.Total).padStart(3, ' ');
        out += ` ${rStr} | ${nStr} | ${p.E} | ${p.R} | ${p.T} | ${p.S} | ${tStr}\n`;
    }
    out += `\`\`\``;
    setOutput(`## ${titleOverride || 'Leaderboard'}\n${out}`);
}