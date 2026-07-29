const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const toggleMode = document.getElementById('toggle-mode');
const errorMessage = document.getElementById('error-message');

let isLogin = true;

toggleMode.addEventListener('click', () => {
	isLogin = !isLogin;
	formTitle.innerText = isLogin ? 'Entrar' : 'Cadastrar';
	btnSubmit.innerText = isLogin ? 'Login' : 'Cadastrar';
	toggleMode.innerText = isLogin
		? 'Não tem uma conta? Cadastre-se'
		: 'Já tem uma conta? Entre';
	errorMessage.style.display = 'none';
});

btnSubmit.addEventListener('click', async () => {
	const email = document.getElementById('email').value;
	const password = document.getElementById('password').value;

	btnSubmit.innerText = 'Carregando...';
	btnSubmit.disabled = true;
	errorMessage.style.display = 'none';

	const action = isLogin ? 'login' : 'signup';

	try {
		const response = await fetch('/.netlify/functions/auth', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, action }),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error);
		}

		if (data.token) {
			localStorage.setItem('access_token', data.token);
			localStorage.setItem('user_role', data.role);

			if (data.role === 'admin') {
				window.location.href = 'painel-admin.html';
			} else {
				window.location.href = 'painel-user.html';
			}
		} else {
			errorMessage.innerText =
				'Cadastro concluído. Verifique seu e-mail para confirmar.';
			errorMessage.style.display = 'block';
			btnSubmit.innerText = isLogin ? 'Login' : 'Cadastrar';
			btnSubmit.disabled = false;
		}
	} catch (error) {
		errorMessage.innerText = error.message;
		errorMessage.style.display = 'block';
		btnSubmit.innerText = isLogin ? 'Login' : 'Cadastrar';
		btnSubmit.disabled = false;
	}
});

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js');
}
