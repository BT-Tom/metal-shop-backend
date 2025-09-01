// Dynamic profile-space allocator: measures #profile-widget and sets --profile-space CSS var
(function() {
	function updateProfileSpace() {
		try {
			const profile = document.getElementById('profile-widget');
			if (!profile) return;
			const rect = profile.getBoundingClientRect();
			// reserve width = profile width + some padding
			const reserve = Math.max(200, Math.ceil(rect.width + 24));
			document.documentElement.style.setProperty('--profile-space', reserve + 'px');
		} catch (e) {
			// silent
		}
	}

	window.addEventListener('load', updateProfileSpace);
	window.addEventListener('resize', function() {
		clearTimeout(window.__profileSpaceTimer);
		window.__profileSpaceTimer = setTimeout(updateProfileSpace, 120);
	});

	// watch for changes inside profile-widget (e.g., login status changes)
	const profileRoot = document.getElementById('profile-widget');
	if (profileRoot && window.MutationObserver) {
		const mo = new MutationObserver(() => updateProfileSpace());
		mo.observe(profileRoot, { childList: true, subtree: true, characterData: true });
	}
})();
