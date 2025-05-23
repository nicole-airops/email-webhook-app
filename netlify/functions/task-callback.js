const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { taskId, status, result, error } = payload;
    
    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'taskId is required' })
      };
    }

    const store = getStore('tasks');
    
    // Get existing task data
    const existingTaskData = await store.get(taskId);
    let task = {};
    
    if (existingTaskData) {
      task = JSON.parse(existingTaskData);
    }

    // Update task with callback data
    task.status = status || 'completed';
    task.completedAt = new Date().toISOString();
    
    if (result) {
      task.result = result;
    }
    
    if (error) {
      task.error = error;
      task.status = 'failed';
    }

    // Save updated task
    await store.set(taskId, JSON.stringify(task));
    
    console.log('Task callback processed:', { taskId, status });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error processing task callback:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};