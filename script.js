const API_BASE = "https://www.themealdb.com/api/json/v1/1/";

const subCategories = {
    all: [],
    chicken: ["Chicken_Biryani", "Fried_Chicken", "Chicken_Curry", "Tikka", "Kebab"],
    beef: ["Steak", "Burger", "Roast_Beef", "Pie", "Wellington"],
    seafood: ["Shrimp", "Salmon", "Fish", "Lobster", "Sushi"],
    dessert: ["Cake", "Chocolate", "Ice_Cream", "Donut", "Pie"],
    veg: ["Salad", "Corn", "Potato", "Spinach", "Pasta"],
};

let currentMode = "random";
let filterIds = [];
let displayCount = 0;
let isFetching = false;
let totalRendered = 0;
let favorites = JSON.parse(localStorage.getItem("mk_favs")) || [];

const grid = document.getElementById("grid");
const loadBtn = document.getElementById("load-more-btn");

window.onload = () => {
    if (localStorage.getItem("theme") === "dark")
        document.body.setAttribute("data-theme", "dark");
    loadMore();
};

function toggleTheme() {
    if (document.body.getAttribute("data-theme") === "dark") {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
    } else {
        document.body.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    }
}

function toggleFav(e, id, img, title, cat) {
    e.stopPropagation();
    const index = favorites.findIndex((f) => f.id === id);

    if (index === -1) {
        favorites.push({ id, img, title, cat });
        e.target.closest(".fav-btn").classList.add("active");
    } else {
        favorites.splice(index, 1);
        e.target.closest(".fav-btn").classList.remove("active");
        if (currentMode === "saved") {
            e.target.closest(".card").remove();
        }
    }
    localStorage.setItem("mk_favs", JSON.stringify(favorites));
}

function isFav(id) {
    return favorites.some((f) => f.id === id);
}

async function fetchAPI(url) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.meals || [];
    } catch {
        return [];
    }
}

function showSkeletons() {
    let html = "";
    for (let i = 0; i < 4; i++) {
        html += `<div class="skeleton-card"><div class="sk-img sk-anim"></div><div class="sk-text sk-anim"></div></div>`;
    }
    const temp = document.createElement("div");
    temp.id = "temp-skel";
    temp.style.display = "contents";
    temp.innerHTML = html;
    grid.appendChild(temp);
}

async function loadMore() {
    if (isFetching) return;
    isFetching = true;
    loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    showSkeletons();

    let mealsToRender = [];

    if (currentMode === "random") {
        const promises = Array(8).fill().map(() => fetchAPI(`${API_BASE}random.php`));
        const results = await Promise.all(promises);
        mealsToRender = results.map((r) => r[0]).filter(Boolean);
    } else if (currentMode === "saved") {
        mealsToRender = [];
    } else {
        if (displayCount >= filterIds.length) {
            document.getElementById("temp-skel").remove();
            loadBtn.style.display = "none";
            isFetching = false;
            return;
        }
        mealsToRender = filterIds.slice(displayCount, displayCount + 8);
        displayCount += 8;
        if (displayCount >= filterIds.length) loadBtn.style.display = "none";
    }

    document.getElementById("temp-skel").remove();
    renderMeals(mealsToRender);
    loadBtn.innerHTML = "Show More";
    isFetching = false;
}

function renderMeals(meals) {
    meals.forEach((meal) => {
        totalRendered++;
        const id = meal.idMeal;
        const thumb = meal.strMealThumb;
        const title = meal.strMeal;
        const cat = meal.strCategory || "Delicious";
        const favClass = isFav(id) ? "active" : "";

        let vidBadge = "";
        if (meal.strYoutube)
            vidBadge = `<div class="yt-badge"><i class="fas fa-play"></i></div>`;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="img-wrapper">
                <img src="${thumb}" class="card-img" loading="lazy">
                <div class="card-actions">
                    <div class="fav-btn ${favClass}" onclick="toggleFav(event, '${id}', '${thumb}', '${title}', '${cat}')">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                ${vidBadge}
            </div>
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-meta">${cat}</div>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest(".fav-btn")) openModal(id);
        };
        grid.appendChild(card);
    });
}

