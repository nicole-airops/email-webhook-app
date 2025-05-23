import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { taskId, result, status } = await request.json();
    
    const store = getStore('airops-tasks');
    const existingTask = await store.get(taskId, { type: 'json' });
    
    if (!existingTask) {
      return new Response('Task not found', { status: 404 });
    }
    
    const updatedTask = {
      ...existingTask,
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString()
    };
    
    await store.setJSON(taskId, updatedTask);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error handling task callback:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

export const config = {
  path: "/api/task-callback"
};