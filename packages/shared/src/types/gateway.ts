/**
 * Gateway server types.
 * Matches OpenClaw's gateway with WebSocket protocol and hooks.
 */

export interface GatewayConfig {
  port: number;
  host?: string;
  token?: string;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  cors?: {
    origin: string | string[];
  };
}

export interface GatewayAuth {
  type: "token" | "ip" | "none";
  token?: string;
  allowedIps?: string[];
}

/** WebSocket protocol message types. */
export type WsMessageType =
  | "chat.send"
  | "chat.reply"
  | "chat.stream"
  | "chat.stream.end"
  | "session.list"
  | "session.reset"
  | "status.get"
  | "config.get"
  | "config.update"
  | "error";

export interface WsMessage {
  type: WsMessageType;
  id?: string;
  payload?: unknown;
  error?: string;
}

/** Hook endpoint configuration. */
export interface HookConfig {
  basePath: string;
  token: string;
  maxBodyBytes: number;
  mappings: HookMapping[];
  agentPolicy: {
    defaultAgentId: string;
    knownAgentIds: Set<string>;
    allowedAgentIds?: Set<string>;
  };
  sessionPolicy: {
    defaultSessionKey?: string;
    allowRequestSessionKey: boolean;
    allowedSessionKeyPrefixes?: string[];
  };
}

export interface HookMapping {
  path: string;
  agentId?: string;
  sessionKey?: string;
  action: "wake" | "agent" | "custom";
}
