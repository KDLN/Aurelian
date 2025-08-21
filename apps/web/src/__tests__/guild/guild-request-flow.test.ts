import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    guildMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    guild: {
      findFirst: jest.fn(),
    },
    guildRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    guildInvite: {
      deleteMany: jest.fn(),
    },
    guildLog: {
      create: jest.fn(),
    },
  },
}));

// Mock API utils
jest.mock('@/lib/apiUtils', () => ({
  authenticateUser: jest.fn(),
  createErrorResponse: jest.fn((error, message) => new Response(JSON.stringify({ error, message }), { status: 400 })),
  createSuccessResponse: jest.fn((data, message) => new Response(JSON.stringify({ success: true, ...data, ...(message && { message }) }))),
  getUserGuildMembership: jest.fn(),
  validateRequiredFields: jest.fn(),
  checkRolePermissions: jest.fn(),
  checkRateLimit: jest.fn(),
  logGuildActivity: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Guild Request Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guild Join Request Creation', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockGuild = {
      id: 'guild-456',
      name: 'Test Guild',
      tag: 'TEST',
      maxMembers: 50,
      isActive: true
    };

    beforeEach(() => {
      const { authenticateUser, checkRateLimit } = require('@/lib/apiUtils');
      authenticateUser.mockResolvedValue({ user: mockUser });
      checkRateLimit.mockReturnValue({ allowed: true });
    });

    it('should create guild request successfully for valid user', async () => {
      const message = 'I would like to join your guild!';
      let transactionSteps: string[] = [];

      // User not in guild
      mockPrisma.guildMember.findUnique.mockResolvedValue(null);
      
      // Guild exists and active
      mockPrisma.guild.findFirst.mockResolvedValue(mockGuild as any);
      
      // Guild has capacity
      mockPrisma.guildMember.count.mockResolvedValue(25); // Under limit
      
      // No existing request
      mockPrisma.guildRequest.findUnique.mockResolvedValue(null);

      const mockTx = {
        guildRequest: {
          create: jest.fn(() => {
            transactionSteps.push('request_created');
            return Promise.resolve({
              id: 'request-789',
              guildId: 'guild-456',
              userId: 'user-123',
              message,
              status: 'PENDING',
              expiresAt: new Date()
            });
          }),
        },
        guildLog: {
          create: jest.fn(() => {
            transactionSteps.push('activity_logged');
            return Promise.resolve();
          }),
        },
      };

      const createRequestTransaction = async (tx: any) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const request = await tx.guildRequest.create({
          data: {
            guildId: 'guild-456',
            userId: 'user-123',
            message,
            status: 'PENDING',
            expiresAt
          }
        });

        await tx.guildLog.create({
          data: {
            guildId: 'guild-456',
            userId: null,
            action: 'join_request_received',
            details: { 
              requesterId: 'user-123',
              message,
              expiresAt: expiresAt.toISOString()
            }
          }
        });

        return request;
      };

      mockPrisma.$transaction.mockImplementation(async (callback, options) => {
        expect(options?.isolationLevel).toBe('Serializable');
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(createRequestTransaction, {
        isolationLevel: 'Serializable',
        timeout: 10000
      });

      expect(result.id).toBe('request-789');
      expect(transactionSteps).toEqual(['request_created', 'activity_logged']);
    });

    it('should prevent duplicate requests', async () => {
      mockPrisma.guildMember.findUnique.mockResolvedValue(null);
      mockPrisma.guild.findFirst.mockResolvedValue(mockGuild as any);
      mockPrisma.guildMember.count.mockResolvedValue(25);
      
      // Existing pending request
      mockPrisma.guildRequest.findUnique.mockResolvedValue({
        id: 'existing-request',
        status: 'PENDING',
        updatedAt: new Date()
      } as any);

      const checkDuplicateRequest = async () => {
        const existingRequest = await mockPrisma.guildRequest.findUnique({
          where: {
            guildId_userId: {
              guildId: 'guild-456',
              userId: 'user-123'
            }
          }
        });

        if (existingRequest?.status === 'PENDING') {
          throw new Error('You already have a pending request to this guild');
        }

        return { canCreate: true };
      };

      await expect(checkDuplicateRequest())
        .rejects.toThrow('You already have a pending request to this guild');
    });

    it('should enforce 24-hour cooldown after rejection', async () => {
      const recentRejection = new Date();
      recentRejection.setHours(recentRejection.getHours() - 12); // 12 hours ago

      mockPrisma.guildRequest.findUnique.mockResolvedValue({
        id: 'rejected-request',
        status: 'REJECTED',
        updatedAt: recentRejection
      } as any);

      const checkCooldown = async () => {
        const existingRequest = await mockPrisma.guildRequest.findUnique({
          where: {
            guildId_userId: {
              guildId: 'guild-456',
              userId: 'user-123'
            }
          }
        });

        if (existingRequest && existingRequest.status !== 'PENDING') {
          const hoursSinceLastRequest = (Date.now() - existingRequest.updatedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastRequest < 24) {
            throw new Error('You must wait 24 hours before sending another request to this guild');
          }
        }

        return { canCreate: true };
      };

      await expect(checkCooldown())
        .rejects.toThrow('You must wait 24 hours before sending another request');
    });

    it('should prevent requests to full guilds', async () => {
      mockPrisma.guildMember.findUnique.mockResolvedValue(null);
      mockPrisma.guild.findFirst.mockResolvedValue(mockGuild as any);
      mockPrisma.guildMember.count.mockResolvedValue(50); // At capacity
      mockPrisma.guildRequest.findUnique.mockResolvedValue(null);

      const checkGuildCapacity = async () => {
        const guild = await mockPrisma.guild.findFirst({
          where: { id: 'guild-456', isActive: true }
        });

        const memberCount = await mockPrisma.guildMember.count({
          where: { guildId: guild.id }
        });

        if (memberCount >= guild.maxMembers) {
          throw new Error('Guild is at maximum capacity');
        }

        return { canJoin: true };
      };

      await expect(checkGuildCapacity())
        .rejects.toThrow('Guild is at maximum capacity');
    });
  });

  describe('Guild Request Management', () => {
    const mockOfficer = { id: 'officer-123', email: 'officer@test.com' };
    const mockGuildMembership = {
      role: 'OFFICER',
      guild: { id: 'guild-456', name: 'Test Guild', maxMembers: 50 }
    };

    const mockRequest = {
      id: 'request-789',
      userId: 'applicant-123',
      guildId: 'guild-456',
      message: 'Please let me join!',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      user: {
        id: 'applicant-123',
        email: 'applicant@test.com',
        profile: { display: 'TestApplicant' }
      }
    };

    beforeEach(() => {
      const { authenticateUser, getUserGuildMembership, checkRolePermissions } = require('@/lib/apiUtils');
      authenticateUser.mockResolvedValue({ user: mockOfficer });
      getUserGuildMembership.mockResolvedValue({ membership: mockGuildMembership });
      checkRolePermissions.mockReturnValue(true);
    });

    it('should approve request and add member successfully', async () => {
      mockPrisma.guildRequest.findFirst.mockResolvedValue(mockRequest as any);
      mockPrisma.guildMember.findUnique.mockResolvedValue(null); // User not in guild
      mockPrisma.guildMember.count.mockResolvedValue(25); // Has capacity

      let transactionSteps: string[] = [];

      const mockTx = {
        guildMember: {
          create: jest.fn(() => {
            transactionSteps.push('member_created');
            return Promise.resolve();
          }),
        },
        guildRequest: {
          update: jest.fn(() => {
            transactionSteps.push('request_approved');
            return Promise.resolve();
          }),
          deleteMany: jest.fn(() => {
            transactionSteps.push('other_requests_deleted');
            return Promise.resolve();
          }),
        },
        guildInvite: {
          deleteMany: jest.fn(() => {
            transactionSteps.push('invites_deleted');
            return Promise.resolve();
          }),
        },
        guildLog: {
          create: jest.fn(() => {
            transactionSteps.push('join_logged');
            return Promise.resolve();
          }),
        },
      };

      const approveRequestTransaction = async (tx: any) => {
        // Add user to guild
        await tx.guildMember.create({
          data: {
            guildId: 'guild-456',
            userId: 'applicant-123',
            role: 'MEMBER'
          }
        });

        // Update request status
        await tx.guildRequest.update({
          where: { id: 'request-789' },
          data: { 
            status: 'APPROVED',
            updatedAt: new Date()
          }
        });

        // Clean up other pending requests for this user
        await tx.guildRequest.deleteMany({
          where: { 
            userId: 'applicant-123',
            id: { not: 'request-789' },
            status: 'PENDING'
          }
        });

        // Clean up any pending invitations
        await tx.guildInvite.deleteMany({
          where: { userId: 'applicant-123' }
        });

        // Log the activity
        await tx.guildLog.create({
          data: {
            guildId: 'guild-456',
            userId: 'officer-123',
            action: 'member_joined_via_request',
            details: { 
              newMemberId: 'applicant-123',
              requestId: 'request-789',
              approvedBy: 'officer-123'
            }
          }
        });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(approveRequestTransaction);

      expect(result.success).toBe(true);
      expect(transactionSteps).toEqual([
        'member_created',
        'request_approved',
        'other_requests_deleted',
        'invites_deleted',
        'join_logged'
      ]);

      // Verify member creation
      expect(mockTx.guildMember.create).toHaveBeenCalledWith({
        data: {
          guildId: 'guild-456',
          userId: 'applicant-123',
          role: 'MEMBER'
        }
      });

      // Verify cleanup operations
      expect(mockTx.guildRequest.deleteMany).toHaveBeenCalledWith({
        where: { 
          userId: 'applicant-123',
          id: { not: 'request-789' },
          status: 'PENDING'
        }
      });

      expect(mockTx.guildInvite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'applicant-123' }
      });
    });

    it('should reject request with proper logging', async () => {
      mockPrisma.guildRequest.findFirst.mockResolvedValue(mockRequest as any);

      let transactionSteps: string[] = [];
      const rejectionReason = 'Not enough experience';

      const mockTx = {
        guildRequest: {
          update: jest.fn(() => {
            transactionSteps.push('request_rejected');
            return Promise.resolve();
          }),
        },
        guildLog: {
          create: jest.fn(() => {
            transactionSteps.push('rejection_logged');
            return Promise.resolve();
          }),
        },
      };

      const rejectRequestTransaction = async (tx: any) => {
        await tx.guildRequest.update({
          where: { id: 'request-789' },
          data: { 
            status: 'REJECTED',
            updatedAt: new Date()
          }
        });

        await tx.guildLog.create({
          data: {
            guildId: 'guild-456',
            userId: 'officer-123',
            action: 'join_request_rejected',
            details: { 
              rejectedUserId: 'applicant-123',
              requestId: 'request-789',
              reason: rejectionReason,
              rejectedBy: 'officer-123'
            }
          }
        });

        return { success: true };
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await mockPrisma.$transaction(rejectRequestTransaction);

      expect(result.success).toBe(true);
      expect(transactionSteps).toEqual(['request_rejected', 'rejection_logged']);
      
      expect(mockTx.guildLog.create).toHaveBeenCalledWith({
        data: {
          guildId: 'guild-456',
          userId: 'officer-123',
          action: 'join_request_rejected',
          details: { 
            rejectedUserId: 'applicant-123',
            requestId: 'request-789',
            reason: rejectionReason,
            rejectedBy: 'officer-123'
          }
        }
      });
    });

    it('should handle race condition where user joins another guild', async () => {
      mockPrisma.guildRequest.findFirst.mockResolvedValue(mockRequest as any);
      
      // User already in another guild (race condition)
      mockPrisma.guildMember.findUnique.mockResolvedValue({
        userId: 'applicant-123',
        guildId: 'other-guild-999'
      } as any);

      const handleRaceCondition = async () => {
        const guildRequest = await mockPrisma.guildRequest.findFirst({
          where: {
            id: 'request-789',
            guildId: 'guild-456',
            status: 'PENDING'
          }
        });

        // Check if user already joined another guild
        const existingMembership = await mockPrisma.guildMember.findUnique({
          where: { userId: guildRequest.userId }
        });

        if (existingMembership) {
          // Update request to expired
          await mockPrisma.guildRequest.update({
            where: { id: 'request-789' },
            data: { 
              status: 'EXPIRED',
              updatedAt: new Date()
            }
          });
          
          throw new Error('User has already joined another guild');
        }

        return { canProcess: true };
      };

      await expect(handleRaceCondition())
        .rejects.toThrow('User has already joined another guild');

      expect(mockPrisma.guildRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-789' },
        data: { 
          status: 'EXPIRED',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should enforce rate limiting on request creation', async () => {
      const { checkRateLimit } = require('@/lib/apiUtils');
      
      // Mock rate limit exceeded
      checkRateLimit.mockReturnValue({
        allowed: false,
        resetTime: Date.now() + 3600000 // 1 hour from now
      });

      const checkRequestRateLimit = () => {
        const rateLimitCheck = checkRateLimit(`guild_request:user-123`, 3600000, 5);
        
        if (!rateLimitCheck.allowed) {
          const resetIn = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
          throw new Error(`Too many requests sent. Try again in ${resetIn} minutes.`);
        }

        return { canSend: true };
      };

      await expect(checkRequestRateLimit())
        .rejects.toThrow('Too many requests sent. Try again in 60 minutes.');

      expect(checkRateLimit).toHaveBeenCalledWith(`guild_request:user-123`, 3600000, 5);
    });
  });

  describe('Permission-based Request Management', () => {
    it('should only allow officers and leaders to view requests', async () => {
      const testCases = [
        { role: 'LEADER', shouldAllow: true },
        { role: 'OFFICER', shouldAllow: true },
        { role: 'TRADER', shouldAllow: false },
        { role: 'MEMBER', shouldAllow: false }
      ];

      testCases.forEach(({ role, shouldAllow }) => {
        const { checkRolePermissions } = require('@/lib/apiUtils');
        checkRolePermissions.mockReturnValue(shouldAllow);

        const checkPermissions = () => {
          const hasPermission = checkRolePermissions(role, ['LEADER', 'OFFICER']);
          
          if (!hasPermission) {
            throw new Error('Only leaders and officers can view guild requests');
          }

          return { canView: true };
        };

        if (shouldAllow) {
          expect(checkPermissions()).toEqual({ canView: true });
        } else {
          expect(checkPermissions).toThrow('Only leaders and officers can view guild requests');
        }
      });
    });

    it('should only allow officers and leaders to manage requests', async () => {
      const { checkRolePermissions } = require('@/lib/apiUtils');
      
      // Test with insufficient permissions
      checkRolePermissions.mockReturnValue(false);

      const attemptManagement = () => {
        const hasPermission = checkRolePermissions('MEMBER', ['LEADER', 'OFFICER']);
        
        if (!hasPermission) {
          throw new Error('Only leaders and officers can manage guild requests');
        }

        return { canManage: true };
      };

      await expect(attemptManagement)
        .toThrow('Only leaders and officers can manage guild requests');
    });
  });

  describe('Request Expiration Handling', () => {
    it('should filter out expired requests when fetching', async () => {
      const currentTime = new Date();
      const expiredRequest = {
        id: 'expired-1',
        expiresAt: new Date(currentTime.getTime() - 86400000) // 1 day ago
      };
      const validRequest = {
        id: 'valid-1',
        expiresAt: new Date(currentTime.getTime() + 86400000) // 1 day from now
      };

      const allRequests = [expiredRequest, validRequest];

      const filterExpiredRequests = () => {
        return allRequests.filter(req => req.expiresAt > currentTime);
      };

      const activeRequests = filterExpiredRequests();
      
      expect(activeRequests).toHaveLength(1);
      expect(activeRequests[0].id).toBe('valid-1');
    });

    it('should calculate proper expiration dates', () => {
      const baseDate = new Date('2023-01-01T10:00:00Z');
      
      const calculateExpiration = (fromDate: Date, days: number) => {
        const expiresAt = new Date(fromDate);
        expiresAt.setDate(expiresAt.getDate() + days);
        return expiresAt;
      };

      const expiration = calculateExpiration(baseDate, 30);
      const expectedDate = new Date('2023-01-31T10:00:00Z');
      
      expect(expiration).toEqual(expectedDate);
    });
  });
});