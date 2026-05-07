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
const CATEGORY_NAMES = { E: 'Egg', S: 'Size', R: 'Reward', T: 'Token' };
let currentPendingScores = null;

function formatName(rawName) {
	return (rawName.trim().split(' ')[0] || 'Unknown').substring(0, 13);
}

function setStatus(msg) {
	document.getElementById('status').innerText = msg;
}

function setOutput(html) {
	document.getElementById('mainOutputContainer').style.display = 'block';
	document.getElementById('output').innerHTML = html;
}

document.getElementById('btnCopyOutput').addEventListener('click', () => {
	const text = document.getElementById('output').innerText;
	navigator.clipboard.writeText(text);
	setStatus('Leaderboard copied to clipboard.');
});

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

document.getElementById('btnGeneratePolls').addEventListener('click', () => {
	const eggs = [
		':egg_edible:',
		':egg_superfood:',
		':egg_medical:',
		':egg_rocketfuel:',
		':egg_supermaterial:',
		':egg_fusion:',
		':egg_quantum:',
		':egg_immortality:',
		':egg_tachyon:',
		':egg_graviton:',
		':egg_dilithium:',
		':egg_pumpkin:',
		':egg_firework:',
		':egg_waterballoon:',
		':egg_easter:',
		':egg_chocolate:',
		':egg_wood:',
		':egg_lithium:',
		':egg_pegg:',
		':egg_ice:',
		':egg_flameretardant:',
		':egg_silicon:',
		':egg_carbonfiber:',
		':egg_unknown:',
	];
	shuffleArray(eggs);

	let eggCmd = '/poll create message:Next Egg Forecast ';
	for (let i = 0; i < 8; i++) {
		eggCmd += `choice${i + 1}:${eggs[i * 3]} ${eggs[i * 3 + 1]} ${eggs[i * 3 + 2]} `;
	}

	const sizeTemplates = [
		['1-2', '3-4', '5-6', '7-8', '9-10', '11-15', '16+'],
		['1-3', '4-6', '7-9', '10-12', '13-15', '16+'],
		['1-4', '5-8', '9-16', '17+'],
		['1-5', '6-10', '11-15', '16+'],
	];
	const sizes =
		sizeTemplates[Math.floor(Math.random() * sizeTemplates.length)];
	let sizeCmd = '/poll create message:Contract Size Prediction ';
	sizes.forEach((s, i) => (sizeCmd += `choice${i + 1}:${s} `));

	const tokenTemplates = [
		['15min', '30min', '60min', '120min', '180min', '240min'],
		['15min', '30min', '45min', '60min', '90min', '120min'],
		['15-30min', '45-60min', '90-120min', '180+min'],
		['15min', '30min', '60min', '90min', '120min', '240min'],
	];
	const tokens =
		tokenTemplates[Math.floor(Math.random() * tokenTemplates.length)];
	let tokenCmd = '/poll create message:Token Interval Guess ';
	tokens.forEach((t, i) => (tokenCmd += `choice${i + 1}:${t} `));

	const rewardTemplates = [
		[
			'Artifacts',
			'Piggy Bank (Fill/Level)',
			'Boosts',
			'GE / Epic Research',
			'Soul Eggs',
			'Shell Tickets',
		],
		[
			'Artifact',
			'Piggy Level Up',
			'Piggy Fill',
			'Boosts / GE',
			'Soul Eggs / Shell Tickets',
		],
		[
			'Piggy Bank / Soul Eggs',
			'Beacons / Prisms',
			'Other Boosts',
			'Artifacts / Epic Research',
			'Shell Tickets / GE',
		],
	];
	const rewards =
		rewardTemplates[Math.floor(Math.random() * rewardTemplates.length)];
	let rewardCmd = '/poll create message:Final Reward Speculation ';
	rewards.forEach((r, i) => (rewardCmd += `choice${i + 1}:${r} `));

	document.getElementById('pollOutputContainer').style.display = 'block';
	document.getElementById('pollOutput').innerText =
		`${sizeCmd.trim()}\n\n${eggCmd.trim()}\n\n${tokenCmd.trim()}\n\n${rewardCmd.trim()}`;
});

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

document.getElementById('btnImport').addEventListener('click', () => {
	const importText = document.getElementById('importText');
	const btnConfirm = document.getElementById('btnConfirmImport');
	if (importText.style.display === 'none') {
		importText.style.display = 'block';
		btnConfirm.style.display = 'block';
	} else {
		importText.style.display = 'none';
		btnConfirm.style.display = 'none';
	}
});

