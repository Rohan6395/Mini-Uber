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

function updateStats(notifications) {
  const notificationsArray = Array.isArray(notifications) ? notifications : (notifications ? [notifications] : []);
  
  const readCount = notificationsArray.filter(n => n.read === true || n.status === 'read').length;
  const unreadCount = notificationsArray.length - readCount;
  
  document.getElementById('totalNotifications').textContent = notificationsArray.length;
  document.getElementById('readNotifications').textContent = readCount;
  document.getElementById('unreadNotifications').textContent = unreadCount;
}

function renderNotifications(notifications) {
  const notificationsList = document.getElementById('notificationsList');
  
  if (!notifications || notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>No notifications</p>
        <p class="empty-subtitle">Your notifications will appear here</p>
      </div>
    `;
    updateStats([]);
    return;
  }

  const notificationsArray = Array.isArray(notifications) ? notifications : [notifications];
  updateStats(notificationsArray);
  
  notificationsList.innerHTML = notificationsArray.map((notification, index) => {
    const type = notification.type || notification.notificationType || 'info';
    const isUnread = !notification.read;
    const timestamp = notification.timestamp || notification.createdAt || new Date().toISOString();
    const timeAgo = getTimeAgo(new Date(timestamp));
    
    return `
      <div class="notification-item ${type} ${isUnread ? 'unread' : ''}">
        <div class="notification-item-header">
          <span class="notification-type-badge ${type}">${type}</span>
          <span class="notification-time">${timeAgo}</span>
        </div>
        <div class="notification-message">
          ${notification.message || notification.payload?.message || 'No message'}
        </div>
        <div class="notification-details">
          ${notification.userId ? `
            <div class="notification-detail">
              <i class="fas fa-user"></i>
              <span><strong>User ID:</strong> ${notification.userId}</span>
            </div>
          ` : ''}
          ${notification.payload ? `
            <div class="notification-detail">
              <i class="fas fa-info-circle"></i>
              <span><strong>Type:</strong> ${notification.payload.type || notification.type || 'N/A'}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

async function sendNotification() {
  const nUserId = document.getElementById('nUserId');
  const nMessage = document.getElementById('nMessage');
  const notificationType = document.querySelector('input[name="notificationType"]:checked').value;
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: nUserId.value,
        message: nMessage.value,
        type: notificationType
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      showResponse({ success: true, ...data });
      // Clear form on success
      nMessage.value = '';
      // Refresh notifications list
      await getNotifications();
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}

async function getNotifications() {
  try {
    const res = await fetch(`${API_BASE}/notifications`, { 
      headers: authHeader() 
    });
    
    const data = await res.json();
    
    if (res.ok) {
      renderNotifications(data);
      showResponse({ success: true, notifications: data });
    } else {
      // If endpoint doesn't exist, show empty state
      renderNotifications([]);
      showResponse({ info: 'Notifications endpoint not available', data }, false);
    }
  } catch (error) {
    renderNotifications([]);
    showResponse({ error: true, message: error.message }, true);
  }
}

// Auto-refresh on load
getNotifications().catch(() => {});
