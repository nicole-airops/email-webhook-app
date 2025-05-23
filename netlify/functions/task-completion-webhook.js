// netlify/functions/task-completion-webhook.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { taskId, status, result, error } = payload;
    
    if (!taskId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
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

    // Update task with completion data
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
    
    console.log('Task completion webhook processed:', { taskId, status });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        message: `Task ${taskId} marked as ${task.status}` 
      })
    };
  } catch (error) {
    console.error('Error processing task completion webhook:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};