# Aurelian - Quick Start Guide

Welcome to Aurelian, a multiplayer 2D trading/gaming application! This guide will help you get started quickly.

## 🎮 Play Now (Production)

Visit the live game at: **[YOUR-APP.vercel.app](https://your-app.vercel.app)**

### How to Play
1. **Sign Up**: Click "Sign in (Magic Link)" and enter your email
2. **Check Email**: Click the magic link sent to your inbox
3. **Create Character**: Go to [Character Creator](/creator) to customize your avatar
4. **Start Playing**: Visit [Play](/play) to move around with other players
5. **Accept Missions**: Check the [Mission Board](/missions) for delivery quests
6. **Trade & Craft**: Visit the [AE2 Hub](/ae2) for trading and crafting

## 🛠️ For Developers

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/KDLN/Aurelian.git
cd Aurelian
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Run the setup script (Unix/Mac/Linux)
chmod +x setup-env.sh
./setup-env.sh

# Or manually create these files:
# apps/web/.env.local
# apps/realtime/.env
# prisma/.env
```

4. **Set up the database**
```bash
# Run Prisma migrations
npx prisma migrate dev
npx prisma generate
```

5. **Start development servers**
```bash
# In separate terminals:
npm run dev:web       # Frontend (http://localhost:3000)
npm run dev:realtime  # WebSocket server (ws://localhost:8787)
npm run dev:worker    # Background worker (http://localhost:8080)
```

## 🎯 Key Features

### Character System
- **Custom Avatars**: Choose hair, outfits, hats, and colors
- **Live Character Viewer**: See your character's current activity in the top-right
- **Smart Hat System**: Certain hats hide hair to prevent visual glitches

### Multiplayer
- **Real-time Movement**: See other players moving in the shared world
- **WebSocket-based**: Low-latency multiplayer using Colyseus

### Game Mechanics
- **Missions**: Accept and complete delivery missions with varying risk levels
- **Crafting**: Create items like Iron Ingots, Leather Rolls, and Healing Tonics
- **Trading**: Auction house system for buying and selling items
- **World Simulation**: In-memory world with trade routes and economics

### Available Pages
- `/` - Home page with navigation
- `/creator` - Character customization
- `/play` - Multiplayer movement
- `/missions` - Mission board
- `/ae2` - Main game hub
- `/ae2/auction` - Auction house
- `/ae2/crafting` - Crafting workshop
- `/ae2/contracts` - Trading contracts
- `/character-viewer-test` - Test all character animations

## 🔧 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Colyseus WebSocket server, Express
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Supabase (magic link authentication)
- **Deployment**: Vercel (frontend), Google Cloud Run (backend)
- **Art**: Mana Seed pixel art sprite pack

## 📚 Documentation

- [Full Deployment Guide](DEPLOYMENT.md) - Set up production environment
- [Project Documentation](CLAUDE.md) - Detailed project structure
- [API Documentation](apps/realtime/README.md) - WebSocket API reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues

- WebSocket connections may need reconnection on network changes
- Character customization doesn't persist across sessions (yet)
- Some combat animations require weapons to display properly

## 📝 Environment Variables

### Required for Production

**Frontend (Vercel)**:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL

**Backend (Cloud Run)**:
- `SUPABASE_JWT_SECRET` - For validating auth tokens
- `DATABASE_URL` - PostgreSQL connection string

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to:
- Vercel (frontend hosting)
- Supabase (database & auth)
- Google Cloud Run (backend services)

## 📧 Support

- GitHub Issues: [github.com/KDLN/Aurelian/issues](https://github.com/KDLN/Aurelian/issues)
- Discord: [Join our community](#)

## 📄 License

This project is open source. See LICENSE file for details.

---

Made with ❤️ using Claude Code