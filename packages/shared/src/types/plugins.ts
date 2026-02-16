/**
 * Plugin system types.
 * Matches OpenClaw's 17-hook, 12-method plugin API.
 */

/** All 17 plugin hook names. */
export type PluginHookName =
  | "beforeAgentStart"
  | "llmInput"
  | "llmOutput"
  | "beforeToolCall"
  | "afterToolCall"
  | "beforeCompaction"
  | "afterCompaction"
  | "messageReceived"
  | "messageSending"
  | "messageSent"
  | "messagePersist"
  | "sessionStart"
  | "sessionEnd"
  | "sessionReset"
  | "gatewayConnect"
  | "gatewayDisconnect"
  | "agentError";

export interface PluginHookEvent {
  hookName: PluginHookName;
  timestamp: number;
  pluginId?: string;
  data: Record<string, unknown>;
}

/** Hook handler function type. */
export type PluginHookHandler = (event: PluginHookEvent) => Promise<void | Record<string, unknown>>;

/** Hook handler map - typed per hook name. */
export type PluginHookHandlerMap = Record<PluginHookName, PluginHookHandler>;

export interface PluginHookRegistration {
  pluginId: string;
  hookName: PluginHookName;
  handler: PluginHookHandler;
  priority?: number;
  /** "void" hooks run in parallel; "modifying" hooks run sequentially. */
  mode?: "void" | "modifying";
}

export interface PluginToolRegistration {
  pluginId: string;
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (input: unknown) => Promise<unknown>;
  optional?: boolean;
}

export interface PluginChannelRegistration {
  pluginId: string;
  channelId: string;
  factory: () => unknown; // ChannelPlugin instance
}

export interface PluginProviderRegistration {
  pluginId: string;
  providerId: string;
  displayName: string;
  authMethod: "api_key" | "token" | "oauth" | "device_code" | "custom";
  factory: () => unknown;
}

export interface PluginCommandDefinition {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  requireAuth?: boolean;
  handler: (args: string, context: unknown) => Promise<string | void>;
}

export interface PluginServiceDefinition {
  name: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface PluginHttpRouteRegistration {
  pluginId: string;
  path: string;
  handler: (req: unknown, res: unknown) => Promise<void>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  main: string;
  type?: "channel" | "provider" | "tool" | "general";
  requires?: {
    bins?: string[];
    env?: string[];
    config?: string[];
  };
  configSchema?: Record<string, unknown>;
}
