
const ADMIN_EMAILS = ["your@email.com"];
let allThreadsCache = [];

const IMGBB_API_KEY = "567ae01bf7e52acd2cdfed8188638021";

async function uploadImageToImgBB(file){
  if(!file) return "";
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, {
    method: "POST",
    body: formData
  });
  const result = await response.json();
  if(!result.success){
    console.log(result);
    throw new Error("ImgBB upload failed.");
  }
  return result.data.url;
}

let currentUserProfile = null;

function waitForFirebase(cb){ if(window.firebaseReady&&window.db&&window.auth){cb();return;} window.addEventListener("firebase-ready",cb,{once:true}); }
function cleanEmail(email){ return String(email||"").toLowerCase().trim(); }
function isAdminUser(){ const u=window.auth&&window.auth.currentUser; if(!u||!u.emailVerified)return false; return ADMIN_EMAILS.map(cleanEmail).includes(cleanEmail(u.email)); }
function getParam(name){ return new URLSearchParams(window.location.search).get(name); }
function saveCache(k,d){ try{sessionStorage.setItem(k,JSON.stringify(d));}catch(e){} }
function getCache(k){ try{return JSON.parse(sessionStorage.getItem(k))||[];}catch(e){return [];} }
function formatDate(t){ if(!t||!t.seconds)return"Just now"; return new Date(t.seconds*1000).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"}); }
function money(n){ return Number(n||0).toFixed(2); }
function checkFields(fields){ for(let f of fields){const i=document.getElementById(f.id); if(!i||!i.value.trim()){alert(f.name+" is missing. Please fill it."); if(i)i.focus(); return false;}} return true; }
function statusClass(s){ s=String(s||"NEWBIE").toUpperCase(); if(s==="GUIDE")return"status-guide"; if(s==="SELLER")return"status-seller"; if(s==="OUT-LAW")return"status-outlaw"; if(s==="0XDEV"||s==="0xDEV")return"status-dev"; if(s==="PRO")return"status-pro"; if(s==="LEGEND")return"status-legend"; if(s==="STAFF")return"status-staff"; if(s==="011")return"status-011"; if(s==="OWNER")return"status-owner"; return"status-newbie"; }
function statusPill(s){ return `<span class="status-pill ${statusClass(s)}">${s}</span>`; }
async function uploadImage(file, folder){ return await uploadImageToImgBB(file); }


async function ensureUserProfile(){
  try{
    const u=window.auth.currentUser;
    if(!u){currentUserProfile=null;return null;}
    const ref=window.doc(window.db,"users",u.uid);
    const snap=await window.getDoc(ref);
    if(!snap.exists()){
      const username=u.email.split("@")[0].toUpperCase();
      const p={uid:u.uid,username:username,email:u.email,avatarUrl:"",primaryStatus:isAdminUser()?"OWNER":"NEWBIE",statuses:isAdminUser()?["OWNER","011","STAFF"]:["NEWBIE"],trust:isAdminUser()?100:10,balance:0,createdAt:window.serverTimestamp()};
      await window.setDoc(ref,p);
      currentUserProfile=p;
      return p;
    }
    currentUserProfile={id:snap.id,...snap.data()};
    return currentUserProfile;
  }catch(e){
    console.error("Profile load blocked:", e);
    currentUserProfile=safeProfileFallback();
    return currentUserProfile;
  }
}
async function getUserProfile(uid){ if(!uid)return null; const s=await window.getDoc(window.doc(window.db,"users",uid)); return s.exists()?{id:s.id,...s.data()}:null; }
async function updateUsername(){ const u=window.auth.currentUser; if(!u){alert("Login first.");return;} const input=document.getElementById("newUsername"); const username=input.value.trim(); if(!username){alert("Enter username.");return;} await window.updateDoc(window.doc(window.db,"users",u.uid),{username}); alert("Username updated."); location.reload(); }
async function uploadAvatar(){ const u=window.auth.currentUser; if(!u){alert("Login first.");return;} const f=document.getElementById("avatarFile").files[0]; if(!f){alert("Select an image first.");return;} const url=await uploadImage(f,"avatars"); await window.updateDoc(window.doc(window.db,"users",u.uid),{avatarUrl:url}); alert("Avatar updated."); location.reload(); }


function safeProfileFallback(){
  const u = window.auth.currentUser;
  if(!u) return null;
  return {
    uid: u.uid,
    username: u.email.split("@")[0].toUpperCase(),
    email: u.email,
    avatarUrl: "",
    primaryStatus: "NEWBIE",
    statuses: ["NEWBIE"],
    trust: 10,
    balance: 0
  };
}

function updateAdminUI(){ const a=document.getElementById("adminLink"); const only=document.querySelectorAll(".admin-only"); if(a)a.style.display=isAdminUser()?"inline-block":"none"; only.forEach(el=>el.style.display=isAdminUser()?"inline-block":"none"); }
function loadHeaderUser(){
 const u=window.auth.currentUser, p=currentUserProfile; const nameBox=document.getElementById("userName"), initial=document.getElementById("userInitial"), primary=document.getElementById("userPrimaryStatus");
 if(!nameBox||!initial||!primary)return;
 if(!u||!p){nameBox.textContent="GUEST";initial.textContent="?";primary.textContent="NEWBIE";return;}
 const name=(p.username||u.email.split("@")[0]).toUpperCase();
 nameBox.textContent=name; initial.textContent=name[0]; primary.textContent=p.primaryStatus||"NEWBIE";
 const trust=document.getElementById("miniTrust"), bal=document.getElementById("miniBalance"), list=document.getElementById("miniStatusList"), img=document.getElementById("miniAvatarImg");
 if(trust)trust.textContent=(p.trust??10)+"%"; if(bal)bal.textContent=money(p.balance); if(list)list.innerHTML=(p.statuses||["NEWBIE"]).slice(0,3).map(statusPill).join("");
 if(img&&p.avatarUrl){img.src=p.avatarUrl;img.style.display="block";initial.style.display="none";} else if(img){img.style.display="none"; initial.style.display="block";}
}
function loadProfile(){
 const email=document.getElementById("profileEmail"); if(!email)return; const u=window.auth.currentUser; if(!u){window.location.href="login.html";return;} const p=currentUserProfile||{}; const name=(p.username||u.email.split("@")[0]).toUpperCase();
 document.getElementById("profileName").textContent=name; document.getElementById("profileInitial").textContent=name[0]; document.getElementById("profileEmail").textContent=u.email; 
 const uid=document.getElementById("profileUid"); if(uid)uid.textContent=u.uid;
 document.getElementById("profileRole").innerHTML=statusPill(p.primaryStatus||"NEWBIE"); document.getElementById("profileStatuses").innerHTML=(p.statuses||["NEWBIE"]).map(statusPill).join(" ");
 document.getElementById("profileVerified").textContent=u.emailVerified?"Yes":"No"; document.getElementById("profileTrust").textContent=(p.trust??10)+"%"; document.getElementById("profileBalance").textContent=money(p.balance);
 const img=document.getElementById("profileAvatarImg"), init=document.getElementById("profileInitial"); if(img&&p.avatarUrl){img.src=p.avatarUrl;img.style.display="block";init.style.display="none";} else if(img){img.style.display="none"; init.style.display="flex";}
}

async function signupUser(){ const username=document.getElementById("username").value.trim(), email=document.getElementById("email").value.trim(), password=document.getElementById("password").value.trim(); if(!username||!email||!password){alert("Fill username, email and password.");return;} try{ const uc=await window.createUserWithEmailAndPassword(window.auth,email,password); await window.setDoc(window.doc(window.db,"users",uc.user.uid),{uid:uc.user.uid,username,email,avatarUrl:"",primaryStatus:"NEWBIE",statuses:["NEWBIE"],trust:10,balance:0,createdAt:window.serverTimestamp()}); await window.sendEmailVerification(uc.user); await window.signOut(window.auth); alert("Account created. Check email to verify before login."); }catch(e){alert(e.message);} }
async function loginUser(){ const email=document.getElementById("email").value.trim(), password=document.getElementById("password").value.trim(); try{ const uc=await window.signInWithEmailAndPassword(window.auth,email,password); if(!uc.user.emailVerified){alert("Please verify your email first."); await window.signOut(window.auth); return;} alert("Login successful!"); window.location.href="index.html"; }catch(e){alert(e.message);} }
async function logoutUser(){ await window.signOut(window.auth); alert("Logged out."); window.location.href="login.html"; }
function protectAdminPage(){ if(!window.location.pathname.includes("admin.html"))return; const u=window.auth.currentUser; if(!u){window.location.href="login.html";return;} if(!u.emailVerified||!isAdminUser()){alert("Access denied.");window.location.href="index.html";} }

function toggleMiniDropdown(id){ document.querySelectorAll(".mini-dropdown").forEach(d=>{if(d.id!==id)d.style.display="none";}); const b=document.getElementById(id); if(b)b.style.display=b.style.display==="block"?"none":"block"; }
async function createNotification(userUid,type,title,message,targetUrl){ if(!userUid)return; await window.addDoc(window.collection(window.db,"notifications"),{userUid,type,title,message,targetUrl:targetUrl||"",read:false,createdAt:window.serverTimestamp()}); }
function notificationRow(n){ const icon=n.type==="alert"?"⚠":"✉"; return `<a class="notif-row" href="message-view.html?id=${n.id}"><span>${icon}</span><div><b>${n.title||"Message"}</b><p>${n.message||""}</p></div></a>`; }
function loadNotifications(){ const u=window.auth.currentUser; if(!u)return; const q=window.query(window.collection(window.db,"notifications"),window.orderBy("createdAt","desc")); window.onSnapshot(q,s=>{let mails=[],alerts=[]; s.forEach(d=>{const n={id:d.id,...d.data()}; if(n.userUid!==u.uid)return; if(n.type==="alert")alerts.push(n); else mails.push(n);}); const mc=document.getElementById("mailCount"), ac=document.getElementById("alertCount"); if(mc)mc.textContent=mails.filter(n=>!n.read).length; if(ac)ac.textContent=alerts.filter(n=>!n.read).length; const ml=document.getElementById("miniMailList"), al=document.getElementById("miniAlertList"), mp=document.getElementById("mailPageList"), ap=document.getElementById("alertPageList"); if(ml)ml.innerHTML=mails.slice(0,8).map(notificationRow).join("")||"<p class='empty-drop'>No mail.</p>"; if(al)al.innerHTML=alerts.slice(0,8).map(notificationRow).join("")||"<p class='empty-drop'>No alerts.</p>"; if(mp)mp.innerHTML=mails.map(notificationRow).join("")||"<div class='post'><p>No mail.</p></div>"; if(ap)ap.innerHTML=alerts.map(notificationRow).join("")||"<div class='post'><p>No alerts.</p></div>"; }); }
async function loadMessageView(){ const box=document.getElementById("messageView"); if(!box)return; const id=getParam("id"); if(!id){box.innerHTML="<div class='post'><p>Message not found.</p></div>";return;} const ref=window.doc(window.db,"notifications",id), snap=await window.getDoc(ref); if(!snap.exists()){box.innerHTML="<div class='post'><p>Message not found.</p></div>";return;} const n={id:snap.id,...snap.data()}; if(window.auth.currentUser&&n.userUid===window.auth.currentUser.uid) await window.updateDoc(ref,{read:true}); box.innerHTML=`<div class="detail-card"><h1>${n.type==="alert"?"⚠ ALERT":"✉ MAIL"}</h1><h2>${n.title||"Message"}</h2><p>${n.message||""}</p>${n.targetUrl?`<a class="card-btn" href="${n.targetUrl}">OPEN RELATED PAGE</a>`:""}</div>`; }

async function createThread(){ const u=window.auth.currentUser; if(!u){alert("Login first.");window.location.href="login.html";return;} const title=document.getElementById("title").value.trim(), category=document.getElementById("category").value, message=document.getElementById("message").value.trim(); if(!title||!category||!message){alert("Please fill all fields.");return;} const p=currentUserProfile||{}; const docRef=await window.addDoc(window.collection(window.db,"threads"),{ownerUid:u.uid,username:p.username||u.email.split("@")[0],title,category,message,likes:0,pinned:false,replyCount:0,createdAt:window.serverTimestamp()}); alert("Thread Created!"); window.location.href="thread.html?id="+docRef.id; }
function sortThreads(a){a.sort((x,y)=>{if((x.pinned||false)!==(y.pinned||false))return(y.pinned?1:0)-(x.pinned?1:0);return((y.createdAt&&y.createdAt.seconds)||0)-((x.createdAt&&x.createdAt.seconds)||0)});return a;}
function renderThreadRow(t){ return `<a class="thread-row clickable-row" href="thread.html?id=${t.id}"><div class="row-icon">${t.pinned?"📌":"📄"}</div><div class="row-main"><h3>${t.title||"Untitled Thread"}</h3><p>Started by ${t.username||"Unknown"} • ${formatDate(t.createdAt)}</p></div><div class="row-side"><p>${t.replyCount||0} replies</p><p>${t.category||"General"}</p></div></a>`;}
function showThreads(arr){const c=document.getElementById("threads"); if(!c)return; if(!arr||!arr.length){c.innerHTML="<div class='post'><p>No threads available.</p></div>";return;} allThreadsCache=arr; c.innerHTML=arr.map(t=>`<div class="post thread-card">${t.pinned?`<div class="pinned-badge">📌 PINNED THREAD</div>`:""}<a href="thread.html?id=${t.id}" class="thread-title-link"><h3>${t.title||""}</h3></a><small>${t.category||"General"}</small><p>${t.message||""}</p><small class="post-meta">Posted by ${t.username||"Unknown"} | ${formatDate(t.createdAt)}</small><br><br><button onclick="likeThread('${t.id}')">👍 Like (${t.likes||0})</button><a href="thread.html?id=${t.id}" class="card-btn small-btn">OPEN THREAD</a>${isAdminUser()?`<button onclick="pinThread('${t.id}', ${t.pinned||false})">📌 ${t.pinned?"UNPIN":"PIN"}</button><button onclick="deleteThread('${t.id}')">🗑 DELETE THREAD</button>`:""}</div>`).join("");}
function filterThreads(){const s=document.getElementById("threadSearch"), cat=document.getElementById("threadCategoryFilter"); let f=[...allThreadsCache]; if(s&&s.value.trim()){const term=s.value.toLowerCase().trim(); f=f.filter(t=>String(t.title||"").toLowerCase().includes(term)||String(t.message||"").toLowerCase().includes(term)||String(t.username||"").toLowerCase().includes(term));} if(cat&&cat.value)f=f.filter(t=>t.category===cat.value); showThreads(f);}
function loadThreads(){const c=document.getElementById("threads"); if(!c)return; const cached=getCache("threadsCache"); if(cached.length)showThreads(sortThreads(cached)); else c.innerHTML="<p>Loading threads...</p>"; const q=window.query(window.collection(window.db,"threads"),window.orderBy("createdAt","desc")); window.onSnapshot(q,s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));const sorted=sortThreads(a);saveCache("threadsCache",sorted);showThreads(sorted);});}
async function loadThreadView(){const box=document.getElementById("threadView"); if(!box)return; const id=getParam("id"); if(!id){box.innerHTML="<div class='post'><p>Thread not found.</p></div>";return;} const snap=await window.getDoc(window.doc(window.db,"threads",id)); if(!snap.exists()){box.innerHTML="<div class='post'><p>Thread not found.</p></div>";return;} const t={id:snap.id,...snap.data()}; document.getElementById("threadBreadcrumb").textContent=t.title||"Thread"; box.innerHTML=`<div class="detail-card"><div class="detail-header"><div class="row-icon big-icon">${t.pinned?"📌":"📄"}</div><div><h1>${t.title||"Untitled Thread"}</h1><p>Started by ${t.username||"Unknown"} • ${formatDate(t.createdAt)}</p><p>Category: ${t.category||"General"} • Likes: ${t.likes||0}</p></div><button onclick="likeThread('${t.id}')">👍 LIKE</button></div><div class="thread-message"><p>${t.message||""}</p></div><h2>Replies</h2><div id="threadReplies"></div><div class="quick-reply"><h3>Quick Reply</h3><textarea id="replyText-${t.id}" rows="5" placeholder="Write your reply..."></textarea><button onclick="replyThread('${t.id}')">POST REPLY</button></div></div>`; loadThreadRepliesOnly(t.id);}
function loadThreadRepliesOnly(id){const box=document.getElementById("threadReplies"); if(!box)return; const q=window.query(window.collection(window.db,"threads",id,"replies"),window.orderBy("createdAt","asc")); window.onSnapshot(q,s=>{if(s.empty){box.innerHTML="<div class='reply'><p>No replies yet.</p></div>";return;} let html=""; s.forEach(d=>{const r=d.data();html+=`<div class="reply full-reply"><div class="reply-author"><strong>${r.username||"Unknown"}</strong><small>${formatDate(r.createdAt)}</small></div><p>${r.message||""}</p></div>`;}); box.innerHTML=html;});}
async function likeThread(id){const u=window.auth.currentUser; await window.updateDoc(window.doc(window.db,"threads",id),{likes:window.increment(1)}); const s=await window.getDoc(window.doc(window.db,"threads",id)); if(s.exists()){const t=s.data(); if(t.ownerUid&&(!u||t.ownerUid!==u.uid)) await createNotification(t.ownerUid,"mail","New Like","Someone liked your thread: "+t.title,"thread.html?id="+id);}}
async function pinThread(id,state){if(!isAdminUser()){alert("Admin only.");return;} await window.updateDoc(window.doc(window.db,"threads",id),{pinned:!state});}
async function replyThread(id){const u=window.auth.currentUser;if(!u){alert("Login first.");return;} const text=document.getElementById("replyText-"+id).value.trim(); if(!text){alert("Please write a reply.");return;} const p=currentUserProfile||{}; await window.addDoc(window.collection(window.db,"threads",id,"replies"),{userUid:u.uid,username:p.username||u.email.split("@")[0],message:text,createdAt:window.serverTimestamp()}); await window.updateDoc(window.doc(window.db,"threads",id),{replyCount:window.increment(1)}); const s=await window.getDoc(window.doc(window.db,"threads",id)); if(s.exists()){const t=s.data(); if(t.ownerUid&&t.ownerUid!==u.uid) await createNotification(t.ownerUid,"mail","New Reply",(p.username||"Someone")+" replied to your thread: "+t.title,"thread.html?id="+id);} document.getElementById("replyText-"+id).value="";}

