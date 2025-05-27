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
    console.log('🔔 AIROPS WEBHOOK: Full payload received:', JSON.stringify(payload, null, 2));
    
    // ✅ ENHANCED: Multiple strategies to extract task ID
    const taskId = payload.taskId || 
                   payload.task_id || 
                   payload.request_info?.task_id ||
                   payload.metadata?.task_id;
    
    console.log('🔍 AIROPS WEBHOOK: Task ID extraction attempts:');
    console.log('- payload.taskId:', payload.taskId);
    console.log('- payload.task_id:', payload.task_id);
    console.log('- payload.request_info?.task_id:', payload.request_info?.task_id);
    console.log('- payload.metadata?.task_id:', payload.metadata?.task_id);
    console.log('- Final taskId:', taskId);
    
    // ✅ ENHANCED: Multiple strategies to extract conversation ID
    const conversationId = payload.conversationId || 
                          payload.conversation_id ||
                          payload.metadata?.conversation_id ||
                          payload.request_info?.conversation_id ||
                          payload.airops_request?.front_conversation?.conversation?.id;
    
    console.log('🔍 AIROPS WEBHOOK: Conversation ID extraction attempts:');
    console.log('- payload.conversationId:', payload.conversationId);
    console.log('- payload.conversation_id:', payload.conversation_id);
    console.log('- payload.metadata?.conversation_id:', payload.metadata?.conversation_id);
    console.log('- payload.request_info?.conversation_id:', payload.request_info?.conversation_id);
    console.log('- Final conversationId:', conversationId);
    
    // ✅ Fixed (checks where AirOps actually puts it)
const taskName = 
  payload.metadata?.task_name ||    // ⭐ AirOps step_161 puts it here
  payload.metadata?.taskName ||     // ⭐ Alternative format
  payload.taskName ||               // Fallback
  payload.task_name ||              // Fallback
  null;
    
    console.log('🔍 AIROPS WEBHOOK: Task name extraction attempts:');
    console.log('- payload.metadata?.task_name:', payload.metadata?.task_name);
    console.log('- payload.task_name:', payload.task_name);
    console.log('- payload.originalPayload?.metadata?.task_name:', payload.originalPayload?.metadata?.task_name);
    console.log('- payload.debug?.originalPayload?.metadata?.task_name:', payload.debug?.originalPayload?.metadata?.task_name);
    console.log('- payload.metadata?.taskName:', payload.metadata?.taskName);
    console.log('- payload.taskName:', payload.taskName);
    console.log('- Final taskName:', taskName);

    // 🎯 ADD THIS NEW LINE RIGHT HERE:
