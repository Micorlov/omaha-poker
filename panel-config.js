// Shared Firebase bootstrap and helpers for the two pages added alongside
// public/admin.html: push.html (the push center) and stats.html (the
// dashboard).
//
// admin.html predates this file and still carries its own copy of the same
// config inline. That duplication is deliberate for now — admin.html works
// and is in production, and rewriting it to depend on this file would put a
// live page at risk for a cosmetic gain. If you do migrate it later, the
// config object below is the one to keep.
//
// On the apiKey being public: a Firebase web apiKey is an identifier, not a
// secret — it ships inside every web app and inside the Android APK. What
// actually protects the data is firestore.rules, which restricts every read
// and write on these pages to adminEmail below. Change that address and the
// rules file together, or the panel will sign in fine and then fail every
// read.

var OMAHA_PANEL = {
    firebaseConfig: {
        apiKey: 'AIzaSyCLv54ToWnFQTvKr12RejNP0gXSSvFsCwo',
        authDomain: 'omaha-poker-bb153.firebaseapp.com',
        projectId: 'omaha-poker-bb153',
        storageBucket: 'omaha-poker-bb153.firebasestorage.app',
        messagingSenderId: '752060069518',
        appId: '1:752060069518:web:b81d5aa6d7fa615ce2fbdf'
    },

    // Must match the address hard-coded in firestore.rules.
    adminEmail: 'micorlov@gmail.com',

    // "Run poll now" links here, so a queued campaign can be delivered
    // without waiting for the next scheduled pass.
    pollWorkflowUrl:
        'https://github.com/Micorlov/omaha_poker/actions/workflows/push-poll.yml',

    collections: {
        installs: 'installs',
        campaigns: 'pushCampaigns',
        logs: 'pushLogs',
        pushSettings: 'config/pushSettings',
        featureFlags: 'config/featureFlags',
        cursor: 'system/pushCursor'
    }
};

/// True while config.js still holds the shipped placeholders. Both pages
/// check this and show a setup banner instead of a wall of permission
/// errors, which is what an unconfigured Firebase call actually produces.
OMAHA_PANEL.isConfigured = function () {
    return OMAHA_PANEL.firebaseConfig.projectId.indexOf('REPLACE_WITH') !== 0;
};

/// Brings Firebase up and returns { auth, db }. Called by each page once.
OMAHA_PANEL.init = function () {
    firebase.initializeApp(OMAHA_PANEL.firebaseConfig);
    return { auth: firebase.auth(), db: firebase.firestore() };
};

/// Standard Google sign-in gate shared by both pages. `onReady` runs once
/// with the signed-in admin user; anyone else is signed straight back out.
OMAHA_PANEL.gate = function (auth, onReady) {
    var gateEl = document.getElementById('auth-gate');
    var appEl = document.getElementById('app');

    window.doSignIn = function () {
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .catch(function (err) { console.error('sign-in:', err); });
    };

    auth.onAuthStateChanged(function (user) {
        if (!user) {
            gateEl.style.display = 'flex';
            appEl.classList.remove('visible');
            return;
        }
        if (user.email !== OMAHA_PANEL.adminEmail) {
            document.getElementById('denied-msg').style.display = 'block';
            appEl.classList.remove('visible');
            auth.signOut();
            return;
        }
        gateEl.style.display = 'none';
        appEl.classList.add('visible');
        var who = document.getElementById('who');
        if (who) who.textContent = user.email;
        onReady(user);
    });
};

/// Small shared helpers, kept here so the two pages stay consistent.

OMAHA_PANEL.toast = function (message, isError) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast show' + (isError ? ' err' : '');
    setTimeout(function () {
        el.className = 'toast' + (isError ? ' err' : '');
    }, 2600);
};

OMAHA_PANEL.cell = function (text, color) {
    var td = document.createElement('td');
    td.textContent = text;
    if (color) td.style.color = color;
    return td;
};

/// UTC YYYY-MM-DD, `days` ago. The same shape BackendService writes into
/// users/{uid}.lastPlayedDate, so the two can be string-compared directly.
OMAHA_PANEL.dayKeyDaysAgo = function (days) {
    var d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
};

OMAHA_PANEL.num = function (value) {
    return (value || 0).toLocaleString();
};

/// Renders a list of { label, value } into horizontal bars, widest first.
/// Shared by every distribution panel on the dashboard.
OMAHA_PANEL.renderBars = function (containerId, rows, formatValue) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!rows.length) {
        container.innerHTML = '<div class="empty-state">No data yet</div>';
        return;
    }
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0) || 1;
    rows.forEach(function (row) {
        var el = document.createElement('div');
        el.className = 'bar-row';
        el.innerHTML =
            '<div class="bar-label"></div>' +
            '<div class="bar-track"><div class="bar-fill"></div></div>' +
            '<div class="bar-value"></div>';
        el.children[0].textContent = row.label;
        el.children[1].firstChild.style.width =
            Math.max(2, (row.value / max) * 100) + '%';
        el.children[2].textContent = formatValue
            ? formatValue(row.value)
            : OMAHA_PANEL.num(row.value);
        container.appendChild(el);
    });
};
