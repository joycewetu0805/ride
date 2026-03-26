/* ═══════════════════════════════════════════
   UPC RideConnect — API Layer
   ═══════════════════════════════════════════ */

// ── API HELPER ──────────────────────────────────────────
async function apiCall(method, path, body = null) {
  const token = localStorage.getItem('upc_token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  try {
    const res = await fetch(API_URL + path, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }
    return data;
  } catch (err) {
    // If backend is not running, fall back to local mode
    console.warn('[API]', err.message, '— mode local actif');
    return null;
  }
}

// ── STATE ───────────────────────────────────────────────
let currentUser = null;
let selectedMM = null;
let currentRating = 0;
let currentBookingTrip = null;

// ── DEMO DATA (used when backend is not available) ──────
const TRIPS_DATA = [
  { id:1, driver:"Jean-Paul K.", avatar:PLACEHOLDER_AVATARS[0], from:"Lingwala", time:"07:30", seats:3, price:2500, rating:4.9, waypoints:"Rond-point Victoire", phone:"+243 81 111 1111" },
  { id:2, driver:"Nathalie M.", avatar:PLACEHOLDER_AVATARS[1], from:"Barumbu", time:"08:00", seats:2, price:2000, rating:4.7, waypoints:"Avenue Kasa-Vubu", phone:"+243 82 222 2222" },
  { id:3, driver:"Patrick L.", avatar:PLACEHOLDER_AVATARS[2], from:"Ngaliema", time:"07:00", seats:4, price:3000, rating:5.0, waypoints:"Rond-point Ngaba", phone:"+243 99 333 3333" },
  { id:4, driver:"Cecile B.", avatar:PLACEHOLDER_AVATARS[3], from:"Lemba", time:"08:30", seats:3, price:2200, rating:4.6, waypoints:"Croisement Tshopo", phone:"+243 81 444 4444" },
  { id:5, driver:"David K.", avatar:PLACEHOLDER_AVATARS[4], from:"Kalamu", time:"07:45", seats:1, price:1800, rating:4.8, waypoints:"Rond-point Victoire", phone:"+243 90 555 5555" },
  { id:6, driver:"Lydia S.", avatar:PLACEHOLDER_AVATARS[5], from:"Gombe", time:"09:00", seats:3, price:2800, rating:4.9, waypoints:"Place de la Gare", phone:"+243 81 666 6666" },
];

// ── AUTH ─────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const pwd = document.getElementById('login-pwd').value;
  if (!email || !pwd) { alert('Veuillez remplir tous les champs'); return; }

  // Try API first
  const res = await apiCall('POST', '/auth/login', { email, password: pwd });
  if (res && res.token) {
    localStorage.setItem('upc_token', res.token);
    currentUser = res.user;
    closeModal('login');
    openDashboard();
    return;
  }

  // Fallback: demo mode
  if (email === 'etudiant@upc.ac.cd' && pwd === 'demo123' || email.includes('@upc.ac.cd')) {
    currentUser = { name: 'Jean-Paul K.', email };
    closeModal('login');
    openDashboard();
  } else {
    alert('Identifiants invalides. Utilisez votre email @upc.ac.cd');
  }
}

async function handleRegister() {
  const fields = ['reg-firstname','reg-lastname','reg-email','reg-card','reg-phone','reg-pwd'];
  const values = fields.map(id => document.getElementById(id).value);
  if (values.some(v => !v)) { alert('Veuillez remplir tous les champs'); return; }
  if (!values[2].includes('@upc.ac.cd')) { alert('Utilisez votre email universitaire UPC (@upc.ac.cd)'); return; }

  // Try API first
  const res = await apiCall('POST', '/auth/register', {
    firstName: values[0],
    lastName: values[1],
    email: values[2],
    studentCard: values[3],
    phone: values[4],
    role: document.getElementById('reg-role').value,
    password: values[5]
  });

  if (res && res.token) {
    localStorage.setItem('upc_token', res.token);
    currentUser = res.user;
  } else {
    // Fallback: demo mode
    currentUser = { name: values[0] + ' ' + values[1], email: values[2] };
  }

  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('register-success').classList.remove('hidden');
}

// ── TRIPS ───────────────────────────────────────────────
async function loadTrips() {
  const res = await apiCall('GET', '/trips');
  if (res && res.trips) {
    renderTrips(res.trips);
  } else {
    renderTrips(TRIPS_DATA);
  }
}

