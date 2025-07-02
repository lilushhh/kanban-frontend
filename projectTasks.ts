let projectId: string | null = null;
const urlParams = new URLSearchParams(window.location.search);
const idParam = urlParams.get("id");
if (!idParam) {
    console.error("Missing project ID");
}

projectId = idParam;

async function loadTasks() :Promise<void>{
    const res = await fetch("http://localhost:8000/tasks");
    if(!res.ok){
        console.error("Failed to fetch tasks");
        return;
    }
    const allTasks = await res.json();
    const tasks = allTasks.filter((task:any) => task.project_id === projectId);

    document.querySelectorAll(".tasks").forEach(zone => {
        zone.innerHTML = "";
    });
    tasks.forEach((task: any) => {
        renderTask(task.id, task.text, task.status, task.owners);
    });
    updateTaskCounts();
}
async function renderParticipants() : Promise<void>{
    const res = await fetch(`http://localhost:8000/projects/${projectId}`);
    if(!res.ok){
        console.error("Project not found");
        return;
    }
    const currentProject = await res.json();
    const participantsLine = document.getElementById("participantsLine");
    if(!participantsLine) return;

    participantsLine.innerHTML = "";

    currentProject.users.forEach((user: string) => {
        const span = document.createElement("span");
        span.textContent = user;
        span.className = "participant-tag";
        span.style.color = getUserColor(user);
        participantsLine.appendChild(span);
    })
}

let projectParticipants: string[] = [];
let currentTaskOwners: string[] = [];

function addName(): string[] {
    const nameInput = document.getElementById("nameInput") as HTMLInputElement | null;
    const participantsLine = document.getElementById("participantsLine");

    if(!nameInput || !participantsLine) return [];

    const rawInput = nameInput.value.trim();
    if(!rawInput) return [];

    const names = rawInput.split(",").map(n => n.trim()).filter(n => n !== "");

    const addedUsers: string[] = [];

    names.forEach(inputName => {
        const match = projectParticipants.find(p => p.toLowerCase()===inputName.toLowerCase());

        if(!match){
            alert(`${inputName} is not part of this project!`);
            return;
        }
        if( currentTaskOwners.includes(match)) return;
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

function renderTask(id: any, text: any, status: any, owners: any) {
    throw new Error("Function not implemented.");
}
function updateTaskCounts() {
    throw new Error("Function not implemented.");
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