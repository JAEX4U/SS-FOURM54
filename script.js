// =========================
// SPIN VAR PLANT
// Main Script
// =========================

// IMPORTANT: Change this to your real admin email.
const ADMIN_EMAIL = "your@email.com";

// =========================
// HELPERS
// =========================

function waitForFirebase(callback) {
    if (window.firebaseReady && window.db && window.auth) {
        callback();
        return;
    }

    window.addEventListener("firebase-ready", callback, { once: true });
}

function isAdminUser() {
    return (
        window.auth &&
        window.auth.currentUser &&
        window.auth.currentUser.email === ADMIN_EMAIL &&
        window.auth.currentUser.emailVerified
    );
}

function updateAdminUI() {
    const adminLink = document.getElementById("adminLink");
    const adminOnly = document.querySelectorAll(".admin-only");

    if (adminLink) {
        adminLink.style.display = isAdminUser() ? "inline-block" : "none";
    }

    adminOnly.forEach(function(el) {
        el.style.display = isAdminUser() ? "inline-block" : "none";
    });
}

function checkFields(fields) {
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const input = document.getElementById(field.id);

        if (!input || !input.value.trim()) {
            alert(field.name + " is missing. Please fill it.");
            if (input) input.focus();
            return false;
        }
    }

    return true;
}

function saveCache(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
}

function getCache(key) {
    try {
        return JSON.parse(sessionStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function formatDate(createdAt) {
    if (!createdAt || !createdAt.seconds) return "Just now";

    return new Date(createdAt.seconds * 1000).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

// =========================
// AUTH
// =========================

async function signupUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const userCredential = await window.createUserWithEmailAndPassword(
            window.auth,
            email,
            password
        );

        await window.sendEmailVerification(userCredential.user);

        alert("Account created. Please verify your email before login.");
    } catch (error) {
        alert(error.message);
    }
}

async function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const userCredential = await window.signInWithEmailAndPassword(
            window.auth,
            email,
            password
        );

        if (!userCredential.user.emailVerified) {
            alert("Please verify your email first.");
            await window.signOut(window.auth);
            return;
        }

        alert("Login successful!");

        if (userCredential.user.email === ADMIN_EMAIL) {
            window.location.href = "admin.html";
        } else {
            window.location.href = "index.html";
        }
    } catch (error) {
        alert(error.message);
    }
}

async function logoutUser() {
    await window.signOut(window.auth);
    alert("Logged out.");
    window.location.href = "login.html";
}

function protectAdminPage() {
    if (!window.location.pathname.includes("admin.html")) return;

    window.onAuthStateChanged(window.auth, function(user) {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        if (!user.emailVerified) {
            alert("Verify your email first.");
            window.location.href = "login.html";
            return;
        }

        if (user.email !== ADMIN_EMAIL) {
            alert("Access denied.");
            window.location.href = "index.html";
        }
    });
}

// =========================
// THREADS / FORUM
// =========================

async function createThread() {
    const username = document.getElementById("username").value.trim();
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const message = document.getElementById("message").value.trim();

    if (!username || !title || !category || !message) {
        alert("Please fill all fields.");
        return;
    }

    try {
        await window.addDoc(
            window.collection(window.db, "threads"),
            {
                username,
                title,
                category,
                message,
                likes: 0,
                pinned: false,
                createdAt: window.serverTimestamp()
            }
        );

        alert("Thread Created!");
        window.location.href = "forum.html";
    } catch (error) {
        alert(error.message);
    }
}

function showThreads(threads) {
    const container = document.getElementById("threads");
    if (!container) return;

    if (!threads || threads.length === 0) {
        container.innerHTML = "<div class='post'><p>No threads available.</p></div>";
        return;
    }

    threads.sort(function(a, b) {
        if ((a.pinned || false) !== (b.pinned || false)) {
            return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        }

        const aTime = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        const bTime = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return bTime - aTime;
    });

    container.innerHTML = threads.map(function(thread) {
        const postDate = formatDate(thread.createdAt);

        return `
            <div class="post">
                ${thread.pinned ? `<div class="pinned-badge">📌 PINNED THREAD</div>` : ""}

                <small>${thread.category || "General"}</small>

                <h3>${thread.title || ""}</h3>

                <p>${thread.message || ""}</p>

                <small class="post-meta">
                    Posted by ${thread.username || "Unknown"} | ${postDate}
                </small>

                <br><br>

                <button onclick="likeThread('${thread.id}')">
                    👍 Like (${thread.likes || 0})
                </button>

                ${isAdminUser() ? `
                    <button onclick="pinThread('${thread.id}', ${thread.pinned || false})">
                        📌 ${thread.pinned ? "UNPIN" : "PIN"}
                    </button>

                    <button onclick="deleteThread('${thread.id}')">
                        🗑 DELETE THREAD
                    </button>
                ` : ""}

                <br><br>

                <input id="replyName-${thread.id}" placeholder="Your Name">
                <textarea id="replyText-${thread.id}" rows="3" placeholder="Write a reply..."></textarea>

                <button onclick="replyThread('${thread.id}')">Reply</button>

                <div id="replies-${thread.id}"></div>
            </div>
        `;
    }).join("");

    threads.forEach(function(thread) {
        loadReplies(thread.id);
    });
}