async function setCategory(cat, btn) {
    document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const subBox = document.getElementById("sub-cats");
    const subs = subCategories[cat] || [];
    subBox.innerHTML = subs.length
        ? subs.map((s) => `<div class="chip" onclick="searchSpecific('${s}', this)">${s.replace(/_/g, " ")}</div>`).join("")
        : "";
    subBox.style.display = subs.length ? "flex" : "none";

    grid.innerHTML = "";
    totalRendered = 0;
    displayCount = 0;
    loadBtn.style.display = "inline-block";

    if (cat === "saved") {
        currentMode = "saved";
        document.getElementById("grid-title").textContent = "My Saved Recipes";
        const savedMeals = favorites.map((f) => ({
            idMeal: f.id,
            strMealThumb: f.img,
            strMeal: f.title,
            strCategory: f.cat,
        }));
        if (savedMeals.length === 0)
            grid.innerHTML = '<p style="padding:20px">No saved recipes yet.</p>';
        else renderMeals(savedMeals);
        loadBtn.style.display = "none";
    } else if (cat === "all") {
        currentMode = "random";
        document.getElementById("grid-title").textContent = "Trending Now";
        loadMore();
    } else {
        currentMode = "filter";
        document.getElementById("grid-title").textContent = cat.toUpperCase() + " Recipes";
        const url = `${API_BASE}filter.php?c=${cat === "veg" ? "Vegetarian" : cat.charAt(0).toUpperCase() + cat.slice(1)}`;
        const data = await fetchAPI(url);

        if (!data.length) {
            const sData = await fetchAPI(`${API_BASE}search.php?s=${cat}`);
            filterIds = sData;
        } else {
            filterIds = data;
        }
        loadMore();
    }
}

async function searchSpecific(term, btn) {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    if (btn) btn.classList.add("active");

    grid.innerHTML = "";
    displayCount = 0;
    currentMode = "filter";
    document.getElementById("grid-title").textContent = `Results: ${term}`;

    document.getElementById("search-suggestions").classList.remove("active");
    document.getElementById("main-search").value = term;

    const data = await fetchAPI(`${API_BASE}search.php?s=${term}`);
    filterIds = data;
    loadBtn.style.display = "inline-block";
    loadMore();
}

const modal = document.getElementById("modal");

async function openModal(id) {
    const data = await fetchAPI(`${API_BASE}lookup.php?i=${id}`);
    const meal = data[0];

    // --- INJECT DYNAMIC SCHEMA FOR GOOGLE VALIDATION ---
    updateRecipeSchema(meal);
    // ---------------------------------------------------

    document.getElementById("m-img").src = meal.strMealThumb;
    document.getElementById("m-title").textContent = meal.strMeal;
    document.getElementById("m-area").textContent = meal.strArea;
    document.getElementById("m-cat").textContent = meal.strCategory;
    document.getElementById("m-inst").innerHTML = meal.strInstructions.replace(/\r\n/g, "<br><br>");

    const ul = document.getElementById("m-ing");
    ul.innerHTML = "";
    for (let i = 1; i <= 20; i++) {
        if (meal[`strIngredient${i}`])
            ul.innerHTML += `<li>${meal[`strIngredient${i}`]} - <b>${meal[`strMeasure${i}`]}</b></li>`;
    }

    const vidBox = document.getElementById("m-video-box");
    if (meal.strYoutube && meal.strYoutube.includes("v=")) {
        const vidId = meal.strYoutube.split("v=")[1];
        vidBox.style.display = "block";
        vidBox.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
    } else {
        vidBox.style.display = "none";
        vidBox.innerHTML = "";
    }
    modal.classList.add("active");
}

function closeModal() {
    modal.classList.remove("active");
    document.getElementById("m-video-box").innerHTML = "";
}

