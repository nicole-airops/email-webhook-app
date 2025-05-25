import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const payload = await request.json();
    const { taskId, status, result, error } = payload;
    
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'taskId is required' }), {
        status: 400,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
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
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Task ${taskId} marked as ${task.status}` 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error processing task completion webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};