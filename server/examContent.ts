import type { Question } from '../types.ts';
import {
  EXAM_CONTENT_CORS_HEADERS,
  type CachedMetaBundle,
  type CachedQuestionBundle,
  type CachedSolutionsBundle,
  type ExamContentHttpResult,
  type SolutionEntry,
  type SolutionOwnershipProof,
  getAuthorizedExamSolutions,
  getExamMetaBundle,
  getServerSupabase,
  getStudentQuestionBundle,
  handleExamMetaRequest,
  handleExamSolutionsRequest,
  handleExamTestRequest,
  handleExamWarmRequest,
  sanitizeConfigForStudent,
  sendExamContentResponse,
  storeWarmBundleInMemory,
  stripAnswersFromQuestion as stripAnswersFromQuestionCore,
} from '../shared/examContentCore.ts';
import {
  getTursoServerDiagnostics,
  handleExamKeyRequest,
  handleExamTursoDeleteRequest,
  handleExamTursoSyncRequest,
} from '../shared/tursoServerCore.ts';

export function stripAnswersFromQuestion(q: Question): Question {
  return stripAnswersFromQuestionCore(q);
}

export {
  EXAM_CONTENT_CORS_HEADERS,
  getAuthorizedExamSolutions,
  getExamMetaBundle,
  getServerSupabase,
  getStudentQuestionBundle,
  getTursoServerDiagnostics,
  handleExamKeyRequest,
  handleExamMetaRequest,
  handleExamSolutionsRequest,
  handleExamTestRequest,
  handleExamTursoDeleteRequest,
  handleExamTursoSyncRequest,
  handleExamWarmRequest,
  sanitizeConfigForStudent,
  sendExamContentResponse,
  storeWarmBundleInMemory,
};

export type {
  CachedMetaBundle,
  CachedQuestionBundle,
  CachedSolutionsBundle,
  ExamContentHttpResult,
  SolutionEntry,
  SolutionOwnershipProof,
};
