const stage = document.querySelector(".hero-scroll-stage");
const hero = document.querySelector(".hero");
const heroHome = document.querySelector(".hero-home");
const menuViewport = document.querySelector(".section-menu__viewport");
const menuTrack = document.querySelector(".section-menu__track");
const menuScrollbar = document.querySelector(".section-menu__scrollbar");
const sectionPage = document.querySelector(".section-page");
const sectionStorage = document.querySelector(".section-storage");
const mediaGalleries = [...document.querySelectorAll(".portfolio-gallery")];
const portfolioLightbox = document.querySelector(".portfolio-lightbox");
const portfolioLightboxImage = portfolioLightbox?.querySelector(".portfolio-lightbox__image");
const portfolioLightboxClose = portfolioLightbox?.querySelector(".portfolio-lightbox__close");
const sectionCards = [...document.querySelectorAll(".section-menu__card")];
const browserUserAgent = navigator.userAgent;
const isSafari = /Safari/i.test(browserUserAgent)
  && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|OPiOS|Android)/i.test(browserUserAgent);
const pageSections = sectionCards
  .map((card) => document.querySelector(card.getAttribute("href")))
  .filter((section) => section instanceof HTMLElement);
const sectionsById = new Map(pageSections.map((section) => [section.id, section]));

let maxCarouselOffset = 0;
let scrollFrame = 0;
let carouselContentWidth = 0;
let carouselCardWidth = 0;
let carouselGap = 0;
let transitionTimer = 0;
let activeSectionId = "";
let finishSectionTransition = null;

function getPageScrollDistance() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function updateActiveCard(sectionId) {
  sectionCards.forEach((card) => {
    const isActive = card.hash === `#${sectionId}`;
    card.classList.toggle("is-active", isActive);

    if (isActive) {
      card.setAttribute("aria-current", "location");
    } else {
      card.removeAttribute("aria-current");
    }
  });
}

function updateCarousel() {
  scrollFrame = 0;

  if (!stage || !hero || !menuViewport || !menuTrack) {
    return;
  }

  const scrollDistance = getPageScrollDistance();
  const isMobile = window.matchMedia("(max-width: 700px)").matches;
  const progress = scrollDistance === 0
    ? 0
    : Math.min(1, Math.max(0, window.scrollY / scrollDistance));
  const compact = hero.classList.contains("is-section-open");
  const useNativeMenuScroll = isMobile || compact;
  const offset = useNativeMenuScroll
    ? menuViewport.scrollLeft
    : progress * maxCarouselOffset;
  const carouselCards = compact
    ? sectionCards
    : sectionCards.filter((card) => card.hash !== "#home");
  const centerIndex = maxCarouselOffset === 0
    ? 0
    : offset / maxCarouselOffset * (carouselCards.length - 1);
  const activeIndex = Math.round(centerIndex);

  menuTrack.style.transform = useNativeMenuScroll ? "" : `translate3d(${-offset}px, 0, 0)`;
  if (menuScrollbar instanceof HTMLInputElement) {
    menuScrollbar.value = String(
      maxCarouselOffset === 0 ? 0 : (offset / maxCarouselOffset) * 1000,
    );
  }

  carouselCards.forEach((card, index) => {
    card.style.zIndex = String(carouselCards.length - Math.abs(index - activeIndex));
  });

  if (!activeSectionId) {
    const currentCard = carouselCards[activeIndex];
    if (currentCard) {
      updateActiveCard(currentCard.hash.slice(1));
    }
  }
}

