const API_BASE = "http://localhost:3000";

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

async function sendNotification() {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      userId: nUserId.value,
      message: nMessage.value
    })
  });

  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

async function getNotifications() {
  const res = await fetch(`${API_BASE}/notifications`, { headers: authHeader() });
  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

getNotifications().catch(() => {});
