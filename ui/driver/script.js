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

function updateStats(rides) {
  const ridesArray = Array.isArray(rides) ? rides : (rides ? [rides] : []);
  
  document.getElementById('totalRides').textContent = ridesArray.length;
  document.getElementById('completedRides').textContent = 
    ridesArray.filter(r => r.status === 'completed' || r.status === 'COMPLETED').length;
  document.getElementById('pendingRides').textContent = 
    ridesArray.filter(r => r.status === 'pending' || r.status === 'PENDING').length;
  
  // Calculate earnings (assuming $10 per completed ride)
  const earnings = ridesArray.filter(r => r.status === 'completed' || r.status === 'COMPLETED').length * 10;
  document.getElementById('totalEarnings').textContent = `$${earnings}`;
}

function renderRides(rides) {
  const ridesList = document.getElementById('ridesList');
  
  if (!rides || rides.length === 0) {
    ridesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-car-side"></i>
        <p>No rides available</p>
        <p class="empty-subtitle">Available rides will appear here when users book rides</p>
        <p class="empty-subtitle" style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.6;">
          💡 Tip: Book a ride as a user first, then refresh here to see it
        </p>
      </div>
    `;
    updateStats([]);
    return;
  }

  const ridesArray = Array.isArray(rides) ? rides : [rides];
  updateStats(ridesArray);
  
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

async function registerDriver() {
  const dName = document.getElementById('dName');
  const dVehicle = document.getElementById('dVehicle');
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: dName.value,
        vehicle: dVehicle.value
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      showResponse({ success: true, ...data });
      // Clear form on success
      dName.value = '';
      dVehicle.value = '';
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}

async function getAvailableRides() {
  try {
    const res = await fetch(`${API_BASE}/rides/available`, { 
      headers: authHeader() 
    });
    
    const data = await res.json();
    
    if (res.ok) {
      renderRides(data);
      showResponse({ success: true, rides: data });
    } else {
      // If endpoint doesn't exist, show empty state
      renderRides([]);
      showResponse({ info: 'Available rides endpoint not available', data }, false);
    }
  } catch (error) {
    renderRides([]);
    showResponse({ error: true, message: error.message }, true);
  }
}

// Auto-refresh on load
getAvailableRides().catch(() => {});
