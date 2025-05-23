import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFrontContext } from './providers/frontContext';
import { Accordion, AccordionSection } from '@frontapp/ui-kit';
import './App.css';

// Moved outside: These don't depend on component lifecycle or props
const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
// WARNING: Hardcoding auth tokens in client-side code is a security risk.
// These tokens can be extracted by anyone inspecting the code.
// Consider a backend proxy or more secure token retrieval method if these tokens are sensitive.
const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';

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

const saveToLocalStorage = (key, data, onError) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to localStorage (${key}):`, e);
    if (onError) onError(e.message);
  }
};

const loadFromLocalStorage = (key, onError) => {
  try {
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : null;
  } catch (e) {
    console.error(`Error loading from localStorage (${key}):`, e);
    if (onError) onError(e.message);
    return null;
  }
};


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

  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);

  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const cardRef = useRef(null);
  const textareaRef = useRef(null);
  const textareaContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const addDebugLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  }, []);

  const saveCommentHistoryToStorage = useCallback((conversationId, history) => {
    saveToLocalStorage(`airops-history-${conversationId}`, history, (errMsg) => addDebugLog(`🔴 Error saving history: ${errMsg}`));
  }, [addDebugLog]);

  const loadCommentHistoryFromStorage = useCallback((conversationId) => {
    const loadedHistory = loadFromLocalStorage(`airops-history-${conversationId}`, (errMsg) => addDebugLog(`🔴 Error loading history: ${errMsg}`));
    setCommentHistory(loadedHistory || []);
  }, [addDebugLog]); // setCommentHistory is stable

  const saveTaskResultsToStorage = useCallback((conversationId, tasks) => {
    saveToLocalStorage(`airops-tasks-${conversationId}`, tasks, (errMsg) => addDebugLog(`🔴 Error saving task results: ${errMsg}`));
  }, [addDebugLog]);
  
  const loadTaskResultsFromStorage = useCallback((conversationId) => {
    const loadedTasks = loadFromLocalStorage(`airops-tasks-${conversationId}`, (errMsg) => addDebugLog(`🔴 Error loading tasks: ${errMsg}`));
    setTaskResults(loadedTasks || []);
  }, [addDebugLog]); // setTaskResults is stable


  useEffect(() => {
    const conversationId = context?.conversation?.id;
    if (conversationId) {
      addDebugLog(`🔄 Switched to conversation ${conversationId}`);
      loadCommentHistoryFromStorage(conversationId);
      loadTaskResultsFromStorage(conversationId);

      const storedTasks = loadFromLocalStorage(`airops-tasks-${conversationId}`) || [];
      const pendingStoredTasks = new Set();
      storedTasks.forEach(task => {
        if (task.id && (task.status === 'pending' || task.status === 'processing')) {
          pendingStoredTasks.add(task.id);
        }
      });
      setPollingTasks(pendingStoredTasks);
      if (pendingStoredTasks.size > 0) {
        addDebugLog(`⏳ Resuming polling for ${pendingStoredTasks.size} tasks from storage for conv ${conversationId}.`);
      } else {
         addDebugLog(`ℹ️ No pending tasks to resume polling from storage for conv ${conversationId}.`);
      }
    } else {
      addDebugLog('ℹ️ No active conversation. Clearing history, tasks, and polling.');
      setCommentHistory([]);
      setTaskResults([]);
      setPollingTasks(new Set());
    }
  }, [context?.conversation?.id, loadCommentHistoryFromStorage, loadTaskResultsFromStorage, addDebugLog]);


  const checkTaskStatus = useCallback(async (taskId) => {
    const currentConversationId = context?.conversation?.id;
    if (!currentConversationId) {
        addDebugLog(`Polling stopped for ${taskId}: No active conversation.`);
        setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
        });
        return;
    }

    try {
      addDebugLog(`🔍 Checking status for task: ${taskId} (Conv: ${currentConversationId})`);
      const response = await fetch(`/api/task-status?taskId=${encodeURIComponent(taskId)}`);

      if (!response.ok) {
        addDebugLog(`⚠️ Task status check for ${taskId} failed: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            addDebugLog(`🚫 Task ${taskId} (404), removing from poll.`);
            return newSet;
          });
          setTaskResults(prevTaskResults => {
            const updatedTasks = prevTaskResults.map(task =>
              task.id === taskId && task.status === 'pending'
                ? { ...task, status: 'failed', result: 'Task not found by status API (404).', completedAt: new Date().toISOString() }
                : task
            );
            if (currentConversationId) saveTaskResultsToStorage(currentConversationId, updatedTasks);
            return updatedTasks;
          });
        }
        return;
      }

      const result = await response.json();
      addDebugLog(`📊 Task ${taskId} API status: ${result.status}`);

      if (result.status === 'completed' || result.status === 'failed' || result.status === 'error') {
        let taskForLinkDetails = null;

        setTaskResults(prevTaskResults => {
          const updatedTasks = prevTaskResults.map(task => {
            if (task.id === taskId) {
              taskForLinkDetails = {
                ...task,
                status: result.status === 'completed' ? 'completed' : 'failed',
                result: result.status === 'completed' ? result.data : (result.error || result.message || 'Task processing failed'),
                completedAt: result.completedAt || new Date().toISOString()
              };
              return taskForLinkDetails;
            }
            return task;
          });
          if (currentConversationId) saveTaskResultsToStorage(currentConversationId, updatedTasks);
          return updatedTasks;
        });
        
        const simpleTaskId = taskId.length > 8 ? taskId.substring(0,8) + "..." : taskId;
        if (result.status === 'completed') {
          setStatus(`Task ${simpleTaskId} completed!`);
          if (taskForLinkDetails && context?.addLink && context?.conversation) {
            try {
              const linkUrl = `https://app.airops.com/airops-2/workflows/84946/results?taskId=${taskId}`;
              const formatLabel = taskForLinkDetails.selectedFormat 
                ? formatOptions.find(f => f.value === taskForLinkDetails.selectedFormat)?.label.replace(/[📧•📊📄✅📋📅✏️{}]/g, '').trim()
                : taskForLinkDetails.outputFormat;
              const linkName = `✅ AirOps Result: ${formatLabel || 'Task'} - Completed`;
              
              await context.addLink(linkUrl, linkName);
              addDebugLog(`🔗 Completion link added to Front conv for ${taskId}`);
            } catch (linkError) {
              addDebugLog(`❌ Error adding completion link for ${taskId}: ${linkError.message}`);
            }
          }
        } else {
          setStatus(`Task ${simpleTaskId} ${result.status}.`);
        }

        setPollingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          addDebugLog(`🛑 Stopped polling for task ${taskId} (status: ${result.status})`);
          return newSet;
        });
      }
    } catch (error) {
      addDebugLog(`💥 Error in checkTaskStatus for ${taskId}: ${error.message}`);
      console.error(`Error checking task status for ${taskId}:`, error);
    }
  }, [context, addDebugLog, setTaskResults, setPollingTasks, setStatus, saveTaskResultsToStorage, formatOptions]);


  useEffect(() => {
    if (pollingTasks.size === 0) {
      return;
    }
    const intervalIds = new Map();
    addDebugLog(`⚙️ Setting up polling for ${pollingTasks.size} tasks: [${Array.from(pollingTasks).join(', ')}]`);

    pollingTasks.forEach(taskId => {
      checkTaskStatus(taskId); 
      const intervalId = setInterval(() => {
        checkTaskStatus(taskId);
      }, 30000); 
      intervalIds.set(taskId, intervalId);
    });

    return () => {
      addDebugLog(`🧹 Clearing ${intervalIds.size} polling intervals.`);
      intervalIds.forEach(intervalId => clearInterval(intervalId));
    };
  }, [pollingTasks, checkTaskStatus, addDebugLog]);


  useEffect(() => {
    const observeContainerSize = () => {
      if (!cardRef.current) return undefined;
      const parent = cardRef.current.parentElement;
      if (!parent) return undefined;
      
      const updateSize = () => {
        const rect = parent.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        const maxWidth = Math.max(320, rect.width - 40);
        const maxHeight = Math.max(400, rect.height - 40);
        setCardSize(prev => ({
          width: Math.min(prev.width, maxWidth),
          height: Math.min(prev.height, maxHeight)
        }));
      };
      updateSize();
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(parent);
        return () => resizeObserver.disconnect();
      }
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    };
    return observeContainerSize();
  }, []);

  const isComposer = context?.type === 'messageComposer';
  const containerStyle = isComposer ? 'composer' : 'sidebar';

  const textSizes = useMemo(() => {
    const baseSize = Math.max(11, Math.min(14, cardSize.width / 28));
    return {
      base: `${baseSize}px`, small: `${baseSize - 1}px`,
      tiny: `${baseSize - 2}px`, header: `${baseSize + 1}px`
    };
  }, [cardSize.width]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
        const newWidth = Math.max(300, Math.min(containerSize.width > 0 ? containerSize.width - 20 : Infinity, e.clientX - rect.left));
        const newHeight = Math.max(350, Math.min(containerSize.height > 0 ? containerSize.height - 20 : Infinity, e.clientY - rect.top));
        setCardSize({ width: newWidth, height: newHeight });
      }
      if (isTextareaResizing && textareaContainerRef.current) {
        const rect = textareaContainerRef.current.getBoundingClientRect();
        if (typeof e.clientY !== 'number') return;
        const newHeight = Math.max(40, Math.min(200, e.clientY - rect.top));
        setTextareaHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false); setIsTextareaResizing(false);
      document.body.style.cursor = ''; document.body.style.userSelect = '';
    };
    if (isResizing || isTextareaResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isTextareaResizing ? 'ns-resize' : (isResizing ? 'nwse-resize' : '');
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isTextareaResizing, containerSize.width, containerSize.height]);

  const handleCardResizeStart = useCallback((e) => { e.preventDefault(); setIsResizing(true); }, []);
  const handleTextareaResizeStart = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsTextareaResizing(true); }, []);

  useEffect(() => {
    if (selectedFormat && selectedFormat !== 'custom') {
      const selectedOption = formatOptions.find(opt => opt.value === selectedFormat);
      if (selectedOption) {
        setOutputFormat(selectedOption.label.replace(/[📧•📊📄✅📋📅✏️{}]/g, '').trim());
      }
    } else if (selectedFormat === '') {
        setOutputFormat('');
    }
  }, [selectedFormat]);

  const createCombinedInstructions = useCallback(() => {
    let combinedText = comment.trim();
    if (mode === 'task') {
      const currentOutputFormat = (selectedFormat === 'custom' ? outputFormat : (formatOptions.find(opt => opt.value === selectedFormat)?.label.replace(/[📧•📊📄✅📋📅✏️{}]/g, '').trim() || '')).trim();
      if (currentOutputFormat) {
        combinedText += `\n\nOutput Format: ${currentOutputFormat}`;
      }
      if (uploadedFile) {
        combinedText += `\n\nReference File: ${uploadedFile.name} (${uploadedFile.type}, ${(uploadedFile.size / 1024).toFixed(1)}KB)`;
        combinedText += `\nFile Content Preview: ${uploadedFile.preview || 'Binary file - see attachment'}`;
      }
    }
    return combinedText;
  }, [comment, mode, outputFormat, selectedFormat, uploadedFile]);

  const createSinglePayload = useCallback((instructions, conversationData, taskIdForPayload) => {
    const payload = {
      request: {
        instructions: instructions, mode: mode,
        context: {
          type: context?.type, conversation: conversationData,
          teammate: context?.teammate
        },
        ...(taskIdForPayload && { taskId: taskIdForPayload }),
        ...(uploadedFile && {
          attached_file: {
            name: uploadedFile.name, type: uploadedFile.type, size: uploadedFile.size,
            content_preview: uploadedFile.preview
          }
        })
      }
    };
    addDebugLog('📦 Created SINGLE nested payload object');
    return payload;
  }, [mode, context, uploadedFile, addDebugLog]);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus('File too large (max 2MB)');
      addDebugLog(`📎 File ${file.name} rejected: too large (${(file.size / (1024*1024)).toFixed(1)}MB)`);
      return;
    }
    const fileData = { name: file.name, type: file.type, size: file.size, lastModified: file.lastModified };
    if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      try {
        const content = await file.text();
        fileData.preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        setUploadedFile(fileData);
        setStatus(`📎 ${file.name} uploaded`);
        addDebugLog(`📎 File ${file.name} uploaded with preview.`);
      } catch (readError) {
        setStatus('File read failed'); addDebugLog(`🔴 File ${file.name} read error: ${readError.message}`);
        setUploadedFile({ ...fileData, preview: 'Error reading file content.' });
      }
    } else {
      setUploadedFile(fileData); setStatus(`📎 ${file.name} uploaded (binary)`);
      addDebugLog(`📎 File ${file.name} (binary) uploaded.`);
    }
  }, [addDebugLog, setStatus, setUploadedFile]);

  const removeFile = useCallback(() => {
    addDebugLog(`🗑️ File ${uploadedFile?.name || 'N/A'} removed.`);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatus('File removed');
  }, [addDebugLog, uploadedFile?.name, setStatus, setUploadedFile]);


  const processRequest = useCallback(async () => {
    const now = Date.now();
    if (isProcessingRef.current || (now - lastCallTimeRef.current) < 1000) {
      addDebugLog('🚫 Prevented duplicate call'); return;
    }
    if (!comment.trim()) {
      setStatus('Add instructions'); return;
    }
    const currentOutputFormat = (selectedFormat === 'custom' ? outputFormat : (formatOptions.find(opt => opt.value === selectedFormat)?.label.replace(/[📧•📊📄✅📋📅✏️{}]/g, '').trim() || '')).trim();
    if (mode === 'task' && !currentOutputFormat) {
      setStatus('Select or enter output format'); return;
    }
    
    isProcessingRef.current = true; lastCallTimeRef.current = now;
    setIsSending(true); setStatus('Processing...');
    addDebugLog(`🚀 Starting ${mode} request...`);
    
    const clientSideTaskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;

    try {
      const combinedInstructions = createCombinedInstructions();
      addDebugLog(`📝 Combined instructions (first 50 chars): ${combinedInstructions.substring(0, 50)}...`);
      
      let conversationData = {};
      const conversationId = context?.conversation?.id;

      if (conversationId && context.conversation) {
        conversationData = {
          id: conversationId, subject: context.conversation.subject, status: context.conversation.status,
          recipient: context.conversation.recipient?.handle,
          tags: context.conversation.tags?.map(t => t.name),
          assignee: context.conversation.assignee?.username
        };
        try {
          const messagesResponse = await context.listMessages({ limit: 10 });
          conversationData.messages = messagesResponse.results.map(msg => ({
            id: msg.id, type: msg.type, direction: msg.direction, author: msg.author?.username,
            recipient: msg.recipient?.handle, subject: msg.subject,
            bodyPreview: msg.text?.substring(0, 200) + (msg.text?.length > 200 ? '...' : ''),
            createdAt: msg.createdAt,
          }));
          addDebugLog(`📧 Loaded ${conversationData.messages.length} messages for context.`);
        } catch (err) {
          addDebugLog(`❌ Error loading messages: ${err.message}`);
        }
        
        const newHistoryEntry = {
          text: comment, mode: mode, outputFormat: currentOutputFormat, selectedFormat: selectedFormat,
          hasFile: !!uploadedFile, fileName: uploadedFile?.name, timestamp: new Date().toISOString(),
          user: context.teammate?.username || 'Unknown user'
        };
        setCommentHistory(prev => { const updated = [newHistoryEntry, ...prev]; saveCommentHistoryToStorage(conversationId, updated); return updated; });

        if (mode === 'task' && clientSideTaskId) {
          const newTask = {
            id: clientSideTaskId, comment: comment, outputFormat: currentOutputFormat, selectedFormat: selectedFormat,
            hasFile: !!uploadedFile, fileName: uploadedFile?.name, status: 'pending',
            createdAt: new Date().toISOString(), user: context.teammate?.username || 'Unknown user'
          };
          setTaskResults(prev => { const updated = [newTask, ...prev]; saveTaskResultsToStorage(conversationId, updated); return updated; });
          addDebugLog(`💾 Task ${clientSideTaskId} stored locally. Status: pending.`);
          try {
            if (context.addLink) {
              const linkUrl = `https://app.airops.com/airops-2/workflows/84946/edit?taskId=${clientSideTaskId}`;
              const linkName = `⏳ AirOps Task: ${currentOutputFormat || 'Processing...'} ${uploadedFile ? '📎' : ''}`;
              await context.addLink(linkUrl, linkName);
              addDebugLog(`🔗 Pending task link added to Front for ${clientSideTaskId}`);
            }
          } catch (linkError) { addDebugLog(`❌ Error adding pending task link: ${linkError.message}`); }
        } else if (mode === 'email') {
            try {
                if (context.addLink) {
                    const linkUrl = `https://app.airops.com/airops-2/workflows/73407/edit`; 
                    const linkName = `✉️ AirOps Email: ${combinedInstructions.substring(0, 30)}...`;
                    await context.addLink(linkUrl, linkName);
                    addDebugLog('🔗 Email generation link added to Front conversation');
                }
            } catch (linkError) { addDebugLog(`❌ Error adding email link: ${linkError.message}`); }
        }
      }
      if (context?.draft) {
        conversationData.draft = { body: context.draft.body, subject: context.draft.subject };
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      addDebugLog(`🎯 Using ${mode} webhook: ${webhookUrl.split('?')[0]}...`);
      
      const payloadOptions = [ createSinglePayload(combinedInstructions, conversationData, clientSideTaskId) ];
      let response = null; let responseDataText = '';

      for (let i = 0; i < payloadOptions.length; i++) {
        const currentPayload = payloadOptions[i];
        try {
          addDebugLog(`🔄 Trying payload approach ${i + 1}/${payloadOptions.length}. Keys: ${typeof currentPayload === 'object' ? Object.keys(currentPayload) : 'string'}`);
          response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentPayload) });
          responseDataText = await response.text();
          addDebugLog(`📈 Approach ${i + 1} response status: ${response.status}`);
          if (response.ok) {
            addDebugLog(`✅ Payload approach ${i + 1} worked! Response (first 100 chars): ${responseDataText.substring(0,100)}`);
            break;
          } else {
            addDebugLog(`❌ Approach ${i + 1} failed: ${response.status} - ${responseDataText.substring(0, 100)}`);
            if (i === payloadOptions.length - 1) throw new Error(`All payload approaches failed. Last error (${response.status}): ${responseDataText}`);
          }
        } catch (error) {
          addDebugLog(`💥 Approach ${i + 1} fetch/network error: ${error.message}`);
          if (i === payloadOptions.length - 1) throw error;
        }
      }
      
      if (response && response.ok) {
        if (mode === 'email') { setStatus('Email instructions sent!'); }
        else { setStatus('Task created and polling started.');
          if (clientSideTaskId) {
            setPollingTasks(prev => new Set(prev).add(clientSideTaskId));
            addDebugLog(`⏳ Task ${clientSideTaskId} added to polling queue.`);
          }
        }
        setComment('');
        if (selectedFormat === 'custom') setOutputFormat(''); 
        setSelectedFormat(''); 
        removeFile();
      } else {
        setStatus('Request failed. See debug log.');
        addDebugLog('🔴 Webhook request ultimately failed.');
      }
    } catch (error) {
      addDebugLog(`💥 Error during request processing: ${error.message}`);
      setStatus('Error: ' + error.message.substring(0, 100) + (error.message.length > 100 ? '...' : ''));
    } finally {
      setIsSending(false); isProcessingRef.current = false;
      addDebugLog('🏁 Request processing finished.');
    }
  }, [
    comment, mode, outputFormat, selectedFormat, uploadedFile, context,
    addDebugLog, setStatus, createCombinedInstructions, createSinglePayload,
    setCommentHistory, saveCommentHistoryToStorage,
    setTaskResults, saveTaskResultsToStorage, setPollingTasks,
    setIsSending, setComment, setOutputFormat, setSelectedFormat, removeFile
  ]);

  const formatDate = useCallback((isoString) => {
    if (!isoString) return 'Date N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) { return String(isoString).substring(0,10); }
  }, []);

  const insertIntoDraft = useCallback((content) => {
    if (!context) {
        setStatus('Cannot insert: Front context not available.');
        addDebugLog('⚠️ Cannot insert: Front context not available.'); return;
    }
    const plainTextContent = typeof content === 'string' ? content.replace(/<[^>]*>/g, '') : '';
    if (context.insertTextIntoBody && (context.type === 'messageComposer' || context.type === 'messageViewer')) {
      context.insertTextIntoBody(plainTextContent);
      setStatus('Inserted into draft!'); addDebugLog('✅ Inserted content into draft.');
    } else if (context.createDraft && context.type === 'messageViewer') {
      context.createDraft({ content: { body: plainTextContent, type: 'text' } });
      setStatus('New draft created with content!'); addDebugLog('✅ New draft created with content.');
    } else {
      navigator.clipboard.writeText(plainTextContent)
        .then(() => { setStatus('Copied to clipboard!'); addDebugLog('📋 Content copied to clipboard.'); })
        .catch(() => { setStatus('Copy to clipboard failed.'); addDebugLog('🔴 Copy to clipboard failed.'); });
    }
  }, [context, setStatus, addDebugLog]);

  if (!context) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
        Loading AirOps Plugin context... If this persists, try reloading the plugin or Front.
      </div> 
    );
  }
  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{ padding: '16px', fontSize: textSizes.base, color: '#64748b', textAlign: 'center' }}>
        This plugin requires an active conversation context. Please select or open a conversation.
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      style={{
        width: `${cardSize.width}px`, height: `${cardSize.height}px`,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
        padding: '12px', fontSize: textSizes.base,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column',
        transition: isResizing || isTextareaResizing ? 'none' : 'width 0.2s ease, height 0.2s ease'
      }}
      className={`airops-app-container ${containerStyle}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: textSizes.header, fontWeight: '600', color: '#111827', flexShrink: 0 }}>
        <img src={AIROPS_LOGO_URL} alt="AirOps Logo" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
        <span>Send to AirOps</span>
        <span style={{ marginLeft: 'auto', fontSize: textSizes.tiny, color: '#94a3b8', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
          {containerStyle} {Math.round(cardSize.width)}×{Math.round(cardSize.height)}
        </span>
      </div>

      <div style={{ display: 'flex', marginBottom: '12px', background: '#f1f5f9', borderRadius: '6px', padding: '2px', flexShrink: 0 }}>
        {['email', 'task'].map(modeOption => (
            <button key={modeOption} onClick={() => setMode(modeOption)}
                style={{
                    flex: 1, padding: '6px 12px', border: 'none', borderRadius: '4px',
                    fontSize: textSizes.base, fontWeight: '500', cursor: 'pointer',
                    background: mode === modeOption ? 'white' : 'transparent',
                    color: mode === modeOption ? '#1e293b' : '#64748b',
                    boxShadow: mode === modeOption ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'background-color 0.2s, color 0.2s',
                }}>
                {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
            </button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '12px', minHeight: 0 }}>
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: '8px' }}>
          <textarea ref={textareaRef} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={mode === 'email' ? "How should we respond to this email?" : "Describe the task you need..."}
            rows={3}
            style={{
              width: '100%', height: `${textareaHeight}px`, padding: '8px 12px',
              border: '1px solid #d1d5db', borderRadius: '6px', fontSize: textSizes.base,
              fontFamily: 'inherit', resize: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              boxSizing: 'border-box', paddingBottom: '20px'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
          <div onMouseDown={handleTextareaResizeStart} title="Drag to resize vertically"
            style={{
              position: 'absolute', bottom: '1px', left: '1px', right: '1px', height: '16px',
              cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <div style={{ width: '30px', height: '4px', backgroundColor: '#cbd5e1', borderRadius: '2px', opacity: 0.7 }}/>
          </div>
        </div>

        {mode === 'task' && (
          <div style={{ marginBottom: '12px' }}>
            <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)} aria-label="Select output format"
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: textSizes.base, fontFamily: 'inherit',
                marginBottom: '8px', background: 'white', cursor: 'pointer', boxSizing: 'border-box',
              }}>
              {formatOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
            </select>
            {selectedFormat === 'custom' && (
              <input type="text" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="Enter custom format description (e.g., 'a poem')" aria-label="Custom output format description"
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                  borderRadius: '6px', fontSize: textSizes.base, fontFamily: 'inherit',
                  marginBottom: '8px', boxSizing: 'border-box',
                }}/>
            )}
            <div style={{ border: '1px dashed #d1d5db', borderRadius: '6px', padding: '12px', textAlign: 'center', background: '#fafafa' }}>
              <input ref={fileInputRef} type="file" id="fileUploadInput" onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg,.md" style={{ display: 'none' }} />
              {!uploadedFile ? (
                <div>
                  <button onClick={() => fileInputRef.current?.click()} type="button"
                    style={{
                      background: 'transparent', border: 'none', color: '#4f46e5',
                      fontSize: textSizes.base, cursor: 'pointer', textDecoration: 'underline', padding: 0,
                    }}>📎 Upload reference file</button>
                  <div style={{ fontSize: textSizes.small, color: '#6b7280', marginTop: '4px' }}>(Max 2MB: TXT, CSV, JSON, DOCX, PDF, images)</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: textSizes.base, color: '#374151', marginBottom: '6px', wordBreak: 'break-all' }}>
                    📎 {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}KB)
                  </div>
                  <button onClick={removeFile} type="button"
                    style={{
                      background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca',
                      borderRadius: '4px', fontSize: textSizes.small, padding: '4px 8px', cursor: 'pointer',
                    }}>Remove File</button>
                </div>
              )}
            </div>
          </div>
        )}

        {debugLog.length > 0 && (
          <details style={{ marginBottom: '8px', fontSize: textSizes.tiny }}>
            <summary style={{ cursor: 'pointer', color: '#64748b', fontWeight: '500' }}>🔍 Debug Log ({debugLog.length})</summary>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px', marginTop: '4px', maxHeight: '100px', overflowY: 'auto', lineHeight: '1.4' }}>
              {debugLog.map((log, index) => (<div key={index} style={{ color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log}</div>))}
            </div>
          </details>
        )}

        {(taskResults.length > 0 || commentHistory.length > 0) && (
          <Accordion expandMode="multi" initialExpanded={['tasks']}>
            {taskResults.length > 0 && (
              <AccordionSection id="tasks" title={`Tasks (${taskResults.filter(t => t.status !== 'completed' && t.status !== 'failed').length} active / ${taskResults.length} total)`}>
                <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                  {taskResults.slice(0, 5).map((task) => (
                    <div key={task.id} style={{ background: task.status === 'failed' ? '#fff1f2' : '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '6px', padding: '8px', marginBottom: '6px', fontSize: textSizes.small }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span>{task.status === 'pending' || task.status === 'processing' ? '⏳' : (task.status === 'completed' ? '✅' : '❌')}</span>
                        <span style={{ flex: 1, color: '#475569', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.selectedFormat ? formatOptions.find(f => f.value === task.selectedFormat)?.label.replace(/[•📊📄✅📋📅✏️{}]/g, '').trim() : task.outputFormat}
                          {task.hasFile && ' 📎'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: textSizes.tiny, whiteSpace: 'nowrap' }}>{formatDate(task.createdAt)}</span>
                      </div>
                      {(task.result || (task.status === 'failed' && !task.result)) && (
                        <div style={{ position: 'relative' }}>
                          <div style={{ fontSize: textSizes.small, color: task.status === 'failed' ? '#991b1b' : '#475569', background: 'white', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', maxHeight: '80px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: task.result || (task.status === 'failed' ? 'Task failed without specific error message.' : '') }} />
                          {task.status === 'completed' && task.result && (
                            <button onClick={() => insertIntoDraft(task.result)} title="Insert result into draft"
                              style={{ position: 'absolute', top: '4px', right: '4px', background: '#64748b', color: 'white', border: 'none', borderRadius: '3px', fontSize: textSizes.tiny, padding: '2px 6px', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.8}>Insert</button>
                          )}
                        </div>
                      )}
                      {task.status === 'pending' && pollingTasks.has(task.id) && (<div style={{fontSize: textSizes.tiny, color: '#555', marginTop: '4px'}}>Polling for updates...</div>)}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}
            {commentHistory.length > 0 && (
              <AccordionSection id="history" title={`Submission History (${commentHistory.length})`}>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {commentHistory.slice(0, 5).map((entry, index) => (
                    <div key={entry.timestamp + index} style={{ padding: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '4px', marginBottom: '4px', fontSize: textSizes.small }}>
                      <div style={{ color: '#94a3b8', marginBottom: '2px', fontSize: textSizes.tiny, fontWeight: '500' }}>
                        {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️ Email' : '📋 Task'}
                        {entry.hasFile && ` • 📎 ${entry.fileName.substring(0,15)}...`}
                      </div>
                      <div style={{ color: '#475569', lineHeight: 1.3, fontSize: textSizes.small, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '4em', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.text}>{entry.text}</div>
                      {entry.outputFormat && (<div style={{ fontSize: textSizes.tiny, color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>Format: {entry.outputFormat}</div>)}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}
          </Accordion>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', flexShrink: 0 }}>
        <button onClick={processRequest}
          disabled={isSending || !comment.trim() || (mode === 'task' && !(selectedFormat === 'custom' ? outputFormat.trim() : selectedFormat))}
          type="button"
          style={{
            width: '100%', background: (isSending || !comment.trim() || (mode === 'task' && !(selectedFormat === 'custom' ? outputFormat.trim() : selectedFormat))) ? '#9ca3af' : '#1f2937',
            color: 'white', border: 'none', borderRadius: '6px', padding: '10px', fontSize: textSizes.base, fontWeight: '500',
            cursor: (isSending || !comment.trim() || (mode === 'task' && !(selectedFormat === 'custom' ? outputFormat.trim() : selectedFormat))) ? 'not-allowed' : 'pointer',
            marginBottom: '8px', transition: 'background-color 0.15s ease',
            opacity: (isSending || !comment.trim() || (mode === 'task' && !(selectedFormat === 'custom' ? outputFormat.trim() : selectedFormat))) ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!e.target.disabled) e.target.style.background = '#374151'; }}
          onMouseLeave={(e) => { if (!e.target.disabled) e.target.style.background = '#1f2937'; }}>
          {isSending ? 'Processing...' : (mode === 'email' ? 'Send Email Instructions' : 'Create Task')}
        </button>
        {status && (
          <div style={{ padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: textSizes.small, color: '#64748b', textAlign: 'center', minHeight: '2.5em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{status}</div>
        )}
      </div>

      <div onMouseDown={handleCardResizeStart} title="Drag to resize card"
        style={{
          position: 'absolute', bottom: '2px', right: '2px', width: '14px', height: '14px', cursor: 'nwse-resize',
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, #9ca3af 4px, #9ca3af 5px)`,
          opacity: 0.5, borderRadius: '0 0 6px 0', transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.9'} onMouseLeave={(e) => e.target.style.opacity = '0.5'} />
    </div>
  );
}

export default App;