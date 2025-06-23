async function loadProjects() {
    const projects = await fetch("http://localhost:8000/projects").then(res => res.json());
    const projectList = document.getElementById("projectsList");
    projectList.innerHTML = "";

    projects.forEach(project => {
        const btn = document.createElement("button");
        btn.textContent = project.name;
        btn.onclick = () => {
            fetch(`http://localhost:8000/current-project?name=${encodeURIComponent(project.name)}`, {
                method: "POST"
            }).then(() => {
                window.location.href = "project.html";
            });
        };
        projectList.appendChild(btn);
    });
}

function addProject() {
    const input = document.getElementById("projectNameInput");
    const projectName = input.value.trim();

    if (!projectName) return;

    fetch("http://localhost:8000/projects", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: projectName })
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

}
window.onload = loadProjects();