function measureCarousel(preserveProgress = true) {
  if (!stage || !hero || !menuViewport || !menuTrack) {
    return;
  }

  const previousDistance = getPageScrollDistance();
  const previousProgress = previousDistance === 0
    ? 0
    : Math.min(1, Math.max(0, window.scrollY / previousDistance));
  const compact = hero.classList.contains("is-section-open");
  const isMobile = window.matchMedia("(max-width: 700px)").matches;
  const useNativeMenuScroll = isMobile || compact;
  const visibleCards = compact
    ? (isMobile ? 3.2 : window.innerWidth >= 1200 ? sectionCards.length : 4.2)
    : (isMobile ? 2.2 : 3);
  const viewportStyle = window.getComputedStyle(menuViewport);

  carouselContentWidth =
    menuViewport.clientWidth -
    Number.parseFloat(viewportStyle.paddingLeft) -
    Number.parseFloat(viewportStyle.paddingRight);
  carouselCardWidth = carouselContentWidth / (visibleCards + 0.18 * (visibleCards - 1));
  carouselGap = carouselCardWidth * 0.18;
  const carouselCardHeight = compact
    ? 58
    : carouselCardWidth / (isMobile ? 0.78 : 0.72);

  stage.style.setProperty("--carousel-card-width", `${carouselCardWidth}px`);
  stage.style.setProperty("--carousel-gap", `${carouselGap}px`);
  stage.style.setProperty(
    "--carousel-scrollbar-offset",
    `${carouselCardHeight * 0.09}px`,
  );
  if (isMobile) {
    menuTrack.style.transform = "";
  }
  menuTrack.style.setProperty(
    "--carousel-side-inset",
    "0px",
  );
  menuTrack.style.setProperty(
    "--carousel-end-inset",
    "0px",
  );
  maxCarouselOffset = Math.max(
    0,
    useNativeMenuScroll
      ? menuViewport.scrollWidth - menuViewport.clientWidth
      : menuTrack.scrollWidth - carouselContentWidth,
  );
  stage.style.setProperty(
    "--carousel-scroll-distance",
    `${useNativeMenuScroll ? 0 : maxCarouselOffset}px`,
  );

  if (preserveProgress && !isMobile && previousDistance > 0) {
    window.scrollTo(0, previousProgress * getPageScrollDistance());
  }

  updateCarousel();
}

