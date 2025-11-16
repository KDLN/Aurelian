/**
 * WalletService Unit Tests
 * Tests wallet operations with mocked Prisma client
 */

import { WalletService } from '../../services/wallet.service';
import {
  InsufficientFundsError,
  WalletNotFoundError,
  ValidationError,
} from '../../validation';
import { GOLD_LIMITS } from '../../constants';
import type { PrismaClient } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockPrismaClient = () => {
  const mockWalletUpdate = jest.fn();
  const mockWalletFindUnique = jest.fn();
  const mockWalletUpsert = jest.fn();
  const mockLedgerCreate = jest.fn();
  const mockTransaction = jest.fn();

  const mockPrisma = {
    wallet: {
      update: mockWalletUpdate,
      findUnique: mockWalletFindUnique,
      upsert: mockWalletUpsert,
    },
    ledgerTx: {
      create: mockLedgerCreate,
    },
    $transaction: mockTransaction,
  } as unknown as PrismaClient;

  return {
    mockPrisma,
    mockWalletUpdate,
    mockWalletFindUnique,
    mockWalletUpsert,
    mockLedgerCreate,
    mockTransaction,
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('WalletService', () => {
  let walletService: WalletService;
  let mocks: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mocks = createMockPrismaClient();
    walletService = new WalletService(mocks.mockPrisma);
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getBalance() Tests
  // ==========================================================================

  describe('getBalance', () => {
    it('should return existing wallet balance', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockWallet = {
        userId,
        gold: 5000,
        updatedAt: new Date(),
      };

      mocks.mockWalletUpsert.mockResolvedValue(mockWallet);

      const result = await walletService.getBalance(userId);

      expect(result).toEqual(mockWallet);
      expect(mocks.mockWalletUpsert).toHaveBeenCalledWith({
        where: { userId },
        create: {
          userId,
          gold: GOLD_LIMITS.DEFAULT_STARTING_AMOUNT,
        },
        update: {},
        select: {
          userId: true,
          gold: true,
          updatedAt: true,
        },
      });
    });

    it('should create wallet if it does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockWallet = {
        userId,
        gold: GOLD_LIMITS.DEFAULT_STARTING_AMOUNT,
        updatedAt: new Date(),
      };

      mocks.mockWalletUpsert.mockResolvedValue(mockWallet);

      const result = await walletService.getBalance(userId);

      expect(result.gold).toBe(GOLD_LIMITS.DEFAULT_STARTING_AMOUNT);
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(walletService.getBalance('invalid-uuid')).rejects.toThrow(
        ValidationError
      );
    });
  });

  // ==========================================================================
  // addGold() Tests
  // ==========================================================================

  describe('addGold', () => {
    it('should add gold to wallet successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 500;

      // Mock getBalance to return current balance
      const mockCurrentWallet = { userId, gold: 1000, updatedAt: new Date() };
      mocks.mockWalletUpsert.mockResolvedValue(mockCurrentWallet);

      // Mock transaction
      const mockUpdatedWallet = { userId, gold: 1500, updatedAt: new Date() };
      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            update: jest.fn().mockResolvedValue(mockUpdatedWallet),
          },
          ledgerTx: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
        };
        return callback(tx);
      });

      const result = await walletService.addGold(userId, amount, {
        reason: 'Test reward',
        createLedgerEntry: true,
      });

      expect(result.gold).toBe(1500);
      expect(mocks.mockTransaction).toHaveBeenCalled();
    });

    it('should throw ValidationError for negative amount', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        walletService.addGold(userId, -100, { reason: 'Invalid' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if adding exceeds max gold', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const currentBalance = GOLD_LIMITS.MAX - 100;

      mocks.mockWalletUpsert.mockResolvedValue({
        userId,
        gold: currentBalance,
        updatedAt: new Date(),
      });

      await expect(
        walletService.addGold(userId, 500, { reason: 'Too much gold' })
      ).rejects.toThrow(ValidationError);
    });

    it('should create ledger entry when requested', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 500;
      const reason = 'Mission reward';

      mocks.mockWalletUpsert.mockResolvedValue({ userId, gold: 1000, updatedAt: new Date() });

      const mockLedgerCreate = jest.fn().mockResolvedValue({ id: 'ledger-1' });
      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            update: jest.fn().mockResolvedValue({ userId, gold: 1500, updatedAt: new Date() }),
          },
          ledgerTx: {
            create: mockLedgerCreate,
          },
        };
        return callback(tx);
      });

      await walletService.addGold(userId, amount, { reason, createLedgerEntry: true });

      expect(mockLedgerCreate).toHaveBeenCalledWith({
        data: {
          userId,
          goldChange: amount,
          reason,
          balanceAfter: 1500,
        },
      });
    });
  });

  // ==========================================================================
  // subtractGold() Tests
  // ==========================================================================

  describe('subtractGold', () => {
    it('should subtract gold from wallet successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 300;

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
            update: jest.fn().mockResolvedValue({ userId, gold: 700, updatedAt: new Date() }),
          },
          ledgerTx: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
        };
        return callback(tx);
      });

      const result = await walletService.subtractGold(userId, amount, {
        reason: 'Purchase',
        createLedgerEntry: true,
      });

      expect(result.gold).toBe(700);
    });

    it('should throw InsufficientFundsError when balance is too low', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 1000;

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 500 }),
          },
        };
        return callback(tx);
      });

      await expect(
        walletService.subtractGold(userId, amount, { reason: 'Purchase' })
      ).rejects.toThrow(InsufficientFundsError);
    });

    it('should throw WalletNotFoundError when wallet does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        walletService.subtractGold(userId, 100, { reason: 'Purchase' })
      ).rejects.toThrow(WalletNotFoundError);
    });

    it('should allow negative balance when allowNegative is true', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const amount = 1500;

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 500 }),
            update: jest.fn().mockResolvedValue({ userId, gold: -1000, updatedAt: new Date() }),
          },
          ledgerTx: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
        };
        return callback(tx);
      });

      const result = await walletService.subtractGold(userId, amount, {
        reason: 'Admin adjustment',
        allowNegative: true,
      });

      expect(result.gold).toBe(-1000);
    });
  });

  // ==========================================================================
  // transfer() Tests
  // ==========================================================================

  describe('transfer', () => {
    it('should transfer gold between wallets successfully', async () => {
      const fromUserId = '550e8400-e29b-41d4-a716-446655440000';
      const toUserId = '660e8400-e29b-41d4-a716-446655440001';
      const amount = 250;

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
            update: jest.fn().mockResolvedValue({ userId: fromUserId, gold: 750, updatedAt: new Date() }),
            upsert: jest.fn().mockResolvedValue({ userId: toUserId, gold: 1250, updatedAt: new Date() }),
          },
          ledgerTx: {
            create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
          },
        };
        return callback(tx);
      });

      const result = await walletService.transfer(fromUserId, toUserId, amount, {
        reason: 'Payment',
        createLedgerEntry: true,
      });

      expect(result.fromWallet.gold).toBe(750);
      expect(result.toWallet.gold).toBe(1250);
      expect(result.amount).toBe(250);
    });

    it('should throw ValidationError when transferring to self', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        walletService.transfer(userId, userId, 100, { reason: 'Self transfer' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw InsufficientFundsError when sender lacks funds', async () => {
      const fromUserId = '550e8400-e29b-41d4-a716-446655440000';
      const toUserId = '660e8400-e29b-41d4-a716-446655440001';

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 100 }),
          },
        };
        return callback(tx);
      });

      await expect(
        walletService.transfer(fromUserId, toUserId, 500, { reason: 'Payment' })
      ).rejects.toThrow(InsufficientFundsError);
    });

    it('should create ledger entries for both wallets', async () => {
      const fromUserId = '550e8400-e29b-41d4-a716-446655440000';
      const toUserId = '660e8400-e29b-41d4-a716-446655440001';
      const amount = 250;

      const mockLedgerCreate = jest.fn().mockResolvedValue({ id: 'ledger-1' });

      mocks.mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 1000 }),
            update: jest.fn().mockResolvedValue({ userId: fromUserId, gold: 750, updatedAt: new Date() }),
            upsert: jest.fn().mockResolvedValue({ userId: toUserId, gold: 1250, updatedAt: new Date() }),
          },
          ledgerTx: {
            create: mockLedgerCreate,
          },
        };
        return callback(tx);
      });

      await walletService.transfer(fromUserId, toUserId, amount, {
        reason: 'Payment',
        createLedgerEntry: true,
      });

      // Should create two ledger entries: one for sender, one for receiver
      expect(mockLedgerCreate).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // getBatchBalances() Tests
  // ==========================================================================

  describe('getBatchBalances', () => {
    it('should retrieve multiple wallet balances efficiently', async () => {
      const userIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
      ];

      const mockWallets = [
        { userId: userIds[0], gold: 1000, updatedAt: new Date() },
        { userId: userIds[1], gold: 2000, updatedAt: new Date() },
      ];

      mocks.mockPrisma.wallet.findMany = jest.fn().mockResolvedValue(mockWallets);

      const result = await walletService.getBatchBalances(userIds);

      expect(result.size).toBe(2);
      expect(result.get(userIds[0]!)!.gold).toBe(1000);
      expect(result.get(userIds[1]!)!.gold).toBe(2000);
    });

    it('should throw ValidationError for invalid UUIDs in batch', async () => {
      const userIds = ['invalid-uuid', '550e8400-e29b-41d4-a716-446655440000'];

      await expect(walletService.getBatchBalances(userIds)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
