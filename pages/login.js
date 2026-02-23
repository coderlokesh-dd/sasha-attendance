// ===== Login Page =====
function renderLoginPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
    <div class="login-page">
      <div class="login-wrapper">
        <div class="login-brand">
          <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'" />
          <h1>Sashainfinty</h1>
          <p>Attendance Management System</p>
        </div>
        <div class="card card-glass">
          <div class="card-header">
            <div class="card-title">Sign In</div>
            <div class="card-description">Enter your credentials to access the dashboard</div>
          </div>
          <div class="card-content">
            <form id="loginForm" style="display:flex;flex-direction:column;gap:16px;">
              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input class="form-input" id="email" type="email" placeholder="you@company.com" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <div class="password-wrapper">
                  <input class="form-input" id="password" type="password" placeholder="••••••••" required />
                  <button type="button" class="password-toggle" id="togglePass">${ICONS.eye}</button>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-full">Sign In</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;

    let showPw = false;
    document.getElementById('togglePass').onclick = () => {
        showPw = !showPw;
        document.getElementById('password').type = showPw ? 'text' : 'password';
        document.getElementById('togglePass').innerHTML = showPw ? ICONS.eyeOff : ICONS.eye;
    };

    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const user = await Auth.login(email, password);
            showToast(`Welcome back, ${user.name}!`);
            Router.navigate('/dashboard');
        } catch {
            showToast('Invalid credentials', 'Please check your email and password.', 'destructive');
        }
    };
}