function loadThreads() {
    const container = document.getElementById("threads");
    if (!container) return;

    const cached = getCache("threadsCache");

    if (cached.length > 0) {
        showThreads(cached);
    } else {
        container.innerHTML = "<p>Loading threads...</p>";
    }

    const q = window.query(
        window.collection(window.db, "threads"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(q, function(snapshot) {
        const threads = [];

        snapshot.forEach(function(docItem) {
            threads.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        saveCache("threadsCache", threads);
        showThreads(threads);
    });
}

async function likeThread(id) {
    const threadRef = window.doc(window.db, "threads", id);

    await window.updateDoc(threadRef, {
        likes: window.increment(1)
    });
}

async function pinThread(id, currentState) {
    if (!isAdminUser()) {
        alert("Admin only.");
        return;
    }

    await window.updateDoc(
        window.doc(window.db, "threads", id),
        {
            pinned: !currentState
        }
    );
}

async function replyThread(id) {
    const name = document.getElementById("replyName-" + id).value.trim();
    const text = document.getElementById("replyText-" + id).value.trim();

    if (!name || !text) {
        alert("Please fill reply name and message.");
        return;
    }

    await window.addDoc(
        window.collection(window.db, "threads", id, "replies"),
        {
            username: name,
            message: text,
            createdAt: window.serverTimestamp()
        }
    );

    document.getElementById("replyName-" + id).value = "";
    document.getElementById("replyText-" + id).value = "";
}

function loadReplies(id) {
    const box = document.getElementById("replies-" + id);
    if (!box) return;

    const q = window.query(
        window.collection(window.db, "threads", id, "replies"),
        window.orderBy("createdAt", "asc")
    );

    window.onSnapshot(q, function(snapshot) {
        if (snapshot.empty) {
            box.innerHTML = "";
            return;
        }

        let html = "<h4>Replies</h4>";

        snapshot.forEach(function(docItem) {
            const reply = docItem.data();

            html += `
                <div class="reply">
                    <p>${reply.message || ""}</p>
                    <small>Reply by ${reply.username || "Unknown"}</small>
                </div>
            `;
        });

        box.innerHTML = html;
    });
}

// =========================
// MARKETPLACE
// =========================

async function createListing() {
    const isReady = checkFields([
        { id: "seller", name: "Seller Name" },
        { id: "itemName", name: "Item Name" },
        { id: "price", name: "Price" },
        { id: "description", name: "Description" }
    ]);

    if (!isReady) return;

    try {
        await window.addDoc(
            window.collection(window.db, "marketplace"),
            {
                seller: document.getElementById("seller").value.trim(),
                itemName: document.getElementById("itemName").value.trim(),
                price: document.getElementById("price").value.trim(),
                description: document.getElementById("description").value.trim(),
                createdAt: window.serverTimestamp()
            }
        );

        alert("Item Listed!");
        window.location.href = "market.html";
    } catch (error) {
        alert(error.message);
    }
}

function showMarketItems(items) {
    const container = document.getElementById("marketItems");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = "<div class='post'><p>No items listed yet.</p></div>";
        return;
    }

    container.innerHTML = items.map(function(item) {
        return `
            <div class="post">
                <h3>${item.itemName || ""}</h3>
                <p>${item.description || ""}</p>
                <strong>₹${item.price || ""}</strong>
                <br><br>
                <small class="post-meta">Seller: ${item.seller || "Unknown"}</small>

                <br><br>

                ${isAdminUser() ? `
                    <button onclick="deleteListing('${item.id}')">
                        🗑 DELETE ITEM
                    </button>
                ` : ""}
            </div>
        `;
    }).join("");
}

function loadMarketplace() {
    const container = document.getElementById("marketItems");
    if (!container) return;

    const cached = getCache("marketCache");

    if (cached.length > 0) {
        showMarketItems(cached);
    } else {
        container.innerHTML = "<p>Loading marketplace...</p>";
    }

    const q = window.query(
        window.collection(window.db, "marketplace"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(q, function(snapshot) {
        const items = [];

        snapshot.forEach(function(docItem) {
            items.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        saveCache("marketCache", items);
        showMarketItems(items);
    });
}

// =========================
// NEWS
// =========================

async function createNews() {
    if (!isAdminUser()) {
        alert("Admin only.");
        return;
    }

    const isReady = checkFields([
        { id: "newsTitle", name: "News Title" },
        { id: "newsContent", name: "News Content" }
    ]);

    if (!isReady) return;

    try {
        await window.addDoc(
            window.collection(window.db, "news"),
            {
                title: document.getElementById("newsTitle").value.trim(),
                content: document.getElementById("newsContent").value.trim(),
                createdAt: window.serverTimestamp()
            }
        );

        alert("News Published!");
        window.location.href = "news.html";
    } catch (error) {
        alert(error.message);
    }
}

function showNews(items) {
    const container = document.getElementById("newsContainer");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = "<div class='post'><p>No news available.</p></div>";
        return;
    }

    container.innerHTML = items.map(function(news) {
        return `
            <div class="post">
                <h3>${news.title || ""}</h3>
                <p>${news.content || ""}</p>

                ${isAdminUser() ? `
                    <button onclick="deleteNews('${news.id}')">
                        🗑 DELETE NEWS
                    </button>
                ` : ""}
            </div>
        `;
    }).join("");
}

function loadNews() {
    const container = document.getElementById("newsContainer");
    if (!container) return;

    const cached = getCache("newsCache");

    if (cached.length > 0) {
        showNews(cached);
    } else {
        container.innerHTML = "<p>Loading news...</p>";
    }

    const q = window.query(
        window.collection(window.db, "news"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(q, function(snapshot) {
        const items = [];

        snapshot.forEach(function(docItem) {
            items.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        saveCache("newsCache", items);
        showNews(items);
    });
}

// =========================
// DELETE FUNCTIONS
// =========================

async function deleteThread(id) {
    if (!isAdminUser()) {
        alert("Admin only.");
        return;
    }

    if (!confirm("Delete this thread?")) return;

    await window.deleteDoc(
        window.doc(window.db, "threads", id)
    );

    alert("Thread deleted.");
}

async function deleteListing(id) {
    if (!isAdminUser()) {
        alert("Admin only.");
        return;
    }

    if (!confirm("Delete this item?")) return;

    await window.deleteDoc(
        window.doc(window.db, "marketplace", id)
    );

    alert("Item deleted.");
}

async function deleteNews(id) {
    if (!isAdminUser()) {
        alert("Admin only.");
        return;
    }

    if (!confirm("Delete this news?")) return;

    await window.deleteDoc(
        window.doc(window.db, "news", id)
    );

    alert("News deleted.");
}

// =========================
// PRELOAD DATA
// =========================

function preloadAllData() {
    if (!window.db) return;

    const collections = [
        { name: "threads", cache: "threadsCache" },
        { name: "marketplace", cache: "marketCache" },
        { name: "news", cache: "newsCache" }
    ];

    collections.forEach(function(item) {
        const q = window.query(
            window.collection(window.db, item.name),
            window.orderBy("createdAt", "desc")
        );

        window.onSnapshot(q, function(snapshot) {
            const data = [];

            snapshot.forEach(function(docItem) {
                data.push({
                    id: docItem.id,
                    ...docItem.data()
                });
            });

            saveCache(item.cache, data);
        });
    });
}

// =========================
// GLOBAL FUNCTIONS
// =========================

window.signupUser = signupUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;

window.createThread = createThread;
window.likeThread = likeThread;
window.pinThread = pinThread;
window.replyThread = replyThread;

window.createListing = createListing;
window.createNews = createNews;

window.deleteThread = deleteThread;
window.deleteListing = deleteListing;
window.deleteNews = deleteNews;

// =========================
// PAGE LOAD
// =========================

waitForFirebase(function() {
    window.onAuthStateChanged(window.auth, function() {
        updateAdminUI();
        protectAdminPage();

        loadThreads();
        loadMarketplace();
        loadNews();
        preloadAllData();
    });
});
