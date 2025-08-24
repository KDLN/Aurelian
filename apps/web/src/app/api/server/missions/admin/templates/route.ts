import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAndCheckAdmin, createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { MISSION_TEMPLATES } from '@/lib/serverMissions';

// GET /api/server/missions/admin/templates - Get mission templates
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    const authResult = await authenticateUserAndCheckAdmin(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let templates = Object.entries(MISSION_TEMPLATES).map(([key, template]) => ({
      id: key,
      ...template
    }));

    if (type) {
      templates = templates.filter(template => template.type === type);
    }

    return createSuccessResponse({
      templates,
      types: Array.from(new Set(Object.values(MISSION_TEMPLATES).map(t => t.type))),
      count: templates.length
    });

  } catch (error) {
    console.error('Error fetching mission templates:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch templates');
  }
}