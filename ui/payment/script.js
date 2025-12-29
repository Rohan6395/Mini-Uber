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

function updateStats(payments) {
  const paymentsArray = Array.isArray(payments) ? payments : (payments ? [payments] : []);
  
  const totalAmount = paymentsArray.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const successfulPayments = paymentsArray.filter(p => p.status === 'success' || p.status === 'SUCCESS' || !p.status).length;
  
  document.getElementById('totalAmount').textContent = `$${totalAmount.toFixed(2)}`;
  document.getElementById('successfulPayments').textContent = successfulPayments;
  document.getElementById('totalTransactions').textContent = paymentsArray.length;
}

function renderPayments(payments) {
  const paymentsList = document.getElementById('paymentsList');
  
  if (!payments || payments.length === 0) {
    paymentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>No payments found</p>
        <p class="empty-subtitle">Your payment history will appear here</p>
      </div>
    `;
    updateStats([]);
    return;
  }

  const paymentsArray = Array.isArray(payments) ? payments : [payments];
  updateStats(paymentsArray);
  
  paymentsList.innerHTML = paymentsArray.map((payment, index) => `
    <div class="payment-item">
      <div class="payment-item-header">
        <span class="payment-id">Payment #${payment.id || payment.paymentId || index + 1}</span>
        <span class="payment-status">${payment.status || 'Success'}</span>
      </div>
      <div class="payment-details">
        <div class="payment-amount">$${parseFloat(payment.amount || 0).toFixed(2)}</div>
        ${payment.userId ? `
          <div class="payment-detail">
            <i class="fas fa-user"></i>
            <span><strong>User ID:</strong> ${payment.userId}</span>
          </div>
        ` : ''}
        ${payment.rideId ? `
          <div class="payment-detail">
            <i class="fas fa-car"></i>
            <span><strong>Ride ID:</strong> ${payment.rideId}</span>
          </div>
        ` : ''}
        ${payment.timestamp ? `
          <div class="payment-detail">
            <i class="fas fa-clock"></i>
            <span><strong>Date:</strong> ${new Date(payment.timestamp).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function makePayment() {
  const pUserId = document.getElementById('pUserId');
  const pRideId = document.getElementById('pRideId');
  const pAmount = document.getElementById('pAmount');
  const button = event.target.closest('form').querySelector('button');
  
  setButtonLoading(button, true);
  
  try {
    const res = await fetch(`${API_BASE}/api/payment/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: pUserId.value,
        rideId: pRideId.value,
        amount: Number(pAmount.value)
      })
    });

    const data = await res.json();
    
    if (res.ok) {
      showResponse({ success: true, ...data });
      // Clear form on success
      pRideId.value = '';
      pAmount.value = '';
      // Refresh payments list
      await getPayments();
    } else {
      showResponse({ error: true, ...data }, true);
    }
  } catch (error) {
    showResponse({ error: true, message: error.message }, true);
  } finally {
    setButtonLoading(button, false);
  }
}

async function getPayments() {
  try {
    const res = await fetch(`${API_BASE}/payments`, { 
      headers: authHeader() 
    });
    
    const data = await res.json();
    
    if (res.ok) {
      renderPayments(data);
      showResponse({ success: true, payments: data });
    } else {
      // If endpoint doesn't exist, show empty state
      renderPayments([]);
      showResponse({ info: 'Payments endpoint not available', data }, false);
    }
  } catch (error) {
    renderPayments([]);
    showResponse({ error: true, message: error.message }, true);
  }
}

// Auto-refresh on load
getPayments().catch(() => {});
