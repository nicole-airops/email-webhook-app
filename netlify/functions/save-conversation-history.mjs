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
    const { conversationId, entry } = await request.json();
    
    if (!conversationId || !entry) {
      return new Response(JSON.stringify({ error: 'conversationId and entry are required' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const store = getStore('conversation-history');
    
    // Get existing history
    const existingData = await store.get(conversationId);
    const history = existingData ? JSON.parse(existingData) : [];
    
    // Add new entry at the beginning
    history.unshift(entry);
    
    // Keep only last 50 entries
    const limitedHistory = history.slice(0, 50);
    
    // Save updated history
    await store.set(conversationId, JSON.stringify(limitedHistory));
    
    console.log('Conversation history saved:', conversationId);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error saving conversation history:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};