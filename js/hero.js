(function () {
	'use strict';

	var heroBanners = document.getElementById('home-hero-banners');
	if (!heroBanners) return;

	var bannerSlides = Array.from(heroBanners.querySelectorAll('.carousel-item'));
	var currentBanner = bannerSlides.find(function (slide) { return slide.classList.contains('active'); });
	if (!currentBanner || bannerSlides.length < 2) return;
	var interval = 5000;
	var duration = 1000;
	var easing = 'cubic-bezier(0.45, 0, 0.55, 1)';
	var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	var phoneLayout = window.matchMedia('(max-width: 767.98px)');
	var timer;
	var revealTimer;
	var concealTimer;
	var pointerInside = false;
	var activeTransition = null;
	var dragStart = null;
	var wasSwiped = false;

	bannerSlides.forEach(function (slide) {
		var scene = slide.querySelector('.hero-scene');
		if (scene) scene.style.cursor = 'pointer';
	});

	heroBanners.addEventListener('click', function (event) {
		if (wasSwiped) {
			wasSwiped = false;
			return;
		}
		if (event.target.closest && event.target.closest('a, button')) return;
		var slide = (event.target.closest && event.target.closest('.carousel-item')) || currentBanner;
		var primaryLink = slide && slide.querySelector('.hero-button-primary');
		window.location.href = (primaryLink && primaryLink.getAttribute('href')) || 'products.html';
	});

	function setActiveSlide(slide) {
		bannerSlides.forEach(function (item) {
			var active = item === slide;
			item.classList.toggle('active', active);
			item.setAttribute('aria-hidden', active ? 'false' : 'true');
			item.inert = !active;
			item.style.removeProperty('visibility');
		});
		currentBanner = slide;
	}

	function completeTransition(transition) {
		if (activeTransition !== transition) return;
		setActiveSlide(transition.next);
		activeTransition = null;
		transition.animations.forEach(function (animation) { animation.cancel(); });
	}

	function settleTransition() {
		if (activeTransition) completeTransition(activeTransition);
	}

	function schedule() {
		window.clearTimeout(timer);
		var controlFocused = heroBanners.querySelector('.hero-slider-control:focus');
		if (document.hidden || (heroBanners.contains(document.activeElement) && !controlFocused)) return;
		timer = window.setTimeout(function () { advanceBanner(1); }, interval);
	}

	function advanceBanner(direction, manual) {
		var controlFocused = heroBanners.querySelector('.hero-slider-control:focus');
		if (document.hidden || (!manual && heroBanners.contains(document.activeElement) && !controlFocused)) {
			schedule();
			return;
		}
		if (manual) settleTransition();

		var currentIndex = bannerSlides.indexOf(currentBanner);
		var next = bannerSlides[(currentIndex + direction + bannerSlides.length) % bannerSlides.length];
		var image = next.querySelector('img');
		if (!image || !image.complete || !image.naturalWidth) {
			schedule();
			return;
		}

		if (reducedMotion.matches || typeof currentBanner.animate !== 'function') {
			setActiveSlide(next);
			schedule();
			return;
		}

    if (phoneLayout.matches) {
      setActiveSlide(next);
      var mobileArtwork = next.querySelector('.hero-equipment');
      if (mobileArtwork) {
        mobileArtwork.animate(
          [{ opacity: 0.35 }, { opacity: 1 }],
          { duration: duration, easing: easing }
        );
      }
      schedule();
      return;
    }

		var previous = currentBanner;
		var distance = heroBanners.clientWidth;
		next.style.visibility = 'visible';
		next.setAttribute('aria-hidden', 'false');
		next.inert = false;
		previous.setAttribute('aria-hidden', 'true');
		previous.inert = true;

		var transition = {
			next: next,
			animations: [
				previous.animate(
					[{ transform: 'translateX(0)' }, { transform: 'translateX(' + (direction > 0 ? -distance : distance) + 'px)' }],
					{ duration: duration, easing: easing, fill: 'both' }
				),
				next.animate(
					[{ transform: 'translateX(' + (direction > 0 ? distance : -distance) + 'px)' }, { transform: 'translateX(0)' }],
					{ duration: duration, easing: easing, fill: 'both' }
				)
			]
		};
		activeTransition = transition;
		currentBanner = next;
		Promise.all(transition.animations.map(function (animation) { return animation.finished; }))
			.then(function () { completeTransition(transition); }, function () {});
		schedule();
	}

	bannerSlides.forEach(function (slide) {
		var active = slide === currentBanner;
		slide.setAttribute('aria-hidden', active ? 'false' : 'true');
		slide.inert = !active;
	});

	heroBanners.addEventListener('focusin', function () { window.clearTimeout(timer); });
	heroBanners.addEventListener('focusout', function () { window.setTimeout(schedule, 0); });
	document.addEventListener('visibilitychange', function () {
		if (document.hidden) {
			window.clearTimeout(timer);
			settleTransition();
		} else {
			schedule();
		}
	});

	heroBanners.addEventListener('pointerdown', function (event) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (event.target.closest && event.target.closest('a, button')) return;
		dragStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
		heroBanners.classList.add('is-dragging');
		window.clearTimeout(timer);
		settleTransition();
		if (heroBanners.setPointerCapture) heroBanners.setPointerCapture(event.pointerId);
	});
	heroBanners.addEventListener('pointerup', function (event) {
		if (!dragStart || dragStart.id !== event.pointerId) return;
		var deltaX = event.clientX - dragStart.x;
		var deltaY = event.clientY - dragStart.y;
		dragStart = null;
		if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
			wasSwiped = true;
			if (event.cancelable) event.preventDefault();
			advanceBanner(deltaX < 0 ? 1 : -1);
		} else {
			schedule();
		}
	});
	heroBanners.addEventListener('pointercancel', function () {
		dragStart = null;
		schedule();
	});

	function revealControls() { heroBanners.classList.add('is-controls-visible'); }
	function hideControls() {
		if (pointerInside || heroBanners.querySelector('.hero-slider-control:focus-visible')) return;
		heroBanners.classList.remove('is-controls-visible');
	}
	heroBanners.addEventListener('pointerenter', function (event) {
		if (event.pointerType === 'touch') return;
		pointerInside = true;
		window.clearTimeout(concealTimer);
		window.clearTimeout(revealTimer);
		if (!heroBanners.classList.contains('is-controls-visible')) revealTimer = window.setTimeout(revealControls, 1000);
	});
	heroBanners.addEventListener('pointerleave', function (event) {
		if (event.pointerType === 'touch') return;
		pointerInside = false;
		window.clearTimeout(revealTimer);
		window.clearTimeout(concealTimer);
		concealTimer = window.setTimeout(hideControls, 4000);
	});
	heroBanners.querySelectorAll('.hero-slider-control').forEach(function (control) {
		control.addEventListener('click', function (event) {
			event.preventDefault();
			event.stopPropagation();
			revealControls();
			advanceBanner(control.classList.contains('hero-slider-next') ? 1 : -1, true);
			if (event.detail > 0) control.blur();
		});
	});
	heroBanners.addEventListener('focusin', function () {
		window.clearTimeout(concealTimer);
		revealControls();
	});
	heroBanners.addEventListener('focusout', function () {
		window.setTimeout(function () {
			if (pointerInside || heroBanners.querySelector('.hero-slider-control:focus-visible')) return;
			concealTimer = window.setTimeout(hideControls, 4000);
		}, 0);
	});
	 schedule();
})();
(function () {
	'use strict';

	const phoneHome = document.querySelector('.phone-home');
	if (!phoneHome) return;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const compact = window.matchMedia('(max-width: 700px)');

	phoneHome.querySelectorAll('[data-phone-slider]').forEach(slider => {
		const track = slider.querySelector('.phone-track');
		const dots = Array.from(slider.querySelectorAll('[data-phone-page]'));
		let current = 0;

		function goTo(index) {
			const page = (index + dots.length) % dots.length;
			track.scrollTo({
				left: page * track.clientWidth,
				behavior: reducedMotion.matches ? 'instant' : 'smooth'
			});
		}

		track.addEventListener('scroll', () => {
			if (compact.matches || !track.clientWidth) return;
			current = Math.round(track.scrollLeft / track.clientWidth);
			dots.forEach((dot, index) => {
				if (index === current) dot.setAttribute('aria-current', 'true');
				else dot.removeAttribute('aria-current');
			});
		}, { passive: true });

		track.addEventListener('keydown', event => {
			if (compact.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
			event.preventDefault();
			goTo(current + (event.key === 'ArrowLeft' ? -1 : 1));
		});
		dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
		slider.querySelectorAll('[data-phone-step]').forEach(button => {
			button.addEventListener('click', () => goTo(current + Number(button.dataset.phoneStep)));
		});
	});

	const hero = phoneHome.querySelector('.phone-hero');
	const bannerTrack = hero.querySelector('.phone-track');
	const slides = Array.from(bannerTrack.children);
	let active = 0;
	let bannerTimer;
	let drag;
	let transition = [];

	function settleBanner() {
		transition.forEach(animation => animation.cancel());
		transition = [];
		slides.forEach(slide => slide.removeAttribute('data-outgoing'));
	}

	function scheduleBanner() {
		clearTimeout(bannerTimer);
		if (compact.matches && !document.hidden && !drag && !hero.matches(':focus-within')) {
			bannerTimer = setTimeout(() => advanceBanner(1), 5000);
		}
	}

	async function advanceBanner(direction) {
		clearTimeout(bannerTimer);
		settleBanner();
		const outgoing = slides[active];
		outgoing.removeAttribute('data-active');
		outgoing.inert = true;
		active = (active + direction + slides.length) % slides.length;
		const incoming = slides[active];
		incoming.setAttribute('data-active', '');
		incoming.inert = false;
		if (!reducedMotion.matches && incoming.animate) {
			outgoing.setAttribute('data-outgoing', '');
			const options = { duration: 1000, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'both' };
			const animations = [
				outgoing.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-direction * 100}%)` }], options),
				incoming.animate([{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }], options)
			];
			transition = animations;
			await Promise.allSettled(animations.map(animation => animation.finished));
			if (transition !== animations) return;
			settleBanner();
		}
		scheduleBanner();
	}

	hero.addEventListener('pointerdown', event => {
		if (!compact.matches || event.button !== 0 || event.target.closest('a, button')) return;
		drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
		clearTimeout(bannerTimer);
		settleBanner();
		hero.setPointerCapture(event.pointerId);
	});
	hero.addEventListener('pointerup', event => {
		if (drag?.id !== event.pointerId) return;
		const x = event.clientX - drag.x;
		const y = event.clientY - drag.y;
		drag = null;
		if (Math.abs(x) > 42 && Math.abs(x) > Math.abs(y) * 1.2) advanceBanner(x < 0 ? 1 : -1);
		else scheduleBanner();
	});
	hero.addEventListener('pointercancel', () => {
		drag = null;
		scheduleBanner();
	});
	hero.addEventListener('focusin', scheduleBanner);
	hero.addEventListener('focusout', () => setTimeout(scheduleBanner, 0));
	bannerTrack.addEventListener('keydown', event => {
		if (!compact.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
		event.preventDefault();
		advanceBanner(event.key === 'ArrowLeft' ? -1 : 1);
	});

	const products = phoneHome.querySelector('#phone-products');
	const originals = Array.from(products.children);
	let leadingCopies = [];
	let trailingCopies = [];
	function copyProductGroup(group) {
		const copy = group.cloneNode(true);
		copy.setAttribute('data-phone-copy', '');
		copy.setAttribute('aria-hidden', 'true');
		copy.querySelectorAll('a, button, input').forEach(control => { control.tabIndex = -1; });
		return copy;
	}
	let frame;
	let lastTime;
	let position = 0;
	let lastWritten = 0;
	let pauseUntil = 0;
	let pointerId = null;
	let visible = true;
	let hovered = false;
	let cycle = 0;
	let settleScrollTimer;

	function writeProductPosition(value) {
		position = value;
		products.scrollLeft = value;
		lastWritten = products.scrollLeft;
		products.style.setProperty('--phone-card-offset', `${lastWritten - value}px`);
	}

	function measureProducts() {
		if (!trailingCopies.length) {
			cycle = 0;
			return;
		}
		const firstCard = group => group.querySelector('.product-card') || group.firstElementChild;
		const previousCycle = cycle;
		cycle = firstCard(trailingCopies[0]).offsetLeft - firstCard(originals[0]).offsetLeft;
		if (previousCycle && cycle !== previousCycle) writeProductPosition(position + cycle - previousCycle);
	}

	function wrapProductPosition(value) {
		return cycle + ((value % cycle) + cycle) % cycle;
	}

	function moveProducts(now) {
		const elapsed = lastTime === undefined ? 0 : Math.min(now - lastTime, 64);
		lastTime = now;
		if (now >= pauseUntil && pointerId === null && !hovered && !products.matches(':focus-visible, :has(:focus-visible)')) {
			if (cycle > 0) writeProductPosition(wrapProductPosition(position + elapsed * .03));
		}
		frame = requestAnimationFrame(moveProducts);
	}

	function syncProducts() {
		cancelAnimationFrame(frame);
		lastTime = undefined;
		if (compact.matches && visible && !document.hidden && !reducedMotion.matches) {
			frame = requestAnimationFrame(moveProducts);
		}
	}

	products.addEventListener('scroll', () => {
		if (!compact.matches || products.scrollLeft === lastWritten) return;
		position = lastWritten = products.scrollLeft;
		products.style.removeProperty('--phone-card-offset');
		pauseUntil = performance.now() + 1800;
		clearTimeout(settleScrollTimer);
		settleScrollTimer = setTimeout(() => {
			if (cycle > 0 && pointerId === null && (position < cycle || position >= 2 * cycle)) {
				writeProductPosition(wrapProductPosition(position));
			}
		}, 160);
	}, { passive: true });
	products.addEventListener('pointerenter', event => { hovered = event.pointerType !== 'touch'; });
	products.addEventListener('pointerleave', () => { hovered = false; });
	products.addEventListener('pointerdown', event => { pointerId = event.pointerId; }, { passive: true });
	function releaseProducts(event) {
		if (event.pointerId !== pointerId) return;
		pointerId = null;
		pauseUntil = performance.now() + 1800;
	}
	window.addEventListener('pointerup', releaseProducts, { passive: true });
	window.addEventListener('pointercancel', releaseProducts, { passive: true });
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			syncProducts();
		}).observe(products);
	}

	function syncLayout() {
		settleBanner();
		drag = null;
		bannerTrack.toggleAttribute('data-ready', compact.matches);
		slides.forEach((slide, index) => {
			slide.toggleAttribute('data-active', index === active);
			slide.inert = compact.matches && index !== active;
		});
		clearTimeout(settleScrollTimer);
		[...leadingCopies, ...trailingCopies].forEach(copy => copy.remove());
		leadingCopies = compact.matches ? originals.map(copyProductGroup) : [];
		trailingCopies = compact.matches ? originals.map(copyProductGroup) : [];
		products.prepend(...leadingCopies);
		products.append(...trailingCopies);
		cycle = 0;
		measureProducts();
		writeProductPosition(cycle);
		scheduleBanner();
		syncProducts();
	}
	compact.addEventListener('change', syncLayout);
	reducedMotion.addEventListener('change', () => {
		settleBanner();
		scheduleBanner();
		syncProducts();
	});
	document.addEventListener('visibilitychange', () => {
		scheduleBanner();
		syncProducts();
	});
	syncLayout();
	if ('ResizeObserver' in window) new ResizeObserver(measureProducts).observe(products);
	else window.addEventListener('resize', measureProducts);
})();
