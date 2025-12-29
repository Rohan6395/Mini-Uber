const API_BASE = "http://localhost:3000"; // API Gateway

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

function showResponse(data, isError = false) {
  const responseCard = document.getElementById('responseCard');
  const output = document.getElementById('output');
  
  output.textContent = JSON.stringify(data, null, 2);
  responseCard.style.display = 'block';
  responseCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeResponse() {
  document.getElementById('responseCard').style.display = 'none';
}

function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

async function register() {
  const regName = document.getElementById('regName');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: regName.value,
        email: regEmail.value,
        password: regPassword.value
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      showResponse({ success: true, ...data });
      // Clear form on success
      regName.value = '';
      regEmail.value = '';
      regPassword.value = '';
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}

async function login() {
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      showResponse({ success: true, ...data });
      // Clear form on success
      loginEmail.value = '';
      loginPassword.value = '';
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}
