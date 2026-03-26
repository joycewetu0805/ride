/* ═══════════════════════════════════════════
   UPC RideConnect — Application UI
   ═══════════════════════════════════════════ */

// ── RENDER TRIPS ────────────────────────────────────────
function renderTrips(data) {
  var grid = document.getElementById('trips-grid');
  grid.innerHTML = '';
  if (data.length === 0) {
    grid.innerHTML = '<div class="col-span-3 text-center py-12 text-gray-400">Aucun trajet trouve pour ce quartier.</div>';
    return;
  }
  data.forEach(function(t, i) {
    var card = document.createElement('div');
    card.className = 'trip-card fade-up';
    card.style.transitionDelay = (i * 0.05) + 's';
    var seatsColor = t.seats === 1 ? 'text-red-500' : t.seats <= 2 ? 'text-amber-500' : 'text-green-600';
    card.innerHTML =
      '<div class="flex items-start justify-between mb-4">' +
        '<div class="flex items-center gap-3">' +
          '<div class="avatar-ring flex-shrink-0">' +
            '<img src="' + t.avatar + '" alt="' + t.driver + '" class="w-full h-full object-cover" loading="lazy"/>' +
          '</div>' +
          '<div>' +
            '<div class="font-semibold text-gray-900 text-sm">' + t.driver + '</div>' +
            '<div class="flex items-center gap-1 mt-0.5">' +
              '<span class="star">\u2605</span>' +
              '<span class="text-xs font-mono text-gray-600">' + t.rating + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="font-mono font-bold text-violet-700 text-sm">' + t.time + '</div>' +
      '</div>' +
      '<div class="flex gap-3 mb-4">' +
        '<div class="flex flex-col items-center pt-1">' +
          '<div class="route-dot" style="background:#7c3aed;"></div>' +
          '<div class="route-line"></div>' +
          '<div class="route-dot" style="background:#f59e0b;"></div>' +
        '</div>' +
        '<div class="space-y-3 flex-1">' +
          '<div>' +
            '<div class="text-xs text-gray-400">Depart</div>' +
            '<div class="font-semibold text-gray-900 text-sm">' + t.from + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="text-xs text-gray-400">Destination</div>' +
            '<div class="font-semibold text-gray-900 text-sm">Campus UPC</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="bg-violet-50 rounded-xl px-3 py-2 text-xs text-violet-600 mb-4">' +
        'Via ' + t.waypoints +
      '</div>' +
      '<div class="flex items-center justify-between">' +
        '<div>' +
          '<span class="' + seatsColor + ' font-bold text-sm">' + t.seats + ' place' + (t.seats > 1 ? 's' : '') + '</span>' +
          '<span class="text-gray-400 text-xs ml-2">restante' + (t.seats > 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-3">' +
          '<span class="font-display font-black text-violet-700">' + t.price.toLocaleString() + ' <span class="text-xs font-mono font-normal">FC</span></span>' +
          '<button class="btn-violet py-2 px-4 text-xs rounded-xl" data-book-id="' + t.id + '" aria-label="Reserver le trajet de ' + t.driver + '">Reserver</button>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
    setTimeout(function() { card.classList.add('visible'); }, 100 + i * 60);
  });

  // Attach booking event listeners
  grid.querySelectorAll('[data-book-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      bookTrip(parseInt(this.getAttribute('data-book-id')));
    });
  });
}

