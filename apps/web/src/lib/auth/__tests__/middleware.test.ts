import { NextRequest } from 'next/server';
import { withAuth, withAuthLight, withGuildAuth, getRequestBody } from '../middleware';
import { supabase } from '@/lib/supabaseClient';
import { ensureUserExistsOptimized } from '@/lib/auth/auto-sync';
import { createErrorResponse, getUserGuildMembership, checkRolePermissions } from '@/lib/apiUtils';

// Mock dependencies
jest.mock('@/lib/supabaseClient');
jest.mock('@/lib/auth/auto-sync');
jest.mock('@/lib/apiUtils');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnsureUserExists = ensureUserExistsOptimized as jest.MockedFunction<typeof ensureUserExistsOptimized>;
const mockCreateErrorResponse = createErrorResponse as jest.MockedFunction<typeof createErrorResponse>;
const mockGetUserGuildMembership = getUserGuildMembership as jest.MockedFunction<typeof getUserGuildMembership>;
const mockCheckRolePermissions = checkRolePermissions as jest.MockedFunction<typeof checkRolePermissions>;

describe('Auth Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCreateErrorResponse.mockImplementation((type: string, message?: string) => 
      new Response(JSON.stringify({ error: type, message }), { status: 401 })
    );
    
    mockHandler = jest.fn().mockResolvedValue(new Response('success'));
    
    // Mock request with authorization header
    mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer valid-token')
      }
    } as any;
  });

  describe('withAuth', () => {
    const mockUser = {
      id: '12345678-1234-1234-1234-123456789abc',
      email: 'test@example.com',
      sub: '12345678-1234-1234-1234-123456789abc'
    };

    it('should authenticate valid token and call handler', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      mockEnsureUserExists.mockResolvedValue();

      const result = await withAuth(mockRequest, mockHandler);

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(mockEnsureUserExists).toHaveBeenCalledWith(mockUser);
      expect(mockHandler).toHaveBeenCalledWith(mockUser, mockRequest);
      expect(result).toEqual(new Response('success'));
    });

    it('should reject request without token', async () => {
      (mockRequest.headers.get as jest.Mock).mockReturnValue(null);

      await withAuth(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('NO_TOKEN');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' } as any
      });

      await withAuth(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('INVALID_TOKEN', 'Invalid token');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle user sync failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      mockEnsureUserExists.mockRejectedValue(new Error('Sync failed'));

      await withAuth(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('INTERNAL_ERROR', 'Sync failed');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      await withAuth(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('INTERNAL_ERROR', 'Network error');
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('withAuthLight', () => {
    const mockUser = {
      id: '12345678-1234-1234-1234-123456789abc',
      email: 'test@example.com'
    };

    it('should authenticate without user sync', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await withAuthLight(mockRequest, mockHandler);

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(mockEnsureUserExists).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockUser, mockRequest);
      expect(result).toEqual(new Response('success'));
    });

    it('should reject request without token', async () => {
      (mockRequest.headers.get as jest.Mock).mockReturnValue(null);

      await withAuthLight(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('NO_TOKEN', 'No authorization token provided');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle auth errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' } as any
      });

      await withAuthLight(mockRequest, mockHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('INVALID_TOKEN', 'Token expired');
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('withGuildAuth', () => {
    const mockUser = {
      id: '12345678-1234-1234-1234-123456789abc',
      email: 'test@example.com'
    };

    const mockGuildHandler = jest.fn().mockResolvedValue(new Response('guild success'));

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      mockEnsureUserExists.mockResolvedValue();
    });

    it('should authenticate user with guild membership', async () => {
      const mockMembership = {
        guildId: 'guild-123',
        role: 'MEMBER',
        userId: '12345678-1234-1234-1234-123456789abc'
      };

      mockGetUserGuildMembership.mockResolvedValue({
        membership: mockMembership,
        error: null
      });

      const result = await withGuildAuth(mockRequest, mockGuildHandler);

      expect(mockGetUserGuildMembership).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc');
      expect(mockGuildHandler).toHaveBeenCalledWith(mockUser, 'guild-123', mockRequest);
      expect(result).toEqual(new Response('guild success'));
    });

    it('should reject user not in guild', async () => {
      mockGetUserGuildMembership.mockResolvedValue({
        membership: null,
        error: 'Not in guild'
      });

      await withGuildAuth(mockRequest, mockGuildHandler);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith('NOT_IN_GUILD');
      expect(mockGuildHandler).not.toHaveBeenCalled();
    });

    it('should check role permissions when required', async () => {
      const mockMembership = {
        guildId: 'guild-123',
        role: 'MEMBER',
        userId: '12345678-1234-1234-1234-123456789abc'
      };

      mockGetUserGuildMembership.mockResolvedValue({
        membership: mockMembership,
        error: null
      });
      mockCheckRolePermissions.mockReturnValue(false);

      await withGuildAuth(mockRequest, mockGuildHandler, ['OFFICER']);

      expect(mockCheckRolePermissions).toHaveBeenCalledWith('MEMBER', ['OFFICER']);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith('INSUFFICIENT_PERMISSIONS', 'Required role: OFFICER');
      expect(mockGuildHandler).not.toHaveBeenCalled();
    });

    it('should allow access with sufficient permissions', async () => {
      const mockMembership = {
        guildId: 'guild-123',
        role: 'OFFICER',
        userId: '12345678-1234-1234-1234-123456789abc'
      };

      mockGetUserGuildMembership.mockResolvedValue({
        membership: mockMembership,
        error: null
      });
      mockCheckRolePermissions.mockReturnValue(true);

      const result = await withGuildAuth(mockRequest, mockGuildHandler, ['OFFICER']);

      expect(mockCheckRolePermissions).toHaveBeenCalledWith('OFFICER', ['OFFICER']);
      expect(mockGuildHandler).toHaveBeenCalledWith(mockUser, 'guild-123', mockRequest);
      expect(result).toEqual(new Response('guild success'));
    });
  });

  describe('getRequestBody', () => {
    it('should parse valid JSON body', async () => {
      const mockBody = { name: 'test', value: 123 };
      const request = {
        json: jest.fn().mockResolvedValue(mockBody)
      } as any;

      const result = await getRequestBody(request);

      expect(result).toEqual(mockBody);
    });

    it('should handle invalid JSON', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any;

      const result = await getRequestBody(request);

      expect(result).toBeNull();
    });

    it('should validate body with custom validator', async () => {
      const mockBody = { name: 'test' };
      const request = {
        json: jest.fn().mockResolvedValue(mockBody)
      } as any;

      const validator = jest.fn().mockReturnValue({ name: 'validated' });

      const result = await getRequestBody(request, validator);

      expect(validator).toHaveBeenCalledWith(mockBody);
      expect(result).toEqual({ name: 'validated' });
    });

    it('should return null for failed validation', async () => {
      const mockBody = { name: 'test' };
      const request = {
        json: jest.fn().mockResolvedValue(mockBody)
      } as any;

      const validator = jest.fn().mockReturnValue(null);

      const result = await getRequestBody(request, validator);

      expect(result).toBeNull();
    });
  });
});