# Voice AI Agent Frontend

A minimal, modern frontend for LiveKit voice AI agents. This project provides a clean UI for voice conversations with AI agents, featuring real-time transcripts and audio visualization.

## Features

- 🎙️ **Voice Conversations** - Start calls with your AI voice agent
- 📝 **Real-time Transcripts** - Streaming transcripts for both user and agent
- 💬 **Chat Input** - Type messages as an alternative to voice
- 🎨 **Audio Visualizer** - Visual feedback during conversations
- 🌙 **Dark Mode** - Clean, modern dark theme

## Getting Started

### Prerequisites

- Node.js 18+ 
- A LiveKit Cloud account or self-hosted LiveKit server
- A running voice agent backend

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Configure your LiveKit credentials in `.env.local`:
   ```
   LIVEKIT_URL=wss://your-livekit-server.com
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/connection-details/  # Token generation endpoint
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page
├── components/
│   ├── ui/button.tsx            # Button component
│   ├── audio-visualizer.tsx     # Audio visualization
│   ├── chat-transcript.tsx      # Message display
│   ├── control-bar.tsx          # Call controls
│   ├── session-view.tsx         # Active call view
│   ├── welcome-view.tsx         # Landing page
│   └── main-page.tsx            # Main app component
├── lib/
│   └── utils.ts                 # Utility functions
├── app-config.ts                # App configuration
└── package.json
```

## Configuration

Edit `app-config.ts` to customize:

```typescript
export const APP_CONFIG: AppConfig = {
  companyName: 'Voice AI',
  pageTitle: 'Voice AI Agent',
  supportsChatInput: true,    // Enable/disable chat
  startButtonText: 'Start Call',
  accentColor: '#3b82f6',     // Theme color
};
```

## Tech Stack

- **Next.js 15** - React framework
- **LiveKit** - Real-time audio/video
- **Tailwind CSS** - Styling
- **Motion** - Animations
- **Lucide Icons** - Icon library

## License

MIT

---

## Deploy to Vercel

This guide will help you deploy the Voice AI Agent Frontend to Vercel.

### Prerequisites

- A [Vercel](https://vercel.com) account
- A GitHub, GitLab, or Bitbucket repository with your code
- A LiveKit Cloud account or self-hosted LiveKit server

### Method 1: Deploy from Vercel Dashboard

1. **Push your code to GitHub/GitLab/Bitbucket**:
   ```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**:
   In the Vercel dashboard project settings, add the following environment variables:
   
   | Variable | Description | Example |
   |----------|-------------|---------|
   | `LIVEKIT_URL` | Your LiveKit server URL | `wss://your-project.livekit.cloud` |
   | `LIVEKIT_API_KEY` | Your LiveKit API key | `APIxxxxxxx` |
   | `LIVEKIT_API_SECRET` | Your LiveKit API secret | `secret-xxxxx` |
   
   You can get these from your [LiveKit Cloud dashboard](https://cloud.livekit.io/) or your self-hosted LiveKit server.

4. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your site will be live at `https://your-project.vercel.app`

### Method 2: Deploy using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add Environment Variables**:
   ```bash
   vercel env add LIVEKIT_URL
   vercel env add LIVEKIT_API_KEY
   vercel env add LIVEKIT_API_SECRET
   ```

5. **Promote to Production**:
   ```bash
   vercel --prod
   ```

### Configuration for Production

When deploying to production, ensure your LiveKit server allows connections from your Vercel domain. You may need to:

1. **Configure CORS in LiveKit** (if using self-hosted):
   Add your Vercel domain to the CORS allowed origins.

2. **Update connection URL**:
   Make sure `LIVEKIT_URL` points to your production LiveKit server.

3. **Custom Domain** (optional):
   - Go to Vercel project Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

### Troubleshooting

- **Build fails**: Make sure all dependencies are in `package.json` and you're using Node.js 18+
- **Connection issues**: Verify your LiveKit credentials and that your server allows Vercel's IP ranges
- **Environment variables not working**: Redeploy after adding new environment variables