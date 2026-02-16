/**
 * System diagnostics for health checks and debug info.
 */

import { platform, arch, release, totalmem, freemem, cpus, uptime } from "node:os";
import { CCFM_VERSION } from "@ccfm/shared";

export interface SystemDiagnostics {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  cpuCount: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  uptimeSeconds: number;
  processUptimeSeconds: number;
  pid: number;
}

/** Collect system diagnostics. */
export function collectDiagnostics(): SystemDiagnostics {
  return {
    version: CCFM_VERSION,
    nodeVersion: process.version,
    platform: platform(),
    arch: arch(),
    osRelease: release(),
    cpuCount: cpus().length,
    totalMemoryMb: Math.round(totalmem() / 1024 / 1024),
    freeMemoryMb: Math.round(freemem() / 1024 / 1024),
    uptimeSeconds: Math.round(uptime()),
    processUptimeSeconds: Math.round(process.uptime()),
    pid: process.pid,
  };
}

/** Format diagnostics as a human-readable string. */
export function formatDiagnostics(diag: SystemDiagnostics): string {
  return [
    `CCFM Bot v${diag.version}`,
    `Node ${diag.nodeVersion} on ${diag.platform} ${diag.arch}`,
    `OS: ${diag.osRelease}`,
    `CPUs: ${diag.cpuCount}, RAM: ${diag.freeMemoryMb}/${diag.totalMemoryMb} MB free`,
    `Uptime: ${Math.round(diag.processUptimeSeconds)}s (system: ${diag.uptimeSeconds}s)`,
    `PID: ${diag.pid}`,
  ].join("\n");
}
