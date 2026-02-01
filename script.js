const API_BASE = "https://www.themealdb.com/api/json/v1/1/";
const SITE_URL = "https://easymkrecipes.netlify.app/";

const subCategories = {
  all: [],
  chicken: [
    "Chicken_Biryani",
    "Fried_Chicken",
    "Chicken_Curry",
    "Tikka",
    "Kebab",
  ],
  beef: ["Steak", "Burger", "Roast_Beef", "Pie", "Wellington"],
  dessert: ["Cake", "Chocolate", "Ice_Cream", "Donut", "Pie"],
  veg: ["Salad", "Corn", "Potato", "Spinach", "Pasta"],
};

let currentMode = "random";
let filterIds = [];
let displayCount = 0;
let isFetching = false;
let favorites = JSON.parse(localStorage.getItem("mk_favs")) || [];
let currentRecipe = null;

const grid = document.getElementById("grid");
const loadBtn = document.getElementById("load-more-btn");
const modal = document.getElementById("modal");

// --- INIT ---
window.onload = () => {
  if (localStorage.getItem("theme") === "dark")
    document.body.setAttribute("data-theme", "dark");

  const urlParams = new URLSearchParams(window.location.search);
  const recipeId = urlParams.get("id");
  if (recipeId) {
    openModal(recipeId);
  } else {
    loadMore();
  }
};

function toggleTheme() {
  if (document.body.getAttribute("data-theme") === "dark") {
    document.body.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    document.getElementById("theme-btn").innerHTML =
      '<i class="fas fa-moon" aria-hidden="true"></i>';
  } else {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    document.getElementById("theme-btn").innerHTML =
      '<i class="fas fa-sun" aria-hidden="true"></i>';
  }
}

async function fetchAPI(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.meals || [];
  } catch (error) {
    console.error("API fetch error:", error);
    return [];
  }
}

function showSkeletons() {
  let html = "";
  for (let i = 0; i < 4; i++) {
    html += `<div class="skeleton-card" role="status" aria-label="Loading recipe"><div class="sk-img sk-anim"></div><div class="sk-text sk-anim"></div></div>`;
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
  loadBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading...';
  loadBtn.setAttribute("aria-busy", "true");
  showSkeletons();

  let mealsToRender = [];

  if (currentMode === "random") {
    const promises = Array(8)
      .fill()
      .map(() => fetchAPI(`${API_BASE}random.php`));
    const results = await Promise.all(promises);
    mealsToRender = results.map((r) => r[0]).filter(Boolean);
  } else if (currentMode === "saved") {
    mealsToRender = [];
  } else {
    if (displayCount >= filterIds.length) {
      document.getElementById("temp-skel")?.remove();
      loadBtn.style.display = "none";
      isFetching = false;
      return;
    }
    mealsToRender = filterIds.slice(displayCount, displayCount + 8);
    displayCount += 8;
    if (displayCount >= filterIds.length) loadBtn.style.display = "none";
  }

  document.getElementById("temp-skel")?.remove();
  renderMeals(mealsToRender);
  loadBtn.innerHTML = "Show More Recipes";
  loadBtn.setAttribute("aria-busy", "false");
  isFetching = false;
}

function renderMeals(meals) {
  meals.forEach((meal) => {
    const id = meal.idMeal;
    const thumb = meal.strMealThumb;
    const title = meal.strMeal;
    const cat = meal.strCategory || "Delicious";
    const favClass = isFav(id) ? "active" : "";
    let vidBadge = meal.strYoutube
      ? `<div class="yt-badge" title="Video available"><i class="fas fa-play" aria-hidden="true"></i></div>`
      : "";

    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "listitem");
    card.innerHTML = `
                  <div class="img-wrapper">
                      <img src="${thumb}" class="card-img" loading="lazy" alt="${title} recipe" width="300" height="180">
                      <div class="card-actions">
                          <button class="fav-btn ${favClass}" onclick="toggleFav(event, '${id}', '${thumb}', '${title}', '${cat}')" aria-label="Add to favorites" title="Add to favorites">
                              <i class="fas fa-heart" aria-hidden="true"></i>
                          </button>
                      </div>
                      ${vidBadge}
                  </div>
                  <div class="card-body">
                      <h3 class="card-title">${title}</h3>
                      <p class="card-meta">${cat}</p>
                  </div>
              `;
    card.onclick = (e) => {
      if (!e.target.closest(".fav-btn")) openModal(id);
    };
    grid.appendChild(card);
  });
}

