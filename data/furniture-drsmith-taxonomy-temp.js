/* Product directory rendering and local filtering. */
(() => {
  'use strict';
  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const departmentSliderClock = (() => {
    let segmentStart = performance.now();
    let accumulatedDistance = 0;
    let paused = document.hidden;
    document.addEventListener('visibilitychange', () => {
      const now = performance.now();
      if (document.hidden && !paused) {
        accumulatedDistance += (now - segmentStart) * 0.028;
        paused = true;
      } else if (!document.hidden && paused) {
        segmentStart = now;
        paused = false;
      }
    });
    return {
      distanceAt(timestamp) {
        return accumulatedDistance + (paused ? 0 : (timestamp - segmentStart) * 0.028);
      }
    };
  })();
  const departmentIcons = {
    DP01: 'M22 12h-4l-3 9L9 3l-3 9H2',
    DP02: 'M6 3l12 18M6 21 18 3M2 7h4m12 10h4',
    DP03: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4M2 2l2 2m16-2-2 2M12 1v3',
    DP04: 'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M5 10V6a2 2 0 0 1 2-2h3v6m4 0V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3M5 18v2m14-2v2',
    DP05: 'M9 5H5a2 2 0 0 0-2 2v13h14v-3M9 3h6v4H9zM12 12h8m-4-4v8',
    DP06: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 21v-2a7 7 0 0 1 14 0v2M12 13v5m-2-2h4',
    DP07: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 21v-2a6 6 0 0 1 12 0v2M9 13l-2-2m8 2 2-2',
    DP08: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8ZM2 12h4l2-4 4 8 2-4h8',
    DP09: 'M12 4v7m0-3c-2-4-6-4-7-1-2 5 0 10 5 11 2 0 2-2 2-4m0-6c2-4 6-4 7-1 2 5 0 10-5 11-2 0-2-2-2-4',
    DP10: 'M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
    DP11: 'M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3m-7 12h12',
    DP12: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4',
    DP13: 'm14.5 6.5 3 3M4 20l5.5-5.5M14 7l3-3 3 3-3 3m-7 3 4 4M5 19l-1 1m6-9 4-4',
    DP14: 'M12 22a3 3 0 0 0 3-3v-2a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2V8M6 8v2a6 6 0 0 0 12 0V8M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    DP15: 'm16 3 5 5-3 3-2-2-4 4 2 2-3 3-2-2-3 3-5-5 3-3 2 2 4-4-2-2 3-3 2 2z',
    DP16: 'M8 3C5 3 3 6 4 11c1 6 4 10 8 10 2 0 3-2 3-4V6c0-2-3-3-7-3Zm7 4c3 1 5 4 5 7s-2 5-5 6',
    DP17: 'M9 3C5 3 3 6 4 11c1 6 4 10 7 10V5c0-1-1-2-2-2Zm6 0c4 0 6 3 5 8-1 6-4 10-7 10V5c0-1 1-2 2-2Z',
    DP18: 'M19 10a7 7 0 0 0-14 0v4a3 3 0 0 0 3 3h2v-6H8m8 6v2a3 3 0 0 1-3 3h-1',
    DP19: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm6 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
    DP20: 'M9 4a3 3 0 0 0-5 2 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 4 4l3-2V5Zm6 0a3 3 0 0 1 5 2 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-4 4l-3-2V5Zm-3 5h3m-3 5h-3',
    DP21: 'M7 3c-3 0-4 3-3 7l2 9c1 3 3 3 4 0l2-4 2 4c1 3 3 3 4 0l2-9c1-4 0-7-3-7-2 0-3 2-5 2S9 3 7 3Z',
    DP22: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1 6h2l2 4 4 1m-7-5-3 4-3 1m7-1v4l3 4m-3-8-3 4-1 4',
    DP23: 'M12 22s7-4.4 7-12a7 7 0 0 0-14 0c0 7.6 7 12 7 12Zm-3-12 2 2 4-4',
    DP24: 'M3 21V7l9-4 9 4v14M3 11h18M7 11v3m5-3v3m5-3v3M7 21v-4h10v4',
    DP25: 'M3 6h18m-2 0-1 14H6L5 6m4 0V4h6v2m-5 4v6m4-6v6M3 6l2-3h14l2 3',
    DP26: 'M2 10 12 4l10 6-10 6-10-6Zm4 3v5c4 3 8 3 12 0v-5m4-3v7',
    DP27: 'M9 5H5a2 2 0 0 0-2 2v13h18V7a2 2 0 0 0-2-2h-4M9 3h6v4H9zM7 12h2m3 0h5m-10 4h2m3 0h5'
  };
  const brandedDepartmentSliderPhotos = new Set([
    'ventillator-machine.da20c0245862.webp',
    'ecg-machine.fbf2bc94dfd7.webp',
    'infusion-pump.96469b61a22c.webp',
    'syringe-pump.620fbe9d6f8e.webp',
    'defibrillator.3c209ac4c700.webp',
    'bio-waste-trolley.d73080b03878.webp',
    'crash-cart.822873c63a86.webp',
    'oxygen-concentrator.778d790ecc04.webp',
    'vaporizer-transparent-fe59f4e28e.2da63ff6b426.webp',
    'hfnc-machine-high-flow-oxygen-transparent-105460458e.b9658a0961a6.webp',
    'medical-gas-outlet-parkodex-with-probe-transparent-e45314db06.de296687399a.webp',
    'arterial-blood-gas-machine-transparent-b4d8943772.a334f547356f.webp',
    'portable-aluminium-six-wing-nut-autoclave-transparent-e96cdff95f.1462ebf586c8.webp',
    'top-tech-circle-absorber-transparent-6b4e56c73a.49fe8f9b46b8.webp'
  ]);

  // Crop blank margins in memory so object-fit measures the product itself.
  const croppedPhotos = new Map();
  const remotePhotoLoader = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const image = entry.target;
      if (image.dataset.remoteUrl) image.src = image.dataset.remoteUrl;
      remotePhotoLoader.unobserve(image);
    });
  }, {rootMargin:'300px 500px'});
  function fitProductPhoto(image) {
    if (image.dataset.remotePhoto === 'true') {
      if (image.dataset.photoReady !== 'true') remotePhotoLoader.observe(image);
      const ready = () => {
        if (image.naturalWidth > 1 && !image.currentSrc.startsWith('data:')) image.dataset.photoReady = 'true';
      };
      image.addEventListener('load', ready);
      if (image.complete) ready();
      return;
    }
    const source = image.getAttribute('data-vp-src') || image.getAttribute('src');
    if (!source || source.startsWith('blob:') || source.startsWith('data:')) return;
    const apply = async () => {
      if (image.naturalWidth <= 1 || image.currentSrc.startsWith('data:')) return;
      if (image.currentSrc.startsWith('blob:')) {
        image.dataset.photoReady = 'true';
        return;
      }
      if (!croppedPhotos.has(source)) {
        croppedPhotos.set(source, new Promise(resolve => {
          try {
            const scale = Math.min(1,512 / Math.max(image.naturalWidth,image.naturalHeight));
            const sample = document.createElement('canvas');
            const w = sample.width = Math.round(image.naturalWidth*scale);
            const h = sample.height = Math.round(image.naturalHeight*scale);
            const ctx = sample.getContext('2d',{willReadFrequently:true});
            ctx.drawImage(image,0,0,w,h);
            const data = ctx.getImageData(0,0,w,h).data;
            let l=w,r=-1,top=h,b=-1;
            for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
              const i=(y*w+x)*4;
              if(data[i+3]<32 || (data[i]>238&&data[i+1]>238&&data[i+2]>238)) continue;
              l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y);
            }
            if(r<l){resolve(null);return;}
            const crop = document.createElement('canvas');
            const sx=Math.max(0,l-1)/scale, sy=Math.max(0,top-1)/scale;
            const sw=Math.min(image.naturalWidth-sx,(r-l+3)/scale);
            const sh=Math.min(image.naturalHeight-sy,(b-top+3)/scale);
            crop.width=Math.ceil(sw);crop.height=Math.ceil(sh);
            crop.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,crop.width,crop.height);
            crop.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):null),'image/png');
          } catch (_) {resolve(null);}
        }));
      }
      const cropped = await croppedPhotos.get(source);
      if(cropped){
        image.removeAttribute('data-vp-src');
        image.removeAttribute('data-vp-srcset');
        image.removeAttribute('srcset');
        image.src=cropped;
        image.dataset.photoFitted='true';
        try { await image.decode(); } catch (_) {}
        image.dataset.photoReady='true';
      } else image.dataset.photoReady='true';
    };
    image.addEventListener('load',apply);
    if(image.complete&&image.naturalWidth>1)apply();
  }

  function initializeDepartmentSlider(track, previous, next, progress) {
    const cards = [...track.children];
    if (!cards.length || track.dataset.loopReady) return;
    track.dataset.loopReady = 'true';
    const rail = createElement('div', 'department-slider-rail');
    rail.append(...cards);
    track.append(rail);

    let period = 0;
    let baseOffset = 0;
    let beforeCopies = 0;
    let afterCopies = 0;
    let frame = 0;
    let lastFrame = 0;
    let lastAutoScroll = 0;
    let pauseUntil = 0;
    let resumeTimer = 0;
    let recoveryFrame = 0;
    let recovering = false;
    let drag = null;
    let suppressClick = false;
    let alignmentCorrectionApplied = false;
    let lastTrackWidth = 0;
    let programmaticScrollLeft = null;

    const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
    const setScrollLeft = value => {
      track.scrollLeft = value;
      programmaticScrollLeft = track.scrollLeft;
    };
    const railCards = () => [...rail.children];
    const isAligned = () => {
      const layouts = railCards().map(card => ({
        top:card.offsetTop,
        bottom:card.offsetTop + card.offsetHeight
      }));
      return layouts.every(layout =>
        Math.abs(layout.top - layouts[0].top) <= 1 &&
        Math.abs(layout.bottom - layouts[0].bottom) <= 1
      );
    };
    const alignCards = () => {
      const currentCards = railCards();
      if (!currentCards.length || isAligned()) return;
      currentCards.forEach(card => {
        card.style.removeProperty('height');
        card.style.removeProperty('align-self');
      });
      void rail.offsetHeight;
      if (isAligned()) {
        alignmentCorrectionApplied = false;
        return;
      }
      const height = getComputedStyle(cards[0]).height;
      currentCards.forEach(card => {
        card.style.height = height;
        card.style.alignSelf = 'flex-start';
      });
      alignmentCorrectionApplied = true;
      void rail.offsetHeight;
    };
    const clearAlignmentCorrection = () => {
      if (!alignmentCorrectionApplied) return;
      railCards().forEach(card => {
        card.style.removeProperty('height');
        card.style.removeProperty('align-self');
      });
      rail.style.removeProperty('align-items');
      alignmentCorrectionApplied = false;
    };
    const updateProgress = () => {
      if (progress) progress.value = period ? modulo(track.scrollLeft - baseOffset, period) / period : 0;
    };
    const normalizeScroll = () => {
      if (!period) return;
      const target = baseOffset + modulo(track.scrollLeft - baseOffset, period);
      if (Math.abs(target - track.scrollLeft) > 0.5) setScrollLeft(target);
      updateProgress();
    };
    const makeCopy = card => {
      const copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.tabIndex = -1;
      copy.querySelectorAll('a,button,[tabindex]').forEach(element => { element.tabIndex = -1; });
      copy.querySelectorAll('img').forEach(image => {
        fitProductPhoto(image);
      });
      return copy;
    };
    const appendCopy = () => {
      const copies = cards.map(makeCopy);
      rail.append(...copies);
      afterCopies++;
    };
    const prependCopy = () => {
      const copies = cards.map(makeCopy);
      rail.prepend(...copies);
      beforeCopies++;
    };
    const measure = () => {
      const trackWidth = track.clientWidth;
      if (lastTrackWidth && trackWidth !== lastTrackWidth) clearAlignmentCorrection();
      lastTrackWidth = trackWidth;
      alignCards();
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      const estimatedPeriod = cards.reduce((width, card) => width + card.getBoundingClientRect().width, 0) + gap * cards.length;
      if (!estimatedPeriod) return;

      const sideCopies = Math.max(2, Math.ceil(track.clientWidth / estimatedPeriod) + 1);
      while (beforeCopies < sideCopies) prependCopy();
      while (afterCopies < sideCopies) appendCopy();

      baseOffset = cards[0].offsetLeft;
      period = estimatedPeriod;
      if (!period) return;
      lastAutoScroll = performance.now();
      setScrollLeft(baseOffset + modulo(departmentSliderClock.distanceAt(lastAutoScroll), period));
      normalizeScroll();
      if (canPlay()) schedule();
    };
    const canPlay = () => !track.closest('[hidden]') && !document.hidden && performance.now() >= pauseUntil;
    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      if (recoveryFrame) cancelAnimationFrame(recoveryFrame);
      frame = 0;
      recoveryFrame = 0;
      recovering = false;
      lastFrame = 0;
    };
    const animate = timestamp => {
      frame = 0;
      if (!canPlay()) {
        lastFrame = 0;
        return;
      }
      if (period) {
        lastAutoScroll = timestamp;
        setScrollLeft(baseOffset + modulo(departmentSliderClock.distanceAt(timestamp), period));
        updateProgress();
      }
      lastFrame = timestamp;
      frame = requestAnimationFrame(animate);
    };
    const recoverToSharedPosition = () => {
      if (!period || recovering) return;
      const startedAt = performance.now();
      const startOffset = modulo(track.scrollLeft - baseOffset, period);
      const targetOffset = modulo(departmentSliderClock.distanceAt(startedAt), period);
      const correction = modulo(targetOffset - startOffset + period / 2, period) - period / 2;
      if (Math.abs(correction) <= 0.5) {
        lastAutoScroll = startedAt;
        setScrollLeft(baseOffset + targetOffset);
        return;
      }

      const startDistance = departmentSliderClock.distanceAt(startedAt);
      const duration = 260;
      recovering = true;
      const recover = timestamp => {
        recoveryFrame = 0;
        if (!canPlay()) {
          recovering = false;
          return;
        }
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        const distance = departmentSliderClock.distanceAt(timestamp);
        lastAutoScroll = timestamp;
        setScrollLeft(baseOffset + modulo(startOffset + correction * eased + distance - startDistance, period));
        updateProgress();
        if (progress < 1) {
          recoveryFrame = requestAnimationFrame(recover);
          return;
        }
        recovering = false;
        const currentDistance = departmentSliderClock.distanceAt(timestamp);
        setScrollLeft(baseOffset + modulo(currentDistance, period));
        if (canPlay() && !frame) {
          lastFrame = timestamp;
          frame = requestAnimationFrame(animate);
        }
      };
      recoveryFrame = requestAnimationFrame(recover);
    };
    const schedule = () => {
      if (frame || recoveryFrame || !canPlay()) return;
      if (!period) return;
      alignCards();
      if (!isAligned()) {
        alignCards();
        if (!isAligned()) {
          recoveryFrame = requestAnimationFrame(() => {
            recoveryFrame = 0;
            schedule();
          });
          return;
        }
      }
      recoverToSharedPosition();
      if (recovering || recoveryFrame) return;
      frame = requestAnimationFrame(timestamp => {
        frame = 0;
        if (!canPlay()) return;
        const expected = modulo(departmentSliderClock.distanceAt(timestamp), period);
        const current = modulo(track.scrollLeft - baseOffset, period);
        const phaseError = modulo(expected - current + period / 2, period) - period / 2;
        if (!isAligned() || Math.abs(phaseError) > 1) {
          alignCards();
          recoverToSharedPosition();
          if (!recovering && !recoveryFrame) schedule();
          return;
        }
        lastFrame = 0;
        animate(timestamp);
      });
    };
    const syncPlayback = () => {
      if (canPlay()) schedule();
      else stopFrame();
    };
    const pauseForInteraction = () => {
      pauseUntil = performance.now() + 1400;
      stopFrame();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(schedule, 1410);
    };
    const onScroll = () => {
      const currentScrollLeft = track.scrollLeft;
      const isProgrammatic = programmaticScrollLeft !== null &&
        Math.abs(currentScrollLeft - programmaticScrollLeft) <= 1;
      if (isProgrammatic) programmaticScrollLeft = null;
      normalizeScroll();
      if (!isProgrammatic && performance.now() - lastAutoScroll > 100) pauseForInteraction();
    };
    const onPointerMove = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!drag.moved && Math.abs(event.clientX - drag.startX) < 6) return;
      drag.moved = true;
      pauseForInteraction();
      track.scrollLeft -= event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      event.preventDefault();
    };
    const endPointerDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (drag.moved) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
      drag = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endPointerDrag);
      window.removeEventListener('pointercancel', endPointerDrag);
    };
    const startPointerDrag = event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pauseForInteraction();
      drag = {pointerId:event.pointerId, startX:event.clientX, lastX:event.clientX, moved:false};
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endPointerDrag);
      window.addEventListener('pointercancel', endPointerDrag);
    };
    const visibility = new IntersectionObserver(syncPlayback, {threshold:0.25});

    previous.disabled = false;
    next.disabled = false;
    [previous, next].forEach(button => button.addEventListener('pointerdown', pauseForInteraction, {passive:true}));
    track.addEventListener('scroll', onScroll, {passive:true});
    track.addEventListener('pointerdown', startPointerDrag);
    track.addEventListener('touchstart', pauseForInteraction, {passive:true});
    track.addEventListener('wheel', pauseForInteraction, {passive:true});
    track.addEventListener('click', event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    }, true);
    new ResizeObserver(measure).observe(track);
    visibility.observe(track.closest('.department-slider-row'));
    document.addEventListener('visibilitychange', syncPlayback);
    measure();
    schedule();
  }

  const directory = document.querySelector('[data-catalogue-directory]');
  if (directory) {
    // Native restoration runs before the progressively rendered rows exist.
    // Keep the position per URL and restore after the directory has its full height.
    const scrollKey = () => `catalogue-scroll:${location.pathname}${location.search}${location.hash}`;
    let refreshPosition = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(scrollKey()));
      if (performance.getEntriesByType('navigation')[0]?.type === 'reload' &&
          Number.isFinite(saved?.y) && saved.y >= 0) refreshPosition = saved.y;
    } catch (_) {} // Storage may be unavailable in private browsing.
    window.addEventListener('pagehide', () => {
      try { sessionStorage.setItem(scrollKey(), JSON.stringify({y:refreshPosition ?? window.scrollY})); } catch (_) {}
    });
    const cancelRefreshRestoration = () => { refreshPosition = null; };
    window.addEventListener('wheel', cancelRefreshRestoration, {passive:true, once:true});
    window.addEventListener('touchstart', cancelRefreshRestoration, {passive:true, once:true});
    window.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancelRefreshRestoration();
    });
    const familyCode = directory.dataset.familySliders;
    const status = directory.querySelector('[data-directory-status]');
    const familyGrid = directory.querySelector('[data-directory-families]');
    const departmentsGrid = directory.querySelector('[data-directory-departments]');
    const clinicalGrid = directory.querySelector('[data-directory-departments-clinical]');
    const supportGrid = directory.querySelector('[data-directory-departments-support]');
    directory.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.dataset.photoFallback) return;
      const fallback = image.dataset.photoFallback;
      delete image.dataset.photoFallback;
      delete image.dataset.remotePhoto;
      delete image.dataset.photoReady;
      image.style.objectViewBox = '';
      image.src = fallback;
      fitProductPhoto(image);
    }, true);

    const readData = async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Catalogue data request failed (${response.status})`);
      return response.json();
    };
    Promise.all([
      readData('/assets/data/catalogue-taxonomy.json'),
      departmentsGrid ? readData('/assets/data/product-explorer.json') : Promise.resolve(null),
      departmentsGrid ? readData('/assets/data/department-product-photos.json').catch(() => ({})) : Promise.resolve({}),
      familyCode ? readData('/assets/data/family-subcategory-photos.json').catch(() => ({})) : Promise.resolve({})
    ])
      .then(async ([data, products, remotePhotos, familyPhotos]) => {
        if (!Array.isArray(data.families) || !Array.isArray(data.departments)) {
          throw new Error('Catalogue data is missing product families or departments');
        }
        const missingIcons = data.departments.filter(department => !departmentIcons[department.code]);
        if (missingIcons.length) {
          throw new Error(`Missing department icons for: ${missingIcons.map(department => department.code).join(', ')}`);
        }
        const missingImages = data.departments.filter(department => !department.image);
        if (missingImages.length) {
          throw new Error(`Missing department images for: ${missingImages.map(department => department.code).join(', ')}`);
        }

        if (familyGrid) {
          data.families.forEach(family => {
            const card = createElement('article', 'catalogue-index-family-card');
            const link = createElement('a');
            link.href = `/catalogue/${family.slug}`;
            const imageWrap = createElement('span', 'taxonomy-category-image');
            const image = createElement('img', 'taxonomy-category-photo');
            image.src = `/${family.image}`;
            image.alt = family.name;
            image.loading = 'lazy';
            image.decoding = 'async';
            imageWrap.append(image);
            const heading = createElement('h3', '', family.name);
            const description = createElement('p', '', family.description);
            link.append(imageWrap, heading, description);
            card.append(link);
            familyGrid.append(card);
          });
        }

        const scrollToCatalogueSection = () => {
          if (!['#product-families', '#departments'].includes(location.hash)) return;
          requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start', behavior:'instant'}));
        };
        if (refreshPosition === null) scrollToCatalogueSection();
        window.addEventListener('hashchange', scrollToCatalogueSection);
        const productMap = products ? new Map(products.products.flatMap(product => {
          const entry = {...product, page:product.url.replace(/^\//, '') + '.html', label:product.model};
          return [[product.id, entry], [entry.page, entry]];
        })) : null;
        const selectedFamily = familyCode ? data.families.find(family => family.code === familyCode) : null;
        if (familyCode && !selectedFamily) throw new Error('Product family not found');
        const sliderRows = selectedFamily && departmentsGrid ? selectedFamily.subcategories.map(subcategory => ({
          ...subcategory,
          familyPhoto:familyPhotos[subcategory.code],
          groups:[{name:subcategory.name,products:subcategory.products || []}]
        })) : selectedFamily ? [] : data.departments;
        // Static subcategory links remain available if loading fails or JavaScript is disabled.
        if (selectedFamily && departmentsGrid) departmentsGrid.replaceChildren();
        for (const department of sliderRows) {
          const groups = Array.isArray(department.groups) ? department.groups : [];
          if (departmentsGrid && productMap) {
            const pages = [...new Set(groups.flatMap(group => group.products || []))];
            const row = createElement('section', 'department-slider-row');
            row.dataset.taxonomyCard = '';
            row.dataset.search = `${department.code} ${department.name} ${groups.map(group => group.name).join(' ')} ${pages.map(page => productMap.get(page)?.search || '').join(' ')}`.toLocaleLowerCase();
            const intro = createElement('a', 'department-slider-intro');
            intro.href = `/catalogue/${department.slug}`;
            const image = createElement('img');
            const originalImage = department.image.startsWith('/') ? department.image : `/${department.image}`;
            image.src = department.familyPhoto?.image || originalImage;
            if (department.familyPhoto) {
              image.referrerPolicy = 'no-referrer';
              image.dataset.vpManaged = 'true';
              const inset = department.familyPhoto.inset;
              if (Array.isArray(inset) && inset.some(value => value > 0)) {
                image.style.objectViewBox = `inset(${inset.map(value => `${value}%`).join(' ')})`;
              }
              image.addEventListener('error', () => {
                image.style.objectViewBox = '';
                image.src = originalImage;
              }, {once:true});
            }
            image.alt = department.name;
            image.loading = 'lazy';
            const explore = createElement('span', 'department-explore-link', selectedFamily ? 'Explore subcategory' : 'Explore department');
            const arrowMaskId = `department-explore-${department.code}`;
            const exploreArrow = createElement('span', 'department-explore-arrow');
            exploreArrow.setAttribute('aria-hidden', 'true');
            exploreArrow.innerHTML = `<svg viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><defs><mask id="${arrowMaskId}" maskUnits="userSpaceOnUse" x="0" y="-100" width="160" height="200"><path class="products-loop-reveal" pathLength="100" d="M10 76C38 90 81 85 91 65C104 38 79 29 67 46C51 70 94 89 118 64C130 51 135 32 136 16C138-3 142-24 136-45C132-60 124-72 114-80" fill="none" stroke="white" stroke-width="12"/></mask></defs><path class="products-loop-dots" d="M10 76C38 90 81 85 91 65C104 38 79 29 67 46C51 70 94 89 118 64C130 51 135 32 136 16C138-3 142-24 136-45C132-60 124-72 114-80" mask="url(#${arrowMaskId})"/><path class="products-loop-head" d="M109-85L114-65L128-77Z"/></svg>`;
            if (['DP01', 'DP03', 'DP10', 'DP17', 'DP21', 'DP25'].includes(department.code)) {
              const svg = exploreArrow.querySelector('svg');
              const shortened = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              shortened.setAttribute('transform', 'translate(10 76) scale(0.7866) translate(-10 -76)');
              while (svg.firstChild) shortened.append(svg.firstChild);
              svg.append(shortened);
            }
            explore.append(exploreArrow);
            intro.append(image, createElement('h3', '', department.name), explore);
            const gallery = createElement('div', 'department-slider-gallery');
            const track = createElement('div', 'department-slider-track');
            track.id = `department-slider-${department.code}`;
            track.setAttribute('aria-label', `${department.name} products`);
            if (!selectedFamily) track.tabIndex = 0;
            else track.classList.add('family-product-grid');
            const seenProductImages = new Set();
            pages.forEach(page => {
              const product = productMap.get(page);
              if (!product) return;
              const productDescription = [product.name, product.model, product.url].filter(Boolean).join(' ');
              if (/\b(?:refurb(?:ished)?|pre[\s-]?owned|second[\s-]?hand)\b/i.test(productDescription)) return;
              const storedPhoto = remotePhotos[product.id];
              const replacement = storedPhoto && {
                ...storedPhoto,
                image:department.productPhotos?.[product.id] || storedPhoto.image
              };
              const photoUrl = replacement?.image || product.image || '';
              let photoKey = photoUrl.split(/[?#]/, 1)[0];
              try { photoKey = decodeURIComponent(photoKey); } catch (_) {}
              if (brandedDepartmentSliderPhotos.has(photoKey.split('/').pop())) return;
              if (photoKey && seenProductImages.has(photoKey)) return;
              if (photoKey) seenProductImages.add(photoKey);
              const item = createElement('a', 'department-slider-product');
              item.href = '/' + product.page.replace(/\.html$/, '').replace(/\/index$/, '');
              const photo = createElement('span', 'department-slider-photo');
              const img = createElement('img');
              if (replacement) {
                img.dataset.remotePhoto = 'true';
                img.referrerPolicy = 'no-referrer';
                img.style.objectViewBox = `inset(${replacement.inset.map(value => value + '%').join(' ')})`;
                img.dataset.vpManaged = 'true';
                img.dataset.remoteUrl = replacement.image;
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
                img.dataset.photoFallback = product.image;
              } else img.src = product.image;
              img.alt = product.name;
              img.loading = 'lazy';
              img.decoding = 'async';
              // Retain existing photos until a higher-quality replacement is verified.
              fitProductPhoto(img);
              photo.append(img);
              const productGroup = groups.find(group => (group.products || []).includes(page));
              item.append(photo, createElement('span', 'department-slider-label', productGroup?.name || department.name), createElement('h4', '', product.name));
              // Temporary preview selection requested by the owner; replace with confirmed bestsellers before publishing.
              const previewScore = [...product.id].reduce((total, letter) => total + letter.charCodeAt(0), 0);
              if (previewScore % 7 === 0) {
                const badge = createElement('span', 'department-product-badge', 'Best Seller');
                badge.dataset.previewBadge = 'true';
                item.append(badge);
              }
              track.append(item);
            });
            const controls = createElement('div', 'department-slider-controls');
            if (selectedFamily) controls.hidden = true;
            const progress = createElement('progress', 'department-slider-progress');
            progress.max = 1;
            const buttons = createElement('div', 'department-slider-buttons');
            const previous = createElement('button', '', '‹');
            const next = createElement('button', '', '›');
            [previous, next].forEach(button => { button.type = 'button'; button.setAttribute('aria-controls', track.id); });
            previous.setAttribute('aria-label', `Previous ${department.name} products`);
            next.setAttribute('aria-label', `Next ${department.name} products`);
            const update = () => {
              const end = track.scrollWidth - track.clientWidth;
              if (selectedFamily) {
                previous.disabled = track.scrollLeft < 2;
                next.disabled = track.scrollLeft >= end - 2;
                progress.value = end > 0 ? track.scrollLeft / end : 1;
              } else {
                previous.disabled = false;
                next.disabled = false;
              }
            };
            const move = direction => track.scrollBy({left: direction * Math.max(220, track.clientWidth * .8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
            previous.addEventListener('click', () => move(-1));
            next.addEventListener('click', () => move(1));
            // Controls are hidden in this homepage-style strip; avoid layout reads every animation frame.
            track.addEventListener('keydown', event => {
              if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
              event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
            });
            new ResizeObserver(update).observe(track);
            let startLoop = () => {};
            const visibility = new IntersectionObserver(entries => {
              if (entries[0].isIntersecting) startLoop();
            }, {threshold:.25});
            visibility.observe(row);
            startLoop = () => {
              if (selectedFamily) return;
              initializeDepartmentSlider(track, previous, next, progress);
            };
            buttons.append(previous, next);
            controls.append(progress, buttons);
            gallery.append(track, controls);
            if (!track.children.length) gallery.prepend(createElement('p', 'department-slider-empty', 'Coming soon'));
            row.append(intro, gallery);
            departmentsGrid.append(row);
            if (!selectedFamily) startLoop();
            // Paint each completed department before preparing the next one.
            if (status) status.textContent = `Loading ${selectedFamily ? 'subcategories' : 'departments'}… ${departmentsGrid.children.length} of ${sliderRows.length}`;
            const searchInput = directory.querySelector('[data-taxonomy-search]');
            if (searchInput?.value) searchInput.dispatchEvent(new Event('input'));
            await new Promise(resolve => setTimeout(resolve, 60));
            continue;
          }
          const card = createElement('a', 'taxonomy-category-card taxonomy-department-card');
          card.href = `/catalogue/${department.slug}`;
          card.dataset.taxonomyCard = '';
          card.dataset.search = `${department.code} ${department.name} ${groups.map(group => group.name).join(' ')}`.toLocaleLowerCase();
          if (department.image) {
          const imageWrap = createElement('span', 'taxonomy-category-image');
          const image = createElement('img', 'taxonomy-department-image taxonomy-category-photo');
          const rawSrc = department.image.startsWith('/') ? department.image : `/${department.image}`;
          image.src = rawSrc.includes('?') ? rawSrc : `${rawSrc}?v=4`;
          image.alt = `${department.name} equipment illustration`;
          image.width = 1024;
          image.height = 1024;
          image.loading = 'lazy';
          image.decoding = 'async';
          imageWrap.append(image);
          card.append(imageWrap);
          }
          card.append(createElement('span', 'taxonomy-code', department.code));
          const heading = createElement('h4', 'taxonomy-category-heading');
          const sign = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          sign.setAttribute('class', 'taxonomy-department-sign');
          sign.setAttribute('viewBox', '0 0 24 24');
          sign.setAttribute('aria-hidden', 'true');
          const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          iconPath.setAttribute('d', departmentIcons[department.code]);
          sign.append(iconPath);
          heading.append(sign, document.createTextNode(department.name));
          card.append(heading);
          card.append(createElement('p', '', `${groups.length} product groups`));
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          arrow.setAttribute('class', 'taxonomy-card-arrow');
          arrow.setAttribute('viewBox', '0 0 24 24');
          arrow.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M5 19 19 5M5 5h14v14');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          arrow.append(path);
          card.append(arrow);
          (departmentsGrid || (department.kind === 'clinical' ? clinicalGrid : supportGrid)).append(card);
        }

        if (status) status.remove();
        requestAnimationFrame(() => {
          if (refreshPosition === null) return;
          window.scrollTo({top:refreshPosition, behavior:'instant'});
          refreshPosition = null;
        });
      })
      .catch(error => {
        console.error('Unable to load the product catalogue directory.', error);
        if (status) {
          status.textContent = 'The product directory could not be loaded. Please refresh the page or contact our team.';
          status.setAttribute('role', 'alert');
        }
      });
  }

  document.querySelectorAll('[data-taxonomy-search]').forEach(input => {
    const empty = document.querySelector('[data-taxonomy-empty]');
    input.addEventListener('input', () => {
      const cards = Array.from(document.querySelectorAll('[data-taxonomy-card]'));
      const words = input.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      let count = 0;
      cards.forEach(card => {
        const visible = words.every(word => card.dataset.search.includes(word));
        card.hidden = !visible;
        count += visible ? 1 : 0;
      });
      if (empty) empty.hidden = count !== 0;
    });
  });
})();
