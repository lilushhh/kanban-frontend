export interface CreateProjectRequest {
    name_project: string;
    users_list: string[];
}

export interface DeleteProjectRequest {
    project_id: string;
}

export interface GetProjectByIdRequest {
    project_id: string;
}

export interface UpdateProjectRequest {
    project_id: string;
    name_project: string;
    users_list: string[];
}