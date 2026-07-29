const apiHeaders = {
	Authorization: `Bearer ${localStorage.getItem('access_token')}`,
	'Content-Type': 'application/json',
};

document.addEventListener('DOMContentLoaded', () => {
	configurarHeader();
	carregarMeusGrupos();
});

function configurarHeader() {
	const token = localStorage.getItem('access_token');
	const role = localStorage.getItem('user_role');

	if (token) {
		const payload = JSON.parse(atob(token.split('.')[1]));
		document.getElementById('header-username').innerText =
			payload.email.split('@')[0];
	}

	if (role === 'admin') {
		const navMenu = document.getElementById('nav-menu');
		const adminLink = document.createElement('a');
		adminLink.href = 'painel-admin.html';
		adminLink.className = 'nav-tab';
		adminLink.innerText = 'Admin';
		navMenu.appendChild(adminLink);
	}
}

async function carregarMeusGrupos() {
	const res = await fetch('/.netlify/functions/userGroups', {
		headers: apiHeaders,
	});
	const data = await res.json();
	const container = document.getElementById('groups-container');

	if (!data || data.length === 0) {
		container.innerHTML =
			'<p style="color: #b9bbbe; text-align: center;">Você não está em nenhum grupo no momento.</p>';
		return;
	}

	container.innerHTML = data
		.map((item) => gerarHTMLGrupo(item.groups))
		.join('');
}

function gerarHTMLGrupo(group) {
	const weekOptions = Array.from(
		{ length: 13 },
		(_, i) => `<option value="${i + 1}">Week ${i + 1}</option>`,
	).join('');

	return `
    <div class="group-card" id="group-${group.id}">
        <div class="group-header" onclick="toggleAccordion('${group.id}')">
            <span>${group.name}</span>
            <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="group-body">
            
            <div class="grid-3" style="margin-bottom: 15px;">
                <div class="input-group">
                    <label>Season</label>
                    <input type="text" id="season-${group.id}" value="Season 1">
                </div>
                <div class="input-group">
                    <label>Start Date</label>
                    <input type="date" id="date-${group.id}">
                </div>
                <div class="input-group">
                    <label>Week</label>
                    <select id="week-${group.id}">${weekOptions}</select>
                </div>
            </div>

            <div class="section-title">Start Week Config</div>
            <div class="grid-actions">
                <button class="btn btn-green" onclick="gerarEnquetes('${group.id}')" id="btn-gen-${group.id}">Generate Polls</button>
            </div>

            <div class="section-title">Week Results</div>
            <div class="grid-actions">
                <button class="btn btn-blue" onclick="importarSemana('${group.id}')">Import Week</button>
                <button class="btn btn-blue" onclick="exportarSemana('${group.id}')">Export Week</button>
                <input type="file" id="file-${group.id}" accept=".json" style="display: none;" onchange="processarImportacao(event, '${group.id}')">
            </div>

            <div class="grid-5">
                <div class="input-group"><label>Max SR</label><input type="number" id="ans-maxsr-${group.id}" min="0" max="10" value="0"></div>
                <div class="input-group"><label>Egg</label><input type="number" id="ans-egg-${group.id}" min="0" max="10" value="0"></div>
                <div class="input-group"><label>Size</label><input type="number" id="ans-size-${group.id}" min="0" max="10" value="0"></div>
                <div class="input-group"><label>Reward</label><input type="number" id="ans-reward-${group.id}" min="0" max="10" value="0"></div>
                <div class="input-group"><label>Duration</label><input type="number" id="ans-duration-${group.id}" min="0" max="10" value="0"></div>
            </div>

            <button class="btn btn-purple" onclick="calcularRanking('${group.id}')">Calculate Week Ranking</button>

            <div id="output-wrapper-${group.id}" class="output-wrapper">
                <button class="btn-copy" onclick="copiarOutput('${group.id}')">Copiar</button>
                <pre id="output-box-${group.id}" class="output-box"></pre>
            </div>
            
        </div>
    </div>`;
}

function toggleAccordion(groupId) {
	const card = document.getElementById(`group-${groupId}`);
	card.classList.toggle('open');
}

async function gerarEnquetes(groupId) {
	const btn = document.getElementById(`btn-gen-${groupId}`);
	btn.innerText = 'Generating...';
	btn.disabled = true;

	try {
		const res = await fetch('/.netlify/functions/generatePolls', {
			headers: apiHeaders,
		});
		const data = await res.json();

		if (!res.ok) throw new Error(data.error);

		const wrapper = document.getElementById(`output-wrapper-${groupId}`);
		const box = document.getElementById(`output-box-${groupId}`);

		wrapper.style.display = 'block';
		box.innerText = data.polls;
	} catch (error) {
		alert('Erro: ' + error.message);
	} finally {
		btn.innerText = 'Generate Polls';
		btn.disabled = false;
	}
}

function copiarOutput(groupId) {
	const text = document.getElementById(`output-box-${groupId}`).innerText;
	if (!text) return;

	navigator.clipboard.writeText(text).then(() => alert('Copiado!'));
}

function importarSemana(groupId) {
	document.getElementById(`file-${groupId}`).click();
}

function processarImportacao(event, groupId) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const imported = JSON.parse(e.target.result);
			if (imported.answers) {
				document.getElementById(`ans-maxsr-${groupId}`).value =
					imported.answers.M || 0;
				document.getElementById(`ans-egg-${groupId}`).value =
					imported.answers.E || 0;
				document.getElementById(`ans-size-${groupId}`).value =
					imported.answers.S || 0;
				document.getElementById(`ans-reward-${groupId}`).value =
					imported.answers.R || 0;
				document.getElementById(`ans-duration-${groupId}`).value =
					imported.answers.D || 0;
			}
			alert(
				'JSON lido com sucesso. Lógica de banco de dados pendente de implementação.',
			);
		} catch (err) {
			alert('Arquivo JSON inválido.');
		}
	};
	reader.readAsText(file);
}

function exportarSemana(groupId) {
	alert(
		'Função de exportação isolada requer busca no banco pelo Week atual selecionado.',
	);
}

function calcularRanking(groupId) {
	const wrapper = document.getElementById(`output-wrapper-${groupId}`);
	const box = document.getElementById(`output-box-${groupId}`);
	wrapper.style.display = 'block';
	box.innerText =
		'Lógica de cálculo e geração da tabela ANSI pendente da estrutura final do banco de dados.';
}

function goTo(page) {
	window.location.href = `${page}.html`;
}
