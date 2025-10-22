import { parentPort } from "worker_threads";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import { getVersionConfig } from "./typst-versions";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

parentPort.on(
  "message",
  async (message: { content: string; version?: string }) => {
    const { content, version } = message;
    const config = getVersionConfig(version);

    if (!config) {
      parentPort!.postMessage({
        success: false,
        message: `Unsupported Typst version: ${version}`,
      });
      return;
    }

    if (config.useNative) {
      compileWithNative(content, config.version);
    } else {
      // Not implemented yet

      parentPort!.postMessage({
        success: false,
        message: `WASM compilation not implemented yet for version: ${config.version}`,
      });
      await compileWithWasm(content, config.version);
      return;
    }
  }
);

function compileWithNative(content: string, version: string) {
  let compiler: NodeCompiler | null = null;

  try {
    compiler = NodeCompiler.create();

    const sanitizedContent = content.replace(/\0/g, "");

    const hasPageSetup = /^\s*#set\s+page\s*\(/.test(sanitizedContent);
    const finalContent = hasPageSetup
      ? sanitizedContent
      : `#set page(width: auto, height: auto, margin: 10pt)\n${sanitizedContent}`;

    const compileResult = compiler.compile({
      mainFileContent: finalContent,
    });

    if (!compileResult.result) {
      const diagError = compileResult.takeDiagnostics();
      const diagnostics = diagError ? compiler.fetchDiagnostics(diagError) : [];

      const formattedDiagnostics = diagnostics
        .map((diag: any) => {
          const severity = diag.severity || "error";
          const message = diag.message || "Unknown error";
          const span = diag.span;

          if (span) {
            return `${severity}: ${message} at line ${span.start?.line || "?"}`;
          }
          return `${severity}: ${message}`;
        })
        .join("\n");

      parentPort!.postMessage({
        success: false,
        message: formattedDiagnostics || "Compilation failed",
      });
      return;
    }

    const svg = compiler.svg(compileResult.result);

    if (!svg || typeof svg !== "string" || svg.length === 0) {
      parentPort!.postMessage({
        success: false,
        message: "Failed to generate SVG output",
      });
      return;
    }

    if (svg.length > 2 * 1024 * 1024) {
      parentPort!.postMessage({
        success: false,
        message: "SVG output is too large",
      });
      return;
    }

    parentPort!.postMessage({
      success: true,
      content: svg,
      version,
    });
  } catch (error: any) {
    parentPort!.postMessage({
      success: false,
      message: error.message || "Compilation failed",
    });
  } finally {
    if (compiler) {
      try {
        compiler.evictCache(10);
      } catch (e) {}
    }
  }
}

async function compileWithWasm(content: string, version: string) {
  // TODO
}
