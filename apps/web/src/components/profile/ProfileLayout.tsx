'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProfileLayoutProps {
  children: ReactNode;
  className?: string;
}

interface ProfileSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ProfileLayout({ children, className }: ProfileLayoutProps) {
  return (
    <div className={cn('profile-layout', className)}>
      <div className="profile-container">
        {children}
      </div>

      <style jsx>{`
        .profile-layout {
          min-height: 100vh;
          background: #231913;
          color: #f1e5c8;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }

        .profile-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .profile-container {
            padding: 24px;
            gap: 20px;
            grid-template-columns: 2fr 1fr;
            grid-template-areas: 
              "header header"
              "main sidebar";
          }
        }

        @media (min-width: 1024px) {
          .profile-container {
            padding: 32px;
            gap: 24px;
            grid-template-columns: 1fr 2fr 1fr;
            grid-template-areas: 
              "header header header"
              "sidebar main actions";
          }
        }
      `}</style>
    </div>
  );
}

export function ProfileHeader({ children, className }: ProfileSectionProps) {
  return (
    <section className={cn('profile-header-section', className)}>
      {children}

      <style jsx>{`
        .profile-header-section {
          grid-area: header;
          width: 100%;
        }

        @media (max-width: 767px) {
          .profile-header-section {
            margin-bottom: 8px;
          }
        }
      `}</style>
    </section>
  );
}

export function ProfileMain({ children, className }: ProfileSectionProps) {
  return (
    <section className={cn('profile-main-section', className)}>
      {children}

      <style jsx>{`
        .profile-main-section {
          grid-area: main;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        @media (min-width: 1024px) {
          .profile-main-section {
            gap: 20px;
          }
        }
      `}</style>
    </section>
  );
}

export function ProfileSidebar({ children, className }: ProfileSectionProps) {
  return (
    <aside className={cn('profile-sidebar-section', className)}>
      {children}

      <style jsx>{`
        .profile-sidebar-section {
          grid-area: sidebar;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .profile-sidebar-section {
            gap: 18px;
          }
        }

        @media (min-width: 1024px) {
          .profile-sidebar-section {
            gap: 20px;
          }
        }
      `}</style>
    </aside>
  );
}

export function ProfileActions({ children, className }: ProfileSectionProps) {
  return (
    <aside className={cn('profile-actions-section', className)}>
      {children}

      <style jsx>{`
        .profile-actions-section {
          grid-area: actions;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (max-width: 1023px) {
          .profile-actions-section {
            grid-area: sidebar;
            order: -1;
          }
        }

        @media (min-width: 1024px) {
          .profile-actions-section {
            gap: 16px;
          }
        }
      `}</style>
    </aside>
  );
}

export function ProfilePanel({ 
  children, 
  className, 
  title, 
  collapsible = false,
  defaultCollapsed = false
}: ProfileSectionProps) {
  return (
    <div className={cn('profile-panel', className)}>
      {title && (
        <div className="profile-panel-header">
          <h3 className="profile-panel-title">{title}</h3>
        </div>
      )}
      <div className="profile-panel-content">
        {children}
      </div>

      <style jsx>{`
        .profile-panel {
          background: #32241d;
          border: 2px solid #533b2c;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .profile-panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid #4b3527;
          background: rgba(163, 106, 67, 0.1);
        }

        .profile-panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #f1e5c8;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .profile-panel-content {
          padding: 16px;
        }

        @media (max-width: 640px) {
          .profile-panel-content {
            padding: 12px;
          }

          .profile-panel-header {
            padding: 10px 12px;
          }

          .profile-panel-title {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}