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
    
    // Handle different payload structures from AirOps
    const taskId = payload.taskId || payload.task_id || payload.request_info?.task_id;
    const status = payload.status || 'completed';
    const result = payload.result || payload.output || payload.data;
    const error = payload.error;
    const conversationId = payload.conversationId || 
                          payload.conversation_id ||
                          payload.metadata?.conversation_id ||
                          payload.airops_request?.front_conversation?.conversation?.id;
    
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

    console.log(`📋 Processing completion for task: ${taskId}, status: ${status}, conversation: ${conversationId}`);

    const tasksStore = getStore('tasks');
    const conversationTasksStore = getStore('conversation-tasks');
    const historyStore = getStore('conversation-history');
    
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
    individualTask.status = status;
    individualTask.completedAt = new Date().toISOString();
    individualTask.conversationId = conversationId || individualTask.conversationId;
    
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

    // 2. Update conversation-level task storage
    const finalConversationId = conversationId || individualTask.conversationId;
    
    if (finalConversationId) {
      console.log(`📋 Updating conversation tasks and history for: ${finalConversationId}`);
      
      try {
        // Update conversation tasks
        const conversationTasksData = await conversationTasksStore.get(finalConversationId);
        let conversationTasks = conversationTasksData ? JSON.parse(conversationTasksData) : [];
        
        console.log(`📋 Found ${conversationTasks.length} tasks in conversation storage`);
        
        // Find and update the specific task in the conversation
        const taskIndex = conversationTasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          conversationTasks[taskIndex] = {
            ...conversationTasks[taskIndex],
            status: individualTask.status,
            result: result,
            completedAt: individualTask.completedAt,
            error: error || null
          };
          
          // Save updated conversation tasks
          await conversationTasksStore.set(finalConversationId, JSON.stringify(conversationTasks));
          console.log(`✅ Updated conversation task storage for: ${finalConversationId}, task: ${taskId}`);
          
          // 3. ✅ NEW: Save completed task result to conversation history
          if (result && status === 'completed') {
            try {
              const historyData = await historyStore.get(finalConversationId);
              const currentHistory = historyData ? JSON.parse(historyData) : [];
              
              // Create history entry for completed task
              const historyEntry = {
                text: `Task completed: ${individualTask.comment || 'Task'}`,
                result: result,
                mode: 'task_completion',
                taskId: taskId,
                outputFormat: individualTask.outputFormat || 'General Task',
                selectedFormat: individualTask.selectedFormat,
                hasFile: individualTask.hasFile || false,
                fileName: individualTask.fileName,
                status: 'completed',
                timestamp: individualTask.completedAt,
                user: individualTask.user || 'System',
                isTaskCompletion: true // Flag to identify this as a task completion
              };
              
              // Add to history at the beginning
              currentHistory.unshift(historyEntry);
              
              // Keep only last 50 entries
              const limitedHistory = currentHistory.slice(0, 50);
              
              // Save updated history
              await historyStore.set(finalConversationId, JSON.stringify(limitedHistory));
              
              console.log(`✅ Added task completion to history for conversation: ${finalConversationId}`);
            } catch (historyError) {
              console.error(`❌ Error saving task completion to history:`, historyError);
            }
          }
          
        } else {
          console.log(`⚠️ Task ${taskId} not found in conversation ${finalConversationId} storage`);
        }
      } catch (convError) {
        console.error(`❌ Error updating conversation tasks for ${finalConversationId}:`, convError);
      }
    } else {
      console.log(`⚠️ No conversation ID found for task ${taskId}, cannot update conversation storage or history`);
    }

    console.log(`✅ Task completion webhook processed successfully for: ${taskId}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Task ${taskId} marked as ${individualTask.status}`,
      taskId: taskId,
      status: individualTask.status,
      conversationUpdated: !!finalConversationId,
      historySaved: !!(finalConversationId && result && status === 'completed')
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