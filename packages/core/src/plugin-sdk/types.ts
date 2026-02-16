/**
 * CcfmPluginApi — the 12-method registration interface for plugins.
 * Equivalent to OpenClaw's OpenClawPluginApi.
 */

import type {
  PluginHookName, PluginHookHandler, PluginToolRegistration,
  PluginChannelRegistration, PluginProviderRegistration,
  PluginCommandDefinition, PluginServiceDefinition,
} from "@ccfm/shared";

/** HTTP handler registered by a plugin. */
export interface PluginHttpHandler {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: (req: PluginHttpRequest) => Promise<PluginHttpResponse>;
}

export interface PluginHttpRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

export interface PluginHttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

/** Gateway method registered by a plugin. */
export interface PluginGatewayMethod {
  name: string;
  handler: (payload: unknown) => Promise<unknown>;
}

/** CLI command registered by a plugin. */
export interface PluginCliRegistration {
  command: string;
  description: string;
  options?: Array<{
    flag: string;
    description: string;
    default?: unknown;
  }>;
  handler: (args: Record<string, unknown>) => Promise<void>;
}

/** The main plugin API — passed to each plugin's init function. */
export interface CcfmPluginApi {
  /** Register a tool (function calling). */
  registerTool(tool: PluginToolRegistration): void;

  /** Register a hook handler. */
  registerHook<H extends PluginHookName>(
    hookName: H,
    handler: PluginHookHandler,
    priority?: number,
  ): void;

  /** Register an HTTP request handler (arbitrary path). */
  registerHttpHandler(handler: PluginHttpHandler): void;

  /** Register an HTTP route (auto-prefixed under plugin namespace). */
  registerHttpRoute(handler: PluginHttpHandler): void;

  /** Register a channel adapter. */
  registerChannel(channel: PluginChannelRegistration): void;

  /** Register a gateway WebSocket method. */
  registerGatewayMethod(method: PluginGatewayMethod): void;

  /** Register a CLI command. */
  registerCli(cli: PluginCliRegistration): void;

  /** Register a background service. */
  registerService(service: PluginServiceDefinition): void;

  /** Register a provider adapter. */
  registerProvider(provider: PluginProviderRegistration): void;

  /** Register a chat command (e.g., /mycommand). */
  registerCommand(command: PluginCommandDefinition): void;

  /** Listen for typed hook events. */
  on<H extends PluginHookName>(
    hookName: H,
    handler: PluginHookHandler,
  ): void;

  /** Plugin config access. */
  getConfig(): Record<string, unknown>;
}

/** Plugin init function signature. */
export type PluginInitFn = (api: CcfmPluginApi) => void | Promise<void>;

/** Plugin cleanup function signature. */
export type PluginCleanupFn = () => void | Promise<void>;

/** Full plugin module interface. */
export interface CcfmPlugin {
  name: string;
  version?: string;
  init: PluginInitFn;
  cleanup?: PluginCleanupFn;
}
