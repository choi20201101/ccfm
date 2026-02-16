/**
 * CCFM Telegram channel plugin.
 *
 * Dynamically loaded by the CCFM plugin system. Does NOT import from
 * @ccfm/core or @ccfm/shared — all interaction goes through the
 * CcfmPluginApi object passed to init().
 */

import { TelegramBot } from "./bot.js";
import { startPolling, type PollingHandle } from "./polling.js";
import { sendReply } from "./send.js";

// ---------------------------------------------------------------------------
// Local type definitions (mirrors of the shapes the plugin host expects).
// The plugin must NOT import from @ccfm/core or @ccfm/shared.
// ---------------------------------------------------------------------------

interface PluginHookEvent {
  hookName: string;
  timestamp: number;
  pluginId?: string;
  data: Record<string, unknown>;
}

type HookHandler = (event: PluginHookEvent) => Promise<void | Record<string, unknown>>;

interface CcfmPluginApi {
  registerChannel(channel: {
    pluginId: string;
    channelId: string;
    factory: () => unknown;
  }): void;
  registerService(service: {
    name: string;
    start: () => Promise<void>;
    stop: () => Promise<void>;
  }): void;
  registerHook(hookName: string, handler: HookHandler, priority?: number): void;
  on(hookName: string, handler: HookHandler): void;
  getConfig(): Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Plugin constants & state
// ---------------------------------------------------------------------------

const PLUGIN_ID = "channel-telegram";
const CHANNEL_ID = "telegram";

let bot: TelegramBot | undefined;
let pollingHandle: PollingHandle | undefined;
let connected = false;

/**
 * Callback set by the core (or another plugin) to handle inbound messages.
 * The polling loop invokes this for every text message received.
 */
let inboundHandler: ((msg: InboundMessage) => Promise<void>) | undefined;

interface InboundMessage {
  channelId: string;
  sessionKey: string;
  senderId: string;
  senderName?: string;
  chatId: string;
  chatType: "direct" | "group";
  messageId: string;
  text: string;
  replyToMessageId?: string;
  timestamp: number;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Channel adapter — returned by the factory
// ---------------------------------------------------------------------------

interface TelegramChannelAdapter {
  send(chatId: string, text: string, options?: Record<string, unknown>): Promise<void>;
  isConnected(): boolean;
  onMessage(handler: (msg: InboundMessage) => Promise<void>): void;
  meta: {
    displayName: string;
    capabilities: {
      supportsThreading: boolean;
      supportsReactions: boolean;
      supportsEditing: boolean;
      supportsDeleting: boolean;
      supportsMedia: boolean;
      supportsVoice: boolean;
      supportsTypingIndicator: boolean;
      supportsMarkdown: boolean;
      maxMessageLength: number;
    };
  };
}

function createAdapter(): TelegramChannelAdapter {
  return {
    async send(chatId, text, options) {
      if (!bot) throw new Error("Telegram bot is not initialised");
      const replyTo =
        options?.replyToMessageId != null
          ? Number(options.replyToMessageId)
          : undefined;
      await sendReply(bot, chatId, text, replyTo);
    },

    isConnected() {
      return connected;
    },

    onMessage(handler) {
      inboundHandler = handler;
    },

    meta: {
      displayName: "Telegram",
      capabilities: {
        supportsThreading: false,
        supportsReactions: false,
        supportsEditing: false,
        supportsDeleting: false,
        supportsMedia: false,
        supportsVoice: false,
        supportsTypingIndicator: true,
        supportsMarkdown: true,
        maxMessageLength: 4096,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin = {
  name: "Telegram",
  version: "0.1.0",

  async init(api: CcfmPluginApi): Promise<void> {
    const config = api.getConfig() as { token?: string };

    if (!config.token) {
      console.warn(
        `[${PLUGIN_ID}] No Telegram bot token configured. ` +
          "Set plugins.entries.channel-telegram.config.token in your CCFM config.",
      );
      return;
    }

    bot = new TelegramBot({ token: config.token });
    const adapter = createAdapter();

    // -- Register channel ---------------------------------------------------

    api.registerChannel({
      pluginId: PLUGIN_ID,
      channelId: CHANNEL_ID,
      factory: () => adapter,
    });

    // -- Register background polling service --------------------------------

    api.registerService({
      name: "telegram-polling",

      async start() {
        if (!bot) return;

        // Verify the token is valid before starting.
        try {
          const me = await bot.getMe();
          console.log(
            `[${PLUGIN_ID}] Connected as @${me.username ?? me.first_name}`,
          );
          connected = true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[${PLUGIN_ID}] Failed to connect: ${msg}`);
          return;
        }

        pollingHandle = startPolling(bot, async (message) => {
          const senderName =
            [message.from?.first_name, message.from?.last_name]
              .filter(Boolean)
              .join(" ") || undefined;

          const chatType: "direct" | "group" =
            message.chat.type === "private" ? "direct" : "group";

          const inbound: InboundMessage = {
            channelId: CHANNEL_ID,
            sessionKey: `${CHANNEL_ID}:${message.chat.id}`,
            senderId: String(message.from?.id ?? message.chat.id),
            senderName,
            chatId: String(message.chat.id),
            chatType,
            messageId: String(message.message_id),
            text: message.text ?? "",
            replyToMessageId: message.reply_to_message
              ? String(message.reply_to_message.message_id)
              : undefined,
            timestamp: message.date * 1000,
            raw: message,
          };

          // Notify the adapter's message handler (set by the core via
          // adapter.onMessage) so the dispatch pipeline can process it.
          if (inboundHandler) {
            await inboundHandler(inbound);
          }
        });
      },

      async stop() {
        pollingHandle?.stop();
        pollingHandle = undefined;
        connected = false;
        console.log(`[${PLUGIN_ID}] Polling stopped.`);
      },
    });

    // -- Hook into outbound message pipeline --------------------------------
    //
    // Listen for "messageSending" events targeting our channel so we can
    // deliver replies via the Telegram API.

    api.on("messageSending", async (event) => {
      if (event.data.channelId !== CHANNEL_ID) return;

      const chatId = event.data.chatId as string | undefined;
      const text = event.data.text as string | undefined;
      const replyTo = event.data.replyToMessageId as string | undefined;

      if (chatId && text) {
        await adapter.send(chatId, text, { replyToMessageId: replyTo });
      }
    });
  },

  async cleanup(): Promise<void> {
    pollingHandle?.stop();
    pollingHandle = undefined;
    connected = false;
    bot = undefined;
    inboundHandler = undefined;
    console.log(`[${PLUGIN_ID}] Plugin cleaned up.`);
  },
};

export default plugin;
