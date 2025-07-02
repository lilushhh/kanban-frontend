let projectId = null;
const urlParams = new URLSearchParams(window.location.search);
const idParam = urlParams.get("id");
if (!idParam) {
    console.error("Missing project ID");
}
projectId = idParam;
let projectParticipants = [];
let currentTaskOwners = [];
let editingTaskId = null;
document.addEventListener("DOMContentLoaded", async () => {
    const title = document.getElementById("boardTitle");
    if (!title)
        return;
    const projectData = await fetch(`http://localhost:8000/projects/${projectId}`).then(res => res.json());
    title.textContent = `${projectData.name} - Kanban Board`;
    setupDragAndDrop();
    loadTasks();
    renderParticipants();
    filterByName();
    const filterSelect = document.getElementById("filterOptions");
    if (filterSelect) {
        filterSelect.addEventListener("change", filterTaskByUser);
    }
});
async function loadTasks() {
    const res = await fetch("http://localhost:8000/tasks/");
    if (!res.ok) {
        console.error("Failed to fetch tasks");
        return;
    }
    const allTasks = await res.json();
    const tasks = allTasks.filter((task) => task.project_id === projectId);
    document.querySelectorAll(".tasks").forEach(zone => {
        zone.innerHTML = "";
    });
    tasks.forEach((task) => {
        renderTask(task.id, task.text, task.status, task.owners);
    });
    updateTaskCounts();
}
async function renderParticipants() {
    const res = await fetch(`http://localhost:8000/projects/${projectId}`);
    if (!res.ok) {
        console.error("Project not found");
        return;
    }
    const currentProject = await res.json();
    const participantsLine = document.getElementById("participantsLine");
    if (!participantsLine)
        return;
    projectParticipants = currentProject.users;
    participantsLine.innerHTML = "";
    currentProject.users.forEach((user) => {
        const span = document.createElement("span");
        span.textContent = user;
        span.className = "participant-tag";
        span.style.color = getUserColor(user);
        participantsLine.appendChild(span);
    });
}
function addName() {
    const nameInput = document.getElementById("nameInput");
    const participantsLine = document.getElementById("participantsLine");
    if (!nameInput || !participantsLine)
        return [];
    const rawInput = nameInput.value.trim();
    if (!rawInput)
        return [];
    const names = rawInput.split(",").map(n => n.trim()).filter(n => n !== "");
    const addedUsers = [];
    names.forEach(inputName => {
        const match = projectParticipants.find(p => p.toLowerCase() === inputName.toLowerCase());
        if (!match) {
            alert(`${inputName} is not part of this project!`);
            return;
        }
        if (currentTaskOwners.includes(match))
            return;
        currentTaskOwners.push(match);
        addedUsers.push(match);
        const tag = document.createElement("span");
        tag.textContent = match;
        tag.className = "participant-tag";
        tag.style.color = getUserColor(match);
        participantsLine.appendChild(tag);
    });
    return addedUsers;
}
async function addTask() {
    const input = document.getElementById("taskInput");
    if (!input)
        return;
    const taskText = input.value.trim();
    if (!taskText) {
        alert("Please enter a task title!");
        return;
    }
    const owners = addName();
    if (owners.length === 0) {
        alert("Please add at least one valid participant.");
        return;
    }
    if (!projectId) {
        alert("No project selected!");
        return;
    }
    const task = {
        project_id: projectId,
        task_title: taskText,
        owners_list: owners,
        status_task: "todo"
    };
    const res = await fetch("http://localhost:8000/tasks/", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(task)
    });
    if (res.ok) {
        const createdTask = await res.json();
        renderTask(createdTask.id, createdTask.text, createdTask.status, createdTask.owners);
        input.value = "";
        currentTaskOwners = [];
        await filterByName();
    }
    else {
        alert("Failed to add task!");
    }
}
function renderTask(id, text, status, owners) {
    const task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");
    task.setAttribute("data-id", id);
    task.setAttribute("data-text", text);
    task.setAttribute("data-status", status);
    task.setAttribute("data-owners", owners.join(","));
    const ownerHTML = owners.map(name => {
        const color = getUserColor(name);
        return `<span style="color: ${color}; font-weight: bold;">${name}</span>`;
    }).join(", ");
    const content = document.createElement("span");
    content.innerHTML = `${text} - ${ownerHTML}`;
    task.appendChild(content);
    const editIcon = document.createElement("i");
    editIcon.className = "fas fa-pen edit-icon";
    editIcon.onclick = () => openEditModal(id, text, owners, status);
    task.appendChild(editIcon);
    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fas fa-trash delete-icon";
    deleteIcon.onclick = () => deleteTask(id);
    task.appendChild(deleteIcon);
    task.addEventListener("dragstart", (e) => {
        if (!e.dataTransfer)
            return;
        e.dataTransfer.setData("taskId", id);
        e.dataTransfer.setData("status", status);
    });
    task.addEventListener("dragend", () => {
        task.style.display = "flex";
    });
    const column = document.querySelector(`#${status} .tasks`);
    if (column) {
        column.appendChild(task);
    }
    updateTaskCounts();
}
async function updateTaskStatus(taskId, newStatus) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (!taskElement)
        return;
    const text = taskElement.getAttribute("data-text") || "";
    const ownersStr = taskElement.getAttribute("data-owners") || "";
    const owners = ownersStr.split(",").map(n => n.trim());
    const dto = {
        project_id: projectId,
        task_id: taskId,
        task_title: text,
        owners_list: owners,
        status_task: newStatus
    };
    const res = await fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto)
    });
    if (res.ok) {
        taskElement.remove();
        renderTask(taskId, text, newStatus, owners);
    }
    else {
        alert("Failed to update status");
    }
}
function setupDragAndDrop() {
    const columns = document.querySelectorAll(".tasks");
    columns.forEach(column => {
        column.addEventListener("dragover", (e) => {
            e.preventDefault();
        });
        column.addEventListener("drop", async (event) => {
            var _a, _b;
            const e = event;
            e.preventDefault();
            const taskId = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData("taskId");
            const newStatus = (_b = column.closest(".column")) === null || _b === void 0 ? void 0 : _b.id;
            if (!taskId || !newStatus)
                return;
            await updateTaskStatus(taskId, newStatus);
        });
    });
}
function updateTaskCounts() {
    const todoCount = document.querySelectorAll("#todo .task").length;
    const inProgressCount = document.querySelectorAll("#inProgress .task").length;
    const doneCount = document.querySelectorAll("#done .task").length;
    const todoTitle = document.getElementById("todoTitle");
    const inProgressTitle = document.getElementById("inProgressTitle");
    const doneTitle = document.getElementById("doneTitle");
    if (todoTitle)
        todoTitle.textContent = `TO DO (${todoCount})`;
    if (inProgressTitle)
        inProgressTitle.textContent = `IN PROGRESS (${inProgressCount})`;
    if (doneTitle)
        doneTitle.textContent = `DONE (${doneCount})`;
}
function getUserColor(name, hashOffset = 0) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash += hashOffset;
    let color = "#";
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += value.toString(16).padStart(2, "0");
    }
    return color;
}
function openEditModal(id, text, owners, status) {
    editingTaskId = id;
    const modal = document.getElementById("editModalOverlay");
    const textInput = document.getElementById("editTaskText");
    const ownersInput = document.getElementById("editTaskOwners");
    if (!modal || !textInput || !ownersInput)
        return;
    textInput.value = text;
    ownersInput.value = owners.join(", ");
    modal.style.display = "flex";
    const saveBtn = document.getElementById("saveEditBtn");
    if (saveBtn) {
        saveBtn.onclick = () => {
            const newText = textInput.value.trim();
            const newOwners = ownersInput.value.split(",").map(n => n.trim()).filter(n => n !== "");
            updateTaskDetails(id, newText, newOwners);
        };
    }
}
function closeEditModal() {
    const modal = document.getElementById("editModalOverlay");
    if (modal)
        modal.style.display = "none";
    editingTaskId = null;
    const textInput = document.getElementById("editTaskText");
    const ownersInput = document.getElementById("editTaskOwners");
    if (textInput)
        textInput.value = "";
    if (ownersInput)
        ownersInput.value = "";
}
async function updateTaskDetails(taskId, newText, newOwners) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (!taskElement || !projectId)
        return;
    const status = taskElement.getAttribute("data-status") || "todo";
    if (newOwners.length === 0 || newOwners[0].trim() === "") {
        alert("must to be at least one participant.");
        return;
    }
    const invalidUsers = newOwners.filter(owner => !projectParticipants.includes(owner.trim()));
    if (invalidUsers.length > 0) {
        alert(`invalid users: ${invalidUsers.join(", ")}`);
        return;
    }
    const dto = {
        project_id: projectId,
        task_id: taskId,
        task_title: newText,
        owners_list: newOwners,
        status_task: status
    };
    const res = await fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dto)
    });
    if (res.ok) {
        taskElement.remove();
        renderTask(taskId, newText, status, newOwners);
        closeEditModal();
        currentTaskOwners = [];
    }
    else {
        alert("Failed to update task");
    }
}
async function filterByName() {
    const select = document.getElementById("filterOptions");
    if (!select || !projectId)
        return;
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    select.appendChild(allOption);
    const response = await fetch("http://localhost:8000/tasks/");
    if (!response.ok) {
        console.error("Failed to fetch tasks");
        return;
    }
    const allTasks = await response.json();
    const tasks = allTasks.filter((t) => t.project_id === projectId);
    const names = tasks.flatMap((t) => { var _a; return (_a = t.owners) !== null && _a !== void 0 ? _a : []; });
    const uniqueNames = [...new Set(names)].sort();
    uniqueNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}
