import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'taskId is required' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    console.log(`📋 Checking status for task: ${taskId}`);
    
    const store = getStore('tasks');
    const taskData = await store.get(taskId);
    
    if (!taskData) {
      console.log(`❌ Task not found: ${taskId}`);
      return new Response(JSON.stringify({ 
        error: 'Task not found',
        taskId: taskId 
      }), {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const task = JSON.parse(taskData);
    const status = task.status || 'pending';
    
    console.log(`📋 Task ${taskId} status: ${status}`);
    
    // Return comprehensive task status
    const response = {
      taskId: taskId,
      status: status,
      data: task.result || null,
      completedAt: task.completedAt || null,
      createdAt: task.createdAt || null,
      error: task.error || null,
      // Additional metadata that might be useful
      metadata: {
        user: task.user || null,
        outputFormat: task.outputFormat || null,
        hasFile: task.hasFile || false,
        fileName: task.fileName || null
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error(`❌ Error fetching task status for ${taskId}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      taskId: taskId,
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};