document
	.getElementById('btnConfirmImport')
	.addEventListener('click', async () => {
		const text = document.getElementById('importText').value;
		const lines = text.split('\n');
		const newDb = {};
		const group = document.getElementById('groupSelect').value;
		let regex =
			/^\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/;
		if (group === '1q') {
			regex =
				/^\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/;
		}

		let importedCount = 0;
		for (const line of lines) {
			const match = line.match(regex);
			if (match) {
				const name = match[1].trim();
				newDb[name] = {
					name: name,
					E: parseInt(match[2], 10),
					S: parseInt(match[3], 10),
					R: group === '1q' ? 0 : parseInt(match[4], 10),
					T: group === '1q' ? 0 : parseInt(match[5], 10),
					Total: parseInt(match[group === '1q' ? 4 : 6], 10),
				};
				importedCount++;
			}
		}

		if (importedCount > 0) {
			await saveDB(newDb);
			await switchGroup();
			document.getElementById('importText').value = '';
			document.getElementById('importText').style.display = 'none';
			document.getElementById('btnConfirmImport').style.display = 'none';
			setStatus('Leaderboard imported successfully.');
		} else {
			setStatus('Import error: No valid data found.');
		}
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
						`/channels/${channelId}/messages?limit=10`,
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
						else if (title.includes('reward')) category = 'R';
						else if (title.includes('token')) category = 'T';

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
								`/channels/${channelId}/messages/${msg.id}/reactions/${emojiEncoded}?limit=100`,
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
		E: parseInt(document.getElementById('correctEgg').value),
		S: parseInt(document.getElementById('correctSize').value),
		R: parseInt(document.getElementById('correctReward').value),
		T: parseInt(document.getElementById('correctToken').value),
	};

	const db = await getVotesDB();
	const rawVotes = db[selectedDate];
	if (!rawVotes) return setStatus('Data not found for this date.');

	const scores = {};
	for (const [id, user] of Object.entries(rawVotes)) {
		scores[id] = { name: user.name, E: 0, S: 0, R: 0, T: 0, Total: 0 };
		for (const cat of Object.keys(CATEGORY_NAMES)) {
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

		for (const cat of Object.keys(CATEGORY_NAMES)) {
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
			let targetKey = id;

			if (!db[id]) {
				const existingKey = Object.keys(db).find(
					(k) => db[k].name === score.name,
				);
				if (existingKey) {
					targetKey = existingKey;
					if (existingKey !== id) {
						db[id] = db[existingKey];
						delete db[existingKey];
						targetKey = id;
					}
				} else {
					db[id] = {
						name: score.name,
						E: 0,
						S: 0,
						R: 0,
						T: 0,
						Total: 0,
					};
				}
			}

			db[targetKey].name = score.name;
			db[targetKey].E += score.E;
			db[targetKey].S += score.S;
			db[targetKey].R += score.R;
			db[targetKey].T += score.T;
			db[targetKey].Total += score.Total;
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
document.getElementById('btnCopyPingUsers').addEventListener('click', () => {
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

				setStatus('Searching for ping message...');

				try {
					const messages = await fetchDiscord(
						`/channels/${channelId}/messages?limit=50`,
						token,
					);

					const targetMsg = messages.find(
						(m) =>
							m.content &&
							m.content.includes(
								'to be pinged every time a new poll becomes available',
							),
					);

					if (!targetMsg) return setStatus('Ping message not found.');
					if (
						!targetMsg.reactions ||
						targetMsg.reactions.length === 0
					)
						return setStatus('No reactions found.');

					setStatus('Fetching users...');
					const pingUsers = new Set();

					for (const rx of targetMsg.reactions) {
						const emojiEncoded = rx.emoji.id
							? `${rx.emoji.name}:${rx.emoji.id}`
							: encodeURIComponent(rx.emoji.name);

						await new Promise((r) => setTimeout(r, 1000));
						const users = await fetchDiscord(
							`/channels/${channelId}/messages/${targetMsg.id}/reactions/${emojiEncoded}?limit=100`,
							token,
						);

						users.forEach((u) => {
							if (!u.bot) pingUsers.add(`<@${u.id}>`);
						});
					}

					if (pingUsers.size === 0)
						return setStatus('No valid users found.');

					const pingList = Array.from(pingUsers).join(' ');
					navigator.clipboard.writeText(pingList);
					setStatus(`${pingUsers.size} users copied to clipboard.`);
				} catch (e) {
					setStatus('Error: ' + e.message);
				}
			},
		);
	});
});

function renderTable(db, titleOverride) {
	const group = document.getElementById('groupSelect').value;
	const players = Object.values(db);
	if (players.length === 0) {
		document.getElementById('output').innerHTML =
			`## ${titleOverride || 'Leaderboard'}\nNo data.`;
		document.getElementById('mainOutputContainer').style.display = 'block';
		return;
	}

	players.sort((a, b) => {
		if (b.Total !== a.Total) return b.Total - a.Total;
		if (b.E !== a.E) return b.E - a.E;
		if (b.S !== a.S) return b.S - a.S;
		if (b.R !== a.R) return b.R - a.R;
		if (b.T !== a.T) return b.T - a.T;
		return a.name.localeCompare(b.name);
	});

	let maxNameLen = 13;
	players.forEach((p) => {
		if (p.name.length > maxNameLen) maxNameLen = p.name.length;
	});
	let categories = Object.keys(CATEGORY_NAMES);
	let borderLen = 31;

	if (group === '1q') {
		borderLen = 23;
		categories = categories.slice(0, 2);
	}
	let out = `\`\`\`\n`;
	out += `  # | Player${' '.repeat(maxNameLen - 6)} | ${categories.join(' | ')} | Total\n`;
	out += `—`.repeat(maxNameLen + borderLen) + `\n`;

	for (let i = 0; i < players.length; i++) {
		const p = players[i];
		const rStr = String(i + 1).padStart(2, ' ');
		const nStr = p.name.padEnd(maxNameLen, ' ');
		const tStr = String(p.Total).padStart(3, ' ');
		out += ` ${rStr} | ${nStr} | ${categories.map((c) => p[c]).join(' | ')} | ${tStr}\n`;
	}
	out += `\`\`\``;
	let legend = `Legend:\n\`\`\`\n(${categories.map((c) => c + ': ' + CATEGORY_NAMES[c]).join(' | ')})\n\`\`\``;
	setOutput(`## ${titleOverride || 'Leaderboard'}\n${out}\n${legend}`);
}
