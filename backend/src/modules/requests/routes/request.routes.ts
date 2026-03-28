import { Router } from "express";
import {
  createReclamation,
  getMyReclamations,
  createJustification,
  getMyJustifications,
  getReclamationTypes,
  getJustificationTypes,
} from "../controllers/request.controller";
import { requireAuth } from "../../../middleware/auth.middleware";
import {
  validateReclamation,
  validateJustification,
} from "../validators/request.validator";

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(requireAuth);

// ── Types (pour remplir les selects du formulaire) ──────────
router.get("/types/reclamations", getReclamationTypes);
router.get("/types/justifications", getJustificationTypes);

// ── Reclamations ────────────────────────────────────────────
router.post("/reclamations", validateReclamation, createReclamation);
router.get("/reclamations", getMyReclamations);

// ── Justifications ──────────────────────────────────────────
router.post("/justifications", validateJustification, createJustification);
router.get("/justifications", getMyJustifications);

export default router;