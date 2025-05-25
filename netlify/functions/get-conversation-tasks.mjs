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
  const conversationId = url.searchParams.get('conversationId');
  
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'conversationId is required' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const store = getStore('conversation-tasks');
    const tasksData = await store.get(conversationId);
    
    const tasks = tasksData ? JSON.parse(tasksData) : [];
    
    console.log(`📋 Loading tasks for conversation ${conversationId}: ${tasks.length} tasks found`);
    
    return new Response(JSON.stringify({ tasks }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error loading conversation tasks:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      tasks: []
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};