const API_BASE = "http://localhost:3000";

function authHeader() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

async function makePayment() {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      userId: pUserId.value,
      rideId: pRideId.value,
      amount: Number(pAmount.value)
    })
  });

  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

async function getPayments() {
  const res = await fetch(`${API_BASE}/payments`, { headers: authHeader() });
  const data = await res.json();
  output.innerText = JSON.stringify(data, null, 2);
}

getPayments().catch(() => {});
