import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_REDMINE_URL,
  headers: {
    "X-Redmine-API-Key": import.meta.env.VITE_REDMINE_API_KEY,
    "Content-Type": "application/json",
  },
});

export default api;

export async function listarProjetosRedmine() {
  const response = await api.get("/projects.json");

  return response.data.projects;
}