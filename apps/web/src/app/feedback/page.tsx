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
    return <div className="p-4">Thank you for your feedback!</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">UI/UX Feedback Study</h1>
      <p>
        Reviewing page {index + 1} of {PAGES.length}: {page.name}
      </p>
      <iframe
        src={page.url}
        title={page.name}
        className="w-full h-96 border"
      />
      <form onSubmit={handleSubmit} className="space-y-2">
        {QUESTIONS.map(q => (
          <label key={q.id} className="block">
            <span className="block font-medium">{q.label}</span>
            <textarea
              name={q.id}
              required
              className="mt-1 w-full border p-2"
            />
          </label>
        ))}
        <button
          type="submit"
          className="mt-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          {index + 1 < PAGES.length ? 'Next' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
