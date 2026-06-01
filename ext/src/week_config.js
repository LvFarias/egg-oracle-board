document
	.getElementById('btnGeneratePolls')
	.addEventListener('click', async () => {
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

		const generatedString = `${eggCmd.trim()}\n\n${sizeCmd.trim()}\n\n${rewardCmd.trim()}\n\n${tokenCmd.trim()}`;

		document.getElementById('mainOutputContainer').style.display = 'none';
		document.getElementById('pollOutputContainer').style.display = 'block';
		document.getElementById('pollOutput').innerText = generatedString;

		const db = await loadDB();
		const week = document.getElementById('weekSelect').value;
		db.weeks[week].polls = generatedString;
		await saveDB(db);
		setStatus(`Polls generated and saved for Week ${week}.`);
	});

document.getElementById('btnCopyPingUsers').addEventListener('click', () => {
	executeDiscordScript(async (token, channelId) => {
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
			if (!targetMsg.reactions || targetMsg.reactions.length === 0)
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

			if (pingUsers.size === 0) return setStatus('No valid users found.');

			const pingList = Array.from(pingUsers).join(' ');
			navigator.clipboard.writeText(pingList);
			setStatus(`${pingUsers.size} users copied to clipboard.`);
		} catch (e) {
			setStatus('Error: ' + e.message);
		}
	});
});
