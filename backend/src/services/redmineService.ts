import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

console.log("URL:", process.env.REDMINE_URL);
console.log("KEY:", process.env.REDMINE_API_KEY);

const api = axios.create({
  baseURL: process.env.REDMINE_URL,
  headers: {
    "X-Redmine-API-Key": process.env.REDMINE_API_KEY!,
  },
});

export async function listarProjetos() {

  const response = await api.get("/projects.json");

  return response.data;

}