// ── MODAL MANAGEMENT ────────────────────────────────────
function openModal(name) {
  document.getElementById('modal-' + name).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(name) {
  document.getElementById('modal-' + name).classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalOnOverlay(e, name) {
  if (e.target.id === 'modal-' + name) closeModal(name);
}

function switchModal(from, to) {
  closeModal(from);
  setTimeout(function() { openModal(to); }, 200);
}

// ── DASHBOARD ───────────────────────────────────────────
function openDashboard() {
  if (currentUser) {
    document.getElementById('dashboard-name').textContent = currentUser.name;
  }
  document.getElementById('dashboard-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDashboard() {
  document.getElementById('dashboard-panel').classList.remove('open');
  document.body.style.overflow = '';
}

// ── TABS ────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('tab-driver').classList.toggle('active', tab === 'driver');
  document.getElementById('tab-passenger').classList.toggle('active', tab === 'passenger');
  document.getElementById('steps-driver').classList.toggle('hidden', tab !== 'driver');
  document.getElementById('steps-passenger').classList.toggle('hidden', tab !== 'passenger');
}

// ── SCROLL EFFECTS ──────────────────────────────────────
function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

window.addEventListener('scroll', function() {
  var navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ── INTERSECTION OBSERVER ───────────────────────────────
var fadeObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(function(el) {
  fadeObserver.observe(el);
});

// ── COUNTER ANIMATION ───────────────────────────────────
var counters = {
  'count-students': 2400,
  'count-trips':    8720,
  'count-saved':    4200000,
  'count-zones':    24
};

var counterObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      var id = e.target.id;
      var target = counters[id];
      var current = 0;
      var step = target / 60;
      var interval = setInterval(function() {
        current = Math.min(current + step, target);
        if (target >= 1000000) {
          e.target.textContent = (current / 1000000).toFixed(1) + 'M';
        } else if (target >= 1000) {
          e.target.textContent = (current / 1000).toFixed(0) + 'K';
        } else {
          e.target.textContent = Math.floor(current);
        }
        if (current >= target) clearInterval(interval);
      }, 25);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

Object.keys(counters).forEach(function(id) {
  var el = document.getElementById(id);
  if (el) counterObserver.observe(el);
});

// ── EVENT LISTENERS ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Load trips
  loadTrips();

  // Animate fade-ups already in view
  setTimeout(function() {
    document.querySelectorAll('.fade-up').forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) el.classList.add('visible');
    });
  }, 100);

  // Navbar buttons
  document.getElementById('btn-login').addEventListener('click', function() { openModal('login'); });
  document.getElementById('btn-register').addEventListener('click', function() { openModal('register'); });
  document.getElementById('btn-hero-register').addEventListener('click', function() { openModal('register'); });
  document.getElementById('btn-hero-trips').addEventListener('click', function() { scrollToSection('trips'); });
  document.getElementById('btn-mission-register').addEventListener('click', function() { openModal('register'); });
  document.getElementById('btn-stats-register').addEventListener('click', function() { openModal('register'); });
  document.getElementById('btn-footer-register').addEventListener('click', function() { openModal('register'); });
  document.getElementById('btn-publish-trip').addEventListener('click', function() { openModal('newTrip'); });

  // Search input
  document.getElementById('search-input').addEventListener('input', filterTrips);

  // Login modal
  document.getElementById('btn-do-login').addEventListener('click', handleLogin);
  document.getElementById('link-to-register').addEventListener('click', function() { switchModal('login', 'register'); });

  // Register modal
  document.getElementById('btn-do-register').addEventListener('click', handleRegister);
  document.getElementById('link-to-login').addEventListener('click', function() { switchModal('register', 'login'); });
  document.getElementById('btn-register-dashboard').addEventListener('click', function() {
    closeModal('register');
    openDashboard();
  });

  // New trip modal
  document.getElementById('btn-do-publish').addEventListener('click', handlePublishTrip);
  document.getElementById('btn-close-trip-success').addEventListener('click', function() { closeModal('newTrip'); });

  // Booking modal
  document.querySelectorAll('.mm-option').forEach(function(el) {
    el.addEventListener('click', function() {
      var name = this.getAttribute('data-mm');
      selectMM(this, name);
    });
  });
  document.getElementById('btn-do-pay').addEventListener('click', simulatePayment);
  document.getElementById('btn-close-booking').addEventListener('click', function() { closeModal('booking'); });

  // Rating modal
  document.querySelectorAll('.rating-star').forEach(function(s) {
    s.addEventListener('click', function() {
      setRating(parseInt(this.getAttribute('data-val')));
    });
  });
  document.getElementById('btn-do-rate').addEventListener('click', submitRating);

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeModal(this.getAttribute('data-close-modal'));
    });
  });

  // Modal overlay close
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) {
        var name = this.id.replace('modal-', '');
        closeModal(name);
      }
    });
  });

  // Tabs
  document.getElementById('tab-driver').addEventListener('click', function() { switchTab('driver'); });
  document.getElementById('tab-passenger').addEventListener('click', function() { switchTab('passenger'); });

  // Dashboard
  document.getElementById('btn-close-dashboard').addEventListener('click', closeDashboard);
  document.getElementById('btn-dashboard-new-trip').addEventListener('click', function() {
    openModal('newTrip');
    closeDashboard();
  });
  document.getElementById('btn-dashboard-rate').addEventListener('click', function() {
    openModal('rating');
    closeDashboard();
  });
});
