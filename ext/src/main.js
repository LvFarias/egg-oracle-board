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
	const week = document.getElementById('weekSelect').value;
	const weekData = db.weeks[week] || {};
	const ans = weekData.answers || {};

	// Preenche os inputs com as respostas salvas
	document.getElementById('correctSize').value = ans.S || 0;
	document.getElementById('correctEgg').value = ans.E || 0;
	document.getElementById('correctReward').value = ans.R || 0;
	document.getElementById('correctToken').value = ans.T || 0;

	// Se houver polls salvas, mostra; se não, limpa
	if (weekData.polls) {
		document.getElementById('pollOutputContainer').style.display = 'block';
		document.getElementById('pollOutput').innerText = weekData.polls;
	} else {
		document.getElementById('pollOutputContainer').style.display = 'none';
	}
	
	// Esconde o botão de update global até um novo cálculo ser feito
	document.getElementById('btnUpdateGlobal').style.display = 'none';
	
	// Renderiza o ranking da semana se já houver scores salvos, senão renderiza o global
	if (weekData.scores && Object.keys(weekData.scores).length > 0) {
		const groupName = document.getElementById('groupSelect').value;
		renderTable(Object.values(weekData.scores), `${groupName} Contract Board - Week ${week}`);
	} else {
		renderGlobal(db);
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
document.getElementById('weekSelect').addEventListener('change', updateUIForSelectedWeek);

document.getElementById('seasonName').addEventListener('change', async (e) => {
	const db = await loadDB();
	db.seasonName = e.target.value;
	await saveDB(db);
	renderGlobal(db);
});