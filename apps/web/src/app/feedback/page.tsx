'use client';

import { FormEvent, useState } from 'react';

type PageInfo = {
  name: string;
  url: string;
};

const PAGES: PageInfo[] = [
  { name: 'Landing Page', url: 'https://www.aurelian.online/' },
  { name: 'Trading Hub', url: 'https://www.aurelian.online/hub' },
  { name: 'Character Creator', url: 'https://www.aurelian.online/creator' },
  { name: 'Warehouse', url: 'https://www.aurelian.online/warehouse' },
  { name: 'Inventory', url: 'https://www.aurelian.online/inventory' },
  { name: 'Auction House', url: 'https://www.aurelian.online/auction' },
  { name: 'Market Dashboard', url: 'https://www.aurelian.online/market' },
  { name: 'Trade Contracts', url: 'https://www.aurelian.online/contracts' },
  { name: 'Mission Control', url: 'https://www.aurelian.online/missions' },
  { name: 'Agents', url: 'https://www.aurelian.online/agents' },
  { name: 'Crafting Workshop', url: 'https://www.aurelian.online/crafting' },
  { name: 'Hub Travel', url: 'https://www.aurelian.online/hub-travel' },
  { name: 'Guild Main', url: 'https://www.aurelian.online/guild' },
  { name: 'Guild Browse', url: 'https://www.aurelian.online/guild/browse' },
  { name: 'Guild Create', url: 'https://www.aurelian.online/guild/create' },
  { name: 'Guild Members', url: 'https://www.aurelian.online/guild/members' },
  { name: 'Guild Manage', url: 'https://www.aurelian.online/guild/manage' },
  { name: 'Guild Warehouse', url: 'https://www.aurelian.online/guild/warehouse' },
  { name: 'Guild Wars', url: 'https://www.aurelian.online/guild/wars' },
  { name: 'Guild Achievements', url: 'https://www.aurelian.online/guild/achievements' },
  { name: 'Guild Channels', url: 'https://www.aurelian.online/guild/channels' },
  { name: 'Mission Statistics', url: 'https://www.aurelian.online/missions/stats' },
  { name: 'Mission Leaderboard', url: 'https://www.aurelian.online/missions/leaderboard' },
  { name: 'User Profile', url: 'https://www.aurelian.online/profile' },
  { name: 'Help', url: 'https://www.aurelian.online/help' },
  { name: 'World Map', url: 'https://www.aurelian.online/world-map' }
];

const QUESTIONS = [
  { id: 'style', label: 'What do you think about the style and design?' },
  { id: 'lookFeel', label: 'How does the look and feel support the experience?' },
  { id: 'understanding', label: 'Was the page easy to understand?' },
  { id: 'other', label: 'Any other feedback or suggestions?' }
];

export default function FeedbackPage() {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Record<string, string>>>({});
  const [done, setDone] = useState(false);

  const page = PAGES[index];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const answer: Record<string, string> = {};
    QUESTIONS.forEach(q => {
      answer[q.id] = (formData.get(q.id) as string) || '';
    });
    const newResponses = { ...responses, [page.url]: answer };
    setResponses(newResponses);
    e.currentTarget.reset();
    if (index + 1 < PAGES.length) {
      setIndex(index + 1);
    } else {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResponses)
      });
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank you for your feedback!</h1>
          <p className="text-gray-600">Your responses have been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left side - Feedback form */}
        <div className="w-1/3 p-6 bg-white shadow-lg overflow-y-auto">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">UI/UX Feedback Study</h1>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                Reviewing page {index + 1} of {PAGES.length}
              </p>
              <p className="font-semibold text-blue-900">{page.name}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {QUESTIONS.map(q => (
                <label key={q.id} className="block">
                  <span className="block font-medium text-gray-700 mb-2">{q.label}</span>
                  <textarea
                    name={q.id}
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Please share your thoughts..."
                  />
                </label>
              ))}
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {index + 1 < PAGES.length ? `Next Page (${index + 2}/${PAGES.length})` : 'Submit All Feedback'}
                </button>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((index + 1) / PAGES.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Progress: {index + 1} of {PAGES.length} pages
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Website preview */}
        <div className="w-2/3 bg-gray-100 p-4">
          <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 p-3 flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-xs text-gray-300 font-mono">
                {page.url}
              </div>
            </div>
            <iframe
              src={page.url}
              title={page.name}
              className="w-full h-full border-0"
              style={{ height: 'calc(100% - 52px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
