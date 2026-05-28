// auth.js - handles login + register pages

(function () {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginMessage = document.getElementById('login-message');
  const registerMessage = document.getElementById('register-message');

  function showMessage(el, text, type = 'error') {
    if (!el) return;
    el.textContent = text || '';
    el.className = `message ${type}`;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(loginMessage, '', 'error');

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      try {
        const data = await window.makeyoubetterApi.apiRequest('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        window.makeyoubetterApi.setToken(data.token);
        window.location.href = '/dashboard.html';
      } catch (err) {
        showMessage(loginMessage, err.message || 'Login failed', 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(registerMessage, '', 'error');

      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;

      try {
        const data = await window.makeyoubetterApi.apiRequest('/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });

        window.makeyoubetterApi.setToken(data.token);
        window.location.href = '/dashboard.html';
      } catch (err) {
        showMessage(registerMessage, err.message || 'Registration failed', 'error');
      }
    });
  }
})();

