// blog.js - shared helpers for blog pages
(() => {
  function loadSharedFooter() {
    const slot = document.getElementById("ff-footer-slot");
    if (!slot) return;

    fetch("/index.html", { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`Footer fetch failed: ${res.status}`);
        return res.text();
      })
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

  function initProjectJourney() {
    const journey = document.querySelector("[data-ff-project-journey]");
    if (!journey) return;

    const stepEls = Array.from(journey.querySelectorAll(".ff-project-step[data-step]"));
    const itemEls = Array.from(journey.querySelectorAll(".ff-project-timeline__item[data-step]"));
    const timelineEl = journey.querySelector(".ff-project-timeline");
    if (!stepEls.length || !itemEls.length) return;

    const update = () => {
      const viewportMid = window.innerHeight * 0.62;
      let activeIndex = 0;

      stepEls.forEach((step, index) => {
        const rect = step.getBoundingClientRect();
        if (rect.top <= viewportMid) activeIndex = index;
      });

      itemEls.forEach((item, index) => {
        item.classList.toggle("is-active", index <= activeIndex);
      });

      const lastIndex = Math.max(itemEls.length - 1, 1);
      const progress = (activeIndex / lastIndex) * 100;
      journey.style.setProperty("--ff-project-progress", `${progress}%`);

      if (timelineEl) {
        timelineEl.classList.toggle("is-complete", activeIndex === itemEls.length - 1);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function init() {
    loadSharedFooter();
    initProjectJourney();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
