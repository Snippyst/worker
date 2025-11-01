import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import { TYPST_VERSIONS, BASE_DOWNLOAD_URL } from "./config";

const BIN_DIR = path.join(__dirname, "..", "bin");

function getArchitecture(): string {
  const arch = process.arch;
  if (arch === "x64") return "x86_64-unknown-linux-musl";
  if (arch === "arm64") return "aarch64-unknown-linux-musl";
  throw new Error(`Unsupported architecture: ${arch}`);
}

function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function validateChecksum(filePath: string, expectedChecksum: string): boolean {
  if (!expectedChecksum) return true;
  const actualChecksum = calculateChecksum(filePath);
  return actualChecksum === expectedChecksum;
}

export function downloadAndInstallTypst(version: string): void {
  const versionConfig = TYPST_VERSIONS.find((v) => v.version === version);
  if (!versionConfig) {
    throw new Error(`Version ${version} not found in config`);
  }

  const arch = getArchitecture();
  // @ts-ignore
  const expectedChecksum = versionConfig.checksums[arch];
  const fileName = `typst-${arch}.tar.xz`;
  const downloadUrl = `${BASE_DOWNLOAD_URL}/v${version}/${fileName}`;
  const downloadPath = path.join(BIN_DIR, `${version}-${fileName}`);
  const extractDir = path.join(BIN_DIR, version);

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  if (fs.existsSync(path.join(extractDir, "typst"))) {
    console.log(`Typst ${version} already installed`);
    return;
  }

  console.log(`Downloading Typst ${version} from ${downloadUrl}`);
  execSync(`curl -L -o "${downloadPath}" "${downloadUrl}"`, {
    stdio: "inherit",
  });

  if (!validateChecksum(downloadPath, expectedChecksum)) {
    fs.unlinkSync(downloadPath);
    throw new Error(`Checksum validation failed for version ${version}`);
  }

  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  console.log(`Extracting Typst ${version}`);
  execSync(
    `tar -xf "${downloadPath}" -C "${extractDir}" --strip-components=1`,
    { stdio: "inherit" }
  );

  fs.unlinkSync(downloadPath);

  const typstBinary = path.join(extractDir, "typst");
  fs.chmodSync(typstBinary, 0o755);

  console.log(`Typst ${version} installed successfully`);
}

export async function installAllVersions(): Promise<void> {
  console.log("Installing all Typst versions...");
  for (const versionConfig of TYPST_VERSIONS) {
    try {
      downloadAndInstallTypst(versionConfig.version);
    } catch (error) {
      console.error(
        `Failed to install version ${versionConfig.version}:`,
        error
      );
    }
  }
  console.log("All versions installed");
}

export function getTypstBinaryPath(version?: string): string {
  const targetVersion = version || TYPST_VERSIONS[0].version;
  const binaryPath = path.join(BIN_DIR, targetVersion, "typst");

  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Typst binary not found for version ${targetVersion}. Run installation first.`
    );
  }

  return binaryPath;
}
