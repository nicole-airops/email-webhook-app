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
  // Prevent multiple calls
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  
  // Auto-resize state
  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const cardRef = useRef(null);
  const textareaRef = useRef(null);
  const textareaContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // UPDATED URLs with correct UUID format
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/f124518f-2185-4e62-9520-c6ff0fc3fcb0/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/a628c7d4-6b22-42af-9ded-fb01839d5e06/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
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
      loadHistoryFromNetlify(conversationId);
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

  // COMPLETE NESTED PAYLOAD CREATOR
  const createCompletePayload = async (combinedInstructions, taskId = null) => {
    const timestamp = new Date().toISOString();
    
    // Gather ALL conversation data
    let conversationData = {};
    let messagesData = [];
    
    if (context?.conversation) {
      // Basic conversation info
      conversationData = {
        id: context.conversation.id,
        subject: context.conversation.subject || 'No Subject',
        status: context.conversation.status,
        created_at: context.conversation.created_at,
        updated_at: context.conversation.updated_at,
        tags: context.conversation.tags || [],
        assignee: context.conversation.assignee,
        recipient: context.conversation.recipient,
        participants: context.conversation.participants || [],
        channel: context.conversation.channel,
        priority: context.conversation.priority,
        is_private: context.conversation.is_private,
        folder: context.conversation.folder
      };
      
      // Load ALL messages with full context
      try {
        const messages = await context.listMessages();
        messagesData = messages.results.map(msg => ({
          id: msg.id,
          type: msg.type,
          body: msg.body,
          subject: msg.subject,
          author: {
            id: msg.author?.id,
            name: msg.author?.name,
            email: msg.author?.email,
            role: msg.author?.role
          },
          recipients: msg.recipients || [],
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          is_inbound: msg.is_inbound,
          is_draft: msg.is_draft,
          attachments: msg.attachments || [],
          metadata: msg.metadata || {}
        }));
        
      } catch (err) {
        messagesData = [];
      }
    }
    
    // Get current draft context (for composer)
    let draftData = null;
    if (context?.draft) {
      draftData = {
        body: context.draft.body,
        subject: context.draft.subject,
        to: context.draft.to,
        cc: context.draft.cc,
        bcc: context.draft.bcc,
        reply_options: context.draft.reply_options
      };
    }
    
    // Get user/teammate info
    const teammateData = context?.teammate ? {
      id: context.teammate.id,
      name: context.teammate.name,
      email: context.teammate.email,
      role: context.teammate.role,
      avatar_url: context.teammate.avatar_url,
      timezone: context.teammate.timezone
    } : null;
    
    // Create the COMPLETE nested payload
    const completePayload = {
      airops_request: {
        // Primary instruction combining everything
        combined_instructions: combinedInstructions,
        
        // Request metadata
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type, // 'messageComposer' or 'singleConversation'
          task_id: taskId,
          user_agent: navigator.userAgent,
          plugin_version: "1.0.0"
        },
        
        // User making the request
        requesting_user: teammateData,
        
        // Output format details
        output_specification: {
          selected_format: selectedFormat,
          custom_format: outputFormat,
          format_label: selectedFormat ? formatOptions.find(f => f.value === selectedFormat)?.label : null,
          raw_instructions: comment,
          has_custom_format: selectedFormat === 'custom'
        },
        
        // File attachment with full context
        attached_file: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          size_formatted: `${(uploadedFile.size / 1024).toFixed(1)}KB`,
          last_modified: uploadedFile.lastModified ? new Date(uploadedFile.lastModified).toISOString() : null,
          content_preview: uploadedFile.preview || null,
          has_preview: !!uploadedFile.preview,
          is_text_file: uploadedFile.type?.startsWith('text/') || uploadedFile.name?.match(/\.(txt|csv|json|md)$/i)
        } : null,
        
        // Complete Front conversation context
        front_conversation: {
          // Basic conversation details
          conversation: conversationData,
          
          // All messages in the conversation
          messages: messagesData,
          
          // Current draft (if in composer)
          current_draft: draftData,
          
          // Conversation stats
          stats: {
            total_messages: messagesData.length,
            inbound_messages: messagesData.filter(m => m.is_inbound).length,
            outbound_messages: messagesData.filter(m => !m.is_inbound).length,
            draft_messages: messagesData.filter(m => m.is_draft).length,
            has_attachments: messagesData.some(m => m.attachments && m.attachments.length > 0),
            participants_count: conversationData.participants?.length || 0,
            tags_count: conversationData.tags?.length || 0
          },
          
          // Most recent message for context
          latest_message: messagesData.length > 0 ? messagesData[0] : null,
          
          // Original message (last in chronological order)
          original_message: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
        },
        
        // Request history context
        request_history: {
          previous_requests: commentHistory.slice(0, 5).map(entry => ({
            text: entry.text,
            mode: entry.mode,
            output_format: entry.outputFormat,
            selected_format: entry.selectedFormat,
            had_file: entry.hasFile,
            file_name: entry.fileName,
            timestamp: entry.timestamp,
            user: entry.user
          })),
          total_requests: commentHistory.length,
          recent_tasks: taskResults.slice(0, 3).map(task => ({
            id: task.id,
            status: task.status,
            output_format: task.outputFormat,
            created_at: task.createdAt,
            completed_at: task.completedAt,
            had_file: task.hasFile,
            user: task.user
          }))
        },
        
        // Additional context for AI processing
        ai_context_hints: {
          conversation_subject: conversationData.subject,
          is_reply_context: !!draftData,
          has_file_attachment: !!uploadedFile,
          conversation_length: messagesData.length,
          is_multi_participant: (conversationData.participants?.length || 0) > 2,
          has_tags: (conversationData.tags?.length || 0) > 0,
          conversation_age_hours: conversationData.created_at ? 
            Math.round((new Date() - new Date(conversationData.created_at)) / (1000 * 60 * 60)) : null,
          latest_message_age_hours: messagesData.length > 0 && messagesData[0].created_at ?
            Math.round((new Date() - new Date(messagesData[0].created_at)) / (1000 * 60 * 60)) : null
        }
      }
    };
    
    return completePayload;
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

  // Load history from Netlify Blobs storage
  const loadHistoryFromNetlify = async (conversationId) => {
    try {
      const response = await fetch(`/api/get-conversation-history?conversationId=${conversationId}`);
      if (response.ok) {
        const { history } = await response.json();
        setCommentHistory(history || []);
      } else {
        setCommentHistory([]);
      }
    } catch (error) {
      console.error('Error loading history from Netlify:', error);
      setCommentHistory([]);
    }
  };

  // Save history to Netlify Blobs storage
  const saveHistoryToNetlify = async (conversationId, entry) => {
    try {
      const response = await fetch('/api/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, entry })
      });
      
      if (response.ok) {
        setStatus('Request saved!');
      } else {
        console.error('Failed to save history to Netlify');
      }
    } catch (error) {
      console.error('Error saving to Netlify:', error);
    }
  };

  // Load task results from Front context
  const loadTaskResultsFromFrontContext = async () => {
    try {
      if (context && context.conversation) {
        const messages = await context.listMessages();
        const taskEntries = [];
        
        // Look for task results in conversation
        messages.results.forEach(message => {
          if (message.body && message.body.includes('✅ AirOps Task Result:')) {
            const taskMatch = message.body.match(/Task ID: (\w+)/);
            if (taskMatch) {
              taskEntries.push({
                id: taskMatch[1],
                status: 'completed',
                result: message.body,
                completedAt: message.created_at
              });
            }
          }
        });
        
        setTaskResults(taskEntries);
      }
    } catch (error) {
      console.error('Error loading task results from Front:', error);
      setTaskResults([]);
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
          
          // Save completion to Front conversation
          try {
            if (context.addLink && context.conversation) {
              const completedTask = updatedTasks.find(t => t.id === taskId);
              const linkUrl = `https://app.airops.com/airops-2/workflows/84946/results?taskId=${taskId}`;
              const linkName = `✅ AirOps Result: ${completedTask?.outputFormat || 'Task'} - Completed`;
              
              await context.addLink({
                url: linkUrl,
                name: linkName,
                description: `Task ${taskId} completed: ${result.data?.substring(0, 200)}...`
              });
              
              addDebugLog('🔗 Completion link added to Front conversation');
            }
          } catch (linkError) {
            addDebugLog(`❌ Error adding completion link: ${linkError.message}`);
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed and saved!');
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
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      const combinedInstructions = createCombinedInstructions();
      
      // Create COMPLETE nested payload with ALL context
      const completePayload = await createCompletePayload(combinedInstructions, taskId);
      
      // Save request to Netlify storage
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
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
        
        // Save to Netlify storage
        await saveHistoryToNetlify(conversationId, newEntry);
        
        // Update local state
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);

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
          
          try {
            await fetch('/api/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
          } catch (blobError) {
            console.error('Error storing task in Netlify Blobs:', blobError);
          }
          
          setPollingTasks(prev => new Set([...prev, taskId]));
        }
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      // Send the complete nested payload
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(completePayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (mode === 'email') {
        setStatus('Email sent successfully!');
      } else {
        setStatus('Task created successfully!');
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
      setStatus('Error: ' + error.message);
    } finally {
      setIsSending(false);
      isProcessingRef.current = false;
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
                </div>
              )}
            </div>
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
                title={`Plugin History (${commentHistory.length})`}
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
                        {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'} • {entry.user}
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