// netlify/functions/task-completion-webhook.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Handle CORS preflight
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
    console.log('📥 Webhook received:', JSON.stringify(payload, null, 2));
    
    // Extract task ID from the payload - handle different possible formats
    let taskId = payload.taskId || payload.task_id;
    
    // If taskId starts with a dot, remove it (from your workflow: ".{{webhook_payload.airops_request.request_info.task_id}}")
    if (taskId && taskId.startsWith('.')) {
      taskId = taskId.substring(1);
    }
    
    const { status, result, error } = payload;
    
    if (!taskId) {
      console.error('❌ No taskId found in payload:', payload);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'taskId is required' })
      };
    }

    console.log(`🔍 Processing task: ${taskId} with status: ${status}`);

    const store = getStore('tasks');
    
    // Get existing task data
    let task = {};
    try {
      const existingTaskData = await store.get(taskId);
      if (existingTaskData) {
        task = JSON.parse(existingTaskData);
        console.log('📋 Found existing task:', task);
      }
    } catch (getError) {
      console.log('ℹ️ No existing task found, creating new one');
    }

    // Update task with completion data
    task.status = status || 'completed';
    task.completedAt = new Date().toISOString();
    
    if (result) {
      task.result = result;
      console.log('📝 Task result saved (length:', result.length, 'chars)');
    }
    
    if (error) {
      task.error = error;
      task.status = 'failed';
      console.log('❌ Task failed with error:', error);
    }

    // Save updated task
    await store.set(taskId, JSON.stringify(task));
    console.log('💾 Task updated in storage');
    
    // Optional: Trigger any additional notifications here
    // You could implement Server-Sent Events or WebSocket notifications
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        message: `Task ${taskId} marked as ${task.status}`,
        taskId: taskId,
        status: task.status
      })
    };
  } catch (error) {
    console.error('💥 Error processing task completion webhook:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};