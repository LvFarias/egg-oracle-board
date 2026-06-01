window.EMOJI_MAP = {
	'1️⃣': 1,
	'2️⃣': 2,
	'3️⃣': 3,
	'4️⃣': 4,
	'5️⃣': 5,
	'6️⃣': 6,
	'7️⃣': 7,
	'8️⃣': 8,
	'9️⃣': 9,
	'🔟': 10,
};
window.CATEGORY_NAMES = { E: 'Egg', S: 'Size', R: 'Reward', T: 'Token' };
window.currentPendingScores = null;

function formatName(rawName) {
	return (rawName.trim() || 'Unknown').replace(/_/g, ' ');
}

function setStatus(msg) {
	document.getElementById('status').innerText = msg;
}

function setOutput(html) {
	document.getElementById('pollOutputContainer').style.display = 'none';
	document.getElementById('mainOutputContainer').style.display = 'block';
	document.getElementById('output').innerHTML = html;
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function getCurrentWeek() {
	const startDate = new Date('2026-03-16T16:00:00Z');
	const now = new Date();
	const diffTime = now - startDate;
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	let week = Math.floor(diffDays / 7) + 1;
	return Math.max(1, Math.min(week, 13));
}

function applyColor(text, color) {
	if (!color) return text;
	const codes = {
		red: '\u001b[31m',
		green: '\u001b[32m',
		blue: '\u001b[34m',
		pink: '\u001b[35m',
		cyan: '\u001b[36m',
	};
	return `${codes[color]}${text}\u001b[0m`;
}

document.getElementById('btnCopyOutput').addEventListener('click', () => {
	const text = document.getElementById('output').innerText;
	navigator.clipboard.writeText(text);
	setStatus('Leaderboard copied to clipboard.');
});

if (document.getElementById('btnCopyPolls')) {
	document.getElementById('btnCopyPolls').addEventListener('click', () => {
		const text = document.getElementById('pollOutput').innerText;
		navigator.clipboard.writeText(text);
		setStatus('Polls copied to clipboard.');
	});
}
