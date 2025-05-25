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
    const store = getStore('conversation-history');
    const historyData = await store.get(conversationId);
    
    const history = historyData ? JSON.parse(historyData) : [];
    
    console.log(`📚 Loading history for ${conversationId}: ${history.length} entries`);
    
    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      history: []
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};