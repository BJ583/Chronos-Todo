import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const L = {
  manual: "\u624b\u52a8\u6392\u5e8f",
  nameSort: "\u6309\u540d\u79f0",
  dueSort: "\u6309\u622a\u6b62",
  createdSort: "\u6309\u521b\u5efa",
  durationSort: "\u6309\u65f6\u957f",
  unnamedTask: "\u672a\u547d\u540d\u4efb\u52a1",
  newTask: "\u65b0\u4efb\u52a1",
  editTask: "\u7f16\u8f91\u4efb\u52a1",
  taskName: "\u4efb\u52a1\u540d\u79f0",
  inputTaskName: "\u8f93\u5165\u4efb\u52a1\u540d\u79f0",
  durationH: "\u9884\u8ba1\u65f6\u957f h",
  dueDate: "\u622a\u6b62\u65e5\u671f",
  duePlaceholder: "\u53ef\u9009\uff0c\u5982 2026-07-02 18:00",
  tags: "\u6807\u7b7e",
  tagsPlaceholder: "\u53ef\u9009\uff0c\u7528\u9017\u53f7\u5206\u9694",
  notes: "\u5907\u6ce8",
  optional: "\u53ef\u9009",
  delete: "\u5220\u9664",
  cancel: "\u53d6\u6d88",
  save: "\u4fdd\u5b58",
  edit: "\u7f16\u8f91",
  completeTask: "\u5b8c\u6210\u4efb\u52a1",
  deadline: "\u622a\u6b62",
  overdue: "\u5df2\u903e\u671f",
  remaining: "\u5269\u4f59",
  day: "\u5929",
  hour: "\u5c0f\u65f6",
  minute: "\u5206\u949f",
  workspace: "WORKSPACE",
  allTasks: "\u5168\u90e8\u4efb\u52a1",
  localApp: "Electron + React + SQLite\uff0c\u672c\u5730\u514d\u5b89\u88c5\u8fd0\u884c",
  search: "\u641c\u7d22\u4efb\u52a1...",
  activeHours: "\u6d3b\u8dc3\u65f6\u957f",
  totalHours: "\u603b\u8ba1\u65f6\u957f",
  addTask: "+ \u65b0\u589e\u4efb\u52a1",
  localPlan: "\u672c\u5730\u4efb\u52a1\u89c4\u5212",
  lists: "\u5217\u8868",
  add: "\u6dfb\u52a0",
  rename: "\u6539\u540d",
  allTags: "\u5168\u90e8\u6807\u7b7e",
  taskList: "\u4efb\u52a1\u5217\u8868",
  items: "\u9879",
  empty: "\u8fd8\u6ca1\u6709\u6d3b\u8dc3\u4efb\u52a1\uff0c\u70b9\u51fb\u53f3\u4e0a\u89d2\u65b0\u589e\u4efb\u52a1\u3002",
  stash: "\u6682\u5b58\u7bb1",
  draft: "\u8349\u7a3f\u6a21\u5f0f",
  moveBack: "\u79fb\u56de",
  stashEmpty: "\u62d6\u5165\u8fd9\u91cc\u5373\u53ef\u6682\u5b58",
  stashTotal: "\u6682\u5b58\u603b\u8ba1",
  addList: "\u6dfb\u52a0\u5217\u8868",
  renameList: "\u4fee\u6539\u5217\u8868",
  listName: "\u5217\u8868\u540d\u79f0",
  inputListName: "\u8f93\u5165\u5217\u8868\u540d\u79f0",
  deleteConfirm: "Delete this list and all tasks inside?"
};

const sortModes = [
  ["custom", L.manual],
  ["name", L.nameSort],
  ["due", L.dueSort],
  ["created", L.createdSort],
  ["duration", L.durationSort]
];

