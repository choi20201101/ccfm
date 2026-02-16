/**
 * Zod schema for CCFM configuration validation.
 * Full parity with the CcfmConfig type in @ccfm/shared.
 */

import { z } from "zod";

// --- Sub-schemas ---

const botSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
}).optional();

const agentIdentitySchema = z.object({
  name: z.string().optional(),
  persona: z.string().optional(),
  systemPrompt: z.string().optional(),
  avatar: z.string().optional(),
}).optional();

const subagentSchema = z.object({
  id: z.string(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  maxDepth: z.number().int().positive().optional(),
});

const agentConfigSchema = z.object({
  id: z.string(),
  identity: z.object({
    name: z.string(),
    description: z.string().optional(),
    avatar: z.string().optional(),
    systemPrompt: z.string().optional(),
    identityFile: z.string().optional(),
  }),
  defaults: z.object({
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    contextTokens: z.number().int().positive().optional(),
    thinkLevel: z.enum(["off", "minimal", "low", "medium", "high", "xhigh"]).optional(),
    reasoningLevel: z.enum(["off", "on", "stream"]).optional(),
  }).optional(),
  skills: z.array(z.string()).optional(),
  subagents: z.array(subagentSchema).optional(),
  groupChat: z.object({
    activateOnMention: z.boolean(),
    activateOnReply: z.boolean(),
    activateOnKeyword: z.array(z.string()).optional(),
  }).optional(),
  toolPolicy: z.object({
    allowedTools: z.array(z.string()).optional(),
    blockedTools: z.array(z.string()).optional(),
    requireApproval: z.array(z.string()).optional(),
  }).optional(),
});

const agentDefaultsSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  contextTokens: z.number().int().positive().optional(),
  thinkLevel: z.enum(["off", "minimal", "low", "medium", "high", "xhigh"]).optional(),
  reasoningLevel: z.enum(["off", "on", "stream"]).optional(),
  heartbeat: z.object({
    enabled: z.boolean(),
    intervalMs: z.number().int().positive(),
    target: z.string().optional(),
  }).optional(),
}).optional();

const agentsSchema = z.object({
  defaults: agentDefaultsSchema,
  list: z.array(agentConfigSchema).optional(),
  defaultAgentId: z.string().optional(),
}).optional();

const modelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  reasoning: z.boolean().optional(),
  input: z.array(z.enum(["text", "image"])).optional(),
  cost: z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
    cacheRead: z.number().nonnegative().optional(),
    cacheWrite: z.number().nonnegative().optional(),
  }).optional(),
  contextWindow: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
});

const providerConfigSchema = z.object({
  baseUrl: z.string(),
  api: z.enum(["anthropic-messages", "openai-completions", "ollama", "bedrock-converse-stream", "google-generative"]),
  apiKey: z.string().optional(),
  auth: z.enum(["aws-sdk", "oauth"]).optional(),
  models: z.array(modelDefinitionSchema),
  implicit: z.boolean().optional(),
});

const modelsSchema = z.object({
  providers: z.record(providerConfigSchema).optional(),
  mode: z.enum(["replace", "merge"]).optional(),
}).optional();

const authCooldownSchema = z.object({
  rateLimitBaseMs: z.number().int().positive().optional(),
  rateLimitMaxMs: z.number().int().positive().optional(),
  billingBaseHours: z.number().positive().optional(),
  billingMaxHours: z.number().positive().optional(),
}).optional();

const authSchema = z.object({
  order: z.record(z.array(z.string())).optional(),
  cooldown: authCooldownSchema,
}).optional();

const channelConfigSchema = z.object({
  enabled: z.boolean(),
  token: z.string().optional(),
  webhookUrl: z.string().optional(),
  allowlist: z.array(z.string()).optional(),
  mentionGating: z.boolean().optional(),
  commandGating: z.boolean().optional(),
  typingIndicator: z.boolean().optional(),
  extra: z.record(z.unknown()).optional(),
});

const gatewaySchema = z.object({
  port: z.number().int().positive(),
  host: z.string().optional(),
  token: z.string().optional(),
  rateLimit: z.object({
    windowMs: z.number().int().positive(),
    maxRequests: z.number().int().positive(),
  }).optional(),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
  }).optional(),
}).optional();

const hookMappingSchema = z.object({
  path: z.string(),
  agentId: z.string().optional(),
  sessionKey: z.string().optional(),
  action: z.enum(["wake", "agent", "custom"]),
});

