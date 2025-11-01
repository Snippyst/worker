import express, { Request, Response } from "express";
import PQueue from "p-queue";
import cors from "cors";
import {
  DEFAULT_PORT,
  DEFAULT_MAX_CONCURRENT_JOBS,
  DEFAULT_QUEUE_SIZE,
  MAX_CONTENT_SIZE,
  MAX_REQUEST_BODY_SIZE,
  HTTP_STATUS,
} from "./constants";
import { RenderRequest, SuccessResponse, ErrorResponse } from "./types";
import { renderTypst } from "./typst-renderer";
import { installAllVersions } from "./cli-installer";
import { TYPST_VERSIONS } from "./config";

const app = express();

const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const MAX_CONCURRENT_JOBS = parseInt(
  process.env.MAX_CONCURRENT_JOBS || String(DEFAULT_MAX_CONCURRENT_JOBS),
  10
);
const QUEUE_SIZE = parseInt(
  process.env.QUEUE_SIZE || String(DEFAULT_QUEUE_SIZE),
  10
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: MAX_REQUEST_BODY_SIZE }));

const queue = new PQueue({ concurrency: MAX_CONCURRENT_JOBS });

app.post(
  "/render",
  async (
    req: Request<{}, {}, RenderRequest>,
    res: Response<SuccessResponse | ErrorResponse>
  ) => {
    if (req.body === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: 0,
        message: "Request body is missing",
      });
    }

    const { timeout, content, version } = req.body;

    if (!timeout || typeof timeout !== "number" || timeout <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: 0,
        message: "Invalid timeout parameter",
      });
    }

    if (!content || typeof content !== "string") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: 0,
        message: "Invalid content parameter",
      });
    }

    if (content.length > MAX_CONTENT_SIZE) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: 0,
        message: "Content exceeds maximum size of 1MB",
      });
    }

    if (version && !TYPST_VERSIONS.some(v => v.version === version)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: 0,
        message: `Invalid version parameter. Available versions: ${TYPST_VERSIONS.map(v => v.version).join(", ")}`,
      });
    }

    if (queue.size >= QUEUE_SIZE) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        time: 0,
        message: "Server is too busy, please try again later",
      });
    }

    const startTime = Date.now();

    try {
      const result = await queue.add(() => {
        const sanitizedContent = content.replace(/\0/g, "");
        const hasPageSetup = /^\s*#set\s+page\s*\(/.test(sanitizedContent);
        const finalContent = hasPageSetup
          ? sanitizedContent
          : `#set page(width: auto, height: auto, margin: 10pt)\n${sanitizedContent}`;

        return renderTypst(finalContent, timeout, version);
      });

      const elapsed = Date.now() - startTime;

      if (result.success) {
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          time: elapsed,
          content: result.content,
          version: result.version,
        });
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          time: elapsed,
          message: result.message,
        });
      }
    } catch (error: unknown) {
      const elapsed = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        time: elapsed,
        message: errorMessage,
      });
    }
  }
);

app.use((req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    time: 0,
    message: "Endpoint not found",
  });
});

app.use((err: Error, req: Request, res: Response, next: unknown) => {
  console.error("Unhandled error:", err);
  console.error("Stack trace:", err.stack);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    time: 0,
    message: "Internal server error",
  });
});

async function startServer() {
  try {
    await installAllVersions();
  } catch (error) {
    console.error("Failed to install Typst versions:", error);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Typst worker server running on port ${PORT}`);
    console.log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
    console.log(`Queue size: ${QUEUE_SIZE}`);
    console.log(`Available versions: ${TYPST_VERSIONS.map(v => v.version).join(", ")}`);
  });

  server.on("error", (error: Error) => {
    console.error("Failed to start server:");
    console.error(error);
    process.exit(1);
  });
}

startServer();
