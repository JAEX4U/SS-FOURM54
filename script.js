const ADMIN_EMAILS = ["your@email.com"];
let allThreadsCache = [];

function waitForFirebase(cb){
  if(window.firebaseReady && window.db && window.auth){ cb(); return; }
  window.addEventListener("firebase-ready", cb, {once:true});
}
function cleanEmail(email){ return String(email || "").toLowerCase().trim(); }
function isAdminUser(){
  const user = window.auth && window.auth.currentUser;
  if(!user || !user.emailVerified) return false;
  return ADMIN_EMAILS.map(cleanEmail).includes(cleanEmail(user.email));
}
function getParam(name){ return new URLSearchParams(window.location.search).get(name); }
function saveCache(key,data){ try{ sessionStorage.setItem(key, JSON.stringify(data)); }catch(e){} }
function getCache(key){ try{ return JSON.parse(sessionStorage.getItem(key)) || []; }catch(e){ return []; } }
function formatDate(createdAt){
  if(!createdAt || !createdAt.seconds) return "Just now";
  return new Date(createdAt.seconds * 1000).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function checkFields(fields){
  for(let i=0;i<fields.length;i++){
    const input = document.getElementById(fields[i].id);
    if(!input || !input.value.trim()){
      alert(fields[i].name + " is missing. Please fill it.");
      if(input) input.focus();
      return false;
    }
  }
  return true;
}
function updateAdminUI(){
  const adminLink = document.getElementById("adminLink");
  const adminOnly = document.querySelectorAll(".admin-only");
  if(adminLink) adminLink.style.display = isAdminUser() ? "inline-block" : "none";
  adminOnly.forEach(el => el.style.display = isAdminUser() ? "inline-block" : "none");
}
function loadHeaderUser(){
  const userName = document.getElementById("userName");
  const userInitial = document.getElementById("userInitial");
  const userRole = document.getElementById("userRole");
  if(!userName || !userInitial || !userRole) return;
  const user = window.auth.currentUser;
  if(!user){
    userName.textContent = "GUEST"; userInitial.textContent = "?"; userRole.textContent = "MEMBER"; return;
  }
  const name = user.email.split("@")[0];
  userName.textContent = name.toUpperCase();
  userInitial.textContent = name[0].toUpperCase();
  userRole.textContent = isAdminUser() ? "ADMIN" : "NEWBIE";
}

async function signupUser(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try{
    const userCredential = await window.createUserWithEmailAndPassword(window.auth,email,password);
    await window.sendEmailVerification(userCredential.user);
    alert("Account created. Please verify your email before login.");
  }catch(error){ alert(error.message); }
}
async function loginUser(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try{
    const userCredential = await window.signInWithEmailAndPassword(window.auth,email,password);
    if(!userCredential.user.emailVerified){
      alert("Please verify your email first.");
      await window.signOut(window.auth);
      return;
    }
    alert("Login successful!");
    window.location.href = isAdminUser() ? "admin.html" : "index.html";
  }catch(error){ alert(error.message); }
}
async function logoutUser(){ await window.signOut(window.auth); alert("Logged out."); window.location.href="login.html"; }
function protectAdminPage(){
  if(!window.location.pathname.includes("admin.html")) return;
  const user = window.auth.currentUser;
  if(!user){ window.location.href="login.html"; return; }
  if(!user.emailVerified || !isAdminUser()){ alert("Access denied."); window.location.href="index.html"; }
}

async function createThread(){
  const username=document.getElementById("username").value.trim();
  const title=document.getElementById("title").value.trim();
  const category=document.getElementById("category").value;
  const message=document.getElementById("message").value.trim();
  if(!username || !title || !category || !message){ alert("Please fill all fields."); return; }
  try{
    const docRef = await window.addDoc(window.collection(window.db,"threads"),{username,title,category,message,likes:0,pinned:false,replyCount:0,createdAt:window.serverTimestamp()});
    alert("Thread Created!");
    window.location.href="thread.html?id="+docRef.id;
  }catch(error){ alert(error.message); }
}
function sortThreads(threads){
  threads.sort((a,b)=>{
    if((a.pinned||false)!==(b.pinned||false)) return (b.pinned?1:0)-(a.pinned?1:0);
    const at=a.createdAt&&a.createdAt.seconds?a.createdAt.seconds:0;
    const bt=b.createdAt&&b.createdAt.seconds?b.createdAt.seconds:0;
    return bt-at;
  });
  return threads;
}
function renderThreadRow(thread){
  return `<a class="thread-row clickable-row" href="thread.html?id=${thread.id}">
    <div class="row-icon">${thread.pinned ? "📌" : "📄"}</div>
    <div class="row-main"><h3>${thread.title || "Untitled Thread"}</h3><p>Started by ${thread.username || "Unknown"} • ${formatDate(thread.createdAt)}</p></div>
    <div class="row-side"><p>${thread.replyCount || 0} replies</p><p>${thread.category || "General"}</p></div>
  </a>`;
}
function showThreads(threads){
  const c=document.getElementById("threads"); if(!c) return;
  if(!threads || threads.length===0){ c.innerHTML="<div class='post'><p>No threads available.</p></div>"; return; }
  allThreadsCache=threads;
  c.innerHTML=threads.map(thread=>`<div class="post thread-card">
    ${thread.pinned?`<div class="pinned-badge">📌 PINNED THREAD</div>`:""}
    <a href="thread.html?id=${thread.id}" class="thread-title-link"><h3>${thread.title||""}</h3></a>
    <small>${thread.category || "General"}</small>
    <p>${thread.message || ""}</p>
    <small class="post-meta">Posted by ${thread.username || "Unknown"} | ${formatDate(thread.createdAt)}</small><br><br>
    <button onclick="likeThread('${thread.id}')">👍 Like (${thread.likes || 0})</button>
    <a href="thread.html?id=${thread.id}" class="card-btn small-btn">OPEN THREAD</a>
    ${isAdminUser()?`<button onclick="pinThread('${thread.id}', ${thread.pinned || false})">📌 ${thread.pinned?"UNPIN":"PIN"}</button><button onclick="deleteThread('${thread.id}')">🗑 DELETE THREAD</button>`:""}
  </div>`).join("");
}
function filterThreads(){
  const s=document.getElementById("threadSearch");
  const cat=document.getElementById("threadCategoryFilter");
  let filtered=[...allThreadsCache];
  if(s && s.value.trim()){
    const term=s.value.toLowerCase().trim();
    filtered=filtered.filter(t=>String(t.title||"").toLowerCase().includes(term)||String(t.message||"").toLowerCase().includes(term)||String(t.username||"").toLowerCase().includes(term));
  }
  if(cat && cat.value) filtered=filtered.filter(t=>t.category===cat.value);
  showThreads(filtered);
}
function loadThreads(){
  const c=document.getElementById("threads"); if(!c) return;
  const cached=getCache("threadsCache"); if(cached.length) showThreads(sortThreads(cached)); else c.innerHTML="<p>Loading threads...</p>";
  const q=window.query(window.collection(window.db,"threads"),window.orderBy("createdAt","desc"));
  window.onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    const sorted=sortThreads(arr); saveCache("threadsCache",sorted); showThreads(sorted);
  });
}
async function loadThreadView(){
  const box=document.getElementById("threadView"); if(!box) return;
  const id=getParam("id"); if(!id){ box.innerHTML="<div class='post'><p>Thread not found.</p></div>"; return; }
  const snap=await window.getDoc(window.doc(window.db,"threads",id));
  if(!snap.exists()){ box.innerHTML="<div class='post'><p>Thread not found.</p></div>"; return; }
  const t={id:snap.id,...snap.data()};
  document.getElementById("threadBreadcrumb").textContent=t.title||"Thread";
  box.innerHTML=`<div class="detail-card">
    <div class="detail-header"><div class="row-icon big-icon">${t.pinned?"📌":"📄"}</div><div><h1>${t.title||"Untitled Thread"}</h1><p>Started by ${t.username||"Unknown"} • ${formatDate(t.createdAt)}</p><p>Category: ${t.category||"General"} • Likes: ${t.likes||0}</p></div><button onclick="likeThread('${t.id}')">👍 LIKE</button></div>
    <div class="thread-message"><p>${t.message||""}</p></div>
    <h2>Replies</h2><div id="threadReplies"></div>
    <div class="quick-reply"><h3>Quick Reply</h3><input id="replyName-${t.id}" placeholder="Your Name"><textarea id="replyText-${t.id}" rows="5" placeholder="Write your reply..."></textarea><button onclick="replyThread('${t.id}')">POST REPLY</button></div>
  </div>`;
  loadThreadRepliesOnly(t.id);
}
function loadThreadRepliesOnly(id){
  const box=document.getElementById("threadReplies"); if(!box) return;
  const q=window.query(window.collection(window.db,"threads",id,"replies"),window.orderBy("createdAt","asc"));
  window.onSnapshot(q,snap=>{
    if(snap.empty){ box.innerHTML="<div class='reply'><p>No replies yet.</p></div>"; return; }
    let html=""; snap.forEach(d=>{ const r=d.data(); html+=`<div class="reply full-reply"><div class="reply-author"><strong>${r.username||"Unknown"}</strong><small>${formatDate(r.createdAt)}</small></div><p>${r.message||""}</p></div>`; });
    box.innerHTML=html;
  });
}
async function likeThread(id){ await window.updateDoc(window.doc(window.db,"threads",id),{likes:window.increment(1)}); }
async function pinThread(id,state){ if(!isAdminUser()){alert("Admin only.");return;} await window.updateDoc(window.doc(window.db,"threads",id),{pinned:!state}); }
async function replyThread(id){
  const name=document.getElementById("replyName-"+id).value.trim();
  const text=document.getElementById("replyText-"+id).value.trim();
  if(!name || !text){ alert("Please fill reply name and message."); return; }
  await window.addDoc(window.collection(window.db,"threads",id,"replies"),{username:name,message:text,createdAt:window.serverTimestamp()});
  await window.updateDoc(window.doc(window.db,"threads",id),{replyCount:window.increment(1)});
  document.getElementById("replyName-"+id).value=""; document.getElementById("replyText-"+id).value="";
}