function marketImage(item){return item.imageUrl?`<img src="${item.imageUrl}" alt="${item.itemName||"Item"}">`:`<div class="placeholder-img">ITEM</div>`;}
async function createListing(){const u=window.auth.currentUser;if(!u){alert("Login first.");window.location.href="login.html";return;} if(!checkFields([{id:"itemName",name:"Item Name"},{id:"price",name:"Price"},{id:"description",name:"Description"}]))return; const f=document.getElementById("itemImage").files[0]; const imageUrl=await uploadImage(f,"marketplace"); const p=currentUserProfile||{}; const docRef=await window.addDoc(window.collection(window.db,"marketplace"),{ownerUid:u.uid,seller:p.username||u.email.split("@")[0],itemName:document.getElementById("itemName").value.trim(),price:document.getElementById("price").value.trim(),imageUrl,description:document.getElementById("description").value.trim(),createdAt:window.serverTimestamp()}); alert("Item Listed!"); window.location.href="item.html?id="+docRef.id;}
function showMarketItems(items){const c=document.getElementById("marketItems"); if(!c)return; if(!items||!items.length){c.innerHTML="<div class='post'><p>No items listed yet.</p></div>";return;} c.innerHTML=items.map(item=>`<div class="market-row"><a href="item.html?id=${item.id}" class="market-click">${marketImage(item)}<div><h3>${item.itemName||""}</h3><p>${item.description||""}</p><small>Seller: ${item.seller||"Unknown"}</small></div><strong class="price">$${item.price||""}</strong></a>${isAdminUser()?`<button onclick="deleteListing('${item.id}')">🗑 DELETE ITEM</button>`:""}</div>`).join("");}
function loadMarketplace(){const c=document.getElementById("marketItems"); if(!c)return; const cached=getCache("marketCache"); if(cached.length)showMarketItems(cached); else c.innerHTML="<p>Loading marketplace...</p>"; const q=window.query(window.collection(window.db,"marketplace"),window.orderBy("createdAt","desc")); window.onSnapshot(q,s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("marketCache",a);showMarketItems(a);});}
async function loadItemView(){const box=document.getElementById("itemView");if(!box)return;const id=getParam("id"); if(!id){box.innerHTML="<div class='post'><p>Item not found.</p></div>";return;} const snap=await window.getDoc(window.doc(window.db,"marketplace",id)); if(!snap.exists()){box.innerHTML="<div class='post'><p>Item not found.</p></div>";return;} const item={id:snap.id,...snap.data()}; document.getElementById("itemBreadcrumb").textContent=item.itemName||"Item"; box.innerHTML=`<div class="detail-card item-detail"><div class="detail-image">${marketImage(item)}</div><div class="detail-info"><h1>${item.itemName||""}</h1><p class="big-price">$${item.price||""}</p><p><strong>Seller:</strong> ${item.seller||"Unknown"}</p><p>${item.description||""}</p><button onclick="alert('Contact system coming soon')">CONTACT SELLER</button>${isAdminUser()?`<button onclick="deleteListing('${item.id}')">🗑 DELETE ITEM</button>`:""}</div></div>`;}

