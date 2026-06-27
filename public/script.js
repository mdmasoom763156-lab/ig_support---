// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');

const signupForm = document.getElementById('signupForm');
const signupMsg = document.getElementById('signupMsg');

const modal = document.getElementById('signupModal');
const showSignup = document.getElementById('showSignup');
const closeBtn = document.querySelector('.close');

// Show Signup Modal
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'block';
});

// Close Modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ----- SIGNUP (Real API) -----
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupMsg.style.display = 'none';

    const name = document.getElementById('signupFullName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password })
        });
        const data = await response.json();

        if (response.ok) {
            signupMsg.style.color = '#0095f6';
            signupMsg.textContent = '✅ ' + data.message + ' Now Login!';
            signupMsg.style.display = 'block';
            signupForm.reset();
            setTimeout(() => {
                modal.style.display = 'none';
                loginUsername.value = username;
                alert('Account created! Please login.');
            }, 1500);
        } else {
            signupMsg.style.color = '#ed4956';
            signupMsg.textContent = '❌ ' + data.message;
            signupMsg.style.display = 'block';
        }
    } catch (err) {
        alert('Server error! Please try again.');
    }
});

// ----- LOGIN (Real API) -----
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            // Save Token & User Data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert(`🎉 Welcome ${data.user.name}! Login Success!`);
            loginForm.reset();
            
            // 🔥 Yahan aap user data ACCESS kar sakte hain:
            console.log('✅ User Data:', data.user);
            console.log('✅ Token:', data.token);
            
            // Future: window.location.href = "/dashboard.html";
        } else {
            loginError.textContent = '❌ ' + data.message;
            loginError.style.display = 'block';
            loginForm.style.animation = 'shake 0.3s ease-in-out';
            setTimeout(() => loginForm.style.animation = '', 400);
        }
    } catch (err) {
        alert('Server error! Please check your connection.');
    }
});

// ----- Shake Animation -----
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        50% { transform: translateX(10px); }
        75% { transform: translateX(-5px); }
        100% { transform: translateX(0); }
    }
`;
document.head.appendChild(styleSheet);

// Facebook login dummy
document.querySelector('.fb-login')?.addEventListener('click', () => {
    alert('🌐 Facebook login coming soon! Use Sign up/Login above.');
});