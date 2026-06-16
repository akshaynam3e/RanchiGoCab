import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBx3wvRzfJ4VszJ_jQTfWuzaW-BBBYHWlM",
  authDomain: "ranchigocab-131b5.firebaseapp.com",
  projectId: "ranchigocab-131b5",
  storageBucket: "ranchigocab-131b5.firebasestorage.app",
  messagingSenderId: "29665999630",
  appId: "1:29665999630:web:5b3c1706142cc8c170b55f",
  measurementId: "G-ECG8KBG2HE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const AUTHORIZED_EMAIL = "akshaylaheri20@gmail.com";
const targetPhoneNumber = "+916280695945";
let currentActivePackage = null;

// DOM Detections
const packagesGrid = document.getElementById('packages-grid');
const adminLoginForm = document.getElementById('admin-login-form');
const shieldOverlay = document.getElementById('admin-shield-overlay');

// Global Route Router
if (packagesGrid) {
    listenToTourPackages();
    setupModalEvents();
} else if (adminLoginForm) {
    runLoginController();
} else if (shieldOverlay) {
    runDashboardSecurityController();
}

// ============================================
// PAGE ARCHITECTURE: 1. LOGIN PROCESSING
// ============================================
function runLoginController() {
    const errorMsg = document.getElementById('auth-error-msg');
    
    // Redirect out immediately if already authenticated
    onAuthStateChanged(auth, (user) => {
        if (user && user.email === AUTHORIZED_EMAIL) {
            window.location.href = 'admin.html';
        }
    });

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        errorMsg.classList.add('hidden');

        if (email !== AUTHORIZED_EMAIL) {
            errorMsg.innerText = "Access Denied: Email mismatch error.";
            errorMsg.classList.remove('hidden');
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then(() => window.location.href = 'admin.html')
            .catch(() => {
                errorMsg.innerText = "Invalid credentials. Please verify your admin password.";
                errorMsg.classList.remove('hidden');
            });
    });
}

// ============================================
// PAGE ARCHITECTURE: 2. DASHBOARD PROTECTION
// ============================================
function runDashboardSecurityController() {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== AUTHORIZED_EMAIL) {
            // Kick out instantly if credentials fail or don't exist
            signOut(auth).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            // Safe. Drop the overlay blocker and expose controls
            shieldOverlay.style.display = 'none';
            executeDashboardLogic();
        }
    });

    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'login.html');
    });
}

function executeDashboardLogic() {
    const addPackageForm = document.getElementById('add-package-form');
    const logsTbody = document.getElementById('logs-tbody');

    if (addPackageForm) {
        addPackageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('admin-title').value;
            const price = document.getElementById('admin-price').value;
            const duration = document.getElementById('admin-duration').value;
            const stopsArray = document.getElementById('admin-stops').value.split(',').map(s => s.trim()).filter(s => s !== "");
            const image = document.getElementById('admin-image').value;

            try {
                await addDoc(collection(db, "packages"), {
                    title, price: parseFloat(price), duration, stops: stopsArray, image, createdAt: serverTimestamp()
                });
                alert("Tour Package Published!");
                addPackageForm.reset();
            } catch (err) {
                alert("Failed to create package.");
            }
        });
    }

    if (logsTbody) {
        onSnapshot(query(collection(db, "booking_intents"), orderBy("timestamp", "desc")), (snapshot) => {
            logsTbody.innerHTML = "";
            if (snapshot.empty) {
                logsTbody.innerHTML = `<tr><td colspan="5" class="text-center">No active booking requests yet.</td></tr>`;
                return;
            }
            snapshot.forEach((doc) => {
                const log = doc.data();
                const dateStr = log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString() : 'Just Now';
                logsTbody.innerHTML += `
                    <tr>
                        <td><strong>${dateStr}</strong></td>
                        <td>${log.package}</td>
                        <td>${log.travelers}</td>
                        <td>${log.rideType}</td>
                        <td>${log.parking}</td>
                    </tr>`;
            });
        });
    }
}

// ============================================
// PAGE ARCHITECTURE: 3. PUBLIC FRONTEND HOME
// ============================================
function listenToTourPackages() {
    onSnapshot(query(collection(db, "packages"), orderBy("createdAt", "desc")), (snapshot) => {
        packagesGrid.innerHTML = snapshot.empty ? `<p class="loading">No tour packages available right now.</p>` : "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'package-card';
            const imageUrl = data.image || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80";
            
            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${imageUrl}" alt="${data.title}">
                    <div class="card-price-badge">₹${data.price}/Pkg</div>
                </div>
                <div class="card-content">
                    <h3>${data.title}</h3>
                    <div class="card-duration"><i class="fa-regular fa-clock"></i> ${data.duration}</div>
                    <button class="btn-book">View Package</button>
                </div>`;
            card.querySelector('.btn-book').addEventListener('click', () => openBookingEngine(data));
            packagesGrid.appendChild(card);
        });
    });
}

function openBookingEngine(packageData) {
    currentActivePackage = packageData;
    document.getElementById('modal-package-title').innerText = packageData.title;
    document.getElementById('form-package-name').value = packageData.title;
    
    const routeContainer = document.getElementById('modal-route-line');
    routeContainer.innerHTML = "";
    if (packageData.stops) {
        packageData.stops.forEach((stop) => {
            routeContainer.innerHTML += `<div class="route-stop"><div class="stop-dot"></div><span class="stop-name">${stop}</span></div>`;
        });
    }
    document.getElementById('action-buttons-container').classList.add('hidden');
    document.getElementById('booking-form').reset();
    document.getElementById('booking-modal').style.display = "flex";
}

function setupModalEvents() {
    document.querySelector('.close-btn').addEventListener('click', () => { document.getElementById('booking-modal').style.display = "none"; });
    document.getElementById('booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const travelers = document.getElementById('passenger-count').value;
        const type = document.getElementById('ride-type').value;
        const parking = document.getElementById('parking-option').value;
        const pkgName = currentActivePackage.title;

        const whatsappTemplate = `Hello RanchiGoCab! I am looking to book the package: *${pkgName}*.\n\n• *Travelers*: ${travelers} Persons\n• *Ride Type*: ${type}\n• *Parking Mode*: ${parking}`;
        document.getElementById('whatsapp-btn').href = `https://wa.me/${targetPhoneNumber}?text=${encodeURIComponent(whatsappTemplate)}`;
        document.getElementById('call-btn').href = `tel:${targetPhoneNumber}`;

        document.getElementById('action-buttons-container').classList.remove('hidden');
        addDoc(collection(db, "booking_intents"), { package: pkgName, travelers, rideType: type, parking, timestamp: serverTimestamp() });
    });
}
