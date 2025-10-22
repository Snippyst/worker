export interface TypstVersionConfig {
  version: string;
  packageVersion: string;
  useNative: boolean;
}

export const TYPST_VERSIONS: TypstVersionConfig[] = [
  {
    version: "0.13.1",
    packageVersion: "0.6.1-rc3",
    useNative: true,
  },
  {
    version: "0.13.0",
    packageVersion: "0.5.5-rc7",
    useNative: false,
  },
  {
    version: "0.12.0",
    packageVersion: "0.4.0",
    useNative: false,
  },
];

export const DEFAULT_VERSION = TYPST_VERSIONS[0].version;

export function getVersionConfig(
  version?: string
): TypstVersionConfig | undefined {
  if (!version) {
    return TYPST_VERSIONS[0];
  }
  return TYPST_VERSIONS.find((v) => v.version === version);
}

export function getSupportedVersions(): string[] {
  return TYPST_VERSIONS.map((v) => v.version);
}
