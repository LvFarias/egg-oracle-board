async function fetchDiscord(url, token) {
	const res = await fetch(`https://discord.com/api/v9${url}`, {
		headers: { Authorization: token },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

function executeDiscordScript(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (!tab.url.includes('discord.com/channels/'))
			return setStatus('Open the Discord channel page.');

		const channelId = tab.url.split('/').pop();
		setStatus('Extracting token...');

		chrome.scripting.executeScript(
			{
				target: { tabId: tab.id },
				world: 'MAIN',
				func: () => {
					let extractedToken = null;
					try {
						window.webpackChunkdiscord_app.push([
							[Math.random()],
							{},
							(req) => {
								for (const key in req.c) {
									const m = req.c[key].exports;
									if (
										m &&
										m.default &&
										typeof m.default.getToken === 'function'
									) {
										const t = m.default.getToken();
										if (
											typeof t === 'string' &&
											t.split('.').length === 3
										) {
											extractedToken = t;
											break;
										}
									}
									if (m && typeof m.getToken === 'function') {
										const t = m.getToken();
										if (
											typeof t === 'string' &&
											t.split('.').length === 3
										) {
											extractedToken = t;
											break;
										}
									}
								}
							},
						]);
					} catch (e) {}
					return extractedToken;
				},
			},
			(results) => {
				const token = results && results[0] && results[0].result;
				if (!token) return setStatus('Failed to extract token.');
				callback(token, channelId);
			},
		);
	});
}
