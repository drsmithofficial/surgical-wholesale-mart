(() => {
  'use strict';

  // Keep native touch/trackpad scrolling while moving the cards right to left.
  // Hidden copies on each side let us wrap between identical views seamlessly.
  const section = document.getElementById('categories');
  const list = document.getElementById('category-list');
  const originals = Array.from(list.children);
  const previous = document.getElementById('category-prev');
  const next = document.getElementById('category-next');
  const controls = document.querySelector('.carousel-controls');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phoneLayout = window.matchMedia('(max-width: 700px)');
  const photoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const image = entry.target;
      image.src = image.dataset.carouselSrc;
      delete image.dataset.carouselSrc;
      photoObserver.unobserve(image);
    });
  }, {rootMargin:'250px'});
  const speed = 32; // CSS pixels per second, independent of the frame rate.
  let cycleWidth = 0;
  let cardStep = 0;
  let viewportWidth = 0;
  let position = 0;
  let lastWritten = 0;
  let frame = 0;
  let previousTime = 0;
  let focused = false;
  let pointerActive = false;
  let visible = true;
  let hovered = false;
  let temporarilyPaused = false;
  let resumeTimer;
  let phoneCarouselMode = false;

  const modulo = (value, length) => ((value % length) + length) % length;

  function writePosition(value) {
    position = value;
    list.scrollLeft = value;
    lastWritten = list.scrollLeft;
    // Native scroll offsets can round at device-pixel boundaries. The remaining
    // fraction is a compositor translation, keeping slow motion continuous.
    list.style.setProperty('--category-subpixel', (lastWritten - value).toFixed(4) + 'px');
  }

  function normalizePosition() {
    if (!cycleWidth) return;
    writePosition(phoneCarouselMode
      ? modulo(position, cycleWidth)
      : cycleWidth + modulo(position - cycleWidth, cycleWidth));
  }

  function tick(time) {
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 0;
    previousTime = time;
    // Preserve fractional pixels: scrollLeft itself is rounded by browsers.
    position += elapsed * (phoneCarouselMode ? 30 : speed) / 1000;
    normalizePosition();
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (phoneCarouselMode) {
      if (cycleWidth && !hovered && !focused && !pointerActive &&
          !temporarilyPaused && visible && !document.hidden) {
        normalizePosition();
        frame = requestAnimationFrame(tick);
      }
      return;
    }
    if (cycleWidth && !hovered && !focused && !pointerActive &&
        !temporarilyPaused && visible && !document.hidden) {
      normalizePosition();
      frame = requestAnimationFrame(tick);
    }
  }

  function pauseBriefly(duration = 1800) {
    temporarilyPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      temporarilyPaused = false;
      syncPlayback();
    }, duration);
    syncPlayback();
  }

  function makeCopy() {
    const fragment = document.createDocumentFragment();
    const sourceItems = phoneCarouselMode
      ? [...originals].sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))
      : originals;
    sourceItems.forEach((item, index) => {
      const copy = item.cloneNode(true);
      copy.dataset.carouselCopy = '';
      copy.setAttribute('aria-hidden', 'true');
      if (phoneCarouselMode) copy.style.order = String(100 + index);
      copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      copy.querySelectorAll('a, button, [tabindex]').forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
      // Native lazy loading prepares nearby copies without downloading this
      // below-fold carousel while the hero is still loading.
      copy.querySelectorAll('img').forEach((image) => { image.loading = 'lazy'; });
      fragment.appendChild(copy);
    });
    return fragment;
  }

  function measureCarousel() {
    const gap = parseFloat(getComputedStyle(list).columnGap) || 12;
    const step = originals[0].getBoundingClientRect().width + gap;
    if (phoneLayout.matches) {
      phoneCarouselMode = true;
      cancelAnimationFrame(frame);
      previousTime = 0;
      list.querySelectorAll('[data-carousel-copy]').forEach(copy => copy.remove());
      list.classList.add('is-looping');
      list.style.removeProperty('--category-subpixel');
      list.scrollLeft = 0;
      list.append(makeCopy());
      position = 0;
      lastWritten = 0;
      cardStep = step;
      viewportWidth = list.clientWidth;
      const firstPhoneOriginal = [...originals]
        .sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))[0];
      const firstPhoneCopy = list.querySelector('[data-carousel-copy]');
      cycleWidth = firstPhoneCopy
        ? firstPhoneCopy.getBoundingClientRect().left - firstPhoneOriginal.getBoundingClientRect().left
        : 0;
      controls.hidden = true;
      list.querySelectorAll('img[data-carousel-src]').forEach(image => photoObserver.observe(image));
      syncPlayback();
      return;
    }
    if (phoneCarouselMode) {
      phoneCarouselMode = false;
      cardStep = 0;
      viewportWidth = 0;
    }
    if (step === cardStep && list.clientWidth === viewportWidth) return;
    const progress = cycleWidth ? modulo(position - cycleWidth, cycleWidth) / cycleWidth : 0;
    cardStep = step;
    viewportWidth = list.clientWidth;
    cycleWidth = step * originals.length;
    list.querySelectorAll('[data-carousel-copy]').forEach((copy) => copy.remove());
    list.prepend(makeCopy());
    // Cover the entire viewport even on screens wider than one category set.
    const trailingCopies = Math.ceil(viewportWidth / cycleWidth) + 1;
    for (let index = 0; index < trailingCopies; index++) list.append(makeCopy());
    writePosition(cycleWidth * (1 + progress));
    list.querySelectorAll('img[data-carousel-src]').forEach(image => photoObserver.observe(image));
    controls.hidden = false;
    syncPlayback();
  }

  function moveCategories(direction) {
    pauseBriefly(2500);
    normalizePosition();
    const count = Math.min(originals.length, Math.max(1, Math.floor(viewportWidth / cardStep)));
    list.scrollBy({ left: direction * cardStep * count, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  previous.addEventListener('click', () => moveCategories(-1));
  next.addEventListener('click', () => moveCategories(1));
  list.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    syncPlayback();
  });
  list.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    hovered = false;
    clearTimeout(resumeTimer);
    temporarilyPaused = false;
    syncPlayback();
  });
  section.addEventListener('focusin', (event) => {
    const card = event.target.closest('.category-card');
    // Keep keyboard-focused cards still for safe activation. Mouse hover is separate.
    focused = Boolean(card && event.target.matches(':focus-visible'));
    syncPlayback();
    if (card) {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      list.style.setProperty('--category-subpixel', '0px');
      position = list.scrollLeft;
      lastWritten = position;
    }
  });
  section.addEventListener('focusout', (event) => {
    focused = Boolean(event.relatedTarget && event.relatedTarget.closest('.category-card') && event.relatedTarget.matches(':focus-visible'));
    syncPlayback();
  });
  list.addEventListener('pointerdown', () => {
    pointerActive = true;
    syncPlayback();
  }, { passive: true });
  function releasePointer() {
    if (!pointerActive) return;
    pointerActive = false;
    pauseBriefly();
  }
  window.addEventListener('pointerup', releasePointer, { passive: true });
  window.addEventListener('pointercancel', releasePointer, { passive: true });
  list.addEventListener('wheel', () => pauseBriefly(), { passive: true });
  list.addEventListener('scroll', () => {
    if (Math.abs(list.scrollLeft - lastWritten) <= 1) return;
    list.style.setProperty('--category-subpixel', '0px');
    position = list.scrollLeft;
    lastWritten = position;
    if (phoneCarouselMode && cycleWidth && list.scrollLeft >= cycleWidth) normalizePosition();
    pauseBriefly();
  }, { passive: true });
  reducedMotion.addEventListener('change', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }).observe(section);
  }
  list.classList.add('is-looping');
  if ('ResizeObserver' in window) new ResizeObserver(measureCarousel).observe(list);
  else window.addEventListener('resize', measureCarousel);
  measureCarousel();

})();
