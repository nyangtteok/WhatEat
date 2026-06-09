import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || "./data/whateat.db";

const RECIPE_API_BASE = "https://recipeapi.io/api/v1";
const RECIPE_API_KEY = process.env.RECIPE_API_KEY;

app.use(cors());
app.use(express.json());

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new (sqlite3.verbose().Database)(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      recipe_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

async function requestRecipeAPI(pathname) {
  if (!RECIPE_API_KEY) {
    throw new Error("RECIPE_API_KEY is missing");
  }

  const response = await fetch(`${RECIPE_API_BASE}${pathname}`, {
    headers: {
      Authorization: `Bearer ${RECIPE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`RecipeAPI request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeIngredients(item) {
  if (Array.isArray(item.ingredients)) {
    return item.ingredients
      .map((i) =>
        typeof i === "string" ? i : i.name || i.original || i.text || "",
      )
      .filter(Boolean);
  }

  if (Array.isArray(item.ingredient_list)) {
    return item.ingredient_list;
  }

  if (Array.isArray(item.extendedIngredients)) {
    return item.extendedIngredients
      .map((i) => i.original || i.name)
      .filter(Boolean);
  }

  if (Array.isArray(item.recipeIngredient)) {
    return item.recipeIngredient;
  }

  return [];
}

function normalizeRecipe(item) {
  return {
    id: item.id || item.recipe_id || item.uuid,
    name: item.name || item.title || "이름 없는 레시피",
    category: item.category || item.cuisine || item.meal_type || "기타",
    time: item.cook_time || item.ready_in_minutes || item.time || 30,
    ingredients: normalizeIngredients(item),
    difficulty: item.difficulty || "보통",
    description:
      item.description ||
      item.instructions ||
      item.summary ||
      "RecipeAPI에서 가져온 레시피입니다.",
    image: item.image || item.image_url || item.thumbnail || "",
  };
}

app.get("/api/health", (req, res) => {
  res.json({ message: "WhatEat backend is running" });
});

app.get("/api/recipes", async (req, res) => {
  try {
    const { q = "", ingredient = "", category = "" } = req.query;

    const params = new URLSearchParams();
    if (q) params.append("search", String(q));
    if (ingredient) params.append("ingredients", String(ingredient));
    if (category) params.append("category", String(category));

    const data = await requestRecipeAPI(`/recipes?${params.toString()}`);

    const list = Array.isArray(data)
      ? data
      : data.recipes || data.data || data.results || [];

    res.json(list.map(normalizeRecipe));
  } catch (err) {
    res.status(500).json({
      message: "RecipeAPI 호출 실패",
      error: err.message,
    });
  }
});

app.get("/api/recipes/random", async (req, res) => {
  try {
    const data = await requestRecipeAPI("/recipes/random");

    const recipe = data.recipe || data.data || data;
    res.json(normalizeRecipe(recipe));
  } catch (err) {
    res.status(500).json({
      message: "랜덤 레시피 조회 실패",
      error: err.message,
    });
  }
});

app.get("/api/favorites", (req, res) => {
  db.all("SELECT * FROM favorites ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "즐겨찾기 조회 실패" });
    res.json(rows);
  });
});

app.post("/api/favorites", (req, res) => {
  const { recipeId, recipeName } = req.body;

  if (!recipeId || !recipeName) {
    return res
      .status(400)
      .json({ message: "recipeId와 recipeName이 필요합니다." });
  }

  db.run(
    "INSERT INTO favorites (recipe_id, recipe_name) VALUES (?, ?)",
    [String(recipeId), recipeName],
    function (err) {
      if (err) return res.status(500).json({ message: "즐겨찾기 저장 실패" });

      res.status(201).json({
        id: this.lastID,
        recipe_id: recipeId,
        recipe_name: recipeName,
      });
    },
  );
});

app.delete("/api/favorites/:id", (req, res) => {
  db.run("DELETE FROM favorites WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "즐겨찾기 삭제 실패" });
    res.json({ message: "삭제 완료" });
  });
});

app.listen(PORT, () => {
  console.log(`WhatEat backend running on port ${PORT}`);
});
