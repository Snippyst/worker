import { spawn } from "child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DEFAULT_COMPILATION_TIMEOUT_MS, MAX_SVG_SIZE } from "./constants";
import { RenderResult } from "./types";
import { getTypstBinaryPath } from "./cli-installer";
import { DEFAULT_VERSION } from "./config";

function mergeSVGsVertically(svgPaths: string[]): string {
  const viewBoxRegex = /<svg[^>]*viewBox="([^"]*)"[^>]*>/;

  // Check total file size before reading any files
  let totalSize = 0;
  for (const path of svgPaths) {
    const stats = statSync(path);
    totalSize += stats.size;
    if (totalSize > MAX_SVG_SIZE) {
      throw new Error(
        `SVG output exceeds maximum size of ${MAX_SVG_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  const svgStrings = svgPaths.map((path) => readFileSync(path, "utf-8"));

  const viewBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
  const contents: string[] = [];

  svgStrings.forEach((svg) => {
    const match = svg.match(viewBoxRegex);
    if (match) {
      const [x, y, w, h] = match[1].split(" ").map(Number);
      viewBoxes.push({ x, y, w, h });

      const contentStart = svg.indexOf(">") + 1;
      const contentEnd = svg.lastIndexOf("</svg>");
      const content = svg.slice(contentStart, contentEnd);
      contents.push(content);
    }
  });

  const maxWidth = Math.max(...viewBoxes.map((vb) => vb.w));
  const totalHeight = viewBoxes.reduce((sum, vb) => sum + vb.h, 0);
  const mergedViewBox = `0 0 ${maxWidth} ${totalHeight}`;

  let yOffset = 0;
  const mergedContent = contents
    .map((content, i) => {
      const result = `<g transform="translate(0, ${yOffset})">${content}</g>`;
      yOffset += viewBoxes[i].h;
      return result;
    })
    .join("");

  return `<svg style="overflow: visible;" class="typst-doc" viewBox="${mergedViewBox}" width="${maxWidth}" height="${totalHeight}" data-width="${maxWidth}" data-height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:h5="http://www.w3.org/1999/xhtml">${mergedContent}</svg>`;
}

export async function renderTypst(
  content: string,
  timeout: number = DEFAULT_COMPILATION_TIMEOUT_MS,
  version?: string
): Promise<RenderResult> {
  const targetVersion = version || DEFAULT_VERSION;
  const tmpDir = mkdtempSync(join(tmpdir(), "typst-"));
  const outputTemplate = join(tmpDir, "{0p}.svg");

  return new Promise((resolve) => {
    const cleanup = () => {
      rmSync(tmpDir, { recursive: true, force: true });
    };

    let typstBinary: string;
    try {
      typstBinary = getTypstBinaryPath(targetVersion);
    } catch (error) {
      cleanup();
      resolve({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get Typst binary",
      });
      return;
    }

    const cli = spawn(typstBinary, [
      "compile",
      "--format",
      "svg",
      "-",
      outputTemplate,
    ]);

    let errorOutput = "";
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      cli.kill("SIGKILL");
    }, timeout);

    cli.stdin.write(content);
    cli.stdin.end();

    cli.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    cli.on("close", (code: number | null) => {
      clearTimeout(timeoutHandle);

      if (timedOut) {
        cleanup();
        resolve({
          success: false,
          message: `Compilation exceeded ${timeout}ms timeout`,
        });
        return;
      }

      if (code === 0) {
        try {
          const svgFiles = readdirSync(tmpDir)
            .sort()
            .map((file) => join(tmpDir, file));

          const mergedSvg = mergeSVGsVertically(svgFiles);

          cleanup();
          resolve({
            success: true,
            content: mergedSvg,
            version: targetVersion,
          });
        } catch (error: unknown) {
          cleanup();
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error during SVG merging";
          resolve({
            success: false,
            message: errorMessage,
          });
        }
      } else {
        cleanup();
        resolve({
          success: false,
          message: errorOutput || `Compilation failed with exit code ${code}`,
        });
      }
    });

    cli.on("error", (error: Error) => {
      clearTimeout(timeoutHandle);
      cleanup();
      resolve({
        success: false,
        message: `Failed to spawn Typst process: ${error.message}`,
      });
    });
  });
}
