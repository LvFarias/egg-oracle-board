function getDbKey() {
	return 'season_db_' + document.getElementById('groupSelect').value;
}

function normalizeDatabaseUsers(db) {
	const idMap = {};
	const fullNameMap = {};
	const stringAliases = {};

	for (let w = 1; w <= 13; w++) {
		const items = [
			Object.entries(db.weeks[w].votes || {}),
			Object.entries(db.weeks[w].scores || {}),
		];
		items.forEach((list) => {
			for (const [key, data] of list) {
				if (/^\d{17,20}$/.test(key)) {
					const lower = data.name.toLowerCase();
					idMap[lower] = key;
					if (
						!fullNameMap[key] ||
						data.name.length > fullNameMap[key].length
					) {
						fullNameMap[key] = data.name;
					}
				} else {
					const lower = data.name.toLowerCase();
					if (!stringAliases[lower]) stringAliases[lower] = data.name;
					else if (data.name.length > stringAliases[lower].length)
						stringAliases[lower] = data.name;
				}
			}
		});
	}

	const resolveKey = (oldKey, oldName) => {
		if (/^\d{17,20}$/.test(oldKey)) return oldKey;
		const oldLower = oldName.toLowerCase();

		for (const [knownNameLower, knownId] of Object.entries(idMap)) {
			if (
				(knownNameLower.startsWith(oldLower) ||
					oldLower.startsWith(knownNameLower)) &&
				Math.min(knownNameLower.length, oldLower.length) >= 8
			) {
				return knownId;
			}
		}

		let bestStringKey = oldKey;
		let bestLen = oldName.length;
		for (const [knownLower, knownName] of Object.entries(stringAliases)) {
			if (
				(knownLower.startsWith(oldLower) ||
					oldLower.startsWith(knownLower)) &&
				Math.min(knownLower.length, oldLower.length) >= 8
			) {
				if (knownName.length > bestLen) {
					bestStringKey = knownName;
					bestLen = knownName.length;
				}
			}
		}
		return bestStringKey;
	};

	for (let w = 1; w <= 13; w++) {
		if (db.weeks[w].votes) {
			const newVotes = {};
			for (const [key, data] of Object.entries(db.weeks[w].votes)) {
				const resolvedKey = resolveKey(key, data.name);
				const finalName =
					fullNameMap[resolvedKey] ||
					stringAliases[resolvedKey.toLowerCase()] ||
					resolvedKey;
				newVotes[resolvedKey] = { ...data, name: finalName };
			}
			db.weeks[w].votes = newVotes;
		}
		if (db.weeks[w].scores) {
			const newScores = {};
			for (const [key, data] of Object.entries(db.weeks[w].scores)) {
				const resolvedKey = resolveKey(key, data.name);
				const finalName =
					fullNameMap[resolvedKey] ||
					stringAliases[resolvedKey.toLowerCase()] ||
					resolvedKey;

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
