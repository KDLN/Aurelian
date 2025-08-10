#!/bin/bash

# Setup script for Aurelian deployment environment variables

echo "🚀 Aurelian Deployment Setup Script"
echo "===================================="
echo ""

# Check if .env files exist
if [ -f "apps/web/.env.local" ]; then
    echo "⚠️  Warning: apps/web/.env.local already exists"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping web environment setup..."
    else
        setup_web=true
    fi
else
    setup_web=true
fi

if [ "$setup_web" = true ]; then
    echo "📝 Setting up Web App Environment Variables"
    echo "-------------------------------------------"
    read -p "Enter Supabase Project URL (https://xxx.supabase.co): " supabase_url
    read -p "Enter Supabase Anon Key: " supabase_anon_key
    read -p "Enter WebSocket URL (ws://localhost:8787 for dev): " ws_url

    cat > apps/web/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key
NEXT_PUBLIC_WS_URL=$ws_url
EOF
    echo "✅ Created apps/web/.env.local"
fi

# Setup realtime server environment
if [ -f "apps/realtime/.env" ]; then
    echo "⚠️  Warning: apps/realtime/.env already exists"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping realtime environment setup..."
    else
        setup_realtime=true
    fi
else
    setup_realtime=true
fi

if [ "$setup_realtime" = true ]; then
    echo ""
    echo "📝 Setting up Realtime Server Environment Variables"
    echo "---------------------------------------------------"
    read -p "Enter Supabase JWT Secret (from Supabase dashboard): " jwt_secret
    read -p "Enter Port (default 8787): " port
    port=${port:-8787}

    cat > apps/realtime/.env << EOF
SUPABASE_JWT_SECRET=$jwt_secret
PORT=$port
EOF
    echo "✅ Created apps/realtime/.env"
fi

# Setup worker environment
if [ -f "apps/worker/.env" ]; then
    echo "⚠️  Warning: apps/worker/.env already exists"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping worker environment setup..."
    else
        setup_worker=true
    fi
else
    setup_worker=true
fi

if [ "$setup_worker" = true ]; then
    echo ""
    echo "📝 Setting up Worker Service Environment Variables"
    echo "--------------------------------------------------"
    read -p "Enter Database URL (postgresql://...): " database_url
    read -p "Enter Direct Database URL (for migrations): " direct_url
    read -p "Enter Port (default 8080): " worker_port
    worker_port=${worker_port:-8080}

    cat > apps/worker/.env << EOF
DATABASE_URL=$database_url
DIRECT_URL=$direct_url
PORT=$worker_port
EOF
    echo "✅ Created apps/worker/.env"
fi

# Setup Prisma environment
if [ -f "prisma/.env" ]; then
    echo "⚠️  Warning: prisma/.env already exists"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping prisma environment setup..."
    else
        setup_prisma=true
    fi
else
    setup_prisma=true
fi

if [ "$setup_prisma" = true ] && [ -n "$database_url" ]; then
    cat > prisma/.env << EOF
DATABASE_URL=$database_url
DIRECT_URL=$direct_url
EOF
    echo "✅ Created prisma/.env"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npx prisma migrate deploy' to set up database"
echo "3. Run 'npm run dev:web' to start the web app"
echo "4. Run 'npm run dev:realtime' to start the WebSocket server"
echo "5. Run 'npm run dev:worker' to start the worker service"
echo ""
echo "For production deployment, see DEPLOYMENT.md"