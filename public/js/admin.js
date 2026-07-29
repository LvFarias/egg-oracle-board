const apiHeaders = {
	Authorization: `Bearer ${localStorage.getItem('access_token')}`,
	'Content-Type': 'application/json',
};

let allUsers = [];

async function carregarUsuarios() {
	const res = await fetch('/.netlify/functions/adminUsers', {
		headers: apiHeaders,
	});
	allUsers = await res.json();

	// Atualiza o nome no header
	exibirUsuarioLogado();

	document.getElementById('users-list').innerHTML = allUsers
		.map(
			(u) => `
        <div class="user-card">
            <div class="user-info">
                <span class="username">${u.username || u.id}</span>
                <span class="badge ${u.role === 'admin' ? 'admin' : 'member'}">${u.role === 'admin' ? 'ADMIN' : 'MEMBER'}</span>
            </div>
            <div class="user-actions">
                <select class="role-select" onchange="alterarRole('${u.id}', this.value)">
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="user" ${u.role !== 'admin' ? 'selected' : ''}>Member</option>
                </select>
                <button class="btn-remove" onclick="removerUsuario('${u.id}')">Remove</button>
            </div>
        </div>
    `,
		)
		.join('');

	carregarGrupos();
}

async function alterarRole(id, role) {
	await fetch('/.netlify/functions/adminUsers', {
		method: 'PUT',
		headers: apiHeaders,
		body: JSON.stringify({ id, role }),
	});
	carregarUsuarios();
}

async function removerUsuario(id) {
	await fetch('/.netlify/functions/adminUsers', {
		method: 'DELETE',
		headers: apiHeaders,
		body: JSON.stringify({ id }),
	});
	carregarUsuarios();
}

let currentGroupId = null;
let groupDataCache = [];

async function carregarGrupos() {
	const res = await fetch('/.netlify/functions/adminGroups', {
		headers: apiHeaders,
	});
	groupDataCache = await res.json();
	console.log(groupDataCache);

	document.getElementById('groups-list').innerHTML = groupDataCache
		.map((g) => {
			const usersInGroup = g.group_users
				? g.group_users.map((gu) => gu.profiles)
				: [];

			const usersHtml = usersInGroup
				.map((u) => {
					if (!u) return '';
					return `
                <div class="group-user-card">
                    <span>${u.username || u.id}</span>
                    <button class="btn-remove-small" onclick="removerUsuarioGrupo('${g.id}', '${u.id}')">Deletar</button>
                </div>
            `;
				})
				.join('');

			return `
            <div class="item-row" style="background: #18191c; border-color: #202225;">
                <div class="group-header">
                    <div class="group-title-area">
                        <strong style="font-size: 18px; color: #fff;">${g.name}</strong>
                        <button class="btn-add" onclick="abrirModalAddUser('${g.id}')">+</button>
                    </div>
                    <button class="btn-remove" onclick="deletarGrupo('${g.id}')">Deletar Grupo</button>
                </div>
                <div class="group-users-grid">
                    ${usersHtml}
                </div>
            </div>
        `;
		})
		.join('');
}

function abrirModalAddUser(groupId) {
	currentGroupId = groupId;
	const group = groupDataCache.find((g) => g.id === groupId);
	const usersInGroupIds = group.group_users
		? group.group_users.map((gu) => gu.user_id)
		: [];

	const availableUsers = allUsers.filter(
		(u) => !usersInGroupIds.includes(u.id),
	);

	document.getElementById('modal-user-list').innerHTML = availableUsers
		.map(
			(u) => `
        <label class="user-checkbox-item">
            <input type="checkbox" value="${u.id}" class="user-checkbox">
            <span>${u.username || u.id}</span>
        </label>
    `,
		)
		.join('');

	document.getElementById('add-user-modal').style.display = 'flex';
}

function fecharModal() {
	document.getElementById('add-user-modal').style.display = 'none';
	currentGroupId = null;
}

async function confirmarAddUsers() {
	const checkboxes = document.querySelectorAll('.user-checkbox:checked');
	const userIds = Array.from(checkboxes).map((cb) => cb.value);

	if (userIds.length === 0) return fecharModal();

	await fetch('/.netlify/functions/adminGroups', {
		method: 'PUT',
		headers: apiHeaders,
		body: JSON.stringify({
			action: 'addUsers',
			groupId: currentGroupId,
			userIds,
		}),
	});

	fecharModal();
	carregarGrupos();
}

async function removerUsuarioGrupo(groupId, userId) {
	await fetch('/.netlify/functions/adminGroups', {
		method: 'PUT',
		headers: apiHeaders,
		body: JSON.stringify({ action: 'removeUser', groupId, userId }),
	});
	carregarGrupos();
}

async function criarGrupo() {
	const name = document.getElementById('new-group-name').value;
	if (!name) return;
	await fetch('/.netlify/functions/adminGroups', {
		method: 'POST',
		headers: apiHeaders,
		body: JSON.stringify({ name }),
	});
	document.getElementById('new-group-name').value = '';
	carregarGrupos();
}

async function deletarGrupo(id) {
	await fetch('/.netlify/functions/adminGroups', {
		method: 'DELETE',
		headers: apiHeaders,
		body: JSON.stringify({ id }),
	});
	carregarGrupos();
}

function exibirUsuarioLogado() {
	const token = localStorage.getItem('access_token');
	if (!token) return;

	const payload = JSON.parse(atob(token.split('.')[1]));
	const userId = payload.sub;

	const usuarioAtual = allUsers.find((u) => u.id === userId);

	if (usuarioAtual) {
		document.getElementById('header-username').innerText =
			usuarioAtual.username || usuarioAtual.id;
	}
}

document.addEventListener('DOMContentLoaded', carregarUsuarios);
