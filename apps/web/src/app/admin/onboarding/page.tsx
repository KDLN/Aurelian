'use client';

/**
 * Admin Onboarding Metrics Dashboard
 *
 * Displays funnel conversion rates, drop-off analysis, time stats, and reward distribution.
 */

import { useEffect, useState } from 'react';

interface FunnelStep {
  order: number;
  stepKey: string;
  stepTitle: string;
  phase: string;
  started: number;
  completed: number;
  skipped: number;
  rewardsClaimed: number;
  completionRate: number;
  rewardClaimRate: number;
}

interface DropOffPoint {
  order: number;
  stepKey: string;
  stepTitle: string;
  usersStuck: number;
  dropOffRate: number;
}

interface MetricsData {
  funnel: {
    steps: FunnelStep[];
    overall: {
      started: number;
      fullyCompleted: number;
      conversionRate: number;
    };
  };
  timeStats: {
    steps: Array<{
      stepKey: string;
      stepTitle: string;
      avgTimeSeconds: number;
      medianTimeSeconds: number;
      estimatedTime: string;
    }>;
    totalAvgTimeSeconds: number;
    totalAvgTimeMinutes: number;
  };
  rewards: {
    steps: Array<{
      stepKey: string;
      stepTitle: string;
      goldGranted: number;
      itemsGranted: number;
      rewardsClaimed: number;
    }>;
    total: {
      goldGranted: number;
      itemsGranted: number;
      rewardsClaimed: number;
    };
  };
  dropOff: {
    total: number;
    completed: number;
    dismissed: number;
    inProgress: number;
    completionRate: number;
    dismissalRate: number;
    dropOffPoints: DropOffPoint[];
  };
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export default function AdminOnboardingPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  async function fetchMetrics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/onboarding-metrics?days=${days}`);
      if (!res.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await res.json();
      setMetrics(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load onboarding metrics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Onboarding Metrics</h1>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Onboarding Metrics</h1>
        <p className="text-red-500">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Onboarding Metrics</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDays(7)}
            className={`px-4 py-2 rounded ${days === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            7 days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-4 py-2 rounded ${days === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            30 days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-4 py-2 rounded ${days === 90 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Total Started</h3>
          <p className="text-3xl font-bold">{metrics.dropOff.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600">{metrics.dropOff.completed}</p>
          <p className="text-sm text-gray-500">{metrics.dropOff.completionRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-blue-600">{metrics.dropOff.inProgress}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Dismissed</h3>
          <p className="text-3xl font-bold text-red-600">{metrics.dropOff.dismissed}</p>
          <p className="text-sm text-gray-500">{metrics.dropOff.dismissalRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Funnel Conversion Table */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Funnel Conversion</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">#</th>
                <th className="text-left py-2 px-4">Step</th>
                <th className="text-left py-2 px-4">Phase</th>
                <th className="text-right py-2 px-4">Started</th>
                <th className="text-right py-2 px-4">Completed</th>
                <th className="text-right py-2 px-4">Skipped</th>
                <th className="text-right py-2 px-4">Completion Rate</th>
                <th className="text-right py-2 px-4">Rewards Claimed</th>
              </tr>
            </thead>
            <tbody>
              {metrics.funnel.steps.map((step) => (
                <tr key={step.stepKey} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{step.order}</td>
                  <td className="py-3 px-4 font-medium">{step.stepTitle}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      {step.phase}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{step.started}</td>
                  <td className="py-3 px-4 text-right text-green-600">{step.completed}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{step.skipped}</td>
                  <td className="py-3 px-4 text-right font-bold">
                    {step.completionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    {step.rewardsClaimed} ({step.rewardClaimRate.toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="py-3 px-4">
                  Overall Funnel
                </td>
                <td className="py-3 px-4 text-right">{metrics.funnel.overall.started}</td>
                <td className="py-3 px-4 text-right text-green-600">
                  {metrics.funnel.overall.fullyCompleted}
                </td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-right">
                  {metrics.funnel.overall.conversionRate.toFixed(1)}%
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Drop-off Analysis */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Drop-off Points</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">#</th>
                <th className="text-left py-2 px-4">Step</th>
                <th className="text-right py-2 px-4">Users Stuck</th>
                <th className="text-right py-2 px-4">Drop-off Rate</th>
              </tr>
            </thead>
            <tbody>
              {metrics.dropOff.dropOffPoints
                .filter((point) => point.usersStuck > 0)
                .sort((a, b) => b.usersStuck - a.usersStuck)
                .map((point) => (
                  <tr key={point.stepKey} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{point.order}</td>
                    <td className="py-3 px-4 font-medium">{point.stepTitle}</td>
                    <td className="py-3 px-4 text-right text-red-600 font-bold">
                      {point.usersStuck}
                    </td>
                    <td className="py-3 px-4 text-right">{point.dropOffRate.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Time to Complete</h2>
        <p className="mb-4 text-gray-600">
          Total average onboarding time: <strong>{metrics.timeStats.totalAvgTimeMinutes} minutes</strong>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Step</th>
                <th className="text-right py-2 px-4">Estimated</th>
                <th className="text-right py-2 px-4">Avg Time</th>
                <th className="text-right py-2 px-4">Median Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.timeStats.steps.map((step) => (
                <tr key={step.stepKey} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{step.stepTitle}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{step.estimatedTime}</td>
                  <td className="py-3 px-4 text-right">
                    {Math.floor(step.avgTimeSeconds / 60)}m {step.avgTimeSeconds % 60}s
                  </td>
                  <td className="py-3 px-4 text-right">
                    {Math.floor(step.medianTimeSeconds / 60)}m {step.medianTimeSeconds % 60}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reward Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Reward Distribution</h2>
        <div className="mb-4 flex gap-8">
          <div>
            <p className="text-sm text-gray-600">Total Gold Granted</p>
            <p className="text-2xl font-bold text-yellow-600">{metrics.rewards.total.goldGranted}g</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Items Granted</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.rewards.total.itemsGranted}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Claims</p>
            <p className="text-2xl font-bold">{metrics.rewards.total.rewardsClaimed}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Step</th>
                <th className="text-right py-2 px-4">Gold</th>
                <th className="text-right py-2 px-4">Items</th>
                <th className="text-right py-2 px-4">Claims</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rewards.steps.map((step) => (
                <tr key={step.stepKey} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{step.stepTitle}</td>
                  <td className="py-3 px-4 text-right text-yellow-600">{step.goldGranted}g</td>
                  <td className="py-3 px-4 text-right">{step.itemsGranted}</td>
                  <td className="py-3 px-4 text-right">{step.rewardsClaimed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
