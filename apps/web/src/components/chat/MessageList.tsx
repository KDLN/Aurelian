'use client';

import { ChatMessage } from './ChatSystem';
import { ChatMessageComponent } from './ChatMessage';

interface Props {
  messages: ChatMessage[];
  isCompact?: boolean;
}

export function MessageList({ messages, isCompact = false }: Props) {
  if (messages.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#a1824a',
        padding: '20px',
        fontSize: '14px'
      }}>
        <div>💬 No messages yet</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Be the first to start the conversation!
        </div>
      </div>
    );
  }

  // Group consecutive messages from same user
  const groupedMessages: Array<{ user: string; messages: ChatMessage[] }> = [];
  let currentGroup: { user: string; messages: ChatMessage[] } | null = null;

  for (const message of messages) {
    if (!currentGroup || currentGroup.user !== message.userId) {
      currentGroup = { user: message.userId, messages: [message] };
      groupedMessages.push(currentGroup);
    } else {
      // Only group if messages are within 5 minutes of each other
      const lastMessage = currentGroup.messages[currentGroup.messages.length - 1];
      const timeDiff = message.timestamp - lastMessage.timestamp;
      
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        currentGroup.messages.push(message);
      } else {
        currentGroup = { user: message.userId, messages: [message] };
        groupedMessages.push(currentGroup);
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {groupedMessages.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} style={{ marginBottom: '8px' }}>
          {group.messages.map((message, messageIndex) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              showAvatar={messageIndex === 0} // Only show avatar for first message in group
              showUsername={messageIndex === 0} // Only show username for first message in group
              isCompact={isCompact}
            />
          ))}
        </div>
      ))}
    </div>
  );
}