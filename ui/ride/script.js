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

function renderRides(rides) {
  const ridesList = document.getElementById('ridesList');
  
  if (!rides || rides.length === 0) {
    ridesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-car-side"></i>
        <p>No rides available</p>
        <p class="empty-subtitle">Book a ride to get started</p>
      </div>
    `;
    return;
  }

  const ridesArray = Array.isArray(rides) ? rides : [rides];
  
  ridesList.innerHTML = ridesArray.map(ride => `
    <div class="ride-item">
      <div class="ride-item-header">
        <span class="ride-id">Ride #${ride.id || ride.rideId || 'N/A'}</span>
        <span class="ride-status ${(ride.status || 'pending').toLowerCase()}">
          ${ride.status || 'Pending'}
        </span>
      </div>
      <div class="ride-details">
        <div class="ride-detail">
          <i class="fas fa-map-pin"></i>
          <span><strong>From:</strong> ${ride.from || ride.pickup || 'N/A'}</span>
        </div>
        <div class="ride-detail">
          <i class="fas fa-flag"></i>
          <span><strong>To:</strong> ${ride.to || ride.destination || 'N/A'}</span>
        </div>
        ${ride.userId ? `
          <div class="ride-detail">
            <i class="fas fa-user"></i>
            <span><strong>User ID:</strong> ${ride.userId}</span>
          </div>
        ` : ''}
        ${ride.driverId ? `
          <div class="ride-detail">
            <i class="fas fa-user-tie"></i>
            <span><strong>Driver ID:</strong> ${ride.driverId}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function requestRide() {
  const rUserId = document.getElementById('rUserId');
  const rFrom = document.getElementById('rFrom');
  const rTo = document.getElementById('rTo');
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/api/ride/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: rUserId.value,
        from: rFrom.value,
        to: rTo.value
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      showResponse({ success: true, ...data });
      // Clear form on success
      rFrom.value = '';
      rTo.value = '';
      // Refresh rides list
      await getRides();
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}

async function getRides() {
  try {
    const res = await fetch(`${API_BASE}/rides`, { 
      headers: authHeader() 
    });
    
    const data = await res.json();
    
    if (res.ok) {
      renderRides(data);
      showResponse({ success: true, rides: data });
    } else {
      // If endpoint doesn't exist, show empty state
      renderRides([]);
      showResponse({ info: 'Rides endpoint not available', data }, false);
    }
  } catch (error) {
    renderRides([]);
    showResponse({ error: true, message: error.message }, true);
  }
}

async function assignDriver() {
  const rideId = document.getElementById('rideId');
  
  if (!rideId.value) {
    showResponse({ error: true, message: 'Please enter a ride ID' }, true);
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/rides/assign`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ rideId: rideId.value })
    });
    
    const data = await res.json();
    showResponse(data);
    await getRides();
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  }
}

async function startRide() {
  const rideId = document.getElementById('rideId');
  
  if (!rideId.value) {
    showResponse({ error: true, message: 'Please enter a ride ID' }, true);
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/rides/start`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ rideId: rideId.value })
    });
    
    const data = await res.json();
    showResponse(data);
    await getRides();
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  }
}

async function completeRide() {
  const rideId = document.getElementById('rideId');
  
  if (!rideId.value) {
    showResponse({ error: true, message: 'Please enter a ride ID' }, true);
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/rides/complete`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ rideId: rideId.value })
    });
    
    const data = await res.json();
    showResponse(data);
    await getRides();
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  }
}

// Auto-refresh on load
getRides().catch(() => {});
