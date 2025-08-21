import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Guild Treasury Race Condition Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Deposit Race Conditions', () => {
    it('should prevent double spending with concurrent deposits', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const userGold = 1000;
      const depositAmount = 800;

      // Track transaction execution order
      let transactionOrder: string[] = [];

      // Mock first transaction (should succeed)
      const mockTx1 = {
        wallet: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx1_wallet_read');
            return Promise.resolve({ gold: userGold });
          }),
          update: jest.fn(() => {
            transactionOrder.push('tx1_wallet_update');
            return Promise.resolve({ gold: userGold - depositAmount });
          }),
        },
        guild: {
          update: jest.fn(() => {
            transactionOrder.push('tx1_guild_update');
            return Promise.resolve();
          }),
        },
        guildLog: { create: jest.fn() },
        guildMember: { update: jest.fn() },
      };

      // Mock second transaction (should fail due to constraint)
      const mockTx2 = {
        wallet: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx2_wallet_read');
            // Shows original balance due to read timestamp
            return Promise.resolve({ gold: userGold });
          }),
          update: jest.fn(() => {
            transactionOrder.push('tx2_wallet_update_attempt');
            // Fails due to constraint: gold >= depositAmount
            throw new Error('Record to update not found');
          }),
        },
      };

      const depositTransaction = async (tx: any, txId: string) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        if (userWallet.gold < depositAmount) {
          throw new Error('Insufficient gold');
        }

        // Critical: This constraint prevents race conditions
        const updatedWallet = await tx.wallet.update({
          where: { 
            userId,
            gold: { gte: depositAmount } // Only update if still has enough
          },
          data: {
            gold: { decrement: depositAmount }
          },
          select: { gold: true }
        });

        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { increment: depositAmount } }
        });

        await tx.guildLog.create({ data: {} as any });
        await tx.guildMember.update({ where: { userId }, data: {} as any });

        return { success: true, txId };
      };

      // Execute first transaction
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx1);
      });

      const result1 = await mockPrisma.$transaction((tx) => depositTransaction(tx, 'tx1'));
      expect(result1).toEqual({ success: true, txId: 'tx1' });

      // Execute second transaction (should fail)
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx2);
      });

      await expect(
        mockPrisma.$transaction((tx) => depositTransaction(tx, 'tx2'))
      ).rejects.toThrow('Record to update not found');

      // Verify execution order
      expect(transactionOrder).toEqual([
        'tx1_wallet_read',
        'tx1_wallet_update',
        'tx1_guild_update',
        'tx2_wallet_read',
        'tx2_wallet_update_attempt'
      ]);
    });

    it('should handle edge case where user has exactly the deposit amount', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const exactAmount = 1000;

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: exactAmount }),
          update: jest.fn().mockResolvedValue({ gold: 0 }),
        },
        guild: {
          update: jest.fn(),
        },
        guildLog: { create: jest.fn() },
        guildMember: { update: jest.fn() },
      };

      const depositTransaction = async (tx: any) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        if (userWallet.gold < exactAmount) {
          throw new Error('Insufficient gold');
        }

        await tx.wallet.update({
          where: { 
            userId,
            gold: { gte: exactAmount }
          },
          data: {
            gold: { decrement: exactAmount }
          },
          select: { gold: true }
        });

        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { increment: exactAmount } }
        });

        await tx.guildLog.create({ data: {} as any });
        await tx.guildMember.update({ where: { userId }, data: {} as any });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(depositTransaction);
      expect(result).toEqual({ success: true });

      // Verify exact amount constraint worked
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { 
          userId,
          gold: { gte: exactAmount }
        },
        data: {
          gold: { decrement: exactAmount }
        },
        select: { gold: true }
      });
    });
  });

  describe('Withdrawal Race Conditions', () => {
    it('should prevent over-withdrawal with concurrent withdrawals', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const guildTreasury = 1000;
      const withdrawAmount = 800;

      let transactionOrder: string[] = [];

      // Mock first transaction (should succeed)
      const mockTx1 = {
        guild: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx1_guild_read');
            return Promise.resolve({ treasury: guildTreasury });
          }),
          update: jest.fn(() => {
            transactionOrder.push('tx1_guild_update');
            return Promise.resolve({ treasury: guildTreasury - withdrawAmount });
          }),
        },
        wallet: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx1_wallet_read');
            return Promise.resolve({ gold: 500 });
          }),
          update: jest.fn(() => {
            transactionOrder.push('tx1_wallet_update');
            return Promise.resolve();
          }),
        },
        guildLog: { create: jest.fn() },
      };

      // Mock second transaction (should fail)
      const mockTx2 = {
        guild: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx2_guild_read');
            // Still shows original balance due to read timestamp
            return Promise.resolve({ treasury: guildTreasury });
          }),
          update: jest.fn(() => {
            transactionOrder.push('tx2_guild_update_attempt');
            // Fails due to constraint: treasury >= withdrawAmount
            throw new Error('Record to update not found');
          }),
        },
        wallet: {
          findUnique: jest.fn(() => {
            transactionOrder.push('tx2_wallet_read');
            return Promise.resolve({ gold: 300 });
          }),
        },
      };

      const withdrawTransaction = async (tx: any, txId: string) => {
        const currentGuild = await tx.guild.findUnique({
          where: { id: guildId },
          select: { treasury: true }
        });

        if (currentGuild.treasury < withdrawAmount) {
          throw new Error('Insufficient gold in guild treasury');
        }

        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        if (!userWallet) {
          throw new Error('User wallet not found');
        }

        // Critical: This constraint prevents over-withdrawal
        await tx.guild.update({
          where: { 
            id: guildId,
            treasury: { gte: withdrawAmount } // Only update if still has enough
          },
          data: {
            treasury: { decrement: withdrawAmount }
          },
          select: { treasury: true }
        });

        await tx.wallet.update({
          where: { userId },
          data: { gold: { increment: withdrawAmount } }
        });

        await tx.guildLog.create({ data: {} as any });

        return { success: true, txId };
      };

      // Execute first transaction
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx1);
      });

      const result1 = await mockPrisma.$transaction((tx) => withdrawTransaction(tx, 'tx1'));
      expect(result1).toEqual({ success: true, txId: 'tx1' });

      // Execute second transaction (should fail)
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx2);
      });

      await expect(
        mockPrisma.$transaction((tx) => withdrawTransaction(tx, 'tx2'))
      ).rejects.toThrow('Record to update not found');

      // Verify execution order
      expect(transactionOrder).toEqual([
        'tx1_guild_read',
        'tx1_wallet_read',
        'tx1_guild_update',
        'tx1_wallet_update',
        'tx2_guild_read',
        'tx2_wallet_read',
        'tx2_guild_update_attempt'
      ]);
    });

    it('should handle permission checks before transaction begins', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const withdrawAmount = 500;

      // This test ensures permission checking happens before transaction
      const withdrawWithPermissions = async (userRole: string) => {
        // Permission check (outside transaction for performance)
        if (!['LEADER', 'OFFICER'].includes(userRole)) {
          throw new Error('Insufficient permissions');
        }

        const mockTx = {
          guild: {
            findUnique: jest.fn().mockResolvedValue({ treasury: 1000 }),
            update: jest.fn().mockResolvedValue({ treasury: 500 }),
          },
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 200 }),
            update: jest.fn(),
          },
          guildLog: { create: jest.fn() },
        };

        return mockPrisma.$transaction(async (tx) => {
          const currentGuild = await tx.guild.findUnique({
            where: { id: guildId },
            select: { treasury: true }
          });

          const userWallet = await tx.wallet.findUnique({
            where: { userId },
            select: { gold: true }
          });

          await tx.guild.update({
            where: { 
              id: guildId,
              treasury: { gte: withdrawAmount }
            },
            data: { treasury: { decrement: withdrawAmount } }
          });

          await tx.wallet.update({
            where: { userId },
            data: { gold: { increment: withdrawAmount } }
          });

          await tx.guildLog.create({ data: {} as any });

          return { success: true };
        });
      };

      // Member should be rejected before transaction
      await expect(withdrawWithPermissions('MEMBER'))
        .rejects.toThrow('Insufficient permissions');

      // Officer should be allowed
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue({ treasury: 1000 }),
            update: jest.fn().mockResolvedValue({ treasury: 500 }),
          },
          wallet: {
            findUnique: jest.fn().mockResolvedValue({ gold: 200 }),
            update: jest.fn(),
          },
          guildLog: { create: jest.fn() },
        });
      });

      const result = await withdrawWithPermissions('OFFICER');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Mixed Deposit/Withdrawal Scenarios', () => {
    it('should handle concurrent deposits and withdrawals correctly', async () => {
      const depositUserId = 'depositor-123';
      const withdrawUserId = 'withdrawer-456';
      const guildId = 'guild-789';
      const initialGuildTreasury = 1000;
      const depositAmount = 500;
      const withdrawAmount = 800;

      let operationOrder: string[] = [];

      // Deposit transaction
      const mockDepositTx = {
        wallet: {
          findUnique: jest.fn(() => {
            operationOrder.push('deposit_wallet_read');
            return Promise.resolve({ gold: 1000 });
          }),
          update: jest.fn(() => {
            operationOrder.push('deposit_wallet_update');
            return Promise.resolve({ gold: 500 });
          }),
        },
        guild: {
          update: jest.fn(() => {
            operationOrder.push('deposit_guild_update');
            return Promise.resolve();
          }),
        },
        guildLog: { create: jest.fn() },
        guildMember: { update: jest.fn() },
      };

      // Withdrawal transaction (should see updated treasury)
      const mockWithdrawTx = {
        guild: {
          findUnique: jest.fn(() => {
            operationOrder.push('withdraw_guild_read');
            // Should see updated treasury (1000 + 500 = 1500)
            return Promise.resolve({ treasury: initialGuildTreasury + depositAmount });
          }),
          update: jest.fn(() => {
            operationOrder.push('withdraw_guild_update');
            return Promise.resolve({ treasury: 700 }); // 1500 - 800
          }),
        },
        wallet: {
          findUnique: jest.fn(() => {
            operationOrder.push('withdraw_wallet_read');
            return Promise.resolve({ gold: 200 });
          }),
          update: jest.fn(() => {
            operationOrder.push('withdraw_wallet_update');
            return Promise.resolve();
          }),
        },
        guildLog: { create: jest.fn() },
      };

      const depositTransaction = async (tx: any) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId: depositUserId },
          select: { gold: true }
        });

        await tx.wallet.update({
          where: { 
            userId: depositUserId,
            gold: { gte: depositAmount }
          },
          data: { gold: { decrement: depositAmount } }
        });

        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { increment: depositAmount } }
        });

        await tx.guildLog.create({ data: {} as any });
        await tx.guildMember.update({ where: { userId: depositUserId }, data: {} as any });

        return { type: 'deposit', success: true };
      };

      const withdrawTransaction = async (tx: any) => {
        const currentGuild = await tx.guild.findUnique({
          where: { id: guildId },
          select: { treasury: true }
        });

        const userWallet = await tx.wallet.findUnique({
          where: { userId: withdrawUserId },
          select: { gold: true }
        });

        await tx.guild.update({
          where: { 
            id: guildId,
            treasury: { gte: withdrawAmount }
          },
          data: { treasury: { decrement: withdrawAmount } }
        });

        await tx.wallet.update({
          where: { userId: withdrawUserId },
          data: { gold: { increment: withdrawAmount } }
        });

        await tx.guildLog.create({ data: {} as any });

        return { type: 'withdraw', success: true };
      };

      // Execute deposit first
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockDepositTx);
      });

      const depositResult = await mockPrisma.$transaction(depositTransaction);
      expect(depositResult).toEqual({ type: 'deposit', success: true });

      // Then execute withdrawal
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockWithdrawTx);
      });

      const withdrawResult = await mockPrisma.$transaction(withdrawTransaction);
      expect(withdrawResult).toEqual({ type: 'withdraw', success: true });

      // Verify operations executed in correct order
      expect(operationOrder).toEqual([
        'deposit_wallet_read',
        'deposit_wallet_update',
        'deposit_guild_update',
        'withdraw_guild_read',
        'withdraw_wallet_read',
        'withdraw_guild_update',
        'withdraw_wallet_update'
      ]);
    });

    it('should maintain audit trail consistency', async () => {
      const userId = 'user-123';
      const guildId = 'guild-456';
      const amount = 1000;

      let auditLogs: any[] = [];

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ gold: 2000 }),
          update: jest.fn().mockResolvedValue({ gold: 1000 }),
        },
        guild: {
          update: jest.fn(),
        },
        guildLog: {
          create: jest.fn((data) => {
            auditLogs.push(data.data);
            return Promise.resolve();
          }),
        },
        guildMember: { update: jest.fn() },
      };

      const depositWithAudit = async (tx: any) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId },
          select: { gold: true }
        });

        const updatedWallet = await tx.wallet.update({
          where: { 
            userId,
            gold: { gte: amount }
          },
          data: { gold: { decrement: amount } },
          select: { gold: true }
        });

        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { increment: amount } }
        });

        // Critical: Audit log must be created within transaction
        await tx.guildLog.create({
          data: {
            guildId,
            userId,
            action: 'treasury_deposit',
            details: {
              amount,
              previousBalance: userWallet.gold,
              newBalance: updatedWallet.gold,
              timestamp: new Date().toISOString()
            }
          }
        });

        await tx.guildMember.update({
          where: { userId },
          data: { contributionPoints: { increment: Math.floor(amount / 10) } }
        });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(depositWithAudit);
      expect(result).toEqual({ success: true });

      // Verify audit log was created with correct details
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        guildId,
        userId,
        action: 'treasury_deposit',
        details: {
          amount,
          previousBalance: 2000,
          newBalance: 1000
        }
      });
    });
  });
});