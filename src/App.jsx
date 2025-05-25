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
  const [expandedTasks, setExpandedTasks] = useState(new Set()); 
  
  // Compact auto-resize state - 0.5" thinner (≈36px) from original 280px = 244px
  const [cardSize, setCardSize] = useState({ width: 244, height: 360 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(65);
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

  // ✅ RESTORED: Enhanced adaptive theme based on card size
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
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px'
    },
    borderRadius: {
      sm: '3px',
      md: '4px',
      lg: '6px'
    },
    fontSize: {
      xs: `${Math.max(9, Math.min(11, cardSize.width / 32))}px`,    // Adaptive 9-11px
      sm: `${Math.max(10, Math.min(12, cardSize.width / 28))}px`,   // Adaptive 10-12px  
      base: `${Math.max(11, Math.min(13, cardSize.width / 25))}px`, // Adaptive 11-13px
      lg: `${Math.max(12, Math.min(14, cardSize.width / 22))}px`,   // Adaptive 12-14px
      xl: `${Math.max(13, Math.min(15, cardSize.width / 20))}px`,   // Adaptive 13-15px
      result: `${Math.max(12, Math.min(14, cardSize.width / 22))}px` // Bigger for results
    },
    iconSize: {
      sm: Math.max(8, Math.min(12, cardSize.width / 28)),          // Adaptive icon sizes
      md: Math.max(10, Math.min(14, cardSize.width / 25)),
      lg: Math.max(12, Math.min(16, cardSize.width / 22))
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  // ✅ RESTORED: Toggle task expansion
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

  // ✅ RESTORED: Enhanced Front context logging
  useEffect(() => {
    console.log('🔍 AIROPS DEBUG: Front context update:', {
      type: context?.type,
      hasConversation: !!context?.conversation,
      conversationId: context?.conversation?.id,
      hasDraft: !!context?.draft,
      draftId: context?.draft?.id,
      hasTeammate: !!context?.teammate,
      teammateId: context?.teammate?.id,
      availableMethods: context ? Object.keys(context).filter(key => typeof context[key] === 'function') : []
    });
  }, [context]);

  // ✅ RESTORED: Enhanced container size detection with better responsiveness
  useEffect(() => {
    const observeContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const updateSize = () => {
        const rect = parent.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Enhanced adaptive constraints based on container
        const minWidth = Math.max(200, Math.min(240, containerWidth * 0.6));
        const maxWidth = Math.min(400, containerWidth - 12);
        const minHeight = Math.max(280, Math.min(320, containerHeight * 0.5));
        const maxHeight = Math.min(600, containerHeight - 12);
        
        const newWidth = Math.max(minWidth, Math.min(maxWidth, cardSize.width));
        const newHeight = Math.max(minHeight, Math.min(maxHeight, cardSize.height));
        
        // Only update if there's a meaningful change
        if (Math.abs(newWidth - cardSize.width) > 2 || Math.abs(newHeight - cardSize.height) > 2) {
          setContainerSize({ width: containerWidth, height: containerHeight });
          setCardSize({ width: newWidth, height: newHeight });
        }
      };
      
      updateSize();
      
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateSize);
        });
        resizeObserver.observe(parent);
        window.addEventListener('resize', updateSize);
        
        // Also observe the parent's parent for nested resize scenarios
        const grandParent = parent.parentElement;
        if (grandParent) {
          resizeObserver.observe(grandParent);
        }
        
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', updateSize);
        };
      } else {
        // Enhanced fallback for older browsers
        const handleResize = () => requestAnimationFrame(updateSize);
        window.addEventListener('resize', handleResize);
        const interval = setInterval(updateSize, 200); // Less frequent but still responsive
        
        return () => {
          window.removeEventListener('resize', handleResize);
          clearInterval(interval);
        };
      }
    };
    
    const cleanup = observeContainerSize();
    return cleanup;
  }, [cardSize.width, cardSize.height]);

  // ✅ RESTORED: Enhanced resize handling with better constraints
  useEffect(() => {
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (isResizing && !isTextareaResizing) {
        const parent = cardRef.current?.parentElement;
        if (!parent) return;
        
        const parentRect = parent.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();
        
        // Enhanced constraints based on container
        const minWidth = Math.max(200, containerSize.width * 0.3);
        const maxWidth = Math.min(450, containerSize.width - 12);
        const minHeight = Math.max(280, containerSize.height * 0.4);
        const maxHeight = Math.min(650, containerSize.height - 12);
        
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - cardRect.left));
        const newHeight = Math.max(minHeight, Math.min(maxHeight, e.clientY - cardRect.top));
        
        setCardSize({ width: newWidth, height: newHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const newHeight = Math.max(35, Math.min(Math.min(200, cardSize.height * 0.4), e.clientY - rect.top));
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
  }, [isResizing, isTextareaResizing, containerSize, cardSize.height]);

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

  // ✅ ENHANCED: Better logging for context loading
  useEffect(() => {
    const conversationId = context?.conversation?.id;
    
    if (conversationId) {
      console.log('🔄 AIROPS: Loading data for conversation:', conversationId);
      console.log('🔄 AIROPS: Context type:', context.type);
      console.log('🔄 AIROPS: Available context methods:', Object.keys(context).filter(key => typeof context[key] === 'function'));
      loadHistoryFromNetlify(conversationId);
      loadTaskResultsFromNetlify(conversationId);
    } else {
      console.log('❌ AIROPS: No conversation ID available, context type:', context?.type);
      setTaskResults([]);
      setCommentHistory([]);
    }
  }, [context]);

  // ✅ RESTORED: Enhanced manual refresh function for debugging
  const manualRefresh = async () => {
    if (!context?.conversation?.id) {
      console.log('❌ AIROPS REFRESH: No conversation ID');
      console.log('❌ AIROPS REFRESH: Context:', context);
      setStatus('No conversation context');
      return;
    }

    console.log('🔄 AIROPS REFRESH: Manual refresh triggered for conversation:', context.conversation.id);
    console.log('🔄 AIROPS REFRESH: Current state - History:', commentHistory.length, 'Tasks:', taskResults.length);
    setStatus('Refreshing...');
    
    try {
      await Promise.all([
        loadHistoryFromNetlify(context.conversation.id),
        loadTaskResultsFromNetlify(context.conversation.id)
      ]);
      setStatus('Refreshed!');
      console.log('✅ AIROPS REFRESH: Manual refresh completed');
    } catch (error) {
      console.error('❌ AIROPS REFRESH: Failed:', error);
      setStatus('Refresh failed');
    }
  };

  // ✅ RESTORED: Complete debug function for testing history API
  const debugHistoryAPI = async () => {
    if (!context?.conversation?.id) {
      console.error('❌ DEBUG: No conversation ID');
      setStatus('No conversation context');
      return;
    }
    
    console.log('🧪 DEBUG: Testing history API...');
    console.log('🧪 DEBUG: Conversation ID:', context.conversation.id);
    console.log('🧪 DEBUG: Current history length:', commentHistory.length);
    setStatus('Running debug...');
    
    try {
      // Test 1: Load current history
      console.log('🧪 DEBUG: Test 1 - Loading current history');
      const loadResponse = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${context.conversation.id}`);
      console.log('🧪 DEBUG: Load response status:', loadResponse.status);
      
      if (loadResponse.ok) {
        const loadData = await loadResponse.json();
        console.log('🧪 DEBUG: Loaded history:', loadData);
      } else {
        const loadError = await loadResponse.text();
        console.log('🧪 DEBUG: Load error:', loadError);
      }
      
      // Test 2: Save current history back (should be no-op)
      console.log('🧪 DEBUG: Test 2 - Saving current history back');
      const saveResponse = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          history: commentHistory 
        })
      });
      
      console.log('🧪 DEBUG: Save response status:', saveResponse.status);
      
      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        console.log('🧪 DEBUG: Save response data:', saveData);
      } else {
        const saveError = await saveResponse.text();
        console.log('🧪 DEBUG: Save error:', saveError);
      }
      
      // Test 3: Test task loading
      console.log('🧪 DEBUG: Test 3 - Loading tasks');
      const tasksResponse = await fetch(`/.netlify/functions/get-conversation-tasks?conversationId=${context.conversation.id}`);
      console.log('🧪 DEBUG: Tasks response status:', tasksResponse.status);
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log('🧪 DEBUG: Tasks data:', tasksData);
      } else {
        const tasksError = await tasksResponse.text();
        console.log('🧪 DEBUG: Tasks error:', tasksError);
      }
      
      // Test 4: Test Front context
      console.log('🧪 DEBUG: Test 4 - Front context analysis');
      console.log('🧪 DEBUG: Context type:', context.type);
      console.log('🧪 DEBUG: Conversation:', {
        id: context.conversation?.id,
        subject: context.conversation?.subject,
        participants: context.conversation?.participants?.length
      });
      console.log('🧪 DEBUG: Draft:', {
        id: context.draft?.id,
        hasBody: !!context.draft?.body,
        bodyLength: context.draft?.body?.length
      });
      console.log('🧪 DEBUG: Teammate:', {
        id: context.teammate?.id,
        name: context.teammate?.name,
        email: context.teammate?.email
      });
      
      setStatus('Debug complete - check console');
      
    } catch (error) {
      console.error('🧪 DEBUG: API test failed:', error);
      setStatus('Debug failed - check console');
    }
  };

  const clearAllTasks = async () => {
    if (!context?.conversation?.id) return;
    
    if (!confirm('Delete all tasks? This cannot be undone.')) return;
    
    console.log('🗑️ AIROPS: Clearing all tasks');
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
        setExpandedTasks(new Set());
        setStatus('Tasks cleared');
        console.log('✅ AIROPS: All tasks cleared successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ AIROPS: Failed to clear tasks:', errorText);
        setStatus('Failed to clear');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error clearing tasks:', error);
      setStatus('Clear failed');
    }
  };

  // ✅ ENHANCED: Delete individual history entry with better debugging
  const deleteHistoryEntry = async (entryIndex) => {
    if (!context?.conversation?.id) {
      console.error('❌ AIROPS: No conversation ID for history deletion');
      setStatus('No conversation context');
      return;
    }
    
    console.log(`🗑️ AIROPS: Deleting history entry at index: ${entryIndex}`);
    console.log(`🗑️ AIROPS: Current history length: ${commentHistory.length}`);
    console.log(`🗑️ AIROPS: Entry to delete:`, commentHistory[entryIndex]);
    
    try {
      const updatedHistory = commentHistory.filter((_, index) => index !== entryIndex);
      console.log(`🗑️ AIROPS: Updated history length: ${updatedHistory.length}`);
      
      const payload = { 
        conversationId: context.conversation.id, 
        history: updatedHistory 
      };
      console.log(`🗑️ AIROPS: Sending payload:`, payload);
      
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`🗑️ AIROPS: API response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ AIROPS: History deletion successful:`, result);
        
        setCommentHistory(updatedHistory);
        setStatus('History entry deleted');
        console.log(`✅ AIROPS: Local state updated, new length: ${updatedHistory.length}`);
      } else {
        const errorText = await response.text();
        console.error(`❌ AIROPS: History deletion failed - Status: ${response.status}`, errorText);
        setStatus(`Delete failed (${response.status})`);
      }
    } catch (error) {
      console.error('❌ AIROPS: Network error deleting history entry:', error);
      setStatus('Delete failed - network error');
    }
  };

  // ✅ ENHANCED: Clear history with better debugging
  const clearHistory = async () => {
    if (!context?.conversation?.id) {
      console.error('❌ AIROPS: No conversation ID for history clearing');
      setStatus('No conversation context');
      return;
    }
    
    if (!confirm('Delete all history? This cannot be undone.')) return;
    
    console.log('🗑️ AIROPS: Clearing all history');
    console.log(`🗑️ AIROPS: Current history length: ${commentHistory.length}`);
    
    try {
      // Try the most reliable method first - empty history array 
      const payload = { 
        conversationId: context.conversation.id, 
        history: [] 
      };
      console.log(`🗑️ AIROPS: Sending clear payload:`, payload);
      
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`🗑️ AIROPS: Clear API response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ AIROPS: History clearing successful:`, result);
        
        setCommentHistory([]);
        setStatus('History cleared');
        console.log('✅ AIROPS: Local history state cleared');
      } else {
        const errorText = await response.text();
        console.error(`❌ AIROPS: History clearing failed - Status: ${response.status}`, errorText);
        
        // Try alternative method with clearAll flag
        console.log('🗑️ AIROPS: Trying alternative clearAll method');
        const altResponse = await fetch('/.netlify/functions/save-conversation-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            conversationId: context.conversation.id, 
            clearAll: true 
          })
        });
        
        if (altResponse.ok) {
          const altResult = await altResponse.json();
          console.log(`✅ AIROPS: Alternative clear method successful:`, altResult);
          setCommentHistory([]);
          setStatus('History cleared');
        } else {
          const altErrorText = await altResponse.text();
          console.error(`❌ AIROPS: Both clear methods failed:`, altErrorText);
          setStatus('Failed to clear history');
        }
      }
    } catch (error) {
      console.error('❌ AIROPS: Network error clearing history:', error);
      setStatus('Clear failed - network error');
    }
  };

  const deleteTask = async (taskId) => {
    if (!context?.conversation?.id) return;
    
    console.log(`🗑️ AIROPS: Deleting task: ${taskId}`);
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
        setExpandedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setStatus('Task deleted');
        console.log(`✅ AIROPS: Task ${taskId} deleted successfully`);
      } else {
        const errorText = await response.text();
        console.error('❌ AIROPS: Failed to delete task:', errorText);
        setStatus('Delete failed');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error deleting task:', error);
      setStatus('Delete failed');
    }
  };

  const saveTaskResultsToNetlify = async (conversationId, tasks) => {
    console.log(`💾 AIROPS: Saving ${tasks.length} tasks for conversation ${conversationId}`);
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, tasks })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ AIROPS: Tasks saved successfully:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ AIROPS: Failed to save tasks:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ AIROPS: Error saving tasks:', error);
      return false;
    }
  };

  // ✅ ENHANCED: Better task status checking with comprehensive debug logs
  const checkTaskStatus = async (taskId) => {
    console.log(`🔄 AIROPS POLLING: Checking status for task: ${taskId}`);
    try {
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      console.log(`🔄 AIROPS POLLING: Task status API response: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`📋 AIROPS POLLING: Task ${taskId} status: ${result.status}`, result);
        
        if (result.status === 'completed' || result.status === 'failed') {
          console.log(`✅ AIROPS POLLING: Task ${taskId} finished with status ${result.status}, updating UI`);
          
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { 
                  ...task, 
                  status: result.status, 
                  result: result.data, 
                  completedAt: result.completedAt,
                  error: result.error 
                }
              : task
          );
          
          setTaskResults(updatedTasks);
          console.log(`📋 AIROPS POLLING: Updated local task state for ${taskId}`);
          
          // Auto-expand completed tasks
          if (result.status === 'completed') {
            setExpandedTasks(prev => new Set([...prev, taskId]));
            console.log(`📋 AIROPS POLLING: Auto-expanded completed task ${taskId}`);
          }
          
          // Save updated tasks to storage
          if (context?.conversation?.id) {
            const saved = await saveTaskResultsToNetlify(context.conversation.id, updatedTasks);
            if (saved) {
              console.log(`✅ AIROPS POLLING: Task ${taskId} results saved to storage`);
            }
          }
          
          // Stop polling this task
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            console.log(`🔄 AIROPS POLLING: Stopped polling for ${taskId}, remaining: ${newSet.size}`);
            return newSet;
          });
          
          setStatus(`Task ${result.status}!`);
          return true;
        } else {
          console.log(`📋 AIROPS POLLING: Task ${taskId} still ${result.status}, continuing to poll`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ AIROPS POLLING: Task ${taskId} status check failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
    }
    return false;
  };

  // ✅ ENHANCED: Comprehensive polling system with better logging and error handling
  useEffect(() => {
    if (pollingTasks.size > 0) {
      console.log(`🔄 AIROPS POLLING: Starting polling for ${pollingTasks.size} tasks:`, Array.from(pollingTasks));
      
      const checkAllTasks = async () => {
        const tasksToCheck = Array.from(pollingTasks);
        console.log(`🔄 AIROPS POLLING: Checking ${tasksToCheck.length} pending tasks`);
        
        // Check tasks sequentially to avoid overwhelming the API
        for (const taskId of tasksToCheck) {
          try {
            await checkTaskStatus(taskId);
            // Small delay between checks to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
          }
        }
        
        console.log(`✅ AIROPS POLLING: Completed polling cycle`);
      };
      
      // Check immediately after 3 seconds, then every 8 seconds for faster updates
      const initialTimeout = setTimeout(checkAllTasks, 3000);
      const interval = setInterval(checkAllTasks, 8000);
      
      return () => {
        console.log(`🔄 AIROPS POLLING: Stopping polling for ${pollingTasks.size} tasks`);
        clearTimeout(initialTimeout);
        clearInterval(interval);
      };
    } else {
      console.log(`🔄 AIROPS POLLING: No tasks to poll`);
    }
  }, [pollingTasks, taskResults, context]);

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
        
        // Enhanced file content inclusion
        if (uploadedFile.fullContent) {
          combinedText += `\n\nFull File Content:\n${uploadedFile.fullContent}`;
        } else if (uploadedFile.preview) {
          combinedText += `\n\nFile Content Preview:\n${uploadedFile.preview}`;
        } else {
          combinedText += `\n\nNote: Binary file attachment - content not shown in preview`;
        }
      }
    }
    
    return combinedText;
  };

  // ✅ ENHANCED: More comprehensive payload creation with better metadata
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
        console.log(`📨 AIROPS: Loaded ${messagesData.length} messages for context`);
      } catch (err) {
        console.error('❌ AIROPS: Error loading messages:', err);
        messagesData = [];
      }
    }
    
    let draftData = null;
    if (context?.draft) {
      draftData = {
        id: context.draft.id,
        body: context.draft.body,
        subject: context.draft.subject,
        to: context.draft.to,
        cc: context.draft.cc,
        bcc: context.draft.bcc,
        reply_options: context.draft.reply_options
      };
      console.log(`📝 AIROPS: Including draft context:`, { id: draftData.id, hasBody: !!draftData.body });
    }
    
    const teammateData = context?.teammate ? {
      id: context.teammate.id,
      name: context.teammate.name,
      email: context.teammate.email,
      role: context.teammate.role,
      avatar_url: context.teammate.avatar_url,
      timezone: context.teammate.timezone
    } : null;
    
    // Enhanced payload with better organization
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
          full_content: uploadedFile.fullContent || null,
          has_preview: !!uploadedFile.preview,
          has_full_content: !!uploadedFile.fullContent,
          is_text_file: uploadedFile.type?.startsWith('text/') || uploadedFile.name?.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css|yaml|yml)$/i)
        } : null,
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type,
          task_id: taskId,
          callback_url: callbackUrl,
          user_agent: navigator.userAgent,
          plugin_version: "1.1.0",
          // Enhanced metadata for webhook processing
          conversation_id: context?.conversation?.id, // Added for easier extraction
          requesting_user_id: context?.teammate?.id
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

  // ✅ RESTORED: Enhanced file upload handling with better file type detection
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus('File too large (max 2MB)');
      return;
    }

    console.log(`📎 AIROPS: Processing file upload:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    try {
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      };

      // Enhanced file type detection and processing
      const isTextFile = file.type.startsWith('text/') || 
                        file.name.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css|yaml|yml|sql|sh|bat|dockerfile|gitignore|env)$/i);
      
      if (isTextFile) {
        console.log(`📎 AIROPS: Reading text file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          console.log(`📎 AIROPS: File content length: ${content.length} characters`);
          
          // Enhanced preview with more context (up to 8000 characters for preview)
          const previewLength = Math.min(8000, content.length);
          fileData.preview = content.substring(0, previewLength) + 
                           (content.length > previewLength ? 
                             '\n\n[File preview truncated - full content available to AI]' : '');
          
          // Store full content for AI processing (respects 2MB file size limit)
          fileData.fullContent = content;
          fileData.isProcessed = true;
          
          setUploadedFile(fileData);
          setStatus('File uploaded and processed');
          console.log(`✅ AIROPS: Text file processed successfully`);
        };
        reader.onerror = (error) => {
          console.error('❌ AIROPS: Error reading file:', error);
          setStatus('Error reading file');
        };
        reader.readAsText(file);
      } else {
        // Handle non-text files (images, PDFs, etc.)
        console.log(`📎 AIROPS: Processing binary file: ${file.name}`);
        fileData.preview = `[Binary file: ${file.name}]\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nThis file has been uploaded and will be available to the AI for processing.`;
        fileData.isProcessed = true;
        setUploadedFile(fileData);
        setStatus('File uploaded');
        console.log(`✅ AIROPS: Binary file processed successfully`);
      }
      
    } catch (error) {
      console.error('❌ AIROPS: File upload error:', error);
      setStatus('Upload failed');
    }
  };

  const removeFile = () => {
    console.log(`📎 AIROPS: Removing uploaded file: ${uploadedFile?.name}`);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatus('File removed');
  };

  // ✅ ENHANCED: Load history with better error handling and logging
  const loadHistoryFromNetlify = async (conversationId) => {
    console.log(`📚 AIROPS: Loading history for conversation: ${conversationId}`);
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
      console.log(`📚 AIROPS: History API response status: ${response.status}`);
      
      if (response.ok) {
        const { history } = await response.json();
        console.log(`📚 AIROPS: Loaded ${history?.length || 0} history entries`);
        
        if (history && Array.isArray(history)) {
          setCommentHistory(history);
          console.log(`📚 AIROPS: History types:`, history.map(h => h.mode || 'unknown').join(', '));
        } else {
          console.log(`📚 AIROPS: Invalid history data:`, history);
          setCommentHistory([]);
        }
      } else {
        const errorText = await response.text();
        console.log(`📚 AIROPS: No history found (${response.status}): ${errorText}`);
        setCommentHistory([]);
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading history:', error);
      setCommentHistory([]);
    }
  };

  // ✅ ENHANCED: Save history with better error handling and logging
  const saveHistoryToNetlify = async (conversationId, entry) => {
    console.log(`📚 AIROPS: Saving history entry for conversation: ${conversationId}`, {
      text: entry.text.substring(0, 100) + '...',
      mode: entry.mode,
      user: entry.user,
      timestamp: entry.timestamp
    });
    
    try {
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, entry })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ AIROPS: History entry saved successfully:', {
          success: result.success,
          count: result.count
        });
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ AIROPS: Failed to save history - Status:', response.status, 'Error:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ AIROPS: Network error saving history:', error);
      return false;
    }
  };

  // ✅ ENHANCED: Load task results with better error handling and state management
  const loadTaskResultsFromNetlify = async (conversationId) => {
    console.log(`📋 AIROPS: Loading tasks for conversation: ${conversationId}`);
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-tasks?conversationId=${conversationId}`);
      console.log(`📋 AIROPS: Tasks API response status: ${response.status}`);
      
      if (response.ok) {
        const { tasks } = await response.json();
        console.log(`📋 AIROPS: Loaded ${tasks?.length || 0} tasks`);
        
        if (tasks && Array.isArray(tasks)) {
          setTaskResults(tasks);
          console.log(`📋 AIROPS: Task statuses:`, tasks.map(t => `${t.id}: ${t.status}`).join(', '));
          
          // Auto-expand completed tasks
          const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
          if (completedTaskIds.length > 0) {
            setExpandedTasks(new Set(completedTaskIds));
            console.log(`📋 AIROPS: Auto-expanded ${completedTaskIds.length} completed tasks`);
          }
          
          // Resume polling for pending tasks
          const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
          if (pendingTasks.length > 0) {
            setPollingTasks(new Set(pendingTasks));
            console.log(`🔄 AIROPS: Resuming polling for ${pendingTasks.length} pending tasks:`, pendingTasks);
          }
        } else {
          console.log(`📋 AIROPS: Invalid tasks data:`, tasks);
          setTaskResults([]);
        }
      } else {
        const errorText = await response.text();
        console.log(`📋 AIROPS: No tasks found (${response.status}): ${errorText}`); 
        setTaskResults([]);
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading tasks:', error);
      setTaskResults([]);
    }
  };

  // ✅ RESTORED: Enhanced Front API integration with multiple fallback strategies
  const insertIntoDraft = async (content) => {
    console.log('🔍 AIROPS INSERT: Starting draft insertion process');
    console.log('🔍 AIROPS INSERT: Content length:', content.length);
    
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
    console.log('🔍 AIROPS INSERT: Cleaned content length:', cleanContent.length);
    
    // 🔍 DEBUG: Log context details
    console.log('🔍 AIROPS INSERT: Context analysis:', {
      type: context?.type,
      hasContext: !!context,
      hasDraft: !!context?.draft,
      draftId: context?.draft?.id,
      hasConversation: !!context?.conversation,
      conversationId: context?.conversation?.id,
      availableMethods: context ? Object.keys(context).filter(key => typeof context[key] === 'function') : []
    });
    
    if (!context) {
      console.log('❌ AIROPS INSERT: No context available');
      copyToClipboard(content);
      setStatus('Copied to clipboard (no context)');
      return;
    }
    
    try {
      // 🎯 STRATEGY 1: MessageComposer Context (PRIMARY)
      if (context.type === 'messageComposer' && context.draft) {
        console.log('🎯 AIROPS INSERT: Using MessageComposer updateDraft API');
        console.log('🎯 AIROPS INSERT: Draft info:', {
          id: context.draft.id,
          hasBody: !!context.draft.body,
          bodyLength: context.draft.body?.length || 0
        });
        
        const existingBody = context.draft.body || '';
        const newBody = existingBody + (existingBody ? '\n\n' : '') + cleanContent;
        
        // Use the correct Front API: updateDraft(draftId, update, cancelToken)
        await context.updateDraft(context.draft.id, {
          body: newBody
        });
        
        setStatus('Added to draft!');
        console.log('✅ AIROPS INSERT: Successfully updated draft using updateDraft API');
        return;
      }
      
      // 🎯 STRATEGY 2: Single Conversation Context with updateDraft
      if (context.type === 'singleConversation' && typeof context.updateDraft === 'function') {
        console.log('🎯 AIROPS INSERT: Trying singleConversation updateDraft');
        
        // Find existing draft or create new one
        if (context.conversation?.draft) {
          console.log('🎯 AIROPS INSERT: Found conversation draft:', context.conversation.draft.id);
          const existingBody = context.conversation.draft.body || '';
          const newBody = existingBody + (existingBody ? '\n\n' : '') + cleanContent;
          
          await context.updateDraft(context.conversation.draft.id, {
            body: newBody
          });
          
          setStatus('Added to draft!');
          console.log('✅ AIROPS INSERT: Successfully updated conversation draft');
          return;
        }
      }
      
      // 🎯 STRATEGY 3: Direct insertTextIntoBody method (if available)
      if (typeof context.insertTextIntoBody === 'function') {
        console.log('🎯 AIROPS INSERT: Using insertTextIntoBody method');
        await context.insertTextIntoBody(cleanContent);
        setStatus('Inserted into body!');
        console.log('✅ AIROPS INSERT: Successfully used insertTextIntoBody');
        return;
      }
      
      // 🎯 STRATEGY 4: Create New Draft (universal fallback)
      if (typeof context.createDraft === 'function') {
        console.log('🎯 AIROPS INSERT: Creating new draft using createDraft API');
        
        const draftTemplate = {
          body: cleanContent
        };
        
        // Add conversation context if available
        if (context.conversation) {
          draftTemplate.conversationId = context.conversation.id;
          console.log('🎯 AIROPS INSERT: Adding conversation context:', context.conversation.id);
        }
        
        await context.createDraft(draftTemplate);
        setStatus('New draft created!');
        console.log('✅ AIROPS INSERT: Successfully created new draft');
        return;
      }
      
      // 🎯 STRATEGY 5: Generic insert method exploration
      const insertMethods = Object.keys(context).filter(key => 
        typeof context[key] === 'function' && 
        (key.includes('insert') || key.includes('draft') || key.includes('text'))
      );
      
      if (insertMethods.length > 0) {
        console.log('🎯 AIROPS INSERT: Found potential insert methods:', insertMethods);
        
        // Try the most promising methods
        for (const method of insertMethods) {
          try {
            console.log(`🎯 AIROPS INSERT: Trying method: ${method}`);
            await context[method](cleanContent);
            setStatus('Inserted using ' + method);
            console.log(`✅ AIROPS INSERT: Successfully used ${method}`);
            return;
          } catch (methodError) {
            console.log(`❌ AIROPS INSERT: Method ${method} failed:`, methodError.message);
          }
        }
      }
      
      console.log('❌ AIROPS INSERT: No suitable draft API found, available methods:', Object.keys(context).filter(key => typeof context[key] === 'function'));
      
    } catch (error) {
      console.error('❌ AIROPS INSERT: All insert strategies failed:', error);
      setStatus('Insert failed: ' + error.message);
    }
    
    // 📋 FALLBACK: Copy to clipboard with detailed status
    console.log('📋 AIROPS INSERT: Falling back to clipboard copy');
    copyToClipboard(content);
    setStatus('Copied to clipboard (insert unavailable)');
  };

  // ✅ RESTORED: Enhanced copy function with better formatting preservation
  const copyToClipboard = (content) => {
    console.log('📋 AIROPS COPY: Starting copy process, content length:', content.length);
    
    // Create a temporary div to properly convert HTML to text while preserving some formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Enhanced HTML to text conversion with better formatting preservation
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p').forEach(p => p.replaceWith(p.textContent + '\n\n'));
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.replaceWith('# ' + h.textContent + '\n\n'));
    tempDiv.querySelectorAll('li').forEach(li => li.replaceWith('• ' + li.textContent + '\n'));
    tempDiv.querySelectorAll('ul, ol').forEach(list => list.replaceWith(list.textContent + '\n\n'));
    tempDiv.querySelectorAll('blockquote').forEach(quote => quote.replaceWith('> ' + quote.textContent + '\n\n'));
    tempDiv.querySelectorAll('code').forEach(code => code.replaceWith('`' + code.textContent + '`'));
    tempDiv.querySelectorAll('pre').forEach(pre => pre.replaceWith('```\n' + pre.textContent + '\n```\n'));
    
    // Enhanced table handling
    tempDiv.querySelectorAll('table').forEach(table => {
      let tableText = '';
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
        tableText += cells.join(' | ') + '\n';
        
        // Add header separator for first row if it contains th elements
        if (index === 0 && row.querySelector('th')) {
          tableText += cells.map(() => '---').join(' | ') + '\n';
        }
      });
      table.replaceWith(tableText + '\n');
    });
    
    const cleanContent = tempDiv.textContent || tempDiv.innerText || content.replace(/<[^>]*>/g, '');
    console.log('📋 AIROPS COPY: Cleaned content length:', cleanContent.length);
    
    // Modern clipboard API with fallback
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cleanContent).then(() => {
        setStatus('Copied!');
        console.log('✅ AIROPS COPY: Successfully copied using modern API');
      }).catch((error) => {
        console.log('❌ AIROPS COPY: Modern API failed, trying fallback:', error);
        fallbackCopy(cleanContent);
      });
    } else {
      console.log('📋 AIROPS COPY: Using fallback copy method');
      fallbackCopy(cleanContent);
    }
    
    function fallbackCopy(text) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (result) {
          setStatus('Copied!');
          console.log('✅ AIROPS COPY: Successfully copied using fallback');
        } else {
          setStatus('Copy failed');
          console.log('❌ AIROPS COPY: Fallback copy failed');
        }
      } catch (err) {
        setStatus('Copy failed');
        console.error('❌ AIROPS COPY: All copy methods failed:', err);
      }
    }
  };

  // ✅ ENHANCED: Process request with comprehensive error handling and logging
  const processRequest = async () => {
    const now = Date.now();
    if (isProcessingRef.current || (now - lastCallTimeRef.current) < 1000) {
      console.log('🚫 AIROPS: Request blocked - too frequent or already processing');
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
      console.log(`🚀 AIROPS: Creating ${mode} request${taskId ? ` with ID: ${taskId}` : ''}`);
      console.log(`🚀 AIROPS: Request details:`, {
        mode,
        taskId,
        hasFile: !!uploadedFile,
        fileName: uploadedFile?.name,
        outputFormat,
        selectedFormat,
        conversationId: context?.conversation?.id,
        userId: context?.teammate?.id
      });
      
      const combinedInstructions = createCombinedInstructions();
      console.log(`🚀 AIROPS: Combined instructions length: ${combinedInstructions.length} characters`);
      
      const payload = await createCompletePayload(combinedInstructions, taskId);
      console.log(`🚀 AIROPS: Payload created, size: ${JSON.stringify(payload).length} characters`);
      
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
        // Save history entry
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
        
        console.log(`📚 AIROPS: Saving history entry:`, {
          mode: newEntry.mode,
          user: newEntry.user,
          hasFile: newEntry.hasFile,
          textLength: newEntry.text.length
        });
        
        const historySaved = await saveHistoryToNetlify(conversationId, newEntry);
        if (historySaved) {
          setCommentHistory([newEntry, ...commentHistory]);
          console.log('✅ AIROPS: History updated locally');
        }

        // Create and save task if in task mode
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
          
          console.log(`📋 AIROPS: Creating task:`, {
            id: newTask.id,
            user: newTask.user,
            outputFormat: newTask.outputFormat,
            hasFile: newTask.hasFile
          });
          
          const updatedTasks = [newTask, ...taskResults];
          setTaskResults(updatedTasks);
          console.log(`✅ AIROPS: Task ${taskId} created locally`);
          
          // Save to storage with comprehensive error handling
          try {
            // Save individual task for status checking
            const individualResponse = await fetch('/.netlify/functions/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
            
            if (individualResponse.ok) {
              console.log(`✅ AIROPS: Task ${taskId} saved individually`);
            } else {
              const errorText = await individualResponse.text();
              console.error(`❌ AIROPS: Failed to save individual task: ${errorText}`);
            }
            
            // Save to conversation tasks for UI persistence
            const conversationSaved = await saveTaskResultsToNetlify(conversationId, updatedTasks);
            if (conversationSaved) {
              console.log(`✅ AIROPS: Task ${taskId} saved to conversation`);
            }
            
          } catch (storageError) {
            console.error('❌ AIROPS: Storage error:', storageError);
            setStatus('Task created but storage failed');
          }
          
          // Start polling for this task
          setPollingTasks(prev => new Set([...prev, taskId]));
          console.log(`🔄 AIROPS: Started polling for task ${taskId}`);
        }
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      console.log(`🚀 AIROPS: Sending request to webhook: ${webhookUrl.substring(0, 50)}...`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`🚀 AIROPS: Webhook response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AIROPS: Webhook error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ AIROPS: Webhook response received:', responseData);
      
      setStatus(mode === 'email' ? 'Email sent!' : 'Task created!');
      console.log(`✅ AIROPS: ${mode} request completed successfully`);
      
      // Clear form
      setComment('');
      setOutputFormat('');
      setSelectedFormat('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('❌ AIROPS: Request processing failed:', error);
      setStatus('Error: ' + (error.message || 'Unknown error'));
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const viewTaskInNewWindow = (task) => {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <html>
        <head>
          <title>AirOps Task Result</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 1000px; 
              margin: 20px auto; 
              padding: 20px; 
              line-height: 1.6; 
              color: #0f172a;
              background: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: white;
              padding: 24px;
              text-align: center;
            }
            h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .meta { 
              background: #f8fafc; 
              padding: 20px; 
              border-bottom: 1px solid #e2e8f0;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
            }
            .meta-item { 
              background: white;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .meta-label { 
              font-size: 12px; 
              font-weight: 600; 
              color: #6b7280; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .meta-value { 
              font-size: 14px; 
              color: #0f172a; 
              font-weight: 500;
            }
            .content { 
              padding: 24px; 
            }
            .content h2, .content h3 { color: #0f172a; margin: 24px 0 12px 0; }
            .content p { margin-bottom: 16px; }
            .content ul, .content ol { margin: 16px 0; padding-left: 24px; }
            .content li { margin-bottom: 8px; }
            .content table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 20px 0; 
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
            }
            .content th, .content td { 
              border-bottom: 1px solid #e2e8f0; 
              padding: 12px 16px; 
              text-align: left; 
            }
            .content th { 
              background-color: #f8fafc; 
              font-weight: 600; 
              font-size: 14px;
            }
            .content td { font-size: 14px; }
            .content blockquote {
              border-left: 4px solid #6366f1;
              background: #f8fafc;
              margin: 20px 0;
              padding: 16px 20px;
              border-radius: 0 8px 8px 0;
            }
            .content code { 
              background: #f1f5f9; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; 
              font-size: 13px;
            }
            .content pre { 
              background: #0f172a; 
              color: #e2e8f0; 
              padding: 20px; 
              border-radius: 8px; 
              overflow-x: auto; 
              margin: 20px 0;
            }
            .content pre code { 
              background: none; 
              padding: 0; 
              color: inherit; 
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-failed { background: #fee2e2; color: #dc2626; }
            .status-pending { background: #fef3c7; color: #d97706; }
            @media (max-width: 768px) {
              body { margin: 10px; padding: 15px; }
              .meta { grid-template-columns: 1fr; }
              .header, .content { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AirOps Task Result</h1>
            </div>
            <div class="meta">
              <div class="meta-item">
                <div class="meta-label">Format</div>
                <div class="meta-value">${task.outputFormat || 'General Task'}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Status</div>
                <div class="meta-value">
                  <span class="status-badge status-${task.status}">${task.status}</span>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Created</div>
                <div class="meta-value">${formatDate(task.createdAt)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">User</div>
                <div class="meta-value">${task.user}</div>
              </div>
              ${task.fileName ? `
              <div class="meta-item">
                <div class="meta-label">File</div>
                <div class="meta-value">${task.fileName}</div>
              </div>
              ` : ''}
            </div>
            <div class="content">
              ${task.result || '<p style="text-align: center; color: #6b7280; font-style: italic;">No result available yet.</p>'}
            </div>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const viewHistoryEntryInNewWindow = (entry) => {
    const newWindow = window.open('', '_blank');
    const content = entry.result || entry.text;
    const title = entry.isTaskCompletion ? 'AirOps Task Result' : 'AirOps History Entry';
    
    newWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 1000px; 
              margin: 20px auto; 
              padding: 20px; 
              line-height: 1.6; 
              color: #0f172a;
              background: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header { 
              background: ${entry.isTaskCompletion ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
              color: white;
              padding: 24px;
              text-align: center;
            }
            h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .meta { 
              background: #f8fafc; 
              padding: 20px; 
              border-bottom: 1px solid #e2e8f0;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
            }
            .meta-item { 
              background: white;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .meta-label { 
              font-size: 12px; 
              font-weight: 600; 
              color: #6b7280; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .meta-value { 
              font-size: 14px; 
              color: #0f172a; 
              font-weight: 500;
            }
            .content { 
              padding: 24px; 
            }
            @media (max-width: 768px) {
              body { margin: 10px; padding: 15px; }
              .meta { grid-template-columns: 1fr; }
              .header, .content { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
            </div>
            <div class="meta">
              <div class="meta-item">
                <div class="meta-label">Type</div>
                <div class="meta-value">${entry.isTaskCompletion ? 'Task Completion' : entry.mode === 'email' ? 'Email Request' : 'Task Request'}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Created</div>
                <div class="meta-value">${formatDate(entry.timestamp)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">User</div>
                <div class="meta-value">${entry.user}</div>
              </div>
              ${entry.outputFormat ? `
              <div class="meta-item">
                <div class="meta-label">Format</div>
                <div class="meta-value">${entry.outputFormat}</div>
              </div>
              ` : ''}
              ${entry.fileName ? `
              <div class="meta-item">
                <div class="meta-label">File</div>
                <div class="meta-value">${entry.fileName}</div>
              </div>
              ` : ''}
            </div>
            <div class="content">
              ${content}
            </div>
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: theme.spacing.sm }}>Loading AirOps Plugin...</div>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: `2px solid ${theme.colors.border}`,
            borderTop: `2px solid ${theme.colors.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        fontSize: theme.fontSize.base,
        color: theme.colors.secondary,
        textAlign: 'center',
        background: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        margin: theme.spacing.md
      }}>
        <div style={{ marginBottom: theme.spacing.sm }}>
          <EmailIcon size={24} color={theme.colors.tertiary} />
        </div>
        <div style={{ fontWeight: '500', marginBottom: theme.spacing.xs }}>
          Select a conversation
        </div>
        <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.tertiary }}>
          Choose a conversation to use the AirOps plugin
        </div>
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
        padding: theme.spacing.lg,
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

      {/* Enhanced Header with debug buttons */}
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
          color: theme.colors.primary,
          flex: 1
        }}>
          {cardSize.width < 220 ? 'AirOps' : 'Send to AirOps'}
        </span>
        
        {/* Enhanced debug buttons */}
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          <button
            onClick={debugHistoryAPI}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.tertiary,
              fontSize: theme.fontSize.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.colors.accent}
            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
            title="Debug API (check console)"
          >
            🧪
          </button>
          <button
            onClick={manualRefresh}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.tertiary,
              fontSize: theme.fontSize.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.colors.primary}
            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
            title="Manual refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
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
              size={theme.iconSize.sm} 
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
              size={theme.iconSize.sm} 
              color={mode === 'task' ? theme.colors.primary : theme.colors.secondary} 
              style={{ marginRight: theme.spacing.xs }} 
            />
            Task
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '2px',
        marginBottom: theme.spacing.sm
      }}>
        {/* Instructions Input */}
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              mode === 'email' ? "How should we respond?" : "What do you need created?"
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

        {/* Task Mode Controls */}
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

            {/* Enhanced File Upload */}
            <div style={{ marginTop: theme.spacing.sm }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml,.yaml,.yml,.sql,.sh,.bat"
                style={{ display: 'none' }}
                multiple={false}
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
                  <UploadIcon size={theme.iconSize.md} color={theme.colors.accent} style={{ marginRight: theme.spacing.xs }} />
                  Upload reference file (optional)
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
                    <AttachmentIcon size={theme.iconSize.sm} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs, flexShrink: 0 }} />
                    <div style={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)}KB)
                      {uploadedFile.isProcessed && <span style={{ color: theme.colors.success }}> ✓</span>}
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
                    <Icon name="Close" size={theme.iconSize.sm} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results and History */}
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
                      <Icon name="TrashFilled" size={theme.iconSize.md} />
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
                              width: `${theme.iconSize.md}px`, 
                              height: `${theme.iconSize.md}px`, 
                              marginRight: theme.spacing.sm,
                              border: `2px solid ${theme.colors.accent}`,
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          ) : task.status === 'completed' ? (
                            <CheckmarkIcon size={theme.iconSize.md} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
                          ) : (
                            <WarningIcon size={theme.iconSize.md} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
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
                                  size={theme.iconSize.sm} 
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
                        
                        {/* Action buttons */}
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}
                          onClick={(e) => e.stopPropagation()}
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
                              <ViewIcon size={theme.iconSize.md} color="currentColor" />
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
                            <Icon name="Trash" size={theme.iconSize.md} />
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
                                fontSize: theme.fontSize.result,
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
                                  <Icon name="Copy" size={theme.iconSize.sm} style={{ marginRight: theme.spacing.xs }} />
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
                                  <InsertIcon size={theme.iconSize.sm} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs }} />
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
                      onMouseEnter={(e) => e.target.style.color = theme.colors.error}
                      onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                      title="Delete all history"
                    >
                      <Icon name="TrashFilled" size={theme.iconSize.md} />
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
                          
                          {entry.isTaskCompletion ? (
                            <CheckmarkIcon size={theme.iconSize.sm} color={theme.colors.success} />
                          ) : entry.mode === 'email' ? (
                            <EmailIcon size={theme.iconSize.sm} color={theme.colors.tertiary} />
                          ) : (
                            <TaskIcon size={theme.iconSize.sm} color={theme.colors.tertiary} />
                          )}
                          
                          <span>• {entry.user}</span>
                          
                          {entry.hasFile && (
                            <AttachmentIcon size={theme.iconSize.sm} color={theme.colors.tertiary} style={{ marginLeft: '2px' }} />
                          )}
                          
                          {entry.isTaskCompletion && (
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
                        
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewHistoryEntryInNewWindow(entry);
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
                            onMouseEnter={(e) => e.target.style.color = theme.colors.info}
                            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                            title="View entry"
                          >
                            <ViewIcon size={theme.iconSize.sm} color="currentColor" />
                          </button>
                          
                          {entry.isTaskCompletion && entry.result && (
                            <>
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
                                <Icon name="Copy" size={theme.iconSize.sm} />
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
                                <InsertIcon size={theme.iconSize.sm} color={theme.colors.tertiary} />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this history entry?')) {
                                deleteHistoryEntry(index);
                              }
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
                            onMouseEnter={(e) => e.target.style.color = theme.colors.error}
                            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                            title="Delete this entry"
                          >
                            <Icon name="Trash" size={theme.iconSize.sm} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Entry Content */}
                      <div style={{ 
                        color: entry.isTaskCompletion ? theme.colors.success : theme.colors.secondary, 
                        lineHeight: 1.3,
                        fontSize: theme.fontSize.xs,
                        marginBottom: entry.result ? '4px' : '0'
                      }}>
                        {entry.isTaskCompletion ? 
                          entry.text.replace(/^Task completed:\s*/i, '') : 
                          entry.text
                        }
                      </div>
                      
                      {/* Task Result Preview */}
                      {entry.isTaskCompletion && entry.result && (
                        <div style={{
                          background: theme.colors.surface,
                          border: `1px solid ${theme.colors.success}30`,
                          borderRadius: theme.borderRadius.sm,
                          padding: theme.spacing.xs,
                          marginTop: '2px',
                          fontSize: theme.fontSize.sm,
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

      {/* Bottom Section */}
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
                size={theme.iconSize.sm} 
                color={theme.colors.success} 
                style={{ marginRight: theme.spacing.xs }} 
              />
            )}
            <span>{status}</span>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleCardResizeStart}
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