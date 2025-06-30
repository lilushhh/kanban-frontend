export interface TaskGetRequest {
    project_id: string;
}

export interface CreateTaskRequest {
    project_id: string;
    task_title: string;
    owners_list: string[];
    status_task: "todo" | "inProgress" | "done";
}

export interface DeleteTaskRequest {
    project_id: string;
    task_id: string;
}

export interface UpdateTaskRequest {
    project_id: string;
    task_id: string;
    task_title: string;
    owners_list: string[];
    status_task: "todo" | "inProgress" | "done";
}

export interface GetTaskByIdRequest {
    project_id: string;
    task_id: string;
}