// main.js

(() => {
  const WHATSAPP_TARGET_E164 = "39334207715";
  const COOKIE_CONSENT_KEY = "ff_cookie_consent_v1";

  const MODAL_HTML = `
<div class="ff-lead-modal" id="ffLeadModal" hidden>
  <div class="ff-lead-backdrop" data-ff-lead-close aria-hidden="true"></div>

  <div class="ff-lead-dialog" role="dialog" aria-modal="true" aria-labelledby="ffLeadTitle">
    <button class="ff-lead-close" type="button" aria-label="Chiudi" data-ff-lead-close>&times;</button>
    <div class="ff-lead-header">
      <h2 id="ffLeadTitle">Parliamo del <span class="hl-grad">tuo progetto</span></h2>
      <p class="ff-lead-sub">Lasciami i tuoi contatti: ti rispondo presto con un piano dedicato.</p>
    </div>

    <form class="ff-lead-form" id="ffLeadForm" novalidate>
      <div class="ff-lead-row">
        <div class="ff-lead-field">
          <label for="ffLeadFirst">Il tuo Nome *</label>
          <input id="ffLeadFirst" name="ff_first_name" type="text" autocomplete="given-name" required>
        </div>
        <div class="ff-lead-field">
          <label for="ffLeadLast">Il tuo Cognome *</label>
          <input id="ffLeadLast" name="ff_last_name" type="text" autocomplete="family-name" required>
        </div>
      </div>

      <div class="ff-lead-row">
        <div class="ff-lead-field">
          <label for="ffLeadPhone">Numero di telefono *</label>
          <input id="ffLeadPhone" name="ff_phone" type="tel" inputmode="tel" autocomplete="tel" pattern="[0-9\\s()+-]{6,}" required>
        </div>
        <div class="ff-lead-field">
          <label for="ffLeadEmail">Email *</label>
          <input id="ffLeadEmail" name="ff_email" type="email" autocomplete="email" required>
        </div>
      </div>

      <div class="ff-lead-row">
        <div class="ff-lead-field">
          <label for="ffLeadBusiness">Nome della tua attività *</label>
          <input id="ffLeadBusiness" name="ff_business" type="text" autocomplete="organization" required>
        </div>
        <div class="ff-lead-field">
          <label id="ffLeadSectorLabel" for="ffLeadSectorHidden">A cosa sei interessato? *</label>
          <input id="ffLeadSectorHidden" name="ff_sector" type="hidden" required>
          <button class="ff-lead-select" type="button" data-ff-lead-select aria-haspopup="listbox" aria-expanded="false" aria-labelledby="ffLeadSectorLabel ffLeadSectorValue">
            <span class="ff-lead-select__value" id="ffLeadSectorValue" data-ff-lead-select-value>Seleziona</span>
            <span class="ff-lead-select__chev" aria-hidden="true"></span>
          </button>
          <div class="ff-lead-selectMenu" data-ff-lead-select-menu role="listbox" aria-label="Interesse" hidden>
            <button class="ff-lead-selectOpt" type="button" role="option" data-value="Sito web">
              <span class="ff-lead-dot" aria-hidden="true"></span><span>Sito web</span>
            </button>
            <button class="ff-lead-selectOpt" type="button" role="option" data-value="E-commerce">
              <span class="ff-lead-dot" aria-hidden="true"></span><span>E-commerce</span>
            </button>
            <button class="ff-lead-selectOpt" type="button" role="option" data-value="Gestionale">
              <span class="ff-lead-dot" aria-hidden="true"></span><span>Gestionale</span>
            </button>
            <button class="ff-lead-selectOpt" type="button" role="option" data-value="Altro">
              <span class="ff-lead-dot" aria-hidden="true"></span><span>Altro</span>
            </button>
          </div>
        </div>
      </div>

      <div class="ff-lead-choiceBlock" role="group" aria-label="Budget">
        <p class="ff-lead-choiceTitle">Qual è il budget per il progetto? *</p>
        <div class="ff-lead-choiceRow ff-lead-choiceRow--budget">
          <label class="ff-lead-radio">
            <input type="radio" name="ff_budget" value="0 - 1.000 €" checked required>
            <span>0 - 1.000 €</span>
          </label>
          <label class="ff-lead-radio">
            <input type="radio" name="ff_budget" value="1.200 - 3.000 €">
            <span>1.200 - 3.000 €</span>
          </label>
          <label class="ff-lead-radio">
            <input type="radio" name="ff_budget" value="+3.000 €">
            <span>+3.000 €</span>
          </label>
        </div>
      </div>

      <label class="ff-lead-privacy">
        <input type="checkbox" name="ff_privacy" required>
        <span>Accetto i termini e la <a href="/pages/privacy-policy/" target="_blank" rel="noopener">privacy policy</a>.</span>
      </label>

      <div class="ff-lead-actions">
        <button class="ff-lead-btn ff-lead-btn--primary" type="submit" data-ff-lead-submit>Invia richiesta</button>
        <button class="ff-lead-btn ff-lead-btn--ghost" type="button" data-ff-lead-close>Chiudi</button>
      </div>

      <div class="ff-lead-status" data-ff-lead-status role="status" aria-live="polite">
        <span data-ff-lead-status-text></span>
      </div>
    </form>
  </div>
</div>`;

  const COOKIE_BANNER_HTML = `
<div class="ff-cookie" id="ffCookieBanner" hidden>
  <div class="ff-cookie__panel" role="dialog" aria-label="Preferenze cookie" aria-modal="false">
    <div class="ff-cookie__content">
      <p class="ff-cookie__eyebrow">Cookie e privacy</p>
      <h2 class="ff-cookie__title">Preferenze cookie</h2>
      <p class="ff-cookie__text">
        Usiamo strumenti tecnici necessari al funzionamento del sito e una memorizzazione locale per ricordare la tua scelta.
        Google Analytics al momento non e attivo. Puoi accettare o rifiutare i cookie opzionali.
      </p>
      <div class="ff-cookie__links">
        <a href="/pages/privacy-policy/">Privacy Policy</a>
        <a href="/pages/cookie-policy/">Cookie Policy</a>
      </div>
    </div>
    <div class="ff-cookie__actions">
      <button type="button" class="ff-cookie__btn ff-cookie__btn--ghost" data-ff-cookie-reject>Rifiuta</button>
      <button type="button" class="ff-cookie__btn ff-cookie__btn--primary" data-ff-cookie-accept>Accetta</button>
    </div>
  </div>
</div>`;

  function ensureModal() {
    let modalEl = document.getElementById("ffLeadModal");
    if (!modalEl) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = MODAL_HTML.trim();
      modalEl = wrapper.firstElementChild;
      document.body.appendChild(modalEl);
    }
    return modalEl;
  }

  function readCookieConsent() {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || (parsed.status !== "accepted" && parsed.status !== "rejected")) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCookieConsent(status) {
    const payload = {
      status,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
    } catch (_) {}
    return payload;
  }

  function applyCookieConsent(consent) {
    const status = consent && consent.status ? consent.status : "unknown";
    document.documentElement.dataset.ffCookieConsent = status;
    window.ffCookieConsentStatus = status;
    window.dispatchEvent(new CustomEvent("ff:cookie-consent", { detail: { status, consent: consent || null } }));
  }

  function ensureCookieBanner() {
    let el = document.getElementById("ffCookieBanner");
    if (!el) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = COOKIE_BANNER_HTML.trim();
      el = wrapper.firstElementChild;
      if (el) document.body.appendChild(el);
    }
    return el;
  }

  function initCookieConsentBanner() {
    const existing = readCookieConsent();
    applyCookieConsent(existing);

    const banner = ensureCookieBanner();
    if (!banner) return;

    const acceptBtn = banner.querySelector("[data-ff-cookie-accept]");
    const rejectBtn = banner.querySelector("[data-ff-cookie-reject]");

    const hideBanner = () => banner.setAttribute("hidden", "hidden");
    const showBanner = () => banner.removeAttribute("hidden");

    if (existing) hideBanner();
    else showBanner();

    function saveChoice(status) {
      const saved = writeCookieConsent(status);
      applyCookieConsent(saved);
      hideBanner();
    }

    if (acceptBtn && !acceptBtn.dataset.boundCookie) {
      acceptBtn.dataset.boundCookie = "1";
      acceptBtn.addEventListener("click", () => saveChoice("accepted"));
    }
    if (rejectBtn && !rejectBtn.dataset.boundCookie) {
      rejectBtn.dataset.boundCookie = "1";
      rejectBtn.addEventListener("click", () => saveChoice("rejected"));
    }
  }

  function autoTagLeads() {
    const rules = [
      { sel: ".ff-cta", source: "Header" },
      { sel: "#welcome .cta button", source: "Hero" },
      { sel: ".ff-pack__btn", source: "Pacchetto" },
      { sel: ".ff-steps__btn", source: "Metodo" },
      { sel: ".ff-final__btn", source: "Finale" },
      { sel: ".ff-tlclean__btn", source: "Timeline" }
    ];
    rules.forEach(rule => {
      document.querySelectorAll(rule.sel).forEach(el => {
        if (el.matches(".ff-portfolio__open")) return;
        if (el.target === "_blank" && !el.classList.contains("ff-final__btn")) return;
        el.dataset.ffLead = el.dataset.ffLead || "1";
        if (!el.dataset.ffSource) el.dataset.ffSource = rule.source || "unknown";
      });
    });
  }

  autoTagLeads();
  initCookieConsentBanner();

  function ensureNavToggle() {
    const navEl = document.querySelector(".ff-nav");
    if (!navEl) return { navEl: null, toggleEl: null };

    let toggleEl = document.querySelector("[data-ff-nav-toggle]");
    if (!toggleEl) {
      const headerInner = navEl.closest(".ff-header__inner");
      if (headerInner) {
        toggleEl = document.createElement("button");
        toggleEl.type = "button";
        toggleEl.className = "ff-nav-toggle";
        toggleEl.setAttribute("data-ff-nav-toggle", "");
        toggleEl.setAttribute("aria-label", "Apri menu");
        toggleEl.setAttribute("aria-expanded", "false");

        const navId = navEl.id || "ffSiteNav";
        navEl.id = navId;
        toggleEl.setAttribute("aria-controls", navId);

        toggleEl.innerHTML = "<span></span><span></span><span></span>";

        const cta = headerInner.querySelector(".ff-cta");
        if (cta) headerInner.insertBefore(toggleEl, cta);
        else headerInner.appendChild(toggleEl);
      }
    } else if (navEl && !toggleEl.getAttribute("aria-controls")) {
      const navId = navEl.id || "ffSiteNav";
      navEl.id = navId;
      toggleEl.setAttribute("aria-controls", navId);
    }

    return { navEl, toggleEl };
  }

  const navParts = ensureNavToggle();
  const modal = ensureModal();
  const navToggle = navParts.toggleEl;
  const nav = navParts.navEl;
  const dialog = modal.querySelector(".ff-lead-dialog");
  const form = modal.querySelector("#ffLeadForm");
  const statusEl = modal.querySelector("[data-ff-lead-status]");
  const statusText = modal.querySelector("[data-ff-lead-status-text]");
  const submitBtn = modal.querySelector("[data-ff-lead-submit]");
  const closeButtons = modal.querySelectorAll("[data-ff-lead-close]");
  const backdrop = modal.querySelector(".ff-lead-backdrop");
  const interestSelectBtn = modal.querySelector("[data-ff-lead-select]");
  const interestSelectMenu = modal.querySelector("[data-ff-lead-select-menu]");
  const interestSelectValue = modal.querySelector("[data-ff-lead-select-value]");
  const interestHidden = modal.querySelector("#ffLeadSectorHidden");

  let lastTrigger = null;
  let focusables = [];
  let firstFocus = null;
  let lastFocus = null;
  let openMeta = null;

  function closeInterestSelect({ focusButton = false } = {}) {
    if (!interestSelectBtn || !interestSelectMenu) return;
    interestSelectBtn.setAttribute("aria-expanded", "false");
    interestSelectMenu.hidden = true;
    if (focusButton) interestSelectBtn.focus({ preventScroll: true });
  }

  function openInterestSelect() {
    if (!interestSelectBtn || !interestSelectMenu) return;
    interestSelectBtn.setAttribute("aria-expanded", "true");
    interestSelectMenu.hidden = false;
    const selected = interestSelectMenu.querySelector('[aria-selected="true"]') || interestSelectMenu.querySelector(".ff-lead-selectOpt");
    if (selected) selected.focus({ preventScroll: true });
  }

  function toggleInterestSelect() {
    if (!interestSelectBtn || !interestSelectMenu) return;
    const isOpen = interestSelectBtn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeInterestSelect({ focusButton: true });
    else openInterestSelect();
  }

  function setInterestValue(value) {
    if (!interestHidden || !interestSelectValue || !interestSelectMenu) return;
    interestHidden.value = value;
    interestSelectValue.textContent = value;
    interestSelectMenu.querySelectorAll(".ff-lead-selectOpt").forEach(btn => {
      const isSelected = btn.dataset.value === value;
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function resetInterestSelect() {
    if (!interestHidden || !interestSelectValue || !interestSelectMenu) return;
    interestHidden.value = "";
    interestSelectValue.textContent = "Seleziona";
    interestSelectMenu.querySelectorAll(".ff-lead-selectOpt").forEach(btn => btn.setAttribute("aria-selected", "false"));
    closeInterestSelect();
  }

  function track(eventName, data = {}) {
    console.log("[track]", eventName, data);
  }

  function collectUTM() {
    const params = new URLSearchParams(window.location.search || "");
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_term: params.get("utm_term") || "",
      utm_content: params.get("utm_content") || ""
    };
  }

  function getClickedLabel(el) {
    if (!el) return "";
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    return (el.textContent || "").trim();
  }

  function guessSource(el) {
    if (!el) return "unknown";
    if (el.dataset.ffSource) return el.dataset.ffSource;
    const section = el.closest("section[id]");
    if (section && section.id) return section.id;
    if (el.closest("header")) return "header";
    if (el.closest("footer")) return "footer";
    return "unknown";
  }

  function setStatus(kind, message) {
    if (!statusEl || !statusText) return;
    statusEl.dataset.state = kind;
    statusText.textContent = message || "";
  }

  function clearStatus() {
    setStatus("", "");
  }

  function disableForm(isDisabled) {
    const els = form ? Array.from(form.elements) : [];
    els.forEach(el => { el.disabled = isDisabled && el.type !== "hidden"; });
    if (submitBtn) submitBtn.disabled = isDisabled;
    if (isDisabled) modal.classList.add("is-loading"); else modal.classList.remove("is-loading");
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    if (!focusables.length) return;
    if (e.shiftKey && document.activeElement === firstFocus) {
      e.preventDefault();
      lastFocus.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocus) {
      e.preventDefault();
      firstFocus.focus();
    }
  }

  function closeModal() {
    closeInterestSelect();
    modal.setAttribute("hidden", "hidden");
    modal.classList.remove("is-open");
    document.body.classList.remove("ff-lead-modal-open");
    clearStatus();
    disableForm(false);
    if (form) form.reset();
    resetInterestSelect();
    openMeta = null;
    modal.removeEventListener("keydown", trapFocus);
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function prepareFocusables() {
    focusables = Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    firstFocus = focusables[0] || dialog;
    lastFocus = focusables[focusables.length - 1] || dialog;
  }

  function openModal(trigger) {
    lastTrigger = trigger;
    const utm = collectUTM();
    const meta = {
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer || "",
      timestamp_iso: new Date().toISOString(),
      clicked_label: getClickedLabel(trigger),
      clicked_source: guessSource(trigger),
      ...utm
    };
    openMeta = meta;

    modal.removeAttribute("hidden");
    modal.classList.add("is-open");
    document.body.classList.add("ff-lead-modal-open");
    prepareFocusables();
    modal.addEventListener("keydown", trapFocus);
    (firstFocus || dialog).focus({ preventScroll: true });

    track("lead_modal_open", meta);
  }

  function buildWhatsAppLeadMessage(payload) {
    const lines = [
      "*Nuova richiesta dal sito*",
      "",
      `Nome: ${payload.first_name} ${payload.last_name}`.trim(),
      `Telefono: ${payload.phone || "-"}`,
      `Email: ${payload.email || "-"}`,
      `Attivita: ${payload.business || "-"}`,
      `Interesse: ${payload.sector || "-"}`,
      `Budget: ${payload.budget || "-"}`,
      "",
      "*Dettagli origine*",
      `Fonte click: ${payload.clicked_source || "-"}`,
      `Pulsante: ${payload.clicked_label || "-"}`,
      `Pagina: ${payload.page_path || payload.page_url || "-"}`,
      `URL: ${payload.page_url || "-"}`,
      "",
      `Timestamp: ${payload.timestamp_iso || new Date().toISOString()}`
    ];

    if (payload.utm_source || payload.utm_medium || payload.utm_campaign || payload.utm_term || payload.utm_content) {
      lines.push("");
      lines.push("*UTM*");
      lines.push(`utm_source: ${payload.utm_source || "-"}`);
      lines.push(`utm_medium: ${payload.utm_medium || "-"}`);
      lines.push(`utm_campaign: ${payload.utm_campaign || "-"}`);
      lines.push(`utm_term: ${payload.utm_term || "-"}`);
      lines.push(`utm_content: ${payload.utm_content || "-"}`);
    }

    return lines.join("\n");
  }

  async function submitLead(payload) {
    const message = buildWhatsAppLeadMessage(payload);
    const url = `https://wa.me/${WHATSAPP_TARGET_E164}?text=${encodeURIComponent(message)}`;

    let opened = null;
    try {
      opened = window.open(url, "_blank", "noopener,noreferrer");
    } catch (_) {
      opened = null;
    }

    if (!opened) {
      window.location.href = url;
    }

    return true;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form || !openMeta) return;
    const fd = new FormData(form);
    const payload = {
      first_name: (fd.get("ff_first_name") || "").trim(),
      last_name: (fd.get("ff_last_name") || "").trim(),
      phone: (fd.get("ff_phone") || "").trim(),
      email: (fd.get("ff_email") || "").trim(),
      business: (fd.get("ff_business") || "").trim(),
      sector: (fd.get("ff_sector") || "").trim(),
      budget: (fd.get("ff_budget") || "").trim(),
      privacy: fd.get("ff_privacy") === "on",
      ...openMeta
    };

    const missing = [];
    if (!payload.first_name) missing.push("Nome");
    if (!payload.last_name) missing.push("Cognome");
    if (!payload.email) missing.push("Email");
    if (!payload.phone) missing.push("Telefono");
    if (!payload.business) missing.push("Attività");
    if (!payload.sector) missing.push("Interesse");
    if (!payload.budget) missing.push("Budget");
    if (!payload.privacy) missing.push("Privacy");

    // email valida
    const emailOk = payload.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email);

    // telefono: solo numeri (+ facoltativo), minimo 6 cifre
    const hasLetters = /[A-Za-z]/.test(payload.phone || "");
    const digitsCount = (payload.phone || "").replace(/\D/g, "").length;
    const phoneOk = !!payload.phone && !hasLetters && digitsCount >= 6;

    if (missing.length > 0) {
      const msg = missing.length === 1
        ? `Manca: ${missing[0]}`
        : `Mancano: ${missing.join(", ")}`;
      setStatus("error", msg);
      return;
    }

    if (!emailOk) {
      setStatus("error", "Inserisci una mail valida (es. nome@dominio.it).");
      return;
    }
    if (!phoneOk) {
      setStatus("error", "Inserisci un numero di telefono valido (solo cifre, minimo 6).");
      return;
    }

    track("lead_submit_attempt", payload);
    disableForm(true);
    setStatus("info", "Ti reindirizzo su WhatsApp...");

    submitLead(payload)
      .then(() => {
        setStatus("success", "Apertura WhatsApp in corso...");
        track("lead_submit_success", payload);
        form.reset();
        setTimeout(() => closeModal(), 900);
      })
      .catch(() => {
        setStatus("error", "Impossibile aprire WhatsApp. Riprova.");
        track("lead_submit_error", payload);
        disableForm(false);
      });
  }

  function handleDocumentClick(e) {
    const trigger = e.target.closest("[data-ff-lead]");
    if (!trigger) return;
    if (trigger.tagName === "A" && trigger.target === "_blank" && !trigger.classList.contains("ff-final__btn")) return;
    e.preventDefault();
    openModal(trigger);
  }

  function handleInterestSelectClick(e) {
    if (!interestSelectBtn || !interestSelectMenu) return;
    const opt = e.target.closest(".ff-lead-selectOpt");
    if (!opt) return;
    const value = opt.dataset.value || "";
    if (value) setInterestValue(value);
    closeInterestSelect({ focusButton: true });
  }

  function handleInterestSelectKeydown(e) {
    if (!interestSelectBtn || !interestSelectMenu) return;
    const isOpen = interestSelectBtn.getAttribute("aria-expanded") === "true";
    if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        closeInterestSelect({ focusButton: true });
      }
      return;
    }
    if (!isOpen && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openInterestSelect();
      return;
    }
    if (!isOpen) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const opts = Array.from(interestSelectMenu.querySelectorAll(".ff-lead-selectOpt"));
      if (opts.length === 0) return;
      const active = document.activeElement;
      const idx = Math.max(0, opts.indexOf(active));
      const next = e.key === "ArrowDown"
        ? opts[Math.min(opts.length - 1, idx + 1)]
        : opts[Math.max(0, idx - 1)];
      if (next) next.focus({ preventScroll: true });
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains("ff-lead-selectOpt")) {
        e.preventDefault();
        const value = active.dataset.value || "";
        if (value) setInterestValue(value);
        closeInterestSelect({ focusButton: true });
      }
    }
  }

  function toggleNav() {
    if (!nav || !navToggle) return;
    const isOpen = nav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", toggleNav);
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (e.target.closest(".ff-nav") || e.target.closest("[data-ff-nav-toggle]")) return;
      nav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  }

  // Event wiring
  document.addEventListener("click", handleDocumentClick);
  if (interestSelectBtn) {
    interestSelectBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleInterestSelect();
    });
    interestSelectBtn.addEventListener("keydown", handleInterestSelectKeydown);
  }
  if (interestSelectMenu) {
    interestSelectMenu.addEventListener("click", handleInterestSelectClick);
    interestSelectMenu.addEventListener("keydown", handleInterestSelectKeydown);
  }
  document.addEventListener("click", (e) => {
    if (!interestSelectBtn || !interestSelectMenu) return;
    const isOpen = interestSelectBtn.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;
    if (e.target.closest("[data-ff-lead-select]") || e.target.closest("[data-ff-lead-select-menu]")) return;
    closeInterestSelect();
  });
  if (backdrop) backdrop.addEventListener("click", closeModal);
  closeButtons.forEach(btn => btn.addEventListener("click", closeModal));
  if (form) form.addEventListener("submit", handleSubmit);
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  });
})();
