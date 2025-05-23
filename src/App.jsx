import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import { Accordion, AccordionSection } from '@frontapp/ui-kit';
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
  
  // Resize state
  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const cardRef = useRef(null);
  const textareaRef = useRef(null);
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

  // Detect if we're in composer or sidebar
  const isComposer = context?.type === 'messageComposer';
  const containerStyle = isComposer ? 'composer' : 'sidebar';

  // Adaptive sizing based on context
  const getContainerSize = () => {
    if (isComposer) {
      return { width: Math.min(380, cardSize.width), height: Math.min(500, cardSize.height) };
    } else {
      return { width: Math.min(340, cardSize.width), height: Math.min(600, cardSize.height) };
    }
  };

  const containerSize = getContainerSize();

  // Adaptive text size
  const getAdaptiveTextSize = () => {
    const baseSize = Math.max(11, Math.min(14, containerSize.width / 28));
    return {
      base: `${baseSize}px`,
      small: `${baseSize - 1}px`,
      tiny: `${baseSize - 2}px`,
      header: `${baseSize + 1}px`
    };
  };

  const textSizes = getAdaptiveTextSize();

  // Card resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const newWidth = Math.max(300, e.clientX - rect.left);
      const newHeight = Math.max(350, e.clientY - rect.top);
      
      setCardSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Textarea resize functionality
  const handleTextareaResize = (direction) => {
    const increment = 20;
    if (direction === 'up') {
      setTextareaHeight(prev => Math.max(40, prev - increment));
    } else {
      setTextareaHeight(prev => Math.min(200, prev + increment));
    }
  };

  useEffect(() => {
    const conversationId = context?.conversation?.id;
    if (conversationId) {
      loadCommentHistoryFromStorage(conversationId);
      loadTaskResultsFromStorage(conversationId);
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
        };
        reader.readAsText(file);
      } else {
        setUploadedFile(fileData);
        setStatus('File uploaded successfully');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus('File upload failed');
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatus('File removed');
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
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed!');
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
  };

  const insertIntoDraft = (content) => {
    if (context && context.draft && typeof context.insertTextIntoBody === 'function') {
      context.insertTextIntoBody(content);
      setStatus('Inserted into draft!');
    } else if (context && typeof context.createDraft === 'function') {
      context.createDraft({
        content: {
          body: content,
          type: 'text'
        }
      });
      setStatus('Draft created!');
    } else {
      navigator.clipboard.writeText(content).then(() => {
        setStatus('Copied to clipboard!');
      }).catch(() => {
        setStatus('Copy failed');
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
      const callbackUrl = taskId ? `${window.location.origin}/api/task-callback` : null;
      
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
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);
        saveCommentHistoryToStorage(conversationId, updatedHistory);

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
            addDebugLog('💾 Task stored in Netlify');
          } catch (blobError) {
            addDebugLog(`❌ Error storing task: ${blobError.message}`);
            console.error('Error storing task in Netlify Blobs:', blobError);
          }
          
          setPollingTasks(prev => new Set([...prev, taskId]));
        }
      }
      
      if (context?.draft) {
        conversationData.draft = {
          body: context.draft.body,
          subject: context.draft.subject
        };
      }
      
      if (context?.teammate) {
        conversationData.teammate = context.teammate;
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      addDebugLog(`🎯 Using ${mode} webhook`);
      
      // SINGLE PAYLOAD CONSTRUCTION
      const payload = {
        frontData: conversationData,
        contextType: context?.type,
        userComment: combinedInstructions,
        mode: mode,
        ...(taskId && { taskId: taskId }),
        ...(callbackUrl && { callbackUrl: callbackUrl }),
        ...(uploadedFile && { 
          fileReference: {
            name: uploadedFile.name,
            type: uploadedFile.type,
            size: uploadedFile.size,
            preview: uploadedFile.preview
          }
        })
      };
      
      addDebugLog(`📦 Payload size: ${JSON.stringify(payload).length} chars`);
      console.log('🔍 EXACT PAYLOAD BEING SENT:', payload);
      
      // SINGLE WEBHOOK CALL
      addDebugLog('📡 Making webhook call...');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      addDebugLog(`📈 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog(`❌ Webhook error: ${errorText}`);
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.text();
      addDebugLog(`✅ Success: ${responseData.substring(0, 50)}...`);
      
      if (mode === 'email') {
        setStatus('Sent!');
      } else {
        setStatus('Task created! Processing...');
      }
      
      setComment('');
      setOutputFormat('');
      setSelectedFormat('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
        day: 'numeric'
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
        width: `${containerSize.width}px`,
        height: `${containerSize.height}px`,
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
        flexDirection: 'column'
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
          {containerStyle}
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
        {/* Instructions Textarea with resize controls */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
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
              paddingBottom: '28px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          
          {/* Textarea resize controls */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => handleTextareaResize('up')}
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: textSizes.tiny,
                cursor: 'pointer',
                color: '#374151'
              }}
              title="Make smaller"
            >
              ↕−
            </button>
            <button
              onClick={() => handleTextareaResize('down')}
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: textSizes.tiny,
                cursor: 'pointer',
                color: '#374151'
              }}
              title="Make larger"
            >
              ↕+
            </button>
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

        {/* Results using Accordion */}
        {(taskResults.length > 0 || commentHistory.length > 0) && (
          <Accordion expandMode="multi">
            {taskResults.length > 0 && (
              <AccordionSection
                id="tasks"
                title={`Tasks (${taskResults.length})`}
              >
                <div>
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
              </AccordionSection>
            )}

            {commentHistory.length > 0 && (
              <AccordionSection
                id="history"
                title={`History (${commentHistory.length})`}
              >
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {commentHistory.slice(0, 3).map((entry, index) => (
                    <div key={index} style={{
                      padding: '6px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: textSizes.small
                    }}>
                      <div style={{ 
                        color: '#94a3b8', 
                        marginBottom: '2px',
                        fontSize: textSizes.tiny,
                        fontWeight: '500'
                      }}>
                        {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'}
                        {entry.hasFile && ' 📎'}
                      </div>
                      <div style={{ 
                        color: '#475569', 
                        lineHeight: 1.3,
                        fontSize: textSizes.small
                      }}>
                        {entry.text}
                      </div>
                      {entry.outputFormat && (
                        <div style={{ 
                          fontSize: textSizes.tiny,
                          color: '#94a3b8',
                          fontStyle: 'italic',
                          marginTop: '2px'
                        }}>
                          Format: {entry.selectedFormat ? formatOptions.find(f => f.value === entry.selectedFormat)?.label || entry.outputFormat : entry.outputFormat}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}
          </Accordion>
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
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: textSizes.small,
            color: '#64748b',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Card Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
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