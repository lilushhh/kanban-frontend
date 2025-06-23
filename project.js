document.addEventListener("DOMContentLoaded", async() => {
    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);
    if (projectName) {
        const title = document.getElementById("boardTitle");
        title.textContent = `${projectName} - Kanban Board`;
    } else {
        document.getElementById("boardTitle").textContent = "Untitled Project - Kanban Board";
    }

    const url = `http://localhost:8000/projects/${projectName}/tasks`;

    await loadTasks();

    document.getElementById("filterOptions").addEventListener("change", filterTaskByUser);

    const dropZones = document.querySelectorAll(".tasks");

    dropZones.forEach(zone => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        zone.addEventListener("drop", async(e) => {
            e.preventDefault();

            const text = e.dataTransfer.getData("text/plain");
            const oldStatus = e.dataTransfer.getData("status");
            const newStatus = zone.parentElement.id;
            const nameTask = e.dataTransfer.getData("name");

            const oldColumn = document.querySelector(`#${oldStatus} .tasks`);
            const taskToMove = [...oldColumn.children].find(el => {
                el.getAttribute("data-text") === text &&
                    el.getAttribute("data-name") === nameTask
            });

            if (taskToMove) {
                zone.appendChild(taskToMove);
            }

            await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text,
                    name,
                    status: newStatus
                })
            });
            await loadTasks();
        });
    });
});

async function loadTasks() {
    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);
    const url = `http://localhost:8000/projects/${projectName}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    const allColumns = document.querySelectorAll(".tasks");
    allColumns.forEach(col => col.innerHTML = "");

    tasks.forEach(task => renderTask(task.text, task.status, task.name));
    await filterByName();
    updateTaskCounts();
}

async function filterTaskByUser() {
    const selectedUser = document.getElementById("filterOptions").value;

    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);
    const url = `http://localhost:8000/projects/${projectName}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    document.querySelectorAll(".tasks").forEach(zone => {
        zone.innerHTML = "";
    });

    const filteredTasks = selectedUser === "All" ? tasks : tasks.filter(task => task.name === selectedUser);
    filteredTasks.forEach(task => {
        renderTask(task.text, task.status, task.name);
    });

    updateTaskCounts();
}

async function filterByName() {
    const select = document.getElementById("filterOptions");

    select.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    select.appendChild(allOption);

    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);
    const url = `http://localhost:8000/projects/${projectName}/tasks`;

    const tasks = await fetch(url).then(res => res.json());

    let names = [...new Set(tasks.map(task => task.name))];

    let namesInSelect = Array.from(select.options).map(option => option.value);

    names.forEach(name => {
        if (!namesInSelect.includes(name) || namesInSelect == null) {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}

let undefinedUsers = 0;

function addName() {
    const input = document.getElementById("nameInput");
    let name = input.value.trim();
    if (!name) {
        undefinedUsers++;
        name = `user ${undefinedUsers}`;
    }
    input.value = "";
    return name;
}

async function addTask() {
    const input = document.getElementById("taskInput");
    const taskText = input.value.trim();
    const nameText = addName();
    if (!taskText) return;

    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);
    getUserColor(nameText);

    const url = `http://localhost:8000/projects/${projectName}/tasks`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: taskText,
            name: nameText,
            status: "todo"
        })
    });
    if (res.ok) {
        renderTask(taskText, "todo", nameText);
        await filterByName();
        input.value = "";
    } else {
        console.error("failed to add task");
    }
}

function renderTask(text, status, name) {
    const task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");
    task.setAttribute("data-text", text);
    task.setAttribute("data-name", name);
    const color = getUserColor(name);

    task.innerHTML = `
        <span>${text} - <span style="color: ${color}">${name}</span></span>
        <i class="fas fa-trash delete-icon" onclick="deleteTask(this)"></i>
    `;

    task.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", text);
        const currentColumn = task.closest(".column").id;
        e.dataTransfer.setData("status", currentColumn);
        e.dataTransfer.setData("name", name);
        setTimeout(() => {
            task.style.display = "none";
        }, 0);
    });

    task.addEventListener("dragend", () => {
        task.style.display = "flex";
    });

    const column = document.querySelector(`#${status} .tasks`);
    column.appendChild(task);

    updateTaskCounts();
}

function updateTaskCounts() {
    const todoCount = document.querySelectorAll("#todo .task").length;
    const inProgressCount = document.querySelectorAll("#inProgress .task").length;
    const doneCount = document.querySelectorAll("#done .task").length;

    document.getElementById("todoTitle").textContent = `TO DO (${todoCount})`;
    document.getElementById("inProgressTitle").textContent = `IN PROGRESS (${inProgressCount})`;
    document.getElementById("doneTitle").textContent = `DONE (${doneCount})`;
}

async function deleteTask(icon) {
    const task = icon.parentElement;
    const taskText = task.getAttribute("data-text");
    const name = task.getAttribute("data-name");
    removeNameFromFilter(name);

    const projectName = await fetch("http://localhost:8000/current-project").then(res => res.json()).then(data => data.name);

    const res = await fetch(`http://localhost:8000/projects/${projectName}/tasks/${taskText}`, {
        method: "DELETE"
    });
    if (res.ok) {
        task.remove();
    }
    updateTaskCounts();
}

function removeNameFromFilter(name) {
    const select = document.getElementById("filterOptions");
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].textContent == name) {
            select.remove(i);
            break;
        }
    }
}
const usedColors = new Set();

function getUserColor(name, hashOffset = 0) {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    hash += hashOffset;

    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += value.toString(16).padStart(2, '0');
    }

    if (usedColors.has(color)) {
        return getUserColor(name, hashOffset + 1);
    }

    usedColors.add(color);
    return color;
}


function goBack() {
    window.location.href = "index.html";
}