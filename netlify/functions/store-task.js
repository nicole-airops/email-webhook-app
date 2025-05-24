// netlify/functions/store-task.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust for production if needed
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
    const { taskId, task } = JSON.parse(event.body);

    if (!taskId || !task || typeof task !== 'object') {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'taskId and task data object are required' })
      };
    }

    const taskToStore = {
      id: taskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...task
    };

    console.log(`💾 Storing initial task: ${taskId}`, taskToStore);

    const store = getStore('tasks');
    await store.set(taskId, JSON.stringify(taskToStore));

    console.log(`✅ Task ${taskId} stored successfully.`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true, taskId: taskId, storedTask: taskToStore })
    };
  } catch (error) {
    console.error('💥 Error storing task:', error.message, error.stack);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};