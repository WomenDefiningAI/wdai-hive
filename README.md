# WDAI Hive 🐝

**AI Engagement & Play Tracker Slack Bot**

WDAI Hive is a Slack bot that encourages regular AI experimentation and tracks community engagement with AI tools. It sends weekly check-ins to community members, collects structured feedback about AI activities, and provides insights through an admin dashboard.

## 🎯 Features

### For Community Members
- **Weekly DM Check-ins**: Automated friendly reminders asking "Did you play with AI this week?"
- **Structured Responses**: Quick selection from predefined categories and tools
- **Custom Input**: "Other" options for unique activities and tools
- **Privacy Controls**: Opt-out options and data retention preferences

### For Admins
- **Analytics Dashboard**: Visual insights by category, tool, and participation trends
- **Search & Filter**: Find responses by date, category, tool, and user
- **Data Export**: CSV exports with audit logging
- **Knowledge Base**: Searchable archive of community AI projects

## 🏗️ Architecture

- **Backend**: Node.js with Slack Bolt framework
- **Database**: Supabase (PostgreSQL) with encryption
- **Dashboard**: React with TypeScript
- **Deployment**: Docker containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Slack App credentials
- Supabase project
- Docker (optional)

### 1. Clone & Install
```bash
git clone <repository-url>
cd wdai-hive
npm run install:all
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
PORT=3000
NODE_ENV=development
```

### 3. Database Setup
Run the database migration script:
```bash
node scripts/setup-database.js
```

### 4. Start Development
```bash
# Start the bot
npm run dev

# Start the dashboard (in another terminal)
cd dashboard && npm start
```

### 5. Deploy with Docker
```bash
npm run docker:build
npm run docker:run
```

## 📊 Dashboard Access

The admin dashboard is available at `http://localhost:3000` (or your deployed URL). Authentication is handled through Slack Sign-In for admin users.

## 🔧 Configuration

### Weekly Schedule
The bot sends check-ins every Monday at 10:00 AM by default. This can be configured in `src/config/scheduler.js`.

### Categories & Tools
Predefined categories and tools can be customized in `src/config/categories.js`.

### Privacy Settings
Data retention and privacy controls are configurable in the admin dashboard.

## 📈 Success Metrics

- **Weekly participation rate**: Target ≥ 40%
- **Dashboard usage**: Target ≥ 2x per week
- **Category-based visualization usage**: Target ≥ 80% of sessions

## 🔒 Security & Compliance

- **Data Encryption**: AES-256 at rest, TLS in transit
- **GDPR Compliance**: Configurable data retention and deletion workflows
- **Role-based Access**: Admin-only dashboard access
- **Audit Logging**: All data exports and admin actions are logged

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For questions or issues:
- Create an issue in this repository
- Contact the WDAI team
- Check the documentation in `/docs`

---

**WDAI Hive** - Buzzing with AI ideas from our community! 🐝✨ 