async function createNews(){if(!isAdminUser()){alert("Admin only.");return;} if(!checkFields([{id:"newsTitle",name:"News Title"},{id:"newsContent",name:"News Content"}]))return; const f=document.getElementById("newsImageFile").files[0]; const imageUrl=await uploadImage(f,"news"); const title=document.getElementById("newsTitle").value.trim(); const docRef=await window.addDoc(window.collection(window.db,"news"),{title,imageUrl,content:document.getElementById("newsContent").value.trim(),author:currentUserProfile?.username||"Admin",createdAt:window.serverTimestamp()}); const users=await window.getDocs(window.collection(window.db,"users")); users.forEach(async u=>{await createNotification(u.id,"alert","New News","Admin posted new news: "+title,"news-view.html?id="+docRef.id);}); alert("News Published!"); window.location.href="news-view.html?id="+docRef.id;}
function showNews(items){const c=document.getElementById("newsContainer"); if(!c)return; if(!items||!items.length){c.innerHTML="<div class='post'><p>No news available.</p></div>";return;} c.innerHTML=items.map(n=>`<div class="news-row"><a href="news-view.html?id=${n.id}" class="news-click"><div class="row-icon">📢</div><div class="row-main"><h3>${n.title||""}</h3><p>${n.content||""}</p></div><div class="row-side"><p>${formatDate(n.createdAt)}</p><p>${n.author||"Admin"}</p></div></a>${isAdminUser()?`<button onclick="deleteNews('${n.id}')">🗑 DELETE NEWS</button>`:""}</div>`).join("");}
function loadNews(){const c=document.getElementById("newsContainer"); if(!c)return; const cached=getCache("newsCache"); if(cached.length)showNews(cached); else c.innerHTML="<p>Loading news...</p>"; const q=window.query(window.collection(window.db,"news"),window.orderBy("createdAt","desc")); window.onSnapshot(q,s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("newsCache",a);showNews(a);});}
async function loadNewsView(){const box=document.getElementById("newsView"); if(!box)return; const id=getParam("id"); if(!id){box.innerHTML="<div class='post'><p>News not found.</p></div>";return;} const snap=await window.getDoc(window.doc(window.db,"news",id)); if(!snap.exists()){box.innerHTML="<div class='post'><p>News not found.</p></div>";return;} const n={id:snap.id,...snap.data()}; document.getElementById("newsBreadcrumb").textContent=n.title||"News"; box.innerHTML=`<div class="detail-card news-detail"><h1>${n.title||""}</h1><p>By ${n.author||"Admin"} • ${formatDate(n.createdAt)}</p>${n.imageUrl?`<img src="${n.imageUrl}" class="news-banner" alt="${n.title||"News"}">`:""}<p class="article-text">${n.content||""}</p>${isAdminUser()?`<button onclick="deleteNews('${n.id}')">🗑 DELETE NEWS</button>`:""}</div>`;}

