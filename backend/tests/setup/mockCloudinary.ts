import { vi } from "vitest";

/**
 * Cloudinary is a process-wide SDK singleton. Replacing it before app modules
 * load guarantees an upload test can never authenticate to or mutate a real
 * account, even when a developer has provider credentials in their shell.
 */
const cloudinary = {
  config: vi.fn(),
  uploader: {
    upload: vi.fn(),
    upload_stream: vi.fn(),
    destroy: vi.fn(),
  },
};

vi.mock("cloudinary", () => ({ v2: cloudinary }));
