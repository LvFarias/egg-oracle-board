exports.handler = async (event) => {
	if (event.httpMethod !== 'GET') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	const shuffle = (array) => {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	};

	const maxSRs = shuffle([
		'< 50k',
		'51k-65k',
		'66k-80k',
		'81k-95k',
		'96k-110k',
		'> 111k',
	]);
	const eggs = shuffle([
		':egg_edible:',
		':egg_medical:',
		':egg_tachyon:',
		':egg_dilithium:',
		':egg_quantum:',
		':egg_unknown:',
	]);
	const sizes = shuffle(['1-3', '4-6', '7-9', '10-12', '13-15', '16+']);
	const rewards = shuffle([
		'Artifacts',
		'Piggy Bank',
		'Boosts',
		'Golden Eggs',
		'Soul Eggs',
		'Shell Tickets',
	]);
	const durations = shuffle(['1-3d', '4-6d', '7-9d', '10-12d', '+13d']);

	const buildCmd = (name, choices) =>
		`/poll create message:${name} ` +
		choices.map((c, i) => `choice${i + 1}:${c}`).join(' ');

	const polls = [
		buildCmd('Max SR Score Prediction', maxSRs),
		buildCmd('Next Egg Forecast', eggs),
		buildCmd('Contract Size Prediction', sizes),
		buildCmd('Final Reward Speculation', rewards),
		buildCmd('Contract Duration Guess', durations),
	].join('\n\n');

	return {
		statusCode: 200,
		body: JSON.stringify({ polls }),
	};
};
