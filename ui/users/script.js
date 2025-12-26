const API_BASE = "http://localhost:3000"; // API Gateway

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

async function register() {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      name: regName.value,
      email: regEmail.value,
      password: regPassword.value
    })
  });

  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

async function login() {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      email: loginEmail.value,
      password: loginPassword.value
    })
  });

  const data = await res.json();
  localStorage.setItem("token", data.token);
  output.innerText = JSON.stringify(data, null, 2);
}
