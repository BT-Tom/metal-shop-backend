const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('login-message');

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[DEBUG] Register form submitted');

        const formData = {
            name: registerForm.querySelector('[name="name"]').value,
            email: registerForm.querySelector('[name="email"]').value,
            password: registerForm.querySelector('[name="password"]').value
        };

        console.log('[DEBUG] Sending registration data:', formData);

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            console.log('[DEBUG] Registration response status:', response.status);
            const data = await response.json();
            console.log('[DEBUG] Registration response:', data);

            if (data.success) {
                messageDiv.textContent = 'Registration successful! Redirecting...';
                setTimeout(() => window.location.href = '/', 2000);
            } else {
                messageDiv.textContent = data.message || 'Registration failed';
            }
        } catch (err) {
            console.error('[DEBUG] Registration error:', err);
            messageDiv.textContent = `Error: ${err.message}`;
        }
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[DEBUG] Login form submitted');

        const formData = {
            email: loginForm.querySelector('[name="email"]').value,
            password: loginForm.querySelector('[name="password"]').value
        };

        console.log('[DEBUG] Sending login data:', formData);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            console.log('[DEBUG] Login response status:', response.status);
            const data = await response.json();
            console.log('[DEBUG] Login response:', data);

            if (data.success) {
                messageDiv.textContent = 'Login successful! Redirecting...';
                setTimeout(() => window.location.href = '/', 2000);
            } else {
                messageDiv.textContent = data.message || 'Login failed';
            }
        } catch (err) {
            console.error('[DEBUG] Login error:', err);
            messageDiv.textContent = `Error: ${err.message}`;
        }
    });
});