function marketImage(item){ return item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.itemName||"Item"}">` : `<div class="placeholder-img">ITEM</div>`; }
async function createListing(){
  if(!checkFields([{id:"seller",name:"Seller Name"},{id:"itemName",name:"Item Name"},{id:"price",name:"Price"},{id:"description",name:"Description"}])) return;
  const docRef=await window.addDoc(window.collection(window.db,"marketplace"),{seller:document.getElementById("seller").value.trim(),itemName:document.getElementById("itemName").value.trim(),price:document.getElementById("price").value.trim(),imageUrl:document.getElementById("imageUrl").value.trim(),description:document.getElementById("description").value.trim(),createdAt:window.serverTimestamp()});
  alert("Item Listed!"); window.location.href="item.html?id="+docRef.id;
}
function showMarketItems(items){
  const c=document.getElementById("marketItems"); if(!c) return;
  if(!items || items.length===0){ c.innerHTML="<div class='post'><p>No items listed yet.</p></div>"; return; }
  c.innerHTML=items.map(item=>`<div class="market-row"><a href="item.html?id=${item.id}" class="market-click">${marketImage(item)}<div><h3>${item.itemName||""}</h3><p>${item.description||""}</p><small>Seller: ${item.seller||"Unknown"}</small></div><strong class="price">₹${item.price||""}</strong></a>${isAdminUser()?`<button onclick="deleteListing('${item.id}')">🗑 DELETE ITEM</button>`:""}</div>`).join("");
}
function loadMarketplace(){
  const c=document.getElementById("marketItems"); if(!c) return;
  const cached=getCache("marketCache"); if(cached.length) showMarketItems(cached); else c.innerHTML="<p>Loading marketplace...</p>";
  const q=window.query(window.collection(window.db,"marketplace"),window.orderBy("createdAt","desc"));
  window.onSnapshot(q,s=>{const arr=[]; s.forEach(d=>arr.push({id:d.id,...d.data()})); saveCache("marketCache",arr); showMarketItems(arr);});
}
async function loadItemView(){
  const box=document.getElementById("itemView"); if(!box) return;
  const id=getParam("id"); if(!id){ box.innerHTML="<div class='post'><p>Item not found.</p></div>"; return; }
  const snap=await window.getDoc(window.doc(window.db,"marketplace",id));
  if(!snap.exists()){ box.innerHTML="<div class='post'><p>Item not found.</p></div>"; return; }
  const item={id:snap.id,...snap.data()};
  document.getElementById("itemBreadcrumb").textContent=item.itemName||"Item";
  box.innerHTML=`<div class="detail-card item-detail"><div class="detail-image">${marketImage(item)}</div><div class="detail-info"><h1>${item.itemName||""}</h1><p class="big-price">₹${item.price||""}</p><p><strong>Seller:</strong> ${item.seller||"Unknown"}</p><p>${item.description||""}</p><button onclick="alert('Contact system coming soon')">CONTACT SELLER</button>${isAdminUser()?`<button onclick="deleteListing('${item.id}')">🗑 DELETE ITEM</button>`:""}</div></div>`;
}