function returnHome(updateHistory = true) {
  finishSectionTransition?.();
  window.clearTimeout(transitionTimer);
  activeSectionId = "";
  updateActiveCard("");

  if (sectionPage) {
    sectionPage.classList.remove("is-visible");
    sectionPage.classList.remove("is-switching");
    sectionPage.setAttribute("aria-hidden", "true");
  }
  if (heroHome instanceof HTMLElement) {
    heroHome.inert = false;
    heroHome.removeAttribute("aria-hidden");
  }

  const restoreSection = () => {
    if (sectionPage && sectionStorage) {
      const currentSection = sectionPage.querySelector(".section-slide > .next-section");
      if (currentSection instanceof HTMLElement) {
        currentSection.hidden = true;
        sectionStorage.append(currentSection);
      }
      sectionPage.replaceChildren();
    }

    hero?.classList.remove("is-section-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    measureCarousel(false);

    if (updateHistory && window.location.hash !== "#home") {
      window.history.pushState({ sectionId: "" }, "", "#home");
    }
  };

  if (hero?.classList.contains("is-section-open")) {
    sectionPage?.classList.remove("is-visible");
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    transitionTimer = window.setTimeout(restoreSection, delay);
  } else {
    restoreSection();
  }
}

function openSection(sectionId, updateHistory = true) {
  const section = sectionsById.get(sectionId);
  const card = sectionCards.find((item) => item.hash === `#${sectionId}`);

  if (!section || !card || !sectionPage || !hero) {
    return;
  }

  const resetSectionScroll = (force = false) => {
    if (section.matches(".services-page, .portfolio-page, .contacts-page")) {
      if (force && section.scrollHeight > section.clientHeight) {
        section.scrollTop = section.scrollHeight;
        section.getBoundingClientRect();
      }
      section.scrollTo(0, 0);
      hero.scrollTo(0, 0);
    }
  };
  const alignServicesContent = () => {
    const alignment = {
      services: [".services-page__content", ".services-intro"],
      portfolio: [".portfolio-page__content", ".portfolio-gallery"],
      reviews: [".portfolio-page__content", ".portfolio-gallery"],
      contacts: [".contacts-page__content", ".contacts-page__heading"],
    }[sectionId];

    if (!isSafari || !alignment) {
      return;
    }

    const [contentSelector, anchorSelector] = alignment;
    const content = section.querySelector(contentSelector);
    const anchor = section.querySelector(anchorSelector);
    if (!(content instanceof HTMLElement) || !(anchor instanceof HTMLElement)) {
      return;
    }

    if (sectionId === "services") {
      content.style.removeProperty("margin-bottom");
    }
    content.getBoundingClientRect();

    const currentTransform = getComputedStyle(content).transform;
    const currentOffset = sectionId === "reviews"
      ? Number.parseFloat(getComputedStyle(content).marginTop) || 0
      : currentTransform === "none"
        ? 0
        : new DOMMatrixReadOnly(currentTransform).m42;
    const anchorTop = anchor.getBoundingClientRect().top - currentOffset;
    const offset = Math.round(section.getBoundingClientRect().top - anchorTop);

    if (sectionId === "reviews") {
      const targetMarginTop = offset > 0 ? `${offset}px` : "";
      if (content.style.marginTop !== targetMarginTop) {
        if (targetMarginTop) {
          content.style.marginTop = targetMarginTop;
        } else {
          content.style.removeProperty("margin-top");
        }
      }
      content.getBoundingClientRect();
      return;
    }

    const targetTransform = offset > 0 ? `translateY(${offset}px)` : "";

    if (content.style.transform !== targetTransform) {
      if (targetTransform) {
        content.style.transform = targetTransform;
      } else {
        content.style.removeProperty("transform");
      }
    }
    content.getBoundingClientRect();
  };
  const resetSectionScrollAfterRender = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resetSectionScroll(true);
    }));
  };

  resetSectionScroll();
  finishSectionTransition?.();
  window.clearTimeout(transitionTimer);
  const wasOpen = hero.classList.contains("is-section-open");

  if (wasOpen && activeSectionId === sectionId) {
    resetSectionScroll(true);
    alignServicesContent();
    return;
  }

  section.hidden = false;
  activeSectionId = sectionId;
  updateActiveCard(sectionId);
  hero.classList.add("is-section-open");
  if (heroHome instanceof HTMLElement) {
    heroHome.inert = true;
    heroHome.setAttribute("aria-hidden", "true");
  }
  sectionPage.setAttribute("aria-hidden", "false");

  if (wasOpen) {
    const currentSlide = sectionPage.querySelector(".section-slide.is-current");
    const incomingSlide = document.createElement("div");
    incomingSlide.className = "section-slide section-slide--incoming";
    incomingSlide.append(section);
    sectionPage.append(incomingSlide);
    resetSectionScroll();
    incomingSlide.getBoundingClientRect();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resetSectionScroll();
        sectionPage.classList.add("is-aligning");
        alignServicesContent();
        sectionPage.classList.remove("is-aligning");
        sectionPage.classList.add("is-transitioning");
        measureCarousel();

        const finishTransition = () => {
          finishSectionTransition = null;
          incomingSlide.removeEventListener("transitionend", onTransitionEnd);
          window.clearTimeout(transitionTimer);

          const outgoingSection = currentSlide?.querySelector(".next-section");
          if (outgoingSection instanceof HTMLElement && sectionStorage) {
            outgoingSection.hidden = true;
            sectionStorage.append(outgoingSection);
          }

          sectionPage.replaceChildren(incomingSlide);
          incomingSlide.className = "section-slide is-current";
          sectionPage.classList.remove("is-transitioning");
          resetSectionScrollAfterRender();
        };

        finishSectionTransition = finishTransition;
        const onTransitionEnd = (event) => {
          if (event.target === incomingSlide && event.propertyName === "transform") {
            finishTransition();
          }
        };
        incomingSlide.addEventListener("transitionend", onTransitionEnd);
        transitionTimer = window.setTimeout(finishTransition, 900);
      });
    });
  } else {
    const slide = document.createElement("div");
    slide.className = "section-slide is-current";
    slide.append(section);
    sectionPage.replaceChildren(slide);
    resetSectionScroll();
    sectionPage.getBoundingClientRect();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resetSectionScroll();
        sectionPage.classList.add("is-aligning");
        alignServicesContent();
        sectionPage.classList.remove("is-aligning");
        sectionPage.classList.add("is-visible");
        measureCarousel();
      });
    });

    const resetDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 900;
    window.setTimeout(resetSectionScrollAfterRender, resetDelay);
  }

  if (updateHistory) {
    window.history.pushState({ sectionId }, "", `#${sectionId}`);
  }
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const link = event.target.closest('a[href^="#"]');
  if (!link || link.hash.length < 2) {
    return;
  }

  if (link.hash === "#home") {
    event.preventDefault();
    returnHome();
    return;
  }

  if (sectionsById.has(link.hash.slice(1))) {
    event.preventDefault();
    openSection(link.hash.slice(1));
  }
});