async function filterTaskByUser() {
    const select = document.getElementById("filterOptions");
    if (!select || !projectId)
        return;
    const selectedUser = select.value;
    const response = await fetch("http://localhost:8000/tasks/");
    if (!response.ok) {
        console.error("Failed to fetch tasks");
        return;
    }
    const allTasks = await response.json();
    const tasks = allTasks.filter((t) => t.project_id === projectId);
    const filteredTasks = selectedUser === "All"
        ? tasks
        : tasks.filter((t) => (t.owners || []).some((owner) => owner.toLowerCase() === selectedUser.toLowerCase()));
    // ניקוי כל הטורים
    document.querySelectorAll(".tasks").forEach(column => {
        column.innerHTML = "";
    });
    // רינדור מחודש של משימות
    filteredTasks.forEach((task) => {
        renderTask(task.id, task.text, task.status, task.owners);
    });
    updateTaskCounts();
}
async function deleteTask(id) {
    const confirmed = confirm("Are you sure you want to delete this task?");
    if (!confirmed)
        return;
    const res = await fetch(`http://localhost:8000/tasks/${id}`, {
        method: "DELETE"
    });
    if (res.ok) {
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (taskElement)
            taskElement.remove();
        updateTaskCounts();
    }
    else {
        alert("Failed to delete task.");
    }
}
window.goBack = function () {
    window.location.href = "index.html";
};
window.addTask = addTask;
window.closeEditModal = closeEditModal;
export {};
