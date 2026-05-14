function initWeekSelect() {
	const sel = document.getElementById('weekSelect');
	sel.innerHTML = '';
	const currentWeek = getCurrentWeek();
	for (let i = 1; i <= 13; i++) {
		const opt = document.createElement('option');
		opt.value = i;
		opt.innerText = `Week ${i}`;
		if (i === currentWeek) opt.selected = true;
		sel.appendChild(opt);
	}
}

async function updateUIForSelectedWeek() {
	const db = await loadDB();
	const selectedWeek = parseInt(document.getElementById('weekSelect').value);
	const currentWeek = getCurrentWeek();
	const weekData = db.weeks[selectedWeek] || {};
	const ans = weekData.answers || {};

	document.getElementById('correctSize').value = ans.S || 0;
	document.getElementById('correctEgg').value = ans.E || 0;
	document.getElementById('correctReward').value = ans.R || 0;
	document.getElementById('correctToken').value = ans.T || 0;

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
				setStatus(
					'No scores available for this or previous weeks.',
				);
			}
		}
	}
}

async function switchGroup() {
	window.currentPendingScores = null;
	const db = await loadDB();
	document.getElementById('seasonName').value = db.seasonName || 'Season 1';
	await updateUIForSelectedWeek();
}

document.addEventListener('DOMContentLoaded', () => {
	initWeekSelect();
	switchGroup();
});

document.getElementById('groupSelect').addEventListener('change', switchGroup);
document
	.getElementById('weekSelect')
	.addEventListener('change', updateUIForSelectedWeek);

document.getElementById('seasonName').addEventListener('change', async (e) => {
	const db = await loadDB();
	db.seasonName = e.target.value;
	await saveDB(db);
	renderGlobal(db);
});