async function handlePublishTrip() {
  const from = document.getElementById('trip-from').value;
  const time = document.getElementById('trip-time').value;
  const seats = parseInt(document.getElementById('trip-seats').value);
  const price = parseInt(document.getElementById('trip-price').value);
  if (!from || !time || !seats || !price) { alert('Veuillez remplir tous les champs'); return; }

  // Try API first
  const res = await apiCall('POST', '/trips', {
    neighborhood: from,
    departureTime: time,
    totalSeats: seats,
    priceFc: price,
    waypoints: document.getElementById('trip-waypoints').value || ''
  });

  if (!res || !res.trip) {
    // Fallback: add to local data
    TRIPS_DATA.unshift({
      id: TRIPS_DATA.length + 1,
      driver: currentUser ? currentUser.name : 'Vous',
      avatar: PLACEHOLDER_AVATARS[0],
      from, time, seats, price,
      rating: 5.0,
      waypoints: document.getElementById('trip-waypoints').value || 'A confirmer',
      phone: '+243 XX XXX XXXX'
    });
  }

  document.getElementById('trip-form').classList.add('hidden');
  document.getElementById('trip-success').classList.remove('hidden');
  setTimeout(() => loadTrips(), 500);
}

async function filterTrips() {
  const query = document.getElementById('search-input').value.toLowerCase();

  // Try API first
  const res = await apiCall('GET', '/trips/search?neighborhood=' + encodeURIComponent(query) + '&includeNearby=true');
  if (res && res.trips) {
    renderTrips(res.trips);
  } else {
    // Fallback: local filter
    const filtered = TRIPS_DATA.filter(t =>
      t.from.toLowerCase().includes(query) || t.driver.toLowerCase().includes(query)
    );
    renderTrips(filtered);
  }
}

// ── BOOKING ─────────────────────────────────────────────
function bookTrip(id) {
  if (!currentUser) {
    openModal('login');
    return;
  }
  const trip = TRIPS_DATA.find(t => t.id === id);
  currentBookingTrip = trip;
  document.getElementById('booking-detail').textContent = trip.from + ' → UPC · ' + trip.time + ' avec ' + trip.driver;
  document.getElementById('price-display').textContent = trip.price.toLocaleString() + ' FC';
  document.getElementById('mm-selector').classList.remove('hidden');
  document.getElementById('booking-success').classList.add('hidden');
  // Reset payment steps
  ['pay-step-1','pay-step-2','pay-step-3'].forEach(function(stepId, i) {
    var el = document.getElementById(stepId);
    el.classList.remove('active','done');
    if (i === 0) el.classList.add('active');
  });
  selectedMM = null;
  document.querySelectorAll('.mm-option').forEach(function(el) {
    el.classList.remove('border-violet-600','bg-violet-50');
  });
  openModal('booking');
}

function selectMM(el, name) {
  selectedMM = name;
  document.querySelectorAll('.mm-option').forEach(function(e) {
    e.classList.remove('border-violet-600','bg-violet-50');
  });
  el.classList.add('border-violet-600','bg-violet-50');
}

async function simulatePayment() {
  if (!selectedMM) { alert('Veuillez selectionner un operateur Mobile Money'); return; }
  var phone = document.getElementById('mm-number').value;
  if (!phone) { alert('Veuillez entrer votre numero Mobile Money'); return; }

  // Step 2: processing
  var s1 = document.getElementById('pay-step-1');
  var s2 = document.getElementById('pay-step-2');
  s1.classList.remove('active');
  s1.classList.add('done');
  s2.classList.add('active');

  // Try API
  if (currentBookingTrip) {
    apiCall('POST', '/payments', {
      tripId: currentBookingTrip.id,
      operator: selectedMM,
      phoneNumber: phone
    });
  }

  setTimeout(function() {
    s2.classList.remove('active');
    s2.classList.add('done');
    document.getElementById('pay-step-3').classList.add('done');

    setTimeout(function() {
      document.getElementById('mm-selector').classList.add('hidden');
      document.getElementById('booking-success').classList.remove('hidden');
      if (currentBookingTrip) {
        document.getElementById('meeting-point').textContent =
          currentBookingTrip.waypoints + ' · ' + subtractMinutes(currentBookingTrip.time, 15);
      }
    }, 400);
  }, 2000);
}

function subtractMinutes(timeStr, mins) {
  var parts = timeStr.split(':').map(Number);
  var total = parts[0] * 60 + parts[1] - mins;
  var nh = Math.floor(total / 60);
  var nm = total % 60;
  return String(nh).padStart(2, '0') + 'h' + String(nm).padStart(2, '0');
}

// ── RATING ──────────────────────────────────────────────
function setRating(val) {
  currentRating = val;
  document.querySelectorAll('.rating-star').forEach(function(s, i) {
    s.classList.toggle('grayscale', i >= val);
  });
}

async function submitRating() {
  if (!currentRating) { alert('Veuillez selectionner une note'); return; }

  // Try API
  await apiCall('POST', '/ratings', {
    score: currentRating,
    comment: document.getElementById('rating-comment').value
  });

  closeModal('rating');
  setTimeout(function() {
    alert('Merci ! Votre note de ' + currentRating + '/5 a ete enregistree.');
  }, 300);
}
