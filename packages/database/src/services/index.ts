/**
 * Service Layer Index
 *
 * This file exports all service classes for easy importing in your application.
 * Services provide a clean abstraction layer over Prisma database operations.
 *
 * Usage:
 * ```typescript
 * import { UserService, WalletService } from '@aurelian/database/services';
 *
 * const userService = new UserService();
 * const user = await userService.findById('user-id');
 * ```
 *
 * Or use the service factory:
 * ```typescript
 * import { services } from '@aurelian/database/services';
 *
 * const user = await services.user.findById('user-id');
 * ```
 */

export { BaseService } from './base.service';
export { UserService } from './user.service';
export { WalletService } from './wallet.service';
export { MissionService } from './mission.service';
export { InventoryService } from './inventory.service';
export { AgentService } from './agent.service';

// Import service classes using ES6 imports
import { UserService } from './user.service';
import { WalletService } from './wallet.service';
import { MissionService } from './mission.service';
import { InventoryService } from './inventory.service';
import { AgentService } from './agent.service';

/**
 * Service factory - singleton instances of all services
 * Use this for convenient access to all services
 */
export const services = {
  user: new UserService(),
  wallet: new WalletService(),
  mission: new MissionService(),
  inventory: new InventoryService(),
  agent: new AgentService(),
} as const;
