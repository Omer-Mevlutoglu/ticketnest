import { PassThrough, Readable } from "node:stream";
import type { Request } from "express";
import cloudinary from "../src/configs/cloudinary";
import { createCloudinaryStorage } from "../src/configs/cloudinaryStorage";

const uploadStreamMock = cloudinary.uploader.upload_stream as unknown as ReturnType<
  typeof vi.fn
>;
const destroyMock = cloudinary.uploader.destroy as unknown as ReturnType<
  typeof vi.fn
>;

describe("Cloudinary Multer storage", () => {
  beforeEach(() => {
    uploadStreamMock.mockReset();
    destroyMock.mockReset();
  });

  it("streams an upload and preserves Multer's path contract", async () => {
    const bytes = Buffer.from("fake-image-bytes");
    uploadStreamMock.mockImplementation((options: unknown, callback: Function) => {
      const sink = new PassThrough();
      sink.on("finish", () =>
        callback(undefined, {
          public_id: "event-posters/poster-1",
          secure_url: "https://res.cloudinary.test/poster-1.webp",
          bytes: bytes.length,
        })
      );
      return sink;
    });

    const storage = createCloudinaryStorage({ folder: "event-posters" });
    const file = {
      fieldname: "poster",
      originalname: "poster.webp",
      encoding: "7bit",
      mimetype: "image/webp",
      stream: Readable.from(bytes),
    } as Express.Multer.File;

    const info = await new Promise<Partial<Express.Multer.File>>(
      (resolve, reject) =>
        storage._handleFile({} as Request, file, (error, result) => {
          if (error) return reject(error);
          resolve(result ?? {});
        })
    );

    expect(uploadStreamMock).toHaveBeenCalledWith(
      { folder: "event-posters" },
      expect.any(Function)
    );
    expect(info).toMatchObject({
      filename: "event-posters/poster-1",
      path: "https://res.cloudinary.test/poster-1.webp",
      size: bytes.length,
    });
  });

  it("deletes the uploaded asset when Multer rolls a request back", async () => {
    destroyMock.mockResolvedValue({ result: "ok" });
    const storage = createCloudinaryStorage({ folder: "venue-images" });
    const file = { filename: "venue-images/venue-1" } as Express.Multer.File;

    await new Promise<void>((resolve, reject) =>
      storage._removeFile({} as Request, file, (error) => {
        if (error) return reject(error);
        resolve();
      })
    );

    expect(destroyMock).toHaveBeenCalledWith("venue-images/venue-1", {
      invalidate: true,
    });
  });
});
