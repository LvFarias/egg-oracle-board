function getDbKey() {
	return 'season_db_' + document.getElementById('groupSelect').value;
}

function normalizeDatabaseUsers(db) {
	const realIdMap = {};
	const fullNameMap = {};
	const keyRedirects = {};

	for (let w = 1; w <= 13; w++) {
		const items = [
			Object.entries(db.weeks[w].votes || {}),
			Object.entries(db.weeks[w].scores || {}),
		];
		items.forEach((list) => {
			for (const [key, data] of list) {
				if (!data.name) continue;
				if (/^\d{17,20}$/.test(key)) {
					const lower = data.name.toLowerCase();
					realIdMap[lower] = key;
					if (
						!fullNameMap[key] ||
						data.name.length > fullNameMap[key].length
					) {
						fullNameMap[key] = data.name;
					}
				}
			}
		});
	}

	let noDiscordCounter = 1;
	for (let w = 1; w <= 13; w++) {
		const items = [
			Object.entries(db.weeks[w].votes || {}),
			Object.entries(db.weeks[w].scores || {}),
		];
		items.forEach((list) => {
			for (const [key, data] of list) {
				if (!data.name || /^\d{17,20}$/.test(key)) continue;

				let matchedId = null;
				const oldLower = data.name.toLowerCase();

				for (const [knownLower, knownId] of Object.entries(realIdMap)) {
					if (
						(knownLower.includes(oldLower) ||
							oldLower.includes(knownLower)) &&
						Math.min(knownLower.length, oldLower.length) >= 6
					) {
						matchedId = knownId;
						break;
					}
				}

				if (matchedId) {
					keyRedirects[key] = matchedId;
				} else if (!key.startsWith('no_discord_')) {
					keyRedirects[key] = `no_discord_${noDiscordCounter++}`;
					if (
						!fullNameMap[keyRedirects[key]] ||
						data.name.length > fullNameMap[keyRedirects[key]].length
					) {
						fullNameMap[keyRedirects[key]] = data.name;
					}
				} else {
					if (
						!fullNameMap[key] ||
						data.name.length > fullNameMap[key].length
					) {
						fullNameMap[key] = data.name;
					}
				}
			}
		});
	}

	for (let w = 1; w <= 13; w++) {
		if (db.weeks[w].votes) {
			const newVotes = {};
			for (const [key, data] of Object.entries(db.weeks[w].votes)) {
				const resolvedKey = keyRedirects[key] || key;
				const finalName = fullNameMap[resolvedKey] || data.name;
				newVotes[resolvedKey] = { ...data, name: finalName };
			}
			db.weeks[w].votes = newVotes;
		}
		if (db.weeks[w].scores) {
			const newScores = {};
			for (const [key, data] of Object.entries(db.weeks[w].scores)) {
				const resolvedKey = keyRedirects[key] || key;
				const finalName = fullNameMap[resolvedKey] || data.name;

				if (newScores[resolvedKey]) {
					newScores[resolvedKey].E += data.E || 0;
					newScores[resolvedKey].S += data.S || 0;
					newScores[resolvedKey].R += data.R || 0;
					newScores[resolvedKey].T += data.T || 0;
					newScores[resolvedKey].Total += data.Total || 0;
					newScores[resolvedKey].name = finalName;
				} else {
					newScores[resolvedKey] = { ...data, name: finalName };
				}
			}
			db.weeks[w].scores = newScores;
		}
	}
	return db;
}

async function loadDB() {
	return new Promise((resolve) => {
		chrome.storage.local.get([getDbKey()], (res) => {
			let db = res[getDbKey()];
			if (!db) {
				db = { seasonName: 'Season 1', weeks: {} };
			}
			for (let i = 1; i <= 13; i++) {
				if (!db.weeks[i]) {
					db.weeks[i] = {
						polls: '',
						votes: {},
						scores: {},
						answers: {},
					};
				}
			}
			resolve(db);
		});
	});
}

async function saveDB(db) {
	db = normalizeDatabaseUsers(db);
	const obj = {};
	obj[getDbKey()] = db;
	return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}