async function createNews(){
  if(!isAdminUser()){ alert("Admin only."); return; }
  if(!checkFields([{id:"newsTitle",name:"News Title"},{id:"newsContent",name:"News Content"}])) return;
  const docRef=await window.addDoc(window.collection(window.db,"news"),{title:document.getElementById("newsTitle").value.trim(),imageUrl:document.getElementById("newsImage").value.trim(),content:document.getElementById("newsContent").value.trim(),author:window.auth.currentUser?window.auth.currentUser.email.split("@")[0]:"Admin",createdAt:window.serverTimestamp()});
  alert("News Published!"); window.location.href="news-view.html?id="+docRef.id;
}
function showNews(items){
  const c=document.getElementById("newsContainer"); if(!c) return;
  if(!items || items.length===0){ c.innerHTML="<div class='post'><p>No news available.</p></div>"; return; }
  c.innerHTML=items.map(n=>`<div class="news-row"><a href="news-view.html?id=${n.id}" class="news-click"><div class="row-icon">📢</div><div class="row-main"><h3>${n.title||""}</h3><p>${n.content||""}</p></div><div class="row-side"><p>${formatDate(n.createdAt)}</p><p>${n.author||"Admin"}</p></div></a>${isAdminUser()?`<button onclick="deleteNews('${n.id}')">🗑 DELETE NEWS</button>`:""}</div>`).join("");
}
function loadNews(){
  const c=document.getElementById("newsContainer"); if(!c) return;
  const cached=getCache("newsCache"); if(cached.length) showNews(cached); else c.innerHTML="<p>Loading news...</p>";
  const q=window.query(window.collection(window.db,"news"),window.orderBy("createdAt","desc"));
  window.onSnapshot(q,s=>{const arr=[]; s.forEach(d=>arr.push({id:d.id,...d.data()})); saveCache("newsCache",arr); showNews(arr);});
}
async function loadNewsView(){
  const box=document.getElementById("newsView"); if(!box) return;
  const id=getParam("id"); if(!id){ box.innerHTML="<div class='post'><p>News not found.</p></div>"; return; }
  const snap=await window.getDoc(window.doc(window.db,"news",id));
  if(!snap.exists()){ box.innerHTML="<div class='post'><p>News not found.</p></div>"; return; }
  const n={id:snap.id,...snap.data()};
  document.getElementById("newsBreadcrumb").textContent=n.title||"News";
  box.innerHTML=`<div class="detail-card news-detail"><h1>${n.title||""}</h1><p>By ${n.author||"Admin"} • ${formatDate(n.createdAt)}</p>${n.imageUrl?`<img src="${n.imageUrl}" class="news-banner" alt="${n.title||"News"}">`:""}<p class="article-text">${n.content||""}</p>${isAdminUser()?`<button onclick="deleteNews('${n.id}')">🗑 DELETE NEWS</button>`:""}</div>`;
}

