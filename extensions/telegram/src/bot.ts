/**
 * Telegram Bot API wrapper using native fetch.
 * No external dependencies required.
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
}

export interface SendMessageOptions {
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
  reply_to_message_id?: number;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
}

export class TelegramBot {
  private readonly baseUrl: string;

  constructor(private readonly config: { token: string }) {
    this.baseUrl = `https://api.telegram.org/bot${config.token}`;
  }

  /**
   * Test the bot connection and retrieve bot info.
   */
  async getMe(): Promise<TelegramUser> {
    return this.callApi<TelegramUser>("getMe");
  }

  /**
   * Long-poll for new updates from Telegram.
   *
   * @param offset - Identifier of the first update to be returned.
   * @param timeout - Timeout in seconds for long polling. Defaults to 30.
   */
  async getUpdates(offset?: number, timeout = 30): Promise<TelegramUpdate[]> {
    const params: Record<string, unknown> = {
      timeout,
      allowed_updates: ["message"],
    };
    if (offset !== undefined) {
      params.offset = offset;
    }
    return this.callApi<TelegramUpdate[]>("getUpdates", params);
  }

  /**
   * Send a text message to a chat.
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options?: SendMessageOptions,
  ): Promise<TelegramMessage> {
    return this.callApi<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      ...options,
    });
  }

  /**
   * Send a chat action (e.g. "typing") to indicate activity.
   */
  async sendChatAction(
    chatId: number | string,
    action: string,
  ): Promise<boolean> {
    return this.callApi<boolean>("sendChatAction", {
      chat_id: chatId,
      action,
    });
  }

  /**
   * Make a call to the Telegram Bot API.
   */
  private async callApi<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      throw new Error(
        `Telegram API error: ${response.status} ${response.statusText} — ${errorText}`,
      );
    }

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!data.ok) {
      throw new Error(
        `Telegram API returned error: ${data.error_code} — ${data.description ?? "unknown"}`,
      );
    }

    return data.result;
  }
}
