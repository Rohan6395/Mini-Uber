// =============================================
//  CabNet — Notification / Event Logs UI
//  This page is informational — the notification
//  service is a backend-only queue consumer.
//  No HTTP API calls needed from this page.
// =============================================

// Add minimal interactivity: animate elements on scroll
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 }
  );

  // Observe all major sections
  document.querySelectorAll(".info-card, .arch-card, .flow-card").forEach((el) => {
    el.classList.add("animate-on-scroll");
    observer.observe(el);
  });

  // Stagger flow steps
  document.querySelectorAll(".flow-step").forEach((el, i) => {
    el.classList.add("animate-on-scroll");
    el.style.transitionDelay = `${i * 0.1}s`;
    observer.observe(el);
  });

  // Stagger queue items
  document.querySelectorAll(".queue-item").forEach((el, i) => {
    el.classList.add("animate-on-scroll");
    el.style.transitionDelay = `${i * 0.15}s`;
    observer.observe(el);
  });
});
