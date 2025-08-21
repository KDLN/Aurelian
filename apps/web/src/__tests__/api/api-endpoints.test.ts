import { 
  createErrorResponse, 
  createSuccessResponse, 
  authenticateUser,
  getUserGuildMembership,
  checkRolePermissions,
  validateRequiredFields,
  InputValidation,
  ROLE_HIERARCHY,
  canManageRole
} from '@/lib/apiUtils';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabaseClient');
jest.mock('@/lib/prisma');

describe('API Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Response Creation', () => {
    it('should create proper error responses for known error types', async () => {
      const response = createErrorResponse('NO_TOKEN');
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'No token provided' });
    });

    it('should include details when provided', async () => {
      const response = createErrorResponse('INVALID_TOKEN', 'Token expired');
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ 
        error: 'Invalid token',
        details: 'Token expired'
      });
    });

    it('should handle unknown error types gracefully', async () => {
      const response = createErrorResponse('UNKNOWN_ERROR' as any, 'Custom message');
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ 
        error: 'Internal server error',
        details: 'Custom message'
      });
    });

    it('should provide all expected error types', () => {
      const expectedErrors = [
        'NO_TOKEN',
        'INVALID_TOKEN', 
        'NOT_IN_GUILD',
        'INSUFFICIENT_PERMISSIONS',
        'MISSING_FIELDS',
        'INTERNAL_ERROR',
        'NOT_FOUND',
        'CONFLICT',
        'SYNC_FAILED',
        'SYNC_ERROR'
      ];

      expectedErrors.forEach(errorType => {
        const response = createErrorResponse(errorType);
        expect(response).toBeInstanceOf(NextResponse);
        expect([400, 401, 403, 404, 409, 500]).toContain(response.status);
      });
    });
  });

  describe('Success Response Creation', () => {
    it('should create success response with data', async () => {
      const testData = { userId: '123', name: 'Test' };
      const response = createSuccessResponse(testData);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        userId: '123',
        name: 'Test'
      });
    });

    it('should include message when provided', async () => {
      const response = createSuccessResponse({ count: 5 }, 'Operation completed');
      const data = await response.json();
      
      expect(data).toEqual({
        success: true,
        message: 'Operation completed',
        count: 5
      });
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields correctly', () => {
      const validBody = { name: 'Test', amount: 100, type: 'deposit' };
      const result = validateRequiredFields(validBody, ['name', 'amount']);
      
      expect(result).toBeNull();
    });

    it('should identify missing fields', () => {
      const invalidBody = { name: 'Test' }; // Missing amount
      const result = validateRequiredFields(invalidBody, ['name', 'amount', 'type']);
      
      expect(result).toBe('Missing required fields: amount, type');
    });

    it('should handle empty and null values', () => {
      const bodyWithEmpties = { name: '', amount: null, type: undefined };
      const result = validateRequiredFields(bodyWithEmpties, ['name', 'amount', 'type']);
      
      expect(result).toBe('Missing required fields: name, amount, type');
    });
  });

  describe('Input Validation', () => {
    describe('Guild Name Validation', () => {
      it('should accept valid guild names', () => {
        const validNames = [
          'Iron Brotherhood',
          'Trade-Alliance',
          'Guild_123',
          'The Crown Guard'
        ];

        validNames.forEach(name => {
          expect(InputValidation.guildName(name)).toBeNull();
        });
      });

      it('should reject invalid guild names', () => {
        const invalidCases = [
          { name: '', expected: 'Guild name is required' },
          { name: 'Hi', expected: 'Guild name must be at least 3 characters' },
          { name: 'A'.repeat(31), expected: 'Guild name must be less than 30 characters' },
          { name: 'Guild@#$', expected: 'Guild name contains invalid characters' },
          { name: null as any, expected: 'Guild name is required' }
        ];

        invalidCases.forEach(({ name, expected }) => {
          expect(InputValidation.guildName(name)).toBe(expected);
        });
      });
    });

    describe('Guild Tag Validation', () => {
      it('should accept valid guild tags', () => {
        const validTags = ['IRON', 'TRD', 'G123', 'CROWN'];

        validTags.forEach(tag => {
          expect(InputValidation.guildTag(tag)).toBeNull();
        });
      });

      it('should reject invalid guild tags', () => {
        const invalidCases = [
          { tag: '', expected: 'Guild tag is required' },
          { tag: 'AB', expected: 'Guild tag must be at least 3 characters' },
          { tag: 'TOOLONG', expected: 'Guild tag must be less than 5 characters' },
          { tag: 'AB@', expected: 'Guild tag can only contain letters and numbers' },
          { tag: null as any, expected: 'Guild tag is required' }
        ];

        invalidCases.forEach(({ tag, expected }) => {
          expect(InputValidation.guildTag(tag)).toBe(expected);
        });
      });
    });

    describe('Amount Validation', () => {
      it('should accept valid amounts', () => {
        const validAmounts = [1, 100, 50000, 999999];

        validAmounts.forEach(amount => {
          expect(InputValidation.amount(amount)).toBeNull();
        });
      });

      it('should reject invalid amounts', () => {
        const invalidCases = [
          { amount: undefined, expected: 'Amount is required' },
          { amount: null, expected: 'Amount is required' },
          { amount: 'abc', expected: 'Amount must be a number' },
          { amount: 0, expected: 'Amount must be at least 1' },
          { amount: 1.5, expected: 'Amount must be a whole number' },
          { amount: 1000001, expected: 'Amount cannot exceed 1,000,000' },
          { amount: -5, expected: 'Amount must be at least 1' }
        ];

        invalidCases.forEach(({ amount, expected }) => {
          expect(InputValidation.amount(amount)).toBe(expected);
        });
      });

      it('should respect custom min/max values', () => {
        expect(InputValidation.amount(5, 10, 100)).toBe('Amount must be at least 10');
        expect(InputValidation.amount(150, 10, 100)).toBe('Amount cannot exceed 100');
        expect(InputValidation.amount(50, 10, 100)).toBeNull();
      });
    });

    describe('Message Content Validation', () => {
      it('should accept valid messages', () => {
        const validMessages = [
          'Hello guild!',
          'Trading iron ore at the market.',
          'A'.repeat(1999) // Just under limit
        ];

        validMessages.forEach(message => {
          expect(InputValidation.messageContent(message)).toBeNull();
        });
      });

      it('should reject invalid messages', () => {
        const invalidCases = [
          { content: '', expected: 'Message cannot be empty' },
          { content: '   ', expected: 'Message cannot be empty' },
          { content: 'A'.repeat(2001), expected: 'Message cannot exceed 2000 characters' },
          { content: null as any, expected: 'Message content is required' }
        ];

        invalidCases.forEach(({ content, expected }) => {
          expect(InputValidation.messageContent(content)).toBe(expected);
        });
      });
    });
  });

  describe('Role Permission System', () => {
    it('should check role permissions correctly', () => {
      expect(checkRolePermissions('LEADER', ['LEADER', 'OFFICER'])).toBe(true);
      expect(checkRolePermissions('OFFICER', ['LEADER', 'OFFICER'])).toBe(true);
      expect(checkRolePermissions('MEMBER', ['LEADER', 'OFFICER'])).toBe(false);
      expect(checkRolePermissions('TRADER', ['MEMBER'])).toBe(false);
    });

    it('should respect role hierarchy for management', () => {
      // Leader can manage everyone
      expect(canManageRole('LEADER', 'OFFICER')).toBe(true);
      expect(canManageRole('LEADER', 'TRADER')).toBe(true);
      expect(canManageRole('LEADER', 'MEMBER')).toBe(true);

      // Officer can manage traders and members
      expect(canManageRole('OFFICER', 'TRADER')).toBe(true);
      expect(canManageRole('OFFICER', 'MEMBER')).toBe(true);
      expect(canManageRole('OFFICER', 'LEADER')).toBe(false);

      // Member cannot manage anyone
      expect(canManageRole('MEMBER', 'MEMBER')).toBe(false);
      expect(canManageRole('MEMBER', 'TRADER')).toBe(false);
    });

    it('should handle unknown roles safely', () => {
      expect(canManageRole('UNKNOWN' as any, 'MEMBER')).toBe(false);
      expect(canManageRole('LEADER', 'UNKNOWN' as any)).toBe(true);
    });
  });

  describe('Authentication Function', () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn()
      }
    };

    beforeEach(() => {
      // Mock the supabase import
      jest.doMock('@/lib/supabaseClient', () => ({
        supabase: mockSupabase
      }));
    });

    it('should handle valid authentication', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Need to dynamically import since we mocked supabase
      jest.resetModules();
      const { authenticateUser } = await import('@/lib/apiUtils');

      const result = await authenticateUser('valid-token');

      expect(result).toEqual({ user: mockUser });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should handle missing token', async () => {
      jest.resetModules();
      const { authenticateUser } = await import('@/lib/apiUtils');

      const result = await authenticateUser(null);

      expect(result).toEqual({ error: 'NO_TOKEN' });
    });

    it('should handle invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      jest.resetModules();
      const { authenticateUser } = await import('@/lib/apiUtils');

      const result = await authenticateUser('invalid-token');

      expect(result).toEqual({ error: 'INVALID_TOKEN' });
    });
  });

  describe('Rate Limiting Concepts', () => {
    it('should implement basic rate limiting logic', () => {
      // Mock rate limiting implementation
      const rateLimiter = new Map<string, { count: number; resetTime: number }>();
      const WINDOW_MS = 60000; // 1 minute
      const MAX_REQUESTS = 100;

      const checkRateLimit = (identifier: string) => {
        const now = Date.now();
        const userLimit = rateLimiter.get(identifier);

        if (!userLimit || now > userLimit.resetTime) {
          // Reset or create new limit
          rateLimiter.set(identifier, {
            count: 1,
            resetTime: now + WINDOW_MS
          });
          return { allowed: true, resetTime: now + WINDOW_MS };
        }

        if (userLimit.count >= MAX_REQUESTS) {
          return { allowed: false, resetTime: userLimit.resetTime };
        }

        // Increment count
        userLimit.count++;
        return { allowed: true, resetTime: userLimit.resetTime };
      };

      // Test normal usage
      const result1 = checkRateLimit('user-123');
      expect(result1.allowed).toBe(true);

      // Test rapid requests
      for (let i = 0; i < 99; i++) {
        checkRateLimit('user-123');
      }

      const result100 = checkRateLimit('user-123');
      expect(result100.allowed).toBe(true);

      const result101 = checkRateLimit('user-123');
      expect(result101.allowed).toBe(false);
      expect(result101.resetTime).toBeDefined();
    });
  });

  describe('Database Query Error Handling', () => {
    it('should handle Prisma connection errors', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        }
      };

      const safeDbQuery = async () => {
        try {
          const user = await mockPrisma.user.findUnique({
            where: { id: 'user-123' }
          });
          return { success: true, user };
        } catch (error) {
          console.error('Database error:', error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown database error' 
          };
        }
      };

      const result = await safeDbQuery();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle Prisma constraint violations', async () => {
      const uniqueConstraintError = new Error('Unique constraint failed');
      (uniqueConstraintError as any).code = 'P2002';
      (uniqueConstraintError as any).meta = { target: ['email'] };

      const handleConstraintError = (error: any) => {
        if (error.code === 'P2002') {
          const target = error.meta?.target?.join(', ') || 'field';
          return { 
            errorType: 'CONFLICT',
            message: `${target} already exists`
          };
        }

        return {
          errorType: 'INTERNAL_ERROR',
          message: 'Database operation failed'
        };
      };

      const result = handleConstraintError(uniqueConstraintError);
      
      expect(result.errorType).toBe('CONFLICT');
      expect(result.message).toBe('email already exists');
    });
  });

  describe('Request Body Processing', () => {
    it('should handle valid JSON request bodies', () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'test', amount: 100 })
      };

      const processRequestBody = async (request: any, requiredFields: string[]) => {
        try {
          const body = await request.json();
          const validationError = validateRequiredFields(body, requiredFields);
          
          if (validationError) {
            return { success: false, error: validationError };
          }

          return { success: true, data: body };
        } catch (error) {
          return { success: false, error: 'Invalid JSON' };
        }
      };

      expect(processRequestBody(mockRequest, ['name', 'amount']))
        .resolves.toEqual({
          success: true,
          data: { name: 'test', amount: 100 }
        });
    });

    it('should handle malformed JSON', () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Unexpected token'))
      };

      const processRequestBody = async (request: any) => {
        try {
          const body = await request.json();
          return { success: true, data: body };
        } catch (error) {
          return { success: false, error: 'Invalid JSON' };
        }
      };

      expect(processRequestBody(mockRequest))
        .resolves.toEqual({
          success: false,
          error: 'Invalid JSON'
        });
    });
  });

  describe('Authorization Header Processing', () => {
    it('should extract Bearer tokens correctly', () => {
      const extractToken = (authHeader: string | null) => {
        if (!authHeader?.startsWith('Bearer ')) {
          return null;
        }
        return authHeader.substring(7);
      };

      expect(extractToken('Bearer abc123')).toBe('abc123');
      expect(extractToken('Bearer ')).toBe('');
      expect(extractToken('Basic abc123')).toBeNull();
      expect(extractToken(null)).toBeNull();
      expect(extractToken('')).toBeNull();
    });

    it('should handle malformed authorization headers', () => {
      const malformedHeaders = [
        'Bearer',
        'bearer abc123',
        'Bear abc123',
        'abc123',
        'Bearer  ', // Just spaces
      ];

      const extractToken = (authHeader: string | null) => {
        if (!authHeader?.startsWith('Bearer ')) {
          return null;
        }
        const token = authHeader.substring(7);
        return token.trim() || null;
      };

      malformedHeaders.forEach(header => {
        const result = extractToken(header);
        expect(result).toBeNull();
      });
    });
  });

  describe('Error Response Consistency', () => {
    it('should maintain consistent error response format across endpoints', () => {
      const testErrorTypes = [
        'NO_TOKEN',
        'INVALID_TOKEN',
        'NOT_IN_GUILD',
        'INSUFFICIENT_PERMISSIONS',
        'MISSING_FIELDS'
      ];

      const responses = testErrorTypes.map(errorType => {
        const response = createErrorResponse(errorType, 'Test details');
        return {
          errorType,
          status: response.status,
          hasDetails: response.headers.get('content-type')?.includes('application/json')
        };
      });

      // All responses should be JSON
      responses.forEach(({ hasDetails }) => {
        expect(hasDetails).toBe(true);
      });

      // Check status codes are appropriate
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).toEqual([401, 401, 403, 403, 400]);
    });
  });
});