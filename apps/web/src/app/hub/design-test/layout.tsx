/**
 * Design Test Page Layout
 *
 * Imports the design system styles for this page.
 */

import '@/lib/design/tokens.css';
import '@/lib/design/components.css';
import '@/lib/design/utilities.css';

export const metadata = {
  title: 'Design System - Aurelian',
  description: 'Living documentation and component showcase for the Aurelian design system',
};

export default function DesignTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
