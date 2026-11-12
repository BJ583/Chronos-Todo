const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

let win = null;
let SQL = null;
let db = null;
let dbPath = null;

function appDirectory() {
  if (!app.isPackaged) return path.resolve(__dirname, "../..");
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
}

app.setPath("userData", path.join(appDirectory(), "userdata"));

async function initDb() {
  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "../../node_modules/sql.js/dist", file)
  });
  dbPath = path.join(appDirectory(), "todo_data.sqlite3");
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  migrate();
  saveDb();
}

function saveDb() {
  if (!db || !dbPath) return;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function rows(sql, params = []) {
  const stmt = db.prepare(sql, params);
  const output = [];
  while (stmt.step()) output.push(stmt.getAsObject());
  stmt.free();
  return output;
}

function one(sql, params = []) {
  return rows(sql, params)[0] || null;
}

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      duration REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      stashed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY(list_id) REFERENCES lists(id) ON DELETE CASCADE
    );
  `);
  const list = one("SELECT id FROM lists LIMIT 1");
  if (!list) {
    db.run("INSERT INTO lists(name, created_at) VALUES(?, ?)", ["\u9ed8\u8ba4\u5217\u8868", nowIso()]);
  }
}

function lastInsertId() {
  return one("SELECT last_insert_rowid() AS id").id;
}

function insertAndGetId(sql, params = []) {
  db.run(sql, params);
  const id = lastInsertId();
  saveDb();
  return id;
}

function normalizeTask(task) {
  return {
    id: Number(task.id),
    list_id: Number(task.list_id),
    name: task.name || "",
    due_date: task.due_date || "",
    duration: Number(task.duration || 0),
    notes: task.notes || "",
    tags: task.tags || "",
    completed: Number(task.completed || 0),
    stashed: Number(task.stashed || 0),
    created_at: task.created_at || "",
    sort_order: Number(task.sort_order || 0)
  };
}

function allTasks(listId) {
  return rows("SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_order, id", [listId]).map(normalizeTask);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#F6F9FF",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once("ready-to-show", () => win.show());
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

ipcMain.handle("todo:getState", () => {
  const lists = rows("SELECT * FROM lists ORDER BY created_at, id");
  const activeListId = lists[0]?.id || null;
  return { lists, activeListId, tasks: activeListId ? allTasks(activeListId) : [] };
});

ipcMain.handle("todo:getTasks", (_event, listId) => allTasks(listId));

ipcMain.handle("todo:addList", (_event, name) => {
  const id = insertAndGetId("INSERT INTO lists(name, created_at) VALUES(?, ?)", [String(name || "\u65b0\u5217\u8868").trim() || "\u65b0\u5217\u8868", nowIso()]);
  return { id };
});

ipcMain.handle("todo:renameList", (_event, id, name) => {
  run("UPDATE lists SET name = ? WHERE id = ?", [String(name || "\u672a\u547d\u540d\u5217\u8868").trim() || "\u672a\u547d\u540d\u5217\u8868", id]);
});

ipcMain.handle("todo:deleteList", (_event, id) => {
  run("DELETE FROM lists WHERE id = ?", [id]);
});

ipcMain.handle("todo:addTask", (_event, listId) => {
  const maxOrder = one("SELECT COALESCE(MAX(sort_order), 0) AS value FROM tasks WHERE list_id = ?", [listId]).value;
  const id = insertAndGetId(
    "INSERT INTO tasks(list_id, name, due_date, duration, notes, tags, completed, stashed, created_at, sort_order) VALUES(?, '', '', 0, '', '', 0, 0, ?, ?)",
    [listId, nowIso(), Number(maxOrder || 0) + 1]
  );
  return normalizeTask(one("SELECT * FROM tasks WHERE id = ?", [id]));
});

ipcMain.handle("todo:updateTask", (_event, id, fields) => {
  const allowed = ["name", "due_date", "duration", "notes", "tags", "completed", "stashed", "sort_order"];
  const entries = Object.entries(fields || {}).filter(([key]) => allowed.includes(key));
  if (!entries.length) return;
  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  run(`UPDATE tasks SET ${sets} WHERE id = ?`, [...entries.map(([, value]) => value), id]);
});

ipcMain.handle("todo:deleteTask", (_event, id) => {
  run("DELETE FROM tasks WHERE id = ?", [id]);
});

ipcMain.handle("todo:reorder", (_event, listId, ids) => {
  db.run("BEGIN TRANSACTION");
  ids.forEach((id, index) => {
    db.run("UPDATE tasks SET sort_order = ? WHERE id = ? AND list_id = ?", [index + 1, id, listId]);
  });
  db.run("COMMIT");
  saveDb();
});

ipcMain.handle("todo:stashTask", (_event, id, stashed) => {
  run("UPDATE tasks SET stashed = ? WHERE id = ?", [stashed ? 1 : 0, id]);
});

app.whenReady().then(async () => {
  await initDb();
  createWindow();
});

app.on("window-all-closed", () => {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
  app.quit();
  setTimeout(() => process.exit(0), 250).unref();
});

app.on("before-quit", () => {
  if (db) saveDb();
});

app.on("will-quit", () => {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
});

