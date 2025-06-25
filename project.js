const urlParams = new URLSearchParams(window.location.search);
const projectId = parseInt(urlParams.get("id"));

document.addEventListener("DOMContentLoaded", async() => {
    const title = document.getElementById("boardTitle");
    const projectData = await fetch(`http://localhost:8000/projects/${projectId}`).then(res => res.json());
    title.textContent = `${projectData.name} - Kanban Board`;

    const url = `http://localhost:8000/projects/${projectId}/tasks`;

    await loadTasks();

    document.getElementById("filterOptions").addEventListener("change", filterTaskByUser);

    const dropZones = document.querySelectorAll(".tasks");

    dropZones.forEach(zone => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        zone.addEventListener("drop", async(e) => {
            e.preventDefault();

            const taskId = e.dataTransfer.getData("taskId");
            const newStatus = zone.parentElement.id;

            await fetch(`http://localhost:8000/projects/${projectId}/tasks/${taskId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: newStatus })
            });

            await loadTasks();
        });
    });
});

async function loadTasks() {
    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    const allColumns = document.querySelectorAll(".tasks");
    allColumns.forEach(col => col.innerHTML = "");

    tasks.forEach(task => renderTask(task.id, task.text, task.status, task.owners));
    await filterByName();
    updateTaskCounts();
}

function renderParticipants(participants) {
    const line = document.getElementById("participantsLine");
    line.innerHTML = "";

    if (!participants || participants.length === 0) {
        line.innerHTML = "<span>No participants</span>";
        return;
    }

    participants.forEach(name => {
        const span = document.createElement("span");
        span.classList.add("participant");
        span.textContent = name;
        line.appendChild(span);
    })
}

async function filterTaskByUser() {
    const selectedUser = document.getElementById("filterOptions").value;
    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    document.querySelectorAll(".tasks").forEach(zone => {
        zone.innerHTML = "";
    });

    const filteredTasks = selectedUser === "All" ? tasks : tasks.filter(task => task.owners.includes(selectedUser));
    filteredTasks.forEach(task => renderTask(task.id, task.text, task.status, task.owners));

    updateTaskCounts();
}

async function filterByName() {
    const select = document.getElementById("filterOptions");

    select.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    select.appendChild(allOption);

    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    const names = tasks.flatMap(task => task.owners || []);
    const uniqueNames = [...new Set(names)];

    let namesInSelect = Array.from(select.options).map(option => option.value);

    uniqueNames.forEach(name => {
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
        name = [`user ${undefinedUsers}`];
    }
    input.value = "";
    const namesArray = name.split(",").map(name => name.trim());
    return namesArray;
}

async function addTask() {
    const input = document.getElementById("taskInput");
    const taskText = input.value.trim();
    const owners = addName();
    if (!taskText) return;

    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: taskText,
            owners: owners,
            status: "todo"
        })
    });
    if (res.ok) {
        renderTask(taskText, "todo", owners);
        await filterByName();
        input.value = "";
    } else {
        console.error("failed to add task");
    }
}

function renderTask(id, text, status, owners) {
    const task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");
    task.setAttribute("data-id", id);
    task.setAttribute("data-text", text);
    task.setAttribute("data-name", owners.join(", "));

    const ownerHTML = owners.map(name => {
        const color = getUserColor(name);
        return `<span style="color: ${color}; font-weight: bold;">${name}</span>`;
    }).join(", ")

    task.innerHTML = `
        <span>${text} - ${ownerHTML}</span>
        <i class="fas fa-trash delete-icon" onclick="deleteTask(this)"></i>
    `;

    task.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", text);
        e.dataTransfer.setData("taskId", id);
        const currentColumn = task.closest(".column").id;
        e.dataTransfer.setData("status", currentColumn);
        e.dataTransfer.setData("name", owners.join(", "));
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
    const taskId = task.getAttribute("data-id");
    const name = task.getAttribute("data-name").split(",").map(n => n.trim());
    removeNameFromFilter(name);

    const res = await fetch(`http://localhost:8000/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE"
    });
    if (res.ok) {
        task.remove();
        await removeNameFromFilterIfUnused(name);
    }
    updateTaskCounts();
}

async function removeNameFromFilterIfUnused(name) {
    const select = document.getElementById("filterOptions");
    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    const nameUsed = tasks.some(task =>
        task.owners && task.owners.includes(name)
    );

    if (!nameUsed) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === name) {
                select.remove(i);
                break;
            }
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