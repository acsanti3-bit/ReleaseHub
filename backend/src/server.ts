import express from "express";
import cors from "cors";

import redmineRoutes from "./routes/redmine";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", redmineRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});