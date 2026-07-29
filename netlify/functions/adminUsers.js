const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
);

exports.handler = async (event) => {
	if (event.httpMethod === 'GET') {
		const { data, error } = await supabase.from('profiles').select('*');
		if (error)
			return {
				statusCode: 500,
				body: JSON.stringify({ error: error.message }),
			};
		return { statusCode: 200, body: JSON.stringify(data) };
	}

	if (event.httpMethod === 'PUT') {
		const { id, role } = JSON.parse(event.body);
		const { data, error } = await supabase
			.from('profiles')
			.update({ role })
			.eq('id', id);
		if (error)
			return {
				statusCode: 500,
				body: JSON.stringify({ error: error.message }),
			};
		return { statusCode: 200, body: JSON.stringify(data) };
	}

	return { statusCode: 405, body: 'Method Not Allowed' };
};
