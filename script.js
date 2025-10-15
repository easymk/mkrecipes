const RandomMeal = "https://www.themealdb.com/api/json/v1/1/random.php";
const SearchMeal = "https://www.themealdb.com/api/json/v1/1/search.php?s=";

const heromeals = document.querySelector("#hero-meal-image");
const mealContainer = document.querySelector("#meal-container");
const loader = document.querySelector("#loader");
const searchInput = document.querySelector(".search-btn");

const panel = document.querySelector("#instruction-panel");
const panelTitle = document.querySelector("#panel-title");
const panelText = document.querySelector("#panel-text");
const closePanel = document.querySelector("#close-panel");



function showLoader() {
  loader.style.display = "flex";
  mealContainer.style.opacity = "0.4"; 
}

function hideLoader() {
  loader.style.display = "none";
  mealContainer.style.opacity = "1";
}



function getHeroMeals() {
  for (let i = 0; i < 5; i++) {
    fetch(RandomMeal)
      .then(res => res.json())
      .then(response => {
        const meal = response.meals[0];
        const img = document.createElement("img");
        img.src = meal.strMealThumb;
        img.alt = meal.strMeal;
        heromeals.appendChild(img);
      })
      .catch(err => console.error("Hero fetch error:", err));
  }
}

getHeroMeals();



function getcards(query = "") {
  showLoader();
  mealContainer.innerHTML = "";

  const url = query ? `${SearchMeal}${query}` : RandomMeal;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      hideLoader();

      const meals = query ? data.meals : [data.meals[0]];

      if (!meals) {
        mealContainer.innerHTML = "<p>No recipes found.</p>";
        return;
      }

      meals.forEach((meal) => {
        const carddiv = document.createElement("div");
        carddiv.classList.add("card-1");

        const mealtitle = document.createElement("h4");
        mealtitle.textContent = meal.strMeal;

        const mealcardimg = document.createElement("img");
        mealcardimg.src = meal.strMealThumb;
        mealcardimg.alt = meal.strMeal;

        const cardBtns = document.createElement("div");
        cardBtns.classList.add("card-btns");

        const cardbtn1 = document.createElement("button");
        cardbtn1.textContent = "View Instructions";

        const cardbtn2 = document.createElement("button");
        cardbtn2.textContent = "See Ingredient";

        cardbtn1.addEventListener("click", () => {
          panelTitle.textContent = meal.strMeal;
          panelText.textContent = meal.strInstructions;
          panel.classList.add("active");
        });

        cardbtn2.addEventListener("click", () => {
          const ingredients = [];
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ing) ingredients.push(`${ing} - ${measure}`);
          }
          panelTitle.textContent = meal.strMeal + " Ingredients";
          panelText.innerHTML = ingredients.join("<br>");
          panel.classList.add("active");
        });

        cardBtns.appendChild(cardbtn1);
        cardBtns.appendChild(cardbtn2);

        carddiv.appendChild(mealtitle);
        carddiv.appendChild(mealcardimg);
        carddiv.appendChild(cardBtns);

        mealContainer.appendChild(carddiv);
      });
    })
    .catch(error => {
      console.error("Error fetching meals:", error);
      hideLoader();
    });
}



function loadInitialMeals() {
  mealContainer.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    getcards();
  }
}

loadInitialMeals();



searchInput.addEventListener("input", (e) => {
  const value = e.target.value.trim();
  if (value.length >= 2) {
    getcards(value);
  } else if (value.length === 0) {
    loadInitialMeals();
  }
});



closePanel.addEventListener("click", () => {
  panel.classList.remove("active");
});
