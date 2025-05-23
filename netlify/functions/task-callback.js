import { getStore } from "@netlify/blobs";

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('📥 AirOps callback received:', payload);
    
    // Extract task ID and result from AirOps payload
    const taskId = payload.taskId || payload.task_id || payload.id || payload.requestId;
    const result = payload.result || payload.output || payload.data || payload.content || payload.response;
    
    if (!taskId) {
      console.error('❌ No task ID found in payload');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No task ID found' }) };
    }
    
    // Store in Netlify Blobs
    const taskStore = getStore("airops-tasks");
    await taskStore.setJSON(taskId, {
      status: 'completed',
      result: result || 'Task completed successfully',
      completedAt: new Date().toISOString(),
      originalPayload: payload
    });
    
    console.log(`✅ Stored result for task: ${taskId}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, taskId })
    };

  } catch (error) {
    console.error('❌ Callback error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};// netlify/functions/airops-callback.js
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
}import { getStore } from "@netlify/blobs";

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { taskId } = event.queryStringParameters || {};
  
  if (!taskId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'taskId required' }) };
  }

  try {
    const taskStore = getStore("airops-tasks");
    const result = await taskStore.get(taskId, { type: 'json' });
    
    if (result) {
      console.log(`✅ Found completed task: ${taskId}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'completed',
          data: result.result,
          completedAt: result.completedAt
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'pending', data: null })
      };
    }
  } catch (error) {
    console.error('❌ Error checking task status:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
