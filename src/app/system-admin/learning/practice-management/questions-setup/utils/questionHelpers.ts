import { Question, SubQuestion } from '../../page';

const attachmentKeywords = ['figure', 'diagram', 'graph', 'image', 'illustration'];

const hasAttachmentReference = (content?: string) => {
  if (!content) return false;

  const normalized = content.toLowerCase();
  return attachmentKeywords.some((keyword) => normalized.includes(keyword));
};

export const questionNeedsAttachment = (question: Question) => {
  const questionNeeds = hasAttachmentReference(question.question_description);
  const questionHasAttachment = (question.attachments?.length ?? 0) > 0;

  if (questionNeeds && !questionHasAttachment) {
    return true;
  }

  return question.parts.some((part) => subQuestionNeedsAttachment(part));
};

export const subQuestionNeedsAttachment = (subQuestion: SubQuestion) => {
  const needsAttachment = hasAttachmentReference(subQuestion.question_description);
  const hasAttachment = (subQuestion.attachments?.length ?? 0) > 0;

  return needsAttachment && !hasAttachment;
};

export const getDifficultyClassName = (difficulty?: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'hard':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export const getQuestionStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Confirmed';
    case 'qa_review':
      return 'QA Review';
    case 'draft':
      return 'Draft';
    default:
      return status ? status.replace('_', ' ') : 'Unknown';
  }
};

