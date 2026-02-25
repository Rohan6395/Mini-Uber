// =============================================
//  CabNet — Ride Service UI
//  API Gateway : http://localhost:8080
//  Backend     : POST /api/rides → ride-service:5002/book
// =============================================
const API = "http://localhost:8080";

// Pickup → Zone mapping (same as backend)
const PICKUP_ZONE_MAP = {
  "HSR": "HSR_LAYOUT",
  "BTM": "BTM_LAYOUT",
  "Koramangala": "KORAMANGALA",
  "Indiranagar": "INDIRANAGAR",
  "Whitefield": "WHITEFIELD",
  "Electronic City": "ELECTRONIC_CITY"
};

// ---------- Auto-fill zone ----------
document.getElementById("pickup").addEventListener("change", (e) => {
  const zone = PICKUP_ZONE_MAP[e.target.value] || "";
  document.getElementById("zone").value = zone;
});

// ---------- Toast ----------
function toast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : "🚗"}</span> ${msg}`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(100%)"; setTimeout(() => el.remove(), 400); }, 3500);
}

// ---------- Response ----------
function showResponse(data) {
  const card = document.getElementById("responseCard");
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("closeResponseBtn").addEventListener("click", () => {
  document.getElementById("responseCard").style.display = "none";
});

// ---------- Loading ----------
function setLoading(btn, loading) {
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

// ---------- Ride Status ----------
function setRideStatus(status, rideId) {
  const section = document.getElementById("rideStatusSection");
  const badge = document.getElementById("statusBadge");
  const idDisplay = document.getElementById("rideIdDisplay");
  section.style.display = "block";

  if (status === "SEARCHING") {
    badge.className = "status-badge searching";
    badge.innerHTML = '<span class="pulse-dot"></span> Searching for drivers…';
  } else if (status === "CONFIRMED") {
    badge.className = "status-badge confirmed";
    badge.innerHTML = "✅ Ride Confirmed!";
  } else if (status === "EXPIRED") {
    badge.className = "status-badge expired";
    badge.innerHTML = "⏱ No driver found — ride expired";
  } else {
    badge.className = "status-badge idle";
    badge.innerHTML = "No active ride";
  }

  if (rideId) {
    idDisplay.innerHTML = `Ride ID: <code>${rideId}</code>`;
  }
}

// ---------- Book Ride ----------
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("bookBtn");

  const userId = document.getElementById("userId").value.trim();
  const pickup = document.getElementById("pickup").value;
  const destination = document.getElementById("destination").value;
  const fare = Number(document.getElementById("fare").value);
  const zone = document.getElementById("zone").value;

  if (!userId || !pickup || !destination || !fare || !zone) {
    toast("Please fill in all fields", "error");
    return;
  }

  if (pickup === destination) {
    toast("Pickup and destination can't be the same!", "error");
    return;
  }

  setLoading(btn, true);

  try {
    const res = await fetch(`${API}/api/rides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pickup, destination, fare, zone })
    });

    const data = await res.json();

    if (res.ok) {
      toast("Ride requested! Searching for drivers…", "success");
      showResponse({ success: true, ...data });
      setRideStatus("SEARCHING", data.rideId);

      // Copy rideId to clipboard
      if (data.rideId) {
        try { await navigator.clipboard.writeText(data.rideId); } catch (_) { }
        toast(`Ride ID copied to clipboard`, "info");
      }
    } else {
      toast(data.error || data.message || "Failed to book ride", "error");
      showResponse({ error: true, ...data });
    }
  } catch (error) {
    toast("Cannot reach server — is Docker running?", "error");
    showResponse({ error: true, message: error.message });
  } finally {
    setLoading(btn, false);
  }
});
