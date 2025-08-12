import express, { Request, Response } from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { MovementRoom } from './rooms/movement';
import { AuctionTickerRoom } from './rooms/ticker';
import { EnhancedTickerRoom } from './rooms/enhanced-ticker';
import { AuctionRoom } from './rooms/auction';

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

const port = Number(process.env.PORT || 8787);
server.listen(port, ()=> console.log(`Realtime running on :${port}`));
