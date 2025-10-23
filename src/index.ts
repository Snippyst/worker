import express, { Request, Response } from "express";
import PQueue from "p-queue";
import { Worker } from "worker_threads";
import path from "path";
import cors from "cors";
import { getSupportedVersions, DEFAULT_VERSION } from "./typst-versions";

const app = express();
const PORT = process.env.PORT || 3010;
const MAX_CONCURRENT_JOBS = parseInt(
  process.env.MAX_CONCURRENT_JOBS || "4",
  10
);
const QUEUE_SIZE = parseInt(process.env.QUEUE_SIZE || "10", 10);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));

const queue = new PQueue({ concurrency: MAX_CONCURRENT_JOBS });

interface RenderRequest {
  timeout?: number;
  content?: string;
  version?: string;
}

interface SuccessResponse {
  success: true;
  time: number;
  content: string;
  version: string;
}

interface ErrorResponse {
  success: false;
  time: number;
  message: string;
}

app.post(
  "/render",
  async (
    req: Request<{}, {}, RenderRequest>,
    res: Response<SuccessResponse | ErrorResponse>
  ) => {
    if (req.body === undefined) {
      return res.status(400).json({
        success: false,
        time: 0,
        message: "Request body is missing",
      });
    }
    const { timeout, content, version } = req.body;

    if (!timeout || typeof timeout !== "number" || timeout <= 0) {
      return res.status(400).json({
        success: false,
        time: 0,
        message: "Invalid timeout parameter",
      });
    }

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        success: false,
        time: 0,
        message: "Invalid content parameter",
      });
    }

    if (content.length > 1024 * 1024) {
      return res.status(400).json({
        success: false,
        time: 0,
        message: "Content exceeds maximum size of 1MB",
      });
    }

    if (queue.size >= QUEUE_SIZE) {
      return res.status(503).json({
        success: false,
        time: 0,
        message: "Server is too busy, please try again later",
      });
    }

    const startTime = Date.now();

    try {
      const result = await queue.add(() =>
        renderTypst(content, timeout, version)
      );

      const elapsed = Date.now() - startTime;

      if (result.success) {
        return res.status(200).json({
          success: true,
          time: elapsed,
          content: result.content,
          version: result.version,
        });
      } else {
        return res.status(400).json({
          success: false,
          time: elapsed,
          message: result.message,
        });
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime;

      if (error.name === "TimeoutError" || elapsed >= timeout) {
        return res.status(408).send();
      }

      return res.status(400).json({
        success: false,
        time: elapsed,
        message: error.message || "Unknown error occurred",
      });
    }
  }
);

app.get("/versions", (req: Request, res: Response) => {
  res.json({
    versions: getSupportedVersions(),
    default: DEFAULT_VERSION,
  });
});

async function renderTypst(
  content: string,
  timeout: number,
  version?: string
): Promise<
  | { success: true; content: string; version: string }
  | { success: false; message: string }
> {
  return new Promise((resolve, reject) => {
    const isDev = __filename.endsWith(".ts");
    const workerPath = isDev
      ? path.join(__dirname, "worker.ts")
      : path.join(__dirname, "worker.js");
    const worker = new Worker(workerPath, {
      execArgv: isDev ? ["--require", "tsx/cjs"] : undefined,
    });

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error("Timeout"));
    }, timeout);

    worker.on(
      "message",
      (result: {
        success: boolean;
        content?: string;
        message?: string;
        version?: string;
      }) => {
        clearTimeout(timeoutId);
        worker.terminate();

        if (result.success) {
          resolve({
            success: true,
            content: result.content!,
            version: result.version!,
          });
        } else {
          resolve({ success: false, message: result.message! });
        }
      }
    );

    worker.on("error", (error) => {
      clearTimeout(timeoutId);
      worker.terminate();
      console.error("Worker error:", error);
      console.error("Stack trace:", error.stack);
      resolve({ success: false, message: error.message || "Worker error" });
    });

    worker.on("exit", (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        resolve({
          success: false,
          message: `Worker stopped with exit code ${code}`,
        });
      }
    });

    worker.postMessage({ content, version });
  });
}

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    time: 0,
    message: "Endpoint not found",
  });
});

app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error("Unhandled error:", err);
  console.error("Stack trace:", err.stack);
  res.status(500).json({
    success: false,
    time: 0,
    message: "Internal server error",
  });
});

const server = app.listen(PORT, () => {
  console.log(`Typst worker server running on port ${PORT}`);
  console.log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
  console.log(`Queue size: ${QUEUE_SIZE}`);
});

server.on("error", (error) => {
  console.error("Failed to start server:");
  console.error(error);
  process.exit(1);
});