function fmtHours(value) {
  const number = Math.max(0, Number(value || 0));
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function parseDue(value) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? new Date(`${normalized}T23:59`) : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countdown(value) {
  const due = parseDue(value);
  if (!due) return "";
  const diff = due.getTime() - Date.now();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const body = days ? `${days}${L.day} ${hours}${L.hour}` : hours ? `${hours}${L.hour} ${minutes}${L.minute}` : `${minutes}${L.minute}`;
  return diff < 0 ? `${L.overdue} ${body}` : `${L.remaining} ${body}`;
}

function splitTags(tags) {
  return String(tags || "").split(/[,\uFF0C]/).map((tag) => tag.trim()).filter(Boolean);
}

function sortTasks(tasks, mode) {
  const active = [...tasks];
  const byId = (a, b) => a.id - b.id;
  if (mode === "name") return active.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-CN") || byId(a, b));
  if (mode === "due") return active.sort((a, b) => (parseDue(a.due_date)?.getTime() || Infinity) - (parseDue(b.due_date)?.getTime() || Infinity) || byId(a, b));
  if (mode === "created") return active.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || byId(a, b));
  if (mode === "duration") return active.sort((a, b) => Number(a.duration || 0) - Number(b.duration || 0) || byId(a, b));
  return active.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || byId(a, b));
}

function TaskEditor({ task, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => ({
    name: task?.name || "",
    duration: fmtHours(task?.duration || 0),
    due_date: task?.due_date || "",
    tags: task?.tags || "",
    notes: task?.notes || ""
  }));
  const nameRef = useRef(null);
  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 40); }, []);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = () => onSave({
    name: form.name.trim() || L.unnamedTask,
    duration: Math.max(0, Number(form.duration || 0)),
    due_date: form.due_date.trim(),
    tags: form.tags.trim(),
    notes: form.notes.trim()
  });
  return (
    <div className="modalMask" onMouseDown={onCancel}>
      <div className="editor" onMouseDown={(event) => event.stopPropagation()}>
        <div className="editorHeader"><div><p>{L.editTask}</p><h2>{form.name || L.newTask}</h2></div><button className="iconButton" onClick={onCancel}>x</button></div>
        <label>{L.taskName}<input ref={nameRef} value={form.name} placeholder={L.inputTaskName} onChange={(event) => update("name", event.target.value)} /></label>
        <div className="editorGrid">
          <label>{L.durationH}<input type="number" min="0" step="0.5" value={form.duration} onChange={(event) => update("duration", event.target.value)} /></label>
          <label>{L.dueDate}<input value={form.due_date} placeholder={L.duePlaceholder} onChange={(event) => update("due_date", event.target.value)} /></label>
        </div>
        <label>{L.tags}<input value={form.tags} placeholder={L.tagsPlaceholder} onChange={(event) => update("tags", event.target.value)} /></label>
        <label>{L.notes}<textarea value={form.notes} placeholder={L.optional} onChange={(event) => update("notes", event.target.value)} /></label>
        <div className="editorActions">{onDelete && <button className="ghost danger" onClick={onDelete}>{L.delete}</button>}<span /><button className="ghost" onClick={onCancel}>{L.cancel}</button><button className="primary" onClick={submit}>{L.save}</button></div>
      </div>
    </div>
  );
}

function ListNameDialog({ title, initialValue = "", onCancel, onSave }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, []);
  const submit = () => { const name = value.trim(); if (name) onSave(name); };
  return (
    <div className="modalMask" onMouseDown={onCancel}>
      <div className="editor listEditor" onMouseDown={(event) => event.stopPropagation()}>
        <div className="editorHeader"><div><p>LIST</p><h2>{title}</h2></div><button className="iconButton" onClick={onCancel}>x</button></div>
        <label>{L.listName}<input ref={inputRef} value={value} placeholder={L.inputListName} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} /></label>
        <div className="editorActions twoActions"><span /><button className="ghost" onClick={onCancel}>{L.cancel}</button><button className="primary" onClick={submit}>{L.save}</button></div>
      </div>
    </div>
  );
}

function TaskCard({ task, isDragging, isCompleting, onPointerDown, onEdit, onComplete }) {
  const firstTag = splitTags(task.tags)[0];
  const dueText = task.due_date ? countdown(task.due_date) || task.due_date : "";
  const details = [task.notes, task.due_date && `${L.deadline}: ${task.due_date}`].filter(Boolean).join("\n");
  return (
    <article className={`taskCard ${isDragging ? "dragSource" : ""} ${isCompleting ? "completePop" : ""}`} onPointerDown={onPointerDown} title={details}>
      <button className="done" onPointerDown={(event) => event.stopPropagation()} onClick={onComplete} aria-label={L.completeTask} />
      <div className="taskMain"><strong>{task.name || L.unnamedTask}</strong><div className="chips"><span className="chip purple">{fmtHours(task.duration)}h</span>{firstTag && <span className="chip cyan">* {firstTag}</span>}{dueText && <span className="chip soft">{dueText}</span>}</div></div>
      <button className="editOnly" onPointerDown={(event) => event.stopPropagation()} onClick={onEdit}>{L.edit}</button>
    </article>
  );
}

