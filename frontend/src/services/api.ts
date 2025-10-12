import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface UploadResponse {
  success: boolean;
  file_id: string;
  filename: string;
  error?: string;
}

export interface GenerateReportResponse {
  success: boolean;
  chapter: string;
  content: string;
  error?: string;
}

export type ChapterType = 'chapter_1' | 'chapter_2' | 'chapter_3' | 'chapter_4';
export type PromptChapterType = ChapterType;

// Upload example file (Markdown or Word)
export const uploadExampleFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(
    `${API_BASE_URL}/upload/example`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );

  return response.data;
};

// Generate report chapter with text data and example file IDs
export const generateReportChapterWithText = async (
  chapter: ChapterType,
  dataText: string,
  exampleFileIds: string[] = [],
  templateId?: string
): Promise<GenerateReportResponse> => {
  const response = await axios.post<GenerateReportResponse>(
    `${API_BASE_URL}/report/generate-with-text`,
    {
      chapter,
      data_text: dataText,
      example_file_ids: exampleFileIds,
      template_id: templateId
    }
  );

  return response.data;
};

// Export report to Word
export const exportToWord = async (content: string, filename: string): Promise<Blob> => {
  const response = await axios.post(
    `${API_BASE_URL}/report/export`,
    {
      content,
      filename
    },
    {
      responseType: 'blob'
    }
  );

  return response.data;
};

// Get all example files
export const getAllExamples = async (): Promise<Array<{id: string, name: string}>> => {
  const response = await axios.get<Array<{id: string, name: string}>>(
    `${API_BASE_URL}/upload/examples`
  );
  return response.data;
};

// Delete an example file
export const deleteExampleFile = async (fileId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/upload/example/${fileId}`);
};

// Generate prompt template from example documents
export interface GeneratePromptResponse {
  success: boolean;
  system_prompt: string;
  user_prompt_template: string;
  analyzed_examples: number;
  chapter_type: string;
}

export const generatePromptFromExamples = async (
  chapter: PromptChapterType,
  exampleFileIds?: string[]
): Promise<GeneratePromptResponse> => {
  const response = await axios.post<GeneratePromptResponse>(
    `${API_BASE_URL}/prompts/generate-from-examples`,
    {
      chapter,
      example_file_ids: exampleFileIds || null
    }
  );
  return response.data;
};

// Generate prompts for all chapters in batch
export interface BatchGenerateResponse {
  success: boolean;
  total_chapters: number;
  successful: number;
  failed: number;
  results: Array<{
    chapter: string;
    chapter_name?: string;
    success: boolean;
    template_id?: string;
    analyzed_examples?: number;
    error?: string;
  }>;
}

export const generateAllChaptersPrompts = async (
  exampleFileIds?: string[]
): Promise<BatchGenerateResponse> => {
  const response = await axios.post<BatchGenerateResponse>(
    `${API_BASE_URL}/prompts/generate-all-chapters`,
    { example_file_ids: exampleFileIds || null }
  );
  return response.data;
};