const hooksSchema = z.object({
  basePath: z.string().optional(),
  token: z.string().optional(),
  maxBodyBytes: z.number().int().positive().optional(),
  mappings: z.array(hookMappingSchema).optional(),
  agentPolicy: z.object({
    defaultAgentId: z.string().optional(),
    knownAgentIds: z.array(z.string()).optional(),
    allowedAgentIds: z.array(z.string()).optional(),
  }).optional(),
  sessionPolicy: z.object({
    defaultSessionKey: z.string().optional(),
    allowRequestSessionKey: z.boolean().optional(),
    allowedSessionKeyPrefixes: z.array(z.string()).optional(),
  }).optional(),
}).optional();

const queueSettingsSchema = z.object({
  mode: z.enum(["append", "replace", "drop"]),
  debounceMs: z.number().int().nonnegative().optional(),
  cap: z.number().int().positive().optional(),
  dropPolicy: z.enum(["fifo", "lifo"]).optional(),
  dedupeMode: z.enum(["none", "reply", "command"]).optional(),
});

const queueSchema = z.object({
  defaults: queueSettingsSchema.optional(),
  lanes: z.record(queueSettingsSchema).optional(),
}).optional();

const pluginEntrySchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

const pluginsSchema = z.object({
  searchPaths: z.array(z.string()).optional(),
  entries: z.record(pluginEntrySchema).optional(),
}).optional();

const tokenBudgetSchema = z.object({
  systemPercent: z.number().min(0).max(100).optional(),
  toolsPercent: z.number().min(0).max(100).optional(),
  historyPercent: z.number().min(0).max(100).optional(),
  responsePercent: z.number().min(0).max(100).optional(),
  reservePercent: z.number().min(0).max(100).optional(),
}).optional();

const tokensSchema = z.object({
  budget: tokenBudgetSchema,
  routing: z.enum(["auto", "fixed"]).optional(),
  defaultModel: z.string().optional(),
  maxToolResultChars: z.number().int().positive().optional(),
  compactionStrategy: z.enum(["tiered", "always-llm"]).optional(),
  cacheEnabled: z.boolean().optional(),
  monthlyBudgetUsd: z.number().nonnegative().nullable().optional(),
}).optional();

const sessionsSchema = z.object({
  storagePath: z.string().optional(),
  maxHistory: z.number().int().positive().optional(),
  transcriptFormat: z.enum(["jsonl", "json"]).optional(),
}).optional();

const memorySchema = z.object({
  enabled: z.boolean().optional(),
  backend: z.enum(["sqlite-vec", "lancedb"]).optional(),
  embeddingProvider: z.enum(["openai", "voyage", "gemini"]).optional(),
  embeddingModel: z.string().optional(),
  storagePath: z.string().optional(),
}).optional();

const cronJobSchema = z.object({
  name: z.string(),
  schedule: z.string(),
  agentId: z.string().optional(),
  command: z.string(),
  channel: z.string().optional(),
});

const cronSchema = z.object({
  enabled: z.boolean().optional(),
  jobs: z.array(cronJobSchema).optional(),
}).optional();

const daemonSchema = z.object({
  enabled: z.boolean().optional(),
  platform: z.enum(["auto", "schtasks", "systemd", "launchd"]).optional(),
}).optional();

const securitySchema = z.object({
  toolApprovalRequired: z.boolean().optional(),
  allowedExecCommands: z.array(z.string()).optional(),
  blockedExecCommands: z.array(z.string()).optional(),
  fileSystemAudit: z.boolean().optional(),
}).optional();

const commandsSchema = z.object({
  enabled: z.record(z.boolean()).optional(),
}).optional();

const loggingSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  subsystems: z.record(z.enum(["debug", "info", "warn", "error"])).optional(),
  redactSecrets: z.boolean().optional(),
}).optional();

// --- Main Config Schema ---

export const ccfmConfigSchema = z.object({
  bot: botSchema,
  agents: agentsSchema,
  models: modelsSchema,
  auth: authSchema,
  channels: z.record(channelConfigSchema).optional(),
  gateway: gatewaySchema,
  hooks: hooksSchema,
  queue: queueSchema,
  plugins: pluginsSchema,
  tokens: tokensSchema,
  sessions: sessionsSchema,
  memory: memorySchema,
  cron: cronSchema,
  daemon: daemonSchema,
  security: securitySchema,
  commands: commandsSchema,
  logging: loggingSchema,
});

export type CcfmConfigSchema = z.infer<typeof ccfmConfigSchema>;
