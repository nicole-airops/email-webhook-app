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
    const { conversationId, entry, history, clearAll } = await request.json();
    
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId is required' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const store = getStore('conversation-history');
    
    // ✅ FIXED: Handle clearing all history (multiple ways)
    if (clearAll || (history && Array.isArray(history) && history.length === 0)) {
      console.log(`🗑️ Clearing all history for conversation ${conversationId}`);
      await store.set(conversationId, JSON.stringify([]));
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'History cleared',
        count: 0 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // ✅ ENHANCED: Handle setting complete history array (for clearing or bulk updates)
    if (history && Array.isArray(history)) {
      console.log(`📚 Setting complete history for conversation ${conversationId}: ${history.length} entries`);
      
      // If it's an empty array, we're clearing
      if (history.length === 0) {
        await store.set(conversationId, JSON.stringify([]));
        console.log(`✅ History cleared for conversation ${conversationId}`);
      } else {
        // Otherwise, save the provided history (limit to 50 entries)
        const limitedHistory = history.slice(0, 50);
        await store.set(conversationId, JSON.stringify(limitedHistory));
        console.log(`✅ History updated for conversation ${conversationId}: ${limitedHistory.length} entries`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        count: history.length,
        message: history.length === 0 ? 'History cleared' : 'History updated'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Handle adding single entry (original functionality)
    if (entry) {
      console.log(`📚 Adding history entry for conversation ${conversationId}`);
      
      // Get existing history
      const existingData = await store.get(conversationId);
      const currentHistory = existingData ? JSON.parse(existingData) : [];
      
      // Add new entry at the beginning
      currentHistory.unshift(entry);
      
      // Keep only last 50 entries
      const limitedHistory = currentHistory.slice(0, 50);
      
      // Save updated history
      await store.set(conversationId, JSON.stringify(limitedHistory));
      
      console.log(`✅ History entry saved. Total entries: ${limitedHistory.length}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        count: limitedHistory.length 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // If we get here, no valid operation was specified
    return new Response(JSON.stringify({ error: 'No valid operation specified' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error processing conversation history:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
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