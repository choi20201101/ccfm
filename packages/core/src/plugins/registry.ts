/**
 * Plugin Registry — central store for all plugin registrations.
 * Tracks tools, hooks, channels, providers, gateway handlers,
 * HTTP handlers, HTTP routes, CLI registrars, services, commands, diagnostics.
 */

import type { PluginHookName } from "@ccfm/shared";
import type {
  PluginToolRegistration, PluginChannelRegistration,
  PluginProviderRegistration, PluginCommandDefinition,
  PluginServiceDefinition,
} from "@ccfm/shared";
import type {
  PluginHttpHandler, PluginGatewayMethod, PluginCliRegistration,
  CcfmPlugin,
} from "../plugin-sdk/types.js";
import type { HookRegistration } from "../plugin-sdk/hooks.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("plugins:registry");

export interface LoadedPlugin {
  id: string;
  plugin: CcfmPlugin;
  enabled: boolean;
}

export class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private tools = new Map<string, PluginToolRegistration & { pluginId: string }>();
  private hooks = new Map<PluginHookName, HookRegistration[]>();
  private channels = new Map<string, PluginChannelRegistration & { pluginId: string }>();
  private providers = new Map<string, PluginProviderRegistration & { pluginId: string }>();
  private gatewayMethods = new Map<string, PluginGatewayMethod & { pluginId: string }>();
  private httpHandlers: Array<PluginHttpHandler & { pluginId: string }> = [];
  private httpRoutes: Array<PluginHttpHandler & { pluginId: string }> = [];
  private cliCommands: Array<PluginCliRegistration & { pluginId: string }> = [];
  private services = new Map<string, PluginServiceDefinition & { pluginId: string }>();
  private commands = new Map<string, PluginCommandDefinition & { pluginId: string }>();

  registerPlugin(id: string, plugin: CcfmPlugin): void {
    this.plugins.set(id, { id, plugin, enabled: true });
    log.info({ pluginId: id, name: plugin.name }, "Plugin registered");
  }

  registerTool(pluginId: string, tool: PluginToolRegistration): void {
    this.tools.set(tool.name, { ...tool, pluginId });
    log.debug({ pluginId, tool: tool.name }, "Tool registered");
  }

  registerHook(pluginId: string, hookName: PluginHookName, reg: HookRegistration): void {
    if (!this.hooks.has(hookName)) this.hooks.set(hookName, []);
    this.hooks.get(hookName)!.push(reg);
    this.hooks.get(hookName)!.sort((a, b) => a.priority - b.priority);
  }

  registerChannel(pluginId: string, channel: PluginChannelRegistration): void {
    this.channels.set(channel.channelId, { ...channel, pluginId });
    log.debug({ pluginId, channelId: channel.channelId }, "Channel registered");
  }

  registerProvider(pluginId: string, provider: PluginProviderRegistration): void {
    this.providers.set(provider.providerId, { ...provider, pluginId });
    log.debug({ pluginId, providerId: provider.providerId }, "Provider registered");
  }

  registerGatewayMethod(pluginId: string, method: PluginGatewayMethod): void {
    this.gatewayMethods.set(method.name, { ...method, pluginId });
  }

  registerHttpHandler(pluginId: string, handler: PluginHttpHandler): void {
    this.httpHandlers.push({ ...handler, pluginId });
  }

  registerHttpRoute(pluginId: string, handler: PluginHttpHandler): void {
    this.httpRoutes.push({ ...handler, pluginId });
  }

  registerCli(pluginId: string, cli: PluginCliRegistration): void {
    this.cliCommands.push({ ...cli, pluginId });
  }

  registerService(pluginId: string, service: PluginServiceDefinition): void {
    this.services.set(service.name, { ...service, pluginId });
  }

  registerCommand(pluginId: string, command: PluginCommandDefinition): void {
    this.commands.set(command.name, { ...command, pluginId });
  }

  // --- Getters ---

  getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getChannel(id: string) {
    return this.channels.get(id);
  }

  getAllChannels() {
    return Array.from(this.channels.values());
  }

  getProvider(id: string) {
    return this.providers.get(id);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  getGatewayMethod(name: string) {
    return this.gatewayMethods.get(name);
  }

  getAllHttpHandlers() {
    return this.httpHandlers;
  }

  getAllHttpRoutes() {
    return this.httpRoutes;
  }

  getAllCliCommands() {
    return this.cliCommands;
  }

  getService(name: string) {
    return this.services.get(name);
  }

  getAllServices() {
    return Array.from(this.services.values());
  }

  getCommand(name: string) {
    return this.commands.get(name);
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  getHooksForEvent(hookName: PluginHookName): HookRegistration[] {
    return this.hooks.get(hookName) ?? [];
  }

  /** Get diagnostic summary. */
  getSummary() {
    return {
      plugins: this.plugins.size,
      tools: this.tools.size,
      channels: this.channels.size,
      providers: this.providers.size,
      commands: this.commands.size,
      services: this.services.size,
      httpHandlers: this.httpHandlers.length,
      cliCommands: this.cliCommands.length,
    };
  }
}

/** Singleton registry instance. */
let registryInstance: PluginRegistry | null = null;

export function getPluginRegistry(): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry();
  }
  return registryInstance;
}

export function resetPluginRegistry(): void {
  registryInstance = null;
}
