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
		const text = document.getElementById('importText').value.trim();
		if (!text) return setStatus('No data to import.');

		try {
			const data = JSON.parse(text);
			const db = await loadDB();
			const week =
				data.week || document.getElementById('weekSelect').value;
			const revCatMap = { egg: 'E', size: 'S', reward: 'R', token: 'T' };
			const newVotes = {};

			if (data.votes) {
				for (const [catName, options] of Object.entries(data.votes)) {
					const code = revCatMap[catName];
					if (!code) continue;
					for (const [optNum, users] of Object.entries(options)) {
						users.forEach((id) => {
							if (!newVotes[id]) newVotes[id] = { name: id };
							newVotes[id][code] = parseInt(optNum, 10);
						});
					}
				}
			}

			if (data.polls) {
				let pollString = '';
				if (
					data.polls.size &&
					Object.keys(data.polls.size).length > 0
				) {
					pollString +=
						'/poll create message:Contract Size Prediction ';
					for (let i = 1; i <= 10; i++)
						if (data.polls.size[i])
							pollString += `choice${i}:${data.polls.size[i].join(' ')} `;
					pollString = pollString.trim() + '\n\n';
				}
				if (data.polls.egg && Object.keys(data.polls.egg).length > 0) {
					pollString += '/poll create message:Next Egg Forecast ';
					for (let i = 1; i <= 10; i++) {
						if (data.polls.egg[i]) {
							const eggStr = data.polls.egg[i]
								.map((e) => `:egg_${e}:`)
								.join(' ');
							pollString += `choice${i}:${eggStr} `;
						}
					}
					pollString = pollString.trim() + '\n\n';
				}
				if (
					data.polls.token &&
					Object.keys(data.polls.token).length > 0
				) {
					pollString += '/poll create message:Token Interval Guess ';
					for (let i = 1; i <= 10; i++)
						if (data.polls.token[i])
							pollString += `choice${i}:${data.polls.token[i].join(' ')} `;
					pollString = pollString.trim() + '\n\n';
				}
				if (
					data.polls.reward &&
					Object.keys(data.polls.reward).length > 0
				) {
					pollString +=
						'/poll create message:Final Reward Speculation ';
					for (let i = 1; i <= 10; i++)
						if (data.polls.reward[i])
							pollString += `choice${i}:${data.polls.reward[i].join(' ')} `;
					pollString = pollString.trim();
				}
				db.weeks[week].polls = pollString.trim();
			}

			Object.keys(newVotes).forEach((id) => {
				let foundName = id;
				for (let w = 1; w <= 13; w++) {
					if (
						db.weeks[w].votes &&
						db.weeks[w].votes[id] &&
						db.weeks[w].votes[id].name !== id
					) {
						foundName = db.weeks[w].votes[id].name;
						break;
					}
				}
				newVotes[id].name = foundName;
			});

			db.weeks[week].votes = newVotes;
			await saveDB(db);

			document.getElementById('importText').value = '';
			document.getElementById('importText').style.display = 'none';
			document.getElementById('btnConfirmImport').style.display = 'none';
			setStatus(`Week ${week} votes and polls imported successfully.`);
		} catch (e) {
			const lines = text.split('\n');
			const newScores = {};
			const stripAnsi = (str) => str.replace(/\u001b\[\d+m/g, '').trim();
			let importedCount = 0;

			const group = document.getElementById('groupSelect').value;
			let regex =
				/^\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/;
			if (group === '1q') {
				regex =
					/^\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/;
			}

			for (const line of lines) {
				const cleanLine = stripAnsi(line);
				const match = cleanLine.match(regex);
				if (match) {
					const name = match[1].trim();
					newScores[name] = {
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
				const db = await loadDB();
				const week = document.getElementById('weekSelect').value;
				db.weeks[week].scores = newScores;
				await saveDB(db);
				renderGlobal(db);
				document.getElementById('importText').value = '';
				document.getElementById('importText').style.display = 'none';
				document.getElementById('btnConfirmImport').style.display =
					'none';
				setStatus(`Leaderboard imported to Week ${week}.`);
			} else {
				setStatus('Import error: Invalid JSON or Table format.');
			}
		}
	});

document.getElementById('btnReset').addEventListener('click', async () => {
	if (
		confirm(
			'Are you sure you want to reset the FULL SEASON leaderboard for this group?',
		)
	) {
		const defaultDb = {
			seasonName: document.getElementById('seasonName').value,
			weeks: {},
		};
		for (let i = 1; i <= 13; i++)
			defaultDb.weeks[i] = {
				polls: '',
				votes: {},
				scores: {},
				answers: {},
			};
		await saveDB(defaultDb);
		renderGlobal(defaultDb);
		setStatus('Leaderboard reset.');
	}
});
