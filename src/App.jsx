import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import { 
  Accordion, 
  AccordionSection,
  Button,
  ButtonGroup,
  FormField,
  Select,
  SelectItem,
  Task,
  ActionMenu,
  ActionMenuItem,
  ActionMenuItemSpacer,
  Tooltip
} from '@frontapp/ui-kit';
import {
  SuccessIcon,
  WarningIcon,
  TaskIcon,
  EmailIcon,
  AttachmentIcon,
  CopyIcon,
  ViewIcon,
  UploadIcon,
  DocumentIcon,
  InsertIcon,
  CheckmarkIcon,
  CrossIcon
} from './CustomIcons';
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
  
  // Auto-resize state
  const [cardSize, setCardSize] = useState({ width: 340, height: 420 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(80);
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Refs for functionality
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const textareaContainerRef = useRef(null);
  
  // WEBHOOK URLs - Single definition
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/f124518f-2185-4e62-9520-c6ff0fc3fcb0/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/a628c7d4-6b22-42af-9ded-fb01839d5e06/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Mode options for ButtonGroup
  const modeOptions = [
    { title: 'Email', value: 'email' },
    { title: 'Task', value: 'task' }
  ];
  
  // Format options for Select
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'text', label: 'Text' },
    { value: 'table', label: 'Table' }
  ];

  // Styling configuration
  const styles = {
    fontSize: {
      base: 12,
      small: 11,
      tiny: 10,
      header: 14
    },
    colors: {
      primary: '#1f2937',
      secondary: '#4b5563',
      tertiary: '#9ca3af',
      background: '#f9fafb',
      border: '#e5e7eb',
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6'
    }
  };

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

  // Detect container size changes and auto-resize card responsively
  useEffect(() => {
    const observeContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const updateSize = () => {
        const rect = parent.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Auto-resize card to fit container with padding
        const newWidth = Math.max(280, containerWidth - 8);
        const newHeight = Math.max(350, containerHeight - 8);
        
        setContainerSize({ width: containerWidth, height: containerHeight });
        setCardSize({ width: newWidth, height: newHeight });
      };
      
      // Initial size
      updateSize();
      
      // Use ResizeObserver for real-time responsiveness
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateSize);
        });
        resizeObserver.observe(parent);
        
        // Also listen to window resize
        window.addEventListener('resize', updateSize);
        
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', updateSize);
        };
      } else {
        // Fallback with frequent polling for older browsers
        const handleResize = () => requestAnimationFrame(updateSize);
        window.addEventListener('resize', handleResize);
        
        const interval = setInterval(updateSize, 100);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          clearInterval(interval);
        };
      }
    };
    
    const cleanup = observeContainerSize();
    return cleanup;
  }, []);

  // Manual drag resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && !isTextareaResizing) {
        const parent = cardRef.current?.parentElement;
        if (!parent) return;
        
        const parentRect = parent.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();
        
        // Calculate new size based on mouse position relative to card start
        const newWidth = Math.max(280, Math.min(parentRect.width - 8, e.clientX - cardRect.left));
        const newHeight = Math.max(350, Math.min(parentRect.height - 8, e.clientY - cardRect.top));
        
        setCardSize({ width: newWidth, height: newHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const newHeight = Math.max(40, Math.min(200, e.clientY - rect.top));
          setTextareaHeight(newHeight);
        }
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
  }, [isResizing, isTextareaResizing]);

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

  // Check for completed tasks from webhook notifications
  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed' || result.status === 'failed') {
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { ...task, status: result.status, result: result.data, completedAt: result.completedAt }
              : task
          );
          
          setTaskResults(updatedTasks);
          
          // Save completed task to Netlify
          try {
            if (context.addLink && context.conversation) {
              const completedTask = updatedTasks.find(t => t.id === taskId);
              const linkUrl = `https://app.airops.com/airops-2/workflows/84946/results?taskId=${taskId}`;
              const linkName = `✅ AirOps Result: ${completedTask?.outputFormat || 'Task'} - ${result.status}`;
              
              await context.addLink({
                url: linkUrl,
                name: linkName,
                description: `Task ${taskId} ${result.status}: ${result.data?.substring(0, 200)}...`
              });
            }
          } catch (linkError) {
            console.error('Error adding completion link:', linkError);
          }
          
          // Stop polling this task
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus(`Task ${result.status}!`);
          return true; // Task completed
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
    return false; // Task still pending
  };

  // Smart polling system
  useEffect(() => {
    if (pollingTasks.size > 0) {
      const checkAllTasks = async () => {
        const tasksToCheck = Array.from(pollingTasks);
        console.log(`🔄 Checking ${tasksToCheck.length} tasks for updates...`);
        
        // Check all tasks concurrently
        const promises = tasksToCheck.map(taskId => checkTaskStatus(taskId));
        await Promise.all(promises);
      };
      
      // Initial check after 5 seconds
      const initialTimeout = setTimeout(checkAllTasks, 5000);
      
      // Then check every 15 seconds
      const interval = setInterval(checkAllTasks, 15000);
      
      return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
      };
    }
  }, [pollingTasks, taskResults]);

  useEffect(() => {
    if (selectedFormat) {
      const selected = formatOptions.find(opt => opt.value === selectedFormat);
      if (selected) {
        setOutputFormat(selected.label);
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
    const callbackUrl = taskId ? `${window.location.origin}/.netlify/functions/task-completion-webhook` : null;
    
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
        
        // SEPARATE output format specification
        output_format: {
          selected_format: selectedFormat,
          format_label: selectedFormat ? formatOptions.find(f => f.value === selectedFormat)?.label : null,
          raw_instructions: comment
        },
        
        // SEPARATE file attachment specification
        attachment: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          size_formatted: `${(uploadedFile.size / 1024).toFixed(1)}KB`,
          last_modified: uploadedFile.lastModified ? new Date(uploadedFile.lastModified).toISOString() : null,
          content_preview: uploadedFile.preview || null,
          has_preview: !!uploadedFile.preview,
          is_text_file: uploadedFile.type?.startsWith('text/') || uploadedFile.name?.match(/\.(txt|csv|json|md)$/i)
        } : null,
        
        // Request metadata
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type,
          task_id: taskId,
          callback_url: callbackUrl,
          user_agent: navigator.userAgent,
          plugin_version: "1.0.0"
        },
        
        // User making the request
        requesting_user: teammateData,
        
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
      const response = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
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
      const response = await fetch('/.netlify/functions/save-conversation-history', {
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

  const copyToClipboard = (content) => {
    // Strip HTML tags and get clean text
    const cleanContent = content.replace(/<[^>]*>/g, '');
    
    navigator.clipboard.writeText(cleanContent).then(() => {
      setStatus('Copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = cleanContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setStatus('Copied to clipboard!');
      } catch (err) {
        setStatus('Copy failed');
      }
    });
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

    if (mode === 'task' && !selectedFormat) {
      setStatus('Select output format');
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
            await fetch('/.netlify/functions/store-task', {
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
        setStatus(`Task created successfully! (ID: ${taskId?.substring(0, 8)}...)`);
        console.log(`✅ Task created: ${taskId}`);
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
        color: styles.colors.tertiary,
        fontSize: textSizes.base
      }}>
        Loading context...
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: '16px',
        color: styles.colors.secondary,
        textAlign: 'center',
        fontSize: textSizes.base
      }}>
        Select a conversation to use this plugin
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className="airops-plugin-card"
      style={{
        width: `${cardSize.width}px`,
        height: `${cardSize.height}px`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '280px',
        minHeight: '350px',
        maxWidth: '100%',
        maxHeight: '100%',
        background: 'white',
        border: `1px solid ${styles.colors.border}`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontSize: textSizes.base,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: isResizing ? 'none' : 'width 0.1s ease, height 0.1s ease'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: textSizes.header,
        fontWeight: '600',
        color: styles.colors.primary
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ width: '16px', height: '16px', marginRight: '8px' }}
        />
        <span>Send to AirOps</span>
      </div>

      {/* Mode Selection */}
      <div style={{ marginBottom: '12px' }}>
        <ButtonGroup
          items={modeOptions}
          value={mode}
          onItemSelected={setMode}
        />
      </div>
      
      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '4px',
        marginBottom: '12px'
      }}>
        {/* Instructions Input */}
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: '12px' }}>
          <FormField label="Instructions" required>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={mode === 'email' ? "How should we respond?" : "What do you need?"}
              style={{
                width: '100%',
                height: `${textareaHeight}px`,
                padding: '8px 12px',
                border: `1px solid ${styles.colors.border}`,
                borderRadius: '6px',
                fontSize: textSizes.base,
                fontFamily: 'inherit',
                resize: 'none',
                paddingBottom: '20px',
                background: 'white',
                color: styles.colors.primary
              }}
              onFocus={(e) => e.target.style.borderColor = styles.colors.info}
              onBlur={(e) => e.target.style.borderColor = styles.colors.border}
            />
          </FormField>
          
          {/* Textarea drag resize handle */}
          <div
            onMouseDown={handleTextareaResizeStart}
            className="textarea-resize-handle"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '8px',
              left: '8px',
              height: '12px',
              cursor: 'ns-resize',
              background: `linear-gradient(90deg, transparent 30%, ${styles.colors.border} 30%, ${styles.colors.border} 35%, transparent 35%, transparent 65%, ${styles.colors.border} 65%, ${styles.colors.border} 70%, transparent 70%)`,
              backgroundSize: '8px 2px',
              opacity: 0.3,
              borderRadius: '0 0 4px 4px',
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Drag to resize"
          >
            <div style={{
              width: '20px',
              height: '3px',
              background: styles.colors.tertiary,
              borderRadius: '2px'
            }} />
          </div>
        </div>

        {/* Task Mode Controls */}
        {mode === 'task' && (
          <div style={{ marginBottom: '12px' }}>
            <FormField label="Output Format" required>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${styles.colors.border}`,
                  borderRadius: '6px',
                  fontSize: textSizes.base,
                  fontFamily: 'inherit',
                  background: 'white',
                  cursor: 'pointer',
                  color: styles.colors.primary
                }}
              >
                {formatOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* File Upload */}
            <div style={{
              border: `1px dashed ${styles.colors.border}`,
              borderRadius: '6px',
              padding: '12px',
              textAlign: 'center',
              background: styles.colors.background,
              marginTop: '8px'
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
                  <Button
                    type="secondary"
                    onPress={() => fileInputRef.current?.click()}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      color: styles.colors.info,
                      textDecoration: 'underline',
                      fontSize: textSizes.base,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <UploadIcon size={14} color={styles.colors.info} style={{ marginRight: '6px' }} />
                    Upload reference file
                  </Button>
                  <div style={{ 
                    fontSize: textSizes.small, 
                    color: styles.colors.tertiary, 
                    marginTop: '4px' 
                  }}>
                    CSV, JSON, TXT, DOC, PDF, images (max 2MB)
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    fontSize: textSizes.base, 
                    color: styles.colors.primary, 
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AttachmentIcon size={14} color={styles.colors.secondary} style={{ marginRight: '6px' }} />
                    {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}KB)
                  </div>
                  <Button
                    type="danger"
                    onPress={removeFile}
                    style={{
                      fontSize: textSizes.small,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CrossIcon size={12} color="white" style={{ marginRight: '4px' }} />
                    Remove
                  </Button>
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
                    <div
                      key={task.id}
                      style={{
                        background: styles.colors.background,
                        border: `1px solid ${styles.colors.border}`,
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                        fontSize: textSizes.small
                      }}
                    >
                      {/* Task Header */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '8px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          {task.status === 'pending' ? (
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              marginRight: '8px',
                              border: `2px solid ${styles.colors.info}`,
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          ) : task.status === 'completed' ? (
                            <CheckmarkIcon size={16} color={styles.colors.success} style={{ marginRight: '8px' }} />
                          ) : (
                            <WarningIcon size={16} color={styles.colors.error} style={{ marginRight: '8px' }} />
                          )}
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              color: styles.colors.primary,
                              fontWeight: '500',
                              fontSize: textSizes.base
                            }}>
                              {task.selectedFormat ? 
                                formatOptions.find(f => f.value === task.selectedFormat)?.label || task.outputFormat 
                                : task.outputFormat
                              }
                              {task.hasFile && (
                                <AttachmentIcon 
                                  size={12} 
                                  color={styles.colors.tertiary} 
                                  style={{ marginLeft: '6px' }} 
                                />
                              )}
                            </div>
                            <div style={{ 
                              color: styles.colors.tertiary, 
                              fontSize: textSizes.tiny,
                              marginTop: '2px'
                            }}>
                              {formatDate(task.createdAt)} • {task.user}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Task Status */}
                      <div style={{
                        padding: '6px 8px',
                        background: task.status === 'completed' ? 
                          `${styles.colors.success}15` : 
                          task.status === 'failed' ? 
                          `${styles.colors.error}15` : 
                          `${styles.colors.info}15`,
                        border: `1px solid ${
                          task.status === 'completed' ? 
                          styles.colors.success : 
                          task.status === 'failed' ? 
                          styles.colors.error : 
                          styles.colors.info
                        }`,
                        borderRadius: '4px',
                        fontSize: textSizes.tiny,
                        color: task.status === 'completed' ? 
                          styles.colors.success : 
                          task.status === 'failed' ? 
                          styles.colors.error : 
                          styles.colors.info,
                        marginBottom: task.result ? '8px' : '0'
                      }}>
                        {task.status === 'pending' && 'Processing your request...'}
                        {task.status === 'completed' && 'Task completed successfully'}
                        {task.status === 'failed' && 'Task failed to complete'}
                      </div>

                      {/* Task Result Content */}
                      {task.result && (
                        <div>
                          <div style={{
                            background: 'white',
                            border: `1px solid ${styles.colors.border}`,
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            fontSize: textSizes.small,
                            lineHeight: '1.4'
                          }}>
                            <div 
                              dangerouslySetInnerHTML={{ __html: task.result }}
                              style={{ 
                                color: styles.colors.primary,
                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                  marginTop: '8px',
                                  marginBottom: '4px',
                                  fontWeight: '600'
                                },
                                '& p': {
                                  marginBottom: '8px'
                                },
                                '& ul, & ol': {
                                  marginLeft: '16px',
                                  marginBottom: '8px'
                                },
                                '& li': {
                                  marginBottom: '2px'
                                }
                              }}
                            />
                          </div>
                          
                          {/* Action Buttons */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <Button
                              type="secondary"
                              onPress={() => copyToClipboard(task.result)}
                              style={{
                                padding: '6px 12px',
                                fontSize: textSizes.small,
                                minHeight: 'auto',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <CopyIcon size={12} color={styles.colors.secondary} style={{ marginRight: '4px' }} />
                              Copy
                            </Button>
                            <Button
                              type="secondary"
                              onPress={() => insertIntoDraft(task.result.replace(/<[^>]*>/g, ''))}
                              style={{
                                padding: '6px 12px',
                                fontSize: textSizes.small,
                                minHeight: 'auto',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <InsertIcon size={12} color={styles.colors.secondary} style={{ marginRight: '4px' }} />
                              Insert
                            </Button>
                            <Button
                              type="secondary"
                              onPress={() => {
                                // Show full result in a modal or expanded view
                                const newWindow = window.open('', '_blank');
                                newWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>AirOps Task Result</title>
                                      <style>
                                        body { 
                                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                          max-width: 800px; 
                                          margin: 40px auto; 
                                          padding: 20px; 
                                          line-height: 1.6; 
                                        }
                                        h1, h2, h3 { color: #1f2937; }
                                        p { margin-bottom: 16px; }
                                        ul, ol { margin-left: 20px; margin-bottom: 16px; }
                                        li { margin-bottom: 4px; }
                                        table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
                                        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
                                        th { background-color: #f9fafb; font-weight: 600; }
                                      </style>
                                    </head>
                                    <body>
                                      <h1>AirOps Task Result</h1>
                                      <p><strong>Format:</strong> ${task.outputFormat}</p>
                                      <p><strong>Created:</strong> ${formatDate(task.createdAt)}</p>
                                      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                                      ${task.result}
                                    </body>
                                  </html>
                                `);
                                newWindow.document.close();
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: textSizes.small,
                                minHeight: 'auto',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <ViewIcon size={12} color={styles.colors.secondary} style={{ marginRight: '4px' }} />
                              Expand
                            </Button>
                          </div>
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
                      background: styles.colors.background,
                      border: `1px solid ${styles.colors.border}`,
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: textSizes.small
                    }}>
                      <div style={{ 
                        color: styles.colors.tertiary, 
                        marginBottom: '2px',
                        fontSize: textSizes.tiny,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <span>{formatDate(entry.timestamp)} • </span>
                        <span style={{ margin: '0 4px', display: 'flex', alignItems: 'center' }}>
                          {entry.mode === 'email' ? (
                            <EmailIcon size={12} color={styles.colors.tertiary} />
                          ) : (
                            <TaskIcon size={12} color={styles.colors.tertiary} />
                          )}
                        </span>
                        <span>• {entry.user}</span>
                        {entry.hasFile && (
                          <AttachmentIcon size={12} color={styles.colors.tertiary} style={{ marginLeft: '4px' }} />
                        )}
                      </div>
                      <div style={{ 
                        color: styles.colors.secondary, 
                        lineHeight: 1.3,
                        fontSize: textSizes.small
                      }}>
                        {entry.text}
                      </div>
                      {entry.outputFormat && (
                        <div style={{ 
                          fontSize: textSizes.tiny,
                          color: styles.colors.tertiary,
                          fontStyle: 'italic',
                          marginTop: '2px'
                        }}>
                          Format: {entry.selectedFormat ? 
                            formatOptions.find(f => f.value === entry.selectedFormat)?.label || entry.outputFormat 
                            : entry.outputFormat
                          }
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
        borderTop: `1px solid ${styles.colors.border}`,
        paddingTop: '12px'
      }}>
        <Button
          type="primary"
          onPress={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            marginBottom: '8px',
            fontSize: textSizes.base
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </Button>
        
        {status && (
          <div style={{
            padding: '6px 8px',
            background: styles.colors.background,
            border: `1px solid ${styles.colors.border}`,
            borderRadius: '4px',
            fontSize: textSizes.small,
            color: status.includes('Error') || status.includes('failed') ? 
              styles.colors.error : styles.colors.secondary,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {(status.includes('Error') || status.includes('failed')) && (
              <WarningIcon 
                size={14} 
                color={styles.colors.error} 
                style={{ marginRight: '6px' }} 
              />
            )}
            {(status.includes('success') || status.includes('completed') || status.includes('saved')) && (
              <SuccessIcon 
                size={14} 
                color={styles.colors.success} 
                style={{ marginRight: '6px' }} 
              />
            )}
            {status}
          </div>
        )}
      </div>

      {/* Enhanced Card Resize Handle */}
      <div
        onMouseDown={handleCardResizeStart}
        className="card-resize-handle"
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '20px',
          height: '20px',
          cursor: 'nw-resize',
          background: `linear-gradient(-45deg, transparent 30%, ${styles.colors.tertiary} 30%, ${styles.colors.tertiary} 35%, transparent 35%, transparent 65%, ${styles.colors.tertiary} 65%, ${styles.colors.tertiary} 70%, transparent 70%)`,
          backgroundSize: '6px 6px',
          opacity: 0.5,
          borderRadius: '0 0 8px 0',
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Drag to resize"
      >
        <div style={{
          width: '8px',
          height: '8px',
          background: 'transparent',
          border: `1px solid ${styles.colors.tertiary}`,
          borderRadius: '1px',
          opacity: 0.7
        }} />
      </div>
    </div>
  );
}

export default App;