import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

const router = Router();

// Ensure upload dir exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "venues");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB/file
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error("Images only"));
    cb(null, true);
  },
});

// POST /api/uploads/venue  (field: files)
router.post(
  "/venue",
  ensureAuth,
  ensureRole(["admin"]),
  upload.array("files", 10),
  (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/venues/${f.filename}`);
    res.status(201).json({ urls });
  }
);

export default router;
