document
	.getElementById('btnGeneratePolls')
	.addEventListener('click', async () => {
		const maxSRTemplates = [
			['-50k', '51k-70k', '71k-90k', '91k-110k', '+111k'],
			['-60k', '61k-75k', '76k-90k', '91k-110k', '+111k'],
			['-55k', '56k-80k', '81k-105k', '106k-125k', '+126k'],
			['< 50k', '50k-70k', '71k-90k', '91k-115k', '> 115k'],
		];
		const maxSRs =
			maxSRTemplates[Math.floor(Math.random() * maxSRTemplates.length)];
		shuffleArray(maxSRs);
		let maxSRCmd = `/poll create message:${window.POLL_NAMES.M} `;
		maxSRs.forEach((m, i) => (maxSRCmd += `choice${i + 1}:${m} `));

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
		let eggCmd = `/poll create message:${window.POLL_NAMES.E} `;
		for (let i = 0; i < 8; i++) {
			eggCmd += `choice${i + 1}:${eggs[i * 3]} ${eggs[i * 3 + 1]} ${eggs[i * 3 + 2]} `;
		}

		const sizeTemplates = [
			[
				'1-2',
				'3-4',
				'5-6',
				'7-8',
				'9-10',
				'11-12',
				'13-14',
				'15-16',
				'17+',
			],
			['1-3', '4-6', '7-9', '10-12', '13-15', '16+'],
			['1-4', '5-8', '9-12', '13-16', '17+'],
			['1-5', '6-10', '11-15', '16+'],
		];
		const sizes =
			sizeTemplates[Math.floor(Math.random() * sizeTemplates.length)];
		shuffleArray(sizes);
		let sizeCmd = `/poll create message:${window.POLL_NAMES.S} `;
		sizes.forEach((s, i) => (sizeCmd += `choice${i + 1}:${s} `));

		const rewardTemplates = [
			[
				'Artifacts',
				'Piggy Bank',
				'Boosts',
				'Golden Eggs',
				'Soul Eggs',
				'Epic Research',
				'Shell Tickets',
			],
			[
				'Artifact / Epic Research',
				'Piggy Fill',
				'Piggy Level Up',
				'Boosts / GE',
				'SE / Tickets',
			],
			[
				'Beacons / Prisms',
				'Other Boosts',
				'Artifacts',
				'Piggy Bank / GE',
				'Epic Research / SE',
			],
			[
				'Golden Eggs',
				'Piggy (Any)',
				'Artifacts / Epic Research',
				'Boosts',
				'Other',
			],
		];
		const rewards =
			rewardTemplates[Math.floor(Math.random() * rewardTemplates.length)];
		shuffleArray(rewards);
		let rewardCmd = `/poll create message:${window.POLL_NAMES.R} `;
		rewards.forEach((r, i) => (rewardCmd += `choice${i + 1}:${r} `));

		const durationTemplates = [
			['1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d', '+10d'],
			['1-2d', '3-4d', '5-6d', '7-8d', '9-10d', '+11d'],
			['1-3d', '4-6d', '7-9d', '10-12d', '+13d'],
			['1-4d', '5-8d', '9-12d', '+13d'],
			['1-5d', '6-10d', '+11d'],
		];
		const durations =
			durationTemplates[
				Math.floor(Math.random() * durationTemplates.length)
			];
		shuffleArray(durations);
		let durationCmd = `/poll create message:${window.POLL_NAMES.D} `;
		durations.forEach((d, i) => (durationCmd += `choice${i + 1}:${d} `));

		const generatedString = `${maxSRCmd.trim()}\n\n${eggCmd.trim()}\n\n${sizeCmd.trim()}\n\n${rewardCmd.trim()}\n\n${durationCmd.trim()}`;

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