function renderHomeThreads(items){
  const box=document.getElementById("homeThreads"); if(!box) return;
  const latest=sortThreads(items).slice(0,5);
  box.innerHTML=latest.length?latest.map(renderThreadRow).join(""):"<div class='post'><p>No threads yet.</p></div>";
}
function renderHomeMarket(items){
  const box=document.getElementById("homeMarketItems"); if(!box) return;
  const latest=items.slice(0,3);
  box.innerHTML=latest.length?latest.map(item=>`<a href="item.html?id=${item.id}" class="home-market-card">${marketImage(item)}<div><h3>${item.itemName||"Item"}</h3><p>By ${item.seller||"Unknown"}</p><p>Category: Marketplace</p></div><strong class="price">₹${item.price||""}</strong></a>`).join(""):"<div class='post'><p>No items yet.</p></div>";
}
function renderHomeNews(items){
  const box=document.getElementById("homeNews"); if(!box) return;
  const latest=items.slice(0,3);
  box.innerHTML=latest.length?latest.map(n=>`<a class="news-row clickable-row" href="news-view.html?id=${n.id}"><div class="row-icon">📢</div><div class="row-main"><h3>${n.title||"News"}</h3><p>${n.content||""}</p></div><div class="row-side"><p>${formatDate(n.createdAt)}</p><p>${n.author||"Admin"}</p></div></a>`).join(""):"<div class='post'><p>No news yet.</p></div>";
}
function loadHomeDashboard(){
  if(!document.getElementById("homeThreads")&&!document.getElementById("homeMarketItems")&&!document.getElementById("homeNews")) return;
  const tc=getCache("threadsCache"), mc=getCache("marketCache"), nc=getCache("newsCache");
  if(tc.length) renderHomeThreads(tc); if(mc.length) renderHomeMarket(mc); if(nc.length) renderHomeNews(nc);
  window.onSnapshot(window.query(window.collection(window.db,"threads"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));const sorted=sortThreads(a);saveCache("threadsCache",sorted);renderHomeThreads(sorted);});
  window.onSnapshot(window.query(window.collection(window.db,"marketplace"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("marketCache",a);renderHomeMarket(a);});
  window.onSnapshot(window.query(window.collection(window.db,"news"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("newsCache",a);renderHomeNews(a);});
}
function loadProfile(){
  const email=document.getElementById("profileEmail"); if(!email) return;
  const user=window.auth.currentUser;
  if(!user){ window.location.href="login.html"; return; }
  const name=user.email.split("@")[0];
  document.getElementById("profileName").textContent=name.toUpperCase();
  document.getElementById("profileInitial").textContent=name[0].toUpperCase();
  document.getElementById("profileEmail").textContent=user.email;
  document.getElementById("profileRole").textContent=isAdminUser()?"Admin":"Newbie";
  document.getElementById("profileVerified").textContent=user.emailVerified?"Yes":"No";
}
async function deleteThread(id){ if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this thread?"))return; await window.deleteDoc(window.doc(window.db,"threads",id)); alert("Thread deleted."); window.location.href="forum.html"; }
async function deleteListing(id){ if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this item?"))return; await window.deleteDoc(window.doc(window.db,"marketplace",id)); alert("Item deleted."); window.location.href="market.html"; }
async function deleteNews(id){ if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this news?"))return; await window.deleteDoc(window.doc(window.db,"news",id)); alert("News deleted."); window.location.href="news.html"; }

window.signupUser=signupUser; window.loginUser=loginUser; window.logoutUser=logoutUser;
window.createThread=createThread; window.likeThread=likeThread; window.pinThread=pinThread; window.replyThread=replyThread; window.filterThreads=filterThreads;
window.createListing=createListing; window.createNews=createNews; window.deleteThread=deleteThread; window.deleteListing=deleteListing; window.deleteNews=deleteNews;

waitForFirebase(function(){
  window.onAuthStateChanged(window.auth,function(){
    updateAdminUI(); loadHeaderUser(); protectAdminPage();
    loadHomeDashboard(); loadThreads(); loadThreadView(); loadMarketplace(); loadItemView(); loadNews(); loadNewsView(); loadProfile();
  });
});
