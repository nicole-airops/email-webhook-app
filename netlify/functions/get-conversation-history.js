// netlify/functions/get-conversation-history.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { conversationId } = event.queryStringParameters || {};
  
  if (!conversationId) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'conversationId is required' })
    };
  }

  try {
    console.log(`🔍 Loading history for conversation: ${conversationId}`);
    
    const store = getStore('conversation-history');
    const historyData = await store.get(conversationId);
    
    if (!historyData) {
      console.log(`📝 No history found for conversation: ${conversationId}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ history: [] })
      };
    }

    const history = JSON.parse(historyData);
    console.log(`✅ Found ${history.length} history entries for conversation: ${conversationId}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ history })
    };
  } catch (error) {
    console.error('💥 Error loading conversation history:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};