# Notifications Hub

A full-stack notification system built with Next.js, Node.js, Express, PostgreSQL, and Redis, delivering email, SMS, push, Slack, and Telegram alerts with advanced queue management, retry logic, and real-time analytics.

## Features

### 🚀 Multi-Channel Support
- **Email** - HTML/text emails with templates and attachments
- **SMS** - Text messages via Twilio with delivery tracking
- **Push Notifications** - Firebase Cloud Messaging for mobile/web
- **Slack** - Direct messages and channel notifications
- **Telegram** - Bot messages and chat notifications

### 📊 Advanced Queue Management
- **BullMQ Integration** - Redis-backed job queue with priorities
- **Retry Logic** - Exponential backoff with configurable strategies
- **Status Tracking** - Real-time notification status updates
- **Bulk Operations** - Send thousands of notifications efficiently

### 🎯 Smart Features
- **Priority Handling** - Urgent, high, normal, and low priority queues
- **Scheduling** - Send notifications at specific times
- **Templates** - Reusable email templates with variables
- **Analytics** - Comprehensive delivery and performance metrics
- **User Management** - Manage recipients and preferences

### 🛡️ Enterprise Ready
- **Rate Limiting** - Protect against abuse
- **Error Handling** - Comprehensive logging and monitoring
- **Health Checks** - System status monitoring
- **Graceful Shutdown** - Clean process termination

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Environment Variables

\`\`\`env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/notifications_hub

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# SMS (Twilio or AfroMessage)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
\`\`\`

### Installation

1. **Clone and install dependencies**
\`\`\`bash
git clone <repository-url>
cd notifications-hub
npm install
\`\`\`

2. **Set up the database**
\`\`\`bash
# Run the database setup script
npm run setup-db
\`\`\`

3. **Start the services**
\`\`\`bash
# Start the backend API
npm run dev:backend

# Start the frontend (in another terminal)
npm run dev
\`\`\`

## API Documentation

### Send Notification
\`\`\`bash
POST /api/notifications/send
Content-Type: application/json

{
  "subject": "Welcome!",
  "message": "Welcome to our platform!",
  "channels": [
    {
      "type": "email",
      "recipient": "user@example.com"
    },
    {
      "type": "sms",
      "recipient": "+1234567890"
    }
  ],
  "priority": "high",
  "scheduledAt": "2024-01-01T12:00:00Z"
}
\`\`\`

### Get Notification Status
\`\`\`bash
GET /api/notifications/{id}
\`\`\`

### Queue Management
\`\`\`bash
GET /api/queue/stats          # Get queue statistics
POST /api/queue/pause         # Pause processing
POST /api/queue/resume        # Resume processing
POST /api/queue/retry-failed  # Retry failed jobs
\`\`\`

### Analytics
\`\`\`bash
GET /api/analytics            # Get comprehensive analytics
GET /api/analytics/errors     # Get error logs
GET /api/analytics/logs       # Get recent activity
\`\`\`

## Channel Configuration

### Email Setup
Configure SMTP settings in your environment variables. Supports:
- HTML and text emails
- Attachments
- Templates with variables
- Bulk sending

### SMS Setup (Twilio)
1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Configure environment variables

### Push Notifications (Firebase)
1. Create a Firebase project
2. Generate a service account key
3. Configure FCM in your mobile/web app
4. Set environment variables

### Slack Integration
1. Create a Slack app
2. Add bot token scopes
3. Install app to workspace
4. Configure bot token

### Telegram Integration
1. Create a bot via @BotFather
2. Get bot token
3. Configure webhook or polling
