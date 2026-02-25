// =============================================
//  CabNet — Payment Service UI
//  POST /api/payments → payment-service:5003/pay
//  Body: { paymentId, amount, userId }
// =============================================
const API = "http://localhost:8080";

// ---------- Toast ----------
function toast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : "💰"}</span> ${msg}`;
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

// ---------- Pay ----------
document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("payBtn");

  const paymentId = document.getElementById("paymentId").value.trim();
  const userId = document.getElementById("userId").value.trim();
  const amount = Number(document.getElementById("amount").value);

  if (!paymentId || !userId || !amount) {
    toast("Please fill in all fields", "error");
    return;
  }

  setLoading(btn, true);

  try {
    const res = await fetch(`${API}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, amount, userId })
    });

    const data = await res.json();

    if (res.ok) {
      toast("Payment processed successfully!", "success");
      showResponse({ success: true, ...data });
      document.getElementById("paymentId").value = "";
      document.getElementById("amount").value = "";
    } else {
      toast(data.error || data.message || "Payment failed", "error");
      showResponse({ error: true, ...data });
    }
  } catch (error) {
    toast("Cannot reach server — is Docker running?", "error");
    showResponse({ error: true, message: error.message });
  } finally {
    setLoading(btn, false);
  }
});
