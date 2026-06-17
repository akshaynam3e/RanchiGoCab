// ============================================================
//  RANCHIGOCAB — COMPLETE FIREBASE SCRIPT
//  Single file handles: index.html | login.html | admin.html
// ============================================================

import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc,
         onSnapshot, query, orderBy,
         serverTimestamp, deleteDoc, doc,
         getCountFromServer }                     from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBx3wvRzfJ4VszJ_jQTfWuzaW-BBBYHWlM",
  authDomain:        "ranchigocab-131b5.firebaseapp.com",
  projectId:         "ranchigocab-131b5",
  storageBucket:     "ranchigocab-131b5.firebasestorage.app",
  messagingSenderId: "29665999630",
  appId:             "1:29665999630:web:5b3c1706142cc8c170b55f",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAIL  = "akshaylaheri20@gmail.com";
const PHONE        = "+916280695945";
const WA_PHONE     = "916280695945";   // no +

// ── Utility: Generate a short booking code ───────────────────
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RGC-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Utility: Build WhatsApp message ─────────────────────────
function buildWAMsg(data) {
  const tripLabel = data.tripType === "round-trip"
    ? `${data.from} → ${data.to} → ${data.from} (Round Trip)`
    : `${data.from} → ${data.to} (One Way)`;

  return encodeURIComponent(
    `Hello RanchiGoCab! 🙏\n\n` +
    `I want to book a tour.\n` +
    `📍 Route: *${tripLabel}*\n` +
    `👥 Tourists: *${data.travelers} people*\n` +
    `📅 Travel Date: *${data.travelDate}*\n` +
    `📦 Package: *${data.packageName}*\n` +
    `💰 Package Price: *₹${data.price}*\n\n` +
    `🔑 Booking Code: *${data.code}*\n\n` +
    `Please confirm availability. Thank you!`
  );
}

// ── Route Detector ───────────────────────────────────────────
const PAGE = (() => {
  const path = window.location.pathname;
  if (path.includes("admin.html"))  return "admin";
  if (path.includes("login.html"))  return "login";
  return "index";
})();

if      (PAGE === "index") runPublicPage();
else if (PAGE === "login") runLoginPage();
else if (PAGE === "admin") runAdminPage();

// =============================================================
//  DEFAULT PACKAGE — Hardcoded, always visible
// =============================================================
const DEFAULT_PACKAGE = {
  id:          "default-netarhat",
  from:        "Ranchi",
  to:          "Netarhat",
  title:       "Ranchi to Netarhat – Queen of Chotanagpur",
  price:       8000,
  days:        3,
  nights:      2,
  description: "Escape the city and embrace nature. Explore the Queen of Chotanagpur with hotel stay, meals (Breakfast & Dinner), sightseeing as per itinerary, and all transfers & toll parking included.",
  stops:       ["Ranchi", "Sunset Point", "Sunrise Point", "Netarhat School", "Koel View Point", "Magnolia Point", "Netarhat"],
  highlights:  ["Queen of Chotanagpur", "Cool Climate & Scenic Views", "Family & Friends", "Bonfire on Request"],
  includes:    ["Pick-up & Drop (Ranchi)", "Hotel Stay (2 Nights)", "Meals (Breakfast & Dinner)", "Sightseeing as per Itinerary", "All Transfer & Toll Parking"],
  itinerary: [
    { day: 1, title: "Ranchi to Netarhat",          desc: "Departure from Ranchi. Sightseeing: Sunset Point." },
    { day: 2, title: "Netarhat Local Sightseeing",  desc: "Sunrise Point, Netarhat School, Koel View Point, Magnolia Point." },
    { day: 3, title: "Netarhat to Ranchi",          desc: "Check out after breakfast and drop back to Ranchi." },
  ],
  photos: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  ],
  isDefault:   true,
};

