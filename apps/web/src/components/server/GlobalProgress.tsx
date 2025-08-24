'use client';

import { cn } from '@/lib/utils';

interface GlobalProgressProps {
  mission: {
    globalProgress: any;
    globalRequirements: any;
  };
  className?: string;
}

export default function GlobalProgress({ mission, className }: GlobalProgressProps) {
  const progress = mission.globalProgress || {};
  const requirements = mission.globalRequirements || {};

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-400';
    if (percentage >= 75) return 'bg-yellow-400';
    if (percentage >= 50) return 'bg-orange-400';
    return 'bg-blue-400';
  };

  return (
    <div className={cn('bg-gray-800 rounded-lg p-4', className)}>
      <h4 className="text-lg font-semibold text-yellow-400 mb-4">Global Progress</h4>
      
      <div className="space-y-4">
        {/* Items Requirements */}
        {requirements.items && Object.keys(requirements.items).length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Resources Needed</h5>
            <div className="space-y-2">
              {Object.entries(requirements.items as Record<string, number>).map(([itemKey, required]) => {
                const current = progress.items?.[itemKey] || 0;
                const percentage = Math.min((current / required) * 100, 100);
                
                return (
                  <div key={itemKey} className="flex items-center space-x-3">
                    <div className="w-20 text-xs text-gray-400 capitalize">
                      {itemKey.replace('_', ' ')}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>{formatNumber(current)} / {formatNumber(required)}</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(percentage))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gold Requirement */}
        {requirements.gold && (
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Gold Target</h5>
            <div className="flex items-center space-x-3">
              <div className="w-20 text-xs text-gray-400">
                💰 Gold
              </div>
              <div className="flex-1">
                {(() => {
                  const current = progress.gold || 0;
                  const required = requirements.gold;
                  const percentage = Math.min((current / required) * 100, 100);
                  
                  return (
                    <>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>{formatNumber(current)} / {formatNumber(required)}</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(percentage))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Trades Requirement */}
        {requirements.trades && (
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Trade Activity</h5>
            <div className="flex items-center space-x-3">
              <div className="w-20 text-xs text-gray-400">
                📈 Trades
              </div>
              <div className="flex-1">
                {(() => {
                  const current = progress.trades || 0;
                  const required = requirements.trades;
                  const percentage = Math.min((current / required) * 100, 100);
                  
                  return (
                    <>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>{formatNumber(current)} / {formatNumber(required)}</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(percentage))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Overall Progress */}
        <div className="pt-2 border-t border-gray-700">
          <h5 className="text-sm font-medium text-gray-300 mb-2">Overall Progress</h5>
          {(() => {
            // Calculate overall progress
            let totalProgress = 0;
            let totalRequirements = 0;

            if (requirements.items) {
              for (const [itemKey, required] of Object.entries(requirements.items as Record<string, number>)) {
                const current = progress.items?.[itemKey] || 0;
                totalProgress += Math.min(current, required);
                totalRequirements += required;
              }
            }

            if (requirements.gold) {
              const current = progress.gold || 0;
              totalProgress += Math.min(current, requirements.gold);
              totalRequirements += requirements.gold;
            }

            if (requirements.trades) {
              const current = progress.trades || 0;
              totalProgress += Math.min(current, requirements.trades);
              totalRequirements += requirements.trades;
            }

            const overallPercentage = totalRequirements > 0 ? (totalProgress / totalRequirements) * 100 : 0;
            
            return (
              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Mission Completion</span>
                  <span className="font-bold">{Math.round(overallPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className={cn(
                      'h-3 rounded-full transition-all duration-300',
                      overallPercentage >= 100 
                        ? 'bg-gradient-to-r from-green-400 to-green-600' 
                        : 'bg-gradient-to-r from-blue-400 to-purple-500'
                    )}
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  />
                </div>
                
                {overallPercentage >= 100 && (
                  <div className="text-center mt-2">
                    <span className="text-green-400 text-sm font-bold">
                      🎉 Mission Complete! 🎉
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}