/**
 * Debug endpoint to check if onboarding tables exist
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Try to query each table
    const results = {
      prismaConnected: false,
      onboardingStepExists: false,
      onboardingMetricsExists: false,
      onboardingSessionExists: false,
      error: null as string | null
    };

    // Check if Prisma is connected
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.prismaConnected = true;
    } catch (err) {
      results.error = `Prisma connection failed: ${err instanceof Error ? err.message : String(err)}`;
      return NextResponse.json(results);
    }

    // Check OnboardingStep table
    try {
      await prisma.onboardingStep.findFirst();
      results.onboardingStepExists = true;
    } catch (err) {
      results.error = `OnboardingStep table check failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Check OnboardingMetrics table
    try {
      await prisma.onboardingMetrics.findFirst();
      results.onboardingMetricsExists = true;
    } catch (err) {
      if (!results.error) {
        results.error = `OnboardingMetrics table check failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // Check OnboardingSession table
    try {
      await prisma.onboardingSession.findFirst();
      results.onboardingSessionExists = true;
    } catch (err) {
      if (!results.error) {
        results.error = `OnboardingSession table check failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      prismaConnected: false,
      onboardingStepExists: false,
      onboardingMetricsExists: false,
      onboardingSessionExists: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
