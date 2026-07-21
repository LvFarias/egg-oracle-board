const sortFn = (a, b) => {
	if (b.Total !== a.Total) return b.Total - a.Total;
	if (b.P !== a.P) return b.P - a.P;
	if (b.M !== a.M) return b.M - a.M;
	if (b.E !== a.E) return b.E - a.E;
	if (b.S !== a.S) return b.S - a.S;
	if (b.R !== a.R) return b.R - a.R;
	if (b.D !== a.D) return b.D - a.D;
	return a.name.localeCompare(b.name);
};

function renderTable(playersList, titleOverride) {
	const group = document.getElementById('groupSelect').value;
	if (playersList.length === 0) {
		document.getElementById('output').innerHTML =
			`## ${titleOverride || 'Leaderboard'}\nNo data.`;
		document.getElementById('pollOutputContainer').style.display = 'none';
		document.getElementById('mainOutputContainer').style.display = 'block';
		return;
	}

	playersList.sort(sortFn);

	let categories = Object.keys(window.CATEGORY_NAMES);

	const yp = '\u001b[33m|\u001b[0m';
	let out = `\`\`\`ansi\n`;

	const headerCats = categories.map((c) => c.padStart(2, ' ')).join(yp);
	out += ` #${yp} ${'Player'.padEnd(9, ' ')} ${yp}${headerCats}${yp} Pt\n`;

	const dividerLen = 2 + 1 + 11 + 1 + (categories.length * 3 - 1) + 1 + 3;
	out += `—`.repeat(dividerLen) + `\n`;

	for (let i = 0; i < playersList.length; i++) {
		const p = playersList[i];
		const rawRStr = String(i + 1).padStart(2, ' ');
		const cleanName = p.name
			.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
			.trim();
		const cutName = cleanName.substring(0, 9);
		const rawNStr = ' ' + cutName.padEnd(9, ' ') + ' ';
		const rawTStr = String(p.Total).padStart(3, ' ');

		const rStr = applyColor(rawRStr, p.colorRank);
		const nStr = applyColor(rawNStr, p.colorName);
		const tStr = applyColor(rawTStr, p.colorTotal);

		const catStrs = categories
			.map((c) => {
				const rawC = String(p[c] || 0).padStart(2, ' ');
				return applyColor(rawC, p[`color${c}`]);
			})
			.join(yp);

		out += `${rStr}${yp}${nStr}${yp}${catStrs}${yp}${tStr}\n`;
	}
	out += `\`\`\``;
	setOutput(`## ${titleOverride || 'Leaderboard'}\n${out}`);
}

function renderGlobal(db) {
	const prevScores = {};
	const currScores = {};
	let latestWeek = 0;
	let maxLatestWeekTotal = 0;

	for (let w = 1; w <= 13; w++) {
		if (db.weeks[w].scores && Object.keys(db.weeks[w].scores).length > 0) {
			latestWeek = w;
		}
	}

	for (let w = 1; w <= 13; w++) {
		const weekScores = db.weeks[w].scores || {};
		for (const [id, score] of Object.entries(weekScores)) {
			if (!currScores[id]) {
				currScores[id] = {
					id: id,
					name: score.name,
					P: 0,
					M: 0,
					E: 0,
					S: 0,
					R: 0,
					D: 0,
					Total: 0,
					latestWeekTotal: 0,
				};
			}
			if (score.name.length > currScores[id].name.length) {
				currScores[id].name = score.name;
			}

			currScores[id].P += score.P || 0;
			currScores[id].M += score.M || 0;
			currScores[id].E += score.E || 0;
			currScores[id].S += score.S || 0;
			currScores[id].R += score.R || 0;
			currScores[id].D += score.D || 0;
			currScores[id].Total += score.Total || 0;

			if (w < latestWeek) {
				if (!prevScores[id]) {
					prevScores[id] = {
						P: 0,
						M: 0,
						E: 0,
						S: 0,
						R: 0,
						D: 0,
						Total: 0,
					};
				}
				prevScores[id].P += score.P || 0;
				prevScores[id].M += score.M || 0;
				prevScores[id].E += score.E || 0;
				prevScores[id].S += score.S || 0;
				prevScores[id].R += score.R || 0;
				prevScores[id].D += score.D || 0;
				prevScores[id].Total += score.Total || 0;
			} else if (w === latestWeek) {
				currScores[id].latestWeekTotal = score.Total || 0;
				if (currScores[id].latestWeekTotal > maxLatestWeekTotal) {
					maxLatestWeekTotal = currScores[id].latestWeekTotal;
				}
			}
		}
	}

	const currArr = Object.values(currScores).sort(sortFn);
	currArr.forEach((p, idx) => (p.currRank = idx + 1));

	const prevArr = Object.values(currScores)
		.map((p) => {
			const prev = prevScores[p.id] || {
				P: 0,
				M: 0,
				E: 0,
				S: 0,
				R: 0,
				D: 0,
				Total: 0,
			};
			return { id: p.id, name: p.name, ...prev };
		})
		.sort(sortFn);

	const prevRanks = {};
	prevArr.forEach((p, idx) => (prevRanks[p.id] = idx + 1));

	currArr.forEach((p) => {
		const oldRank = prevRanks[p.id];
		const prev = prevScores[p.id] || {
			P: 0,
			M: 0,
			E: 0,
			S: 0,
			R: 0,
			D: 0,
			Total: 0,
		};

		if (oldRank !== undefined) {
			if (p.currRank < oldRank) p.colorRank = 'green';
			else if (p.currRank > oldRank) p.colorRank = 'red';
		}

		if (
			p.latestWeekTotal === maxLatestWeekTotal &&
			maxLatestWeekTotal > 0
		) {
			p.colorName = 'cyan';
		}
		if (p.P !== prev.P) p.colorP = 'blue';
		if (p.M !== prev.M) p.colorM = 'blue';
		if (p.E !== prev.E) p.colorE = 'blue';
		if (p.S !== prev.S) p.colorS = 'blue';
		if (p.R !== prev.R) p.colorR = 'blue';
		if (p.D !== prev.D) p.colorD = 'blue';
		if (p.Total !== prev.Total) p.colorTotal = 'blue';
	});

	const groupName = document.getElementById('groupSelect').value;
	renderTable(
		currArr,
		`${groupName} ${db.seasonName} Prediction Leaderboard`,
	);
}

document
	.getElementById('btnUpdateGlobal')
	.addEventListener('click', async () => {
		if (!window.currentPendingScores) return;
		const db = await loadDB();
		const week = document.getElementById('weekSelect').value;

		db.seasonName = document.getElementById('seasonName').value;
		db.weeks[week].scores = window.currentPendingScores;
		db.weeks[week].answers = {
			M: parseInt(document.getElementById('correctMaxSR').value),
			E: parseInt(document.getElementById('correctEgg').value),
			S: parseInt(document.getElementById('correctSize').value),
			R: parseInt(document.getElementById('correctReward').value),
			D: parseInt(document.getElementById('correctDuration').value),
		};

		await saveDB(db);
		window.currentPendingScores = null;
		document.getElementById('btnUpdateGlobal').style.display = 'none';
		renderGlobal(db);
		setStatus(`Week ${week} scores and answers saved! Global updated.`);
	});
