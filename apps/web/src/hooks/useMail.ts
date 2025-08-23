'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Mail {
  id: string;
  subject: string;
  content: string;
  status: string;
  priority: string;
  isStarred: boolean;
  senderId: string;
  senderName: string;
  senderGuildTag?: string;
  recipientId: string;
  recipientName: string;
  attachments?: any;
  parentMailId?: string;
  replyCount: number;
  readAt?: number;
  createdAt: number;
  expiresAt?: number;
}

interface MailFolder {
  id: string;
  name: string;
  isSystem: boolean;
  mailCount: number;
  unreadCount: number;
  sortOrder: number;
}

interface UseMailReturn {
  mails: Mail[];
  folders: MailFolder[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  sendMail: (recipientId: string, subject: string, content: string, options?: any) => Promise<boolean>;
  markAsRead: (mailId: string) => Promise<boolean>;
  deleteMail: (mailId: string) => Promise<boolean>;
  loadMails: (folder?: string) => Promise<void>;
  loadFolders: () => Promise<void>;
  refetch: () => void;
}

export function useMail(initialFolder = 'inbox'): UseMailReturn {
  const [mails, setMails] = useState<Mail[]>([]);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState(initialFolder);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadFolders = useCallback(async () => {
    try {
      setError(null);
      const headers = await getAuthHeaders();

      const response = await fetch('/api/mail/folders', { headers });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load folders');
      }
    } catch (error) {
      console.error('Error loading mail folders:', error);
      setError('Failed to load mail folders');
    }
  }, []);

  const loadMails = useCallback(async (folder = currentFolder) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentFolder(folder);

      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        folder,
        limit: '50'
      });

      const response = await fetch(`/api/mail?${params}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setMails(data.mails);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load mails');
      }
    } catch (error) {
      console.error('Error loading mails:', error);
      setError('Failed to load mails');
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  const sendMail = useCallback(async (
    recipientId: string, 
    subject: string, 
    content: string, 
    options?: any
  ): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientId,
          subject,
          content,
          priority: options?.priority || 'NORMAL',
          attachments: options?.attachments,
          parentMailId: options?.parentMailId
        })
      });

      if (response.ok) {
        // Refresh folders to update counts
        await loadFolders();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send mail');
        return false;
      }
    } catch (error) {
      console.error('Error sending mail:', error);
      setError('Failed to send mail');
      return false;
    }
  }, [loadFolders]);

  const markAsRead = useCallback(async (mailId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/mail/${mailId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'READ' })
      });

      if (response.ok) {
        // Update local state
        setMails(prev => prev.map(mail => 
          mail.id === mailId 
            ? { ...mail, status: 'read', readAt: Date.now() }
            : mail
        ));
        // Refresh folders to update counts
        await loadFolders();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to mark as read');
        return false;
      }
    } catch (error) {
      console.error('Error marking mail as read:', error);
      setError('Failed to mark mail as read');
      return false;
    }
  }, [loadFolders]);

  const deleteMail = useCallback(async (mailId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/mail/${mailId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        // Remove from local state
        setMails(prev => prev.filter(mail => mail.id !== mailId));
        // Refresh folders to update counts
        await loadFolders();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete mail');
        return false;
      }
    } catch (error) {
      console.error('Error deleting mail:', error);
      setError('Failed to delete mail');
      return false;
    }
  }, [loadFolders]);

  const refetch = useCallback(() => {
    loadMails();
    loadFolders();
  }, [loadMails, loadFolders]);

  // Initial load
  useEffect(() => {
    loadFolders();
    loadMails();
  }, [loadFolders, loadMails]);

  // Calculate unread count from folders
  const unreadCount = folders.find(f => f.id === 'inbox')?.unreadCount || 0;

  return {
    mails,
    folders,
    unreadCount,
    loading,
    error,
    sendMail,
    markAsRead,
    deleteMail,
    loadMails,
    loadFolders,
    refetch
  };
}