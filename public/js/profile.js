const API_BASE = 'http://localhost:3000/api';

function updateProfileWidget(user) {
    const profileDiv = document.getElementById('profile-widget');
    if (!profileDiv) return;

    if (!user) {
        profileDiv.innerHTML = `
            <a href="login.html" class="login-link">Login</a>
        `;
        return;
    }

    const progress = user.tierProgress || { progress: 0, currentSpent: 0, nextTierThreshold: 1000 };
    const initial = user.name.charAt(0).toUpperCase();

    profileDiv.innerHTML = `
        <div class="user-info">
            <div class="avatar">${initial}</div>
            <div>
                <strong>${user.name}</strong>
                <span class="tier-badge">Tier ${user.tier}</span>
            </div>
        </div>
        <div class="xp-bar">
            <div class="progress" style="width: ${progress.progress}%"></div>
        </div>
        <div class="tier-progress">
            $${progress.currentSpent} / $${progress.nextTierThreshold}
        </div>
        <button onclick="logout()" class="logout-btn">Logout</button>
    `;
}

async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            updateProfileWidget(data.user);
        } else {
            updateProfileWidget(null);
        }
    } catch (err) {
        console.error('Failed to check login status:', err);
        updateProfileWidget(null);
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (err) {
        console.error('Logout failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Add profile widget container to header if possible, else body
    let header = document.querySelector('header > div');
    let profileDiv = document.getElementById('profile-widget');
    if (!profileDiv) {
        profileDiv = document.createElement('div');
        profileDiv.id = 'profile-widget';
        profileDiv.className = 'profile-widget';
        if (header) {
            header.appendChild(profileDiv);
        } else {
            document.body.appendChild(profileDiv);
        }
    } else if (header && profileDiv.parentNode !== header) {
        header.appendChild(profileDiv);
    }
    checkLoginStatus();
});