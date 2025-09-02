const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2,9);
const KEY = "ai_todo_v1";

let state = load();

function load(){
  try{ return JSON.parse(localStorage.getItem(KEY)) || {items:[]}; }
  catch(_){ return {items:[]}; }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }

function addTask(title, priority, due){
  if(!title.trim()) return;
  state.items.push({id:uid(), title:title.trim(), done:false, priority, due, created:Date.now()});
  save(); render();
}
function toggle(id){ const t = state.items.find(x=>x.id===id); if(t){ t.done=!t.done; save(); render(); } }
function remove(id){ state.items = state.items.filter(x=>x.id!==id); save(); render(); }
function update(id, patch){ const t = state.items.find(x=>x.id===id); if(t){ Object.assign(t, patch); save(); render(); } }
function reorder(srcId, targetId){
  const a = state.items.findIndex(x=>x.id===srcId);
  const b = state.items.findIndex(x=>x.id===targetId);
  if(a<0||b<0) return;
  const [moved] = state.items.splice(a,1);
  state.items.splice(b,0,moved);
  save(); render();
}

function fmtDate(s){
  if(!s) return "";
  const d = new Date(s+"T00:00:00");
  return d.toLocaleDateString();
}
function isOverdue(item){
  if(!item.due || item.done) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(item.due+"T00:00:00");
  return d < today;
}
function isToday(item){
  if(!item.due) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(item.due+"T00:00:00");
  return d.getTime() === today.getTime();
}

function render(){
  const q = $("#search").value.toLowerCase();
  const f = $("#filter").value;
  let items = state.items.slice();

  items = items.filter(t => t.title.toLowerCase().includes(q));
  if(f==="active") items = items.filter(t => !t.done);
  if(f==="done") items = items.filter(t => t.done);
  if(f==="overdue") items = items.filter(isOverdue);
  if(f==="today") items = items.filter(isToday);

  const list = $("#list");
  list.innerHTML = "";

  if(items.length===0){
    list.innerHTML = `<div class="empty">Nothing here yet. Add your first task above ✨</div>`;
  }

  for(const t of items){
    const row = document.createElement("div");
    row.className = "todo";
    row.draggable = true;
    row.dataset.id = t.id;

    row.innerHTML = `
      <div class="row">
        <div class="drag" title="Drag to reorder" style="cursor:grab;font-size:18px; text-align:center">⠿</div>
        <div class="flex">
          <input class="chk" type="checkbox" ${t.done?"checked":""} style="transform:scale(1.2)"/>
          <input class="title" type="text" value="${t.title.replace(/"/g,'&quot;')}" ${t.done?"style='text-decoration:line-through; opacity:.7'":""}/>
        </div>
        <div><span class="pill ${t.priority}">${t.priority}</span></div>
        <div class="${isOverdue(t) ? 'pill high' : 'muted'}">${t.due ? fmtDate(t.due) : '—'}</div>
        <div class="muted">${new Date(t.created).toLocaleDateString()}</div>
        <div class="flex" style="justify-content:end">
          <button class="btn-ghost edit" title="Edit (e)">✎</button>
          <button class="btn-danger del" title="Delete">✕</button>
        </div>
      </div>`;

    row.querySelector(".chk").addEventListener("change", () => toggle(t.id));
    row.querySelector(".del").addEventListener("click", () => remove(t.id));
    row.querySelector(".edit").addEventListener("click", () => {
      const title = prompt("Edit task", t.title);
      if(title!==null) update(t.id,{title});
    });
    row.querySelector(".title").addEventListener("change", e => update(t.id,{title:e.target.value}));

    row.addEventListener("dragstart", e => { row.classList.add("dragging"); e.dataTransfer.setData("text/plain", t.id); });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", e => { e.preventDefault(); });
    row.addEventListener("drop", e => {
      e.preventDefault();
      const src = e.dataTransfer.getData("text/plain");
      if(src && src !== t.id) reorder(src, t.id);
    });

    list.appendChild(row);
  }

  const total = state.items.length;
  const done = state.items.filter(x=>x.done).length;
  $("#counts").textContent = `${done}/${total} completed`;
}

$("#addBtn").addEventListener("click", () => {
  addTask($("#taskInput").value, $("#priority").value, $("#due").value);
  $("#taskInput").value = ""; $("#due").value = "";
  $("#taskInput").focus();
});
$("#taskInput").addEventListener("keydown", e => {
  if(e.key === "Enter"){ $("#addBtn").click(); }
});
document.addEventListener("keydown", e => {
  if(e.key === "e"){
    const first = document.querySelector(".todo .edit");
    if(first) first.click();
  }
});

$("#clearDone").addEventListener("click", () => {
  if(confirm("Clear all completed tasks?")){
    state.items = state.items.filter(x=>!x.done);
    save(); render();
  }
});
$("#search").addEventListener("input", render);
$("#filter").addEventListener("change", render);

$("#exportBtn").addEventListener("click", () => {
  const content = JSON.stringify(state, null, 2);
  const blob = new Blob([content], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "ai_todo_backup.json"; a.click();
  URL.revokeObjectURL(url);
});
$("#importBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/json";
  input.onchange = () => {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => { 
      try{ state = JSON.parse(reader.result); save(); render(); }
      catch(e){ alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  };
  input.click();
});

render();

