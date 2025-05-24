// netlify/functions/save-conversation-history.js
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
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { conversationId, entry } = JSON.parse(event.body);
    
    if (!conversationId || !entry) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'conversationId and entry are required' })
      };
    }

    console.log(`💾 Saving history entry for conversation: ${conversationId}`);
    
    const store = getStore('conversation-history');
    
    // Get existing history
    let history = [];
    try {
      const existingData = await store.get(conversationId);
      if (existingData) {
        history = JSON.parse(existingData);
      }
    } catch (getError) {
      console.log('📝 No existing history found, creating new');
    }

    // Add new entry to the beginning (most recent first)
    history.unshift(entry);
    
    // Keep only the last 50 entries to prevent unlimited growth
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    // Save updated history
    await store.set(conversationId, JSON.stringify(history));
    
    console.log(`✅ History saved for conversation: ${conversationId} (${history.length} total entries)`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        totalEntries: history.length 
      })
    };
  } catch (error) {
    console.error('💥 Error saving conversation history:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};