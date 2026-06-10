// =========================
// SPIN VAR PLANT
// Firebase Script
// =========================

function checkFields(fields) {
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const input = document.getElementById(field.id);

        if (!input || !input.value.trim()) {
            alert(field.name + " is missing. Please fill it.");
            if (input) {
                input.focus();
            }
            return false;
        }
    }

    return true;
}

// =========================
// CACHE HELPERS
// =========================

function saveCache(key, data) {
    sessionStorage.setItem(key, JSON.stringify(data));
}

function getCache(key) {
    return JSON.parse(sessionStorage.getItem(key)) || [];
}

function showMarketItems(items) {
    const container = document.getElementById("marketItems");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = "<div class='post'><p>No items listed yet.</p></div>";
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="post">
            <h3>${item.itemName}</h3>
            <p>${item.description}</p>
            <strong>₹${item.price}</strong>
            <br><br>
            <small class="post-meta">Seller: ${item.seller}</small>
        </div>
    `).join("");
}

function showNews(items) {
    const container = document.getElementById("newsContainer");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = "<div class='post'><p>No news available.</p></div>";
        return;
    }

    container.innerHTML = items.map(news => `
        <div class="post">
            <h3>${news.title}</h3>
            <p>${news.content}</p>
        </div>
    `).join("");
}

// =========================
// FORUM
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

    await window.addDoc(
        window.collection(window.db, "threads"),
        {
            username,
            title,
            category,
            message,
            likes: 0,
            createdAt: window.serverTimestamp()
        }
    );

    alert("Thread Created!");
    window.location.href = "forum.html";
}

function loadThreads() {
    const container = document.getElementById("threads");
    if (!container) return;

    const cachedThreads = getCache("threadsCache");

    if (cachedThreads.length > 0) {
        showThreads(cachedThreads);
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

function showThreads(threads) {
    const container = document.getElementById("threads");
    if (!container) return;

    if (threads.length === 0) {
        container.innerHTML = "<div class='post'><p>No threads available.</p></div>";
        return;
    }

    container.innerHTML = threads.map(function(thread) {
        return `
            <div class="post">
                <small>${thread.category}</small>
                <h3>${thread.title}</h3>
                <p>${thread.message}</p>
                <small>Posted by ${thread.username}</small>

                <br><br>

                <button onclick="likeThread('${thread.id}')">
                    👍 Like (${thread.likes || 0})
                </button>
            </div>
        `;
    }).join("");
}

async function likeThread(id) {
    const threadRef = window.doc(window.db, "threads", id);

    await window.updateDoc(threadRef, {
        likes: window.increment(1)
    });
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
    setTimeout(function() {
        const box = document.getElementById("replies-" + id);
        if (!box) return;

        const q = window.query(
            window.collection(window.db, "threads", id, "replies"),
            window.orderBy("createdAt", "asc")
        );

        window.onSnapshot(q, function(snapshot) {
            let html = "<h4>Replies</h4>";

            if (snapshot.empty) {
                box.innerHTML = "";
                return;
            }

            snapshot.forEach(function(docItem) {
                const reply = docItem.data();

                html += `
                    <div class="reply">
                        <p>${reply.message}</p>
                        <small>Reply by ${reply.username}</small>
                    </div>
                `;
            });

            box.innerHTML = html;
        });
    }, 300);
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

}

function loadMarketplace() {
    const container = document.getElementById("marketItems");
    if (!container) return;

    const cachedItems = getCache("marketCache");

    if (cachedItems.length > 0) {
        showMarketItems(cachedItems);
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
    const isReady = checkFields([
        { id: "newsTitle", name: "News Title" },
        { id: "newsContent", name: "News Content" }
    ]);

    if (!isReady) return;

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

}

function loadNews() {
    const container = document.getElementById("newsContainer");
    if (!container) return;

    const cachedNews = getCache("newsCache");

    if (cachedNews.length > 0) {
        showNews(cachedNews);
    } else {
        container.innerHTML = "<p>Loading news...</p>";
    }

    const q = window.query(
        window.collection(window.db, "news"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(q, function(snapshot) {
        const news = [];

        snapshot.forEach(function(docItem) {
            news.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        saveCache("newsCache", news);
        showNews(news);
    });
}

// =========================
// PAGE LOAD
// =========================

async function preloadAllData() {
    if (!window.db) return;

    // preload forum threads
    const threadsQuery = window.query(
        window.collection(window.db, "threads"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(threadsQuery, function(snapshot) {
        const threads = [];
        snapshot.forEach(function(doc) {
            threads.push(doc.data());
        });
        sessionStorage.setItem("threadsCache", JSON.stringify(threads));
    });

    // preload marketplace items
    const marketQuery = window.query(
        window.collection(window.db, "marketplace"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(marketQuery, function(snapshot) {
        const items = [];
        snapshot.forEach(function(doc) {
            items.push(doc.data());
        });
        sessionStorage.setItem("marketCache", JSON.stringify(items));
    });

    // preload news
    const newsQuery = window.query(
        window.collection(window.db, "news"),
        window.orderBy("createdAt", "desc")
    );

    window.onSnapshot(newsQuery, function(snapshot) {
        const news = [];
        snapshot.forEach(function(doc) {
            news.push(doc.data());
        });
        sessionStorage.setItem("newsCache", JSON.stringify(news));
    });
}

document.addEventListener("DOMContentLoaded", function() {
    loadThreads();
    loadMarketplace();
    loadNews();
});