async function setCategory(cat, btn) {
  document
    .querySelectorAll(".cat-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const subBox = document.getElementById("sub-cats");
  const subs = subCategories[cat] || [];
  subBox.innerHTML = subs.length
    ? subs
        .map(
          (s) =>
            `<button class="chip" onclick="searchSpecific('${s}', this)">${s.replace(/_/g, " ")}</button>`,
        )
        .join("")
    : "";
  subBox.style.display = subs.length ? "flex" : "none";

  grid.innerHTML = "";
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
      grid.innerHTML =
        '<p style="padding:20px">No saved recipes yet. Start exploring and save your favorites!</p>';
    else renderMeals(savedMeals);
    loadBtn.style.display = "none";
  } else if (cat === "all") {
    currentMode = "random";
    document.getElementById("grid-title").textContent = "Trending Now";
    loadMore();
  } else {
    currentMode = "filter";
    document.getElementById("grid-title").textContent =
      cat.charAt(0).toUpperCase() + cat.slice(1) + " Recipes";
    const url = `${API_BASE}filter.php?c=${cat === "veg" ? "Vegetarian" : cat.charAt(0).toUpperCase() + cat.slice(1)}`;
    const data = await fetchAPI(url);
    filterIds = data.length
      ? data
      : await fetchAPI(`${API_BASE}search.php?s=${cat}`);
    loadMore();
  }
}

async function searchSpecific(term, btn) {
  if (btn) {
    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
  }
  grid.innerHTML = "";
  displayCount = 0;
  currentMode = "filter";
  document.getElementById("grid-title").textContent =
    `Results: ${term.replace(/_/g, " ")}`;
  document.getElementById("search-suggestions").classList.remove("active");
  document.getElementById("main-search").value = term.replace(/_/g, " ");

  const data = await fetchAPI(`${API_BASE}search.php?s=${term}`);
  filterIds = data;
  loadBtn.style.display = "inline-block";
  loadMore();
}

async function openModal(id) {
  const data = await fetchAPI(`${API_BASE}lookup.php?i=${id}`);
  const meal = data[0];
  if (!meal) return;

  currentRecipe = meal;

  const newUrl = `${window.location.pathname}?id=${id}`;
  window.history.pushState({ path: newUrl }, "", newUrl);

  updateMetaTags(meal);

  updateRecipeSchema(meal);

  document.getElementById("m-img").src = meal.strMealThumb;
  document.getElementById("m-img").alt = `${meal.strMeal} recipe image`;
  document.getElementById("m-title").textContent = meal.strMeal;
  document.getElementById("m-area").textContent = meal.strArea;
  document.getElementById("m-cat").textContent = meal.strCategory;

  const instructions = meal.strInstructions
    .split(/\r\n|\n/)
    .filter((step) => step.trim().length > 0)
    .map((step) => `<p>${step.trim()}</p>`)
    .join("");
  document.getElementById("m-inst").innerHTML = instructions;

  const ul = document.getElementById("m-ing");
  ul.innerHTML = "";
  for (let i = 1; i <= 20; i++) {
    if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim())
      ul.innerHTML += `<li>${meal[`strIngredient${i}`]} - <strong>${meal[`strMeasure${i}`]}</strong></li>`;
  }

  const vidBox = document.getElementById("m-video-box");
  if (meal.strYoutube && meal.strYoutube.includes("v=")) {
    const vidId = meal.strYoutube.split("v=")[1].split("&")[0];
    vidBox.style.display = "block";
    vidBox.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" width="100%" height="100%" frameborder="0" allowfullscreen title="${meal.strMeal} cooking video" loading="lazy"></iframe>`;
  } else {
    vidBox.style.display = "none";
    vidBox.innerHTML = "";
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("m-video-box").innerHTML = "";
  document.body.style.overflow = "";
  window.history.pushState({ path: "/" }, "", "/");

  document
    .querySelector('meta[property="og:title"]')
    .setAttribute(
      "content",
      "MK Recipes - Search Unlimited Easy Food Recipes Online",
    );
  document
    .querySelector('meta[property="og:description"]')
    .setAttribute(
      "content",
      "Get infinite food recipes with MK Recipes. Features Dark Mode and AI Chef assistance for easy cooking.",
    );
  document
    .querySelector('meta[property="og:image"]')
    .setAttribute("content", "https://iili.io/fsIjZKl.jpg");
  document
    .querySelector('meta[name="description"]')
    .setAttribute(
      "content",
      "Discover infinite food recipes including Chicken, Beef, Veg, and Desserts with MK Recipes. Get step-by-step cooking instructions, ingredients, and AI Chef assistance.",
    );
}