// =============================================================
//  PAGE 1 — PUBLIC INDEX
// =============================================================
function runPublicPage() {
  const grid  = document.getElementById("packages-grid");
  let currentPkg = null;

  function renderCard(id, pkg) {
    const thumb = (pkg.photos && pkg.photos[0]) ||
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80";

    const highlights = (pkg.highlights || []).slice(0, 4)
      .map(h => `<span class="highlight-tag">${h}</span>`).join("");

    const includesList = (pkg.includes || [])
      .map(i => `<li><i class="fa-solid fa-check"></i> ${i}</li>`).join("");

    const card = document.createElement("div");
    card.className = pkg.isDefault ? "pkg-card default-card" : "pkg-card";

    card.innerHTML = `
      <div class="pkg-card-img">
        <img src="${thumb}" alt="${pkg.title}" loading="lazy" />
        ${pkg.isDefault ? `<div class="badge-365"><i class="fa-solid fa-calendar-check"></i> Available 365 Days</div>` : ""}
        <div class="pkg-route-pill">${pkg.from} → ${pkg.to}</div>
        <div class="pkg-price-badge">₹${Number(pkg.price).toLocaleString("en-IN")}</div>
      </div>
      <div class="pkg-card-body">
        <h3>${pkg.title}</h3>
        <div class="pkg-meta">
          <span><i class="fa-regular fa-moon"></i> ${pkg.nights}N / ${pkg.days}D</span>
          <span><i class="fa-solid fa-map-pin"></i> ${(pkg.stops || []).length} stops</span>
          ${pkg.isDefault ? `<span class="always-open"><i class="fa-solid fa-circle" style="color:#22c55e;font-size:0.5rem"></i> Book Anytime</span>` : ""}
        </div>
        ${pkg.description ? `<p class="pkg-desc">${pkg.description}</p>` : ""}
        ${includesList ? `<ul class="card-includes">${includesList}</ul>` : ""}
        <div class="pkg-highlights">${highlights}</div>
        <button class="btn-view-pkg">View & Book <i class="fa-solid fa-arrow-right"></i></button>
      </div>`;

    card.querySelector(".btn-view-pkg").addEventListener("click", () => openModal(id, pkg));
    grid.appendChild(card);
  }

  // ── Step 1: Render default card immediately (no Firebase needed) ──
  grid.innerHTML = "";
  renderCard(DEFAULT_PACKAGE.id, DEFAULT_PACKAGE);

  // ── Step 2: Load extra packages from Firestore ────────────
  try {
    onSnapshot(
      query(collection(db, "packages"), orderBy("createdAt", "desc")),
      (snap) => {
        // Remove old Firebase cards, keep default
        grid.querySelectorAll(".pkg-card:not(.default-card)").forEach(c => c.remove());
        snap.forEach((d) => renderCard(d.id, d.data()));
      },
      (err) => console.warn("Firestore error:", err)
    );
  } catch(e) {
    console.warn("Firebase unavailable, showing default only.");
  }

  // ── Modal Logic ───────────────────────────────────────────
  const modal      = document.getElementById("booking-modal");
  const overlay    = document.getElementById("modal-overlay");
  const closeBtn   = document.getElementById("modal-close-btn");
  const heroImg    = document.getElementById("modal-hero-img");
  const routeBadge = document.getElementById("modal-route-badge");
  const durationBadge = document.getElementById("modal-duration-badge");
  const titleEl    = document.getElementById("modal-title");
  const priceEl    = document.getElementById("modal-price");
  const stopsWrap  = document.getElementById("stoppage-timeline");
  const galleryEl  = document.getElementById("gallery-strip");
  const bookingForm = document.getElementById("booking-form");
  const resultEl   = document.getElementById("booking-result");
  const displayCode = document.getElementById("display-code");
  const btnWA      = document.getElementById("btn-whatsapp");

  function openModal(id, pkg) {
    currentPkg = { id, ...pkg };

    // Hero image
    const mainPhoto = (pkg.photos && pkg.photos[0]) ||
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80";
    heroImg.style.backgroundImage = `
      linear-gradient(to top, rgba(11,61,46,0.7) 0%, transparent 55%),
      url('${mainPhoto}')`;

    routeBadge.textContent   = `${pkg.from} → ${pkg.to}`;
    durationBadge.textContent = `${pkg.nights} Nights / ${pkg.days} Days`;
    titleEl.textContent      = pkg.title;
    priceEl.textContent      = `₹${Number(pkg.price).toLocaleString("en-IN")} / Package`;

    // Stoppages timeline
    stopsWrap.innerHTML = "";
    (pkg.stops || []).forEach(stop => {
      stopsWrap.innerHTML += `
        <div class="stop-node">
          <div class="stop-dot-wrap">
            <div class="stop-dot"></div>
          </div>
          <span class="stop-name">${stop}</span>
        </div>`;
    });

    // Photo gallery
    galleryEl.innerHTML = "";
    (pkg.photos || []).forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = pkg.title;
      img.onclick = () => window.open(url, "_blank");
      galleryEl.appendChild(img);
    });

    // Package includes (default package only)
    let extraSection = document.getElementById("modal-extra");
    if (!extraSection) {
      extraSection = document.createElement("div");
      extraSection.id = "modal-extra";
      galleryEl.parentNode.insertBefore(extraSection, galleryEl.nextSibling);
    }
    extraSection.innerHTML = "";

    if (pkg.includes && pkg.includes.length) {
      extraSection.innerHTML += `
        <div class="modal-includes">
          <p class="stoppage-label"><i class="fa-solid fa-circle-check"></i> Package Includes</p>
          <ul class="includes-list">
            ${pkg.includes.map(i => `<li><i class="fa-solid fa-check"></i> ${i}</li>`).join("")}
          </ul>
        </div>`;
    }

    if (pkg.itinerary && pkg.itinerary.length) {
      extraSection.innerHTML += `
        <div class="modal-itinerary">
          <p class="stoppage-label"><i class="fa-solid fa-calendar-days"></i> Itinerary</p>
          ${pkg.itinerary.map(d => `
            <div class="itin-row">
              <div class="itin-day">Day ${d.day}</div>
              <div class="itin-detail"><strong>${d.title}</strong><br/><span>${d.desc}</span></div>
            </div>`).join("")}
        </div>`;
    }

    // Hidden fields
    document.getElementById("f-package-id").value   = id;
    document.getElementById("f-package-name").value = pkg.title;
    document.getElementById("f-from").value          = pkg.from;
    document.getElementById("f-to").value            = pkg.to;

    // Reset form & result
    bookingForm.reset();
    resultEl.classList.add("hidden");
    bookingForm.style.display = "flex";

    // Set min date to today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("f-date").min = today;

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // ── Booking Form Submit ───────────────────────────────────
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const travelers  = document.getElementById("f-travelers").value;
    const tripType   = document.getElementById("f-trip-type").value;
    const name       = document.getElementById("f-name").value.trim();
    const phone      = document.getElementById("f-phone").value.trim();
    const travelDate = document.getElementById("f-date").value;
    const code       = genCode();

    const payload = {
      code,
      packageId:   currentPkg.id,
      packageName: currentPkg.title,
      from:        currentPkg.from,
      to:          currentPkg.to,
      price:       currentPkg.price,
      travelers,
      tripType,
      name,
      phone,
      travelDate,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "booking_intents"), payload);
    } catch (err) {
      console.error("Firestore save failed:", err);
    }

    // Show code & action buttons
    displayCode.textContent = code;
    btnWA.href = `https://wa.me/${WA_PHONE}?text=${buildWAMsg(payload)}`;

    bookingForm.style.display = "none";
    resultEl.classList.remove("hidden");
  });
}

