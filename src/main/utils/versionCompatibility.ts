/**
 * Version Compatibility Utility
 * Defines and checks version compatibility between app and server
 */

export interface VersionCheckResult {
  isCompatible: boolean;
  appVersion: string;
  serverVersion: string;
  message: string | null;
}

/**
 * Compatibility rules matrix
 * Each entry defines which server versions are compatible with each app version
 * Format: appVersion -> { minServerVersion, maxServerVersion }
 */
const COMPATIBILITY_MATRIX: Record<string, { min: string; max: string }> = {
  '1.0.0': { min: '1.0.0', max: '3.0.0' },
  '2.0.0': { min: '1.0.0', max: '3.0.0' },
  '3.0.0': { min: '1.0.0', max: '3.0.0' },
  '3.0.1': { min: '1.0.0', max: '3.0.0' },
};

/**
 * Parse semantic version string into [major, minor, patch]
 * @param version Version string (e.g., "1.2.3")
 * @returns Array of [major, minor, patch] or null if invalid
 */
export function parseVersion(version: string): [number, number, number] | null {
  // Remove leading 'v' if present
  const cleaned = version.replace(/^v/, '');
  const parts = cleaned.split('.');

  if (parts.length < 3) return null;

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    return null;
  }

  return [major, minor, patch];
}

/**
 * Compare two semantic versions
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2, null if invalid
 */
export function compareVersions(v1: string, v2: string): -1 | 0 | 1 | null {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  if (!parsed1 || !parsed2) return null;

  const [maj1, min1, pat1] = parsed1;
  const [maj2, min2, pat2] = parsed2;

  if (maj1 !== maj2) return maj1 < maj2 ? -1 : 1;
  if (min1 !== min2) return min1 < min2 ? -1 : 1;
  if (pat1 !== pat2) return pat1 < pat2 ? -1 : 1;

  return 0;
}

/**
 * Check if server version is within compatible range for app version
 * @param appVersion App version string
 * @param serverVersion Server version string
 * @returns VersionCheckResult with compatibility status and message
 */
export function checkVersionCompatibility(
  appVersion: string,
  serverVersion: string
): VersionCheckResult {
  // Parse versions
  const appParsed = parseVersion(appVersion);
  const serverParsed = parseVersion(serverVersion);

  if (!appParsed || !serverParsed) {
    return {
      isCompatible: false,
      appVersion,
      serverVersion,
      message: 'Invalid version format',
    };
  }

  // Get compatibility range for this app version (or use default)
  // For now, use a simple rule: major.minor must match or be close
  const appMajorMinor = `${appParsed[0]}.${appParsed[1]}.0`;
  const serverMajorMinor = `${serverParsed[0]}.${serverParsed[1]}.0`;

  const compatRange = COMPATIBILITY_MATRIX[appVersion];

  if (compatRange) {
    // Strict range check
    const minOk = compareVersions(serverVersion, compatRange.min) !== -1; // server >= min
    const maxOk = compareVersions(serverVersion, compatRange.max) !== 1; // server <= max

    if (!minOk || !maxOk) {
      return {
        isCompatible: false,
        appVersion,
        serverVersion,
        message: `Server version ${serverVersion} is not compatible with app version ${appVersion}. Expected server ${compatRange.min}-${compatRange.max}.`,
      };
    }
  } else {
    // Fallback: loose major version matching
    if (appParsed[0] !== serverParsed[0]) {
      return {
        isCompatible: false,
        appVersion,
        serverVersion,
        message: `Server version ${serverVersion} is not compatible with app version ${appVersion}.`,
      };
    }
  }

  return {
    isCompatible: true,
    appVersion,
    serverVersion,
    message: null,
  };
}