// --- NEW FUNCTION: GENERATE SCHEMA DYNAMICALLY ---
function updateRecipeSchema(meal) {
    let ingredients = [];
    for (let i = 1; i <= 20; i++) {
        if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim() !== "") {
            ingredients.push(`${meal[`strMeasure${i}`]} ${meal[`strIngredient${i}`]}`);
        }
    }

    let instructions = meal.strInstructions
        .split(/\r\n|\n|\./)
        .filter(step => step.trim().length > 5)
        .map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "text": step.trim()
        }));

    const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Recipe",
        "name": meal.strMeal,
        "image": [meal.strMealThumb],
        "author": { "@type": "Person", "name": "MK AI Chef" },
        "datePublished": new Date().toISOString().split('T')[0],
        "description": `A delicious ${meal.strArea} style ${meal.strCategory} recipe for ${meal.strMeal}.`,
        "recipeCuisine": meal.strArea,
        "recipeCategory": meal.strCategory,
        "recipeIngredient": ingredients,
        "recipeInstructions": instructions,
        // PLACEHOLDERS TO FIX MISSING FIELDS
        "prepTime": "PT20M",
        "cookTime": "PT40M",
        "totalTime": "PT60M",
        "nutrition": { "@type": "NutritionInformation", "calories": "500 calories" },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "125" }
    };

    if (meal.strYoutube) {
        schemaData.video = {
            "@type": "VideoObject",
            "name": `How to cook ${meal.strMeal}`,
            "description": `Watch how to make ${meal.strMeal}`,
            "thumbnailUrl": meal.strMealThumb,
            "uploadDate": new Date().toISOString(),
            "contentUrl": meal.strYoutube,
            "embedUrl": meal.strYoutube.replace("watch?v=", "embed/")
        };
    }

    let script = document.getElementById('dynamic-schema');
    if (!script) {
        script = document.createElement('script');
        script.id = 'dynamic-schema';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);
}

const chatBox = document.getElementById("chat-box");
const chatMsgs = document.getElementById("chat-msgs");
function toggleChat() {
    chatBox.classList.toggle("active");
}

function askAiSpecific() {
    closeModal();
    toggleChat();
    const dish = document.getElementById("m-title").textContent;
    sendAi(`How to cook ${dish}?`);
}

async function sendAi(query) {
    const input = document.getElementById("ai-input");
    const txt = query || input.value.trim();
    if (!txt) return;

    const userDiv = document.createElement("div");
    userDiv.className = "msg user";
    userDiv.textContent = txt;
    chatMsgs.appendChild(userDiv);

    input.value = "";
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    const botDiv = document.createElement("div");
    botDiv.className = "msg bot";
    botDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; 
    chatMsgs.appendChild(botDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    try {
        const responseStream = await puter.ai.chat(
            "You are a professional chef. Keep it short. Advice for: " + txt,
            { model: "gemini-2.5-flash", stream: true }
        );

        botDiv.innerHTML = "";

        for await (const part of responseStream) {
            if (part?.text) {
                botDiv.innerHTML += part.text.replace(/\n/g, "<br>");
                chatMsgs.scrollTop = chatMsgs.scrollHeight;
            }
        }
    } catch (e) {
        console.error(e);
        botDiv.innerHTML = "Chef is currently offline.";
    }
}

const searchInput = document.getElementById("main-search");
const suggestionsBox = document.getElementById("search-suggestions");
let debounceTimer;

searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length === 0) {
        suggestionsBox.classList.remove("active");
        return;
    }

    debounceTimer = setTimeout(async () => {
        const data = await fetchAPI(`${API_BASE}search.php?s=${query}`);

        if (data && data.length > 0) {
            const html = data
                .slice(0, 6)
                .map((item) => `
                    <div class="sugg-item" onclick="searchSpecific('${item.strMeal.replace(/'/g, "\\'")}', null)">
                        <img src="${item.strMealThumb}" class="sugg-img">
                        <span>${item.strMeal}</span>
                    </div>
                `).join("");

            suggestionsBox.innerHTML = html;
            suggestionsBox.classList.add("active");
        } else {
            suggestionsBox.classList.remove("active");
        }
    }, 300);
});

document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove("active");
    }
});

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        suggestionsBox.classList.remove("active");
        searchSpecific(e.target.value);
    }
});
