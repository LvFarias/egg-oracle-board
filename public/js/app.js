const token = localStorage.getItem('access_token');
const role = localStorage.getItem('user_role');
const currentPage = window.location.pathname;

if (!token && currentPage.includes('painel.html')) {
	window.location.href = 'index.html';
}

if (token && (currentPage.includes('index.html') || currentPage === '/')) {
	if (role === 'admin') {
		window.location.href = 'painel-admin.html';
	} else {
		window.location.href = 'painel-user.html';
	}
}

function fazerLogout() {
	localStorage.removeItem('user_role');
	localStorage.removeItem('access_token');
	window.location.href = 'index.html';
}

function goTo(page) {
	window.location.href = `${page}.html`;
}