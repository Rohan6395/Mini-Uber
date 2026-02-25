// =============================================
//  CabNet — Driver Dashboard UI
//  WebSocket to driver-service:7001
//  Multiple drivers can go online from same page
// =============================================
const WS_URL = "ws://localhost:7001";

// Track all online drivers: { driverId -> { ws, zone, rideRequests } }
const onlineDrivers = new Map();

// ---------- Toast ----------
function toast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✅", error: "❌", info: "ℹ️", ride: "🚗" };
  el.innerHTML = `<span>${icons[type] || "ℹ️"}</span> ${msg}`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(100%)";
    setTimeout(() => el.remove(), 400);
  }, 4000);
}

// ---------- Response Log ----------
const logEntries = [];

function appendLog(entry) {
  logEntries.push({ time: new Date().toLocaleTimeString(), ...entry });
  const card = document.getElementById("responseCard");
  card.style.display = "block";
  document.getElementById("output").textContent = JSON.stringify(logEntries.slice(-30), null, 2);
}

document.getElementById("closeResponseBtn").addEventListener("click", () => {
  document.getElementById("responseCard").style.display = "none";
});

// ---------- Render Online Drivers ----------
function renderOnlineDrivers() {
  const list = document.getElementById("onlineDriversList");

  if (onlineDrivers.size === 0) {
    list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No drivers online yet</p>`;
    return;
  }

  list.innerHTML = "";
  onlineDrivers.forEach((driver, driverId) => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:10px; margin-bottom:8px;";
    item.innerHTML = `
      <div>
        <span style="font-weight:600; color: var(--accent-emerald);">${driverId}</span>
        <span style="color: var(--text-muted); font-size:0.8rem; margin-left:8px;">${driver.zone}</span>
      </div>
      <button onclick="goOffline('${driverId}')" style="background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.25); padding:6px 14px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:600;">
        Go Offline
      </button>
    `;
    list.appendChild(item);
  });
}

// ---------- Render Rides for All Drivers ----------
function renderAllRides() {
  const list = document.getElementById("ridesList");
  let allRides = new Map();

  // Collect rides from all drivers
  onlineDrivers.forEach((driver) => {
    driver.rideRequests.forEach((ride, rideId) => {
      allRides.set(rideId, ride);
    });
  });

  if (allRides.size === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛣️</div>
        <p>No ride requests yet</p>
        <p style="font-size: 0.8rem; margin-top: 8px; opacity: 0.6;">
          Go online first, then book a ride from port 8082 to see it here
        </p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";
  allRides.forEach((ride, rideId) => {
    const item = document.createElement("div");
    item.className = "ride-item";
    item.innerHTML = `
      <div class="ride-item-header">
        <span class="ride-id">${rideId.substring(0, 8)}…</span>
        <span class="ride-fare">₹${ride.fare || 0}</span>
      </div>
      <div class="ride-details">
        <div class="ride-detail">
          <strong>📍 Pickup:</strong> <span>${ride.pickup || "N/A"}</span>
        </div>
        <div class="ride-detail">
          <strong>🏁 Dest:</strong> <span>${ride.destination || "N/A"}</span>
        </div>
        <div class="ride-detail">
          <strong>🗺️ Zone:</strong> <span>${ride.zone || "N/A"}</span>
        </div>
      </div>
      ${ride.status === "accepted"
        ? `<div style="color: var(--accent-emerald); font-weight: 600; font-size: 0.9rem;">✅ Ride Accepted by ${ride.acceptedBy || "driver"}</div>`
        : ride.status === "taken"
          ? `<div style="color: var(--accent-rose); font-weight: 600; font-size: 0.9rem;">❌ Already Taken</div>`
          : `<button class="btn btn-accept" onclick="acceptRide('${rideId}', '${ride.receivedBy}')">Accept Ride →</button>`
      }
    `;
    list.appendChild(item);
  });
}

// ---------- Connect a Driver via WebSocket ----------
function connectDriver(driverId, zone) {
  if (onlineDrivers.has(driverId)) {
    toast(`${driverId} is already online!`, "error");
    return;
  }

  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    // Send ONLINE message
    ws.send(JSON.stringify({
      type: "ONLINE",
      driverId: driverId,
      zone: zone
    }));

    onlineDrivers.set(driverId, { ws, zone, rideRequests: new Map() });
    renderOnlineDrivers();
    toast(`${driverId} is now ONLINE in ${zone}`, "success");
    appendLog({ event: "DRIVER_ONLINE", driverId, zone });
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    appendLog({ event: "WS_MESSAGE", driverId, data });

    const driver = onlineDrivers.get(driverId);
    if (!driver) return;

    switch (data.type) {
      case "NEW_RIDE":
        const ride = data.ride;
        driver.rideRequests.set(ride.rideId, { ...ride, status: "pending", receivedBy: driverId });
        renderAllRides();
        toast(`🚗 ${driverId}: New ride! ₹${ride.fare} — ${ride.pickup} → ${ride.destination}`, "ride");
        // Audio beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 800; gain.gain.value = 0.1;
          osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch (_) { }
        break;

      case "RIDE_CONFIRMED":
        if (driver.rideRequests.has(data.rideId)) {
          driver.rideRequests.get(data.rideId).status = "accepted";
          driver.rideRequests.get(data.rideId).acceptedBy = driverId;
          renderAllRides();
        }
        toast(`🎉 ${driverId} got the ride! Confirmed.`, "success");
        break;

      case "RIDE_ALREADY_TAKEN":
        if (driver.rideRequests.has(data.rideId)) {
          driver.rideRequests.get(data.rideId).status = "taken";
          renderAllRides();
        }
        toast(`${driverId}: Ride already taken`, "error");
        break;

      case "RIDE_REJECTED":
        if (driver.rideRequests.has(data.rideId)) {
          driver.rideRequests.get(data.rideId).status = "taken";
          renderAllRides();
        }
        toast(`${driverId}: Ride assigned to another driver`, "info");
        break;
    }
  };

  ws.onclose = () => {
    onlineDrivers.delete(driverId);
    renderOnlineDrivers();
    renderAllRides();
    toast(`${driverId} disconnected`, "error");
    appendLog({ event: "DRIVER_DISCONNECTED", driverId });
  };

  ws.onerror = () => {
    toast(`${driverId}: WebSocket error`, "error");
    appendLog({ event: "WS_ERROR", driverId });
  };
}

// ---------- Accept Ride ----------
function acceptRide(rideId, driverId) {
  const driver = onlineDrivers.get(driverId);
  if (!driver || !driver.ws || driver.ws.readyState !== WebSocket.OPEN) {
    toast("Driver not connected!", "error");
    return;
  }

  driver.ws.send(JSON.stringify({
    type: "ACCEPT_RIDE",
    rideId: rideId,
    driverId: driverId
  }));

  toast(`${driverId} attempting to accept ride…`, "info");
  appendLog({ event: "ACCEPT_RIDE_SENT", rideId, driverId });
}

// ---------- Go Offline ----------
function goOffline(driverId) {
  const driver = onlineDrivers.get(driverId);
  if (driver && driver.ws) {
    driver.ws.send(JSON.stringify({ type: "OFFLINE", driverId }));
    driver.ws.close();
  }
  onlineDrivers.delete(driverId);
  renderOnlineDrivers();
  renderAllRides();
  toast(`${driverId} is now OFFLINE`, "info");
}

// ---------- Go Online Form ----------
document.getElementById("goOnlineForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const driverId = document.getElementById("driverId").value.trim();
  const zone = document.getElementById("zone").value;

  if (!driverId || !zone) {
    toast("Please fill in Driver ID and Zone", "error");
    return;
  }

  connectDriver(driverId, zone);

  // Clear form for next driver
  document.getElementById("driverId").value = "";
  document.getElementById("zone").value = "";
});