console.log('🏷️ TASK NAME EXTRACTION SUCCESS:', {
  found: !!taskName,
  source: taskName ? 'metadata.task_name' : 'not found',
  value: taskName
});
    
    // Extract other data
    const status = payload.status || 'completed';
    const result = payload.result || payload.output || payload.data;
    const error = payload.error;
    
    console.log('🔍 AIROPS WEBHOOK: Extracted data:');
    console.log('- taskId:', taskId);
    console.log('- conversationId:', conversationId);
    console.log('- taskName:', taskName);
    console.log('- status:', status);
    console.log('- result length:', result ? result.length : 0);
    console.log('- error:', error);
    
    if (!taskId) {
      console.error('❌ AIROPS WEBHOOK: Missing taskId in webhook payload');
      return new Response(JSON.stringify({ 
        error: 'taskId is required',
        debug: {
          availableFields: Object.keys(payload),
          payload: payload
        }
      }), {
        status: 400,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`📋 AIROPS WEBHOOK: Processing completion for task: ${taskId}, status: ${status}, conversation: ${conversationId}, taskName: ${taskName}`);

    const tasksStore = getStore('tasks');
    const conversationTasksStore = getStore('conversation-tasks');
    const historyStore = getStore('conversation-history');
    
    // 1. ✅ ENHANCED: Update individual task storage with task name
    console.log(`📋 AIROPS WEBHOOK: Looking for individual task: ${taskId}`);
    const existingTaskData = await tasksStore.get(taskId);
    let individualTask = {};
    
    if (existingTaskData) {
      individualTask = JSON.parse(existingTaskData);
      console.log(`📋 AIROPS WEBHOOK: Found existing individual task:`, individualTask);
    } else {
      console.log(`⚠️ AIROPS WEBHOOK: No existing individual task found for: ${taskId}`);
      console.log(`⚠️ AIROPS WEBHOOK: This might be normal if the task was created recently`);
    }

    // Update individual task with completion data
    individualTask.status = status;
    individualTask.completedAt = new Date().toISOString();
    individualTask.conversationId = conversationId || individualTask.conversationId;
    
    // ✅ NEW: Update task name if provided
    if (taskName) {
      individualTask.taskName = taskName;
      individualTask.displayName = taskName; // For backwards compatibility
      console.log(`📋 AIROPS WEBHOOK: Updated task name to: ${taskName}`);
    }
    
    if (result) {
      individualTask.result = result;
      console.log(`📋 AIROPS WEBHOOK: Added result of length ${result.length} to task ${taskId}`);
    }
    
    if (error) {
      individualTask.error = error;
      individualTask.status = 'failed';
      console.log(`❌ AIROPS WEBHOOK: Task ${taskId} failed with error:`, error);
    }

    // Save updated individual task
    await tasksStore.set(taskId, JSON.stringify(individualTask));
    console.log(`✅ AIROPS WEBHOOK: Updated individual task storage for: ${taskId}`);

    // 2. ✅ ENHANCED: Update conversation-level task storage with task name
    const finalConversationId = conversationId || individualTask.conversationId;
    
    if (finalConversationId) {
      console.log(`📋 AIROPS WEBHOOK: Updating conversation tasks for: ${finalConversationId}`);
      
      try {
        // Load conversation tasks
        const conversationTasksData = await conversationTasksStore.get(finalConversationId);
        let conversationTasks = conversationTasksData ? JSON.parse(conversationTasksData) : [];
        
        console.log(`📋 AIROPS WEBHOOK: Found ${conversationTasks.length} tasks in conversation storage`);
        console.log(`📋 AIROPS WEBHOOK: Task IDs in conversation:`, conversationTasks.map(t => t.id));
        
        // Find and update the specific task in the conversation
        const taskIndex = conversationTasks.findIndex(task => task.id === taskId);
        console.log(`📋 AIROPS WEBHOOK: Task index in conversation: ${taskIndex}`);
        
        if (taskIndex !== -1) {
          const oldTask = conversationTasks[taskIndex];
          console.log(`📋 AIROPS WEBHOOK: Updating task at index ${taskIndex}:`, oldTask);
          
          conversationTasks[taskIndex] = {
            ...conversationTasks[taskIndex],
            status: individualTask.status,
            result: result,
            completedAt: individualTask.completedAt,
            error: error || null,
            // ✅ NEW: Update task name in conversation storage too
            ...(taskName && { 
              taskName: taskName,
              displayName: taskName 
            })
          };
          
          console.log(`📋 AIROPS WEBHOOK: Updated task:`, conversationTasks[taskIndex]);
          
          // Save updated conversation tasks
          await conversationTasksStore.set(finalConversationId, JSON.stringify(conversationTasks));
          console.log(`✅ AIROPS WEBHOOK: Updated conversation task storage for: ${finalConversationId}, task: ${taskId}`);
          
          // 3. ✅ ENHANCED: Save completed task result to conversation history with task name
          if (result && status === 'completed') {
            try {
              console.log(`📚 AIROPS WEBHOOK: Adding task completion to history for conversation: ${finalConversationId}`);
              
              const historyData = await historyStore.get(finalConversationId);
              const currentHistory = historyData ? JSON.parse(historyData) : [];
              
              // Create history entry for completed task with enhanced data
              const historyEntry = {
                text: `${individualTask.comment || 'Task'}`,
                result: result,
                mode: 'task_completion',
                taskId: taskId,
                // ✅ NEW: Include task name in history
                taskName: taskName || null,
                displayName: taskName || null,
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
              
              console.log(`✅ AIROPS WEBHOOK: Added task completion to history for conversation: ${finalConversationId}`);
            } catch (historyError) {
              console.error(`❌ AIROPS WEBHOOK: Error saving task completion to history:`, historyError);
            }
          }
          
        } else {
          console.log(`⚠️ AIROPS WEBHOOK: Task ${taskId} not found in conversation ${finalConversationId} storage`);
          console.log(`⚠️ AIROPS WEBHOOK: Available task IDs:`, conversationTasks.map(t => t.id));
          console.log(`⚠️ AIROPS WEBHOOK: This might indicate the task was created but not properly saved to conversation storage`);
        }
      } catch (convError) {
        console.error(`❌ AIROPS WEBHOOK: Error updating conversation tasks for ${finalConversationId}:`, convError);
      }
    } else {
      console.log(`⚠️ AIROPS WEBHOOK: No conversation ID found for task ${taskId}, cannot update conversation storage or history`);
    }

    console.log(`✅ AIROPS WEBHOOK: Task completion webhook processed successfully for: ${taskId}`);
    
    const response = {
      success: true,
      message: `Task ${taskId} marked as ${individualTask.status}`,
      taskId: taskId,
      status: individualTask.status,
      conversationId: finalConversationId,
      taskName: taskName,
      conversationUpdated: !!finalConversationId,
      historySaved: !!(finalConversationId && result && status === 'completed'),
      debug: {
        originalPayload: payload,
        extractedData: {
          taskId,
          conversationId,
          taskName,
          status,
          resultLength: result ? result.length : 0
        }
      }
    };
    
    console.log(`✅ AIROPS WEBHOOK: Sending response:`, response);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('❌ AIROPS WEBHOOK: Error processing task completion webhook:', error);
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
const debugTaskNameExtraction = (payload) => {
  console.log('🔍 TASK NAME DEBUG: Full payload structure:');
  console.log(JSON.stringify(payload, null, 2));
  
  // Check ALL possible locations for task name
  const possibleLocations = [
    'payload.taskName',
    'payload.task_name', 
    'payload.metadata?.task_name',
    'payload.metadata?.taskName',
    'payload.request_info?.task_name',
    'payload.airops_request?.task_name',
    'payload.airops_request?.metadata?.task_name',
    'payload.airops_response?.task_name',
    'payload.output?.task_name',
    'payload.result?.task_name',
    'payload.data?.task_name',
    'payload.execution?.task_name',
    'payload.job?.task_name',
    'payload.workflow?.task_name'
  ];
  
  console.log('🔍 TASK NAME DEBUG: Checking all possible locations:');
  possibleLocations.forEach(path => {
    const value = getNestedValue(payload, path);
    console.log(`- ${path}: ${value}`);
  });
  
  // Also check for any field containing "task" or "name"
  const allKeys = getAllKeys(payload);
  const taskRelatedKeys = allKeys.filter(key => 
    key.toLowerCase().includes('task') || 
    key.toLowerCase().includes('name')
  );
  
  console.log('🔍 TASK NAME DEBUG: All task/name related keys:', taskRelatedKeys);
};

const getNestedValue = (obj, path) => {
  try {
    return path.split('.').reduce((current, key) => {
      if (key.includes('?')) {
        const cleanKey = key.replace('?', '');
        return current?.[cleanKey];
      }
      return current[key];
    }, obj);
  } catch {
    return undefined;
  }
};

const getAllKeys = (obj, prefix = '') => {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    }
  }
  return keys;
};