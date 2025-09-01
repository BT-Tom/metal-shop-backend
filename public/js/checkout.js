document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('checkout-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Starting checkout...';
        try {
            const res = await fetch('/api/payments/create-checkout-session', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (data.error) {
                alert('Checkout error: ' + data.error);
                btn.disabled = false;
                btn.textContent = 'Checkout';
            } else {
                alert('Unexpected response from server');
                btn.disabled = false;
                btn.textContent = 'Checkout';
            }
        } catch (err) {
            console.error('Checkout request failed', err);
            alert('Checkout request failed: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Checkout';
        }
    });
});
