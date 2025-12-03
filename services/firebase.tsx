
import type { Exam, Result } from '../types';

// Mock implementation using localStorage to fix Firebase import errors.
// This allows the application to run without requiring the firebase modules to be installed or configured.

const EXAMS_KEY = 'exams_data';
const RESULTS_KEY = 'results_data';

// Helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getLocalExams = (): Record<string, Exam> => {
  try {
    const data = localStorage.getItem(EXAMS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Error parsing exams from localStorage", e);
    return {};
  }
};

const saveLocalExams = (exams: Record<string, Exam>) => {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
};

const getLocalResults = (): Result[] => {
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error parsing results from localStorage", e);
    return [];
  }
};

const saveLocalResults = (results: Result[]) => {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
};

export const saveExamToFirebase = async (exam: Exam): Promise<boolean> => {
  await delay(500);
  try {
    const exams = getLocalExams();
    exams[exam.code] = exam;
    saveLocalExams(exams);
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    return false;
  }
};

export const updateExamInFirebase = async (exam: Exam): Promise<boolean> => {
  await delay(500);
  try {
    const exams = getLocalExams();
    exams[exam.code] = exam;
    saveLocalExams(exams);
    return true;
  } catch (e) {
    console.error("Error updating document: ", e);
    return false;
  }
};

export const getExamFromFirebase = async (code: string): Promise<Exam | null> => {
  await delay(300);
  try {
    const exams = getLocalExams();
    return exams[code] || null;
  } catch (e) {
    console.error("Error getting document: ", e);
    return null;
  }
}

export const getAllExamsFromFirebase = async (): Promise<Record<string, Exam>> => {
  await delay(500);
  return getLocalExams();
}

export const saveResultToFirebase = async (result: Result): Promise<boolean> => {
  await delay(500);
  try {
    const results = getLocalResults();
    // Check if result already exists (update scenario)
    const existingIndex = results.findIndex(r => r.student.studentId === result.student.studentId && r.examCode === result.examCode);
    if (existingIndex >= 0) {
        results[existingIndex] = result;
    } else {
        results.push(result);
    }
    saveLocalResults(results);
    return true;
  } catch (e) {
    console.error("Error adding result: ", e);
    return false;
  }
}

export const getAllResultsFromFirebase = async (): Promise<Result[]> => {
  await delay(500);
  return getLocalResults();
}
