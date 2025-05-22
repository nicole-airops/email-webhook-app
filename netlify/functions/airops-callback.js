// netlify/functions/airops-callback.js
// This function receives completed task results from AirOps workflows

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { taskId, status, result, metadata } = payload;
    
    if (!taskId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'taskId is required' })
      };
    }

    // Store the completed task result
    await storeTaskResult(taskId, {
      status,
      result,
      metadata,
      completedAt: new Date().toISOString()
    });

    console.log(`Task ${taskId} completed with status: ${status}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Task result stored successfully',
        taskId 
      })
    };

  } catch (error) {
    console.error('Error processing AirOps callback:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Mock function - replace with your actual storage implementation
async function storeTaskResult(taskId, taskData) {
  // TODO: Implement your storage solution here
  console.log('Storing task result:', { taskId, taskData });
}
