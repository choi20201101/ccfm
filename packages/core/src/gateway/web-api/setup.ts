/**
 * Setup wizard API endpoints.
 * Validates setup steps and completes initial configuration.
 */

import { Hono } from "hono";
import type {
  SetupValidateRequest,
  SetupValidateResponse,
  ApiResponse,
} from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";

const log = getLogger("gateway:api:setup");

/**
 * In-memory runtime setup state.
 * Stored here so other modules (chat endpoint) can access it.
 */
export interface RuntimeSetup {
  provider: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  personaName: string;
  channel?: { type: string; token: string };
}

let runtimeSetup: RuntimeSetup | null = null;

/** Get the current runtime setup, or null if not yet configured. */
export function getRuntimeSetup(): RuntimeSetup | null {
  return runtimeSetup;
}

/** Create the setup wizard Hono router. */
export function createSetupRouter(): Hono {
  const router = new Hono();

  log.debug("Initializing setup wizard router");

  // --- POST /validate ---
  router.post("/validate", async (c) => {
    try {
      const body = (await c.req.json()) as SetupValidateRequest;
      log.info({ step: body.step }, "Validating setup step");

      const result = validateStep(body);
      const response: ApiResponse<SetupValidateResponse> = {
        success: true,
        data: result,
      };
      return c.json(response);
    } catch (err) {
      log.error({ err }, "Setup validation failed");
      const response: ApiResponse = {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Failed to validate setup step" },
      };
      return c.json(response, 400);
    }
  });

  // --- POST /complete ---
  router.post("/complete", async (c) => {
    try {
      const body = await c.req.json();
      log.info("Setup completion requested");

      // Validate all required fields are present
      if (!body.provider || !body.apiKey || !body.model) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "provider, apiKey, and model are required",
          },
        };
        return c.json(response, 400);
      }

      // Store the setup in runtime memory for use by chat endpoint
      runtimeSetup = {
        provider: body.provider,
        apiKey: body.apiKey,
        model: body.model,
        systemPrompt: body.persona?.systemPrompt ?? "You are a helpful AI assistant.",
        personaName: body.persona?.name ?? "CCFM Bot",
        channel: body.channel ?? undefined,
      };

      log.info(
        { provider: body.provider, model: body.model, persona: runtimeSetup.personaName },
        "Setup completed — runtime config stored",
      );

      const response: ApiResponse = {
        success: true,
        data: { message: "Setup complete", provider: body.provider, model: body.model },
      };
      return c.json(response);
    } catch (err) {
      log.error({ err }, "Setup completion failed");
      const response: ApiResponse = {
        success: false,
        error: { code: "SETUP_ERROR", message: "Failed to complete setup" },
      };
      return c.json(response, 500);
    }
  });

  log.debug("Setup wizard router initialized");
  return router;
}

/** Validate a single setup step. */
function validateStep(req: SetupValidateRequest): SetupValidateResponse {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (req.step) {
    case "provider": {
      if (!req.data.provider || typeof req.data.provider !== "string") {
        errors.push("Provider name is required");
      }
      break;
    }
    case "apiKey": {
      if (!req.data.apiKey || typeof req.data.apiKey !== "string") {
        errors.push("API key is required");
      } else if ((req.data.apiKey as string).length < 10) {
        errors.push("API key appears too short");
      }
      break;
    }
    case "model": {
      if (!req.data.model || typeof req.data.model !== "string") {
        errors.push("Model name is required");
      }
      break;
    }
    case "channel": {
      if (req.data.type && !req.data.token) {
        warnings.push("Channel token is recommended for authenticated channels");
      }
      break;
    }
    case "persona": {
      if (req.data.name && typeof req.data.name !== "string") {
        errors.push("Persona name must be a string");
      }
      break;
    }
    default: {
      errors.push(`Unknown setup step: ${req.step}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
