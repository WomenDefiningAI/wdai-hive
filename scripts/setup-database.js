#!/usr/bin/env node

require('dotenv').config();
const { setupDatabase, logger } = require('../src/database/setup');

async function main() {
  try {
    console.log('🚀 Setting up WDAI Hive database...');
    
    await setupDatabase();
    
    console.log('✅ Database setup completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - weekly_responses');
    console.log('   - audit_logs');
    console.log('   - admin_users');
    console.log('   - weekly_schedules');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Configure your Slack app with the required permissions');
    console.log('   2. Set up your environment variables');
    console.log('   3. Start the application with: npm start');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 