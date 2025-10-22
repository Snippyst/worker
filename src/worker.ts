import { parentPort } from "worker_threads";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

parentPort.on("message", (content: string) => {
  let compiler: NodeCompiler | null = null;

  try {
    compiler = NodeCompiler.create();

    const sanitizedContent = content.replace(/\0/g, "");

    // TODO Check
    const hasPageSetup = /^\s*#set\s+page\s*\(/.test(sanitizedContent);
    const finalContent = hasPageSetup
      ? sanitizedContent
      : `#set page(width: auto, height: auto)\n${sanitizedContent}`;

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
});
