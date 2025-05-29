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
  TrashIcon,
  TrashFilledIcon
} from './CustomIcons';
import './App.css';

// ✅ FIX 1: Move getRequestState OUTSIDE the component to fix the error
const getRequestState = (request) => {
  if (request.isTaskCompletion && request.result) {
    return { 
      status: 'completed', 
      color: '#22c55e',
      label: 'Completed',
      showSpinner: false
    };
  }
  if (request.status === 'pending') {
    return { 
      status: 'processing', 
      color: '#6366f1',
      label: 'Processing',
      showSpinner: true
    };
  }
  if (request.status === 'failed') {
    return { 
      status: 'failed', 
      color: '#ef4444',
      label: 'Failed',
      showSpinner: false
    };
  }
  if (request.mode === 'email' || request.type === 'email') {
    return { 
      status: 'sent', 
      color: '#3b82f6',
      label: 'Sent',
      showSpinner: false
    };
  }
  return { 
    status: 'completed', 
    color: '#22c55e',
    label: 'Completed',
    showSpinner: false
  };
};

// ✅ Enhanced task name generation helper
const generateTaskName = (comment, selectedFormat, outputFormat, formatOptions, mode) => {
  let taskName = '';
  
  if (mode === 'email') {
    return 'Email Request';
  }
  
  // Priority 1: Selected format
  if (selectedFormat && selectedFormat !== '') {
    const formatOption = formatOptions.find(f => f.value === selectedFormat);
    taskName = formatOption ? formatOption.label : 'Custom Format';
    return taskName;
  }
  
  // Priority 2: Output format text
  if (outputFormat && outputFormat.trim()) {
    return outputFormat.trim();
  }
  
  // Priority 3: Smart extraction from comment
  if (comment && comment.trim()) {
    const text = comment.trim();
    
    // Look for action words at the start
    const actionPatterns = [
      /^(create|write|generate|make|build|draft|compose)\s+(.+)/i,
      /^(analyze|review|check|examine|evaluate)\s+(.+)/i,
      /^(summarize|summary of|sum up)\s+(.+)/i,
      /^(list|show|display)\s+(.+)/i,
      /^(update|edit|modify|change)\s+(.+)/i,
      /^(format|convert|transform)\s+(.+)/i
    ];
    
    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        const action = match[1].toLowerCase();
        const object = match[2].split(/[.,!?]/)[0].trim(); // Stop at punctuation
        const shortObject = object.length > 25 ? object.substring(0, 25) + '...' : object;
        
        // Capitalize first letter of action
        const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
        return `${capitalizedAction} ${shortObject}`;
      }
    }
    
    // Fallback: First few words
    const words = text.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  }
  
  return 'General Task';
};

