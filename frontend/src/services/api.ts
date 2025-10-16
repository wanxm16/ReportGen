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

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectChapter {
  id: string;
  title: string;
  order: number;
}

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get<Project[]>(`${API_BASE_URL}/projects`);
  return response.data;
};

export const createProject = async (name: string): Promise<Project> => {
  const response = await axios.post<Project>(`${API_BASE_URL}/projects`, { name });
  return response.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
};

export const getProjectChapters = async (projectId: string): Promise<ProjectChapter[]> => {
  const response = await axios.get<ProjectChapter[]>(`${API_BASE_URL}/projects/${projectId}/chapters`);
  return response.data;
};

export interface SeedProjectResponse {
  success: boolean;
  project_id: string;
  chapters: ProjectChapter[];
  templates_generated: number;
  example_file_id: string;
}

export const seedProject = async (projectId: string, file: File): Promise<SeedProjectResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<SeedProjectResponse>(
    `${API_BASE_URL}/projects/${projectId}/seed`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );

  return response.data;
};

// Upload example file (Markdown or Word)
export const uploadExampleFile = async (file: File, projectId: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project_id', projectId);

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
  chapter: string,
  dataText: string,
  projectId: string,
  exampleFileIds: string[] = [],
  templateId?: string
): Promise<GenerateReportResponse> => {
  const response = await axios.post<GenerateReportResponse>(
    `${API_BASE_URL}/report/generate-with-text`,
    {
      project_id: projectId,
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
export const getAllExamples = async (projectId: string): Promise<Array<{id: string, name: string}>> => {
  const response = await axios.get<Array<{id: string, name: string}>>(
    `${API_BASE_URL}/upload/examples`,
    {
      params: { project_id: projectId }
    }
  );
  return response.data;
};

// Delete an example file
export const deleteExampleFile = async (projectId: string, fileId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/upload/example/${fileId}`, {
    params: { project_id: projectId }
  });
};

export interface ChapterDataPayload {
  chapter_id: string;
  input_data: string;
  generated_content?: string;
  updated_at?: string;
}

export const getChapterData = async (projectId: string, chapterId: string): Promise<ChapterDataPayload> => {
  const response = await axios.get<ChapterDataPayload>(
    `${API_BASE_URL}/projects/${projectId}/chapters/${chapterId}/data`
  );
  return response.data;
};

export const saveChapterData = async (
  projectId: string,
  chapterId: string,
  payload: { input_data: string; generated_content?: string }
): Promise<ChapterDataPayload> => {
  const response = await axios.post<ChapterDataPayload>(
    `${API_BASE_URL}/projects/${projectId}/chapters/${chapterId}/data`,
    payload
  );
  return response.data;
};

export interface ClearGeneratedResponse {
  success: boolean;
  project_id: string;
  cleared_chapters: string[];
}

export const clearGeneratedContent = async (projectId: string): Promise<ClearGeneratedResponse> => {
  const response = await axios.post<ClearGeneratedResponse>(
    `${API_BASE_URL}/projects/${projectId}/clear-generated`
  );
  return response.data;
};

// Generate prompt template from example documents
export interface GeneratePromptResponse {
  success: boolean;
  system_prompt: string;
  user_prompt_template: string;
  analyzed_examples: number;
  chapter_type: string;
  project_id: string;
}

export const generatePromptFromExamples = async (
  chapter: string,
  chapterTitle: string,
  projectId: string,
  exampleFileIds?: string[]
): Promise<GeneratePromptResponse> => {
  const response = await axios.post<GeneratePromptResponse>(
    `${API_BASE_URL}/prompts/generate-from-examples`,
    {
      project_id: projectId,
      chapter,
      chapter_title: chapterTitle,
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
  project_id: string;
}

export const generateAllChaptersPrompts = async (
  projectId: string,
  exampleFileIds?: string[]
): Promise<BatchGenerateResponse> => {
  const response = await axios.post<BatchGenerateResponse>(
    `${API_BASE_URL}/prompts/generate-all-chapters`,
    {
      project_id: projectId,
      example_file_ids: exampleFileIds || null
    }
  );
  return response.data;
};
