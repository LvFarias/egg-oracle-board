document.getElementById('btnImport').addEventListener('click', () => {
	const importText = document.getElementById('importText');
	const btnConfirm = document.getElementById('btnConfirmImport');
	if (importText.style.display !== 'block') {
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
			const newVotes = data.votes || {};
			const newScores = data.scores || {};

			if (data.polls) {
				let pollString = '';
				if (
					data.polls.maxSR &&
					Object.keys(data.polls.maxSR).length > 0
				) {
					pollString += `/poll create message:${window.POLL_NAMES.M} `;
					for (let i = 1; i <= 10; i++)
						if (data.polls.maxSR[i])
							pollString += `choice${i}:${data.polls.maxSR[i].join(' ')} `;
					pollString = pollString.trim() + '\n\n';
				}
				if (data.polls.egg && Object.keys(data.polls.egg).length > 0) {
					pollString += `/poll create message:${window.POLL_NAMES.E} `;
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
					data.polls.size &&
					Object.keys(data.polls.size).length > 0
				) {
					pollString += `/poll create message:${window.POLL_NAMES.S} `;
					for (let i = 1; i <= 10; i++)
						if (data.polls.size[i])
							pollString += `choice${i}:${data.polls.size[i].join(' ')} `;
					pollString = pollString.trim() + '\n\n';
				}
				if (
					data.polls.reward &&
					Object.keys(data.polls.reward).length > 0
				) {
					pollString += `/poll create message:${window.POLL_NAMES.R} `;
					for (let i = 1; i <= 10; i++)
						if (data.polls.reward[i])
							pollString += `choice${i}:${data.polls.reward[i].join(' ')} `;
					pollString = pollString.trim();
				}
				if (
					data.polls.duration &&
					Object.keys(data.polls.duration).length > 0
				) {
					pollString += `/poll create message:${window.POLL_NAMES.D} `;
					for (let i = 1; i <= 10; i++)
						if (data.polls.duration[i])
							pollString += `choice${i}:${data.polls.duration[i].join(' ')} `;
					pollString = pollString.trim() + '\n\n';
				}
				db.weeks[week].polls = pollString.trim();
			}
			db.weeks[week].votes = newVotes;
			db.weeks[week].scores = newScores;
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
				/^\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/;

			const db = await loadDB();
			const findExistingId = (searchName) => {
				const lowerSearch = searchName.toLowerCase();
				for (let w = 1; w <= 13; w++) {
					const lists = [
						Object.entries(db.weeks[w].votes || {}),
						Object.entries(db.weeks[w].scores || {}),
					];
					for (const list of lists) {
						for (const [id, user] of list) {
							if (!user.name) continue;
							const lowerUser = user.name.toLowerCase();
							if (
								(lowerUser.includes(lowerSearch) ||
									lowerSearch.includes(lowerUser)) &&
								Math.min(
									lowerUser.length,
									lowerSearch.length,
								) >= 6
							) {
								return id;
							}
						}
					}
				}
				return null;
			};

			let tempCounter = Date.now();
			for (const line of lines) {
				const cleanLine = stripAnsi(line);
				const match = cleanLine.match(regex);
				if (match) {
					const name = match[1].trim();
					let resolvedId = findExistingId(name);
					if (!resolvedId) {
						resolvedId = `no_discord_${tempCounter++}`;
					}
					newScores[resolvedId] = {
						name: name,
						P: parseInt(match[2], 10),
						M: parseInt(match[3], 10),
						E: parseInt(match[4], 10),
						S: parseInt(match[5], 10),
						R: parseInt(match[6], 10),
						D: parseInt(match[7], 10),
						Total: parseInt(match[8], 10),
					};
					importedCount++;
				}
			}

			if (importedCount > 0) {
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
		for (let i = 1; i <= 13; i++) {
			defaultDb.weeks[i] = {
				polls: '',
				votes: {},
				scores: {},
				answers: {},
			};
		}
		await saveDB(defaultDb);
		renderGlobal(defaultDb);
		setStatus('Leaderboard reset.');
	}
});