function renderHomeThreads(items){const box=document.getElementById("homeThreads"); if(!box)return; const latest=sortThreads(items).slice(0,5); box.innerHTML=latest.length?latest.map(renderThreadRow).join(""):"<div class='post'><p>No threads yet.</p></div>";}
function renderHomeMarket(items){const box=document.getElementById("homeMarketItems"); if(!box)return; const latest=items.slice(0,3); box.innerHTML=latest.length?latest.map(item=>`<a href="item.html?id=${item.id}" class="home-market-card">${marketImage(item)}<div><h3>${item.itemName||"Item"}</h3><p>By ${item.seller||"Unknown"}</p></div><strong class="price">$${item.price||""}</strong></a>`).join(""):"<div class='post'><p>No items yet.</p></div>";}
function renderHomeNews(items){const box=document.getElementById("homeNews"); if(!box)return; const latest=items.slice(0,3); box.innerHTML=latest.length?latest.map(n=>`<a class="news-row clickable-row" href="news-view.html?id=${n.id}"><div class="row-icon">📢</div><div class="row-main"><h3>${n.title||"News"}</h3><p>${n.content||""}</p></div><div class="row-side"><p>${formatDate(n.createdAt)}</p><p>${n.author||"Admin"}</p></div></a>`).join(""):"<div class='post'><p>No news yet.</p></div>";}
function loadHomeDashboard(){if(!document.getElementById("homeThreads")&&!document.getElementById("homeMarketItems")&&!document.getElementById("homeNews"))return; const tc=getCache("threadsCache"),mc=getCache("marketCache"),nc=getCache("newsCache"); if(tc.length)renderHomeThreads(tc); if(mc.length)renderHomeMarket(mc); if(nc.length)renderHomeNews(nc); window.onSnapshot(window.query(window.collection(window.db,"threads"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));const sorted=sortThreads(a);saveCache("threadsCache",sorted);renderHomeThreads(sorted);}); window.onSnapshot(window.query(window.collection(window.db,"marketplace"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("marketCache",a);renderHomeMarket(a);}); window.onSnapshot(window.query(window.collection(window.db,"news"),window.orderBy("createdAt","desc")),s=>{const a=[];s.forEach(d=>a.push({id:d.id,...d.data()}));saveCache("newsCache",a);renderHomeNews(a);});}

