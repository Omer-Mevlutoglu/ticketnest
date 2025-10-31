import { Router, Request, Response, NextFunction } from "express"; 
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../configs/cloudinary";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

const router = Router();

const posterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "event-posters",
    allowed_formats: ["jpg", "png", "webp", "jpeg"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  } as any, 
});

const upload = multer({
  storage: posterStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File is not an image!"));
    }
    cb(null, true);
  },
});

router.post(
  "/poster",
  ensureAuth,
  ensureRole(["organizer", "admin"]),
  upload.single("poster"),
  (req: Request, res: Response) => {
    // --- FIX: Add types
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    res.status(201).json({ url: req.file.path });
  },
  // Error handler
  (err: any, req: Request, res: Response, next: NextFunction) => {
    // --- FIX: Add types
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    next();
  }
);

export default router;
