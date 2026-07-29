const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
	if (event.httpMethod !== 'POST')
		return { statusCode: 405, body: 'Method Not Allowed' };

	const { email, password, action } = JSON.parse(event.body);
	let authResponse;
	let role = 'user';

	if (action === 'login') {
		authResponse = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (authResponse.data.user) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', authResponse.data.user.id)
				.single();
			if (profile) role = profile.role;
		}
	} else if (action === 'signup') {
		authResponse = await supabase.auth.signUp({ email, password });

		if (authResponse.data.user) {
			// Cria o registro na tabela profiles com role padrão 'user'
			await supabase
				.from('profiles')
				.insert([
					{
						id: authResponse.data.user.id,
						username: email.split('@')[0],
						role: 'user',
					},
				]);
		}
	} else {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: 'Ação inválida' }),
		};
	}

	if (authResponse.error) {
		return {
			statusCode: 401,
			body: JSON.stringify({ error: authResponse.error.message }),
		};
	}

	return {
		statusCode: 200,
		body: JSON.stringify({
			token: authResponse.data.session?.access_token,
			user: authResponse.data.user,
			role: role,
		}),
	};
};
