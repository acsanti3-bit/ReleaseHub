import { Router } from "express";
import { listarProjetos } from "../services/redmineService";

const router = Router();

router.get("/projects", async (_req, res) => {
  try {
    const projetos = await listarProjetos();
    res.json(projetos);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Erro ao consultar Redmine",
    });
  }
});

export default router;