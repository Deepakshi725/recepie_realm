// API Configuration
const API_KEY = '8075f86238ee4dd89fe1673b7d714847';
const API_BASE_URL = 'https://api.spoonacular.com/recipes/complexSearch';
const RANDOM_RECIPES_URL = 'https://api.spoonacular.com/recipes/random';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const recipeGrid = document.getElementById('recipeGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const recipeModal = document.getElementById('recipeModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close-modal');
const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
const cuisineFilter = document.getElementById('cuisineFilter');
const dishTypeFilter = document.getElementById('dishTypeFilter');
const timeFilter = document.getElementById('timeFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const searchSuggestions = document.getElementById('searchSuggestions');

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Event Listeners
searchBtn.addEventListener('click', () => handleSearch(false));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch(false);
});

// Add input event listener for suggestions and empty search handling
searchInput.addEventListener('input', debounce(async (e) => {
    const searchTerm = e.target.value.trim();
    
    // Show random recipes if search is empty
    if (searchTerm === '') {
        searchSuggestions.classList.add('hidden');
        await loadRandomRecipes();
        return;
    }

    // Show suggestions if search term is long enough
    if (searchTerm.length >= 2) {
        await showSuggestions(searchTerm);
    } else {
        searchSuggestions.classList.add('hidden');
    }
}, 300));

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

filterToggle.addEventListener('click', () => {
    filterPanel.classList.toggle('active');
});

applyFiltersBtn.addEventListener('click', () => {
    handleSearch(true);
});

closeModal.addEventListener('click', () => {
    recipeModal.classList.add('hidden');
});

// Close modal when clicking outside
recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
        recipeModal.classList.add('hidden');
    }
});

// Add event listeners for filters
[cuisineFilter, dishTypeFilter, timeFilter].forEach(filter => {
    filter.addEventListener('change', () => {
        if (searchInput.value) handleSearch();
    });
});

// Add event listener for page load
document.addEventListener('DOMContentLoaded', loadRandomRecipes);

// Functions
async function handleSearch(useFiltersOnly = false) {
    const searchTerm = searchInput.value.trim();
    if (!useFiltersOnly && !searchTerm) {
        await loadRandomRecipes();
        return;
    }

    showLoading();
    try {
        const queryParams = new URLSearchParams({
            apiKey: API_KEY,
            addRecipeInformation: true,
            number: 12
        });

        // Add search term if not using filters only
        if (!useFiltersOnly) {
            queryParams.append('query', searchTerm);
        }

        // Add filter parameters if they have values
        if (cuisineFilter.value) {
            queryParams.append('cuisine', cuisineFilter.value);
        }
        if (dishTypeFilter.value) {
            queryParams.append('type', dishTypeFilter.value);
        }
        if (timeFilter.value) {
            queryParams.append('maxReadyTime', timeFilter.value);
        }

        const response = await fetch(`${API_BASE_URL}?${queryParams}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displayRecipes(data.results);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error fetching recipes:', error);
        showError();
    } finally {
        hideLoading();
    }
}

async function loadRandomRecipes() {
    showLoading();
    try {
        const queryParams = new URLSearchParams({
            apiKey: API_KEY,
            number: 12,
            addRecipeInformation: true
        });

        const response = await fetch(`${RANDOM_RECIPES_URL}?${queryParams}`);
        const data = await response.json();
        
        if (data.recipes && data.recipes.length > 0) {
            displayRecipes(data.recipes);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error fetching random recipes:', error);
        showError();
    } finally {
        hideLoading();
    }
}

function displayRecipes(recipes) {
    recipeGrid.innerHTML = '';
    errorMessage.classList.add('hidden');

    recipes.forEach(recipe => {
        const card = createRecipeCard(recipe);
        recipeGrid.appendChild(card);
    });
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.title}" class="recipe-image">
        <div class="recipe-info">
            <h3 class="recipe-title">${recipe.title}</h3>
            <p class="recipe-time">Ready in ${recipe.readyInMinutes} minutes</p>
        </div>
    `;

    card.addEventListener('click', () => showRecipeDetails(recipe));
    return card;
}

async function showRecipeDetails(recipe) {
    showLoading();
    try {
        const response = await fetch(`https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${API_KEY}`);
        const detailedRecipe = await response.json();

        modalContent.innerHTML = `
            <div class="recipe-details">
                <h2>${detailedRecipe.title}</h2>
                <img src="${detailedRecipe.image}" alt="${detailedRecipe.title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px; margin: 20px 0;">
                
                <div class="recipe-meta">
                    <p><i class="fas fa-clock"></i> Ready in ${detailedRecipe.readyInMinutes} minutes</p>
                    <p><i class="fas fa-utensils"></i> ${detailedRecipe.servings} servings</p>
                    <p><i class="fas fa-globe"></i> ${detailedRecipe.cuisines.join(', ') || 'International'}</p>
                </div>

                <h3>Ingredients:</h3>
                <ul>
                    ${detailedRecipe.extendedIngredients.map(ing => `
                        <li>${ing.amount} ${ing.unit} ${ing.originalName}</li>
                    `).join('')}
                </ul>
                
                <h3>Instructions:</h3>
                <div class="instructions">
                    ${detailedRecipe.analyzedInstructions[0]?.steps.map(step => `
                        <div class="instruction-step">
                            <span class="step-number">${step.number}</span>
                            <p>${step.step}</p>
                        </div>
                    `).join('') || detailedRecipe.instructions}
                </div>
            </div>
        `;

        recipeModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        showError();
    } finally {
        hideLoading();
    }
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError() {
    errorMessage.classList.remove('hidden');
    recipeGrid.innerHTML = '';
}

async function showSuggestions(searchTerm) {
    try {
        const queryParams = new URLSearchParams({
            apiKey: API_KEY,
            query: searchTerm,
            number: 5,
            addRecipeInformation: false
        });

        const response = await fetch(`${API_BASE_URL}?${queryParams}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displaySuggestions(data.results);
        } else {
            searchSuggestions.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        searchSuggestions.classList.add('hidden');
    }
}

function displaySuggestions(recipes) {
    searchSuggestions.innerHTML = '';
    searchSuggestions.classList.remove('hidden');

    recipes.forEach(recipe => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.innerHTML = `
            <i class="fas fa-utensils"></i>
            <span>${recipe.title}</span>
        `;

        suggestionItem.addEventListener('click', () => {
            searchInput.value = recipe.title;
            searchSuggestions.classList.add('hidden');
            handleSearch(false);
        });

        searchSuggestions.appendChild(suggestionItem);
    });
}

// Initialize random recipes
loadRandomRecipes(); 