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
		if (document.hidden || heroBanners.contains(document.activeElement)) return;
		timer = window.setTimeout(function () { advanceBanner(1); }, interval);
	}

	function advanceBanner(direction) {
		if (document.hidden || heroBanners.contains(document.activeElement)) {
			schedule();
			return;
		}

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
		if (!phoneLayout.matches || (event.pointerType === 'mouse' && event.button !== 0)) return;
		if (event.target.closest && event.target.closest('a, button')) return;
		dragStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
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

	schedule();
})();
