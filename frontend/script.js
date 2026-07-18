/* ============================================================
   NAGPUR SERVICE HUB — Auth Script 
   ============================================================ */

const authForm       = document.getElementById('auth-form');
const messagePara    = document.getElementById('message');
const formTitle      = document.getElementById('form-title');
const formSubtitle   = document.getElementById('form-subtitle');
const submitBtn      = document.getElementById('submit-btn');

const nameGroup      = document.getElementById('name-group');
const roleGroup      = document.getElementById('role-group');
const locationGroup  = document.getElementById('location-group');
const nameInput      = document.getElementById('name');
const roleSelect     = document.getElementById('role');
const locationSelect = document.getElementById('location');
const manualLocInput = document.getElementById('manual-location');

let isLoginMode = false;

/* ── Toggle Manual Location Input ── */
locationSelect.addEventListener('change', (e) => {
  if (e.target.value === 'Other') {
    manualLocInput.style.display = 'block';
    manualLocInput.required = true;
  } else {
    manualLocInput.style.display = 'none';
    manualLocInput.required = false;
    manualLocInput.value = '';
  }
});

/* ── Toggle between Login / Sign‑Up ── */
function setMode(loginMode) {
  isLoginMode = loginMode;

  if (isLoginMode) {
    formTitle.innerText    = 'Welcome Back';
    formSubtitle.innerText = 'Enter your details to access your dashboard.';
    submitBtn.innerText    = 'Log In';

    nameGroup.style.display     = 'none';
    roleGroup.style.display     = 'none';
    locationGroup.style.display = 'none';
    nameInput.required          = false;
    manualLocInput.required     = false;
  } else {
    formTitle.innerText    = 'Create Account';
    formSubtitle.innerText = 'Join to hire help or find local jobs.';
    submitBtn.innerText    = 'Sign Up';

    nameGroup.style.display     = 'block';
    roleGroup.style.display     = 'block';
    locationGroup.style.display = 'block';
    nameInput.required          = true;
    
    // Maintain manual location requirement state if 'Other' is selected
    if (locationSelect.value === 'Other') {
      manualLocInput.required = true;
    }
  }

  messagePara.innerText = '';
}

/* ── Toggle link — event delegation ── */
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'toggle-link') {
    e.preventDefault();
    setMode(!isLoginMode);

    // Update toggle text
    const toggleText = document.getElementById('toggle-text');
    if (isLoginMode) {
      toggleText.innerHTML = 'Need an account? <a href="#" id="toggle-link">Sign up</a>';
    } else {
      toggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-link">Log in</a>';
    }
  }
});

/* ── Show message helper ── */
function showMessage(msg, isError = false) {
  messagePara.style.color = isError ? '#ef4444' : '#10d9a0';
  messagePara.innerText   = msg;
}

/* ── Form Submission ── */
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messagePara.innerText = '';

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Basic client-side validation
  if (!email || !password) {
    showMessage('Please fill in all required fields.', true);
    return;
  }
  if (!isLoginMode && !nameInput.value.trim()) {
    showMessage('Please enter your full name.', true);
    return;
  }

  // Determine the final location string
  let finalLocation = locationSelect.value;
  if (!isLoginMode && finalLocation === 'Other') {
    finalLocation = manualLocInput.value.trim();
    if (!finalLocation) {
      showMessage('Please enter your specific location.', true);
      return;
    }
  }

  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  const payload  = isLoginMode
    ? { email, password }
    : {
        name    : nameInput.value.trim(),
        email,
        password,
        role    : roleSelect.value,
        location: finalLocation,
      };

  const originalText  = submitBtn.innerText;
  submitBtn.innerText = isLoginMode ? 'Logging in…' : 'Creating account…';
  submitBtn.disabled  = true;

  try {
    const response = await fetch(endpoint, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message);

      if (isLoginMode) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showMessage('Login successful! Redirecting…');
        setTimeout(() => (window.location.href = 'dashboard.html'), 900);
      } else {
        authForm.reset();
        manualLocInput.style.display = 'none'; // reset manual input box
        showMessage('Account created! Please log in.');
        setTimeout(() => {
          setMode(true);
          const toggleText = document.getElementById('toggle-text');
          toggleText.innerHTML = 'Need an account? <a href="#" id="toggle-link">Sign up</a>';
        }, 1000);
      }
    } else {
      showMessage(data.message || 'Something went wrong.', true);
    }
  } catch (err) {
    console.error('Auth error:', err);
    showMessage('Connection error. Is the server running?', true);
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled  = false;
  }
});

/* ── Redirect if already logged in ── */
if (localStorage.getItem('token') && localStorage.getItem('user')) {
  window.location.href = 'dashboard.html';
}