const EMOJI_MAP = {
	'1️⃣': 1,
	'2️⃣': 2,
	'3️⃣': 3,
	'4️⃣': 4,
	'5️⃣': 5,
	'6️⃣': 6,
	'7️⃣': 7,
	'8️⃣': 8,
	'9️⃣': 9,
	'🔟': 10,
};
const CATEGORY_NAMES = { S: 'Size', E: 'Egg', T: 'Token', R: 'Reward' };
let currentPendingScores = null;

function formatName(rawName) {
	return (rawName.trim().split(' ')[0] || 'Unknown').substring(0, 13);
}

function setStatus(msg) {
	document.getElementById('status').innerText = msg;
}

function setOutput(html) {
	document.getElementById('output').innerHTML = html;
	navigator.clipboard.writeText(html);
}

function getDbKey() {
	return 'prediction_db_' + document.getElementById('groupSelect').value;
}

function getVotesKey() {
	return 'prediction_votes_' + document.getElementById('groupSelect').value;
}

async function loadDB() {
	return new Promise((resolve) => {
		chrome.storage.local.get([getDbKey()], (res) =>
			resolve(res[getDbKey()] || {}),
		);
	});
}

async function saveDB(db) {
	const obj = {};
	obj[getDbKey()] = db;
	return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

async function getVotesDB() {
	return new Promise((resolve) => {
		chrome.storage.local.get([getVotesKey()], (res) =>
			resolve(res[getVotesKey()] || {}),
		);
	});
}

async function saveVotesDB(db) {
	const obj = {};
	obj[getVotesKey()] = db;
	return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

async function updateDateSelect() {
	const db = await getVotesDB();
	const dates = Object.keys(db).sort().reverse();
	const sel = document.getElementById('dateSelect');
	sel.innerHTML = '';
	if (dates.length === 0) {
		sel.innerHTML = '<option value="">No data</option>';
		return;
	}
	dates.forEach((d) => {
		const opt = document.createElement('option');
		opt.value = d;
		opt.innerText = d;
		sel.appendChild(opt);
	});
}

async function switchGroup() {
	currentPendingScores = null;
	document.getElementById('btnUpdateGlobal').style.display = 'none';
	await updateDateSelect();
	const db = await loadDB();
	renderTable(
		db,
		`${document.getElementById('groupSelect').value} Prediction Leaderboard`,
	);
}

document.getElementById('groupSelect').addEventListener('change', switchGroup);
document.addEventListener('DOMContentLoaded', switchGroup);

document.getElementById('btnExport').addEventListener('click', async () => {
	const db = await loadDB();
	const dataStr =
		'data:text/json;charset=utf-8,' +
		encodeURIComponent(JSON.stringify(db, null, 2));
	const a = document.createElement('a');
	a.href = dataStr;
	a.download = `leaderboard_${document.getElementById('groupSelect').value}.json`;
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
	reader.onload = async function (e) {
		try {
			const db = JSON.parse(e.target.result);
			await saveDB(db);
			await switchGroup();
			setStatus('Backup imported successfully.');
		} catch (err) {
			setStatus('Import error: Invalid file.');
		}
		event.target.value = '';
	};
	reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', async () => {
	if (
		confirm(
			'Are you sure you want to reset the leaderboard for this group?',
		)
	) {
		await saveDB({});
		switchGroup();
		setStatus('Leaderboard reset.');
	}
});

async function fetchDiscord(url, token) {
	const res = await fetch(`https://discord.com/api/v9${url}`, {
		headers: { Authorization: token },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

document.getElementById('btnRecordVotes').addEventListener('click', () => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (!tab.url.includes('discord.com/channels/'))
			return setStatus('Open the Discord channel page.');

		const channelId = tab.url.split('/').pop();
		setStatus('Extracting token...');

		chrome.scripting.executeScript(
			{
				target: { tabId: tab.id },
				world: 'MAIN',
				func: () => {
					let extractedToken = null;
					try {
						window.webpackChunkdiscord_app.push([
							[Math.random()],
							{},
							(req) => {
								for (const key in req.c) {
									const m = req.c[key].exports;
									if (
										m &&
										m.default &&
										typeof m.default.getToken === 'function'
									) {
										const t = m.default.getToken();
										if (
											typeof t === 'string' &&
											t.split('.').length === 3
										) {
											extractedToken = t;
											break;
										}
									}
									if (m && typeof m.getToken === 'function') {
										const t = m.getToken();
										if (
											typeof t === 'string' &&
											t.split('.').length === 3
										) {
											extractedToken = t;
											break;
										}
									}
								}
							},
						]);
					} catch (e) {}
					return extractedToken;
				},
			},
			async (results) => {
				const token = results && results[0] && results[0].result;
				if (!token) return setStatus('Failed to extract token.');

				setStatus('Fetching polls...');

				try {
					const messages = await fetchDiscord(
						`/channels/${channelId}/messages?limit=5`,
						token,
					);
					const polls = messages.filter(
						(m) =>
							m.embeds &&
							m.embeds[0] &&
							m.embeds[0].title &&
							['size', 'egg', 'token', 'reward'].some((kw) =>
								m.embeds[0].title.toLowerCase().includes(kw),
							),
					);

					if (polls.length === 0) return setStatus('No polls found.');

					const dayVotes = {};

					for (const msg of polls) {
						const title = msg.embeds[0].title.toLowerCase();
						let category = null;
						if (title.includes('size')) category = 'S';
						else if (title.includes('egg')) category = 'E';
						else if (title.includes('token')) category = 'T';
						else if (title.includes('reward')) category = 'R';

						if (!category) continue;

						setStatus(`Reading reactions: ${title}...`);
						const userVotes = {};

						for (const rx of msg.reactions || []) {
							const optionNum = EMOJI_MAP[rx.emoji.name];
							if (!optionNum) continue;

							const emojiEncoded = rx.emoji.id
								? `${rx.emoji.name}:${rx.emoji.id}`
								: encodeURIComponent(rx.emoji.name);
							await new Promise((r) => setTimeout(r, 1000));
							const users = await fetchDiscord(
								`/channels/${channelId}/messages/${msg.id}/reactions/${emojiEncoded}?limit=50`,
								token,
							);

							users.forEach((u) => {
								if (u.bot) return;
								const id = u.id;
								const name = formatName(
									u.global_name || u.username,
								);
								if (!userVotes[id])
									userVotes[id] = { name: name, votes: [] };
								userVotes[id].votes.push(optionNum);
							});
						}

						for (const [id, data] of Object.entries(userVotes)) {
							if (!dayVotes[id])
								dayVotes[id] = { name: data.name };
							dayVotes[id].name = data.name;
							dayVotes[id][category] =
								data.votes.length > 1 ? 'DQ' : data.votes[0];
						}
					}

					const today = new Date().toISOString().split('T')[0];
					const db = await getVotesDB();
					db[today] = dayVotes;
					await saveVotesDB(db);
					await updateDateSelect();

					document.getElementById('dateSelect').value = today;
					setStatus('Votes recorded successfully.');
				} catch (e) {
					setStatus('Error: ' + e.message);
				}
			},
		);
	});
});

document.getElementById('btnCalculate').addEventListener('click', async () => {
	const selectedDate = document.getElementById('dateSelect').value;
	if (!selectedDate) return setStatus('No date selected.');

	const answers = {
		S: parseInt(document.getElementById('correctSize').value),
		E: parseInt(document.getElementById('correctEgg').value),
		T: parseInt(document.getElementById('correctToken').value),
		R: parseInt(document.getElementById('correctReward').value),
	};

	const db = await getVotesDB();
	const rawVotes = db[selectedDate];
	if (!rawVotes) return setStatus('Data not found for this date.');

	const scores = {};
	for (const [id, user] of Object.entries(rawVotes)) {
		scores[id] = { name: user.name, S: 0, E: 0, T: 0, R: 0, Total: 0 };
		for (const cat of ['S', 'E', 'T', 'R']) {
			if (user[cat] && user[cat] !== 'DQ' && user[cat] === answers[cat]) {
				scores[id][cat] = 1;
				scores[id].Total += 1;
			}
		}
	}

	currentPendingScores = scores;
	document.getElementById('btnUpdateGlobal').style.display = 'block';
	renderTable(
		scores,
		`Contract Board - ${document.getElementById('groupSelect').value}`,
	);
	setStatus('Calculation complete (Scores not saved until Update).');
});

document
	.getElementById('btnExportVotes')
	.addEventListener('click', async () => {
		const selectedDate = document.getElementById('dateSelect').value;
		if (!selectedDate) return setStatus('No date selected.');

		const db = await getVotesDB();
		const rawVotes = db[selectedDate];
		if (!rawVotes) return setStatus('Data not found for this date.');

		let exportTxt = `Votes - ${selectedDate} (${document.getElementById('groupSelect').value})\n`;

		for (const cat of ['S', 'E', 'T', 'R']) {
			exportTxt += `\n[ ${CATEGORY_NAMES[cat]} ]\n`;
			const options = {};
			for (let i = 1; i <= 10; i++) options[i] = [];

			for (const user of Object.values(rawVotes)) {
				if (user[cat] && user[cat] !== 'DQ') {
					options[user[cat]].push(user.name);
				}
			}

			for (let i = 1; i <= 10; i++) {
				if (options[i].length > 0) {
					exportTxt += `${i} - ${options[i].join(', ')}\n`;
				}
			}
		}

		const a = document.createElement('a');
		a.href =
			'data:text/plain;charset=utf-8,' + encodeURIComponent(exportTxt);
		a.download = `votes_${document.getElementById('groupSelect').value}_${selectedDate}.txt`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setStatus('Votes exported.');
	});

document
	.getElementById('btnUpdateGlobal')
	.addEventListener('click', async () => {
		if (!currentPendingScores) return;
		const db = await loadDB();

		for (const [id, score] of Object.entries(currentPendingScores)) {
			if (!db[id])
				db[id] = { name: score.name, S: 0, E: 0, T: 0, R: 0, Total: 0 };
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
		renderTable(
			db,
			`${document.getElementById('groupSelect').value} Prediction Leaderboard`,
		);
		setStatus('Leaderboard updated!');
	});

function renderTable(db, titleOverride) {
	const players = Object.values(db);
	if (players.length === 0)
		return setOutput(`## ${titleOverride || 'Leaderboard'}\nNo data.`);

	players.sort((a, b) => {
		if (b.Total !== a.Total) return b.Total - a.Total;
		if (b.E !== a.E) return b.E - a.E;
		if (b.R !== a.R) return b.R - a.R;
		if (b.T !== a.T) return b.T - a.T;
		if (b.S !== a.S) return b.S - a.S;
		return a.name.localeCompare(b.name);
	});

	let maxNameLen = 13;
	players.forEach((p) => {
		if (p.name.length > maxNameLen) maxNameLen = p.name.length;
	});

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
    let legend = `Legend:\n\`\`\`\n(E: Egg | R: Reward | T: Token | S: Size)\n\`\`\``;
	setOutput(`## ${titleOverride || 'Leaderboard'}\n${out}\n${legend}`);
}
