import { CreateProjectRequest, DeleteProjectRequest, GetProjectByIdRequest, UpdateProjectRequest } from "./interfaces/projectInterface";

async function loadProjects() {
    const response = await fetch("http://localhost:8000/projects");
    const projects = await response.json();
    const projectList = document.getElementById("projectsList") as HTMLDivElement | null;
    if (!projectList) return;

    projectList.innerHTML = "";

    projects.forEach((project: any) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("project-item");

        const nameLink = document.createElement("a");
        nameLink.textContent = project.name;
        nameLink.href = "#";
        nameLink.classList.add("prooject-name-link");

        nameLink.onclick = (e) => {
            e.preventDefault();
            window.location.href = `project.html?id=${project.id}`;
        };

        const editIcon = document.createElement("i");
        editIcon.className = "fas fa-pen edit-icon";
        editIcon.onclick = () => openModal(project.id, project.name, project.users);

        const deleteIcon = document.createElement("i");
        deleteIcon.className = "fas fa-trash delete-icon";
        deleteIcon.onclick = () => deleteProject(project.id, project.name);

        wrapper.appendChild(nameLink);
        wrapper.appendChild(editIcon);
        wrapper.appendChild(deleteIcon);

        projectList.appendChild(wrapper);
    });
}

function addProject() {
    const input = document.getElementById("projectNameInput") as HTMLInputElement | null;
    const participantsInput = document.getElementById("participantsInput") as HTMLInputElement | null;

    if (!input || !participantsInput) return;

    const projectName = input.value.trim();
    const participantsStr = participantsInput.value.trim();
    const participants = participantsStr.split(",").map(name => name.trim());

    if (!projectName || participants.length === 0) return;

    const newProject: CreateProjectRequest = {
        name_project: projectName,
        users_list: participants
    };

    fetch("http://localhost:8000/projects", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(newProject)
    }).then(res => {
        if (res.ok) {
            loadProjects();
        } else {
            console.error("cant add project");
        }
    }).catch(err => {
        console.error("error: ", err);
    });

    input.value = "";
    participantsInput.value = "";
}

function deleteProject(id: string, name: string) {
    if (confirm(`Are you sure you want to delete project ${name}?`)) {
        const projectToDelete: DeleteProjectRequest = {
            project_id: id
        };

        fetch(`http://localhost:8000/projects/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(projectToDelete)
        }).then(res => {
            if (res.ok) loadProjects();
            else console.error("failed to delete project");
        });
    }
}

let currentProjectId: string | null = null;
let originalUsers: string[] = [];

function openModal(id: string, oldName: string, oldParticipants: string[]) {
    currentProjectId = id;
    originalUsers = [...oldParticipants];

    const nameInput = document.getElementById("newProjectNameInput") as HTMLInputElement | null;
    const participantsInput = document.getElementById("newParticipantsListInput") as HTMLInputElement | null;
    const modal = document.getElementById("modalOverlay") as HTMLDivElement | null;

    if (nameInput) nameInput.value = "";
    if (participantsInput) participantsInput.value = oldParticipants.join(", ");
    if (modal) modal.style.display = "flex";
}

function closeModal(): void {
    const modal = document.getElementById("modalOverlay") as HTMLDivElement | null;
    if (modal) modal.style.display = "none";
}

function submitUpdate(): void {
    const nameInput = document.getElementById("newProjectNameInput") as HTMLInputElement | null;
    const usersInput = document.getElementById("newParticipantsListInput") as HTMLInputElement | null;

    if (!nameInput || !usersInput || !currentProjectId) {
        alert("Missing data or no project selected.");
        return;
    }

    const newName = nameInput.value.trim();
    const usersStr = usersInput.value.trim();
    const newUsers: string[] = usersStr
        ? usersStr.split(",").map(u => u.trim()).filter(u => u.length > 0)
        : [];

    const usersChanged = JSON.stringify([...newUsers].sort()) !== JSON.stringify([...originalUsers].sort());

    if (!newName && !usersChanged) {
        alert("No changes detected.");
        return;
    }

    const dto: UpdateProjectRequest = {
        project_id: currentProjectId,
        ...(newName && { new_name: newName }),
        new_users: newUsers
    };

    fetch("http://localhost:8000/projects", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dto)
    }).then(res => {
        if (res.ok) {
            loadProjects();
            closeModal();
        } else {
            alert("Failed to update project");
        }
    });
}

window.onload = () => {
    loadProjects();
};
