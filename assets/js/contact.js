/* ============================================================
   Taqdom · contact — real messages into Supabase
   ============================================================ */
(function () {
  const TQ = window.TAQDOM || {};
  const form = document.getElementById("contact-form");
  if (!form || !TQ.db) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    const { error } = await TQ.db.from("contact_messages").insert({
      name: fd.get("name").trim(),
      email: fd.get("email").trim(),
      subject: fd.get("subject").trim() || null,
      body: fd.get("body").trim()
    });
    btn.disabled = false;
    if (error) return TQ.toast(error.message, "err");
    TQ.toast("Message transmitted ✓ — we reply within 24h.", "ok");
    TQ.track("contact_sent");
    form.reset();
  });
})();
