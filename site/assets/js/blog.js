// blog.js - shared helpers for blog pages
(() => {
  function loadSharedFooter() {
    const slot = document.getElementById("ff-footer-slot");
    if (!slot) return;

    fetch("/index.html", { cache: "force-cache" })
      .then((res) => res.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const footer = doc.querySelector("#ff-footer-easy");
        if (!footer) return;

        slot.replaceWith(footer);

        footer.querySelectorAll("script").forEach((oldScript) => {
          const script = document.createElement("script");
          for (const attr of oldScript.attributes) {
            script.setAttribute(attr.name, attr.value);
          }
          script.text = oldScript.textContent || "";
          oldScript.replaceWith(script);
        });
      })
      .catch((err) => {
        console.warn("[blog] footer load failed", err);
      });
  }

  function init() {
    loadSharedFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
