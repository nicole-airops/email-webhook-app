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
    console.log('🔔 AirOps task completion webhook received:', JSON.stringify(payload, null, 2));
    
    const { taskId, status, result, error, metadata } = payload;
    
    if (!taskId) {
      console.error('❌ Missing taskId in webhook payload');
      return new Response(JSON.stringify({ error: 'taskId is required' }), {
        status: 400,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`📋 Processing completion for task: ${taskId}, status: ${status}`);

    const tasksStore = getStore('tasks');
    const conversationTasksStore = getStore('conversation-tasks');
    
    // 1. Update individual task storage (for status checks)
    const existingTaskData = await tasksStore.get(taskId);
    let individualTask = {};
    
    if (existingTaskData) {
      individualTask = JSON.parse(existingTaskData);
      console.log(`📋 Found existing individual task: ${taskId}`);
    } else {
      console.log(`⚠️ No existing individual task found for: ${taskId}`);
    }

    // Update individual task with completion data
    individualTask.status = status || 'completed';
    individualTask.completedAt = new Date().toISOString();
    
    if (result) {
      individualTask.result = result;
    }
    
    if (error) {
      individualTask.error = error;
      individualTask.status = 'failed';
    }

    // Save updated individual task
    await tasksStore.set(taskId, JSON.stringify(individualTask));
    console.log(`✅ Updated individual task storage for: ${taskId}`);

    // 2. Update conversation-level task storage (critical for UI updates)
    // We need to find which conversation this task belongs to
    const conversationId = metadata?.conversation_id || 
                          individualTask.conversationId ||
                          payload.conversationId;

    if (conversationId) {
      console.log(`📋 Updating conversation tasks for: ${conversationId}`);
      
      try {
        const conversationTasksData = await conversationTasksStore.get(conversationId);
        let conversationTasks = conversationTasksData ? JSON.parse(conversationTasksData) : [];
        
        console.log(`📋 Found ${conversationTasks.length} tasks in conversation storage`);
        
        // Find and update the specific task in the conversation
        const taskIndex = conversationTasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          conversationTasks[taskIndex] = {
            ...conversationTasks[taskIndex],
            status: status || 'completed',
            result: result,
            completedAt: new Date().toISOString(),
            error: error || null
          };
          
          // Save updated conversation tasks
          await conversationTasksStore.set(conversationId, JSON.stringify(conversationTasks));
          console.log(`✅ Updated conversation task storage for: ${conversationId}, task: ${taskId}`);
        } else {
          console.log(`⚠️ Task ${taskId} not found in conversation ${conversationId} storage`);
        }
      } catch (convError) {
        console.error(`❌ Error updating conversation tasks for ${conversationId}:`, convError);
      }
    } else {
      console.log(`⚠️ No conversation ID found for task ${taskId}, cannot update conversation storage`);
    }

    // 3. Optional: Trigger any additional notifications or webhooks here
    console.log(`✅ Task completion webhook processed successfully for: ${taskId}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Task ${taskId} marked as ${individualTask.status}`,
      taskId: taskId,
      status: individualTask.status,
      conversationUpdated: !!conversationId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing task completion webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};