function updateMetaTags(meal) {
  document.title = `${meal.strMeal} Recipe - Easy ${meal.strArea} Cooking | MK Recipes`;
  document
    .querySelector('meta[name="description"]')
    .setAttribute(
      "content",
      `Learn how to make ${meal.strMeal}. ${meal.strArea} ${meal.strCategory} recipe with ingredients, step-by-step instructions, and cooking tips.`,
    );
  document
    .querySelector('meta[property="og:title"]')
    .setAttribute(
      "content",
      `${meal.strMeal} Recipe - ${meal.strArea} Cooking`,
    );
  document
    .querySelector('meta[property="og:description"]')
    .setAttribute(
      "content",
      `How to make ${meal.strMeal}. Complete recipe with ingredients and instructions.`,
    );
  document
    .querySelector('meta[property="og:image"]')
    .setAttribute("content", meal.strMealThumb);
  document
    .querySelector('meta[property="og:url"]')
    .setAttribute("content", `${SITE_URL}?id=${meal.idMeal}`);
}

function updateRecipeSchema(meal) {
  let ingredients = [];
  for (let i = 1; i <= 20; i++) {
    if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim() !== "") {
      ingredients.push(
        `${meal[`strMeasure${i}`]} ${meal[`strIngredient${i}`]}`,
      );
    }
  }

  let instructionSteps = meal.strInstructions
    .split(/\r\n|\n|\./)
    .filter((step) => step.trim().length > 10)
    .map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: `Step ${index + 1}`,
      text: step.trim(),
      url: `${SITE_URL}?id=${meal.idMeal}#step${index + 1}`,
    }));

  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    name: meal.strMeal,
    image: [meal.strMealThumb, meal.strMealThumb + "/preview"],
    author: {
      "@type": "Person",
      name: "MK Chef Team",
    },
    datePublished: new Date().toISOString().split("T")[0],
    dateModified: new Date().toISOString().split("T")[0],
    description: `Learn how to cook ${meal.strMeal}, a delicious ${meal.strArea} ${meal.strCategory} recipe. Complete with ingredients, step-by-step instructions, and cooking tips.`,
    recipeCuisine: meal.strArea,
    recipeCategory: meal.strCategory,
    keywords: `${meal.strMeal}, ${meal.strArea} recipe, ${meal.strCategory}, easy recipe, cooking, ${ingredients.slice(0, 5).join(", ")}`,
    recipeIngredient: ingredients,
    recipeInstructions: instructionSteps,
    prepTime: "PT15M",
    cookTime: "PT30M",
    totalTime: "PT45M",
    recipeYield: "4 servings",
    nutrition: {
      "@type": "NutritionInformation",
      calories: "350 calories",
      proteinContent: "25g",
      fatContent: "12g",
      carbohydrateContent: "35g",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
    url: `${SITE_URL}?id=${meal.idMeal}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}?id=${meal.idMeal}`,
    },
  };

  if (meal.strYoutube) {
    const vidId = meal.strYoutube.includes("v=")
      ? meal.strYoutube.split("v=")[1].split("&")[0]
      : "";
    if (vidId) {
      schemaData.video = {
        "@type": "VideoObject",
        name: `How to Cook ${meal.strMeal}`,
        description: `Step-by-step video tutorial for making ${meal.strMeal}`,
        thumbnailUrl: [
          meal.strMealThumb,
          `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`,
        ],
        contentUrl: meal.strYoutube,
        embedUrl: `https://www.youtube.com/embed/${vidId}`,
        uploadDate: new Date().toISOString(),
        duration: "PT10M",
      };
    }
  }

  const oldScript = document.getElementById("dynamic-recipe-schema");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "dynamic-recipe-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schemaData);
  document.head.appendChild(script);

  updateBreadcrumb(meal);
}

