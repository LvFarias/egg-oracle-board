const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
);

exports.handler = async (event) => {
	if (event.httpMethod !== 'GET')
		return { statusCode: 405, body: 'Method Not Allowed' };

	const token = event.headers.authorization?.split(' ')[1];
	if (!token)
		return {
			statusCode: 401,
			body: JSON.stringify({ error: 'Unauthorized' }),
		};

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser(token);
	if (authError || !user)
		return {
			statusCode: 401,
			body: JSON.stringify({ error: 'Unauthorized' }),
		};

	const { data, error } = await supabase
		.from('group_users')
		.select(
			`
            groups (
                id, name,
                group_users ( profiles ( id, username ) )
            )
        `,
		)
		.eq('user_id', user.id);

	if (error)
		return {
			statusCode: 500,
			body: JSON.stringify({ error: error.message }),
		};

	return { statusCode: 200, body: JSON.stringify(data) };
};
