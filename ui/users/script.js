// =============================================
//  CabNet — User Service UI
//  Talks to API Gateway at :8080
// =============================================
const API = "http://localhost:8080";

// ---------- Toast System ----------
function toast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span> ${message}`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(100%)";
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ---------- Response Card ----------
function showResponse(data) {
  const card = document.getElementById("responseCard");
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("closeResponseBtn").addEventListener("click", () => {
  document.getElementById("responseCard").style.display = "none";
});

// ---------- Loading State ----------
function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.classList.add("loading");
    btn.disabled = true;
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

// ---------- Register ----------
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("registerBtn");
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!email || !password) {
    toast("Please fill in all fields", "error");
    return;
  }

  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      toast("Account created successfully!", "success");
      showResponse({ success: true, ...data });
      document.getElementById("regEmail").value = "";
      document.getElementById("regPassword").value = "";
    } else {
      toast(data.error || data.message || "Registration failed", "error");
      showResponse({ error: true, ...data });
    }
  } catch (error) {
    toast("Cannot reach server — is it running?", "error");
    showResponse({ error: true, message: error.message });
  } finally {
    setLoading(btn, false);
  }
});

// ---------- Login ----------
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    toast("Please fill in all fields", "error");
    return;
  }

  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      toast("Login successful! Redirecting…", "success");
      showResponse({ success: true, ...data });
      document.getElementById("loginEmail").value = "";
      document.getElementById("loginPassword").value = "";
    } else {
      toast(data.error || data.message || "Login failed", "error");
      showResponse({ error: true, ...data });
    }
  } catch (error) {
    toast("Cannot reach server — is it running?", "error");
    showResponse({ error: true, message: error.message });
  } finally {
    setLoading(btn, false);
  }
});
