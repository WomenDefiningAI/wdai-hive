const { createClient } = require("@supabase/supabase-js");
const { logger } = require("../utils/logger");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema
const TABLES = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      slack_user_id VARCHAR(50) UNIQUE NOT NULL,
      slack_display_name VARCHAR(100),
      slack_email VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      opt_out BOOLEAN DEFAULT false,
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  weekly_responses: `
    CREATE TABLE IF NOT EXISTS weekly_responses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      slack_user_id VARCHAR(50) NOT NULL,
      week_start_date DATE NOT NULL,
      participated BOOLEAN NOT NULL,
      categories TEXT[],
      tools TEXT[],
      custom_details TEXT,
      custom_tools TEXT[],
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, week_start_date)
    );
  `,

  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      slack_user_id VARCHAR(50),
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  admin_users: `
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      slack_user_id VARCHAR(50) UNIQUE NOT NULL,
      slack_display_name VARCHAR(100),
      permissions JSONB DEFAULT '["read", "export"]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  weekly_schedules: `
    CREATE TABLE IF NOT EXISTS weekly_schedules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      slack_user_id VARCHAR(50) NOT NULL,
      day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
      time_of_day TIME,
      timezone VARCHAR(50) DEFAULT 'UTC',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
};

// Indexes for better performance
const INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_weekly_responses_week_start ON weekly_responses(week_start_date);",
  "CREATE INDEX IF NOT EXISTS idx_weekly_responses_participated ON weekly_responses(participated);",
  "CREATE INDEX IF NOT EXISTS idx_weekly_responses_categories ON weekly_responses USING GIN(categories);",
  "CREATE INDEX IF NOT EXISTS idx_weekly_responses_tools ON weekly_responses USING GIN(tools);",
  "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);",
  "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_users_slack_id ON users(slack_user_id);",
  "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;",
];

// Functions and triggers
const FUNCTIONS = {
  update_updated_at: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `,

  trigger_users_updated_at: `
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  trigger_responses_updated_at: `
    CREATE TRIGGER update_weekly_responses_updated_at 
      BEFORE UPDATE ON weekly_responses 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  trigger_admin_updated_at: `
    CREATE TRIGGER update_admin_users_updated_at 
      BEFORE UPDATE ON admin_users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  trigger_schedules_updated_at: `
    CREATE TRIGGER update_weekly_schedules_updated_at 
      BEFORE UPDATE ON weekly_schedules 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,
};

async function setupDatabase() {
  try {
    logger.info("Setting up database tables...");

    // Create tables
    for (const [tableName, createTableSQL] of Object.entries(TABLES)) {
      const { error } = await supabase.rpc("exec_sql", { sql: createTableSQL });
      if (error) {
        logger.error(`Error creating table ${tableName}:`, error);
        throw error;
      }
      logger.info(`Created table: ${tableName}`);
    }

    // Create indexes
    logger.info("Creating database indexes...");
    for (const indexSQL of INDEXES) {
      const { error } = await supabase.rpc("exec_sql", { sql: indexSQL });
      if (error) {
        logger.warn("Warning creating index:", error);
        // Don't throw error for indexes as they might already exist
      }
    }

    // Create functions and triggers
    logger.info("Setting up database functions and triggers...");
    for (const [functionName, functionSQL] of Object.entries(FUNCTIONS)) {
      const { error } = await supabase.rpc("exec_sql", { sql: functionSQL });
      if (error) {
        logger.warn(`Warning creating function/trigger ${functionName}:`, error);
        // Don't throw error as they might already exist
      }
    }

    logger.info("Database setup completed successfully!");
  } catch (error) {
    logger.error("Database setup failed:", error);
    throw error;
  }
}

// Database utility functions
async function getUserBySlackId(slackUserId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("slack_user_id", slackUserId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    throw error;
  }

  return data;
}

async function createUser(slackUserId, displayName = null, email = null) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      slack_user_id: slackUserId,
      slack_display_name: displayName,
      slack_email: email,
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
    .from("weekly_responses")
    .insert(responseData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getWeeklyResponses(filters = {}) {
  let query = supabase.from("weekly_responses").select(`
      *,
      users(slack_display_name, slack_email)
    `);

  // Apply filters
  if (filters.weekStartDate) {
    query = query.eq("week_start_date", filters.weekStartDate);
  }

  if (filters.participated !== undefined) {
    query = query.eq("participated", filters.participated);
  }

  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }

  if (filters.tool) {
    query = query.contains("tools", [filters.tool]);
  }

  if (filters.slackUserId) {
    query = query.eq("slack_user_id", filters.slackUserId);
  }

  // Add ordering
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

async function logAuditEvent(
  action,
  userId = null,
  slackUserId = null,
  details = {},
  ipAddress = null,
  userAgent = null
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    user_id: userId,
    slack_user_id: slackUserId,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    logger.error("Failed to log audit event:", error);
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
  logAuditEvent,
};