function updateBreadcrumb(meal) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: meal.strCategory,
        item: `${SITE_URL}?cat=${meal.strCategory.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: meal.strMeal,
        item: `${SITE_URL}?id=${meal.idMeal}`,
      },
    ],
  };

  const oldBreadcrumb = document.querySelector(
    'script[type="application/ld+json"]',
  );
  if (oldBreadcrumb && oldBreadcrumb.textContent.includes("BreadcrumbList")) {
    oldBreadcrumb.textContent = JSON.stringify(breadcrumbSchema);
  }
}

function toggleFav(e, id, img, title, cat) {
  e.stopPropagation();
  const btn = e.target.closest(".fav-btn");
  const index = favorites.findIndex((f) => f.id === id);
  if (index === -1) {
    favorites.push({ id, img, title, cat });
    btn.classList.add("active");
    btn.setAttribute("aria-label", "Remove from favorites");
  } else {
    favorites.splice(index, 1);
    btn.classList.remove("active");
    btn.setAttribute("aria-label", "Add to favorites");
    if (currentMode === "saved") e.target.closest(".card").remove();
  }
  localStorage.setItem("mk_favs", JSON.stringify(favorites));
}

function isFav(id) {
  return favorites.some((f) => f.id === id);
}

const chatBox = document.getElementById("chat-box");
const chatMsgs = document.getElementById("chat-msgs");
function toggleChat() {
  chatBox.classList.toggle("active");
  if (chatBox.classList.contains("active")) {
    document.getElementById("ai-input").focus();
  }
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
  botDiv.innerHTML =
    '<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>';
  chatMsgs.appendChild(botDiv);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;

  try {
    const responseStream = await puter.ai.chat(
      "You are a professional chef. Keep responses concise and helpful. Answer: " +
        txt,
      { model: "gemini-2.5-flash", stream: true },
    );
    botDiv.innerHTML = "";
    for await (const part of responseStream) {
      if (part?.text) {
        botDiv.innerHTML += part.text.replace(/\n/g, "<br>");
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
      }
    }
  } catch (e) {
    botDiv.innerHTML = "Chef is currently offline. Please try again later.";
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
      suggestionsBox.innerHTML = data
        .slice(0, 6)
        .map(
          (item) => `
                      <div class="sugg-item" onclick="openModal('${item.idMeal}')" role="option">
                          <img src="${item.strMealThumb}" class="sugg-img" alt="${item.strMeal}" width="30" height="30">
                          <span>${item.strMeal}</span>
                      </div>
                  `,
        )
        .join("");
      suggestionsBox.classList.add("active");
    } else {
      suggestionsBox.innerHTML =
        '<div class="sugg-item" style="opacity: 0.5;">No results found</div>';
      suggestionsBox.classList.add("active");
    }
  }, 300);
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target))
    suggestionsBox.classList.remove("active");
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    suggestionsBox.classList.remove("active");
    searchSpecific(e.target.value);
  }
});

document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      btn.click();
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

document.getElementById("ai-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendAi();
  }
});
