let posts = JSON.parse(localStorage.getItem("posts")) || [];

function savePosts() {
    localStorage.setItem("posts", JSON.stringify(posts));
}

function renderPosts() {
    let container = document.getElementById("posts");
    container.innerHTML = "";

    posts.reverse().forEach(post => {
        container.innerHTML += `
            <div class="post">
                <h3>${post.user}</h3>
                <p>${post.text}</p>
            </div>
        `;
    });

    posts.reverse();
}

function addPost() {
    let user = document.getElementById("username").value;
    let text = document.getElementById("message").value;

    if (!user || !text) return;

    posts.push({
        user,
        text
    });

    savePosts();
    renderPosts();

    document.getElementById("message").value = "";
}

renderPosts();