// =============================================================
//  PAGE 2 — LOGIN
// =============================================================
function runLoginPage() {
  const form     = document.getElementById("admin-login-form");
  const errorEl  = document.getElementById("auth-error");
  const submitBtn = form.querySelector(".btn-auth");
  let failCount  = 0;

  // Redirect if already logged in
  onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
      window.location.href = "admin.html";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (failCount >= 5) return;

    const email    = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    errorEl.classList.add("hidden");

    if (email !== ADMIN_EMAIL) {
      errorEl.textContent = "Access Denied: Unrecognized email.";
      errorEl.classList.remove("hidden");
      failCount++;
      return;
    }

    submitBtn.disabled   = true;
    submitBtn.textContent = "Verifying…";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "admin.html";
    } catch {
      failCount++;
      errorEl.textContent = failCount >= 5
        ? "Too many failed attempts. Refresh to try again."
        : "Invalid credentials. Please check your password.";
      errorEl.classList.remove("hidden");
      submitBtn.disabled   = failCount >= 5;
      submitBtn.textContent = "Verify Identity";
    }
  });
}

// =============================================================
//  PAGE 3 — ADMIN DASHBOARD
// =============================================================
function runAdminPage() {
  const shield = document.getElementById("admin-shield");

  onAuthStateChanged(auth, async (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
      await signOut(auth).catch(() => {});
      window.location.href = "login.html";
      return;
    }
    shield.style.display = "none";
    initDashboard();
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

async function initDashboard() {
  const createForm   = document.getElementById("create-package-form");
  const logsTbody    = document.getElementById("logs-tbody");
  const logSearch    = document.getElementById("log-search");
  const manageGrid   = document.getElementById("manage-packages-grid");
  const statPkgs     = document.getElementById("stat-packages");
  const statBookings = document.getElementById("stat-bookings");
  const statToday    = document.getElementById("stat-today");

  let allLogs = [];

  // ── Live Booking Logs ────────────────────────────────────
  onSnapshot(
    query(collection(db, "booking_intents"), orderBy("timestamp", "desc")),
    (snap) => {
      allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      statBookings.textContent = allLogs.length;

      // Count today's logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = allLogs.filter(l => {
        if (!l.timestamp) return false;
        return l.timestamp.toDate() >= today;
      }).length;
      statToday.textContent = todayCount;

      renderLogs(allLogs);
    }
  );

  function renderLogs(logs) {
    if (logs.length === 0) {
      logsTbody.innerHTML = `<tr><td colspan="8" class="table-empty">No booking intents yet.</td></tr>`;
      return;
    }
    logsTbody.innerHTML = logs.map(l => {
      const timeStr = l.timestamp
        ? l.timestamp.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "Just Now";
      const dateStr = l.travelDate || "–";
      const trip = l.tripType === "round-trip" ? "↔ Round" : "→ One Way";
      return `
        <tr>
          <td><span class="code-cell">${l.code || "–"}</span></td>
          <td>${l.from || "–"} → ${l.to || "–"}</td>
          <td>${l.name || "–"}</td>
          <td>${l.phone || "–"}</td>
          <td>${l.travelers || "–"}</td>
          <td>${trip}</td>
          <td>${dateStr}</td>
          <td>${timeStr}</td>
        </tr>`;
    }).join("");
  }

  // Live search filter
  logSearch.addEventListener("input", () => {
    const q = logSearch.value.toLowerCase();
    const filtered = allLogs.filter(l =>
      (l.code       || "").toLowerCase().includes(q) ||
      (l.name       || "").toLowerCase().includes(q) ||
      (l.phone      || "").toLowerCase().includes(q) ||
      (l.packageName|| "").toLowerCase().includes(q)
    );
    renderLogs(filtered);
  });

  // ── Live Package List ────────────────────────────────────
  onSnapshot(
    query(collection(db, "packages"), orderBy("createdAt", "desc")),
    (snap) => {
      statPkgs.textContent = snap.size;
      manageGrid.innerHTML = "";

      if (snap.empty) {
        manageGrid.innerHTML = `<p class="table-empty">No packages yet. Create one!</p>`;
        return;
      }

      snap.forEach(d => {
        const pkg   = d.data();
        const thumb = (pkg.photos && pkg.photos[0]) ||
          "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&q=60";

        const card = document.createElement("div");
        card.className = "manage-card";
        card.innerHTML = `
          <div class="manage-card-img" style="background-image:url('${thumb}')"></div>
          <div class="manage-card-body">
            <h4>${pkg.title}</h4>
            <p>${pkg.from} → ${pkg.to} &nbsp;|&nbsp; ₹${Number(pkg.price).toLocaleString("en-IN")} &nbsp;|&nbsp; ${pkg.nights}N/${pkg.days}D</p>
          </div>
          <div class="manage-card-actions">
            <button class="btn-delete" data-id="${d.id}">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>`;

        card.querySelector(".btn-delete").addEventListener("click", async () => {
          if (!confirm(`Delete "${pkg.title}"? This cannot be undone.`)) return;
          try {
            await deleteDoc(doc(db, "packages", d.id));
          } catch (err) {
            alert("Failed to delete. Check Firestore rules.");
          }
        });

        manageGrid.appendChild(card);
      });
    }
  );

  // ── Create Package Form ──────────────────────────────────
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const photos = document.getElementById("p-photos").value
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0)
      .slice(0, 5);

    const highlights = document.getElementById("p-highlights").value
      .split(",")
      .map(h => h.trim())
      .filter(h => h.length > 0);

    const stops = document.getElementById("p-stops").value
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      from:        document.getElementById("p-from").value.trim(),
      to:          document.getElementById("p-to").value.trim(),
      title:       document.getElementById("p-title").value.trim(),
      price:       parseFloat(document.getElementById("p-price").value),
      days:        parseInt(document.getElementById("p-days").value),
      nights:      parseInt(document.getElementById("p-nights").value),
      stops,
      photos,
      highlights,
      description: document.getElementById("p-desc").value.trim(),
      createdAt:   serverTimestamp(),
    };

    const btn = createForm.querySelector(".btn-publish");
    btn.disabled   = true;
    btn.innerHTML  = `<i class="fa-solid fa-spinner fa-spin"></i> Publishing…`;

    try {
      await addDoc(collection(db, "packages"), payload);
      createForm.reset();
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Published!`;
      setTimeout(() => {
        btn.disabled  = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Publish Package`;
      }, 2500);
    } catch (err) {
      alert("Failed to publish. Check your Firestore rules.");
      btn.disabled  = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Publish Package`;
    }
  });
}
