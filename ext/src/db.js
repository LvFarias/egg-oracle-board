function getDbKey() {
	return 'season_db_' + document.getElementById('groupSelect').value;
}

function normalizeDatabaseUsers(db) {
	const nameToRealId = {};
	const fullNameMap = {};

	for (let w = 1; w <= 13; w++) {
		const lists = [
			Object.entries(db.weeks[w].votes || {}),
			Object.entries(db.weeks[w].scores || {}),
		];
		for (const list of lists) {
			for (const [key, data] of list) {
				if (!data.name) continue;
				if (/^\d{17,20}$/.test(key)) {
					const lower = data.name.toLowerCase().trim();
					nameToRealId[lower] = key;
					if (
						!fullNameMap[key] ||
						data.name.length > fullNameMap[key].length
					) {
						fullNameMap[key] = data.name;
					}
				}
			}
		}
	}

	const resolveKey = (key, name) => {
		if (/^\d{17,20}$/.test(key)) return key;
		const lowerName = name.toLowerCase().trim();

		if (nameToRealId[lowerName]) return nameToRealId[lowerName];

		for (const [knownName, knownId] of Object.entries(nameToRealId)) {
			if (knownName.length >= 4 && lowerName.length >= 4) {
				if (
					knownName.startsWith(lowerName) ||
					lowerName.startsWith(knownName)
				) {
					return knownId;
				}
			}
		}

		const cleanBase = lowerName.replace(/[^a-z0-9]/g, '');
		return 'no_discord_' + cleanBase;
	};

	for (let w = 1; w <= 13; w++) {
		if (db.weeks[w].votes) {
			const newVotes = {};
			for (const [key, data] of Object.entries(db.weeks[w].votes)) {
				if (!data.name) continue;
				const resolvedKey = resolveKey(key, data.name);
				const finalName = fullNameMap[resolvedKey] || data.name;

				if (
					!fullNameMap[resolvedKey] ||
					finalName.length > fullNameMap[resolvedKey].length
				) {
					fullNameMap[resolvedKey] = finalName;
				}
				newVotes[resolvedKey] = { ...data, name: finalName };
			}
			db.weeks[w].votes = newVotes;
		}

		if (db.weeks[w].scores) {
			const newScores = {};
			for (const [key, data] of Object.entries(db.weeks[w].scores)) {
				if (!data.name) continue;
				const resolvedKey = resolveKey(key, data.name);
				const finalName = fullNameMap[resolvedKey] || data.name;

				if (
					!fullNameMap[resolvedKey] ||
					finalName.length > fullNameMap[resolvedKey].length
				) {
					fullNameMap[resolvedKey] = finalName;
				}

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

	for (let w = 1; w <= 13; w++) {
		if (db.weeks[w].votes) {
			for (const key of Object.keys(db.weeks[w].votes)) {
				db.weeks[w].votes[key].name =
					fullNameMap[key] || db.weeks[w].votes[key].name;
			}
		}
		if (db.weeks[w].scores) {
			for (const key of Object.keys(db.weeks[w].scores)) {
				db.weeks[w].scores[key].name =
					fullNameMap[key] || db.weeks[w].scores[key].name;
			}
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
			db = normalizeDatabaseUsers(db);
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
