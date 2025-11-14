# WDAI Hive Setup Guide

This guide will walk you through setting up the WDAI Hive Slack bot from scratch.

## Prerequisites

- Node.js 18+ installed
- A Slack workspace where you have admin permissions
- A Supabase account and project
- Docker (optional, for containerized deployment)

## Step 1: Slack App Setup

### 1.1 Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app "WDAI Hive" and select your workspace
4. Click "Create App"

### 1.2 Configure Bot Token Scopes

1. Go to "OAuth & Permissions" in the sidebar
2. Under "Scopes" → "Bot Token Scopes", add:
   - `chat:write` - Send messages
   - `im:read` - Read direct messages
   - `im:write` - Send direct messages
   - `users:read` - Read user information
   - `commands` - Add slash commands
   - `channels:read` - Read channel membership (for targeted check-ins)

### 1.3 Install App to Workspace

1. Go to "Install App" in the sidebar
2. Click "Install to Workspace"
3. Authorize the app

### 1.4 Configure Slash Commands

1. Go to "Slash Commands" in the sidebar
2. Click "Create New Command"
3. Create these commands:

**Command 1:**
- Command: `/wdai-checkin`
- Request URL: `https://your-domain.com/slack/events`
- Short Description: "Manually trigger a weekly AI check-in"

**Command 2:**
- Command: `/wdai-help`
- Request URL: `https://your-domain.com/slack/events`
- Short Description: "Get help with WDAI Hive"

### 1.5 Configure Event Subscriptions

1. Go to "Event Subscriptions" in the sidebar
2. Enable Events
3. Request URL: `https://your-domain.com/slack/events`
4. Subscribe to bot events:
   - `app_mention`
   - `message.im`
   - `app_home_opened`

### 1.6 Get Your Credentials

1. Go to "Basic Information" in the sidebar
2. Copy these values:
   - **Bot User OAuth Token** (starts with `xoxb-`)
   - **Signing Secret**
   - **App-Level Token** (create one with `connections:write` scope)

## Step 2: Supabase Setup

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

### 2.2 Get Your Credentials

1. Go to "Settings" → "API" in your Supabase dashboard
2. Copy these values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this secret!)

### 2.3 Enable Row Level Security (Optional)

For additional security, you can enable RLS on your tables and create policies.

## Step 3: Environment Configuration

### 3.1 Create Environment File

1. Copy `env.example` to `.env`
2. Fill in your credentials:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_SIGNING_SECRET=your-actual-signing-secret
SLACK_APP_TOKEN=xapp-your-actual-app-token

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# App Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Channel Configuration
TARGET_CHANNEL_ID=C088PDC4VRS  # Only members of this channel will receive weekly check-ins
```

## Step 4: Installation & Setup

### 4.1 Install Dependencies

```bash
# Install all dependencies
npm run install:all
```

### 4.2 Setup Database

```bash
# Run database setup script
node scripts/setup-database.js
```

This will create all necessary tables in your Supabase database.

### 4.3 Start Development Server

```bash
# Start the bot and dashboard
npm run dev
```

The application will be available at:
- Bot: Running on port 3000
- Dashboard: http://localhost:3000

## Step 5: Deployment

### Option A: Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d
```

### Option B: Manual Deployment

1. Set `NODE_ENV=production` in your `.env`
2. Set production environment variables
3. Start the application: `npm start`

### Option C: Cloud Deployment

You can deploy to:
- **Heroku**: Use the provided `Dockerfile`
- **Railway**: Connect your GitHub repo
- **DigitalOcean App Platform**: Use the Dockerfile
- **AWS ECS**: Use the Dockerfile

## Step 6: Testing

### 6.1 Test Slack Integration

1. Invite the bot to a channel: `/invite @WDAI Hive`
2. Mention the bot: `@WDAI Hive`
3. Test slash commands: `/wdai-checkin`, `/wdai-help`
4. Send a DM to the bot

### 6.2 Test Dashboard

1. Visit http://localhost:3000 (or your deployed URL)
2. Check that the dashboard loads
3. Verify that data appears after some responses

### 6.3 Test Weekly Check-ins

1. The bot sends check-ins every Monday at 10:00 AM UTC
2. You can manually trigger check-ins for testing
3. Check the logs for any errors

## Step 7: Configuration

### 7.1 Customize Categories and Tools

Edit `src/config/categories.js` to customize:
- AI activity categories
- AI tools list
- Message templates

### 7.2 Adjust Schedule

Edit `src/scheduler/weeklyCheckins.js` to change:
- Check-in timing
- Reminder timing
- Timezone settings

### 7.3 Add Admin Users

Add admin users to the `admin_users` table in Supabase:

```sql
INSERT INTO admin_users (slack_user_id, slack_display_name, permissions)
VALUES ('U1234567890', 'Admin User', '["read", "export", "manage"]');
```

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check Slack app configuration and event subscriptions
2. **Database errors**: Verify Supabase credentials and network connectivity
3. **Dashboard not loading**: Check if the React app built successfully
4. **Weekly check-ins not sending**: Check cron job configuration and timezone

### Logs

Check the logs directory for detailed error information:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Support

If you encounter issues:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure your Slack app has the correct permissions
4. Check that your Supabase project is active

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Database Access**: Use the service role key only on the server
3. **Slack Tokens**: Keep your Slack tokens secure
4. **HTTPS**: Use HTTPS in production for all endpoints
5. **Rate Limiting**: The app includes rate limiting for API endpoints

## Next Steps

Once your bot is running:

1. **Onboard Users**: Share the bot with your community
2. **Monitor Analytics**: Use the dashboard to track engagement
3. **Customize Messages**: Adjust the tone and content of check-ins
4. **Add Features**: Implement additional features based on community feedback

---

**Need help?** Check the main README.md for more information or create an issue in the repository. 