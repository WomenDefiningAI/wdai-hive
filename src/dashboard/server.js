const path = require('path');
const express = require('express');
const { logger } = require('../utils/logger');
const { getWeeklyResponses, logAuditEvent, supabase } = require('../database/setup');

function setupDashboard(app) {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, '../../dashboard/build')));

  // API Routes
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      // Get dashboard statistics
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  app.get('/api/responses', async (req, res) => {
    try {
      const { page = 1, limit = 20, category, tool, participated } = req.query;
      
      const filters = {};
      if (category) filters.category = category;
      if (tool) filters.tool = tool;
      if (participated !== undefined) filters.participated = participated === 'true';
      
      const responses = await getWeeklyResponses(filters);
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedResponses = responses.slice(startIndex, endIndex);
      
      res.json({
        responses: paginatedResponses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: responses.length,
          totalPages: Math.ceil(responses.length / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching responses:', error);
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  app.get('/api/analytics/categories', async (req, res) => {
    try {
      const categoryStats = await getCategoryAnalytics();
      res.json(categoryStats);
    } catch (error) {
      logger.error('Error fetching category analytics:', error);
      res.status(500).json({ error: 'Failed to fetch category analytics' });
    }
  });

  app.get('/api/analytics/tools', async (req, res) => {
    try {
      const toolStats = await getToolAnalytics();
      res.json(toolStats);
    } catch (error) {
      logger.error('Error fetching tool analytics:', error);
      res.status(500).json({ error: 'Failed to fetch tool analytics' });
    }
  });

  app.get('/api/analytics/participation', async (req, res) => {
    try {
      const participationStats = await getParticipationAnalytics();
      res.json(participationStats);
    } catch (error) {
      logger.error('Error fetching participation analytics:', error);
      res.status(500).json({ error: 'Failed to fetch participation analytics' });
    }
  });

  app.post('/api/export/csv', async (req, res) => {
    try {
      const { filters = {} } = req.body;
      
      // Log export event
      await logAuditEvent('data_export', null, req.ip, {
        filters,
        userAgent: req.get('User-Agent')
      });
      
      const responses = await getWeeklyResponses(filters);
      const csvData = generateCSV(responses);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=wdai-hive-responses.csv');
      res.send(csvData);
      
    } catch (error) {
      logger.error('Error exporting CSV:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // Catch all handler - serve React app for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dashboard/build/index.html'));
  });
}

async function getDashboardStats() {
  try {
    // Get total users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, is_active, opt_out');
    
    if (usersError) throw usersError;
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active && !u.opt_out).length;
    
    // Get this week's responses
    const weekStartDate = getWeekStartDate();
    const thisWeekResponses = await getWeeklyResponses({ weekStartDate });
    
    // Get participation rate
    const participationRate = totalUsers > 0 ? thisWeekResponses.length / totalUsers : 0;
    
    // Get top categories
    const categoryStats = await getCategoryAnalytics();
    const topCategories = categoryStats.slice(0, 5);
    
    // Get top tools
    const toolStats = await getToolAnalytics();
    const topTools = toolStats.slice(0, 5);
    
    // Get recent responses
    const recentResponses = await getWeeklyResponses({});
    const recent = recentResponses.slice(0, 10);
    
    return {
      totalUsers,
      activeUsers,
      participationRate,
      totalResponses: recentResponses.length,
      thisWeekResponses: thisWeekResponses.length,
      topCategories,
      topTools,
      recentResponses: recent
    };
    
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    throw error;
  }
}

async function getCategoryAnalytics() {
  try {
    const { data: responses, error } = await supabase
      .from('weekly_responses')
      .select('categories')
      .eq('participated', true);
    
    if (error) throw error;
    
    const categoryCounts = {};
    responses.forEach(response => {
      if (response.categories) {
        response.categories.forEach(category => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      }
    });
    
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
      
  } catch (error) {
    logger.error('Error getting category analytics:', error);
    throw error;
  }
}

async function getToolAnalytics() {
  try {
    const { data: responses, error } = await supabase
      .from('weekly_responses')
      .select('tools')
      .eq('participated', true);
    
    if (error) throw error;
    
    const toolCounts = {};
    responses.forEach(response => {
      if (response.tools) {
        response.tools.forEach(tool => {
          toolCounts[tool] = (toolCounts[tool] || 0) + 1;
        });
      }
    });
    
    return Object.entries(toolCounts)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count);
      
  } catch (error) {
    logger.error('Error getting tool analytics:', error);
    throw error;
  }
}

async function getParticipationAnalytics() {
  try {
    // Get weekly participation over time
    const { data: responses, error } = await supabase
      .from('weekly_responses')
      .select('week_start_date, participated')
      .order('week_start_date', { ascending: true });
    
    if (error) throw error;
    
    const weeklyStats = {};
    responses.forEach(response => {
      const week = response.week_start_date;
      if (!weeklyStats[week]) {
        weeklyStats[week] = { total: 0, participated: 0 };
      }
      weeklyStats[week].total++;
      if (response.participated) {
        weeklyStats[week].participated++;
      }
    });
    
    return Object.entries(weeklyStats).map(([week, stats]) => ({
      week,
      total: stats.total,
      participated: stats.participated,
      rate: stats.total > 0 ? stats.participated / stats.total : 0
    }));
    
  } catch (error) {
    logger.error('Error getting participation analytics:', error);
    throw error;
  }
}

function generateCSV(responses) {
  const headers = [
    'User ID',
    'Display Name',
    'Week Start Date',
    'Participated',
    'Categories',
    'Tools',
    'Custom Details',
    'Created At'
  ];
  
  const rows = responses.map(response => [
    response.slack_user_id,
    response.users?.slack_display_name || '',
    response.week_start_date,
    response.participated ? 'Yes' : 'No',
    response.categories?.join(', ') || '',
    response.tools?.join(', ') || '',
    response.custom_details || '',
    response.created_at
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

module.exports = { setupDashboard }; 