async function loadProjects() {
    const response = await fetch("http://localhost:8000/projects");
    const projects = await response.json();
    const projectList = document.getElementById("projectsList");
    projectList.innerHTML = "";

    projects.forEach(project => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("project-item");

        const nameLink = document.createElement("a");
        nameLink.textContent = project.name;
        nameLink.href = "#";
        nameLink.classList.add("prooject-name-link");

        nameLink.onclick = (e) => {
            e.preventDefault();
            fetch(`http://localhost:8000/current-project?name=${encodeURIComponent(project.name)}`, {
                method: "POST"
            }).then(() => {
                window.location.href = "project.html";
            });
        };

        const editIcon = document.createElement("i");
        editIcon.className = "fas fa-pen edit-icon";
        editIcon.onclick = () => renameProject(project.name);

        const deleteIcon = document.createElement("i");
        deleteIcon.className = "fas fa-trash delete-icon";
        deleteIcon.onclick = () => deleteProject(project.name);

        wrapper.appendChild(nameLink);
        wrapper.appendChild(editIcon);
        wrapper.appendChild(deleteIcon);

        projectList.appendChild(wrapper);
    });
}

function addProject() {
    const input = document.getElementById("projectNameInput");
    const projectName = input.value.trim();
    const participantsInput = document.getElementById("participantsInput");
    const participantsStr = participantsInput.value.trim();
    const participants = participantsStr.split(",").map(name => name.trim());

    if (!projectName || !participants) return;

    fetch("http://localhost:8000/projects", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: projectName,
            listUsers: participants
        })
    }).then(res => {
        if (res.ok) {
            loadProjects();
        } else {
            console.error("cant add project");
        }
    }).catch(err => {
        console.error("error: ", err);
    })
    input.value = "";
    participantsInput.value = "";

}

function deleteProject(name) {
    if (confirm(`Are you sure you want to delete project ${name}?`)) {
        fetch(`http://localhost:8000/projects/${encodeURIComponent(name)}`), {
            method: "DELETE"
        }.then(res => {
            if (res.ok) loadProjects();
            else console.error("failed to delete project");
        });
    }
}

function renameProject(oldName) {
    const newName = prompt("Enter the new name for the project ", oldName)
    if (newName && newName.trim() !== "" && newName !== oldName) {
        fetch(`http://localhost:8000/projects/${encodeURIComponent(oldName)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newName: newName.trim() })
        }).then(res => {
            if (res.ok) loadProjects();
            else console.error("faild to rename project");
        });
    }
}

window.onload = loadProjects();