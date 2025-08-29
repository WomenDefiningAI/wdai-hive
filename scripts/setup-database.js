#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    logger.info('Checking database connection...');
    
    // Test the connection by trying to query the users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
    
    logger.info('✅ Database connection successful! Tables are ready.');
    logger.info('📊 Available tables: users, weekly_responses, audit_logs, admin_users, weekly_schedules');
    
  } catch (error) {
    logger.error('Database setup failed:', error);
    throw error;
  }
}

// Database utility functions
async function getUserBySlackId(slackUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }
  
  return data;
}

async function createUser(slackUserId, displayName = null, email = null) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      slack_user_id: slackUserId,
      slack_display_name: displayName,
      slack_email: email
    })
    .select()
    .single();
    
  if (error) {
    throw error;
  }
  
  return data;
}

async function saveWeeklyResponse(responseData) {
  const { data, error } = await supabase
    .from('weekly_responses')
    .insert(responseData)
    .select()
    .single();
    
  if (error) {
    throw error;
  }
  
  return data;
}

async function getWeeklyResponses(filters = {}) {
  let query = supabase
    .from('weekly_responses')
    .select(`
      *,
      users(slack_display_name, slack_email)
    `);
    
  // Apply filters
  if (filters.weekStartDate) {
    query = query.eq('week_start_date', filters.weekStartDate);
  }
  
  if (filters.participated !== undefined) {
    query = query.eq('participated', filters.participated);
  }
  
  if (filters.category) {
    query = query.contains('categories', [filters.category]);
  }
  
  if (filters.tool) {
    query = query.contains('tools', [filters.tool]);
  }
  
  if (filters.slackUserId) {
    query = query.eq('slack_user_id', filters.slackUserId);
  }
  
  // Add ordering
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return data;
}

async function logAuditEvent(action, userId = null, slackUserId = null, details = {}, ipAddress = null, userAgent = null) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      action,
      user_id: userId,
      slack_user_id: slackUserId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
  if (error) {
    logger.error('Failed to log audit event:', error);
    // Don't throw error for audit logging failures
  }
}

module.exports = {
  supabase,
  setupDatabase,
  getUserBySlackId,
  createUser,
  saveWeeklyResponse,
  getWeeklyResponses,
  logAuditEvent
}; 