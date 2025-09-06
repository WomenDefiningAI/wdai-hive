const cron = require("node-cron");
const { logger } = require("../utils/logger");
const { logAuditEvent } = require("../database/setup");
const { MESSAGE_TEMPLATES } = require("../config/categories");

function setupScheduler(app) {
  // Schedule weekly check-ins for every Monday at 10:00 AM
  cron.schedule(
    "0 10 * * 1",
    async () => {
      logger.info("Starting weekly check-in process...");
      await sendWeeklyCheckins(app);
    },
    {
      timezone: "UTC",
    }
  );

  // Also schedule for different timezones if needed
  // cron.schedule('0 10 * * 1', async () => {
  //   logger.info('Starting weekly check-in process (PST)...');
  //   await sendWeeklyCheckins(app);
  // }, {
  //   timezone: "America/Los_Angeles"
  // });

  logger.info("Weekly scheduler initialized - check-ins will be sent every Monday at 10:00 AM UTC");
}

async function sendWeeklyCheckins(app) {
  try {
    // Target channel ID for check-ins
    const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID || "C088PDC4VRS";

    // Get channel members
    const channelMembers = await getChannelMembers(app, TARGET_CHANNEL_ID);
    if (!channelMembers || channelMembers.length === 0) {
      logger.warn(`No members found in target channel ${TARGET_CHANNEL_ID}`);
      return;
    }

    logger.info(`Found ${channelMembers.length} members in target channel ${TARGET_CHANNEL_ID}`);

    // Send check-ins to all channel members (no database filtering needed)
    const targetUsers = channelMembers.map(userId => ({
      slack_user_id: userId,
      slack_display_name: null, // Will be resolved when sending
    }));

    logger.info(`Sending weekly check-ins to ${targetUsers.length} channel members`);

    const weekStartDate = getWeekStartDate();
    let successCount = 0;
    let errorCount = 0;

    for (const user of targetUsers) {
      try {
        // Send the weekly check-in to channel member
        await sendWeeklyCheckinToUser(app, user.slack_user_id, user.slack_display_name);
        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error sending check-in to user ${user.slack_user_id}:`, error);
        errorCount++;
      }
    }

    logger.info(`Weekly check-ins completed: ${successCount} sent, ${errorCount} errors`);

    // Log the weekly check-in event
    await logAuditEvent("weekly_checkin_batch", null, null, {
      targetChannelId: TARGET_CHANNEL_ID,
      channelMembersCount: channelMembers.length,
      successCount,
      errorCount,
      weekStartDate,
    });
  } catch (error) {
    logger.error("Error in weekly check-in process:", error);
  }
}

async function sendWeeklyCheckinToUser(app, slackUserId, displayName) {
  try {
    const greeting = displayName ? `Hey ${displayName}!` : "Hey there!";

    const message = {
      channel: slackUserId,
      text: MESSAGE_TEMPLATES.weekly_checkin.description,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: MESSAGE_TEMPLATES.weekly_checkin.title,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${greeting} ${MESSAGE_TEMPLATES.weekly_checkin.description}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*What does "playing with AI" mean?*\n${MESSAGE_TEMPLATES.weekly_checkin.ai_definition}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: MESSAGE_TEMPLATES.weekly_checkin.yes_button,
              },
              style: "primary",
              action_id: "weekly_checkin_yes",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: MESSAGE_TEMPLATES.weekly_checkin.no_button,
              },
              action_id: "weekly_checkin_no",
            },
          ],
        },
      ],
    };

    const result = await app.client.chat.postMessage(message);

    if (result.ok) {
      logger.info(`Successfully sent weekly check-in to ${slackUserId}`);
    } else {
      throw new Error(`Slack API error: ${result.error}`);
    }
  } catch (error) {
    logger.error(`Failed to send weekly check-in to ${slackUserId}:`, error);
    throw error;
  }
}

// Manual trigger function for testing or admin use
async function triggerWeeklyCheckins(app, targetUsers = null) {
  logger.info("Manually triggering weekly check-ins...");

  if (targetUsers && Array.isArray(targetUsers)) {
    // Send to specific users
    for (const userId of targetUsers) {
      try {
        await sendWeeklyCheckinToUser(app, userId, null);
      } catch (error) {
        logger.error(`Error sending manual check-in to ${userId}:`, error);
      }
    }
  } else {
    // Send to all channel members
    await sendWeeklyCheckins(app);
  }
}

// Reminder function for channel members
async function sendReminders(app, _daysAfterCheckin = 3) {
  try {
    const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID || "C088PDC4VRS";

    // Get channel members
    const channelMembers = await getChannelMembers(app, TARGET_CHANNEL_ID);
    if (!channelMembers || channelMembers.length === 0) {
      logger.warn(`No members found in target channel ${TARGET_CHANNEL_ID} for reminders`);
      return;
    }

    let reminderCount = 0;

    for (const userId of channelMembers) {
      try {
        // Send reminder to all channel members
        await sendReminderMessage(app, userId, null);
        reminderCount++;

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error sending reminder to ${userId}:`, error);
      }
    }

    logger.info(`Sent ${reminderCount} reminder messages to channel members`);
  } catch (error) {
    logger.error("Error in reminder process:", error);
  }
}

async function sendReminderMessage(app, slackUserId, displayName) {
  const greeting = displayName ? `Hey ${displayName}!` : "Hey there!";

  const message = {
    channel: slackUserId,
    text: "Just a friendly reminder about your weekly AI check-in!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${greeting} Just a friendly reminder that we haven't heard from you yet this week about your AI adventures! 🐝`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Even if you didn't experiment with AI this week, we'd love to hear from you. You can respond with `/hive` to get started!",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Take Check-in Now 🚀",
            },
            style: "primary",
            action_id: "weekly_checkin_yes",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Not this week",
            },
            action_id: "weekly_checkin_no",
          },
        ],
      },
    ],
  };

  await app.client.chat.postMessage(message);
}

function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek; // Sunday = 0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split("T")[0];
}

// Get all members of a specific channel
async function getChannelMembers(app, channelId) {
  try {
    logger.info(`Fetching members for channel ${channelId}`);

    const result = await app.client.conversations.members({
      channel: channelId,
      limit: 1000, // Slack API limit per call
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    // Filter out bots (user IDs starting with 'B' are usually bots)
    const humanMembers = result.members.filter(userId => !userId.startsWith("B"));

    logger.info(`Found ${humanMembers.length} human members in channel ${channelId}`);
    return humanMembers;
  } catch (error) {
    logger.error(`Error fetching channel members for ${channelId}:`, error);
    throw error;
  }
}

// Schedule reminders for Thursday (3 days after Monday check-in)
cron.schedule(
  "0 14 * * 4",
  async () => {
    logger.info("Starting reminder process...");
    // Note: This would need the app instance to be passed in
    // await sendReminders(app, 3);
  },
  {
    timezone: "UTC",
  }
);

module.exports = {
  setupScheduler,
  triggerWeeklyCheckins,
  sendReminders,
};
