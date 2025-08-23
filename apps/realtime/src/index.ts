import express, { Request, Response } from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { MovementRoom } from './rooms/movement';
import { AuctionTickerRoom } from './rooms/ticker';
import { EnhancedTickerRoom } from './rooms/enhanced-ticker';
import { AuctionRoom } from './rooms/auction';
import { PublicChatRoom } from './rooms/public-chat-room';
import { GuildChatRoom } from './rooms/guild-chat-room';
import { DirectMessageRoom } from './rooms/direct-message-room';

const app = express();
app.get('/', (_req: Request, res: Response) => res.send('Aurelian Realtime Server v2.0 - Ready'));
const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define('movement', MovementRoom);
gameServer.define('auction_ticker', AuctionTickerRoom); // Keep old for backward compatibility
gameServer.define('enhanced_ticker', EnhancedTickerRoom); // New advanced ticker
gameServer.define('auction', AuctionRoom);

// Chat rooms
gameServer.define('chat_general', PublicChatRoom, { channelType: 'GENERAL' });
gameServer.define('chat_trade', PublicChatRoom, { channelType: 'TRADE' });
// Create separate rooms for each guild channel
gameServer.define('chat_guild', GuildChatRoom).filterBy(['guildChannelId']);
// Direct message rooms - filtered by participant pair
gameServer.define('direct_message', DirectMessageRoom).filterBy(['participants']);

const port = Number(process.env.PORT || 8787);
server.listen(port, ()=> console.log(`Realtime running on :${port}`));
