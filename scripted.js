"use strict";

/**
 * Simple Notes App
 * - localStorage persistence
 * - create / open / save / delete
 * - renders list on the left
 */

// ====== DOM ======
const createBtn = document.querySelector(".create-new");
const saveBtn = document.querySelector(".save-note");
const deleteBtn = document.querySelector(".delete-note");

const titleInput = document.querySelector("#title-input");
const contentInput = document.querySelector("#content-input");

const notesListEl = document.querySelector(".notes-list");

// ====== Storage Keys ======
const STORAGE_KEY = "notes_app_v1";

// ====== State ======
/** @type {{ id: string, title: string, content: string, updatedAt: number, createdAt: number }[]} */
let notes = [];
/** @type {string|null} */
let activeNoteId = null;

let autosaveTimer = null;

// ====== Helpers ======
function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(ts) {
  const d = new Date(ts);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}:${ss}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTeaser(content, maxLen = 140) {
  const cleaned = String(content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1) + "…";
}

function generateId() {
  // reasonably unique for small apps
  return `n_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getActiveNote() {
  return notes.find((n) => n.id === activeNoteId) || null;
}

function sortNotesByUpdatedAtDesc() {
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ====== Storage ======
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // basic sanitize
    return parsed
      .filter((n) => n && typeof n.id === "string")
      .map((n) => ({
        id: String(n.id),
        title: typeof n.title === "string" ? n.title : "",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ====== UI Render ======
function renderNotesList() {
  sortNotesByUpdatedAtDesc();

  notesListEl.innerHTML = "";

  if (notes.length === 0) {
    const empty = document.createElement("div");
    empty.style.opacity = "0.7";
    empty.style.padding = "1rem 0.5rem";
    empty.textContent = "Momentan haben wir kein Notiz";
    notesListEl.appendChild(empty);
    return;
  }

  for (const note of notes) {
    const entry = document.createElement("div");
    entry.className = "note-entry";
    entry.dataset.id = note.id;

    if (note.id === activeNoteId) {
      entry.style.backgroundColor = "rgb(241, 239, 239)";
      entry.style.borderColor = "transparent";
    }

    const title = document.createElement("div");
    title.className = "note-title";
    title.innerHTML = escapeHtml(note.title?.trim() || "(No title)");

    const teaser = document.createElement("div");
    teaser.className = "note-content-teaser";
    teaser.innerHTML = escapeHtml(getTeaser(note.content));

    const date = document.createElement("div");
    date.className = "note-data";
    date.textContent = formatDateTime(note.updatedAt);

    entry.appendChild(title);
    entry.appendChild(teaser);
    entry.appendChild(date);

    entry.addEventListener("click", () => openNote(note.id));

    notesListEl.appendChild(entry);
  }
}

function renderEditor() {
  const note = getActiveNote();

  const hasActive = !!note;

  titleInput.disabled = !hasActive;
  contentInput.disabled = !hasActive;
  saveBtn.disabled = !hasActive;
  deleteBtn.disabled = !hasActive;

  if (!hasActive) {
    titleInput.value = "";
    contentInput.value = "";
    titleInput.placeholder = "Überschrift eingeben...";
    contentInput.placeholder = "Fang' an Notiz zu erstellen";
    return;
  }

  titleInput.value = note.title;
  contentInput.value = note.content;
}

// ====== Actions ======
function createNewNote() {
  const now = Date.now();
  const newNote = {
    id: generateId(),
    title: "",
    content: "",
    createdAt: now,
    updatedAt: now,
  };

  notes.unshift(newNote);
  activeNoteId = newNote.id;

  saveToStorage();
  renderNotesList();
  renderEditor();

  titleInput.focus();
}

function openNote(id) {
  const exists = notes.some((n) => n.id === id);
  if (!exists) return;

  activeNoteId = id;
  renderNotesList();
  renderEditor();
}

function saveActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  note.title = titleInput.value ?? "";
  note.content = contentInput.value ?? "";
  note.updatedAt = Date.now();

  saveToStorage();
  renderNotesList();
}

function deleteActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  const ok = confirm("Möchtest du wirklich löschen?");
  if (!ok) return;

  notes = notes.filter((n) => n.id !== activeNoteId);

  // pick next note as active
  activeNoteId = notes.length ? notes[0].id : null;

  saveToStorage();
  renderNotesList();
  renderEditor();
}

function scheduleAutosave() {
  // debounce autosave
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveActiveNote();
  }, 350);
}

// ====== Init ======
function init() {
  notes = loadFromStorage();
  sortNotesByUpdatedAtDesc();

  activeNoteId = notes.length ? notes[0].id : null;

  renderNotesList();
  renderEditor();
}

// ====== Events ======
createBtn.addEventListener("click", createNewNote);
saveBtn.addEventListener("click", saveActiveNote);
deleteBtn.addEventListener("click", deleteActiveNote);

titleInput.addEventListener("input", () => {
  if (!activeNoteId) return;
  scheduleAutosave();
  // live update list title feel
  renderNotesList();
});

contentInput.addEventListener("input", () => {
  if (!activeNoteId) return;
  scheduleAutosave();
  // live update list teaser feel
  renderNotesList();
});

// optional: Ctrl+S / Cmd+S save
window.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const saveCombo =
    (isMac && e.metaKey && e.key === "s") ||
    (!isMac && e.ctrlKey && e.key === "s");
  if (saveCombo) {
    e.preventDefault();
    saveActiveNote();
  }
});

init();
