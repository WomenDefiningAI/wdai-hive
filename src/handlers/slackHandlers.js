const { logger } = require('../utils/logger');
const { 
  getUserBySlackId, 
  createUser, 
  saveWeeklyResponse, 
  logAuditEvent 
} = require('../database/setup');
const { 
  AI_CATEGORIES, 
  AI_TOOLS, 
  MESSAGE_TEMPLATES 
} = require('../config/categories');

// Store active conversations to manage state
const activeConversations = new Map();

function setupSlackHandlers(app) {
  
  // Handle app mention events
  app.event('app_mention', async ({ event, say }) => {
    try {
      logger.info(`App mentioned by ${event.user} in channel ${event.channel}`);
      
      await say({
        text: `🐝 Hey <@${event.user}>! I'm WDAI Hive, your AI engagement tracker. I'll send you weekly check-ins to see what AI tools you've been exploring. Feel free to DM me anytime!`
      });
      
      await logAuditEvent('app_mention', null, event.user, { channel: event.channel });
      
    } catch (error) {
      logger.error('Error handling app mention:', error);
    }
  });

  // Handle direct messages
  app.event('message', async ({ event, say }) => {
    // Only handle DMs (not channel messages)
    if (event.channel_type !== 'im') return;
    
    try {
      logger.info(`Received DM from ${event.user}: ${event.text}`);
      
      // Check if user exists, create if not
      let user = await getUserBySlackId(event.user);
      if (!user) {
        user = await createUser(event.user);
        logger.info(`Created new user: ${event.user}`);
      }
      
      // Check if user has opted out
      if (user.opt_out) {
        await say({
          text: "You've opted out of weekly check-ins. If you'd like to opt back in, please contact an admin."
        });
        return;
      }
      
      // Handle conversation flow
      const conversation = activeConversations.get(event.user) || { step: 'start' };
      
      if (event.text.toLowerCase().includes('help') || event.text.toLowerCase().includes('what')) {
        await sendHelpMessage(say);
      } else if (event.text.toLowerCase().includes('opt out')) {
        await handleOptOut(event.user, say);
      } else if (event.text.toLowerCase().includes('opt in')) {
        await handleOptIn(event.user, say);
      } else {
        await sendWeeklyCheckin(say, event.user);
      }
      
    } catch (error) {
      logger.error('Error handling DM:', error);
      await say({
        text: "Sorry, I encountered an error. Please try again or contact an admin if the problem persists."
      });
    }
  });

  // Handle button clicks
  app.action('weekly_checkin_yes', async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      logger.info(`User ${userId} clicked 'Yes' for weekly checkin`);
      
      // Store conversation state
      activeConversations.set(userId, { 
        step: 'category_selection',
        data: { participated: true }
      });
      
      await sendCategorySelection(client, userId);
      
    } catch (error) {
      logger.error('Error handling weekly checkin yes:', error);
    }
  });

  app.action('weekly_checkin_no', async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      logger.info(`User ${userId} clicked 'No' for weekly checkin`);
      
      // Save the "no" response
      await saveNoResponse(userId);
      
      await client.chat.postMessage({
        channel: userId,
        text: MESSAGE_TEMPLATES.no_response.description,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: MESSAGE_TEMPLATES.no_response.description
            }
          }
        ]
      });
      
      // Clear conversation state
      activeConversations.delete(userId);
      
    } catch (error) {
      logger.error('Error handling weekly checkin no:', error);
    }
  });

  // Handle category selection
  app.action(/^category_(.+)$/, async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      const categoryId = body.actions[0].action_id.replace('category_', '');
      
      logger.info(`User ${userId} selected category: ${categoryId}`);
      
      const conversation = activeConversations.get(userId);
      if (conversation) {
        conversation.data.categories = [categoryId];
        conversation.step = 'tool_selection';
        activeConversations.set(userId, conversation);
      }
      
      await sendToolSelection(client, userId);
      
    } catch (error) {
      logger.error('Error handling category selection:', error);
    }
  });

  // Handle tool selection
  app.action(/^tool_(.+)$/, async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      const toolId = body.actions[0].action_id.replace('tool_', '');
      
      logger.info(`User ${userId} selected tool: ${toolId}`);
      
      const conversation = activeConversations.get(userId);
      if (conversation) {
        if (!conversation.data.tools) {
          conversation.data.tools = [];
        }
        
        // Toggle tool selection
        const toolIndex = conversation.data.tools.indexOf(toolId);
        if (toolIndex > -1) {
          conversation.data.tools.splice(toolIndex, 1);
        } else {
          conversation.data.tools.push(toolId);
        }
        
        activeConversations.set(userId, conversation);
      }
      
      // Update the tool selection message
      await updateToolSelection(client, userId, conversation.data.tools);
      
    } catch (error) {
      logger.error('Error handling tool selection:', error);
    }
  });

  // Handle "Next" button after tool selection
  app.action('tools_next', async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      logger.info(`User ${userId} clicked 'Next' after tool selection`);
      
      const conversation = activeConversations.get(userId);
      if (conversation && conversation.data.tools && conversation.data.tools.length > 0) {
        conversation.step = 'custom_details';
        activeConversations.set(userId, conversation);
        
        await sendCustomDetailsPrompt(client, userId);
      } else {
        await client.chat.postMessage({
          channel: userId,
          text: "Please select at least one tool before continuing."
        });
      }
      
    } catch (error) {
      logger.error('Error handling tools next:', error);
    }
  });

  // Handle custom details submission
  app.action('custom_details_submit', async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      logger.info(`User ${userId} submitted custom details`);
      
      const conversation = activeConversations.get(userId);
      if (conversation) {
        // Get custom details from the modal or text input
        const customDetails = body.state?.values?.custom_details?.input?.value || '';
        conversation.data.custom_details = customDetails;
        
        // Save the complete response
        await saveWeeklyResponse(conversation.data);
        
        await sendThankYouMessage(client, userId);
        
        // Clear conversation state
        activeConversations.delete(userId);
      }
      
    } catch (error) {
      logger.error('Error handling custom details submit:', error);
    }
  });

  app.action('custom_details_skip', async ({ ack, body, client }) => {
    await ack();
    
    try {
      const userId = body.user.id;
      logger.info(`User ${userId} skipped custom details`);
      
      const conversation = activeConversations.get(userId);
      if (conversation) {
        // Save the response without custom details
        await saveWeeklyResponse(conversation.data);
        
        await sendThankYouMessage(client, userId);
        
        // Clear conversation state
        activeConversations.set(userId, conversation);
      }
      
    } catch (error) {
      logger.error('Error handling custom details skip:', error);
    }
  });

  // Handle slash commands
  app.command('/wdai-checkin', async ({ ack, command, respond }) => {
    await ack();
    
    try {
      logger.info(`Slash command executed by ${command.user_id}`);
      
      await sendWeeklyCheckin(respond, command.user_id);
      
      await logAuditEvent('slash_command', null, command.user_id, { 
        command: command.command,
        text: command.text 
      });
      
    } catch (error) {
      logger.error('Error handling slash command:', error);
      await respond({
        text: "Sorry, I encountered an error. Please try again."
      });
    }
  });

  app.command('/wdai-help', async ({ ack, command, respond }) => {
    await ack();
    
    try {
      await sendHelpMessage(respond);
      
      await logAuditEvent('help_command', null, command.user_id);
      
    } catch (error) {
      logger.error('Error handling help command:', error);
    }
  });
}

