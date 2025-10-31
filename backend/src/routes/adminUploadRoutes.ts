import { Router, Request, Response, NextFunction } from "express"; // --- FIX: Import types
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../configs/cloudinary";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

const router = Router();

// Configure storage for venue images
const venueStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "venue-images",
    allowed_formats: ["jpg", "png", "webp", "jpeg"],
    transformation: [{ width: 1920, height: 1080, crop: "limit" }],
  } as any, 
});

const upload = multer({
  storage: venueStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File is not an image!"));
    }
    cb(null, true);
  },
});

router.post(
  "/venue-images",
  ensureAuth,
  ensureRole(["admin"]),
  upload.array("images", 10),
  (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }
    const urls = (req.files as Express.Multer.File[]).map((file) => file.path);
    res.status(201).json({ urls });
  },
  (err: any, req: Request, res: Response, next: NextFunction) => {
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
