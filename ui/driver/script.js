const API_BASE = "http://localhost:3000";

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

async function registerDriver() {
  const res = await fetch(`${API_BASE}/drivers`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      name: dName.value,
      vehicle: dVehicle.value
    })
  });

  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

async function getAvailableRides() {
  const res = await fetch(`${API_BASE}/rides/available`, { headers: authHeader() });
  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

getAvailableRides().catch(() => {});
