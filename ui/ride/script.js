const API_BASE = "http://localhost:3000";

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

// alias for compatibility with provided snippets
const API = API_BASE;

async function requestRide() {
  const res = await fetch(`${API_BASE}/rides`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      userId: rUserId.value,
      from: rFrom.value,
      to: rTo.value
    })
  });

  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

async function getRides() {
  const res = await fetch(`${API_BASE}/rides`, { headers: authHeader() });
  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

// auto-refresh on load
getRides().catch(() => {});

async function assignDriver() {
  const res = await fetch(`${API}/rides/assign`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ rideId: rideId.value })
  });
  output.innerText = JSON.stringify(await res.json(), null, 2);
}

async function startRide() {
  const res = await fetch(`${API}/rides/start`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ rideId: rideId.value })
  });
  output.innerText = JSON.stringify(await res.json(), null, 2);
}

async function completeRide() {
  const res = await fetch(`${API}/rides/complete`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ rideId: rideId.value })
  });
  output.innerText = JSON.stringify(await res.json(), null, 2);
}
