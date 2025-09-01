// popup.js - Simple popup notification for login required

function showPopup(message) {
    let popup = document.getElementById('popup-message');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'popup-message';
        popup.style.position = 'fixed';
        popup.style.top = '32px';
        popup.style.left = '50%';
        popup.style.transform = 'translateX(-50%)';
        popup.style.background = '#23272b';
        popup.style.color = '#fff';
        popup.style.padding = '16px 32px';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
        popup.style.fontSize = '1.15em';
        popup.style.zIndex = '3005';
        popup.style.opacity = '0.98';
        document.body.appendChild(popup);
    }
    popup.textContent = message;
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.opacity = '0.2';
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.opacity = '0.98';
        }, 400);
    }, 1800);
}
