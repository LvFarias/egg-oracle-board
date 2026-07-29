const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
);

exports.handler = async (event) => {
	if (event.httpMethod === 'GET') {
		const { data, error } = await supabase.from('groups').select(`
            id, name,
            group_users ( user_id, profiles ( id, username ) )
        `);
		if (error)
			return {
				statusCode: 500,
				body: JSON.stringify({ error: error.message }),
			};
		return { statusCode: 200, body: JSON.stringify(data) };
	}

	if (event.httpMethod === 'POST') {
		const { name } = JSON.parse(event.body);
		const { data, error } = await supabase
			.from('groups')
			.insert([{ name }]);
		if (error)
			return {
				statusCode: 500,
				body: JSON.stringify({ error: error.message }),
			};
		return { statusCode: 200, body: JSON.stringify(data) };
	}

	if (event.httpMethod === 'DELETE') {
		const { id } = JSON.parse(event.body);
		const { data, error } = await supabase
			.from('groups')
			.delete()
			.eq('id', id);
		if (error)
			return {
				statusCode: 500,
				body: JSON.stringify({ error: error.message }),
			};
		return { statusCode: 200, body: JSON.stringify(data) };
	}

	if (event.httpMethod === 'PUT') {
		const { action, groupId, userId, userIds } = JSON.parse(event.body);

		if (action === 'addUsers') {
			const inserts = userIds.map((uid) => ({
				group_id: groupId,
				user_id: uid,
			}));
			const { data, error } = await supabase
				.from('group_users')
				.insert(inserts);
			if (error)
				return {
					statusCode: 500,
					body: JSON.stringify({ error: error.message }),
				};
			return { statusCode: 200, body: JSON.stringify(data) };
		}

		if (action === 'removeUser') {
			const { data, error } = await supabase
				.from('group_users')
				.delete()
				.match({ group_id: groupId, user_id: userId });
			if (error)
				return {
					statusCode: 500,
					body: JSON.stringify({ error: error.message }),
				};
			return { statusCode: 200, body: JSON.stringify(data) };
		}
	}

	return { statusCode: 405, body: 'Method Not Allowed' };
};
