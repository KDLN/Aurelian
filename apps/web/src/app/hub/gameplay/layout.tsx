/**
 * Hub Gameplay Layout
 *
 * Imports the design system for the gameplay hub page.
 */

import '@/lib/design/tokens.css';
import '@/lib/design/components.css';
import '@/lib/design/utilities.css';

export const metadata = {
  title: 'Trading Hub - Aurelian',
  description: 'Manage your trading empire, review missions, and plan your next moves',
};

export default function GameplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