async function buyStatus(status,price){const u=window.auth.currentUser; if(!u){alert("Login first.");return;} const p=currentUserProfile; if(!p){alert("Profile not loaded.");return;} if((p.statuses||[]).includes(status)){alert("You already own this status.");return;} if(Number(p.balance||0)<price){alert("Not enough balance.");return;} const statuses=[...(p.statuses||["NEWBIE"]),status]; await window.updateDoc(window.doc(window.db,"users",u.uid),{balance:Number(p.balance||0)-price,statuses,primaryStatus:status}); await window.addDoc(window.collection(window.db,"transactions"),{uid:u.uid,type:"status_purchase",status,amount:price,createdAt:window.serverTimestamp()}); alert("Status purchased."); location.reload();}
async function adminAddBalance(){if(!isAdminUser()){alert("Admin only.");return;} const uid=document.getElementById("adminUserUid").value.trim(), amount=Number(document.getElementById("adminBalanceAmount").value); if(!uid||!amount){alert("Enter UID and amount.");return;} await window.updateDoc(window.doc(window.db,"users",uid),{balance:window.increment(amount)}); await window.addDoc(window.collection(window.db,"transactions"),{uid,type:"admin_balance",amount,createdAt:window.serverTimestamp()}); alert("Balance added.");}
async function adminAddTrust(){if(!isAdminUser()){alert("Admin only.");return;} const uid=document.getElementById("adminUserUid").value.trim(), amount=Number(document.getElementById("adminTrustAmount").value); if(!uid||!amount){alert("Enter UID and trust amount.");return;} await window.updateDoc(window.doc(window.db,"users",uid),{trust:window.increment(amount)}); alert("Trust added.");}
async function adminGrantStatus(){if(!isAdminUser()){alert("Admin only.");return;} const uid=document.getElementById("adminUserUid").value.trim(), status=document.getElementById("adminStatusName").value; if(!uid||!status){alert("Enter UID and status.");return;} const p=await getUserProfile(uid); const statuses=p?.statuses||["NEWBIE"]; if(!statuses.includes(status))statuses.push(status); await window.updateDoc(window.doc(window.db,"users",uid),{statuses,primaryStatus:status}); alert("Status granted.");}
async function deleteThread(id){if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this thread?"))return; await window.deleteDoc(window.doc(window.db,"threads",id)); alert("Thread deleted."); window.location.href="forum.html";}
async function deleteListing(id){if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this item?"))return; await window.deleteDoc(window.doc(window.db,"marketplace",id)); alert("Item deleted."); window.location.href="market.html";}
async function deleteNews(id){if(!isAdminUser()){alert("Admin only.");return;} if(!confirm("Delete this news?"))return; await window.deleteDoc(window.doc(window.db,"news",id)); alert("News deleted."); window.location.href="news.html";}

Object.assign(window,{signupUser,loginUser,logoutUser,toggleMiniDropdown,createThread,likeThread,pinThread,replyThread,filterThreads,createListing,createNews,uploadAvatar,updateUsername,buyStatus,adminAddBalance,adminAddTrust,adminGrantStatus,deleteThread,deleteListing,deleteNews});
waitForFirebase(function(){window.onAuthStateChanged(window.auth,async function(){await ensureUserProfile(); updateAdminUI(); loadHeaderUser(); protectAdminPage(); loadNotifications(); loadMessageView(); loadHomeDashboard(); loadThreads(); loadThreadView(); loadMarketplace(); loadItemView(); loadNews(); loadNewsView(); loadProfile();});});