window.addEventListener("popstate", () => {
  const sectionId = window.location.hash.slice(1);
  if (sectionsById.has(sectionId)) {
    openSection(sectionId, false);
  } else {
    returnHome(false);
  }
});

window.addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) {
      scrollFrame = requestAnimationFrame(updateCarousel);
    }
  },
  { passive: true },
);
menuViewport?.addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) {
      scrollFrame = requestAnimationFrame(updateCarousel);
    }
  },
  { passive: true },
);
menuScrollbar?.addEventListener("input", () => {
  const progress = Number(menuScrollbar.value) / 1000;
  if (window.matchMedia("(max-width: 700px)").matches) {
    menuViewport.scrollLeft = progress * maxCarouselOffset;
    return;
  }

  const scrollDistance = getPageScrollDistance();
  window.scrollTo({ top: progress * scrollDistance, behavior: "instant" });
});
menuScrollbar?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !event.isPrimary) {
    return;
  }

  const bounds = menuScrollbar.getBoundingClientRect();
  const thumbWidth = 14;
  const thumbCenter =
    bounds.left +
    thumbWidth / 2 +
    (Number(menuScrollbar.value) / 1000) * (bounds.width - thumbWidth);

  if (Math.abs(event.clientX - thumbCenter) > thumbWidth) {
    event.preventDefault();
    event.stopPropagation();
  }
});
window.addEventListener("resize", () => measureCarousel());

if ("ResizeObserver" in window && menuViewport) {
  new ResizeObserver(() => measureCarousel()).observe(menuViewport);
}

measureCarousel(false);

const initialSectionId = window.location.hash.slice(1);
if (sectionsById.has(initialSectionId)) {
  openSection(initialSectionId, false);
}

if (
  mediaGalleries.length > 0 &&
  portfolioLightbox instanceof HTMLDialogElement &&
  portfolioLightboxImage instanceof HTMLImageElement
) {
  const openPortfolioImage = (image) => {
    portfolioLightboxImage.src = image.currentSrc || image.src;
    portfolioLightboxImage.alt = image.alt;
    portfolioLightbox.showModal();
  };

  mediaGalleries.forEach((gallery) => {
    const imageItems = [...gallery.querySelectorAll(".portfolio-gallery__item")].filter(
      (item) => item.querySelector("img")
    );

    imageItems.forEach((item) => {
      const image = item.querySelector("img");
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-haspopup", "dialog");
      item.setAttribute("aria-label", `Открыть фотографию: ${image.alt}`);
    });

    gallery.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const image = event.target.closest(".portfolio-gallery__item > img");
      if (image instanceof HTMLImageElement) {
        openPortfolioImage(image);
      }
    });

    gallery.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const item = event.target;
      if (!(item instanceof HTMLElement) || !item.matches(".portfolio-gallery__item")) {
        return;
      }

      const image = item.querySelector("img");
      if (image instanceof HTMLImageElement) {
        event.preventDefault();
        openPortfolioImage(image);
      }
    });
  });

  portfolioLightbox.addEventListener("click", (event) => {
    if (
      event.target === portfolioLightbox ||
      event.target === portfolioLightboxImage ||
      event.target === portfolioLightboxClose
    ) {
      portfolioLightbox.close();
    }
  });
}

