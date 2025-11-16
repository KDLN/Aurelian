import { BaseService } from './base.service';
import { Wallet } from '@prisma/client';
import {
  InsufficientFundsError,
  ValidationError,
} from '../errors';
import { GOLD_LIMITS } from '../constants';

/**
 * Wallet service for gold/currency management
 */
export class WalletService extends BaseService {
  /**
   * Get user's wallet
   */
  async getWallet(userId: string): Promise<Wallet | null> {
    return this.db.wallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Create wallet for user
   */
  async createWallet(userId: string, initialGold: number = 1000): Promise<Wallet> {
    return this.db.wallet.create({
      data: {
        userId,
        gold: initialGold,
      },
    });
  }

  /**
   * Get or create wallet (race-condition safe)
   */
  async getOrCreateWallet(userId: string, initialGold: number = 1000): Promise<Wallet> {
    return this.db.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        gold: initialGold,
      },
    });
  }

  /**
   * Add gold to wallet
   * @param userId - User ID
   * @param amount - Amount to add (1 - 10,000,000)
   * @param reason - Transaction reason for ledger
   */
  async addGold(userId: string, amount: number, reason?: string): Promise<Wallet> {
    // Input validation
    if (amount < GOLD_LIMITS.MIN_AMOUNT) {
      throw new ValidationError('amount', 'Amount must be at least 1');
    }
    if (amount > GOLD_LIMITS.MAX_ADD_AMOUNT) {
      throw new ValidationError('amount', `Amount exceeds maximum (${GOLD_LIMITS.MAX_ADD_AMOUNT.toLocaleString()})`);
    }

    return this.transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          gold: {
            increment: amount,
          },
        },
      });

      // Log transaction
      if (reason) {
        await tx.ledgerTx.create({
          data: {
            userId,
            amount,
            reason,
            meta: { type: 'credit' },
          },
        });
      }

      return wallet;
    });
  }

  /**
   * Subtract gold from wallet
   * @param userId - User ID
   * @param amount - Amount to subtract (must be positive)
   * @param reason - Transaction reason for ledger
   */
  async subtractGold(userId: string, amount: number, reason?: string): Promise<Wallet> {
    // Input validation
    if (amount < GOLD_LIMITS.MIN_AMOUNT) {
      throw new ValidationError('amount', 'Amount must be at least 1');
    }

    return this.transaction(async (tx) => {
      // Check if user has enough gold
      const currentWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!currentWallet || currentWallet.gold < amount) {
        throw new InsufficientFundsError(
          userId,
          amount,
          currentWallet?.gold ?? 0
        );
      }

      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          gold: {
            decrement: amount,
          },
        },
      });

      // Log transaction
      if (reason) {
        await tx.ledgerTx.create({
          data: {
            userId,
            amount: -amount,
            reason,
            meta: { type: 'debit' },
          },
        });
      }

      return wallet;
    });
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet?.gold ?? 0;
  }

  /**
   * Transfer gold between users
   * @param fromUserId - User sending gold
   * @param toUserId - User receiving gold
   * @param amount - Amount to transfer (1 - 1,000,000)
   * @param reason - Transaction description for ledger
   * @returns Updated wallet states for both users
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reason: string
  ): Promise<{ from: Wallet; to: Wallet }> {
    // Input validation
    if (amount < GOLD_LIMITS.MIN_AMOUNT) {
      throw new ValidationError('amount', 'Amount must be at least 1');
    }
    if (amount > GOLD_LIMITS.MAX_TRANSFER_AMOUNT) {
      throw new ValidationError('amount', `Transfer amount exceeds maximum (${GOLD_LIMITS.MAX_TRANSFER_AMOUNT.toLocaleString()})`);
    }
    if (fromUserId === toUserId) {
      throw new ValidationError('toUserId', 'Cannot transfer to yourself');
    }

    return this.transaction(async (tx) => {
      // Check sender has enough gold
      const fromWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
      });

      if (!fromWallet || fromWallet.gold < amount) {
        throw new InsufficientFundsError(
          fromUserId,
          amount,
          fromWallet?.gold ?? 0
        );
      }

      // Deduct from sender
      const updatedFromWallet = await tx.wallet.update({
        where: { userId: fromUserId },
        data: { gold: { decrement: amount } },
      });

      // Add to receiver
      const updatedToWallet = await tx.wallet.update({
        where: { userId: toUserId },
        data: { gold: { increment: amount } },
      });

      // Log both transactions
      await tx.ledgerTx.createMany({
        data: [
          {
            userId: fromUserId,
            amount: -amount,
            reason: `Transfer to user: ${reason}`,
            meta: { type: 'transfer_out', toUserId },
          },
          {
            userId: toUserId,
            amount,
            reason: `Transfer from user: ${reason}`,
            meta: { type: 'transfer_in', fromUserId },
          },
        ],
      });

      return {
        from: updatedFromWallet,
        to: updatedToWallet,
      };
    });
  }
}
