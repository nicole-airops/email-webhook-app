import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) {
      return new Response('Task ID required', { status: 400 });
    }
    
    const store = getStore('airops-tasks');
    const task = await store.get(taskId, { type: 'json' });
    
    if (!task) {
      return new Response('Task not found', { status: 404 });
    }
    
    return new Response(JSON.stringify({
      status: task.status,
      data: task.result || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error checking task status:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

export const config = {
  path: "/api/task-status"
};