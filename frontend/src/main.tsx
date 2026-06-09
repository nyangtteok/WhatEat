import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Recipe = {
  id: number;
  name: string;
  category: string;
  time: number;
  ingredients: string[];
  difficulty: string;
  description: string;
};

type Favorite = {
  id: number;
  recipe_id: number;
  recipe_name: string;
  created_at?: string;
};

const API_BASE = "https://whateat-backend.onrender.com/api";
const RECENT_KEY = "whateat_recent_searches";

function App() {
  const [query, setQuery] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [category, setCategory] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRecipes(false);
    loadFavorites();

    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const updated = [
      trimmed,
      ...recentSearches.filter((item) => item !== trimmed),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const loadRecipes = async (saveHistory = true) => {
    const params = new URLSearchParams({ q: query, ingredient, category });
    const res = await fetch(`${API_BASE}/recipes?${params.toString()}`);
    const data = await res.json();
    setRecipes(data);

    if (saveHistory) {
      saveRecentSearch(query || ingredient || category);
    }
  };

  const searchByRecent = async (keyword: string) => {
    setQuery(keyword);
    setIngredient("");
    setCategory("");

    const params = new URLSearchParams({
      q: keyword,
      ingredient: "",
      category: "",
    });
    const res = await fetch(`${API_BASE}/recipes?${params.toString()}`);
    setRecipes(await res.json());
    saveRecentSearch(keyword);
  };

  const loadRandomRecipe = async () => {
    const res = await fetch(`${API_BASE}/recipes/random`);
    setRandomRecipe(await res.json());
  };

  const loadFavorites = async () => {
    const res = await fetch(`${API_BASE}/favorites`);
    setFavorites(await res.json());
  };

  const addFavorite = async (recipe: Recipe) => {
    const duplicated = favorites.some((item) => item.recipe_id === recipe.id);

    if (duplicated) {
      setMessage("이미 즐겨찾기에 저장된 레시피입니다.");
      return;
    }

    await fetch(`${API_BASE}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: recipe.id, recipeName: recipe.name }),
    });

    setMessage(`${recipe.name} 즐겨찾기 저장 완료`);
    loadFavorites();
  };

  const deleteFavorite = async (id: number) => {
    await fetch(`${API_BASE}/favorites/${id}`, { method: "DELETE" });
    setMessage("즐겨찾기 삭제 완료");
    loadFavorites();
  };

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  };

  return (
    <main className="container">
      <section className="hero">
        <p className="badge">Web Programming Project</p>
        <h1>오늘 뭐 먹지?</h1>
        <p>
          음식명, 재료, 음식 종류를 입력하면 조건에 맞는 레시피를 추천해주는
          서비스입니다.
        </p>
      </section>

      <section className="panel search-panel">
        <h2>레시피 검색</h2>
        <div className="form-grid">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="음식 이름 예: 김치볶음밥"
          />
          <input
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            placeholder="재료 예: 계란, 참치"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">전체 종류</option>
            <option value="Beef">Beef</option>
            <option value="Chicken">Chicken</option>
            <option value="Seafood">Seafood</option>
            <option value="Pasta">Pasta</option>
            <option value="Vegetarian">Vegetarian</option>
          </select>
          <button onClick={() => loadRecipes(true)}>검색</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>랜덤 추천</h2>
          <button className="secondary" onClick={loadRandomRecipe}>
            오늘의 메뉴 추천
          </button>
        </div>

        {randomRecipe && (
          <article className="random-card">
            <strong>{randomRecipe.name}</strong>
            <span>
              {randomRecipe.category} · {randomRecipe.time}분 ·{" "}
              {randomRecipe.difficulty}
            </span>
            <p>{randomRecipe.description}</p>
          </article>
        )}
      </section>

      <section className="panel">
        <h2>검색 결과</h2>
        <div className="recipe-list">
          {recipes.length === 0 ? (
            <p className="empty">검색 결과가 없습니다.</p>
          ) : (
            recipes.map((recipe) => (
              <article key={recipe.id} className="recipe-card">
                <div>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description}</p>
                  <p className="meta">
                    {recipe.category} · {recipe.time}분 · {recipe.difficulty}
                  </p>
                  <p className="ingredients">
                    재료:{" "}
                    {recipe.ingredients
                      .map((i: any) => (typeof i === "string" ? i : i.name))
                      .join(", ")}
                  </p>
                </div>
                <button onClick={() => addFavorite(recipe)}>즐겨찾기</button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-title">
            <h2>최근 검색 기록</h2>
            <button className="secondary" onClick={clearRecent}>
              초기화
            </button>
          </div>

          {recentSearches.length === 0 ? (
            <p className="empty">최근 검색 기록이 없습니다.</p>
          ) : (
            <ul className="simple-list">
              {recentSearches.map((item) => (
                <li key={item}>
                  <button
                    className="link-button"
                    onClick={() => searchByRecent(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="note">localStorage를 사용하여 브라우저에 저장됩니다.</p>
        </div>

        <div className="panel">
          <h2>즐겨찾기</h2>

          {favorites.length === 0 ? (
            <p className="empty">저장된 즐겨찾기가 없습니다.</p>
          ) : (
            <ul className="simple-list">
              {favorites.map((f) => (
                <li key={f.id}>
                  <span>{f.recipe_name}</span>
                  <button
                    className="danger"
                    onClick={() => deleteFavorite(f.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="note">SQLite DBMS에 저장됩니다.</p>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
