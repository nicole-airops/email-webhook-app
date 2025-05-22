// netlify/functions/task-status.js
// This function handles polling requests from your plugin to check task completion status

exports.handler = async (event, context) => {
  // Enable CORS for your plugin domain
  const headers = {
    'Access-Control-Allow-Origin': '*', // In production, replace with your actual domain
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { taskId } = event.queryStringParameters || {};
    
    if (!taskId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'taskId is required' })
      };
    }

    // TODO: Replace this with your actual task storage mechanism
    const taskStatus = await checkTaskStatus(taskId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(taskStatus)
    };

  } catch (error) {
    console.error('Error checking task status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Mock function - replace with your actual implementation
async function checkTaskStatus(taskId) {
  // Mock response - replace with actual logic
  const mockTasks = {
    'task_example_1': {
      status: 'completed',
      data: '<h2>Business Case Analysis</h2><p>Based on the conversation context, here is your requested business case...</p><ul><li>Key benefit 1</li><li>Key benefit 2</li></ul>'
    },
    'task_example_2': {
      status: 'pending',
      data: null
    }
  };

  return mockTasks[taskId] || { status: 'not_found', data: null };
}


