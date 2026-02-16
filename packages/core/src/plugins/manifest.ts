/**
 * Plugin manifest (ccfm.plugin.json) parsing and validation.
 */

import { z } from "zod";
import type { PluginManifest } from "@ccfm/shared";

const pluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  description: z.string().optional(),
  entry: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  hooks: z.array(z.string()).optional(),
  configSchema: z.record(z.unknown()).optional(),
});

/** Validate a plugin manifest object. */
export function validateManifest(raw: unknown): {
  valid: boolean;
  manifest?: PluginManifest;
  errors?: string[];
} {
  const result = pluginManifestSchema.safeParse(raw);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { valid: true, manifest: result.data as PluginManifest };
}
