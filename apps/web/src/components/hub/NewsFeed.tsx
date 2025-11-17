/**
 * NewsFeed Component
 *
 * Displays news items with timestamps and links.
 * Simple, mobile-friendly list design.
 */

import React from 'react';

export interface NewsItem {
  title: string;
  timestamp: string;
  readUrl?: string;
}

interface NewsFeedProps {
  news: NewsItem[];
  title?: string;
  limit?: number;
}

export function NewsFeed({ news, title = 'World News', limit }: NewsFeedProps) {
  const displayNews = limit ? news.slice(0, limit) : news;

  return (
    <div className="ds-card">
      <h3 className="ds-heading-4 ds-mb-md">{title}</h3>

      <div className="ds-stack ds-stack--sm">
        {displayNews.length === 0 ? (
          <div className="ds-text-sm ds-text-muted ds-text-center ds-py-lg">
            No news available
          </div>
        ) : (
          displayNews.map((item, index) => (
            <div key={index}>
              <div className="ds-stack ds-stack--xs">
                <div className="ds-text-sm ds-text-bold">{item.title}</div>
                <div className="ds-split ds-items-center">
                  <div className="ds-text-xs ds-text-dim">{item.timestamp}</div>
                  {item.readUrl && (
                    <a href={item.readUrl} className="ds-btn--link ds-text-xs">
                      Read Update
                    </a>
                  )}
                </div>
              </div>

              {index < displayNews.length - 1 && (
                <div className="ds-divider" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