function StashItem({ task, onRestore, onPointerDown }) {
  return <article className="stashItem" onPointerDown={onPointerDown}><strong>{task.name || L.unnamedTask}</strong><span>{fmtHours(task.duration)}h</span><button onPointerDown={(event) => event.stopPropagation()} onClick={onRestore}>{L.moveBack}</button></article>;
}

function App() {
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [sortMode, setSortMode] = useState("custom");
  const [editor, setEditor] = useState(null);
  const [listDialog, setListDialog] = useState(null);
  const [drag, setDrag] = useState(null);
  const [completeId, setCompleteId] = useState(null);
  const gridRef = useRef(null);
  const stashRef = useRef(null);
  const stashListRef = useRef(null);

  useEffect(() => {
    window.todoApi.getState().then((state) => { setLists(state.lists || []); setListId(state.activeListId || null); setTasks(state.tasks || []); });
  }, []);

  const refreshTasks = async (id = listId) => { if (id) setTasks(await window.todoApi.getTasks(id)); };
  const allTags = useMemo(() => { const tags = new Set(); tasks.forEach((task) => splitTags(task.tags).forEach((item) => tags.add(item))); return [...tags].sort((a, b) => a.localeCompare(b, "zh-CN")); }, [tasks]);
  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortTasks(tasks.filter((task) => {
      if (task.completed || task.stashed) return false;
      const text = `${task.name} ${task.due_date} ${task.notes} ${task.tags}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      if (tag && !splitTags(task.tags).includes(tag)) return false;
      return true;
    }), sortMode);
  }, [tasks, search, tag, sortMode]);
  const stashTasks = useMemo(() => sortTasks(tasks.filter((task) => task.stashed && !task.completed), "custom"), [tasks]);
  const activeHours = useMemo(() => tasks.filter((task) => !task.completed && !task.stashed).reduce((sum, task) => sum + Number(task.duration || 0), 0), [tasks]);
  const fullHours = useMemo(() => tasks.filter((task) => !task.completed).reduce((sum, task) => sum + Number(task.duration || 0), 0), [tasks]);
  const stashHours = Math.max(0, fullHours - activeHours);
  const setTaskPatch = (id, patch) => setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  const addTask = async () => {
    if (!listId) return;
    try {
      const task = await window.todoApi.addTask(listId);
      setTasks((prev) => [...prev.filter((item) => item.id !== task.id), task]);
      setEditor({ task, isNew: true });
    } catch (error) {
      console.error(error);
      refreshTasks();
    }
  };
  const saveTask = async (id, values) => { await window.todoApi.updateTask(id, values); setTaskPatch(id, values); setEditor(null); refreshTasks(); };
  const cancelEditor = async () => { if (editor?.isNew && !(editor.task.name || "").trim()) { await window.todoApi.deleteTask(editor.task.id); setTasks((prev) => prev.filter((task) => task.id !== editor.task.id)); } setEditor(null); };
  const deleteTask = async (id) => { await window.todoApi.deleteTask(id); setTasks((prev) => prev.filter((task) => task.id !== id)); setEditor(null); };
  const completeTask = (id) => { setCompleteId(id); setTimeout(() => deleteTask(id), 360); };
  const currentOrderedIds = () => sortTasks(tasks.filter((task) => !task.stashed && !task.completed), "custom").map((task) => task.id);
  const currentStashIds = () => sortTasks(tasks.filter((task) => task.stashed && !task.completed), "custom").map((task) => task.id);
  const persistOrder = async (ids) => { if (!listId) return; await window.todoApi.reorder(listId, ids); setTasks((prev) => prev.map((task) => { const index = ids.indexOf(task.id); return index >= 0 ? { ...task, sort_order: index + 1 } : task; })); };

  const startDrag = (event, task, from) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ id: task.id, task, from, x: event.clientX - rect.width / 2, y: event.clientY - rect.height / 2, width: rect.width, height: rect.height, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, over: from, index: visibleTasks.findIndex((item) => item.id === task.id) });
  };

  useEffect(() => {
    if (!drag) return undefined;
    const onMove = (event) => {
      setDrag((prev) => {
        if (!prev) return prev;
        const next = { ...prev, x: event.clientX - prev.offsetX, y: event.clientY - prev.offsetY };
        const stashRect = stashRef.current?.getBoundingClientRect();
        if (stashRect && event.clientX >= stashRect.left && event.clientX <= stashRect.right && event.clientY >= stashRect.top && event.clientY <= stashRect.bottom) {
          const stashCards = [...(stashListRef.current?.querySelectorAll(".stashSlot:not(.hidden)") || [])];
          let index = stashCards.length;
          for (let i = 0; i < stashCards.length; i += 1) {
            const rect = stashCards[i].getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) { index = i; break; }
          }
          next.over = "stash";
          next.index = index;
          return next;
        }
        const cards = [...(gridRef.current?.querySelectorAll(".taskSlot:not(.hidden)") || [])];
        next.over = "active";
        let index = cards.length;
        for (let i = 0; i < cards.length; i += 1) { const rect = cards[i].getBoundingClientRect(); if (event.clientY < rect.top + rect.height / 2) { index = i; break; } }
        next.index = index;
        return next;
      });
    };
    const onUp = async () => {
      const dropped = drag;
      setDrag(null);
      if (dropped.over === "stash") {
        await window.todoApi.stashTask(dropped.id, true);
        const ids = currentStashIds().filter((id) => id !== dropped.id);
        ids.splice(Math.max(0, Math.min(ids.length, dropped.index ?? ids.length)), 0, dropped.id);
        setTaskPatch(dropped.id, { stashed: 1 });
        await persistOrder(ids);
        refreshTasks();
        return;
      }
      await window.todoApi.stashTask(dropped.id, false);
      const ids = currentOrderedIds().filter((id) => id !== dropped.id);
      ids.splice(Math.max(0, Math.min(ids.length, dropped.index ?? ids.length)), 0, dropped.id);
      setTaskPatch(dropped.id, { stashed: 0 });
      await persistOrder(ids);
      refreshTasks();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag, visibleTasks, stashTasks, tasks]);

  const orderedWithPlaceholder = useMemo(() => {
    const base = visibleTasks.filter((task) => task.id !== drag?.id);
    if (drag?.over === "active") base.splice(Math.max(0, Math.min(base.length, drag.index ?? base.length)), 0, { id: "__placeholder", placeholder: true, height: drag.height || 68 });
    return base;
  }, [visibleTasks, drag]);

  const orderedStashWithPlaceholder = useMemo(() => {
    const base = stashTasks.filter((task) => task.id !== drag?.id);
    if (drag?.over === "stash") base.splice(Math.max(0, Math.min(base.length, drag.index ?? base.length)), 0, { id: "__stash_placeholder", placeholder: true, height: drag.height || 64 });
    return base;
  }, [stashTasks, drag]);

  const selectList = async (id) => { setListId(id); setTag(""); setTasks(await window.todoApi.getTasks(id)); };
  const addList = () => setListDialog({ mode: "add", title: L.addList, value: "" });
  const renameList = () => { const current = lists.find((item) => item.id === listId); if (current) setListDialog({ mode: "rename", title: L.renameList, value: current.name || "" }); };
  const saveListDialog = async (name) => {
    if (!listDialog) return;
    if (listDialog.mode === "add") { const created = await window.todoApi.addList(name); const state = await window.todoApi.getState(); setLists(state.lists || []); setListId(created.id); setTasks(await window.todoApi.getTasks(created.id)); }
    if (listDialog.mode === "rename") { await window.todoApi.renameList(listId, name); setLists((prev) => prev.map((item) => (item.id === listId ? { ...item, name } : item))); }
    setListDialog(null);
  };
  const removeList = async () => { if (lists.length <= 1) return; if (!window.confirm(L.deleteConfirm)) return; await window.todoApi.deleteList(listId); const state = await window.todoApi.getState(); setLists(state.lists || []); setListId(state.activeListId || null); setTasks(state.tasks || []); };

  return (
    <main className="app">
      <header className="topbar">
        <div className="titleBlock"><span>{L.workspace}</span><h1>{L.allTasks}</h1><p>{L.localApp}</p></div>
        <input className="search" value={search} placeholder={L.search} onChange={(event) => setSearch(event.target.value)} />
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>{sortModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <section className="stat"><span>{L.activeHours}</span><strong>{fmtHours(activeHours)} h</strong></section>
        <section className="stat primaryStat"><span>{L.totalHours}</span><strong>{fmtHours(fullHours)} h</strong></section>
        <button className="addButton" onClick={addTask}>{L.addTask}</button>
      </header>
      <section className="layout">
        <aside className="sidebar panel"><div className="brand"><b>C</b><div><strong>Chronos</strong><span>{L.localPlan}</span></div></div><div className="sideTitle">{L.lists}</div><div className="listButtons">{lists.map((item) => <button key={item.id} className={item.id === listId ? "selected" : ""} onClick={() => selectList(item.id)}>{item.name}</button>)}</div><div className="miniActions"><button onClick={addList}>{L.add}</button><button onClick={renameList}>{L.rename}</button><button onClick={removeList}>{L.delete}</button></div><div className="sideTitle">{L.tags}</div><div className="tagList"><button className={!tag ? "selected" : ""} onClick={() => setTag("")}>{L.allTags}</button>{allTags.map((item) => <button key={item} className={tag === item ? "selected" : ""} onClick={() => setTag(item)}>{item}</button>)}</div></aside>
        <section className="tasksPanel panel"><div className="panelHeader"><h2>{L.taskList}</h2><span>{visibleTasks.length} {L.items}</span></div><div ref={gridRef} className="taskGrid">{orderedWithPlaceholder.map((task) => task.placeholder ? <div key="placeholder" className="placeholder" style={{ height: `${task.height}px` }} /> : <div key={task.id} className={`taskSlot ${drag?.id === task.id ? "hidden" : ""}`}><TaskCard task={task} isDragging={drag?.id === task.id} isCompleting={completeId === task.id} onPointerDown={(event) => startDrag(event, task, "active")} onEdit={() => setEditor({ task })} onComplete={() => completeTask(task.id)} /></div>)}{!visibleTasks.length && !drag && <div className="empty">{L.empty}</div>}</div></section>
        <aside ref={stashRef} className={`stash panel ${drag?.over === "stash" ? "dropReady" : ""}`}><div className="stashHeader"><h2>{L.stash}</h2><span>{L.draft}</span></div><div ref={stashListRef} className="stashList">{orderedStashWithPlaceholder.length ? orderedStashWithPlaceholder.map((task) => task.placeholder ? <div key="stash-placeholder" className="placeholder stashPlaceholder" style={{ height: `${task.height}px` }} /> : <div key={task.id} className={`stashSlot ${drag?.id === task.id ? "hidden" : ""}`}><StashItem task={task} onPointerDown={(event) => startDrag(event, task, "stash")} onRestore={async () => { await window.todoApi.stashTask(task.id, false); setTaskPatch(task.id, { stashed: 0 }); refreshTasks(); }} /></div>) : <p className="stashEmpty">{L.stashEmpty}</p>}</div><div className="stashTotal"><span>{L.stashTotal}</span><strong>{fmtHours(stashHours)} h</strong></div></aside>
      </section>
      {drag && <div className="dragGhost" style={{ left: drag.x, top: drag.y, width: drag.width, height: drag.height }}><TaskCard task={drag.task} onPointerDown={() => {}} onEdit={() => {}} onComplete={() => {}} /></div>}
      {listDialog && <ListNameDialog title={listDialog.title} initialValue={listDialog.value} onCancel={() => setListDialog(null)} onSave={saveListDialog} />}
      {editor && <TaskEditor task={editor.task} onCancel={cancelEditor} onSave={(values) => saveTask(editor.task.id, values)} onDelete={!editor.isNew ? () => deleteTask(editor.task.id) : null} />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);