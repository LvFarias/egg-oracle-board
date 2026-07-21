function initWeekSelect(db) {
	const sel = document.getElementById('weekSelect');
	sel.innerHTML = '';
	const currentWeek = getCurrentWeek(db.seasonStartDate);
	for (let i = 1; i <= 13; i++) {
		const opt = document.createElement('option');
		opt.value = i;
		opt.innerText = `Week ${i}`;
		if (i === currentWeek) opt.selected = true;
		sel.appendChild(opt);
	}
}

async function loadGroups() {
	return new Promise((resolve) => {
		chrome.storage.local.get(
			['savedGroups', 'lastSelectedGroup'],
			(res) => {
				let groups = res.savedGroups || [];
				let last = res.lastSelectedGroup;
				resolve({ groups, lastSelectedGroup: last });
			},
		);
	});
}

async function saveGroups(groups) {
	return new Promise((resolve) => {
		chrome.storage.local.set({ savedGroups: groups }, resolve);
	});
}

async function renderGroupSelect() {
	const { groups, lastSelectedGroup } = await loadGroups();
	const sel = document.getElementById('groupSelect');
	sel.innerHTML = '';

	if (groups.length === 0) {
		const defaultOpt = document.createElement('option');
		defaultOpt.value = '';
		defaultOpt.innerText = 'Select a group...';
		defaultOpt.disabled = true;
		defaultOpt.selected = true;
		sel.appendChild(defaultOpt);
	}

	groups.forEach((g) => {
		const opt = document.createElement('option');
		opt.value = g;
		opt.innerText = g;
		sel.appendChild(opt);
	});

	const newOpt = document.createElement('option');
	newOpt.value = 'new_group';
	newOpt.innerText = '+ New Group';
	sel.appendChild(newOpt);

	if (groups.includes(lastSelectedGroup)) {
		sel.value = lastSelectedGroup;
	} else if (groups.length > 0) {
		sel.value = groups[0];
		chrome.storage.local.set({ lastSelectedGroup: groups[0] });
	}
}

async function updateUIForSelectedWeek() {
	const db = await loadDB();
	const selectedWeek = parseInt(document.getElementById('weekSelect').value);
	const currentWeek = getCurrentWeek(db.seasonStartDate);
	const weekData = db.weeks[selectedWeek] || {};
	const ans = weekData.answers || {};

	document.getElementById('correctSize').value = ans.S || 0;
	document.getElementById('correctEgg').value = ans.E || 0;
	document.getElementById('correctReward').value = ans.R || 0;
	document.getElementById('correctDuration').value = ans.D || 0;
	document.getElementById('correctMaxSR').value = ans.M || 0;

	if (weekData.polls) {
		document.getElementById('pollOutputContainer').style.display = 'block';
		document.getElementById('pollOutput').innerText = weekData.polls;
	} else {
		document.getElementById('pollOutputContainer').style.display = 'none';
	}

	document.getElementById('btnUpdateGlobal').style.display = 'none';
	const groupName = document.getElementById('groupSelect').value;

	if (selectedWeek === currentWeek) {
		renderGlobal(db);
		setStatus('');
	} else {
		if (weekData.scores && Object.keys(weekData.scores).length > 0) {
			renderTable(
				Object.values(weekData.scores),
				`${groupName} Contract Board - Week ${selectedWeek}`,
			);
			setStatus('');
		} else {
			let foundWeek = -1;
			for (let i = selectedWeek - 1; i >= 1; i--) {
				if (
					db.weeks[i] &&
					db.weeks[i].scores &&
					Object.keys(db.weeks[i].scores).length > 0
				) {
					foundWeek = i;
					break;
				}
			}
			if (foundWeek !== -1) {
				renderTable(
					Object.values(db.weeks[foundWeek].scores),
					`${groupName} Contract Board - Week ${foundWeek}`,
				);
				setStatus(
					`Displaying Week ${foundWeek} ranking (latest retroactive data found).`,
				);
			} else {
				document.getElementById('mainOutputContainer').style.display =
					'none';
				setStatus('No scores available for this or previous weeks.');
			}
		}
	}
}

async function switchGroup() {
	const group = document.getElementById('groupSelect').value;
	if (!group || group === 'new_group') {
		document.getElementById('pollOutputContainer').style.display = 'none';
		document.getElementById('mainOutputContainer').style.display = 'none';
		setStatus('Please create or select a group.');
		return;
	}

	window.currentPendingScores = null;
	const db = await loadDB();
	document.getElementById('seasonName').value = db.seasonName || 'Season 1';
	document.getElementById('seasonStartDate').value = db.seasonStartDate || '';
	initWeekSelect(db);
	await updateUIForSelectedWeek();
}

document.addEventListener('DOMContentLoaded', async () => {
	await renderGroupSelect();
	switchGroup();
});

document.getElementById('groupSelect').addEventListener('change', async (e) => {
	if (e.target.value === 'new_group') {
		const newGroupName = prompt('Enter new group name:');
		if (newGroupName && newGroupName.trim() !== '') {
			const cleanName = newGroupName.trim();
			const { groups } = await loadGroups();
			if (!groups.includes(cleanName)) {
				groups.push(cleanName);
				await saveGroups(groups);
			}
			chrome.storage.local.set({ lastSelectedGroup: cleanName });
		}
		await renderGroupSelect();
	} else {
		chrome.storage.local.set({ lastSelectedGroup: e.target.value });
	}
	switchGroup();
});

document
	.getElementById('weekSelect')
	.addEventListener('change', updateUIForSelectedWeek);

document.getElementById('seasonName').addEventListener('change', async (e) => {
	const db = await loadDB();
	db.seasonName = e.target.value;
	await saveDB(db);
	renderGlobal(db);
});

document
	.getElementById('seasonStartDate')
	.addEventListener('change', async (e) => {
		const db = await loadDB();
		db.seasonStartDate = e.target.value;
		await saveDB(db);
		initWeekSelect(db);
		await updateUIForSelectedWeek();
	});

document
	.getElementById('btnDeleteGroup')
	.addEventListener('click', async () => {
		const group = document.getElementById('groupSelect').value;
		if (!group || group === 'new_group') return;

		if (
			confirm(
				`Are you sure you want to completely delete the group "${group}" and ALL its data?`,
			)
		) {
			const { groups } = await loadGroups();
			const newGroups = groups.filter((g) => g !== group);
			await saveGroups(newGroups);

			chrome.storage.local.remove([`season_db_${group}`]);

			if (newGroups.length > 0) {
				chrome.storage.local.set({ lastSelectedGroup: newGroups[0] });
			} else {
				chrome.storage.local.remove(['lastSelectedGroup']);
			}

			await renderGroupSelect();
			switchGroup();
		}
	});
