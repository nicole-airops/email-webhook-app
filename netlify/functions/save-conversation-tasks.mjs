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
    const { conversationId, tasks } = await request.json();
    
    if (!conversationId || !Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: 'conversationId and tasks array are required' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const store = getStore('conversation-tasks');
    
    // Keep only last 50 tasks
    const limitedTasks = tasks.slice(0, 50);
    
    // Save tasks
    await store.set(conversationId, JSON.stringify(limitedTasks));
    
    console.log(`💾 Saved ${limitedTasks.length} tasks for conversation ${conversationId}`);
    
    return new Response(JSON.stringify({ success: true, count: limitedTasks.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error saving conversation tasks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};