function App() {
  const context = useFrontContext();

  const getHistoryDisplayName = (entry) => {
    // Priority order: taskName from webhook > displayName > outputFormat based on mode > fallback
    if (entry.taskName) {
      return entry.taskName;
    }
    
    if (entry.displayName) {
      return entry.displayName;
    }
    
    if (entry.isTaskCompletion) {
      return entry.outputFormat || 'Task Completed';
    }
    
    if (entry.mode === 'email') {
      return 'Email Request';
    }
    
    if (entry.mode === 'task' || entry.mode === 'task_completion') {
      if (entry.selectedFormat) {
        const formatOption = formatOptions.find(f => f.value === entry.selectedFormat);
        if (formatOption) {
          return formatOption.label;
        }
      }
      return entry.outputFormat || 'Task Request';
    }
    
    return 'Request';
  };

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
  const [expandedRequests, setExpandedRequests] = useState(new Set()); 
  // ✅ NEW: Hierarchical expansion states
  const [expandedInputs, setExpandedInputs] = useState(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState(new Set());
  
  // Compact auto-resize state
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
  const statusTimeoutRef = useRef(null);
  
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

  // ✅ NEW: Auto-clear status after 15 seconds
  useEffect(() => {
    if (status) {
      // Clear any existing timeout
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      
      // Set new timeout to clear status after 15 seconds
      statusTimeoutRef.current = setTimeout(() => {
        setStatus('');
      }, 15000);
      
      // Cleanup function
      return () => {
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
      };
    }
  }, [status]);

  // ✅ Enhanced adaptive theme
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
      xs: `${Math.max(9, Math.min(11, cardSize.width / 32))}px`,
      sm: `${Math.max(10, Math.min(12, cardSize.width / 28))}px`,
      base: `${Math.max(11, Math.min(13, cardSize.width / 25))}px`,
      lg: `${Math.max(12, Math.min(14, cardSize.width / 22))}px`,
      xl: `${Math.max(13, Math.min(15, cardSize.width / 20))}px`,
      result: `${Math.max(12, Math.min(14, cardSize.width / 22))}px`
    },
    iconSize: {
      sm: Math.max(8, Math.min(12, cardSize.width / 28)),
      md: Math.max(10, Math.min(14, cardSize.width / 25)),
      lg: Math.max(12, Math.min(16, cardSize.width / 22))
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  // ✅ Helper functions
  const combineRequestsAndTasks = (taskResults, commentHistory) => {
    // Convert tasks to unified format
    const unifiedTasks = taskResults.map(task => ({
      id: task.id,
      type: 'task',
      text: task.comment,
      comment: task.comment,
      outputFormat: task.outputFormat,
      selectedFormat: task.selectedFormat,
      taskName: task.taskName,
      displayName: task.displayName,
      hasFile: task.hasFile,
      fileName: task.fileName,
      status: task.status,
      result: task.result,
      error: task.error,
      timestamp: task.createdAt,
      completedAt: task.completedAt,
      user: task.user,
      isTaskCompletion: task.status === 'completed' && task.result,
      mode: 'task'
    }));

    // Convert history to unified format
    const unifiedHistory = commentHistory.map((entry, index) => ({
      id: `history_${entry.timestamp}_${index}`,
      type: entry.mode || 'email',
      text: entry.text,
      comment: entry.text,
      outputFormat: entry.outputFormat,
      selectedFormat: entry.selectedFormat,
      taskName: entry.taskName,
      displayName: entry.displayName,
      hasFile: entry.hasFile,
      fileName: entry.fileName,
      status: entry.isTaskCompletion ? 'completed' : 'sent',
      result: entry.result,
      timestamp: entry.timestamp,
      user: entry.user,
      isTaskCompletion: entry.isTaskCompletion,
      mode: entry.mode,
      originalIndex: index
    }));

    // Combine and sort by timestamp (newest first)
    const combined = [...unifiedTasks, ...unifiedHistory]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return combined;
  };

  const sortUnifiedRequests = (requests) => {
    const statusPriority = {
      'processing': 1,
      'queued': 2,
      'completed': 3,
      'sent': 4,
      'failed': 5,
      'unknown': 6
    };
    
    return requests.sort((a, b) => {
      const stateA = getRequestState(a);
      const stateB = getRequestState(b);
      
      // First sort by status priority
      const priorityDiff = statusPriority[stateA.status] - statusPriority[stateB.status];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (newest first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  const getRequestDisplayName = (request) => {
    // ⭐ Enhanced priority logic
    if (request.taskName && request.taskName.trim()) {
      return request.taskName.trim();
    }
    
    if (request.displayName && request.displayName.trim()) {
      return request.displayName.trim();
    }
    
    // Generate from format selection
    if (request.selectedFormat) {
      const formatOption = formatOptions.find(f => f.value === request.selectedFormat);
      if (formatOption && formatOption.label !== 'Select format...') {
        return `${formatOption.label} Request`;
      }
    }
    
    // Generate from output format
    if (request.outputFormat && request.outputFormat.trim() && request.outputFormat !== 'Select format...') {
      return request.outputFormat.trim();
    }
    
    // ⭐ SMARTER: Generate from comment text
    if (request.text || request.comment) {
      const text = (request.text || request.comment).trim();
      
      // Look for action words at the start
      const actionPatterns = [
        /^(create|write|generate|make|build|draft|compose)\s+(.+)/i,
        /^(analyze|review|check|examine|evaluate)\s+(.+)/i,
        /^(summarize|summary of|sum up)\s+(.+)/i,
        /^(list|show|display)\s+(.+)/i
      ];
      
      for (const pattern of actionPatterns) {
        const match = text.match(pattern);
        if (match) {
          const action = match[1].toLowerCase();
          const object = match[2].split(/[.,!?]/)[0].trim(); // Stop at punctuation
          const shortObject = object.length > 25 ? object.substring(0, 25) + '...' : object;
          
          // Capitalize first letter of action
          const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
          return `${capitalizedAction} ${shortObject}`;
        }
      }
      
      // Fallback: First few words
      const words = text.split(' ').slice(0, 4).join(' ');
      return words.length > 30 ? words.substring(0, 30) + '...' : words;
    }
    
    // Final fallbacks
    if (request.mode === 'email' || request.type === 'email') {
      return 'Email Request';
    }
    
    return 'General Request';
  };

const UnifiedRequestCard = ({ request, onDelete, onInsert, onView }) => {
  const isExpanded = expandedRequests.has(request.id);
  
  const toggleMainExpansion = () => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(request.id)) {
        newSet.delete(request.id);
      } else {
        newSet.add(request.id);
      }
      return newSet;
    });
  };
  
  const state = getRequestState(request);
  
  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${state.color}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      boxShadow: theme.shadows.sm
    }}>
      {/* Header */}
      <div 
        onClick={toggleMainExpansion}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          marginBottom: isExpanded ? theme.spacing.md : 0
        }}
      >
        <div style={{ 
          marginRight: theme.spacing.md,
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: theme.fontSize.sm,
          color: theme.colors.tertiary
        }}>
          ▶
        </div>
        
        {/* Status Icon */}
        {state.showSpinner ? (
          <div style={{ 
            width: `${theme.iconSize.lg}px`, 
            height: `${theme.iconSize.lg}px`, 
            marginRight: theme.spacing.md,
            border: `2px solid ${state.color}`,
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : state.status === 'completed' ? (
          <CheckmarkIcon size={theme.iconSize.lg} color={state.color} style={{ marginRight: theme.spacing.md }} />
        ) : state.status === 'sent' ? (
          <EmailIcon size={theme.iconSize.lg} color={state.color} style={{ marginRight: theme.spacing.md }} />
        ) : (
          <WarningIcon size={theme.iconSize.lg} color={state.color} style={{ marginRight: theme.spacing.md }} />
        )}
        
        {/* Request Info */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            color: theme.colors.primary,
            fontWeight: '600',
            fontSize: theme.fontSize.base,
            marginBottom: theme.spacing.xs
          }}>
            {getRequestDisplayName(request)}
            {request.hasFile && (
              <AttachmentIcon 
                size={theme.iconSize.sm} 
                color={theme.colors.tertiary} 
                style={{ marginLeft: theme.spacing.sm }} 
              />
            )}
          </div>
          
          <div style={{ 
            color: theme.colors.tertiary, 
            fontSize: theme.fontSize.sm
          }}>
            {formatDate(request.timestamp)} • {request.user}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Delete Button - Always visible */}
          <button
            onClick={() => onDelete(request)}
            style={{
              background: 'none',
              border: `1px solid ${theme.colors.border}`,
              cursor: 'pointer',
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = theme.colors.error;
              e.target.style.borderColor = theme.colors.error;
            }}
            onMouseLeave={(e) => {
              e.target.style.color = theme.colors.tertiary;
              e.target.style.borderColor = theme.colors.border;
            }}
            title="Delete request"
          >
            <TrashIcon size={theme.iconSize.sm} />
          </button>

          {(request.result && state.status === 'completed') && (
            <>
              <button
                onClick={() => onView(request)}
                style={{
                  background: theme.colors.info,
                  border: 'none',
                  cursor: 'pointer',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: theme.fontSize.sm,
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                onMouseLeave={(e) => e.target.style.background = theme.colors.info}
                title="View result"
              >
                <ViewIcon size={theme.iconSize.sm} color="white" style={{ marginRight: theme.spacing.xs }} />
                View
              </button>
              
              <button
                onClick={() => onInsert(request.result)}
                style={{
                  background: theme.colors.accent,
                  border: 'none',
                  cursor: 'pointer',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: theme.fontSize.sm,
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#5855eb'}
                onMouseLeave={(e) => e.target.style.background = theme.colors.accent}
                title="Insert into draft"
              >
                <InsertIcon size={theme.iconSize.sm} color="white" style={{ marginRight: theme.spacing.xs }} />
                Insert
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ 
          paddingLeft: theme.spacing.xl,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Original Request */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h4 style={{ 
              fontSize: theme.fontSize.base, 
              color: theme.colors.secondary, 
              fontWeight: '600',
              margin: `0 0 ${theme.spacing.sm} 0`
            }}>
              Original Request
            </h4>
            <div style={{
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              fontSize: theme.fontSize.sm,
              color: theme.colors.secondary,
              lineHeight: '1.5'
            }}>
              {request.text || request.comment}
              {request.outputFormat && (
                <div style={{ 
                  marginTop: theme.spacing.sm,
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.tertiary,
                  fontStyle: 'italic'
                }}>
                  Format: {request.outputFormat}
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          {(request.result && state.status === 'completed') && (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: theme.spacing.sm
              }}>
                <h4 style={{ 
                  fontSize: theme.fontSize.base, 
                  color: state.color, 
                  fontWeight: '600',
                  margin: 0
                }}>
                  Result
                </h4>
                
                <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                  <button
                    onClick={() => onDelete(request)}
                    style={{
                      background: 'none',
                      border: `1px solid ${theme.colors.border}`,
                      cursor: 'pointer',
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.tertiary,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: theme.fontSize.xs,
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = theme.colors.error;
                      e.target.style.borderColor = theme.colors.error;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = theme.colors.tertiary;
                      e.target.style.borderColor = theme.colors.border;
                    }}
                    title="Delete request"
                  >
                    <TrashIcon size={theme.iconSize.sm} style={{ marginRight: theme.spacing.xs }} />
                    Delete
                  </button>

                  <button
                    onClick={() => onView(request)}
                    style={{
                      background: theme.colors.info,
                      border: 'none',
                      cursor: 'pointer',
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.borderRadius.sm,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: theme.fontSize.xs,
                      fontWeight: '500'
                    }}
                    title="View in new window"
                  >
                    <ViewIcon size={theme.iconSize.sm} color="white" style={{ marginRight: theme.spacing.xs }} />
                    View
                  </button>
                  
                  <button
                    onClick={() => onInsert(request.result)}
                    style={{
                      background: theme.colors.accent,
                      border: 'none',
                      cursor: 'pointer',
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.borderRadius.sm,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: theme.fontSize.xs,
                      fontWeight: '500'
                    }}
                    title="Insert into draft"
                  >
                    <InsertIcon size={theme.iconSize.sm} color="white" style={{ marginRight: theme.spacing.xs }} />
                    Insert
                  </button>
                </div>
              </div>

              {/* HTML Content Display */}
              <div style={{
                background: theme.colors.surface,
                border: `1px solid ${state.color}`,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                maxHeight: '400px',
                overflowY: 'auto',
                fontSize: theme.fontSize.base,
                lineHeight: '1.6'
              }}>
                <div 
                  dangerouslySetInnerHTML={{ __html: request.result }}
                  style={{ 
                    color: theme.colors.primary
                  }}
                />
              </div>
            </div>
          )}

          {/* Status Messages */}
          {state.status === 'processing' && (
            <div style={{
              background: `${theme.colors.accent}15`,
              border: `1px solid ${theme.colors.accent}`,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              color: theme.colors.accent,
              fontSize: theme.fontSize.sm,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                marginRight: theme.spacing.sm,
                border: `2px solid ${theme.colors.accent}`,
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Processing your request...
            </div>
          )}

          {state.status === 'failed' && (
            <div style={{
              background: `${theme.colors.error}15`,
              border: `1px solid ${theme.colors.error}`,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              color: theme.colors.error,
              fontSize: theme.fontSize.sm,
              fontWeight: '500'
            }}>
              ❌ Request failed: {request.error || 'Unknown error'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

  // ✅ Action handlers
  const clearAllRequests = async () => {
    if (!confirm('Delete all requests? This cannot be undone.')) return;
    
    try {
      // Clear both tasks and history
      await Promise.all([
        clearAllTasks(),
        clearHistory()
      ]);
      
      // Clear all expansion states
      setExpandedRequests(new Set());
      setExpandedInputs(new Set());
      setExpandedOutputs(new Set());
      setStatus('All requests cleared');
    } catch (error) {
      console.error('❌ Error clearing requests:', error);
      setStatus('Clear failed');
    }
  };

  // ✅ ENHANCED: Test deletion without actually deleting (for debugging)
  const testDeletion = async (request) => {
    console.log('🧪 TEST DELETION (NO ACTUAL DELETE)');
    console.log('=====================================');
    console.log('🗑️ REQUEST TO DELETE:', {
      id: request.id,
      type: request.type,
      hasOriginalIndex: request.originalIndex !== undefined,
      originalIndex: request.originalIndex,
      timestamp: request.timestamp,
      user: request.user,
      textPreview: request.text?.substring(0, 50)
    });

    if (request.type === 'task') {
      console.log('🗑️ TASK DELETION TEST:');
      const taskExists = taskResults.find(task => task.id === request.id);
      console.log('   - Task exists in taskResults:', !!taskExists);
      console.log('   - Task index in array:', taskResults.findIndex(task => task.id === request.id));
      if (taskExists) {
        console.log('   - Task details:', taskExists);
        console.log('   - ✅ Task deletion would succeed');
      } else {
        console.log('   - ❌ Task not found - deletion would fail');
      }
    } else {
      console.log('🗑️ HISTORY DELETION TEST:');
      console.log('   - Current history length:', commentHistory.length);
      
      let historyIndex = -1;
      
      if (request.originalIndex !== undefined) {
        historyIndex = request.originalIndex;
        console.log('   - Using originalIndex:', historyIndex);
        console.log('   - Index valid:', historyIndex >= 0 && historyIndex < commentHistory.length);
        
        if (historyIndex >= 0 && historyIndex < commentHistory.length) {
          const entry = commentHistory[historyIndex];
          console.log('   - Entry at originalIndex:', {
            timestamp: entry.timestamp,
            user: entry.user,
            textPreview: entry.text?.substring(0, 50)
          });
          console.log('   - ✅ Original index deletion would succeed');
        } else {
          console.log('   - ❌ Original index out of bounds');
        }
      } else {
        console.log('   - No originalIndex, searching...');
        historyIndex = commentHistory.findIndex((entry, index) => {
          const timestampMatch = entry.timestamp === request.timestamp;
          const userMatch = entry.user === request.user;
          const textMatch = entry.text === request.text;
          const overallMatch = timestampMatch && userMatch && textMatch;
          
          console.log(`   - Checking index ${index}:`, {
            timestampMatch,
            userMatch,
            textMatch,
            overallMatch,
            entryTimestamp: entry.timestamp,
            requestTimestamp: request.timestamp,
            entryUser: entry.user,
            requestUser: request.user
          });
          
          return overallMatch;
        });
        
        console.log('   - Search result index:', historyIndex);
        
        if (historyIndex >= 0) {
          console.log('   - ✅ Search-based deletion would succeed');
        } else {
          console.log('   - ❌ No matching entry found - deletion would fail');
          
          // Extra debugging - show all history entries for comparison
          console.log('   - ALL HISTORY ENTRIES FOR COMPARISON:');
          commentHistory.forEach((entry, index) => {
            console.log(`     [${index}]`, {
              timestamp: entry.timestamp,
              user: entry.user,
              textPreview: entry.text?.substring(0, 30)
            });
          });
        }
      }
    }
    
    setStatus('🧪 Deletion test complete - check console');
  };

  const deleteRequest = async (request) => {
    console.log('🗑️ DELETING REQUEST:', {
      id: request.id,
      type: request.type,
      hasOriginalIndex: request.originalIndex !== undefined,
      originalIndex: request.originalIndex
    });

    try {
      if (request.type === 'task') {
        await deleteTask(request.id);
      } else {
        // ✅ ENHANCED: Better history matching logic
        let historyIndex = -1;
        
        if (request.originalIndex !== undefined) {
          // Use originalIndex if available
          historyIndex = request.originalIndex;
          console.log('🗑️ Using originalIndex:', historyIndex);
        } else {
          // Fallback: Find by matching properties
          historyIndex = commentHistory.findIndex((entry, index) => {
            const match = entry.timestamp === request.timestamp && 
                         entry.user === request.user &&
                         entry.text === request.text;
            console.log(`🗑️ Checking index ${index}:`, {
              timestampMatch: entry.timestamp === request.timestamp,
              userMatch: entry.user === request.user,
              textMatch: entry.text === request.text,
              overallMatch: match
            });
            return match;
          });
          console.log('🗑️ Found historyIndex via search:', historyIndex);
        }
        
        if (historyIndex !== -1 && historyIndex < commentHistory.length) {
          console.log('🗑️ Deleting history entry at index:', historyIndex);
          await deleteHistoryEntry(historyIndex);
        } else {
          console.error('🗑️ Could not find history entry to delete:', {
            historyIndex,
            historyLength: commentHistory.length,
            request: {
              timestamp: request.timestamp,
              user: request.user,
              textPreview: request.text?.substring(0, 50)
            }
          });
          setStatus('❌ Could not locate entry to delete');
          return;
        }
      }
      
      // Remove from all expansion states
      setExpandedRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
      
      setExpandedInputs(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
      
      setExpandedOutputs(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
      
      console.log('✅ Request deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting request:', error);
      setStatus('Delete failed');
    }
  };

// ✅ ENHANCED: Better HTML view window
const viewRequestInNewWindow = (request) => {
  const content = request.result || request.text || request.comment;
  const title = getRequestDisplayName(request);
  
  const newWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
  
  newWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>AirOps: ${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f9fafb;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
          }
          
          .header { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
          }
          
          .meta { 
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.875rem;
            margin-top: 0.5rem;
          }
          
          .content { 
            padding: 2rem;
          }
          
          /* Enhanced Table Styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 1.5rem 0 !important;
            font-size: 0.875rem !important;
            background: white !important;
            border-radius: 0.5rem !important;
            overflow: hidden !important;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
          }
          
          th {
            background: #f8fafc !important;
            color: #374151 !important;
            font-weight: 600 !important;
            padding: 0.75rem 1rem !important;
            text-align: left !important;
            border-bottom: 2px solid #e5e7eb !important;
            font-size: 0.8125rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.025em !important;
          }
          
          td {
            padding: 0.75rem 1rem !important;
            border-bottom: 1px solid #f3f4f6 !important;
            vertical-align: top !important;
            color: #4b5563 !important;
          }
          
          tr:nth-child(even) td {
            background: #f9fafb !important;
          }
          
          tr:hover td {
            background: #f3f4f6 !important;
          }
          
          /* List Styling */
          ul, ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }
          
          li {
            margin: 0.5rem 0;
            color: #4b5563;
          }
          
          /* Paragraph Styling */
          p {
            margin: 1rem 0;
            color: #4b5563;
          }
          
          /* Header Styling */
          h1, h2, h3, h4, h5, h6 {
            color: #1f2937;
            font-weight: 600;
            line-height: 1.25;
            margin: 1.5rem 0 1rem 0;
          }
          
          h1 { font-size: 1.875rem; }
          h2 { font-size: 1.5rem; }
          h3 { font-size: 1.25rem; }
          h4 { font-size: 1.125rem; }
          
          /* Strong/Bold Styling */
          strong, b {
            font-weight: 600;
            color: #1f2937;
          }
          
          /* Code Styling */
          code {
            background: #f3f4f6;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            color: #d63384;
          }
          
          pre {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            border: 1px solid #e5e7eb;
          }
          
          /* Link Styling */
          a {
            color: #6366f1;
            text-decoration: none;
          }
          
          a:hover {
            text-decoration: underline;
          }
          
          /* Blockquote Styling */
          blockquote {
            border-left: 4px solid #6366f1;
            margin: 1rem 0;
            padding: 0.5rem 0 0.5rem 1rem;
            background: #f8fafc;
            color: #4b5563;
            font-style: italic;
          }
          
          /* Print Styles */
          @media print {
            .header {
              background: #6366f1 !important;
              -webkit-print-color-adjust: exact;
            }
            
            table {
              break-inside: avoid;
            }
            
            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
            <div class="meta">
              Generated by ${request.user} on ${formatDate(request.timestamp)}
              ${request.completedAt ? ` • Completed ${formatDate(request.completedAt)}` : ''}
            </div>
          </div>
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `);
  
  newWindow.document.close();
  newWindow.focus();
};

  // ✅ ENHANCED: Front context debugging based on the API definitions
  const comprehensiveContextDebug = async () => {
    console.log('🔍 COMPREHENSIVE FRONT CONTEXT DEBUG');
    console.log('=====================================');
    
    // 1. Basic context info
    console.log('1. BASIC CONTEXT:', {
      hasContext: !!context,
      contextType: context?.type,
      contextConstructor: context?.constructor?.name
    });
    
    // 2. ✅ ENHANCED: Check specific Front API methods based on the type definitions
    if (context) {
      console.log('2. FRONT API METHOD AVAILABILITY:');
      
      // Base methods that should be available on all contexts
      const baseMethods = [
        'createWidget', 'destroyWidget', 'sendHttp', 'relayHttp', 
        'authenticate', 'deauthenticate', 'openUrl', 'openUrlInPopup',
        'search', 'listTeammates', 'listInboxes', 'listChannels', 'listTags',
        'createDraft', 'updateDraft'
      ];
      
      // Context-specific methods
      const conversationMethods = [
        'addTopic', 'addLink', 'assign', 'move', 'setStatus', 'tag', 'untag', 
        'removeLink', 'fetchPath'
      ];
      
      const singleConversationMethods = [
        'fetchDraft', 'listMessages', 'listComments', 'downloadAttachment', 'listRecipients'
      ];
      
      const messageComposerMethods = [
        'downloadComposerAttachment', 'close', 'closeDraft'
      ];
      
      // Test all methods
      const allMethods = [...baseMethods, ...conversationMethods, ...singleConversationMethods, ...messageComposerMethods];
      
      const methodStatus = {};
      allMethods.forEach(method => {
        const exists = typeof context[method] === 'function';
        methodStatus[method] = exists;
        console.log(`   ${exists ? '✅' : '❌'} ${method}: ${exists ? 'Available' : 'Missing'}`);
      });
      
      console.log('3. METHOD SUMMARY:', methodStatus);
      
      // 4. ✅ ENHANCED: Check enumerable vs non-enumerable properties
      const ownProps = Object.getOwnPropertyNames(context);
      const enumerableProps = Object.keys(context);
      const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(context));
      
      console.log('4. PROPERTY ANALYSIS:', {
        ownProperties: ownProps,
        enumerableProperties: enumerableProps,
        prototypeProperties: prototypeProps,
        hiddenProperties: ownProps.filter(prop => !enumerableProps.includes(prop))
      });
      
      // 5. ✅ NEW: Test function calls safely
      console.log('5. SAFE FUNCTION TESTS:');
      
      if (typeof context.listMessages === 'function' && context.conversation) {
        try {
          console.log('   Testing listMessages...');
          const messages = await context.listMessages();
          console.log(`   ✅ listMessages: ${messages?.results?.length || 0} messages loaded`);
        } catch (error) {
          console.log(`   ❌ listMessages failed: ${error.message}`);
        }
      }
      
      if (typeof context.listTeammates === 'function') {
        try {
          console.log('   Testing listTeammates...');
          const teammates = await context.listTeammates();
          console.log(`   ✅ listTeammates: ${teammates?.results?.length || 0} teammates loaded`);
        } catch (error) {
          console.log(`   ❌ listTeammates failed: ${error.message}`);
        }
      }
    }
    
    // 6. ✅ ENHANCED: Context-specific data analysis
    if (context?.conversation) {
      console.log('6. CONVERSATION CONTEXT:', {
        conversationId: context.conversation.id,
        conversationType: context.conversation.type,
        hasSubject: !!context.conversation.subject,
        hasDraft: !!context.conversation.draftId,
        hasAssignee: !!context.conversation.assignee,
        recipientCount: context.conversation.recipient ? 1 : 0,
        inboxCount: context.conversation.inboxes?.length || 0,
        tagCount: context.conversation.tags?.length || 0
      });
    }
    
    if (context?.draft) {
      console.log('7. DRAFT CONTEXT:', {
        draftId: context.draft.id,
        hasBody: !!context.draft.body,
        bodyLength: context.draft.body?.length || 0,
        isEditable: context.draft.isEditable,
        hasChannel: !!context.draft.channel,
        recipientCount: context.draft.to?.length || 0,
        hasAttachments: context.draft.content?.attachments?.length || 0
      });
    }
    
    setStatus('Enhanced debug complete - check console');
  };

  // ✅ ENHANCED: Test Front REST API with better error handling
  const testFrontRESTAPI = async () => {
    if (!context?.conversation?.id || !context?.teammate) {
      console.log('❌ FRONT API TEST: Missing conversation or teammate');
      return;
    }
    
    const conversationId = context.conversation.id;
    const teammateId = context.teammate.id;
    const teammateEmail = context.teammate.email;
    
    console.log('🧪 FRONT REST API TEST');
    console.log('====================');
    console.log('Conversation ID:', conversationId);
    console.log('Teammate ID:', teammateId);
    console.log('Teammate Email:', teammateEmail);
    
    // Test 1: Get conversation details
    try {
      const convUrl = `https://api2.frontapp.com/conversations/${conversationId}`;
      const headers = {
        "accept": "application/json",
        "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsicHJvdmlzaW9uaW5nIiwicHJpdmF0ZToqIiwic2hhcmVkOioiLCJrYiJdLCJpYXQiOjE3MjkyNTY3MzYsImlzcyI6ImZyb250Iiwic3ViIjoiYzRhYzc3Y2NjN2M5NWNiNzExNzYiLCJqdGkiOiIyNWRlOWQwMzA2ZTI0NGExIn0.KocFXR3MLCqqUU80e3BRZiLo7Zz5wtbee7kxo5V0Xw4"
      };
      
      console.log('TEST 1: Getting conversation details...');
      const response = await fetch(convUrl, { headers });
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversation data:', {
          id: data.id,
          subject: data.subject,
          status: data.status,
          recipient: data.recipient,
          assignee: data.assignee,
          inboxes: data.inboxes,
          channel: data.channel
        });
      } else {
        const error = await response.text();
        console.log('❌ Conversation fetch failed:', error);
      }
    } catch (e) {
      console.log('❌ Conversation fetch error:', e.message);
    }
    
    setStatus('API test complete - check console');
  };

  // ✅ ENHANCED: Front context debugging with proper method detection
  useEffect(() => {
    console.log('🔍 AIROPS DEBUG: Enhanced Front context analysis:', {
      type: context?.type,
      hasConversation: !!context?.conversation,
      conversationId: context?.conversation?.id,
      hasDraft: !!context?.draft,
      draftId: context?.draft?.id,
      hasTeammate: !!context?.teammate,
      teammateId: context?.teammate?.id,
      // ✅ ENHANCED: Better method detection
      availableMethodsEnumerable: context ? Object.keys(context).filter(key => typeof context[key] === 'function') : [],
      // ✅ NEW: Check specific expected methods
      hasCreateDraft: typeof context?.createDraft === 'function',
      hasUpdateDraft: typeof context?.updateDraft === 'function',
      hasListMessages: typeof context?.listMessages === 'function',
      hasFetchDraft: typeof context?.fetchDraft === 'function',
      // ✅ NEW: Context constructor info
      contextConstructor: context?.constructor?.name,
      // ✅ NEW: Check all properties (including non-enumerable)
      allProperties: context ? Object.getOwnPropertyNames(context) : [],
      prototypeProperties: context ? Object.getOwnPropertyNames(Object.getPrototypeOf(context)) : []
    });
  }, [context]);

  // ✅ Container size detection
  useEffect(() => {
    const updateContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    
    updateContainerSize();
    
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(updateContainerSize);
      const parent = cardRef.current?.parentElement;
      if (parent) {
        resizeObserver.observe(parent);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      const handleResize = () => updateContainerSize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // ✅ Resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && !isTextareaResizing) {
        const cardRect = cardRef.current?.getBoundingClientRect();
        if (!cardRect) return;
        
        const newWidth = e.clientX - cardRect.left;
        const newHeight = e.clientY - cardRect.top;
        
        const minWidth = 220;
        const maxWidth = 600;
        const minHeight = 300;
        const maxHeight = 800;
        
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        
        setCardSize({ width: constrainedWidth, height: constrainedHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const newHeight = Math.max(35, Math.min(200, e.clientY - rect.top));
          setTextareaHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsTextareaResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };

    if (isResizing || isTextareaResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
      document.body.style.cursor = isTextareaResizing ? 'ns-resize' : 'nw-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
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

  // ✅ Data loading
  useEffect(() => {
    const conversationId = context?.conversation?.id;
    
    if (conversationId) {
      console.log('🔄 AIROPS: Loading data for conversation:', conversationId);
      loadHistoryFromNetlify(conversationId);
      loadTaskResultsFromNetlify(conversationId);
    } else {
      console.log('❌ AIROPS: No conversation ID available, context type:', context?.type);
      setTaskResults([]);
      setCommentHistory([]);
    }
  }, [context]);

  // ✅ Manual refresh
  const manualRefresh = async () => {
    if (!context?.conversation?.id) {
      console.log('❌ AIROPS REFRESH: No conversation ID');
      setStatus('No conversation context');
      return;
    }

    console.log('🔄 AIROPS REFRESH: Manual refresh triggered for conversation:', context.conversation.id);
    setStatus('Refreshing...');
    
    try {
      // Load history and tasks from storage
      await Promise.all([
        loadHistoryFromNetlify(context.conversation.id),
        loadTaskResultsFromNetlify(context.conversation.id)
      ]);
      
      // ✅ NEW: Also check status of any currently polling tasks
      if (pollingTasks.size > 0) {
        console.log(`🔄 REFRESH: Also checking ${pollingTasks.size} polling tasks...`);
        setStatus('Refreshing + checking tasks...');
        
        const tasksToCheck = Array.from(pollingTasks);
        for (const taskId of tasksToCheck) {
          await checkTaskStatus(taskId);
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setStatus('Refreshed!');
      console.log('✅ AIROPS REFRESH: Manual refresh completed');
    } catch (error) {
      console.error('❌ AIROPS REFRESH: Failed:', error);
      setStatus('Refresh failed');
    }
  };

  // ✅ ENHANCED: Comprehensive deletion debugging
  const debugDeletion = async () => {
    console.log('🔍 DELETION DEBUG: Complete analysis');
    console.log('=====================================');
    
    // 1. Current state analysis
    console.log('1. CURRENT STATE:');
    console.log('   - Comment History Length:', commentHistory.length);
    console.log('   - Task Results Length:', taskResults.length);
    console.log('   - Unified Requests Length:', unifiedRequests.length);
    console.log('   - Conversation ID:', context?.conversation?.id);
    
    // 2. Detailed breakdown of all requests
    console.log('2. DETAILED REQUEST BREAKDOWN:');
    unifiedRequests.forEach((request, index) => {
      console.log(`   Request ${index}:`, {
        id: request.id,
        type: request.type,
        hasOriginalIndex: request.originalIndex !== undefined,
        originalIndex: request.originalIndex,
        timestamp: request.timestamp,
        user: request.user,
        textPreview: request.text?.substring(0, 30) + '...'
      });
    });
    
    // 3. Raw history analysis
    console.log('3. RAW HISTORY ANALYSIS:');
    commentHistory.forEach((entry, index) => {
      console.log(`   History ${index}:`, {
        timestamp: entry.timestamp,
        user: entry.user,
        mode: entry.mode,
        textPreview: entry.text?.substring(0, 30) + '...'
      });
    });
    
    // 4. Raw tasks analysis
    console.log('4. RAW TASKS ANALYSIS:');
    taskResults.forEach((task, index) => {
      console.log(`   Task ${index}:`, {
        id: task.id,
        status: task.status,
        user: task.user,
        textPreview: task.comment?.substring(0, 30) + '...'
      });
    });
    
    // 5. Test deletion on first request
    if (unifiedRequests.length > 0) {
      const testRequest = unifiedRequests[0];
      console.log('5. TESTING DELETION ON FIRST REQUEST:');
      console.log('   Test Request:', testRequest);
      
      // Don't actually delete, just simulate the matching logic
      if (testRequest.type === 'task') {
        console.log('   → Would delete task with ID:', testRequest.id);
        const taskExists = taskResults.find(task => task.id === testRequest.id);
        console.log('   → Task exists in taskResults:', !!taskExists);
      } else {
        console.log('   → Would delete history entry');
        console.log('   → originalIndex:', testRequest.originalIndex);
        
        // Test matching logic
        let matchIndex = -1;
        if (testRequest.originalIndex !== undefined) {
          matchIndex = testRequest.originalIndex;
          console.log('   → Using originalIndex:', matchIndex);
        } else {
          matchIndex = commentHistory.findIndex(entry => 
            entry.timestamp === testRequest.timestamp && 
            entry.user === testRequest.user &&
            entry.text === testRequest.text
          );
          console.log('   → Found via search:', matchIndex);
        }
        
        console.log('   → Final match index:', matchIndex);
        console.log('   → Index valid:', matchIndex >= 0 && matchIndex < commentHistory.length);
        
        if (matchIndex >= 0 && matchIndex < commentHistory.length) {
          const matchedEntry = commentHistory[matchIndex];
          console.log('   → Matched entry:', {
            timestamp: matchedEntry.timestamp,
            user: matchedEntry.user,
            textPreview: matchedEntry.text?.substring(0, 30) + '...'
          });
        }
      }
    }
    
    setStatus('Deletion debug complete - check console');
  };

  // Add this function to your main component, near the other debug functions
  const debugHistoryAPI = async () => {
    console.log('🧪 HISTORY API DEBUG: Testing history operations');
    
    if (!context?.conversation?.id) {
      console.error('❌ HISTORY DEBUG: No conversation ID');
      return;
    }
    
    const conversationId = context.conversation.id;
    console.log('🧪 HISTORY DEBUG: Conversation ID:', conversationId);
    console.log('🧪 HISTORY DEBUG: Current history length:', commentHistory.length);
    
    // Test 1: Load current history
    try {
      console.log('🧪 TEST 1: Loading current history...');
      const loadResponse = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
      console.log('🧪 TEST 1: Load response status:', loadResponse.status);
      
      if (loadResponse.ok) {
        const loadData = await loadResponse.json();
        console.log('🧪 TEST 1: ✅ Current history from API:', {
          length: loadData.history?.length || 0,
          firstEntry: loadData.history?.[0] || null
        });
      } else {
        const errorText = await loadResponse.text();
        console.error('🧪 TEST 1: ❌ Load failed:', errorText);
      }
    } catch (error) {
      console.error('🧪 TEST 1: ❌ Load error:', error);
    }
    
    // Test 2: Save empty history (clear test)
    try {
      console.log('🧪 TEST 2: Testing clear history...');
      const clearPayload = {
        conversationId: conversationId,
        history: [],
        clearAll: true
      };
      
      const clearResponse = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clearPayload)
      });
      
      console.log('🧪 TEST 2: Clear response status:', clearResponse.status);
      
      if (clearResponse.ok) {
        const clearResult = await clearResponse.json();
        console.log('🧪 TEST 2: ✅ Clear successful:', clearResult);
      } else {
        const errorText = await clearResponse.text();
        console.error('🧪 TEST 2: ❌ Clear failed:', errorText);
      }
    } catch (error) {
      console.error('🧪 TEST 2: ❌ Clear error:', error);
    }
    
    // Test 3: Add test entry
    try {
      console.log('🧪 TEST 3: Adding test entry...');
      const testEntry = {
        text: 'Test entry from debug',
        mode: 'test',
        timestamp: new Date().toISOString(),
        user: context.teammate?.name || 'Debug User'
      };
      
      const addPayload = {
        conversationId: conversationId,
        entry: testEntry
      };
      
      const addResponse = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addPayload)
      });
      
      console.log('🧪 TEST 3: Add response status:', addResponse.status);
      
      if (addResponse.ok) {
        const addResult = await addResponse.json();
        console.log('🧪 TEST 3: ✅ Add successful:', addResult);
      } else {
        const errorText = await addResponse.text();
        console.error('🧪 TEST 3: ❌ Add failed:', errorText);
      }
    } catch (error) {
      console.error('🧪 TEST 3: ❌ Add error:', error);
    }
    
    // Reload data
    await manualRefresh();
    
    setStatus('History debug complete - check console');
  };

  // ✅ Clear functions
  const clearAllTasks = async () => {
    if (!context?.conversation?.id) return;
    
    if (!confirm('Delete all tasks? This cannot be undone.')) return;
    
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
        
        // Clear all expansion states for tasks
        const taskIds = taskResults.map(task => task.id);
        setExpandedRequests(prev => {
          const newSet = new Set(prev);
          taskIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        setExpandedInputs(prev => {
          const newSet = new Set(prev);
          taskIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        setExpandedOutputs(prev => {
          const newSet = new Set(prev);
          taskIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        
        setStatus('Tasks cleared');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error clearing tasks:', error);
      setStatus('Clear failed');
    }
  };

  // ✅ ENHANCED: Better history deletion with comprehensive debugging
  const deleteHistoryEntry = async (entryIndex) => {
    console.log(`🗑️ AIROPS DELETE: Starting deletion process`);
    console.log(`🗑️ AIROPS DELETE: Entry index: ${entryIndex}`);
    console.log(`🗑️ AIROPS DELETE: Current history length: ${commentHistory.length}`);
    console.log(`🗑️ AIROPS DELETE: Conversation ID: ${context?.conversation?.id}`);
    
    if (!context?.conversation?.id) {
      console.error('❌ AIROPS DELETE: No conversation ID available');
      setStatus('❌ No conversation context');
      return;
    }
    
    if (entryIndex < 0 || entryIndex >= commentHistory.length) {
      console.error(`❌ AIROPS DELETE: Invalid index ${entryIndex} for array length ${commentHistory.length}`);
      setStatus('❌ Invalid entry index');
      return;
    }
    
    const entryToDelete = commentHistory[entryIndex];
    console.log(`🗑️ AIROPS DELETE: Entry to delete:`, {
      index: entryIndex,
      timestamp: entryToDelete.timestamp,
      user: entryToDelete.user,
      mode: entryToDelete.mode,
      textLength: entryToDelete.text?.length || 0
    });
    
    try {
      // Create updated history array
      const updatedHistory = commentHistory.filter((_, index) => index !== entryIndex);
      console.log(`🗑️ AIROPS DELETE: Updated history length: ${updatedHistory.length}`);
      
      const payload = { 
        conversationId: context.conversation.id, 
        history: updatedHistory 
      };
      
      console.log(`🗑️ AIROPS DELETE: API payload:`, {
        conversationId: payload.conversationId,
        historyLength: payload.history.length,
        url: '/.netlify/functions/save-conversation-history'
      });
      
      // Make API call
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`🗑️ AIROPS DELETE: API response status: ${response.status}`);
      console.log(`🗑️ AIROPS DELETE: API response ok: ${response.ok}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ AIROPS DELETE: API success response:`, result);
        
        // ✅ Update local state
        setCommentHistory(updatedHistory);
        console.log(`✅ AIROPS DELETE: Local state updated to ${updatedHistory.length} entries`);
        
        setStatus(`✅ Entry deleted (${updatedHistory.length} remain)`);
        
      } else {
        const errorText = await response.text();
        console.error(`❌ AIROPS DELETE: API failed - Status: ${response.status}`);
        console.error(`❌ AIROPS DELETE: Error response:`, errorText);
        
        // Try to parse error details
        try {
          const errorJson = JSON.parse(errorText);
          console.error(`❌ AIROPS DELETE: Error details:`, errorJson);
        } catch (e) {
          console.error(`❌ AIROPS DELETE: Raw error text:`, errorText);
        }
        
        setStatus(`❌ Delete failed (${response.status})`);
      }
      
    } catch (error) {
      console.error('❌ AIROPS DELETE: Network/JS error:', error);
      console.error('❌ AIROPS DELETE: Error stack:', error.stack);
      setStatus('❌ Delete failed - network error');
    }
  };

  // ✅ ENHANCED: Clear all history with better debugging
  const clearHistory = async () => {
    console.log(`🗑️ AIROPS CLEAR ALL: Starting clear all process`);
    console.log(`🗑️ AIROPS CLEAR ALL: Current history length: ${commentHistory.length}`);
    console.log(`🗑️ AIROPS CLEAR ALL: Conversation ID: ${context?.conversation?.id}`);
    
    if (!context?.conversation?.id) {
      console.error('❌ AIROPS CLEAR ALL: No conversation ID');
      setStatus('❌ No conversation context');
      return;
    }
    
    if (!confirm(`Delete all ${commentHistory.length} history entries? This cannot be undone.`)) {
      console.log('🗑️ AIROPS CLEAR ALL: User cancelled');
      return;
    }
    
    try {
      const payload = { 
        conversationId: context.conversation.id, 
        history: [],
        clearAll: true // Explicit flag for clearing
      };
      
      console.log(`🗑️ AIROPS CLEAR ALL: API payload:`, payload);
      
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`🗑️ AIROPS CLEAR ALL: API response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ AIROPS CLEAR ALL: API success:`, result);
        
        setCommentHistory([]);
        
        // Clear all expansion states for history entries
        const historyIds = commentHistory.map((_, index) => `history_${commentHistory[index].timestamp}_${index}`);
        setExpandedRequests(prev => {
          const newSet = new Set(prev);
          historyIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        setExpandedInputs(prev => {
          const newSet = new Set(prev);
          historyIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        setExpandedOutputs(prev => {
          const newSet = new Set(prev);
          historyIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        
        setStatus('✅ All history cleared');
        console.log(`✅ AIROPS CLEAR ALL: Local state cleared`);
        
      } else {
        const errorText = await response.text();
        console.error(`❌ AIROPS CLEAR ALL: API failed:`, response.status, errorText);
        setStatus(`❌ Clear failed (${response.status})`);
      }
      
    } catch (error) {
      console.error('❌ AIROPS CLEAR ALL: Error:', error);
      setStatus('❌ Clear failed - network error');
    }
  };

  const deleteTask = async (taskId) => {
    if (!context?.conversation?.id) return;
    
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
        
        // Clear from all expansion states
        setExpandedRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setExpandedInputs(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setExpandedOutputs(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        
        setStatus('Task deleted');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error deleting task:', error);
      setStatus('Delete failed');
    }
  };

  // ✅ Save/load functions
  const saveTaskResultsToNetlify = async (conversationId, tasks) => {
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, tasks })
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ AIROPS: Error saving tasks:', error);
      return false;
    }
  };

  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      
      if (response.ok) {
        const result = await response.json();
        
        console.log(`🔍 TASK STATUS CHECK: Task ${taskId}`, {
          status: result.status,
          hasResult: !!result.data,
          taskName: result.metadata?.taskName || result.metadata?.task_name,
          metadata: result.metadata
        });
        
        if (result.status === 'completed' || result.status === 'failed') {
          const updatedTasks = taskResults.map(task => {
            if (task.id === taskId) {
              const updatedTask = { 
                ...task, 
                status: result.status, 
                result: result.data, 
                completedAt: result.completedAt,
                error: result.error,
              };
              
              // ✅ ENHANCED: Update task name from webhook metadata
              if (result.metadata?.taskName || result.metadata?.task_name) {
                const newTaskName = result.metadata.taskName || result.metadata.task_name;
                updatedTask.taskName = newTaskName;
                updatedTask.displayName = newTaskName;
                console.log(`🏷️ TASK NAME UPDATED: ${taskId} -> "${newTaskName}"`);
              }
              
              return updatedTask;
            }
            return task;
          });
          
          console.log(`✅ TASK UPDATED: ${taskId} status=${result.status}`);
          setTaskResults(updatedTasks);
          
          // ✅ REMOVED: Auto-expansion for completed tasks
          // Tasks stay minimized by default
          
          if (context?.conversation?.id) {
            await saveTaskResultsToNetlify(context.conversation.id, updatedTasks);
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
      console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
    }
    return false;
  };

  // ✅ Polling system
  useEffect(() => {
    if (pollingTasks.size > 0) {
      const checkAllTasks = async () => {
        const tasksToCheck = Array.from(pollingTasks);
        
        for (const taskId of tasksToCheck) {
          try {
            await checkTaskStatus(taskId);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
          }
        }
      };
      
      const initialTimeout = setTimeout(checkAllTasks, 3000);
      const interval = setInterval(checkAllTasks, 8000);
      
      return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
      };
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
        
        if (uploadedFile.fullContent) {
          combinedText += `\n\nFull File Content:\n${uploadedFile.fullContent}`;
        } else if (uploadedFile.preview) {
          combinedText += `\n\nFile Content Preview:\n${uploadedFile.preview}`;
        }
      }
    }
    
    return combinedText;
  };

  // ✅ FIX 2: Enhanced createCompletePayload with taskName parameter and better structure
  const createCompletePayload = async (combinedInstructions, taskId = null, taskName = null) => {
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
        channel: context.conversation.channel
      };
      
      try {
        if (typeof context.listMessages === 'function') {
          const messages = await context.listMessages();
          messagesData = messages.results.map(msg => ({
            id: msg.id,
            type: msg.type,
            body: msg.body,
            subject: msg.subject,
            author: msg.author,
            recipients: msg.recipients || [],
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            is_inbound: msg.is_inbound,
            is_draft: msg.is_draft,
            attachments: msg.attachments || []
          }));
        }
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
        bcc: context.draft.bcc
      };
    }
    
    const teammateData = context?.teammate ? {
      id: context.teammate.id,
      name: context.teammate.name,
      email: context.teammate.email
    } : null;
    
    console.log('📤 TASK NAME IN PAYLOAD CREATION:', taskName);
    
    return {
      airops_request: {
        combined_instructions: combinedInstructions,
        // ⭐ ADD TASK NAME TO MULTIPLE LOCATIONS FOR COMPATIBILITY
        taskName: taskName,
        task_name: taskName,
        displayName: taskName,
        display_name: taskName,
        
        output_format: {
          selected_format: selectedFormat,
          format_label: selectedFormat ? formatOptions.find(f => f.value === selectedFormat)?.label : null,
          raw_instructions: comment,
          taskName: taskName, // ⭐ Also here
          task_name: taskName  // ⭐ Also here
        },
        attachment: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          content_preview: uploadedFile.preview || null,
          full_content: uploadedFile.fullContent || null
        } : null,
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type,
          task_id: taskId,
          taskName: taskName, // ⭐ Also here
          task_name: taskName, // ⭐ Also here
          callback_url: callbackUrl,
          conversation_id: context?.conversation?.id,
          requesting_user_id: context?.teammate?.id
        },
        requesting_user: teammateData,
        front_conversation: {
          conversation: conversationData,
          messages: messagesData,
          current_draft: draftData
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

      const isTextFile = file.type.startsWith('text/') || 
                        file.name.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css|yaml|yml|sql|sh|bat|dockerfile|gitignore|env)$/i);
      
      if (isTextFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const previewLength = Math.min(8000, content.length);
          fileData.preview = content.substring(0, previewLength) + 
                           (content.length > previewLength ? 
                             '\n\n[File preview truncated - full content available to AI]' : '');
          fileData.fullContent = content;
          fileData.isProcessed = true;
          
          setUploadedFile(fileData);
          setStatus('File uploaded and processed');
        };
        reader.readAsText(file);
      } else {
        fileData.preview = `[Binary file: ${file.name}]\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)}KB`;
        fileData.isProcessed = true;
        setUploadedFile(fileData);
        setStatus('File uploaded');
      }
      
    } catch (error) {
      console.error('❌ AIROPS: File upload error:', error);
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

  const loadHistoryFromNetlify = async (conversationId) => {
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
      
      if (response.ok) {
        const { history } = await response.json();
        if (history && Array.isArray(history)) {
          setCommentHistory(history);
        }
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading history:', error);
      setCommentHistory([]);
    }
  };

  const saveHistoryToNetlify = async (conversationId, entry) => {
    try {
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, entry })
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ AIROPS: Network error saving history:', error);
      return false;
    }
  };

  const loadTaskResultsFromNetlify = async (conversationId) => {
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-tasks?conversationId=${conversationId}`);
      
      if (response.ok) {
        const { tasks } = await response.json();
        if (tasks && Array.isArray(tasks)) {
          setTaskResults(tasks);
          
          // ✅ REMOVED: Auto-expansion for completed tasks
          // All requests now start minimized by default
          
          const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
          if (pendingTasks.length > 0) {
            setPollingTasks(new Set(pendingTasks));
          }
        }
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading tasks:', error);
      setTaskResults([]);
    }
  };

  // ✅ FIXED: Create drafts within the conversation context
  const insertIntoDraft = async (content) => {
    console.log('🔍 AIROPS INSERT: Starting conversation draft insertion');
    console.log('🔍 AIROPS INSERT: Content length:', content.length);
    console.log('🔍 AIROPS INSERT: Context type:', context?.type);
    console.log('🔍 AIROPS INSERT: Conversation ID:', context?.conversation?.id);
    console.log('🔍 AIROPS INSERT: Existing draft ID:', context?.conversation?.draftId);
    
    if (!context) {
      copyToClipboard(content);
      setStatus('Copied to clipboard (no context)');
      return;
    }

    // ✅ STRATEGY 1: Update existing conversation draft
    if (context.conversation?.draftId && typeof context.updateDraft === 'function') {
      console.log('🎯 AIROPS INSERT: Found existing conversation draft, updating...');
      console.log('🎯 AIROPS INSERT: Draft ID:', context.conversation.draftId);
      
      try {
        // Get the existing draft first to preserve its content
        let existingDraft = null;
        if (typeof context.fetchDraft === 'function') {
          existingDraft = await context.fetchDraft(context.conversation.draftId);
          console.log('🎯 AIROPS INSERT: Existing draft content:', existingDraft?.content?.body?.length || 0, 'chars');
        }
        
        const existingBody = existingDraft?.content?.body || '';
        const separator = existingBody ? '\n\n---\n\n' : '';
        const newBody = existingBody + separator + content;
        
        await context.updateDraft(context.conversation.draftId, {
          updateMode: 'replace',
          content: {
            body: newBody,
            type: 'html'
          }
        });
        
        console.log('✅ AIROPS INSERT: Updated existing conversation draft');
        setStatus('✅ Content added to conversation draft!');
        return;
        
      } catch (error) {
        console.error('❌ AIROPS INSERT: Update failed, will create new:', error);
      }
    }

    // ✅ STRATEGY 2: Create new draft in conversation context
    if (typeof context.createDraft === 'function' && context.conversation) {
      console.log('🎯 AIROPS INSERT: Creating new conversation draft...');
      console.log('🎯 AIROPS INSERT: Conversation channel:', context.conversation.channel?.id);
      console.log('🎯 AIROPS INSERT: Conversation recipient:', context.conversation.recipient?.handle);
      
      try {
        // ✅ Build draft template with conversation context
        const draftTemplate = {
          content: {
            body: content,
            type: 'html'
          }
        };

        // ✅ Add conversation context if available
        if (context.conversation.channel?.id) {
          draftTemplate.channelId = context.conversation.channel.id;
          console.log('🎯 AIROPS INSERT: Using channel ID:', draftTemplate.channelId);
        }

        // ✅ Add recipient if available
        if (context.conversation.recipient?.handle) {
          draftTemplate.to = [context.conversation.recipient.handle];
          console.log('🎯 AIROPS INSERT: Adding recipient:', draftTemplate.to);
        }

        // ✅ Add subject if conversation has one
        if (context.conversation.subject) {
          draftTemplate.subject = `Re: ${context.conversation.subject}`;
          console.log('🎯 AIROPS INSERT: Adding subject:', draftTemplate.subject);
        }

        console.log('🎯 AIROPS INSERT: Complete draft template:', draftTemplate);
        
        const result = await context.createDraft(draftTemplate);
        
        console.log('✅ AIROPS INSERT: New conversation draft created:', result);
        setStatus('✅ New conversation draft created!');
        return;
        
      } catch (error) {
        console.error('❌ AIROPS INSERT: Conversation draft creation failed:', error);
        console.error('❌ AIROPS INSERT: Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n')[0]
        });
      }
    }

    // ✅ STRATEGY 3: Try simple draft creation (your current working method)
    if (typeof context.createDraft === 'function') {
      console.log('🎯 AIROPS INSERT: Trying simple draft creation...');
      
      try {
        const result = await context.createDraft({
          content: {
            body: content,
            type: 'html'
          }
        });
        
        console.log('✅ AIROPS INSERT: Simple draft created:', result);
        setStatus('✅ Draft created!');
        return;
        
      } catch (error) {
        console.error('❌ AIROPS INSERT: Simple draft creation failed:', error);
      }
    }

    // ✅ FALLBACK: Copy to clipboard
    console.log('📋 AIROPS INSERT: All methods failed, copying to clipboard');
    copyToClipboard(content);
    setStatus('📋 Copied to clipboard');
  };

  // ✅ FIXED: Modern clipboard API with improved HTML to Markdown conversion
  const copyToClipboard = async (content) => {
    console.log('📋 COPY: Starting clipboard operation');
    
    // ✅ ENHANCED: Better HTML to Markdown conversion
    const htmlToMarkdown = (html) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // ✅ FIXED: Better table conversion - preserve structure
      tempDiv.querySelectorAll('table').forEach(table => {
        let markdownTable = '\n';
        const rows = Array.from(table.querySelectorAll('tr'));
        
        if (rows.length > 0) {
          rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
              // Better cell content cleaning
              return cell.textContent.trim().replace(/\s+/g, ' ').replace(/\|/g, '\\|');
            });
            
            if (cells.length > 0) {
              // Ensure minimum width for readability
              const paddedCells = cells.map(cell => cell.padEnd(15, ' ').substring(0, 30));
              markdownTable += '| ' + paddedCells.join(' | ') + ' |\n';
              
              // Add header separator after first row
              if (rowIndex === 0) {
                markdownTable += '| ' + paddedCells.map(() => '---').join(' | ') + ' |\n';
              }
            }
          });
        }
        
        markdownTable += '\n';
        table.replaceWith(markdownTable);
      });
      
      // Convert other HTML elements to markdown
      tempDiv.querySelectorAll('h1').forEach(h => h.replaceWith('# ' + h.textContent + '\n\n'));
      tempDiv.querySelectorAll('h2').forEach(h => h.replaceWith('## ' + h.textContent + '\n\n'));
      tempDiv.querySelectorAll('h3').forEach(h => h.replaceWith('### ' + h.textContent + '\n\n'));
      tempDiv.querySelectorAll('h4').forEach(h => h.replaceWith('#### ' + h.textContent + '\n\n'));
      tempDiv.querySelectorAll('h5').forEach(h => h.replaceWith('##### ' + h.textContent + '\n\n'));
      tempDiv.querySelectorAll('h6').forEach(h => h.replaceWith('###### ' + h.textContent + '\n\n'));
      
      // Convert paragraphs with proper spacing
      tempDiv.querySelectorAll('p').forEach(p => p.replaceWith(p.textContent + '\n\n'));
      
      // Convert line breaks
      tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      
      // Convert formatting
      tempDiv.querySelectorAll('strong, b').forEach(b => b.replaceWith('**' + b.textContent + '**'));
      tempDiv.querySelectorAll('em, i').forEach(i => i.replaceWith('*' + i.textContent + '*'));
      
      // Convert lists with proper formatting
      tempDiv.querySelectorAll('li').forEach(li => li.replaceWith('• ' + li.textContent + '\n'));
      tempDiv.querySelectorAll('ul, ol').forEach(list => list.replaceWith(list.textContent + '\n'));
      
      // Clean up extra whitespace
      let result = tempDiv.textContent || tempDiv.innerText || html.replace(/<[^>]*>/g, '');
      result = result.replace(/\n{3,}/g, '\n\n').trim();
      
      return result;
    };
    
    const markdownContent = htmlToMarkdown(content);
    console.log('📋 COPY: Converted to markdown, length:', markdownContent.length);
    
    // ✅ MODERN: Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(markdownContent);
        console.log('✅ COPY: Modern clipboard API success');
        setStatus('✅ Copied to clipboard!');
        return;
      } catch (error) {
        console.log('❌ COPY: Modern clipboard API failed:', error.message);
      }
    }
    
    // ✅ FALLBACK: Traditional method with better implementation
    try {
      const textArea = document.createElement('textarea');
      textArea.value = markdownContent;
      
      // Better positioning - avoid visual glitches
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.fontSize = '16px'; // Prevent zoom on iOS
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      
      // Better selection method
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, markdownContent.length);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('✅ COPY: Fallback method success');
        setStatus('✅ Copied to clipboard!');
        return;
      }
    } catch (error) {
      console.log('❌ COPY: Fallback method failed:', error.message);
    }
    
    // ✅ LAST RESORT: Show manual copy interface
    try {
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      modal.style.zIndex = '99999';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.padding = '20px';
      
      const container = document.createElement('div');
      container.style.backgroundColor = 'white';
      container.style.borderRadius = '12px';
      container.style.padding = '24px';
      container.style.maxWidth = '90%';
      container.style.maxHeight = '80%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
      
      const title = document.createElement('h3');
      title.textContent = 'Copy Content';
      title.style.margin = '0 0 16px 0';
      title.style.color = '#374151';
      title.style.fontSize = '18px';
      title.style.fontWeight = '600';
      
      const instructions = document.createElement('p');
      instructions.textContent = 'The content is selected below. Press Ctrl+C (or Cmd+C on Mac) to copy:';
      instructions.style.margin = '0 0 16px 0';
      instructions.style.color = '#6B7280';
      instructions.style.fontSize = '14px';
      
      const textArea = document.createElement('textarea');
      textArea.value = markdownContent;
      textArea.style.width = '100%';
      textArea.style.height = '300px';
      textArea.style.padding = '12px';
      textArea.style.border = '2px solid #E5E7EB';
      textArea.style.borderRadius = '8px';
      textArea.style.fontSize = '13px';
      textArea.style.fontFamily = 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace';
      textArea.style.resize = 'none';
      textArea.style.marginBottom = '16px';
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.alignSelf = 'flex-end';
      closeBtn.style.padding = '8px 16px';
      closeBtn.style.backgroundColor = '#6366F1';
      closeBtn.style.color = 'white';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontSize = '14px';
      closeBtn.style.fontWeight = '500';
      
      closeBtn.onclick = () => document.body.removeChild(modal);
      
      container.appendChild(title);
      container.appendChild(instructions);
      container.appendChild(textArea);
      container.appendChild(closeBtn);
      modal.appendChild(container);
      document.body.appendChild(modal);
      
      // Auto-select the text
      setTimeout(() => {
        textArea.focus();
        textArea.select();
      }, 100);
      
      // Auto-close after 30 seconds
      setTimeout(() => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      }, 30000);
      
      console.log('📋 COPY: Manual copy interface shown');
      setStatus('📋 Text ready to copy - press Ctrl+C');
      
    } catch (error) {
      console.error('❌ COPY: All methods failed:', error);
      setStatus('❌ Copy failed - content logged to console');
      console.log('📋 COPY CONTENT:\n', markdownContent);
    }
  };

  // ✅ FIX 3: Enhanced processRequest with proper task name generation and logging
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
      
      // ⭐ ENHANCED: Generate taskName FIRST using the helper function
      const taskName = generateTaskName(comment, selectedFormat, outputFormat, formatOptions, mode);
      
      console.log('🏷️ TASK NAME GENERATED:', taskName); // ⭐ DEBUG LOG
      
      const combinedInstructions = createCombinedInstructions();
      const payload = await createCompletePayload(combinedInstructions, taskId, taskName); // ⭐ Pass taskName
      
      console.log('📤 FINAL PAYLOAD WITH TASK NAME:', {
        taskName: taskName,
        payloadTaskName: payload.airops_request.taskName,
        payloadTaskNameAlt: payload.airops_request.task_name,
        requestInfoTaskName: payload.airops_request.request_info.taskName
      }); // ⭐ DEBUG LOG
      
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
        // ⭐ ENHANCED: Save history entry with taskName
        const newEntry = {
          text: comment,
          mode: mode,
          outputFormat: outputFormat,
          selectedFormat: selectedFormat,
          taskName: taskName, // ⭐ ADD TASK NAME
          displayName: taskName, // ⭐ ADD DISPLAY NAME
          hasFile: !!uploadedFile,
          fileName: uploadedFile?.name,
          timestamp: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        console.log('📚 HISTORY ENTRY WITH TASK NAME:', newEntry); // ⭐ DEBUG LOG
        
        const historySaved = await saveHistoryToNetlify(conversationId, newEntry);
        if (historySaved) {
          setCommentHistory([newEntry, ...commentHistory]);
        }

        // ⭐ ENHANCED: Create and save task with taskName if in task mode
        if (mode === 'task' && taskId) {
          const newTask = {
            id: taskId,
            comment: comment,
            outputFormat: outputFormat,
            selectedFormat: selectedFormat,
            taskName: taskName, // ⭐ ADD TASK NAME
            displayName: taskName, // ⭐ ADD DISPLAY NAME
            hasFile: !!uploadedFile,
            fileName: uploadedFile?.name,
            status: 'pending',
            createdAt: new Date().toISOString(),
            user: context.teammate ? context.teammate.name : 'Unknown user'
          };
          
          console.log('📝 COMPLETE TASK OBJECT WITH NAME:', newTask); // ⭐ DEBUG LOG
          
          const updatedTasks = [newTask, ...taskResults];
          setTaskResults(updatedTasks);
          
          // Save to storage
          try {
            await fetch('/.netlify/functions/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
            
            await saveTaskResultsToNetlify(conversationId, updatedTasks);
          } catch (storageError) {
            console.error('❌ AIROPS: Storage error:', storageError);
          }
          
          // Start polling
          setPollingTasks(prev => new Set([...prev, taskId]));
        }
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      console.log('📤 SENDING TO WEBHOOK:', webhookUrl); // ⭐ DEBUG LOG
      console.log('📤 PAYLOAD SUMMARY:', {
        taskName: payload.airops_request.taskName,
        taskId: taskId,
        mode: mode,
        instructionsLength: combinedInstructions.length
      }); // ⭐ DEBUG LOG
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ AIROPS: Webhook response received:', responseData);
      
      setStatus(mode === 'email' ? 'Email sent!' : 'Task created!');
      
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

  // ✅ Get combined requests
  const unifiedRequests = sortUnifiedRequests(
    combineRequestsAndTasks(taskResults, commentHistory)
  );

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
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes shine {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>

      {/* Header */}
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
        
        {/* Debug buttons */}
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
              height: '16px',
              cursor: 'ns-resize',
              background: `linear-gradient(90deg, transparent 30%, ${theme.colors.border} 30%, ${theme.colors.border} 35%, transparent 35%, transparent 65%, ${theme.colors.border} 65%, ${theme.colors.border} 70%, transparent 70%)`,
              backgroundSize: '8px 2px',
              opacity: 0.5,
              borderRadius: `0 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm}`,
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '0.5'}
            title="Drag to resize textarea"
          >
            <div style={{
              width: '28px',
              height: '4px',
              background: theme.colors.tertiary,
              borderRadius: '2px',
              opacity: 0.8
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

            {/* File Upload */}
            <div style={{ marginTop: theme.spacing.sm }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml,.yaml,.yml,.sql,.sh,.bat,.dockerfile,.gitignore,.env"
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
                    <TrashIcon size={theme.iconSize.sm} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ FIXED: Unified Requests Section */}
        {unifiedRequests.length > 0 && (
          <Accordion expandMode="multi">
            <AccordionSection
              id="unified-requests"
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                    Requests ({unifiedRequests.length})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllRequests();
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
                    title="Clear all requests"
                  >
                    <TrashFilledIcon size={theme.iconSize.md} />
                  </button>
                </div>
              }
            >
              <div style={{ marginLeft: '-2px', marginRight: '-2px' }}>
                {unifiedRequests.length > 0 ? (
                  unifiedRequests.slice(0, 15).map((request) => (
                    <UnifiedRequestCard
                      key={request.id}
                      request={request}
                      onDelete={deleteRequest}
                      onInsert={insertIntoDraft}
                      onView={viewRequestInNewWindow}
                    />
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: `${theme.spacing.xl} ${theme.spacing.lg}`,
                    color: theme.colors.tertiary
                  }}>
                    <div style={{ 
                      fontSize: '2em', 
                      marginBottom: theme.spacing.sm,
                      opacity: 0.5
                    }}>
                      📝
                    </div>
                    <div style={{ 
                      fontSize: theme.fontSize.sm,
                      fontWeight: '500',
                      marginBottom: theme.spacing.xs
                    }}>
                      No requests yet
                    </div>
                    <div style={{ fontSize: theme.fontSize.xs }}>
                      Create an email or task to get started
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>
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

      {/* Card resize handle */}
      <div
        onMouseDown={handleCardResizeStart}
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '18px',
          height: '18px',
          cursor: 'nw-resize',
          background: `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`,
          backgroundSize: '4px 4px',
          opacity: 0.6,
          borderRadius: `0 0 ${theme.borderRadius.lg} 0`,
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1.0';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.accent} 30%, ${theme.colors.accent} 35%, transparent 35%, transparent 65%, ${theme.colors.accent} 65%, ${theme.colors.accent} 70%, transparent 70%)`;
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.6';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`;
        }}
        title="Drag to resize card"
      >
        <div style={{
          width: '8px',
          height: '8px',
          background: 'transparent',
          border: `2px solid currentColor`,
          borderRadius: '2px',
          opacity: 0.8
        }} />
      </div>
    </div>
  );
}

export default App;