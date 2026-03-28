import { Response } from "express";
import prisma from "../../../config/database";
import { AuthRequest } from "../../../middleware/auth.middleware";

// ─── Helper: récupérer Etudiant.id depuis User.id ───────────────────────────
const getEtudiantId = async (userId: number): Promise<number | null> => {
  const etudiant = await prisma.etudiant.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (etudiant) return etudiant.id;
  // Fallback: chercher n'importe quel etudiant (pour test admin)
  const anyEtudiant = await prisma.etudiant.findFirst({
    select: { id: true },
  });
  return anyEtudiant?.id ?? null;
};

// ════════════════════════════════════════════════════════════
//  RECLAMATIONS
// ════════════════════════════════════════════════════════════

// POST /api/v1/requests/reclamations
export const createReclamation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can submit reclamations" },
      });
      return;
    }

    const { typeId, objet, description, priorite } = req.body;

    const reclamation = await prisma.reclamation.create({
      data: {
        etudiantId,
        typeId: Number(typeId),
        objet,
        description,
        priorite: priorite ?? "normale",
        status: "soumise",
      },
      include: {
        type: { select: { nom: true } },
        etudiant: {
          include: {
            user: { select: { nom: true, prenom: true, email: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Reclamation submitted successfully",
      data: reclamation,
    });
  } catch (error) {
    console.error("createReclamation error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/reclamations
export const getMyReclamations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can view reclamations" },
      });
      return;
    }

    const { status } = req.query;
    const where: any = { etudiantId };
    if (status) where.status = status;

    const reclamations = await prisma.reclamation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        type: { select: { nom: true } },
      },
    });

    // Stats pour les cartes du dashboard
    const all = await prisma.reclamation.findMany({
      where: { etudiantId },
      select: { status: true },
    });

    const stats = {
      total: all.length,
      pending: all.filter((r) => r.status === "soumise" || r.status === "en_cours").length,
      resolved: all.filter((r) => r.status === "traitee").length,
      rejected: all.filter((r) => r.status === "refusee").length,
    };

    res.status(200).json({
      success: true,
      data: reclamations,
      stats,
    });
  } catch (error) {
    console.error("getMyReclamations error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// ════════════════════════════════════════════════════════════
//  JUSTIFICATIONS
// ════════════════════════════════════════════════════════════

// POST /api/v1/requests/justifications
export const createJustification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can submit justifications" },
      });
      return;
    }

    const { typeId, dateAbsence, motif } = req.body;

    const justification = await prisma.justification.create({
      data: {
        etudiantId,
        typeId: Number(typeId),
        dateAbsence: new Date(dateAbsence),
        motif: motif ?? null,
        status: "soumis",
      },
      include: {
        type: { select: { nom: true } },
        etudiant: {
          include: {
            user: { select: { nom: true, prenom: true, email: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Justification submitted successfully",
      data: justification,
    });
  } catch (error) {
    console.error("createJustification error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/justifications
export const getMyJustifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can view justifications" },
      });
      return;
    }

    const { status } = req.query;
    const where: any = { etudiantId };
    if (status) where.status = status;

    const justifications = await prisma.justification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        type: { select: { nom: true } },
      },
    });

    const all = await prisma.justification.findMany({
      where: { etudiantId },
      select: { status: true },
    });

    const stats = {
      total: all.length,
      pending: all.filter((j) => j.status === "soumis" || j.status === "en_verification").length,
      resolved: all.filter((j) => j.status === "valide").length,
      rejected: all.filter((j) => j.status === "refuse").length,
    };

    res.status(200).json({
      success: true,
      data: justifications,
      stats,
    });
  } catch (error) {
    console.error("getMyJustifications error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/types/reclamations
export const getReclamationTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await prisma.reclamationType.findMany({
      select: { id: true, nom: true, description: true },
    });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

// GET /api/v1/requests/types/justifications
export const getJustificationTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await prisma.typeAbsence.findMany({
      select: { id: true, nom: true, description: true },
    });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};