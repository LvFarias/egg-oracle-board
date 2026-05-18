document.getElementById('btnRecordVotes').addEventListener('click', () => {
	executeDiscordScript(async (token, channelId) => {
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
					const optionNum = window.EMOJI_MAP[rx.emoji.name];
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
						const name = formatName(u.global_name || u.username);
						if (!userVotes[id])
							userVotes[id] = { name: name, votes: [] };
						userVotes[id].votes.push(optionNum);
					});
				}

				for (const [id, data] of Object.entries(userVotes)) {
					if (!dayVotes[id]) dayVotes[id] = { name: data.name };
					dayVotes[id].name = data.name;
					dayVotes[id][category] =
						data.votes.length > 1 ? 'DQ' : data.votes[0];
				}
			}

			const db = await loadDB();
			const week = document.getElementById('weekSelect').value;
			db.weeks[week].votes = dayVotes;
			await saveDB(db);

			setStatus(`Votes recorded successfully for Week ${week}.`);
		} catch (e) {
			setStatus('Error: ' + e.message);
		}
	});
});

document.getElementById('btnCalculate').addEventListener('click', async () => {
	const week = document.getElementById('weekSelect').value;
	const answers = {
		S: parseInt(document.getElementById('correctSize').value),
		E: parseInt(document.getElementById('correctEgg').value),
		R: parseInt(document.getElementById('correctReward').value),
		T: parseInt(document.getElementById('correctToken').value),
	};

	const db = await loadDB();
	const rawVotes = db.weeks[week].votes;
	if (!rawVotes || Object.keys(rawVotes).length === 0)
		return setStatus(`No votes found for Week ${week}.`);

	const scores = {};
	for (const [id, user] of Object.entries(rawVotes)) {
		scores[id] = { name: user.name, E: 0, S: 0, R: 0, T: 0, Total: 0 };
		for (const cat of Object.keys(window.CATEGORY_NAMES)) {
			if (user[cat] && user[cat] !== 'DQ' && user[cat] === answers[cat]) {
				scores[id][cat] = 1;
				scores[id].Total += 1;
			}
		}
	}

	window.currentPendingScores = scores;
	document.getElementById('btnUpdateGlobal').style.display = 'block';
	const groupName = document.getElementById('groupSelect').value;
	renderTable(
		Object.values(scores),
		`${groupName} Contract Board - Week ${week}`,
	);
	setStatus('Calculation complete (Scores not saved until Update).');
});

document
	.getElementById('btnExportVotes')
	.addEventListener('click', async () => {
		const week = document.getElementById('weekSelect').value;
		const group = document.getElementById('groupSelect').value;
		const db = await loadDB();
		const weekData = db.weeks[week];

		const polls = { egg: {}, size: {}, reward: {}, token: {} };
		if (weekData.polls) {
			const lines = weekData.polls.split('\n');
			lines.forEach((line) => {
				if (!line.includes('/poll create')) return;
				let cat = '';
				if (line.includes('Size Prediction')) cat = 'size';
				else if (line.includes('Egg Forecast')) cat = 'egg';
				else if (line.includes('Token Interval')) cat = 'token';
				else if (line.includes('Reward Speculation')) cat = 'reward';
				if (!cat) return;

				for (let i = 1; i <= 10; i++) {
					const searchStr = `choice${i}:`;
					const nextStr = `choice${i + 1}:`;
					let start = line.indexOf(searchStr);
					if (start !== -1) {
						let end = line.indexOf(nextStr);
						let val =
							end !== -1
								? line.substring(start + searchStr.length, end)
								: line.substring(start + searchStr.length);
						val = val.trim();
						if (cat === 'egg') {
							polls[cat][String(i)] = val
								.replace(/:egg_/g, '')
								.replace(/:/g, '')
								.split(' ')
								.filter(Boolean);
						} else {
							polls[cat][String(i)] = [val];
						}
					}
				}
			});
		}

		const ans = weekData.answers || {};
		const exportData = {
			week: parseInt(week, 10),
			group: group,
			season: db.seasonName,
			polls: polls,
			answers: {
				egg: ans.E || 0,
				size: ans.S || 0,
				reward: ans.R || 0,
				token: ans.T || 0,
			},
			scores: weekData.scores || {},
			votes: weekData.votes || {},
		};

		const a = document.createElement('a');
		a.href =
			'data:application/json;charset=utf-8,' +
			encodeURIComponent(JSON.stringify(exportData, null, 4));
		a.download = `votes_${group}_W${week}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setStatus(`Votes and answers exported for Week ${week}.`);
	});
