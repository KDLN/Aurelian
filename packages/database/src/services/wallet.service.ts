/**
 * WalletService
 * Provides safe, transactional operations for wallet management
 * All operations use Serializable isolation level to prevent race conditions
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { GOLD_LIMITS, TRANSACTION_CONFIG, ERROR_CODES } from '../constants/index.js';
import {
  validateUUID,
  validateGoldAmount,
  validateTransfer,
  validateReason,
  InsufficientFundsError,
  WalletNotFoundError,
  ValidationError,
} from '../validation/index.js';

// ============================================================================
// Types
// ============================================================================

export interface WalletBalance {
  userId: string;
  gold: number;
  updatedAt: Date;
}

export interface TransferResult {
  fromWallet: WalletBalance;
  toWallet: WalletBalance;
  amount: number;
  ledgerTxId?: string | undefined;
}

export interface AddGoldOptions {
  reason?: string;
  createLedgerEntry?: boolean;
}

export interface SubtractGoldOptions {
  reason?: string;
  createLedgerEntry?: boolean;
  allowNegative?: boolean; // For admin operations only
}

export interface TransferOptions {
  reason?: string;
  createLedgerEntry?: boolean;
}

// ============================================================================
// WalletService Class
// ============================================================================

export class WalletService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Gets the current gold balance for a user
   * Creates wallet if it doesn't exist
   *
   * @param userId - User ID to get balance for
   * @returns Wallet balance information
   * @throws ValidationError if userId is invalid
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    validateUUID(userId, 'userId');

    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: {
        userId,
        gold: GOLD_LIMITS.DEFAULT_STARTING_AMOUNT,
      },
      update: {}, // No-op update to trigger upsert
      select: {
        userId: true,
        gold: true,
        updatedAt: true,
      },
    });

    return wallet;
  }

  /**
   * Adds gold to a user's wallet
   * Uses atomic update with Serializable isolation to prevent race conditions
   *
   * @param userId - User ID to add gold to
   * @param amount - Amount of gold to add (must be positive)
   * @param options - Additional options (reason, ledger entry)
   * @returns Updated wallet balance
   * @throws ValidationError if inputs are invalid
   * @throws Error if transaction fails
   *
   * @example
   * ```typescript
   * const wallet = await walletService.addGold(
   *   'user-123',
   *   1000,
   *   { reason: 'Mission reward', createLedgerEntry: true }
   * );
   * ```
   */
  async addGold(
    userId: string,
    amount: number,
    options: AddGoldOptions = {}
  ): Promise<WalletBalance> {
    const { reason, createLedgerEntry = true } = options;

    // Validate inputs
    validateUUID(userId, 'userId');
    validateGoldAmount(amount, 'amount');
    validateReason(reason);

    // Check that adding won't exceed maximum
    const currentBalance = await this.getBalance(userId);
    const newBalance = currentBalance.gold + amount;

    if (newBalance > GOLD_LIMITS.MAX) {
      throw new ValidationError(
        'amount',
        ERROR_CODES.AMOUNT_EXCEEDS_MAX,
        `Adding ${amount} gold would exceed maximum balance of ${GOLD_LIMITS.MAX.toLocaleString()}`
      );
    }

    return await this.prisma.$transaction(
      async (tx) => {
        // Use atomic increment
        const wallet = await tx.wallet.update({
          where: { userId },
          data: {
            gold: {
              increment: amount,
            },
          },
          select: {
            userId: true,
            gold: true,
            updatedAt: true,
          },
        });

        // Create ledger entry if requested
        if (createLedgerEntry && reason) {
          await tx.ledgerTx.create({
            data: {
              userId,
              amount, // Positive for addition
              reason,
              meta: { balanceAfter: wallet.gold },
            },
          });
        }

        return wallet;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
        timeout: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
      }
    );
  }

  /**
   * Subtracts gold from a user's wallet
   * Uses atomic update with balance validation to prevent negative balances
   *
   * @param userId - User ID to subtract gold from
   * @param amount - Amount of gold to subtract (must be positive)
   * @param options - Additional options (reason, ledger entry, allow negative)
   * @returns Updated wallet balance
   * @throws ValidationError if inputs are invalid
   * @throws InsufficientFundsError if wallet has insufficient funds
   * @throws WalletNotFoundError if wallet doesn't exist
   *
   * @example
   * ```typescript
   * try {
   *   const wallet = await walletService.subtractGold(
   *     'user-123',
   *     500,
   *     { reason: 'Purchase item', createLedgerEntry: true }
   *   );
   * } catch (error) {
   *   if (error instanceof InsufficientFundsError) {
   *     console.log('Not enough gold!');
   *   }
   * }
   * ```
   */
  async subtractGold(
    userId: string,
    amount: number,
    options: SubtractGoldOptions = {}
  ): Promise<WalletBalance> {
    const { reason, createLedgerEntry = true, allowNegative = false } = options;

    // Validate inputs
    validateUUID(userId, 'userId');
    validateGoldAmount(amount, 'amount');
    validateReason(reason);

    return await this.prisma.$transaction(
      async (tx) => {
        // Get current balance
        const currentWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true },
        });

        if (!currentWallet) {
          throw new WalletNotFoundError(userId);
        }

        // Check for sufficient funds (unless admin override)
        if (!allowNegative && currentWallet.gold < amount) {
          throw new InsufficientFundsError(userId, amount, currentWallet.gold);
        }

        // Use atomic decrement with constraint
        const updateData: Prisma.WalletUpdateInput = {
          gold: {
            decrement: amount,
          },
        };

        // Only add constraint if not allowing negative
        const wallet = await tx.wallet.update({
          where: allowNegative
            ? { userId }
            : {
                userId,
                gold: { gte: amount }, // Atomic constraint
              },
          data: updateData,
          select: {
            userId: true,
            gold: true,
            updatedAt: true,
          },
        });

        // Create ledger entry if requested
        if (createLedgerEntry && reason) {
          await tx.ledgerTx.create({
            data: {
              userId,
              amount: -amount, // Negative for subtraction
              reason,
              meta: { balanceAfter: wallet.gold },
            },
          });
        }

        return wallet;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
        timeout: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
      }
    );
  }

  /**
   * Transfers gold from one user to another atomically
   * Uses Serializable isolation to prevent race conditions
   * Both wallets are locked during the transaction
   *
   * @param fromUserId - Source user ID
   * @param toUserId - Destination user ID
   * @param amount - Amount of gold to transfer
   * @param options - Additional options (reason, ledger entry)
   * @returns Transfer result with both wallet balances
   * @throws ValidationError if inputs are invalid or users are the same
   * @throws InsufficientFundsError if source wallet has insufficient funds
   * @throws WalletNotFoundError if source wallet doesn't exist
   *
   * @example
   * ```typescript
   * const result = await walletService.transfer(
   *   'user-alice',
   *   'user-bob',
   *   250,
   *   { reason: 'Payment for goods', createLedgerEntry: true }
   * );
   * console.log(`Transfer complete. Alice: ${result.fromWallet.gold}, Bob: ${result.toWallet.gold}`);
   * ```
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    options: TransferOptions = {}
  ): Promise<TransferResult> {
    const { reason, createLedgerEntry = true } = options;

    // Validate all inputs including self-transfer check
    validateTransfer(fromUserId, toUserId, amount, reason);

    return await this.prisma.$transaction(
      async (tx) => {
        // Lock source wallet and check balance (SELECT FOR UPDATE via atomic constraint)
        const fromWallet = await tx.wallet.findUnique({
          where: { userId: fromUserId },
          select: { gold: true },
        });

        if (!fromWallet) {
          throw new WalletNotFoundError(fromUserId);
        }

        if (fromWallet.gold < amount) {
          throw new InsufficientFundsError(fromUserId, amount, fromWallet.gold);
        }

        // Subtract from source wallet atomically
        const updatedFromWallet = await tx.wallet.update({
          where: {
            userId: fromUserId,
            gold: { gte: amount }, // Atomic constraint
          },
          data: {
            gold: {
              decrement: amount,
            },
          },
          select: {
            userId: true,
            gold: true,
            updatedAt: true,
          },
        });

        // Add to destination wallet (upsert in case wallet doesn't exist)
        const updatedToWallet = await tx.wallet.upsert({
          where: { userId: toUserId },
          create: {
            userId: toUserId,
            gold: GOLD_LIMITS.DEFAULT_STARTING_AMOUNT + amount,
          },
          update: {
            gold: {
              increment: amount,
            },
          },
          select: {
            userId: true,
            gold: true,
            updatedAt: true,
          },
        });

        // Create ledger entries if requested
        let ledgerTxId: string | undefined;
        if (createLedgerEntry && reason) {
          // Entry for sender (negative)
          const fromLedgerTx = await tx.ledgerTx.create({
            data: {
              userId: fromUserId,
              amount: -amount, // Negative for subtraction
              reason: `Transfer to ${toUserId}: ${reason}`,
              meta: { balanceAfter: updatedFromWallet.gold },
            },
          });
          ledgerTxId = fromLedgerTx.id;

          // Entry for receiver (positive)
          await tx.ledgerTx.create({
            data: {
              userId: toUserId,
              amount, // Positive for addition
              reason: `Transfer from ${fromUserId}: ${reason}`,
              meta: { balanceAfter: updatedToWallet.gold },
            },
          });
        }

        return {
          fromWallet: updatedFromWallet,
          toWallet: updatedToWallet,
          amount,
          ledgerTxId,
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
        timeout: TRANSACTION_CONFIG.CRITICAL_TIMEOUT,
      }
    );
  }

  /**
   * Ensures a wallet exists for a user
   * Creates wallet with default starting amount if it doesn't exist
   *
   * @param userId - User ID to ensure wallet for
   * @returns Wallet balance information
   * @throws ValidationError if userId is invalid
   */
  async ensureWallet(userId: string): Promise<WalletBalance> {
    return this.getBalance(userId); // getBalance already handles upsert
  }

  /**
   * Batch get balances for multiple users
   * More efficient than calling getBalance multiple times
   *
   * @param userIds - Array of user IDs
   * @returns Map of userId -> WalletBalance
   */
  async getBatchBalances(userIds: string[]): Promise<Map<string, WalletBalance>> {
    // Validate all user IDs
    userIds.forEach((id) => validateUUID(id, 'userId'));

    const wallets = await this.prisma.wallet.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
        gold: true,
        updatedAt: true,
      },
    });

    return new Map(wallets.map((w) => [w.userId, w]));
  }
}
