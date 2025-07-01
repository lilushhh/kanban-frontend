const urlParams = new URLSearchParams(window.location.search);
const projectIdParam = urlParams.get("id") as string | null;
const projectId = projectIdParam ? parseInt(projectIdParam) : null;

if (projectId === null || isNaN(projectId)) {
    throw new Error("Missing or invalid project ID");
}

document.addEventListener("DOMContentLoaded", async () => {
    const title = document.getElementById("boardTitle") as HTMLElement | null;
    if (!title) return;

    const projectData = await fetch(`http://localhost:8000/projects/${projectId}`).then(res => res.json());
    title.textContent = `${projectData.name} - Kanban Board`;

    await loadTasks();

    const filter = document.getElementById("filterOptions") as HTMLSelectElement | null;
    if (filter) {
        filter.addEventListener("change", filterTaskByUser);
    }

    const dropZones = document.querySelectorAll(".tasks");

    dropZones.forEach(zone => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        zone.addEventListener("drop", (e) => {
            (async () => {
                const event = e as DragEvent;
                event.preventDefault();
                if (!event.dataTransfer) return;

                const taskId = event.dataTransfer.getData("taskId");
                const parent = zone.parentElement;
                if (!parent) return;

                const newStatus = parent.id;

                await fetch(`http://localhost:8000/projects/${projectId}/tasks/${taskId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                await loadTasks();
            })();
        });
    });
});

async function loadTasks(): Promise<void> {
    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    document.querySelectorAll(".tasks").forEach(col => {
        col.innerHTML = "";
    });

    tasks.forEach((task: any) => renderTask(task.id, task.text, task.status, task.owners));
    await filterByName();
    updateTaskCounts();
}

function renderParticipants(participants: string[]): void {
    const line = document.getElementById("participantsLine") as HTMLElement | null;
    if (!line) return;

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
    });
}

async function filterTaskByUser(): Promise<void> {
    const select = document.getElementById("filterOptions") as HTMLSelectElement | null;
    if (!select) return;

    const selectedUser = select.value;
    const url = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    document.querySelectorAll(".tasks").forEach(zone => {
        zone.innerHTML = "";
    });

    const filteredTasks = selectedUser === "All"
        ? tasks
        : tasks.filter((task: any) => task.owners.includes(selectedUser));

    filteredTasks.forEach((task: any) => renderTask(task.id, task.text, task.status, task.owners));
    updateTaskCounts();
}
async function filterByName(): Promise<void> {
    const select = document.getElementById("filterOptions") as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    select.appendChild(allOption);

    const url   = `http://localhost:8000/projects/${projectId}/tasks`;
    const tasks = await fetch(url).then(res => res.json());

    const names        : string[] = tasks.flatMap((t: any) => t.owners ?? []);
    const uniqueNames  : string[] = [...new Set(names)];
       
    const namesInSelect: string[] = Array.from(select.options)
                                         .map(opt => (opt as HTMLOptionElement).value);

    uniqueNames.forEach(name => {
        if (!namesInSelect.includes(name)) {
            const option = document.createElement("option") as HTMLOptionElement;
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    });
}




let undefinedUsers = 0;

function addName(): string[] {
    const input = document.getElementById("nameInput") as HTMLInputElement | null;
    if (!input) return [];

    let name = input.value.trim();
    if (!name) {
        undefinedUsers++;
        name = `user ${undefinedUsers}`;
    }
    input.value = "";
    return name.split(",").map(n => n.trim());
}

async function addTask(): Promise<void> {
    const input = document.getElementById("taskInput") as HTMLInputElement | null;
    if (!input) return;

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
        renderTask("temp-id", taskText, "todo", owners);
        await filterByName();
        input.value = "";
    } else {
        console.error("failed to add task");
    }
}

function renderTask(id: string, text: string, status: string, owners: string[]): void {
    const task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");
    task.setAttribute("data-id", id);
    task.setAttribute("data-text", text);
    task.setAttribute("data-name", owners.join(", "));

    const ownerHTML = owners.map(name => {
        const color = getUserColor(name);
        return `<span style="color: ${color}; font-weight: bold;">${name}</span>`;
    }).join(", ");

    task.innerHTML = `
        <span>${text} - ${ownerHTML}</span>
        <i class="fas fa-trash delete-icon" onclick="deleteTask(this)"></i>
    `;

    task.addEventListener("dragstart", (e: DragEvent) => {
        if (!e.dataTransfer) return;
        e.dataTransfer.setData("text/plain", text);
        e.dataTransfer.setData("taskId", id);
        const currentColumn = task.closest(".column")?.id || "";
        e.dataTransfer.setData("status", currentColumn);
        e.dataTransfer.setData("name", owners.join(", "));
        setTimeout(() => {
            task.style.display = "none";
        }, 0);
    });

    task.addEventListener("dragend", () => {
        task.style.display = "flex";
    });

    const column = document.querySelector(`#${status} .tasks`) as HTMLElement | null;
    if (!column) return;
    column.appendChild(task);

    updateTaskCounts();
}

function updateTaskCounts(): void {
    const todoCount = document.querySelectorAll("#todo .task").length;
    const inProgressCount = document.querySelectorAll("#inProgress .task").length;
    const doneCount = document.querySelectorAll("#done .task").length;

    const todoTitle = document.getElementById("todoTitle");
    const inProgressTitle = document.getElementById("inProgressTitle");
    const doneTitle = document.getElementById("doneTitle");

    if (todoTitle) todoTitle.textContent = `TO DO (${todoCount})`;
    if (inProgressTitle) inProgressTitle.textContent = `IN PROGRESS (${inProgressCount})`;
    if (doneTitle) doneTitle.textContent = `DONE (${doneCount})`;
}

function deleteTask(icon: HTMLElement): void {
    const task = icon.parentElement as HTMLElement | null;
    if (task) task.remove();
}

function getUserColor(name: string, hashOffset = 0): string {
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

function goBack(): void {
    window.location.href = "index.html";
}