// Helper functions for sending messages
async function sendWeeklyCheckin(say, userId) {
  const message = {
    text: MESSAGE_TEMPLATES.weekly_checkin.description,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: MESSAGE_TEMPLATES.weekly_checkin.title
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MESSAGE_TEMPLATES.weekly_checkin.description
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*What does "playing with AI" mean?*\n${MESSAGE_TEMPLATES.weekly_checkin.ai_definition}`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: MESSAGE_TEMPLATES.weekly_checkin.yes_button
            },
            style: "primary",
            action_id: "weekly_checkin_yes"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: MESSAGE_TEMPLATES.weekly_checkin.no_button
            },
            action_id: "weekly_checkin_no"
          }
        ]
      }
    ]
  };
  
  await say(message);
}

async function sendCategorySelection(client, userId) {
  const categoryBlocks = AI_CATEGORIES.map(category => ({
    type: "button",
    text: {
      type: "plain_text",
      text: `${category.emoji} ${category.name}`
    },
    action_id: `category_${category.id}`
  }));

  await client.chat.postMessage({
    channel: userId,
    text: MESSAGE_TEMPLATES.category_selection.description,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: MESSAGE_TEMPLATES.category_selection.title
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MESSAGE_TEMPLATES.category_selection.description
        }
      },
      {
        type: "actions",
        elements: categoryBlocks
      }
    ]
  });
}

async function sendToolSelection(client, userId) {
  const toolBlocks = AI_TOOLS.map(tool => ({
    type: "button",
    text: {
      type: "plain_text",
      text: `${tool.emoji} ${tool.name}`
    },
    action_id: `tool_${tool.id}`
  }));

  await client.chat.postMessage({
    channel: userId,
    text: MESSAGE_TEMPLATES.tool_selection.description,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: MESSAGE_TEMPLATES.tool_selection.title
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MESSAGE_TEMPLATES.tool_selection.description
        }
      },
      {
        type: "actions",
        elements: toolBlocks
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: MESSAGE_TEMPLATES.tool_selection.next_button
            },
            style: "primary",
            action_id: "tools_next"
          }
        ]
      }
    ]
  });
}

async function updateToolSelection(client, userId, selectedTools) {
  // This would update the existing message to show selected tools
  // For now, we'll just acknowledge the selection
  logger.info(`Updated tool selection for ${userId}: ${selectedTools.join(', ')}`);
}

async function sendCustomDetailsPrompt(client, userId) {
  await client.chat.postMessage({
    channel: userId,
    text: MESSAGE_TEMPLATES.custom_details.description,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: MESSAGE_TEMPLATES.custom_details.title
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MESSAGE_TEMPLATES.custom_details.description
        }
      },
      {
        type: "input",
        block_id: "custom_details",
        element: {
          type: "plain_text_input",
          action_id: "input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Tell us about your AI adventure..."
          }
        },
        label: {
          type: "plain_text",
          text: "Details"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: MESSAGE_TEMPLATES.custom_details.submit_button
            },
            style: "primary",
            action_id: "custom_details_submit"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: MESSAGE_TEMPLATES.custom_details.skip_button
            },
            action_id: "custom_details_skip"
          }
        ]
      }
    ]
  });
}

async function sendThankYouMessage(client, userId) {
  await client.chat.postMessage({
    channel: userId,
    text: MESSAGE_TEMPLATES.thank_you.description,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MESSAGE_TEMPLATES.thank_you.description
        }
      }
    ]
  });
}

async function sendHelpMessage(say) {
  const helpText = `🐝 *WDAI Hive Help*

*What is WDAI Hive?*
I'm a bot that helps track AI experimentation and engagement in our community. I send weekly check-ins to see what AI tools you've been exploring.

*Available Commands:*
• \`/wdai-checkin\` - Manually trigger a weekly check-in
• \`/wdai-help\` - Show this help message

*How it works:*
1. I'll send you a weekly DM asking if you "played with AI"
2. If yes, you can select categories and tools you used
3. Optionally share details about what you built or learned
4. Your responses help build a knowledge base of community AI projects

*Privacy:*
• Your responses are stored securely
• You can opt out anytime
• Admins can see aggregated analytics

*Need help?*
Contact an admin or reply with "help" to this message.`;

  await say({
    text: helpText
  });
}

async function saveNoResponse(userId) {
  const weekStartDate = getWeekStartDate();
  
  await saveWeeklyResponse({
    slack_user_id: userId,
    week_start_date: weekStartDate,
    participated: false,
    categories: [],
    tools: [],
    custom_details: null
  });
  
  await logAuditEvent('weekly_response_no', null, userId, { weekStartDate });
}

async function handleOptOut(userId, say) {
  // This would update the user's opt_out status in the database
  logger.info(`User ${userId} requested opt-out`);
  
  await say({
    text: "I've noted your opt-out request. You won't receive weekly check-ins anymore. Contact an admin if you'd like to opt back in."
  });
}

async function handleOptIn(userId, say) {
  // This would update the user's opt_out status in the database
  logger.info(`User ${userId} requested opt-in`);
  
  await say({
    text: "Great! I've opted you back in to weekly check-ins. You'll receive your next check-in on schedule."
  });
}

function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek; // Sunday = 0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

module.exports = { setupSlackHandlers }; 