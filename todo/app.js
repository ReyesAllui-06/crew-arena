const STORAGE_KEY = "tasks";

const form = document.getElementById("add-form");
const input = document.getElementById("task-input");
const dueInput = document.getElementById("task-due");
const list = document.getElementById("task-list");
const empty = document.getElementById("empty");

let tasks = load();
let audioCtx = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Short two-tone chime built with Web Audio, so no sound file is needed.
// Created lazily on a user gesture (checkbox click), which browsers require.
function playDoneSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.2);
    });
  } catch {
    // Audio not available; the task still completes silently.
  }
}

function formatDue(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isOverdue(task) {
  return !task.done && task.due && new Date(task.due) < new Date();
}

function render() {
  list.innerHTML = "";
  empty.style.display = tasks.length ? "none" : "block";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.done) li.classList.add("done");
    if (isOverdue(task)) li.classList.add("overdue");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Marcar como completada: " + task.text);
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      if (task.done) playDoneSound();
      save();
      render();
    });

    const text = document.createElement("div");
    text.className = "task-text";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = task.text;
    text.appendChild(label);

    if (task.due) {
      const due = document.createElement("time");
      due.className = "due";
      due.dateTime = task.due;
      due.textContent = "Vence: " + formatDue(task.due);
      text.appendChild(due);
    }

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "×";
    del.title = "Eliminar";
    del.setAttribute("aria-label", "Eliminar tarea: " + task.text);
    del.addEventListener("click", () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      save();
      render();
    });

    li.append(checkbox, text, del);
    list.appendChild(li);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  tasks.push({
    id: Date.now().toString(),
    text,
    done: false,
    due: dueInput.value, // "YYYY-MM-DDTHH:MM" from datetime-local, or ""
  });
  input.value = "";
  dueInput.value = "";
  save();
  render();
});

// Re-check overdue state every minute without a page reload.
setInterval(render, 60 * 1000);

render();
