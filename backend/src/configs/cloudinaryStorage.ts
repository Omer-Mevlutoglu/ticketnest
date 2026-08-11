import type { Request } from "express";
import multer from "multer";
import type { UploadApiOptions } from "cloudinary";
import cloudinary from "./cloudinary";

/**
 * Minimal Multer storage adapter for the Cloudinary v2 SDK.
 *
 * Keeping this integration local removes the unmaintained adapter that pinned
 * Cloudinary v1. `filename` stores the public id Multer needs for cleanup, and
 * `path` preserves the URL contract consumed by the upload routes.
 */
export const createCloudinaryStorage = (
  options: UploadApiOptions
): multer.StorageEngine => ({
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void
  ) {
    let completed = false;
    const complete = (
      error?: unknown,
      info?: Partial<Express.Multer.File>
    ) => {
      if (completed) return;
      completed = true;
      callback(error, info);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return complete(error);
        if (!result) return complete(new Error("Cloudinary returned no result"));

        complete(undefined, {
          filename: result.public_id,
          path: result.secure_url,
          size: result.bytes,
        });
      }
    );

    uploadStream.once("error", complete);
    file.stream.once("error", (error) => {
      uploadStream.destroy();
      complete(error);
    });
    file.stream.pipe(uploadStream);
  },

  _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void
  ) {
    if (!file.filename) return callback(null);

    cloudinary.uploader
      .destroy(file.filename, { invalidate: true })
      .then(() => callback(null))
      .catch((error: unknown) =>
        callback(error instanceof Error ? error : new Error(String(error)))
      );
  },
});
