import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [mode, setMode] = useState('email');
  const [comment, setComment] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [commentHistory, setCommentHistory] = useState([]);
  const [taskResults, setTaskResults] = useState([]);
  const [pollingTasks, setPollingTasks] = useState(new Set());
  const [debugLog, setDebugLog] = useState([]);
  
  // Prevent multiple calls
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  
  // Auto-resize state
  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showTaskResults, setShowTaskResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const cardRef = useRef(null);
  const textareaRef = useRef(null);
  const textareaContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Format options
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'email', label: '📧 Email Draft' },
    { value: 'bullets', label: '• Bullet Points' },
    { value: 'table', label: '📊 Table/Spreadsheet' },
    { value: 'document', label: '📄 Document/Report' },
    { value: 'json', label: '{ } JSON Data' },
    { value: 'summary', label: '📋 Executive Summary' },
    { value: 'tasks', label: '✅ Action Items' },
    { value: 'timeline', label: '📅 Timeline/Schedule' },
    { value: 'custom', label: '✏️ Custom Format' }
  ];

  // Add debug logging
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 4)]);
  };

  // Detect container size changes (sidebar resize)
  useEffect(() => {
    const observeContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const updateSize = () => {
        const rect = parent.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        
        // Auto-adjust card size to fit container with padding
        const maxWidth = Math.max(320, rect.width - 40);
        const maxHeight = Math.max(400, rect.height - 40);
        
        setCardSize(prev => ({
          width: Math.min(prev.width, maxWidth),
          height: Math.min(prev.height, maxHeight)
        }));
      };
      
      // Initial size
      updateSize();
      
      // Use ResizeObserver if available
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(parent);
        return () => resizeObserver.disconnect();
      } else {
        // Fallback to window resize
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
      }
    };
    
    const cleanup = observeContainerSize();
    return cleanup;
  }, []);

  // Detect if we're in composer or sidebar
  const isComposer = context?.type === 'messageComposer';
  const containerStyle = isComposer ? 'composer' : 'sidebar';

  // Adaptive text size based on card size
  const getAdaptiveTextSize = () => {
    const baseSize = Math.max(11, Math.min(14, cardSize.width / 28));
    return {
      base: `${baseSize}px`,
      small: `${baseSize - 1}px`,
      tiny: `${baseSize - 2}px`,
      header: `${baseSize + 1}px`
    };
  };

  const textSizes = getAdaptiveTextSize();

  // Manual resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && !isTextareaResizing) {
        const rect = cardRef.current.getBoundingClientRect();
        const newWidth = Math.max(300, Math.min(containerSize.width - 20, e.clientX - rect.left));
        const newHeight = Math.max(350, Math.min(containerSize.height - 20, e.clientY - rect.top));
        setCardSize({ width: newWidth, height: newHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current.getBoundingClientRect();
        const newHeight = Math.max(40, Math.min(200, e.clientY - rect.top));
        setTextareaHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsTextareaResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing || isTextareaResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isTextareaResizing ? 'ns-resize' : 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isTextareaResizing, containerSize]);

  const handleCardResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleTextareaResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTextareaResizing(true);
  };

  useEffect(() => {
    const conversationId = context?.conversation?.id;
    if (conversationId) {
      loadHistoryFromFrontContext();
      loadTaskResultsFromFrontContext();
    }
  }, [context]);

  useEffect(() => {
    if (pollingTasks.size > 0) {
      const interval = setInterval(() => {
        pollingTasks.forEach(taskId => checkTaskStatus(taskId));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pollingTasks]);

  useEffect(() => {
    if (selectedFormat && selectedFormat !== 'custom') {
      const selected = formatOptions.find(opt => opt.value === selectedFormat);
      if (selected) {
        setOutputFormat(selected.label.replace(/[📧•📊📄✅📋📅✏️{}]/g, '').trim());
      }
    }
  }, [selectedFormat]);

  const createCombinedInstructions = () => {
    let combinedText = comment.trim();
    
    if (mode === 'task') {
      if (outputFormat.trim()) {
        combinedText += `\n\nOutput Format: ${outputFormat.trim()}`;
      }
      
      if (uploadedFile) {
        combinedText += `\n\nReference File: ${uploadedFile.name} (${uploadedFile.type}, ${(uploadedFile.size / 1024).toFixed(1)}KB)`;
        combinedText += `\nFile Content Preview: ${uploadedFile.preview || 'Binary file - see attachment'}`;
      }
    }
    
    return combinedText;
  };

  // CREATE SINGLE NESTED PAYLOAD OBJECT
  const createSinglePayload = (combinedInstructions, conversationData, taskId) => {
    // Everything nested under ONE field so AirOps sees just one input
    const singlePayload = {
      request: {
        instructions: combinedInstructions,
        mode: mode,
        context: {
          type: context?.type,
          conversation: conversationData,
          user: context?.teammate
        },
        ...(taskId && { taskId: taskId }),
        ...(uploadedFile && {
          attachedFile: {
            name: uploadedFile.name,
            type: uploadedFile.type,
            size: uploadedFile.size,
            preview: uploadedFile.preview
          }
        })
      }
    };
    
    addDebugLog('📦 Created SINGLE nested payload object');
    return singlePayload;
  };

  // Load history from Front conversation context (links and comments)
  const loadHistoryFromFrontContext = async () => {
    try {
      if (context && context.conversation) {
        const messages = await context.listMessages();
        const historyEntries = [];
        
        // Look for AirOps history in conversation messages and links
        messages.results.forEach(message => {
          // Check message body for AirOps references
          if (message.body && message.body.includes('🤖 AirOps')) {
            const match = message.body.match(/🤖 AirOps (Email|Task) Request: (.+?)(?:\||\n|$)/);
            if (match) {
              historyEntries.push({
                text: match[2],
                mode: match[1].toLowerCase(),
                timestamp: message.created_at,
                user: message.author?.name || 'Unknown',
                source: 'comment'
              });
            }
          }
          
          // Check for links added by the plugin
          if (message.attachments) {
            message.attachments.forEach(attachment => {
              if (attachment.url && attachment.url.includes('airops.com') && attachment.filename) {
                const isTask = attachment.filename.includes('Task');
                historyEntries.push({
                  text: attachment.filename.replace(/AirOps (Email|Task): /, ''),
                  mode: isTask ? 'task' : 'email',
                  timestamp: message.created_at,
                  user: message.author?.name || 'Unknown',
                  source: 'link',
                  url: attachment.url
                });
              }
            });
          }
        });
        
        // Sort by timestamp (newest first)
        historyEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setCommentHistory(historyEntries);
        addDebugLog(`📚 Loaded ${historyEntries.length} history entries from Front`);
      }
    } catch (error) {
      console.error('Error loading history from Front:', error);
      addDebugLog(`❌ Error loading history: ${error.message}`);
      // Fallback to localStorage
      const conversationId = context?.conversation?.id;
      if (conversationId) {
        loadCommentHistoryFromStorage(conversationId);
      }
    }
  };

  // Save history to Front conversation context
  const saveHistoryToFrontContext = async (entry) => {
    try {
      if (context && context.conversation) {
        const historyText = `${entry.text}${entry.outputFormat ? ` | Format: ${entry.outputFormat}` : ''}${entry.hasFile ? ` | File: ${entry.fileName}` : ''}`;
        
        // Try to add as a link first
        if (context.addLink) {
          const linkUrl = mode === 'email' 
            ? `https://app.airops.com/airops-2/workflows/73407/edit`
            : `https://app.airops.com/airops-2/workflows/84946/edit${entry.taskId ? `?taskId=${entry.taskId}` : ''}`;
          const linkName = `AirOps ${entry.mode === 'email' ? 'Email' : 'Task'}: ${historyText.substring(0, 50)}...`;
          
          await context.addLink(linkUrl, linkName);
          addDebugLog('🔗 Request saved as link to Front conversation');
          setStatus('Request saved to conversation!');
          return;
        }
        
        // Fallback to comment if addLink isn't available
        if (context.createComment) {
          await context.createComment({
            body: `🤖 AirOps ${entry.mode === 'email' ? 'Email' : 'Task'} Request: ${historyText}`,
            author_id: context.teammate?.id
          });
          addDebugLog('💬 Request saved as comment to Front conversation');
          setStatus('Request saved as comment!');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving to Front context:', error);
      addDebugLog(`❌ Error saving to Front: ${error.message}`);
      // Fallback to localStorage
      const conversationId = context?.conversation?.id;
      if (conversationId) {
        const updatedHistory = [entry, ...commentHistory];
        setCommentHistory(updatedHistory);
        saveCommentHistoryToStorage(conversationId, updatedHistory);
        setStatus('Request saved locally');
      }
    }
  };

  // Load task results from Front context
  const loadTaskResultsFromFrontContext = async () => {
    try {
      if (context && context.conversation) {
        const messages = await context.listMessages();
        const taskEntries = [];
        
        // Look for completed tasks in conversation
        messages.results.forEach(message => {
          // Check for completion links
          if (message.attachments) {
            message.attachments.forEach(attachment => {
              if (attachment.url && attachment.url.includes('airops.com/airops-2/workflows/84946/results')) {
                const taskIdMatch = attachment.url.match(/taskId=([^&]+)/);
                if (taskIdMatch) {
                  taskEntries.push({
                    id: taskIdMatch[1],
                    status: 'completed',
                    outputFormat: attachment.filename?.replace(/✅ AirOps Result: /, '')?.replace(/ - Completed$/, '') || 'Task',
                    completedAt: message.created_at,
                    result: `Task completed - see link: ${attachment.url}`,
                    source: 'front_link'
                  });
                }
              }
            });
          }
          
          // Check for task result comments
          if (message.body && message.body.includes('AirOps Task Result:')) {
            const taskMatch = message.body.match(/Task ID: (\w+)/);
            if (taskMatch) {
              taskEntries.push({
                id: taskMatch[1],
                status: 'completed',
                result: message.body,
                completedAt: message.created_at,
                source: 'front_comment'
              });
            }
          }
        });
        
        // Merge with local storage results
        const conversationId = context?.conversation?.id;
        if (conversationId) {
          const storageKey = `airops-tasks-${conversationId}`;
          try {
            const savedTasks = localStorage.getItem(storageKey);
            if (savedTasks) {
              const localTasks = JSON.parse(savedTasks);
              // Merge, preferring Front data for completed tasks
              const mergedTasks = [...taskEntries];
              localTasks.forEach(localTask => {
                if (!taskEntries.find(t => t.id === localTask.id)) {
                  mergedTasks.push(localTask);
                }
              });
              setTaskResults(mergedTasks);
            } else {
              setTaskResults(taskEntries);
            }
          } catch (e) {
            setTaskResults(taskEntries);
          }
        } else {
          setTaskResults(taskEntries);
        }
        
        addDebugLog(`📊 Loaded ${taskEntries.length} task results from Front`);
      }
    } catch (error) {
      console.error('Error loading task results from Front:', error);
      addDebugLog(`❌ Error loading task results: ${error.message}`);
      // Fallback to localStorage only
      const conversationId = context?.conversation?.id;
      if (conversationId) {
        loadTaskResultsFromStorage(conversationId);
      }
    }
  };

  // Save task results to Front context
  const saveTaskResultToFrontContext = async (task) => {
    try {
      if (context && context.conversation && task.result) {
        if (context.addLink) {
          const linkUrl = `https://app.airops.com/airops-2/workflows/84946/results?taskId=${task.id}`;
          const linkName = `✅ AirOps Result: ${task.outputFormat || 'Task'} - Completed`;
          
          await context.addLink(linkUrl, linkName);
          addDebugLog('🎯 Task completion link added to Front conversation');
          setStatus('Task result saved to conversation!');
        }
      }
    } catch (error) {
      console.error('Error saving task result to Front:', error);
      addDebugLog(`❌ Error saving task result: ${error.message}`);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus('File too large (max 2MB)');
      return;
    }

    try {
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      };

      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          fileData.preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          setUploadedFile(fileData);
          setStatus('File uploaded successfully');
          addDebugLog(`📎 File uploaded: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
        };
        reader.readAsText(file);
      } else {
        setUploadedFile(fileData);
        setStatus('File uploaded successfully');
        addDebugLog(`📎 File uploaded: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus('File upload failed');
      addDebugLog(`❌ File upload failed: ${error.message}`);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatus('File removed');
    addDebugLog('🗑️ File removed');
  };

  const loadCommentHistoryFromStorage = (conversationId) => {
    const storageKey = `airops-history-${conversationId}`;
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        setCommentHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Error loading history:", e);
    }
  };

  const saveCommentHistoryToStorage = (conversationId, history) => {
    const storageKey = `airops-history-${conversationId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.error("Error saving history:", e);
    }
  };

  const loadTaskResultsFromStorage = (conversationId) => {
    const storageKey = `airops-tasks-${conversationId}`;
    try {
      const savedTasks = localStorage.getItem(storageKey);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        setTaskResults(tasks);
        
        const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
        if (pendingTasks.length > 0) {
          setPollingTasks(new Set(pendingTasks));
        }
      }
    } catch (e) {
      console.error("Error loading task results:", e);
    }
  };

  const saveTaskResultsToStorage = (conversationId, tasks) => {
    const storageKey = `airops-tasks-${conversationId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error("Error saving task results:", e);
    }
  };

  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/api/task-status?taskId=${taskId}`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed') {
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed', result: result.data, completedAt: result.completedAt }
              : task
          );
          
          setTaskResults(updatedTasks);
          const conversationId = context?.conversation?.id;
          if (conversationId) {
            saveTaskResultsToStorage(conversationId, updatedTasks);
          }
          
          // Save completed task to Front context
          const completedTask = updatedTasks.find(task => task.id === taskId);
          if (completedTask) {
            await saveTaskResultToFrontContext(completedTask);
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed and saved!');
          addDebugLog(`✅ Task ${taskId} completed`);
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
      addDebugLog(`❌ Error checking task status: ${error.message}`);
    }
  };

  const insertIntoDraft = (content) => {
    if (context && context.draft && typeof context.insertTextIntoBody === 'function') {
      context.insertTextIntoBody(content);
      setStatus('Inserted into draft!');
      addDebugLog('📝 Content inserted into draft');
    } else if (context && typeof context.createDraft === 'function') {
      context.createDraft({
        content: {
          body: content,
          type: 'text'
        }
      });
      setStatus('Draft created!');
      addDebugLog('📝 New draft created');
    } else {
      navigator.clipboard.writeText(content).then(() => {
        setStatus('Copied to clipboard!');
        addDebugLog('📋 Content copied to clipboard');
      }).catch(() => {
        setStatus('Copy failed');
        addDebugLog('❌ Clipboard copy failed');
      });
    }
  };

  const processRequest = async () => {
    // Prevent multiple calls
    const now = Date.now();
    if (isProcessingRef.current || (now - lastCallTimeRef.current) < 1000) {
      addDebugLog('🚫 Prevented duplicate call');
      return;
    }

    if (!comment.trim()) {
      setStatus('Add instructions');
      return;
    }

    if (mode === 'task' && !outputFormat.trim() && !selectedFormat) {
      setStatus('Select or enter output format');
      return;
    }
    
    // Set processing flags
    isProcessingRef.current = true;
    lastCallTimeRef.current = now;
    setIsSending(true);
    setStatus('Processing...');
    addDebugLog('🚀 Starting webhook call');
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      const combinedInstructions = createCombinedInstructions();
      addDebugLog(`📝 Combined instructions: ${combinedInstructions.substring(0, 50)}...`);
      
      let conversationData = {};
      
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
        conversationData = {
          id: conversationId,
          subject: context.conversation.subject,
          status: context.conversation.status,
          recipient: context.conversation.recipient,
          tags: context.conversation.tags,
          assignee: context.conversation.assignee
        };
        
        try {
          const messages = await context.listMessages();
          conversationData.messages = messages.results;
          addDebugLog(`📧 Loaded ${messages.results.length} messages`);
        } catch (err) {
          addDebugLog(`❌ Error loading messages: ${err.message}`);
          console.error("Couldn't fetch messages:", err);
        }
        
        const newEntry = {
          text: comment,
          mode: mode,
          outputFormat: outputFormat,
          selectedFormat: selectedFormat,
          hasFile: !!uploadedFile,
          fileName: uploadedFile?.name,
          timestamp: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user',
          taskId: taskId
        };
        
        // Save to Front context instead of localStorage
        await saveHistoryToFrontContext(newEntry);

        if (mode === 'task' && taskId) {
          const newTask = {
            id: taskId,
            comment: comment,
            outputFormat: outputFormat,
            selectedFormat: selectedFormat,
            hasFile: !!uploadedFile,
            fileName: uploadedFile?.name,
            status: 'pending',
            createdAt: new Date().toISOString(),
            user: context.teammate ? context.teammate.name : 'Unknown user'
          };
          
          const updatedTasks = [newTask, ...taskResults];
          setTaskResults(updatedTasks);
          saveTaskResultsToStorage(conversationId, updatedTasks);
          
          try {
            await fetch('/api/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
            addDebugLog('💾 Task stored in Netlify Blobs');
          } catch (blobError) {
            addDebugLog(`❌ Error storing task: ${blobError.message}`);
          }
          
          setPollingTasks(prev => new Set([...prev, taskId]));
          addDebugLog('⏱️ Started polling for task updates');
        }
      }
      
      if (context?.draft) {
        conversationData.draft = {
          body: context.draft.body,
          subject: context.draft.subject
        };
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      addDebugLog(`🎯 Using ${mode} webhook`);
      
      // Try different payload approaches
      const payloadApproaches = [
        // Approach 1: Just the combined instructions (simplest)
        combinedInstructions,
        
        // Approach 2: Single nested object  
        createSinglePayload(combinedInstructions, conversationData, taskId),
        
        // Approach 3: Minimal object with just essentials
        {
          userComment: combinedInstructions,
          mode: mode
        }
      ];
      
      let successfulResponse = null;
      
      for (let i = 0; i < payloadApproaches.length; i++) {
        try {
          addDebugLog(`🔄 Trying payload approach ${i + 1}/${payloadApproaches.length}`);
          console.log(`🧪 PAYLOAD APPROACH ${i + 1}:`, payloadApproaches[i]);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payloadApproaches[i])
          });
          
          addDebugLog(`📈 Approach ${i + 1} response: ${response.status}`);
          
          if (response.ok) {
            addDebugLog(`✅ Payload approach ${i + 1} worked!`);
            successfulResponse = response;
            break;
          } else {
            const errorText = await response.text();
            addDebugLog(`❌ Approach ${i + 1} failed: ${response.status} - ${errorText.substring(0, 100)}`);
            if (i === payloadApproaches.length - 1) {
              throw new Error(`All payload approaches failed. Last error: ${response.status}: ${errorText}`);
            }
          }
        } catch (error) {
          addDebugLog(`💥 Approach ${i + 1} error: ${error.message}`);
          if (i === payloadApproaches.length - 1) {
            throw error;
          }
        }
      }
      
      if (successfulResponse) {
        const responseData = await successfulResponse.text();
        addDebugLog(`✅ Success: ${responseData.substring(0, 50)}...`);
        
        if (mode === 'email') {
          setStatus('Email sent and saved to conversation!');
        } else {
          setStatus('Task created and saved to conversation!');
        }
        
        setComment('');
        setOutputFormat('');
        setSelectedFormat('');
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
    } catch (error) {
      console.error('❌ WEBHOOK ERROR:', error);
      addDebugLog(`💥 Error: ${error.message}`);
      setStatus('Error: ' + error.message);
    } finally {
      setIsSending(false);
      isProcessingRef.current = false;
      addDebugLog('🏁 Request completed');
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        fontSize: textSizes.base,
        color: '#9ca3af'
      }}>
        Loading context...
      </div> 
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: '16px',
        fontSize: textSizes.base,
        color: '#64748b',
        textAlign: 'center'
      }}>
        Select a conversation to use this plugin
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      style={{
        width: `${cardSize.width}px`,
        height: `${cardSize.height}px`,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        fontSize: textSizes.base,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, height 0.2s ease'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: textSizes.header,
        fontWeight: '600',
        color: '#111827'
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ width: '16px', height: '16px', marginRight: '8px' }}
        />
        <span>Send to AirOps</span>
        <span style={{ 
          marginLeft: 'auto', 
          fontSize: textSizes.tiny, 
          color: '#94a3b8',
          fontWeight: 'normal'
        }}>
          {containerStyle} {cardSize.width}×{cardSize.height}
        </span>
      </div>

      {/* Mode Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '12px',
        background: '#f1f5f9',
        borderRadius: '6px',
        padding: '2px'
      }}>
        <button 
          onClick={() => setMode('email')}
          style={{
            flex: 1,
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            fontSize: textSizes.base,
            fontWeight: '500',
            cursor: 'pointer',
            background: mode === 'email' ? 'white' : 'transparent',
            color: mode === 'email' ? '#1e293b' : '#64748b',
            boxShadow: mode === 'email' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          Email
        </button>
        <button 
          onClick={() => setMode('task')}
          style={{
            flex: 1,
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            fontSize: textSizes.base,
            fontWeight: '500',
            cursor: 'pointer',
            background: mode === 'task' ? 'white' : 'transparent',
            color: mode === 'task' ? '#1e293b' : '#64748b',
            boxShadow: mode === 'task' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          Task
        </button>
      </div>
      
      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '4px',
        marginBottom: '12px'
      }}>
        {/* Instructions Textarea with drag resize */}
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: '8px' }}>
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={mode === 'email' ? "How should we respond?" : "What do you need?"}
            style={{
              width: '100%',
              height: `${textareaHeight}px`,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: textSizes.base,
              fontFamily: 'inherit',
              resize: 'none',
              transition: 'border-color 0.15s ease',
              paddingBottom: '20px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          
          {/* Textarea drag resize handle */}
          <div
            onMouseDown={handleTextareaResizeStart}
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '8px',
              left: '8px',
              height: '12px',
              cursor: 'ns-resize',
              background: 'linear-gradient(90deg, transparent 30%, #d1d5db 30%, #d1d5db 35%, transparent 35%, transparent 65%, #d1d5db 65%, #d1d5db 70%, transparent 70%)',
              backgroundSize: '8px 2px',
              opacity: 0.3,
              borderRadius: '0 0 4px 4px',
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '0.3'}
            title="Drag to resize"
          >
            <div style={{
              width: '20px',
              height: '3px',
              background: '#9ca3af',
              borderRadius: '2px'
            }} />
          </div>
        </div>

        {/* Task Mode Controls */}
        {mode === 'task' && (
          <div style={{ marginBottom: '12px' }}>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: textSizes.base,
                fontFamily: 'inherit',
                marginBottom: '8px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {selectedFormat === 'custom' && (
              <input
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="Enter custom format description..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: textSizes.base,
                  fontFamily: 'inherit',
                  marginBottom: '8px'
                }}
              />
            )}

            {/* File Upload */}
            <div style={{
              border: '1px dashed #d1d5db',
              borderRadius: '6px',
              padding: '12px',
              textAlign: 'center',
              background: '#fafafa'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
              />
              
              {!uploadedFile ? (
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: textSizes.base,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    📎 Upload reference file
                  </button>
                  <div style={{ fontSize: textSizes.small, color: '#94a3b8', marginTop: '4px' }}>
                    CSV, JSON, TXT, DOC, PDF, images (max 2MB)
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: textSizes.base, color: '#374151', marginBottom: '6px' }}>
                    📎 {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}KB)
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: textSizes.small,
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                  {uploadedFile.preview && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: textSizes.tiny,
                      color: '#64748b',
                      maxHeight: '40px',
                      overflow: 'hidden',
                      textAlign: 'left',
                      background: 'white',
                      padding: '4px',
                      borderRadius: '3px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {uploadedFile.preview}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Log */}
        {debugLog.length > 0 && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '6px',
            marginBottom: '8px',
            fontSize: textSizes.tiny,
            maxHeight: '80px',
            overflowY: 'auto'
          }}>
            <div style={{ fontWeight: '600', color: '#64748b', marginBottom: '2px' }}>
              🔍 Debug Log:
            </div>
            {debugLog.map((log, index) => (
              <div key={index} style={{ color: '#475569', marginBottom: '1px' }}>
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Results Sections */}
        {taskResults.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <button 
              onClick={() => setShowTaskResults(!showTaskResults)}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: textSizes.small,
                color: '#64748b',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: '500'
              }}
            >
              {showTaskResults ? '▼' : '▶'} Tasks ({taskResults.length})
            </button>
            
            {showTaskResults && (
              <div style={{ marginTop: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {taskResults.slice(0, 3).map((task) => (
                  <div key={task.id} style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '6px',
                    fontSize: textSizes.small
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span>{task.status === 'pending' ? '⏳' : '✅'}</span>
                      <span style={{ flex: 1, color: '#475569', fontWeight: '500' }}>
                        {task.selectedFormat ? formatOptions.find(f => f.value === task.selectedFormat)?.label || task.outputFormat : task.outputFormat}
                        {task.hasFile && ' 📎'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: textSizes.tiny }}>
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                    {task.result && (
                      <div style={{ position: 'relative' }}>
                        <div 
                          style={{
                            fontSize: textSizes.small,
                            color: '#475569',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            maxHeight: '80px',
                            overflow: 'auto'
                          }}
                          dangerouslySetInnerHTML={{ __html: task.result }}
                        />
                        <button 
                          onClick={() => insertIntoDraft(task.result.replace(/<[^>]*>/g, ''))}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: '#64748b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: textSizes.tiny,
                            padding: '2px 6px',
                            cursor: 'pointer'
                          }}
                        >
                          Insert
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {commentHistory.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: textSizes.small,
                color: '#64748b',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: '500'
              }}
            >
              {showHistory ? '▼' : '▶'} History ({commentHistory.length}) - From Front Context
            </button>
            
            {showHistory && (
              <div style={{ marginTop: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                {commentHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} style={{
                    padding: '6px',
                    background: entry.source === 'front_link' || entry.source === 'front_comment' ? '#f0f9ff' : '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    fontSize: textSizes.small
                  }}>
                    <div style={{ 
                      color: '#94a3b8', 
                      marginBottom: '2px',
                      fontSize: textSizes.tiny,
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{formatDate(entry.timestamp)}</span>
                      <span>•</span>
                      <span>{entry.mode === 'email' ? '✉️' : '📋'}</span>
                      <span>•</span>
                      <span>{entry.user}</span>
                      {entry.source && (
                        <>
                          <span>•</span>
                          <span style={{ 
                            background: entry.source.includes('front') ? '#3b82f6' : '#6b7280',
                            color: 'white',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '8px'
                          }}>
                            {entry.source === 'front_link' ? '🔗' : entry.source === 'front_comment' ? '💬' : '💾'}
                          </span>
                        </>
                      )}
                      {entry.hasFile && <span>📎</span>}
                    </div>
                    <div style={{ 
                      color: '#475569', 
                      lineHeight: 1.3,
                      fontSize: textSizes.small
                    }}>
                      {entry.text}
                    </div>
                    {(entry.outputFormat || entry.selectedFormat) && (
                      <div style={{ 
                        fontSize: textSizes.tiny,
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        marginTop: '2px'
                      }}>
                        Format: {entry.selectedFormat ? formatOptions.find(f => f.value === entry.selectedFormat)?.label || entry.outputFormat : entry.outputFormat}
                      </div>
                    )}
                    {entry.url && (
                      <div style={{ marginTop: '2px' }}>
                        <a 
                          href={entry.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: textSizes.tiny,
                            color: '#3b82f6',
                            textDecoration: 'none'
                          }}
                        >
                          🔗 View in AirOps
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section - Send Button and Status */}
      <div style={{
        borderTop: '1px solid #f1f5f9',
        paddingTop: '12px'
      }}>
        <button
          onClick={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            background: isSending ? '#9ca3af' : '#1f2937',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px',
            fontSize: textSizes.base,
            fontWeight: '500',
            cursor: isSending ? 'not-allowed' : 'pointer',
            marginBottom: '8px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSending) e.target.style.background = '#374151';
          }}
          onMouseLeave={(e) => {
            if (!isSending) e.target.style.background = '#1f2937';
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </button>
        
        {status && (
          <div style={{
            padding: '6px 8px',
            background: status.includes('Error') ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${status.includes('Error') ? '#fecaca' : '#e2e8f0'}`,
            borderRadius: '4px',
            fontSize: textSizes.small,
            color: status.includes('Error') ? '#dc2626' : '#64748b',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Card Resize Handle */}
      <div
        onMouseDown={handleCardResizeStart}
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '14px',
          height: '14px',
          cursor: 'nw-resize',
          background: 'linear-gradient(-45deg, transparent 30%, #9ca3af 30%, #9ca3af 35%, transparent 35%, transparent 65%, #9ca3af 65%, #9ca3af 70%, transparent 70%)',
          backgroundSize: '4px 4px',
          opacity: 0.4,
          borderRadius: '0 0 6px 0',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '0.4'}
      />
    </div>
  );
}

export default App;