import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, CheckCircle, XCircle, AlertTriangle, Edit2, Save, X, 
  ChevronDown, ChevronRight, FileText, Image, Upload, Scissors, 
  Trash2, Eye, Link, BarChart3, Paperclip, Clock, Hash
} from 'lucide-react';

// Import shared components from the system
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { PDFSnippingTool } from '../../../../../../components/shared/PDFSnippingTool';
import { ConfirmationDialog } from '../../../../../../components/shared/ConfirmationDialog';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { DataTableSkeleton } from '../../../../../../components/shared/DataTableSkeleton';

export function QuestionsTab({ importSession, parsedData, onPrevious, onContinue }) {
  const [questions, setQuestions] = useState([]);
  const [paperMetadata, setPaperMetadata] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [showSnippingTool, setShowSnippingTool] = useState(false);
  const [attachmentTarget, setAttachmentTarget] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDataUrl, setPdfDataUrl] = useState(null);
  const [attachments, setAttachments] = useState({});
  const [deleteAttachmentConfirm, setDeleteAttachmentConfirm] = useState(null);
  
  // Refs for scrolling
  const questionsRef = useRef({});

  useEffect(() => {
    if (parsedData) {
      initializeFromParsedData(parsedData);
    } else if (importSession?.id) {
      fetchImportedQuestions();
    } else {
      setLoading(false);
    }
  }, [importSession, parsedData]);

  const initializeFromParsedData = (data) => {
    try {
      setLoading(true);
      
      setPaperMetadata({
        paper_code: data.paper_code || '',
        exam_session: data.exam_session || '',
        exam_year: data.exam_year || '',
        subject: data.subject || 'Mathematics',
        total_marks: data.total_marks || calculateTotalMarks(data.questions),
        duration: data.duration || '2 hours',
        total_questions: data.questions?.length || 0
      });
      
      const validQuestions = (data.questions || [])
        .filter(q => q !== null && q !== undefined)
        .map((q, index) => ({
          ...q,
          id: q.id || `q_${index + 1}`,
          question_number: q.question_number || index + 1,
          type: q.type || 'descriptive',
          marks: q.marks || 0,
          question_description: q.question_description || q.question_text || '',
          correct_answer: q.correct_answer || q.answer || null,
          parts: q.parts ? q.parts.filter(p => p !== null && p !== undefined).map((p, pIndex) => ({
            ...p,
            id: p.id || `p_${index + 1}_${pIndex + 1}`,
            part_label: p.part_label || String.fromCharCode(97 + pIndex),
            correct_answer: p.correct_answer || p.answer || null
          })) : undefined
        }));
      
      setQuestions(validQuestions);
      
      const questionsWithWarnings = validQuestions
        .filter(q => q.validation_warnings?.length > 0)
        .map(q => q.id);
      setExpandedQuestions(new Set(questionsWithWarnings));
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportedQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/past-paper-import-sessions/${importSession.id}`);
      if (!response.ok) throw new Error('Failed to fetch import session');
      
      const data = await response.json();
      const parsedData = data.raw_json || JSON.parse(data.json_content);
      
      initializeFromParsedData(parsedData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions. Please try again.');
      setLoading(false);
    }
  };

  const calculateTotalMarks = (questions) => {
    return questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
  };

  const toggleQuestionExpanded = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map(q => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const startEditing = (question) => {
    setEditingQuestion(JSON.parse(JSON.stringify(question)));
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
  };

  const saveEdit = () => {
    const updatedQuestions = questions.map(q => 
      q.id === editingQuestion.id ? editingQuestion : q
    );
    setQuestions(updatedQuestions);
    setEditingQuestion(null);
    toast.success('Question updated successfully');
  };

  const updateEditingQuestion = (field, value) => {
    setEditingQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEditingPart = (partPath, field, value) => {
    setEditingQuestion(prev => {
      const newQuestion = JSON.parse(JSON.stringify(prev));
      let current = newQuestion;
      
      for (let i = 0; i < partPath.length - 1; i++) {
        current = current.parts.find(p => p.id === partPath[i]);
      }
      
      const finalPartId = partPath[partPath.length - 1];
      if (current.parts) {
        current.parts = current.parts.map(p => 
          p.id === finalPartId ? { ...p, [field]: value } : p
        );
      }
      
      return newQuestion;
    });
  };

  const updateEditingOption = (optionIndex, field, value) => {
    setEditingQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, idx) => 
        idx === optionIndex ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const updateEditingPartOption = (partPath, optionIndex, field, value) => {
    setEditingQuestion(prev => {
      const newQuestion = JSON.parse(JSON.stringify(prev));
      let current = newQuestion;
      
      for (let i = 0; i < partPath.length - 1; i++) {
        current = current.parts.find(p => p.id === partPath[i]);
      }
      
      const finalPartId = partPath[partPath.length - 1];
      if (current.parts) {
        const part = current.parts.find(p => p.id === finalPartId);
        if (part && part.options) {
          part.options = part.options.map((opt, idx) => 
            idx === optionIndex ? { ...opt, [field]: value } : opt
          );
        }
      }
      
      return newQuestion;
    });
  };

  const saveMetadata = () => {
    setEditingMetadata(false);
    toast.success('Paper metadata updated successfully');
  };

  const handlePdfUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF file');
      return;
    }

    setPdfFile(file);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPdfDataUrl(e.target.result);
        toast.success('PDF loaded successfully');
      };
      reader.onerror = () => {
        toast.error('Failed to read PDF file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF file');
    }
  };

  const handleAttachmentUpload = (questionId, partPath = []) => {
    if (!pdfDataUrl) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          handlePdfUpload(file).then(() => {
            setAttachmentTarget({ questionId, partPath });
            setShowSnippingTool(true);
          });
        }
      };
      input.click();
    } else {
      setAttachmentTarget({ questionId, partPath });
      setShowSnippingTool(true);
    }
  };

  const handleSnippingComplete = (dataUrl, fileName) => {
    if (attachmentTarget) {
      const { questionId, partPath } = attachmentTarget;
      const key = partPath.length > 0 ? `${questionId}_${partPath.join('_')}` : questionId;
      
      setAttachments(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), { 
          id: `att_${Date.now()}`,
          dataUrl, 
          fileName,
          timestamp: new Date().toISOString()
        }]
      }));
      
      toast.success('Attachment added successfully');
    }
    
    setShowSnippingTool(false);
    setAttachmentTarget(null);
  };

  const handleDeleteAttachment = (key, attachmentId) => {
    setAttachments(prev => ({
      ...prev,
      [key]: prev[key].filter(att => att.id !== attachmentId)
    }));
    setDeleteAttachmentConfirm(null);
    toast.success('Attachment removed');
  };

  const confirmImport = async () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmImport = async () => {
    setShowConfirmDialog(false);
    setConfirmationStatus('confirming');
    
    try {
      const response = await fetch(`/api/past-paper-import-sessions/${importSession?.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questions,
          paper_metadata: paperMetadata,
          attachments: attachments
        })
      });
      
      if (!response.ok) throw new Error('Failed to import questions');
      
      setConfirmationStatus('confirmed');
      toast.success('Questions imported successfully!');
      
      if (onContinue) {
        setTimeout(() => {
          onContinue();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error importing questions:', error);
      setConfirmationStatus('pending');
      toast.error('Failed to import questions. Please try again.');
    }
  };

  const scrollToQuestion = (questionId) => {
    questionsRef.current[questionId]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Expand the question if it's not already expanded
    if (!expandedQuestions.has(questionId)) {
      toggleQuestionExpanded(questionId);
    }
  };

  const getQuestionTypeIcon = (type) => {
    const typeMap = {
      mcq: { label: 'MCQ', status: 'active' },
      tf: { label: 'T/F', status: 'inactive' },
      descriptive: { label: 'DESC', status: 'success' },
      complex: { label: 'MULTI', status: 'warning' },
      direct: { label: 'DIRECT', status: 'info' }
    };
    
    const typeInfo = typeMap[type] || { label: type?.toUpperCase() || 'UNKNOWN', status: 'default' };
    return <StatusBadge status={typeInfo.status} text={typeInfo.label} />;
  };

  const renderCorrectAnswer = (answer, type, isEditing = false, onChange = null) => {
    if (!answer && answer !== false && answer !== 0 && !isEditing) return null;
    
    if (type === 'tf') {
      if (isEditing && onChange) {
        return (
          <div className="mt-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct Answer:</label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tf-answer"
                  checked={answer === true}
                  onChange={() => onChange(true)}
                  className="mr-2"
                />
                <StatusBadge status="success" text="True" />
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tf-answer"
                  checked={answer === false}
                  onChange={() => onChange(false)}
                  className="mr-2"
                />
                <StatusBadge status="error" text="False" />
              </label>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct Answer:</span>
          <StatusBadge 
            status="success" 
            text={answer ? 'True' : 'False'} 
          />
        </div>
      );
    }
    
    if (type === 'descriptive' || type === 'direct') {
      if (isEditing && onChange) {
        return (
          <div className="mt-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct Answer:</label>
            <textarea
              value={answer || ''}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={2}
              placeholder="Enter the correct answer..."
            />
          </div>
        );
      }
      
      if (answer) {
        return (
          <div className="mt-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct Answer:</span>
            <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-300">
              <StatusBadge status="success" text="" className="inline-block mr-2" />
              {answer}
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  const renderDuplicateWarning = (warning) => {
    const duplicate = warning.duplicateQuestion;
    return (
      <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">{warning.message}</span>
        </div>
        
        {duplicate && (
          <div className="ml-6 p-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paper {duplicate.paper_code} - Question {duplicate.question_number}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{duplicate.question_description}</div>
            {duplicate.correct_answer !== undefined && (
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Answer: {typeof duplicate.correct_answer === 'boolean' 
                  ? (duplicate.correct_answer ? 'True' : 'False')
                  : duplicate.correct_answer}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAttachments = (key, questionId, partPath = []) => {
    const questionAttachments = attachments[key] || [];
    
    if (questionAttachments.length === 0) return null;
    
    return (
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Attachments:</div>
        <div className="space-y-3">
          {questionAttachments.map((att) => (
            <div key={att.id} className="relative group">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden p-4">
                <img 
                  src={att.dataUrl} 
                  alt={att.fileName}
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => window.open(att.dataUrl, '_blank')}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="View Full Size"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteAttachmentConfirm({ key, attachmentId: att.id })}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-red-100 dark:hover:bg-red-900"
                    title="Delete"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{att.fileName}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionPart = (part, question, isEditing = false, level = 1, partPath = []) => {
    const currentPath = [...partPath, part.id];
    const indentClass = level > 1 ? `ml-${Math.min(level * 8, 24)}` : 'ml-8';
    
    const EditableField = ({ value, onChange, multiline = false, placeholder = "" }) => {
      if (!isEditing) return <span>{value || placeholder}</span>;
      
      if (multiline) {
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            rows={3}
            placeholder={placeholder}
          />
        );
      }
      
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder={placeholder}
        />
      );
    };

    const attachmentKey = `${question.id}_${currentPath.join('_')}`;

    return (
      <div key={part.id} className={`${indentClass} mb-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4`}>
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {part.part_label}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getQuestionTypeIcon(part.type)}
              {isEditing ? (
                <input
                  type="number"
                  value={part.marks || 0}
                  onChange={(e) => updateEditingPart(currentPath, 'marks', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">{part.marks} marks</span>
              )}
              {part.figure && (
                <div className="flex items-center gap-1">
                  <Image size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Figure required</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAttachmentUpload(question.id, currentPath)}
              >
                <Scissors className="w-3 h-3 mr-1" />
                Snip
              </Button>
            </div>
            
            <div className="text-gray-800 dark:text-gray-200">
              <EditableField 
                value={part.question_description || part.question_text}
                onChange={(value) => updateEditingPart(currentPath, 'question_description', value)}
                multiline
                placeholder="Enter question text..."
              />
            </div>
            
            {renderCorrectAnswer(
              part.correct_answer, 
              part.type, 
              isEditing,
              (value) => updateEditingPart(currentPath, 'correct_answer', value)
            )}
            
            {part.type === 'mcq' && part.options && (
              <div className="mt-3 space-y-2">
                {part.options
                  .filter(opt => opt !== null && opt !== undefined)
                  .map((option, idx) => (
                    <div key={option.id || idx} className={`flex items-center gap-2 p-2 rounded-lg ${
                      option.is_correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
                    }`}>
                      {isEditing ? (
                        <>
                          <input
                            type="radio"
                            name={`part-${part.id}-correct`}
                            checked={option.is_correct}
                            onChange={() => {
                              const newOptions = part.options.map((opt, i) => ({
                                ...opt,
                                is_correct: i === idx
                              }));
                              updateEditingPart(currentPath, 'options', newOptions);
                            }}
                            className="w-5 h-5"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{String.fromCharCode(65 + idx)}.</span>
                          <input
                            type="text"
                            value={option.text || option.option_text || ''}
                            onChange={(e) => updateEditingPartOption(currentPath, idx, 'text', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                        </>
                      ) : (
                        <>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            option.is_correct ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {option.is_correct && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{String.fromCharCode(65 + idx)}.</span>
                          <span className={`text-sm ${option.is_correct ? 'font-medium text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {option.text || option.option_text || 'No option text'}
                          </span>
                          {option.is_correct && (
                            <StatusBadge status="success" text="Correct" className="ml-auto" />
                          )}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            )}
            
            <div className="mt-3 flex flex-wrap gap-2">
              {part.topics?.map((topic, idx) => (
                <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {topic}
                </span>
              ))}
              {part.subtopics?.map((subtopic, idx) => (
                <span key={idx} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  {subtopic}
                </span>
              ))}
            </div>
            
            {/* Render nested parts recursively */}
            {part.type === 'complex' && part.parts && (
              <div className="mt-4">
                {part.parts
                  .filter(subPart => subPart !== null && subPart !== undefined)
                  .map(subPart => renderQuestionPart(subPart, question, isEditing, level + 1, currentPath))}
              </div>
            )}
            
            {/* Show attachments for this part */}
            {renderAttachments(attachmentKey, question.id, currentPath)}
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = (question) => {
    if (!question || typeof question !== 'object') {
      return null;
    }
    
    const isExpanded = expandedQuestions.has(question.id);
    const isEditing = editingQuestion?.id === question.id;
    const currentQuestion = isEditing ? editingQuestion : question;
    
    const questionNumber = currentQuestion.question_number || 'Unknown';
    const questionType = currentQuestion.type || 'descriptive';
    const questionMarks = currentQuestion.marks || 0;
    
    return (
      <div 
        key={question.id} 
        ref={el => questionsRef.current[question.id] = el}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4"
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => toggleQuestionExpanded(question.id)}
                className="mt-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {isEditing ? (
                      <input
                        type="text"
                        value={questionNumber}
                        onChange={(e) => updateEditingQuestion('question_number', e.target.value)}
                        className="inline-block w-16 px-2 py-0 border border-gray-300 dark:border-gray-600 rounded text-lg dark:bg-gray-700 dark:text-white"
                      />
                    ) : questionNumber}
                  </span>
                  {getQuestionTypeIcon(questionType)}
                  {isEditing ? (
                    <input
                      type="number"
                      value={questionMarks}
                      onChange={(e) => updateEditingQuestion('marks', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">{questionMarks} marks</span>
                  )}
                  
                  {currentQuestion.validation_warnings?.length > 0 && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Warning</span>
                    </div>
                  )}
                  
                  {currentQuestion.figure && (
                    <div className="flex items-center gap-1">
                      <Image size={14} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Figure required</span>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAttachmentUpload(question.id, [])}
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    Snip
                  </Button>
                </div>
                
                {!isExpanded && (
                  <>
                    <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                      {currentQuestion.question_header || currentQuestion.question_description || currentQuestion.question_text || 'No question text'}
                    </div>
                    
                    {/* Show correct answer for MCQ in collapsed view */}
                    {currentQuestion.type === 'mcq' && currentQuestion.options && (
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status="success" text="Correct Answer:" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {(() => {
                            const correctOption = currentQuestion.options.find(opt => opt.is_correct);
                            const correctIndex = currentQuestion.options.findIndex(opt => opt.is_correct);
                            return correctOption ? `${String.fromCharCode(65 + correctIndex)}. ${correctOption.text || correctOption.option_text}` : 'Not set';
                          })()}
                        </span>
                      </div>
                    )}
                    
                    {/* Show correct answer for other types */}
                    {(currentQuestion.correct_answer || currentQuestion.correct_answer === false) && currentQuestion.type !== 'mcq' && (
                      <div className="mt-2">
                        <StatusBadge status="success" text={`Answer: ${
                          typeof currentQuestion.correct_answer === 'boolean' 
                            ? (currentQuestion.correct_answer ? 'True' : 'False')
                            : currentQuestion.correct_answer
                        }`} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditing(question)}
                >
                  <Edit2 size={14} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveEdit}
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4">
              {currentQuestion.validation_warnings?.map((warning, idx) => (
                <div key={idx}>
                  {warning.type === 'duplicate' 
                    ? renderDuplicateWarning(warning)
                    : (
                      <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">{warning.message || warning}</span>
                      </div>
                    )
                  }
                </div>
              ))}
              
              {currentQuestion.question_header && (
                <div className="mb-3 font-medium text-gray-800 dark:text-gray-200">
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentQuestion.question_header}
                      onChange={(e) => updateEditingQuestion('question_header', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Question header..."
                    />
                  ) : (
                    currentQuestion.question_header
                  )}
                </div>
              )}
              
              {currentQuestion.type === 'complex' && currentQuestion.parts ? (
                currentQuestion.parts
                  .filter(part => part !== null && part !== undefined)
                  .map(part => renderQuestionPart(part, currentQuestion, isEditing))
              ) : (
                <div className="space-y-3">
                  <div className="text-gray-800 dark:text-gray-200">
                    {isEditing ? (
                      <textarea
                        value={currentQuestion.question_description || currentQuestion.question_text || ''}
                        onChange={(e) => updateEditingQuestion('question_description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="Question description..."
                      />
                    ) : (
                      currentQuestion.question_description || currentQuestion.question_text || 'No question text'
                    )}
                  </div>
                  
                  {renderCorrectAnswer(
                    currentQuestion.correct_answer, 
                    currentQuestion.type,
                    isEditing,
                    (value) => updateEditingQuestion('correct_answer', value)
                  )}
                  
                  {currentQuestion.type === 'mcq' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options
                        .filter(opt => opt !== null && opt !== undefined)
                        .map((option, idx) => (
                          <div key={option.id || idx} className={`flex items-center gap-2 p-2 rounded-lg ${
                            option.is_correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
                          }`}>
                            {isEditing ? (
                              <>
                                <input
                                  type="radio"
                                  name={`question-${currentQuestion.id}-correct`}
                                  checked={option.is_correct}
                                  onChange={() => {
                                    const newOptions = currentQuestion.options.map((opt, i) => ({
                                      ...opt,
                                      is_correct: i === idx
                                    }));
                                    updateEditingQuestion('options', newOptions);
                                  }}
                                  className="w-5 h-5"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{String.fromCharCode(65 + idx)}.</span>
                                <input
                                  type="text"
                                  value={option.text || option.option_text || ''}
                                  onChange={(e) => updateEditingOption(idx, 'text', e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                />
                              </>
                            ) : (
                              <>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  option.is_correct ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {option.is_correct && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{String.fromCharCode(65 + idx)}.</span>
                                <span className={`text-sm ${option.is_correct ? 'font-medium text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {option.text || option.option_text || 'No option text'}
                                </span>
                                {option.is_correct && (
                                  <StatusBadge status="success" text="Correct" className="ml-auto" />
                                )}
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.topics?.map((topic, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                    {currentQuestion.subtopics?.map((subtopic, idx) => (
                      <span key={idx} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                        {subtopic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {currentQuestion.attachment_url && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md flex items-center gap-2">
                  <FileText size={16} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Existing attachment: {currentQuestion.attachment_url}</span>
                </div>
              )}
              
              {/* Show attachments for main question */}
              {renderAttachments(question.id, question.id, [])}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Count statistics
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const warningCount = questions.filter(q => q.validation_warnings?.length > 0).length;
  
  const countAttachments = (item) => {
    let count = 0;
    
    // Check if question requires figure
    if (item.figure) {
      count += 1;
    }
    
    // Check main question attachments
    if (attachments[item.id]?.length > 0) {
      count += attachments[item.id].length;
    }
    
    // Check parts recursively
    const countPartAttachments = (parts, parentPath = [item.id]) => {
      if (!parts) return;
      
      parts.forEach(part => {
        // Check if part requires figure
        if (part.figure) {
          count += 1;
        }
        
        const path = [...parentPath, part.id];
        const key = path.join('_');
        
        if (attachments[key]?.length > 0) {
          count += attachments[key].length;
        }
        
        if (part.parts) {
          countPartAttachments(part.parts, path);
        }
      });
    };
    
    if (item.parts) {
      countPartAttachments(item.parts);
    }
    
    return count;
  };
  
  const totalAttachmentCount = questions.reduce((sum, q) => sum + countAttachments(q), 0);
  
  const questionsWithAttachments = questions.filter(q => {
    // Check if question or any of its parts require figure
    const requiresFigure = (item) => {
      if (item.figure) return true;
      if (item.parts) {
        return item.parts.some(part => requiresFigure(part));
      }
      return false;
    };
    
    return requiresFigure(q) || countAttachments(q) > 0;
  });
  const questionsWithWarnings = questions.filter(q => q.validation_warnings?.length > 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Questions Review
        </h2>
        <DataTableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Questions Review
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Review and validate questions imported from the JSON file.
      </p>

      {showSnippingTool && pdfDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-6xl h-[90vh]">
            <PDFSnippingTool
              pdfUrl={pdfDataUrl}
              onSnip={handleSnippingComplete}
              onClose={() => {
                setShowSnippingTool(false);
                setAttachmentTarget(null);
              }}
            />
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <ConfirmationDialog
          title="Confirm Question Import"
          message={`Are you sure you want to import ${questions.length} questions? This action cannot be undone.`}
          onConfirm={handleConfirmImport}
          onCancel={() => setShowConfirmDialog(false)}
          confirmText="Import Questions"
          cancelText="Cancel"
        />
      )}

      {deleteAttachmentConfirm && (
        <ConfirmationDialog
          title="Delete Attachment"
          message="Are you sure you want to delete this attachment?"
          onConfirm={() => handleDeleteAttachment(deleteAttachmentConfirm.key, deleteAttachmentConfirm.attachmentId)}
          onCancel={() => setDeleteAttachmentConfirm(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      {/* Enhanced Paper Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
            Paper Summary
          </h3>
          {!editingMetadata ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingMetadata(true)}
            >
              <Edit2 size={14} className="mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={saveMetadata}
              >
                <Save size={14} className="mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingMetadata(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mb-1">
              <Hash size={12} className="mr-1" />
              Paper Code
            </div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.paper_code}
                onChange={(e) => setPaperMetadata(prev => ({ ...prev, paper_code: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.paper_code || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mb-1">
              <Clock size={12} className="mr-1" />
              Session
            </div>
            {editingMetadata ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={paperMetadata.exam_session}
                  onChange={(e) => setPaperMetadata(prev => ({ ...prev, exam_session: e.target.value }))}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
                  placeholder="Session"
                />
                <input
                  type="text"
                  value={paperMetadata.exam_year}
                  onChange={(e) => setPaperMetadata(prev => ({ ...prev, exam_year: e.target.value }))}
                  className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
                  placeholder="Year"
                />
              </div>
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">
                {paperMetadata.exam_session} {paperMetadata.exam_year}
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Subject</div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.subject}
                onChange={(e) => setPaperMetadata(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.subject || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Duration</div>
            {editingMetadata ? (
              <input
                type="text"
                value={paperMetadata.duration}
                onChange={(e) => setPaperMetadata(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <div className="font-medium text-gray-900 dark:text-white">{paperMetadata.duration || '-'}</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Questions</div>
            <div className="font-medium text-gray-900 dark:text-white">{questions.length}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Marks</div>
            <div className="font-medium text-gray-900 dark:text-white">{totalMarks}</div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics with Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => {
            if (questionsWithAttachments.length > 0) {
              scrollToQuestion(questionsWithAttachments[0].id);
            }
          }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Questions with Attachments</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                {questionsWithAttachments.length}
                <Paperclip className="ml-2 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" size={20} />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {totalAttachmentCount} total required/uploaded
              </div>
            </div>
            <Link className="text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" size={16} />
          </div>
        </button>
        
        <button
          onClick={() => {
            if (questionsWithWarnings.length > 0) {
              scrollToQuestion(questionsWithWarnings[0].id);
            }
          }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-400 transition-colors group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Validation Warnings</div>
              <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 flex items-center">
                {warningCount}
                <AlertTriangle className="ml-2 text-amber-400 group-hover:text-amber-500 dark:group-hover:text-amber-400" size={20} />
              </div>
            </div>
            <Link className="text-gray-400 group-hover:text-amber-500 dark:group-hover:text-amber-400" size={16} />
          </div>
        </button>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
              <div className="flex items-center gap-2 mt-1">
                {confirmationStatus === 'pending' && (
                  <>
                    <AlertCircle className="text-blue-500 dark:text-blue-400" size={20} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Pending Review</span>
                  </>
                )}
                {confirmationStatus === 'confirming' && (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Processing...</span>
                  </>
                )}
                {confirmationStatus === 'confirmed' && (
                  <>
                    <CheckCircle className="text-green-500 dark:text-green-400" size={20} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Confirmed</span>
                  </>
                )}
              </div>
            </div>
            <BarChart3 className="text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {/* PDF Upload Section */}
      {!pdfDataUrl && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                PDF Required for Snipping
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                Upload the question paper PDF to enable the snipping tool for attachments.
              </p>
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => document.getElementById('pdf-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={expandAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Collapse All
          </button>
        </div>
        {warningCount > 0 && (
          <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            ⚠️ {warningCount} question{warningCount > 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Questions Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            No questions found in the uploaded file. Please check your file and try again.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions
            .filter(q => q !== null && q !== undefined)
            .map(question => renderQuestion(question))}
        </div>
      )}

      {/* Confirm Import Button */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <Button 
          variant="outline" 
          onClick={onPrevious || (() => window.history.back())}
        >
          Back to Upload
        </Button>
        <Button
          variant={confirmationStatus === 'confirmed' ? 'success' : 'primary'}
          onClick={confirmImport}
          disabled={confirmationStatus !== 'pending' || questions.length === 0}
        >
          {confirmationStatus === 'pending' && (
            <>
              <CheckCircle size={16} className="mr-2" />
              Confirm & Import Questions
            </>
          )}
          {confirmationStatus === 'confirming' && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          )}
          {confirmationStatus === 'confirmed' && (
            <>
              <CheckCircle size={16} className="mr-2" />
              Questions Imported Successfully
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default QuestionsTab;