document.querySelectorAll(".reviews-page .portfolio-gallery__item--video").forEach((card, index) => {
  const video = card.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Review video card is missing its video element.");
  }

  const playButton = document.createElement("button");
  playButton.className = "video-play-button";
  playButton.type = "button";
  playButton.setAttribute("aria-label", `Воспроизвести видеоотзыв клиента ${index + 1}`);

  const playIcon = document.createElement("img");
  playIcon.src = "play.png";
  playIcon.alt = "";
  playIcon.setAttribute("aria-hidden", "true");
  playButton.append(playIcon);

  const playbackError = document.createElement("span");
  playbackError.className = "video-playback-error";
  playbackError.setAttribute("role", "alert");
  playbackError.hidden = true;
  playbackError.textContent = "Не удалось воспроизвести видео. Попробуйте позже.";

  card.append(playButton, playbackError);

  video.addEventListener("play", () => {
    card.classList.add("is-playing");
    playbackError.hidden = true;
  });
  video.addEventListener("pause", () => card.classList.remove("is-playing"));
  video.addEventListener("ended", () => card.classList.remove("is-playing"));
  video.addEventListener("error", () => {
    playbackError.hidden = false;
  });

  playButton.addEventListener("click", async (event) => {
    event.stopPropagation();

    try {
      await video.play();
    } catch {
      playbackError.hidden = false;
    }
  });
});

if (new URLSearchParams(window.location.search).get("debugScroll") === "1") {
  const debugPanel = document.createElement("pre");
  debugPanel.style.cssText =
    "position:fixed;z-index:99999;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));left:8px;max-height:55vh;margin:0;padding:8px;overflow:auto;background:rgba(0,0,0,.9);color:#fff;font:10px/1.35 monospace;white-space:pre-wrap;pointer-events:none;";
  document.body.append(debugPanel);

  const formatScrollMetrics = (element) => {
    if (!element) {
      return "missing";
    }

    const bounds = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return `scroll=${Math.round(element.scrollTop)} max=${element.scrollHeight - element.clientHeight} top=${Math.round(bounds.top)} height=${element.clientHeight}/${element.scrollHeight} transform=${styles.transform}`;
  };

  const formatBoxMetrics = (element) => {
    if (!element) {
      return "missing";
    }

    const bounds = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return `scroll=${Math.round(element.scrollTop)} top=${Math.round(bounds.top)} height=${Math.round(bounds.height)} overflow=${styles.overflowY} position=${styles.position} transform=${styles.transform}`;
  };

  const updateScrollDebug = () => {
    const currentSlide = sectionPage?.querySelector(".section-slide.is-current");
    debugPanel.textContent = [
      `window scrollY=${Math.round(window.scrollY)} height=${window.innerHeight}`,
      `visualViewport offset=${window.visualViewport ? Math.round(window.visualViewport.offsetTop) : "n/a"} height=${window.visualViewport ? Math.round(window.visualViewport.height) : "n/a"}`,
      `body ${formatScrollMetrics(document.body)}`,
      `.hero__content ${formatBoxMetrics(document.querySelector(".hero__content"))}`,
      `.hero ${formatScrollMetrics(hero)}`,
      `.section-page ${formatScrollMetrics(sectionPage)}`,
      `.slide ${formatScrollMetrics(currentSlide)}`,
      `#services ${formatScrollMetrics(sectionsById.get("services"))}`,
      `.services-page__content ${formatBoxMetrics(document.querySelector(".services-page__content"))}`,
      `.services-intro ${formatBoxMetrics(document.querySelector(".services-intro"))}`,
      `.services-prices ${formatBoxMetrics(document.querySelector(".services-prices"))}`,
      `main ${formatScrollMetrics(document.querySelector("main"))}`,
      `html ${formatScrollMetrics(document.documentElement)}`,
      `#portfolio ${formatScrollMetrics(sectionsById.get("portfolio"))}`,
    ].join("\n");
  };

  window.setInterval(updateScrollDebug, 100);
  updateScrollDebug();
}
