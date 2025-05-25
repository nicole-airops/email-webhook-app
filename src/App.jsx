import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import { 
  Accordion, 
  AccordionSection,
  Button,
  ButtonGroup,
  Icon
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
  const [expandedTasks, setExpandedTasks] = useState(new Set()); // Track expanded tasks
  
  // Compact auto-resize state - 0.5" thinner (≈36px) from original 280px = 244px
  const [cardSize, setCardSize] = useState({ width: 244, height: 360 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(65); // Increased from 55
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Refs for functionality
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const textareaContainerRef = useRef(null);
  
  // WEBHOOK URLs
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/f124518f-2185-4e62-9520-c6ff0fc3fcb0/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/a628c7d4-6b22-42af-9ded-fb01839d5e06/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Format options
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'text', label: 'Text' },
    { value: 'table', label: 'Table' }
  ];

  // Ultra-compact theme - MADE BIGGER
  const theme = {
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      background: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
      info: '#3b82f6',
      accent: '#6366f1'
    },
    spacing: {
      xs: '3px',    // was 2px
      sm: '6px',    // was 4px  
      md: '8px',    // was 6px
      lg: '12px',   // was 8px
      xl: '16px'    // was 12px
    },
    borderRadius: {
      sm: '4px',    // was 3px
      md: '6px',    // was 4px
      lg: '8px'     // was 5px
    },
    fontSize: {
      xs: '10px',   // was 9px
      sm: '11px',   // was 10px
      base: '12px', // was 11px
      lg: '14px',   // was 12px
      xl: '16px'    // was 13px
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  // Container size detection
  useEffect(() => {
    const observeContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const updateSize = () => {
        const rect = parent.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Even more compact constraints - 0.5" thinner than original 280px
        const newWidth = Math.max(200, Math.min(260, containerWidth - 10));
        const newHeight = Math.max(280, Math.min(480, containerHeight - 10));
        
        setContainerSize({ width: containerWidth, height: containerHeight });
        setCardSize({ width: newWidth, height: newHeight });
      };
      
      updateSize();
      
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateSize);
        });
        resizeObserver.observe(parent);
        window.addEventListener('resize', updateSize);
        
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', updateSize);
        };
      } else {
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

  // Resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (isResizing && !isTextareaResizing) {
        const parent = cardRef.current?.parentElement;
        if (!parent) return;
        
        const parentRect = parent.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();
        
        const newWidth = Math.max(200, Math.min(300, e.clientX - cardRect.left));
        const newHeight = Math.max(280, Math.min(520, e.clientY - cardRect.top));
        
        setCardSize({ width: newWidth, height: newHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const newHeight = Math.max(35, Math.min(200, e.clientY - rect.top));
          setTextareaHeight(newHeight);
        }
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      setIsResizing(false);
      setIsTextareaResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing || isTextareaResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.addEventListener('mouseleave', handleMouseUp, { passive: false });
      document.body.style.cursor = isTextareaResizing ? 'ns-resize' : 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isTextareaResizing]);

  const handleCardResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      console.log('📋 Loading data for conversation:', conversationId);
      loadHistoryFromNetlify(conversationId);
      loadTaskResultsFromNetlify(conversationId);
    } else {
      console.log('❌ No conversation ID available');
      setTaskResults([]);
      setCommentHistory([]);
    }
  }, [context]);

  // ✅ FIXED: Clear all tasks properly
  const clearAllTasks = async () => {
    if (!context?.conversation?.id) return;
    
    if (!confirm('Delete all tasks? This cannot be undone.')) return;
    
    console.log('🗑️ Clearing all tasks');
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          tasks: [] 
        })
      });
      
      if (response.ok) {
        setTaskResults([]);
        setPollingTasks(new Set());
        setStatus('Tasks cleared');
        console.log('✅ All tasks cleared successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to clear tasks:', errorText);
        setStatus('Failed to clear');
      }
    } catch (error) {
      console.error('❌ Error clearing tasks:', error);
      setStatus('Clear failed');
    }
  };

  // ✅ FIXED: Clear history properly  
  const clearHistory = async () => {
    if (!context?.conversation?.id) return;
    
    if (!confirm('Delete all history? This cannot be undone.')) return;
    
    console.log('🗑️ Clearing history');
    try {
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          clearAll: true
        })
      });
      
      if (response.ok) {
        setCommentHistory([]);
        setStatus('History cleared');
        console.log('✅ History cleared successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to clear history:', errorText);
        setStatus('Failed to clear');
      }
    } catch (error) {
      console.error('❌ Error clearing history:', error);
      setStatus('Clear failed');
    }
  };

  // ✅ FIXED: Delete individual task
  const deleteTask = async (taskId) => {
    if (!context?.conversation?.id) return;
    
    console.log(`🗑️ Deleting task: ${taskId}`);
    try {
      const updatedTasks = taskResults.filter(task => task.id !== taskId);
      
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          tasks: updatedTasks 
        })
      });
      
      if (response.ok) {
        setTaskResults(updatedTasks);
        setPollingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setStatus('Task deleted');
        console.log(`✅ Task ${taskId} deleted successfully`);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to delete task:', errorText);
        setStatus('Delete failed');
      }
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      setStatus('Delete failed');
    }
  };

  // ✅ FIXED: Save task results properly
  const saveTaskResultsToNetlify = async (conversationId, tasks) => {
    console.log(`💾 Saving ${tasks.length} tasks for conversation ${conversationId}`);
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, tasks })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Tasks saved successfully:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save tasks:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving tasks:', error);
      return false;
    }
  };

  // ✅ FIXED: Check task status and save results
  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      if (response.ok) {
        const result = await response.json();
        console.log(`📋 Task ${taskId} status:`, result.status);
        
        if (result.status === 'completed' || result.status === 'failed') {
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { ...task, status: result.status, result: result.data, completedAt: result.completedAt }
              : task
          );
          
          setTaskResults(updatedTasks);
          console.log(`✅ Updated task ${taskId} locally`);
          
          // ✅ CRITICAL: Save updated tasks immediately
          if (context?.conversation?.id) {
            const saved = await saveTaskResultsToNetlify(context.conversation.id, updatedTasks);
            if (saved) {
              console.log(`✅ Task ${taskId} results saved to storage`);
            }
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus(`Task ${result.status}!`);
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
    return false;
  };

  // Polling system
  useEffect(() => {
    if (pollingTasks.size > 0) {
      const checkAllTasks = async () => {
        const tasksToCheck = Array.from(pollingTasks);
        console.log(`🔄 Polling ${tasksToCheck.length} tasks...`);
        const promises = tasksToCheck.map(taskId => checkTaskStatus(taskId));
        await Promise.all(promises);
      };
      
      const initialTimeout = setTimeout(checkAllTasks, 5000);
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

  const createCompletePayload = async (combinedInstructions, taskId = null) => {
    const timestamp = new Date().toISOString();
    const callbackUrl = taskId ? `${window.location.origin}/.netlify/functions/task-completion-webhook` : null;
    
    let conversationData = {};
    let messagesData = [];
    
    if (context?.conversation) {
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
    
    const teammateData = context?.teammate ? {
      id: context.teammate.id,
      name: context.teammate.name,
      email: context.teammate.email,
      role: context.teammate.role,
      avatar_url: context.teammate.avatar_url,
      timezone: context.teammate.timezone
    } : null;
    
    return {
      airops_request: {
        combined_instructions: combinedInstructions,
        output_format: {
          selected_format: selectedFormat,
          format_label: selectedFormat ? formatOptions.find(f => f.value === selectedFormat)?.label : null,
          raw_instructions: comment
        },
        attachment: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          size_formatted: `${(uploadedFile.size / 1024).toFixed(1)}KB`,
          last_modified: uploadedFile.lastModified ? new Date(uploadedFile.lastModified).toISOString() : null,
          content_preview: uploadedFile.preview || null,
          full_content: uploadedFile.fullContent || null, // Include full content for AI processing
          has_preview: !!uploadedFile.preview,
          has_full_content: !!uploadedFile.fullContent,
          is_text_file: uploadedFile.type?.startsWith('text/') || uploadedFile.name?.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css)$/i)
        } : null,
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type,
          task_id: taskId,
          callback_url: callbackUrl,
          user_agent: navigator.userAgent,
          plugin_version: "1.0.0"
        },
        requesting_user: teammateData,
        front_conversation: {
          conversation: conversationData,
          messages: messagesData,
          current_draft: draftData,
          stats: {
            total_messages: messagesData.length,
            inbound_messages: messagesData.filter(m => m.is_inbound).length,
            outbound_messages: messagesData.filter(m => !m.is_inbound).length,
            draft_messages: messagesData.filter(m => m.is_draft).length,
            has_attachments: messagesData.some(m => m.attachments && m.attachments.length > 0),
            participants_count: conversationData.participants?.length || 0,
            tags_count: conversationData.tags?.length || 0
          },
          latest_message: messagesData.length > 0 ? messagesData[0] : null,
          original_message: messagesData.length > 0 ? messagesData[messagesData.length - 1] : null
        },
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

      if (file.type.startsWith('text/') || 
          file.name.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css)$/i)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          // Include more content for better context (up to 5000 characters instead of 500)
          fileData.preview = content.substring(0, 5000) + (content.length > 5000 ? '...\n\n[File truncated - full content available to AI]' : '');
          fileData.fullContent = content; // Store full content for AI processing
          setUploadedFile(fileData);
          setStatus('File uploaded');
        };
        reader.readAsText(file);
      } else {
        setUploadedFile(fileData);
        setStatus('File uploaded');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus('Upload failed');
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatus('File removed');
  };

  // ✅ FIXED: Load history properly
  const loadHistoryFromNetlify = async (conversationId) => {
    console.log(`📚 Loading history for conversation: ${conversationId}`);
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
      if (response.ok) {
        const { history } = await response.json();
        console.log(`📚 Loaded ${history?.length || 0} history entries`);
        setCommentHistory(history || []);
      } else {
        console.log('📚 No history found, starting fresh');
        setCommentHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading history:', error);
      setCommentHistory([]);
    }
  };

  // ✅ FIXED: Save history properly
  const saveHistoryToNetlify = async (conversationId, entry) => {
    console.log(`📚 Saving history entry for conversation: ${conversationId}`);
    try {
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, entry })
      });
      
      if (response.ok) {
        console.log('✅ History entry saved successfully');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save history:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving history:', error);
      return false;
    }
  };

  // ✅ FIXED: Load task results properly
  const loadTaskResultsFromNetlify = async (conversationId) => {
    console.log(`📋 Loading tasks for conversation: ${conversationId}`);
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-tasks?conversationId=${conversationId}`);
      
      if (response.ok) {
        const { tasks } = await response.json();
        console.log(`📋 Loaded ${tasks?.length || 0} tasks`);
        setTaskResults(tasks || []);
        
        // Auto-expand completed tasks
        const completedTaskIds = (tasks || []).filter(task => task.status === 'completed').map(task => task.id);
        setExpandedTasks(new Set(completedTaskIds));
        
        const pendingTasks = (tasks || []).filter(task => task.status === 'pending').map(task => task.id);
        if (pendingTasks.length > 0) {
          setPollingTasks(new Set(pendingTasks));
          console.log(`🔄 Resuming polling for ${pendingTasks.length} pending tasks`);
        }
      } else {
        console.log('📋 No tasks found, starting fresh'); 
        setTaskResults([]);
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setTaskResults([]);
    }
  };

  const insertIntoDraft = async (content) => {
    // Clean HTML content same way as copy function
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Replace HTML elements with text equivalents to preserve some formatting
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p').forEach(p => p.replaceWith(p.textContent + '\n\n'));
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.replaceWith(h.textContent + '\n\n'));
    tempDiv.querySelectorAll('li').forEach(li => li.replaceWith('• ' + li.textContent + '\n'));
    tempDiv.querySelectorAll('ul, ol').forEach(list => list.replaceWith(list.textContent + '\n'));
    tempDiv.querySelectorAll('table').forEach(table => {
      let tableText = '';
      table.querySelectorAll('tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
        tableText += cells.join(' | ') + '\n';
      });
      table.replaceWith(tableText + '\n');
    });
    
    const cleanContent = tempDiv.textContent || tempDiv.innerText || content.replace(/<[^>]*>/g, '');
    
    // 🔍 DEBUG: Log context details (look for these in console!)
    console.log('🔍 AIROPS DEBUG - Context Type:', context?.type);
    console.log('🔍 AIROPS DEBUG - Has Draft:', !!context?.draft);
    console.log('🔍 AIROPS DEBUG - Draft Body:', context?.draft?.body);
    console.log('🔍 AIROPS DEBUG - Available Methods:', context ? Object.keys(context).filter(key => typeof context[key] === 'function') : []);
    
    if (!context) {
      console.log('❌ AIROPS: No context available');
      copyToClipboard(content);
      return;
    }
    
    try {
      // 🎯 STRATEGY 1: Message Composer Context (most common)
      if (context.type === 'messageComposer') {
        console.log('🎯 AIROPS: Trying messageComposer insertion');
        
        // Try multiple messageComposer methods
        if (typeof context.insertTextIntoBody === 'function') {
          console.log('✅ AIROPS: Using insertTextIntoBody');
          await context.insertTextIntoBody(cleanContent);
          setStatus('Inserted into draft!');
          return;
        }
        
        if (typeof context.insertText === 'function') {
          console.log('✅ AIROPS: Using insertText');
          await context.insertText(cleanContent);
          setStatus('Inserted into draft!');
          return;
        }
        
        if (context.draft && typeof context.draft.insertText === 'function') {
          console.log('✅ AIROPS: Using draft.insertText');
          await context.draft.insertText(cleanContent);
          setStatus('Inserted into draft!');
          return;
        }
      }
      
      // 🎯 STRATEGY 2: Conversation Context with Draft
      if (context.type === 'conversation' && context.draft) {
        console.log('🎯 AIROPS: Trying conversation context with draft');
        
        if (typeof context.insertTextIntoBody === 'function') {
          console.log('✅ AIROPS: Using conversation insertTextIntoBody');
          await context.insertTextIntoBody(cleanContent);
          setStatus('Inserted into draft!');
          return;
        }
        
        // Try updating draft body directly
        if (typeof context.updateDraft === 'function') {
          console.log('✅ AIROPS: Using updateDraft');
          const existingBody = context.draft.body || '';
          const newBody = existingBody + (existingBody ? '\n\n' : '') + cleanContent;
          await context.updateDraft({ body: newBody });
          setStatus('Added to draft!');
          return;
        }
        
        // Try draft.update method
        if (context.draft && typeof context.draft.update === 'function') {
          console.log('✅ AIROPS: Using draft.update');
          const existingBody = context.draft.body || '';
          const newBody = existingBody + (existingBody ? '\n\n' : '') + cleanContent;
          await context.draft.update({ body: newBody });
          setStatus('Added to draft!');
          return;
        }
      }
      
      // 🎯 STRATEGY 3: Generic Context Methods
      console.log('🎯 AIROPS: Trying generic context methods');
      
      if (typeof context.insertTextIntoBody === 'function') {
        console.log('✅ AIROPS: Using generic insertTextIntoBody');
        await context.insertTextIntoBody(cleanContent);
        setStatus('Inserted into draft!');
        return;
      }
      
      if (typeof context.insertText === 'function') {
        console.log('✅ AIROPS: Using generic insertText');
        await context.insertText(cleanContent);
        setStatus('Inserted into draft!');
        return;
      }
      
      // 🎯 STRATEGY 4: Create New Draft (last resort)
      if (typeof context.createDraft === 'function') {
        console.log('⚠️ AIROPS: Creating new draft (no existing draft found)');
        await context.createDraft({
          body: cleanContent,
          type: 'text'
        });
        setStatus('New draft created!');
        return;
      }
      
      // 🎯 STRATEGY 5: Alternative createDraft format
      if (typeof context.createDraft === 'function') {
        console.log('⚠️ AIROPS: Trying alternative createDraft format');
        await context.createDraft({
          content: {
            body: cleanContent,
            type: 'text'
          }
        });
        setStatus('New draft created!');
        return;
      }
      
    } catch (error) {
      console.error('❌ AIROPS: Insert error:', error);
      setStatus('Insert failed: ' + error.message);
    }
    
    // 📋 FALLBACK: Copy to clipboard
    console.log('📋 AIROPS: Falling back to clipboard');
    copyToClipboard(content);
    setStatus('Copied to clipboard (insert failed)');
  };

  const copyToClipboard = (content) => {
    // Create a temporary div to properly convert HTML to text while preserving some formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Replace HTML elements with text equivalents to preserve some formatting
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p').forEach(p => p.replaceWith(p.textContent + '\n\n'));
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.replaceWith(h.textContent + '\n\n'));
    tempDiv.querySelectorAll('li').forEach(li => li.replaceWith('• ' + li.textContent + '\n'));
    tempDiv.querySelectorAll('ul, ol').forEach(list => list.replaceWith(list.textContent + '\n'));
    tempDiv.querySelectorAll('table').forEach(table => {
      let tableText = '';
      table.querySelectorAll('tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
        tableText += cells.join(' | ') + '\n';
      });
      table.replaceWith(tableText + '\n');
    });
    
    const cleanContent = tempDiv.textContent || tempDiv.innerText || content.replace(/<[^>]*>/g, '');
    
    navigator.clipboard.writeText(cleanContent).then(() => {
      setStatus('Copied!');
    }).catch(() => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = cleanContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setStatus('Copied!');
      } catch (err) {
        setStatus('Copy failed');
      }
    });
  };

  // ✅ ENHANCED: Process request with proper task creation and storage
  const processRequest = async () => {
    const now = Date.now();
    if (isProcessingRef.current || (now - lastCallTimeRef.current) < 1000) {
      return;
    }

    if (!comment.trim()) {
      setStatus('Add instructions');
      return;
    }
    
    isProcessingRef.current = true;
    lastCallTimeRef.current = now;
    setIsSending(true);
    setStatus('Processing...');
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      const combinedInstructions = createCombinedInstructions();
      const singleNestedPayload = await createCompletePayload(combinedInstructions, taskId);
      
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
        // ✅ ENHANCED: Create and save history entry
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
        
        const historySaved = await saveHistoryToNetlify(conversationId, newEntry);
        if (historySaved) {
          const updatedHistory = [newEntry, ...commentHistory];
          setCommentHistory(updatedHistory);
          console.log('✅ History updated locally');
        }

        // ✅ ENHANCED: Create and save task if in task mode  
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
          console.log(`✅ Task ${taskId} created locally`);
          
          // ✅ CRITICAL: Save to both individual storage and conversation storage immediately
          try {
            // Save individual task
            const individualResponse = await fetch('/.netlify/functions/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
            
            if (individualResponse.ok) {
              console.log(`✅ Task ${taskId} saved individually`);
            }
            
            // Save to conversation tasks
            const conversationSaved = await saveTaskResultsToNetlify(conversationId, updatedTasks);
            if (conversationSaved) {
              console.log(`✅ Task ${taskId} saved to conversation`);
            }
          } catch (blobError) {
            console.error('❌ Error storing task:', blobError);
          }
          
          setPollingTasks(prev => new Set([...prev, taskId]));
          console.log(`🔄 Started polling for task ${taskId}`);
        }
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      console.log(`🚀 Sending ${mode} request to AirOps...`);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(singleNestedPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ AirOps response received:', responseData);
      
      if (mode === 'email') {
        setStatus('Email sent!');
      } else {
        setStatus('Task created!');
      }
      
      // Clear form
      setComment('');
      setOutputFormat('');
      setSelectedFormat('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('❌ Request error:', error);
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

  // Toggle individual task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const viewTaskInNewWindow = (task) => {
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
              color: #0f172a;
            }
            .header { 
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            h1 { color: #0f172a; margin-bottom: 16px; }
            .meta { 
              background: #f8fafc; 
              padding: 16px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
            }
            .meta strong { color: #475569; }
            .content { 
              background: white; 
              border: 1px solid #e2e8f0; 
              padding: 24px; 
              border-radius: 8px; 
            }
            h2, h3 { color: #0f172a; margin: 20px 0 12px 0; }
            p { margin-bottom: 16px; }
            ul, ol { margin-left: 20px; margin-bottom: 16px; }
            li { margin-bottom: 4px; }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin-bottom: 16px; 
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
            }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            code { 
              background: #f1f5f9; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: monospace; 
            }
            pre { 
              background: #0f172a; 
              color: #e2e8f0; 
              padding: 16px; 
              border-radius: 8px; 
              overflow-x: auto; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AirOps Task Result</h1>
          </div>
          <div class="meta">
            <p><strong>Format:</strong> ${task.outputFormat || 'General Task'}</p>
            <p><strong>Created:</strong> ${formatDate(task.createdAt)}</p>
            <p><strong>Status:</strong> ${task.status}</p>
            <p><strong>User:</strong> ${task.user}</p>
            ${task.fileName ? `<p><strong>File:</strong> ${task.fileName}</p>` : ''}
          </div>
          <div class="content">
            ${task.result || '<p>No result available yet.</p>'}
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '150px',
        fontSize: theme.fontSize.base,
        color: theme.colors.tertiary
      }}>
        Loading...
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        fontSize: theme.fontSize.base,
        color: theme.colors.secondary,
        textAlign: 'center'
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
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
        display: 'flex',
        flexDirection: 'column',
        minWidth: '200px',
        minHeight: '280px',
        maxWidth: '100%',
        maxHeight: '100%',
        transition: isResizing ? 'none' : 'width 0.2s ease, height 0.2s ease'
      }}
    >
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Ultra-compact Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        paddingBottom: theme.spacing.xs,
        borderBottom: `1px solid ${theme.colors.border}`
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ 
            width: '12px', 
            height: '12px', 
            marginRight: theme.spacing.sm
          }}
        />
        <span style={{
          fontSize: theme.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.primary
        }}>
          {cardSize.width < 220 ? 'AirOps' : 'Send to AirOps'}
        </span>
      </div>

      {/* Ultra-compact Mode Tabs */}
      <div style={{ marginBottom: theme.spacing.sm }}>
        <div style={{
          display: 'flex',
          background: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          padding: '1px',
          border: `1px solid ${theme.colors.border}`
        }}>
          <button
            onClick={() => setMode('email')}
            style={{
              flex: 1,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.fontSize.sm,
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'email' ? theme.colors.surface : 'transparent',
              color: mode === 'email' ? theme.colors.primary : theme.colors.secondary,
              boxShadow: mode === 'email' ? theme.shadows.sm : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <EmailIcon 
              size={10} 
              color={mode === 'email' ? theme.colors.primary : theme.colors.secondary} 
              style={{ marginRight: theme.spacing.xs }} 
            />
            Email
          </button>
          <button
            onClick={() => setMode('task')}
            style={{
              flex: 1,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.fontSize.sm,
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'task' ? theme.colors.surface : 'transparent',
              color: mode === 'task' ? theme.colors.primary : theme.colors.secondary,
              boxShadow: mode === 'task' ? theme.shadows.sm : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TaskIcon 
              size={10} 
              color={mode === 'task' ? theme.colors.primary : theme.colors.secondary} 
              style={{ marginRight: theme.spacing.xs }} 
            />
            Task
          </button>
        </div>
      </div>
      
      {/* Ultra-compact Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '2px',
        marginBottom: theme.spacing.sm
      }}>
        {/* Ultra-compact Instructions Input */}
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              mode === 'email' ? "Instructions: How should we respond?" : "Instructions: What do you need created?"
            }
            style={{
              width: '100%',
              height: `${textareaHeight}px`,
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.fontSize.base,
              fontFamily: 'inherit',
              resize: 'none',
              paddingBottom: theme.spacing.lg,
              background: theme.colors.surface,
              color: theme.colors.primary,
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = theme.colors.accent}
            onBlur={(e) => e.target.style.borderColor = theme.colors.border}
          />
          
          {/* Textarea resize handle */}
          <div
            onMouseDown={handleTextareaResizeStart}
            className="textarea-resize-handle"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: theme.spacing.sm,
              left: theme.spacing.sm,
              height: '12px',
              cursor: 'ns-resize',
              background: `linear-gradient(90deg, transparent 30%, ${theme.colors.border} 30%, ${theme.colors.border} 35%, transparent 35%, transparent 65%, ${theme.colors.border} 65%, ${theme.colors.border} 70%, transparent 70%)`,
              backgroundSize: '8px 2px',
              opacity: 0.3,
              borderRadius: `0 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm}`,
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
              background: theme.colors.tertiary,
              borderRadius: '2px'
            }} />
          </div>
        </div>

        {/* Ultra-compact Task Mode Controls */}
        {mode === 'task' && (
          <div style={{ marginBottom: theme.spacing.sm }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.fontSize.sm,
              fontWeight: '600',
              color: theme.colors.primary
            }}>
              Output Format <span style={{ color: theme.colors.tertiary, fontWeight: '400' }}>(Optional)</span>
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.fontSize.base,
                fontFamily: 'inherit',
                background: theme.colors.surface,
                cursor: 'pointer',
                color: theme.colors.primary,
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = theme.colors.accent}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Ultra-compact File Upload - Much smaller */}
            <div style={{ marginTop: theme.spacing.sm }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
              />
              
              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100%',
                    background: 'none',
                    border: `1px dashed ${theme.colors.border}`,
                    color: theme.colors.accent,
                    fontSize: theme.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: `${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.sm,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = `${theme.colors.accent}08`;
                    e.target.style.borderColor = theme.colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = theme.colors.border;
                  }}
                >
                  <UploadIcon size={10} color={theme.colors.accent} style={{ marginRight: theme.spacing.xs }} />
                  Upload file (optional)
                </button>
              ) : (
                <div style={{
                  background: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.sm,
                  padding: theme.spacing.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ 
                    fontSize: theme.fontSize.xs, 
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <AttachmentIcon size={8} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs, flexShrink: 0 }} />
                    <div style={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)}KB)
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: theme.spacing.xs,
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.tertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: theme.spacing.xs,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                    onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                    title="Remove file"
                  >
                    <Icon name="Close" size={8} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ FIXED: Results and History sections with proper alignment */}
        {(taskResults.length > 0 || commentHistory.length > 0) && (
          <Accordion expandMode="multi">
            {taskResults.length > 0 && (
              <AccordionSection
                id="tasks"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                      Results ({taskResults.length})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllTasks();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        color: theme.colors.tertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                      onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                      title="Delete all tasks"
                    >
                      <Icon name="TrashFilled" size={10} />
                    </button>
                  </div>
                }
              >
                <div style={{ marginLeft: '-2px', marginRight: '-2px' }}>
                  {taskResults.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.sm,
                        marginBottom: theme.spacing.xs,
                        fontSize: theme.fontSize.xs
                      }}
                    >
                      {/* Task Header - CLICKABLE */}
                      <div 
                        onClick={() => toggleTaskExpansion(task.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: theme.spacing.xs,
                          cursor: 'pointer',
                          padding: theme.spacing.xs,
                          borderRadius: theme.borderRadius.sm,
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.background}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        title="Click to expand/collapse"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          {/* Expand/Collapse Icon */}
                          <div style={{ 
                            marginRight: theme.spacing.sm,
                            transform: expandedTasks.has(task.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            fontSize: theme.fontSize.xs,
                            color: theme.colors.tertiary
                          }}>
                            ▶
                          </div>
                          
                          {/* Status Icon */}
                          {task.status === 'pending' ? (
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              marginRight: theme.spacing.sm,
                              border: `2px solid ${theme.colors.accent}`,
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          ) : task.status === 'completed' ? (
                            <CheckmarkIcon size={12} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
                          ) : (
                            <WarningIcon size={12} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                          )}
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              color: theme.colors.primary,
                              fontWeight: '600',
                              fontSize: theme.fontSize.sm
                            }}>
                              {task.selectedFormat ? 
                                formatOptions.find(f => f.value === task.selectedFormat)?.label || task.outputFormat 
                                : task.outputFormat || 'General Task'
                              }
                              {task.hasFile && (
                                <AttachmentIcon 
                                  size={10} 
                                  color={theme.colors.tertiary} 
                                  style={{ marginLeft: theme.spacing.sm }} 
                                />
                              )}
                            </div>
                            <div style={{ 
                              color: theme.colors.tertiary, 
                              fontSize: theme.fontSize.xs,
                              marginTop: '2px'
                            }}>
                              {formatDate(task.createdAt)} • {task.user}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons - Don't trigger expand/collapse */}
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}
                          onClick={(e) => e.stopPropagation()} // Prevent expand/collapse
                        >
                          {task.result && (
                            <button
                              onClick={() => viewTaskInNewWindow(task)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.info}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="View task result"
                            >
                              <Icon name="ExternalLink" size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: theme.spacing.xs,
                              borderRadius: theme.borderRadius.sm,
                              color: theme.colors.tertiary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                            title="Delete this task"
                          >
                            <Icon name="Trash" size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      {expandedTasks.has(task.id) && (
                        <div style={{ 
                          paddingLeft: theme.spacing.lg,
                          animation: 'fadeIn 0.2s ease-out'
                        }}>
                          {/* Task Status */}
                          <div style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            background: task.status === 'completed' ? 
                              `${theme.colors.success}15` : 
                              task.status === 'failed' ? 
                              `${theme.colors.warning}15` : 
                              `${theme.colors.accent}15`,
                            border: `1px solid ${
                              task.status === 'completed' ? 
                              theme.colors.success : 
                              task.status === 'failed' ? 
                              theme.colors.warning : 
                              theme.colors.accent
                            }`,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: theme.fontSize.sm,
                            color: task.status === 'completed' ? 
                              theme.colors.success : 
                              task.status === 'failed' ? 
                              theme.colors.warning : 
                              theme.colors.accent,
                            marginBottom: task.result ? theme.spacing.sm : '0',
                            fontWeight: '500'
                          }}>
                            {task.status === 'pending' && 'Processing...'}
                            {task.status === 'completed' && 'Completed'}
                            {task.status === 'failed' && 'Failed'}
                          </div>

                          {/* Task Result Content */}
                          {task.result && (
                            <div>
                              <div style={{
                                background: theme.colors.surface,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.borderRadius.md,
                                padding: theme.spacing.lg,
                                marginBottom: theme.spacing.sm,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                fontSize: theme.fontSize.sm,
                                lineHeight: '1.5'
                              }}>
                                <div 
                                  dangerouslySetInnerHTML={{ __html: task.result }}
                                  style={{ 
                                    color: theme.colors.primary
                                  }}
                                />
                              </div>
                              
                              <div style={{ 
                                display: 'flex', 
                                gap: theme.spacing.sm,
                                flexWrap: 'wrap'
                              }}>
                                <button
                                  onClick={() => copyToClipboard(task.result)}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    fontSize: theme.fontSize.sm,
                                    minHeight: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: theme.colors.background,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.borderRadius.sm,
                                    cursor: 'pointer',
                                    color: theme.colors.secondary,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.borderColor = theme.colors.borderHover;
                                    e.target.style.backgroundColor = theme.colors.surface;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.borderColor = theme.colors.border;
                                    e.target.style.backgroundColor = theme.colors.background;
                                  }}
                                >
                                  <Icon name="Copy" size={10} style={{ marginRight: theme.spacing.xs }} />
                                  Copy
                                </button>
                                <button
                                  onClick={() => insertIntoDraft(task.result)}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    fontSize: theme.fontSize.sm,
                                    minHeight: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: theme.colors.background,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.borderRadius.sm,
                                    cursor: 'pointer',
                                    color: theme.colors.secondary,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.borderColor = theme.colors.borderHover;
                                    e.target.style.backgroundColor = theme.colors.surface;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.borderColor = theme.colors.border;
                                    e.target.style.backgroundColor = theme.colors.background;
                                  }}
                                >
                                  <InsertIcon size={10} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs }} />
                                  Insert
                                </button>
                              </div>
                            </div>
                          )}
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
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                      History ({commentHistory.length})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        color: theme.colors.tertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                      onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                      title="Delete all history"
                    >
                      <Icon name="TrashFilled" size={10} />
                    </button>
                  </div>
                }
              >
                <div style={{ maxHeight: '120px', overflowY: 'auto', marginLeft: '-2px', marginRight: '-2px' }}>
                  {commentHistory.slice(0, 8).map((entry, index) => (
                    <div key={index} style={{
                      padding: theme.spacing.xs,
                      background: entry.isTaskCompletion ? 
                        `${theme.colors.success}08` : 
                        theme.colors.background,
                      border: `1px solid ${entry.isTaskCompletion ? 
                        theme.colors.success : 
                        theme.colors.border}`,
                      borderRadius: theme.borderRadius.sm,
                      marginBottom: '2px',
                      fontSize: theme.fontSize.xs
                    }}>
                      {/* Entry Header */}
                      <div style={{ 
                        color: theme.colors.tertiary, 
                        marginBottom: '2px',
                        fontSize: theme.fontSize.xs,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span>{formatDate(entry.timestamp)} • </span>
                          
                          {/* Entry Type Icon */}
                          {entry.isTaskCompletion ? (
                            <CheckmarkIcon size={8} color={theme.colors.success} />
                          ) : entry.mode === 'email' ? (
                            <EmailIcon size={8} color={theme.colors.tertiary} />
                          ) : (
                            <TaskIcon size={8} color={theme.colors.tertiary} />
                          )}
                          
                          <span>• {entry.user}</span>
                          
                          {entry.hasFile && (
                            <AttachmentIcon size={8} color={theme.colors.tertiary} style={{ marginLeft: '2px' }} />
                          )}
                          
                          {entry.isTaskCompletion && entry.status && (
                            <span style={{ 
                              color: theme.colors.success, 
                              fontSize: theme.fontSize.xs,
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              • COMPLETED
                            </span>
                          )}
                        </div>
                        
                        {/* Action Buttons for Task Completions */}
                        {entry.isTaskCompletion && entry.result && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(entry.result);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="Copy result"
                            >
                              <Icon name="Copy" size={8} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                insertIntoDraft(entry.result);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="Insert into draft"
                            >
                              <InsertIcon size={8} color={theme.colors.tertiary} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Entry Content */}
                      <div style={{ 
                        color: entry.isTaskCompletion ? theme.colors.success : theme.colors.secondary, 
                        lineHeight: 1.3,
                        fontSize: theme.fontSize.xs,
                        marginBottom: entry.result ? '4px' : '0'
                      }}>
                        {entry.text}
                      </div>
                      
                      {/* Task Result Preview (for completed tasks) */}
                      {entry.isTaskCompletion && entry.result && (
                        <div style={{
                          background: theme.colors.surface,
                          border: `1px solid ${theme.colors.success}30`,
                          borderRadius: theme.borderRadius.sm,
                          padding: theme.spacing.xs,
                          marginTop: '2px',
                          fontSize: theme.fontSize.xs,
                          maxHeight: '60px',
                          overflowY: 'auto'
                        }}>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: entry.result.length > 200 ? 
                                entry.result.substring(0, 200) + '...' : 
                                entry.result 
                            }}
                            style={{ color: theme.colors.primary }}
                          />
                        </div>
                      )}
                      
                      {/* Format Info */}
                      {entry.outputFormat && (
                        <div style={{ 
                          fontSize: theme.fontSize.xs,
                          color: theme.colors.tertiary,
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

      {/* Ultra-compact Bottom Section */}
      <div style={{
        borderTop: `1px solid ${theme.colors.border}`,
        paddingTop: theme.spacing.sm
      }}>
        <button
          onClick={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            marginBottom: theme.spacing.xs,
            fontSize: theme.fontSize.base,
            fontWeight: '600',
            padding: theme.spacing.sm,
            background: isSending ? theme.colors.tertiary : theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: isSending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isSending ? 'none' : theme.shadows.sm
          }}
          onMouseEnter={(e) => {
            if (!isSending) {
              e.target.style.backgroundColor = '#374151';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = theme.shadows.md;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSending) {
              e.target.style.backgroundColor = theme.colors.primary;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme.shadows.sm;
            }
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </button>
        
        {status && (
          <div style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.fontSize.xs,
            color: theme.colors.secondary,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {(status.includes('success') || status.includes('completed') || status.includes('saved') || status.includes('created')) && (
              <SuccessIcon 
                size={10} 
                color={theme.colors.success} 
                style={{ marginRight: theme.spacing.xs }} 
              />
            )}
            <span>{status}</span>
          </div>
        )}
      </div>

      {/* Ultra-compact resize handle */}
      <div
        onMouseDown={handleCardResizeStart}
        className="card-resize-handle"
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '14px',
          height: '14px',
          cursor: 'nw-resize',
          background: `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`,
          backgroundSize: '4px 4px',
          opacity: 0.3,
          borderRadius: `0 0 ${theme.borderRadius.lg} 0`,
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '0.8';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.accent} 30%, ${theme.colors.accent} 35%, transparent 35%, transparent 65%, ${theme.colors.accent} 65%, ${theme.colors.accent} 70%, transparent 70%)`;
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.3';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`;
        }}
        title="Drag to resize"
      >
        <div style={{
          width: '6px',
          height: '6px',
          background: 'transparent',
          border: `1px solid currentColor`,
          borderRadius: '1px',
          opacity: 0.7
        }} />
      </div>
    </div>
  );
}

export default App;