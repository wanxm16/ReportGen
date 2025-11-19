import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layout,
  message,
  Tabs,
  Space,
  Button,
  Affix,
  Segmented,
  Select,
  Modal,
  Input,
  Form
} from 'antd';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';

import { ChapterSection } from './components/ChapterSection';
import { FullReportPreview } from './components/FullReportPreview';
import { ExampleManager } from './components/ExampleManager';
import { PromptTemplateManager } from './components/PromptTemplateManager';
import {
  getProjects,
  createProject,
  deleteProject,
  uploadExampleFile,
  generateReportChapterWithText,
  exportToWord,
  getAllExamples,
  deleteExampleFile,
  getProjectChapters,
  seedProject,
  getChapterData,
  saveChapterData,
  clearGeneratedContent,
  type Project,
  type ProjectChapter
} from './services/api';
import './App.css';

const { Header, Content } = Layout;

interface PromptTemplate {
  id: string;
  name: string;
  chapter: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  project_id?: string;
}

interface ExampleFile {
  id: string;
  name: string;
}

interface ProjectState {
  chapters: ProjectChapter[];
  chapterData: Record<string, string>;
  chapterContents: Record<string, string>;
  selectedTemplates: Record<string, string>;
  templates: Record<string, PromptTemplate[]>;
  exampleFiles: ExampleFile[];
  loading: Record<string, boolean>;
}

const DATA_PLACEHOLDER =
  '请粘贴 CSV 或 Markdown 格式的数据&#10;&#10;CSV 示例：&#10;事件ID,事件类型,等级,街镇&#10;E001,城市管理,三级,街道A&#10;E002,环境保护,二级,街道B&#10;&#10;或直接粘贴 Markdown 表格';

const createProjectState = (): ProjectState => ({
  chapters: [],
  chapterData: {},
  chapterContents: {},
  selectedTemplates: {},
  templates: {},
  exampleFiles: [],
  loading: {}
});

const buildChapterMap = <T,>(
  chapters: ProjectChapter[],
  existing: Record<string, T> | undefined,
  factory: T | (() => T)
): Record<string, T> => {
  const result: Record<string, T> = {};
  chapters.forEach(chapter => {
    if (existing && chapter.id in existing) {
      result[chapter.id] = existing[chapter.id];
    } else {
      result[chapter.id] = typeof factory === 'function' ? (factory as () => T)() : factory;
    }
  });
  return result;
};

const syncStateWithChapters = (state: ProjectState, chapters: ProjectChapter[]): ProjectState => ({
  ...state,
  chapters,
  chapterData: buildChapterMap(chapters, state.chapterData, ''),
  chapterContents: buildChapterMap(chapters, state.chapterContents, ''),
  selectedTemplates: buildChapterMap(chapters, state.selectedTemplates, ''),
  templates: buildChapterMap(chapters, state.templates, () => []),
  loading: buildChapterMap(chapters, state.loading, false)
});

const buildFullReportContent = (chapters: ProjectChapter[], contents: Record<string, string>) =>
  chapters
    .map(({ id, title }) => {
      const chapterContent = contents[id]?.trim();
      if (!chapterContent) {
        return '';
      }
      const startsWithHeading = /^#{1,6}\s/.test(chapterContent);
      const prefix = startsWithHeading ? '' : `## ${title}\n\n`;
      return `${prefix}${chapterContent}`;
    })
    .filter(Boolean)
    .join('\n\n');

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStates, setProjectStates] = useState<Record<string, ProjectState>>({});
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('report');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [seedModalVisible, setSeedModalVisible] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [clearingReports, setClearingReports] = useState(false);
  const [seedUploading, setSeedUploading] = useState(false);
  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [seedProjectId, setSeedProjectId] = useState<string | null>(null);
  const [projectForm] = Form.useForm();

  const getProjectState = useCallback(
    (projectId: string | null): ProjectState => {
      if (!projectId) {
        return createProjectState();
      }
      return projectStates[projectId] ?? createProjectState();
    },
    [projectStates]
  );

  const updateProjectState = useCallback(
    (projectId: string, updater: (state: ProjectState) => ProjectState) => {
      setProjectStates(prev => {
        const current = prev[projectId] ?? createProjectState();
        const updated = updater(current);
        if (updated === current && prev[projectId]) {
          return prev;
        }
        return {
          ...prev,
          [projectId]: updated
        };
      });
    },
    []
  );

  const loadProjectExamples = useCallback(
    async (projectId: string) => {
      try {
        const examples = await getAllExamples(projectId);
        updateProjectState(projectId, state => ({
          ...state,
          exampleFiles: examples
        }));
      } catch (error: any) {
        console.error('Failed to load examples:', error);
        message.error('加载示例文档失败');
      }
    },
    [updateProjectState]
  );

  const loadProjectTemplates = useCallback(
    async (projectId: string, chaptersOverride?: ProjectChapter[]) => {
      try {
        const response = await fetch(`http://localhost:8001/api/prompts/templates?project_id=${projectId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const allTemplates: PromptTemplate[] = await response.json();

        updateProjectState(projectId, state => {
          const chapters = chaptersOverride ?? state.chapters;
          const templateMap: Record<string, PromptTemplate[]> = buildChapterMap(
            chapters,
            undefined,
            () => []
          );

          allTemplates.forEach(template => {
            if (!templateMap[template.chapter]) {
              templateMap[template.chapter] = [];
            }
            templateMap[template.chapter].push(template);
          });

          const nextSelected = { ...state.selectedTemplates };
          Object.keys(nextSelected).forEach(key => {
            const selectedId = nextSelected[key];
            if (selectedId && !templateMap[key]?.some(t => t.id === selectedId)) {
              nextSelected[key] = '';
            }
          });

          chapters.forEach(chapter => {
            if (!nextSelected[chapter.id]) {
              const defaultTemplate = templateMap[chapter.id]?.find(t => t.is_default) || templateMap[chapter.id]?.[0];
              if (defaultTemplate) {
                nextSelected[chapter.id] = defaultTemplate.id;
              }
            }
          });

          return {
            ...state,
            templates: templateMap,
            selectedTemplates: nextSelected
          };
        });
      } catch (error: any) {
        console.error('Failed to load templates:', error);
        message.error('加载 Prompt 模板失败');
      }
    },
    [updateProjectState]
  );

  const loadProjectChapters = useCallback(
    async (projectId: string) => {
      try {
        const chapters = await getProjectChapters(projectId);
        updateProjectState(projectId, state => syncStateWithChapters(state, chapters));

        if (projectId === activeProjectId) {
          setActiveChapterId(prev => {
            if (prev && chapters.some(chapter => chapter.id === prev)) {
              return prev;
            }
            return chapters[0]?.id ?? null;
          });
        }

        // Load stored chapter data
        await Promise.all(
          chapters.map(async chapter => {
            try {
              const data = await getChapterData(projectId, chapter.id);
              updateProjectState(projectId, state => ({
                ...state,
                chapterData: {
                  ...state.chapterData,
                  [chapter.id]: data.input_data || ''
                },
                chapterContents: {
                  ...state.chapterContents,
                  [chapter.id]: data.generated_content || ''
                }
              }));
            } catch (error: any) {
              console.warn(`No stored data for ${chapter.id}`, error.message || error);
            }
          })
        );

        return chapters;
      } catch (error: any) {
        console.error('Failed to load chapters:', error);
        message.error('加载项目章节失败');
        return [];
      }
    },
    [activeProjectId, updateProjectState]
  );

  const refreshProject = useCallback(
    async (projectId: string) => {
      const chapters = await loadProjectChapters(projectId);
      await Promise.all([
        loadProjectExamples(projectId),
        loadProjectTemplates(projectId, chapters)
      ]);
    },
    [loadProjectChapters, loadProjectExamples, loadProjectTemplates]
  );

  const initializeProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
      if (list.length > 0) {
        setActiveProjectId(list[0].id);
      } else {
        setActiveProjectId(null);
        setActiveChapterId(null);
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      message.error('加载项目失败');
    }
  }, []);

  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }
    refreshProject(activeProjectId);
  }, [activeProjectId, refreshProject]);

  const currentProjectState = getProjectState(activeProjectId);
  const currentChapters = currentProjectState.chapters;

  const chapterRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {};
    currentChapters.forEach(chapter => {
      refs[chapter.id] = React.createRef<HTMLDivElement>();
    });
    return refs;
  }, [currentChapters]);

  const fullReportContent = useMemo(
    () => buildFullReportContent(currentChapters, currentProjectState.chapterContents),
    [currentChapters, currentProjectState.chapterContents]
  );

  const hasPartialContent = useMemo(
    () => currentChapters.some(chapter => !!currentProjectState.chapterContents[chapter.id]?.trim()),
    [currentChapters, currentProjectState.chapterContents]
  );

  const handleUploadExample = async (file: File) => {
    if (!activeProjectId) {
      message.error('请先选择项目');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadExampleFile(file, activeProjectId);

      if (response.success) {
        await refreshProject(activeProjectId);
        message.success('示例文档上传成功');
      } else {
        const errorMsg = response.error || '上传失败';
        message.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || '上传失败，请检查网络连接';
      message.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!activeProjectId) {
      message.error('请先选择项目');
      return;
    }

    try {
      await deleteExampleFile(activeProjectId, id);
      updateProjectState(activeProjectId, state => ({
        ...state,
        exampleFiles: state.exampleFiles.filter(file => file.id !== id)
      }));
      message.success('示例文档已删除');
    } catch (error: any) {
      console.error('Delete error:', error);
      message.error('删除失败');
    }
  };

  const handleGenerate = async (chapterId: string) => {
    if (!activeProjectId) {
      message.error('请先选择项目');
      return;
    }

    const chapterData = currentProjectState.chapterData[chapterId] || '';
    if (!chapterData.trim()) {
      message.error('请先输入数据');
      return;
    }

    const exampleFileIds = currentProjectState.exampleFiles.map(file => file.id);
    const templateId = currentProjectState.selectedTemplates[chapterId] || undefined;

    updateProjectState(activeProjectId, state => ({
      ...state,
      loading: {
        ...state.loading,
        [chapterId]: true
      }
    }));

    try {
      const response = await generateReportChapterWithText(
        chapterId,
        chapterData,
        activeProjectId,
        exampleFileIds,
        templateId
      );

      if (response.success) {
        await saveChapterData(activeProjectId, chapterId, {
          input_data: chapterData,
          generated_content: response.content
        });
        updateProjectState(activeProjectId, state => ({
          ...state,
          chapterContents: {
            ...state.chapterContents,
            [chapterId]: response.content
          }
        }));
        message.success('报告生成成功');
      } else {
        message.error(response.error || '生成失败');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || '生成失败';
      message.error(errorMsg);
    } finally {
      updateProjectState(activeProjectId, state => ({
        ...state,
        loading: {
          ...state.loading,
          [chapterId]: false
        }
      }));
    }
  };

  const handleContentChange = (chapterId: string, content: string) => {
    if (!activeProjectId) return;
    updateProjectState(activeProjectId, state => ({
      ...state,
      chapterContents: {
        ...state.chapterContents,
        [chapterId]: content
      }
    }));
  };

  const handleDataChange = (chapterId: string, value: string) => {
    if (!activeProjectId) return;
    updateProjectState(activeProjectId, state => ({
      ...state,
      chapterData: {
        ...state.chapterData,
        [chapterId]: value
      }
    }));
    if (activeProjectId) {
      void saveChapterData(activeProjectId, chapterId, { input_data: value }).catch(error => {
        console.error('Failed to persist chapter data', error);
      });
    }
  };

  const handleTemplateSelect = (chapterId: string, templateId: string) => {
    if (!activeProjectId) return;
    updateProjectState(activeProjectId, state => ({
      ...state,
      selectedTemplates: {
        ...state.selectedTemplates,
        [chapterId]: templateId
      }
    }));
  };

  const handleExport = async (chapterId: string) => {
    if (!activeProjectId) return;

    const loadingMap = currentProjectState.loading;
    if (loadingMap[chapterId]) {
      message.warning('正在生成，请稍后再试');
      return;
    }

    const content = currentProjectState.chapterContents[chapterId];
    if (!content) {
      message.error('没有可导出的内容');
      return;
    }

    const chapterTitle = currentChapters.find(ch => ch.id === chapterId)?.title || chapterId;

    try {
      const blob = await exportToWord(content, chapterTitle);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapterTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const handleExportFullReport = async () => {
    if (!fullReportContent.trim()) {
      message.error('没有可导出的内容');
      return;
    }

    try {
      const blob = await exportToWord(fullReportContent, '项目报告');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '项目报告.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('整份报告导出成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const handleClearGenerated = () => {
    if (!activeProjectId) {
      message.error('请先选择项目');
      return;
    }

    const projectName = projects.find(project => project.id === activeProjectId)?.name || activeProjectId;

    Modal.confirm({
      title: '清空报告内容',
      content: `确定要清空项目“${projectName}”中所有章节的报告内容吗？输入数据将会保留。`,
      okText: '清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setClearingReports(true);
        return clearGeneratedContent(activeProjectId)
          .then(result => {
            updateProjectState(activeProjectId, state => {
              const clearedContents: Record<string, string> = {};
              Object.keys(state.chapterContents).forEach(key => {
                clearedContents[key] = '';
              });
              return {
                ...state,
                chapterContents: clearedContents
              };
            });
            const clearedCount = result.cleared_chapters.length;
            if (clearedCount > 0) {
              message.success(`已清空 ${clearedCount} 个章节的报告内容`);
            } else {
              message.success('报告内容已清空');
            }
          })
          .catch((error: any) => {
            const detail = error.response?.data?.detail || error.message || '清空失败';
            message.error(detail);
            return Promise.reject(error);
          })
          .finally(() => {
            setClearingReports(false);
          });
      }
    });
  };

  const handleChapterTabChange = (chapterId: string) => {
    const ref = chapterRefs[chapterId]?.current;
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveChapterId(chapterId);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (currentChapters.length === 0) {
        return;
      }

      let current: string | null = null;
      const viewportThreshold = 140;

      for (const chapter of currentChapters) {
        const ref = chapterRefs[chapter.id]?.current;
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (rect.top <= viewportThreshold && rect.bottom > viewportThreshold) {
            current = chapter.id;
            break;
          }
        }
      }

      if (!current) {
        const last = currentChapters[currentChapters.length - 1];
        const lastRef = last ? chapterRefs[last.id]?.current : null;
        if (lastRef && lastRef.getBoundingClientRect().top < viewportThreshold) {
          current = last.id;
        }
      }

      if (current && current !== activeChapterId) {
        setActiveChapterId(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentChapters, chapterRefs, activeChapterId]);

  const handleProjectChange = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  const openCreateProjectModal = () => {
    projectForm.resetFields();
    setProjectModalVisible(true);
  };

  const handleCreateProject = async () => {
    try {
      const values = await projectForm.validateFields();
      const name = values.name.trim();
      if (!name) {
        message.error('项目名称不能为空');
        return;
      }

      setCreatingProject(true);
      const project = await createProject(name);
      message.success('项目创建成功，请上传参考文档完成初始化');

      setProjects(prev => [...prev, project]);
      setProjectStates(prev => ({ ...prev, [project.id]: createProjectState() }));
      setProjectModalVisible(false);
      setSeedProjectId(project.id);
      setSeedFile(null);
      setSeedModalVisible(true);
      setActiveProjectId(project.id);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const detail = error.response?.data?.detail || error.message || '创建失败';
      message.error(detail);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleSeedProject = async () => {
    if (!seedProjectId) {
      message.error('缺少项目标识');
      return;
    }
    if (!seedFile) {
      message.error('请选择要上传的文档');
      return;
    }

    setSeedUploading(true);
    try {
      await seedProject(seedProjectId, seedFile);
      message.success('项目初始化成功');
      setSeedModalVisible(false);
      setSeedFile(null);

      await refreshProject(seedProjectId);
      setActiveProjectId(seedProjectId);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message || '项目初始化失败';
      message.error(detail);
    } finally {
      setSeedUploading(false);
    }
  };

  const handleDeleteProject = () => {
    if (!activeProjectId) {
      message.warning('请选择要删除的项目');
      return;
    }

    if (activeProjectId === 'default') {
      message.warning('默认项目不可删除');
      return;
    }

    const project = projects.find(p => p.id === activeProjectId);
    const projectName = project?.name || '当前项目';

    Modal.confirm({
      title: '删除项目',
      content: `确定要删除项目“${projectName}”吗？该项目下的所有示例文档、Prompt 模板和生成内容都会被清空。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setDeletingProject(true);
          await deleteProject(activeProjectId);
          message.success('项目已删除');
          setProjects(prev => prev.filter(p => p.id !== activeProjectId));
          setProjectStates(prev => {
            const next = { ...prev };
            delete next[activeProjectId];
            return next;
          });

          const remaining = projects.filter(p => p.id !== activeProjectId);
          if (remaining.length > 0) {
            setActiveProjectId(remaining[0].id);
          } else {
            setActiveProjectId(null);
            setActiveChapterId(null);
          }
        } catch (error: any) {
          const detail = error.response?.data?.detail || error.message || '删除项目失败';
          message.error(detail);
          throw error;
        } finally {
          setDeletingProject(false);
        }
      }
    });
  };

  const reportTabContent = activeProjectId ? (
    currentChapters.length === 0 ? (
      <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
        项目尚未配置章节，请先上传参考文档完成初始化。
      </div>
    ) : (
      <div>
        <Affix offsetTop={88}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 16,
              boxShadow: '0 8px 24px -18px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(0,0,0,0.06)',
              zIndex: 10
            }}
          >
            <Segmented
              options={currentChapters.map(({ id, title }) => ({
                label: title,
                value: id
              }))}
              value={activeChapterId || undefined}
              onChange={value => handleChapterTabChange(value as string)}
              size="small"
              style={{ minWidth: 320 }}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleClearGenerated}
              disabled={!hasPartialContent || clearingReports}
              loading={clearingReports}
            >
              清空生成内容
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setIsPreviewVisible(true)}
              disabled={!hasPartialContent}
            >
              预览整份报告
            </Button>
          </div>
        </Affix>
        <Space direction="vertical" size={24} style={{ width: '100%', marginTop: 16 }}>
          {currentChapters.map(chapter => (
            <div key={chapter.id} ref={chapterRefs[chapter.id]} id={chapter.id}>
              <ChapterSection
                title={chapter.title}
                dataPlaceholder={DATA_PLACEHOLDER}
                dataValue={currentProjectState.chapterData[chapter.id] || ''}
                onDataChange={value => handleDataChange(chapter.id, value)}
                contentValue={currentProjectState.chapterContents[chapter.id] || ''}
                onContentChange={content => handleContentChange(chapter.id, content)}
                loading={currentProjectState.loading[chapter.id] || false}
                onGenerate={() => handleGenerate(chapter.id)}
                onExport={() => handleExport(chapter.id)}
                templates={currentProjectState.templates[chapter.id] || []}
                selectedTemplateId={currentProjectState.selectedTemplates[chapter.id] || ''}
                onTemplateSelect={value => handleTemplateSelect(chapter.id, value)}
                exampleFiles={currentProjectState.exampleFiles}
              />
            </div>
          ))}
        </Space>
        <FullReportPreview
          open={isPreviewVisible}
          onClose={() => setIsPreviewVisible(false)}
          content={fullReportContent}
          onExport={handleExportFullReport}
          hasPartialContent={hasPartialContent}
        />
      </div>
    )
  ) : (
    <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
      请先创建或选择一个项目，以开始生成报告。
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <h1 style={{ margin: 0 }}>报告生成系统</h1>
          <Space>
            <Select
              placeholder="选择项目"
              style={{ minWidth: 220 }}
              value={activeProjectId || undefined}
              onChange={handleProjectChange}
            >
              {projects.map(project => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProjectModal}>
              新建项目
            </Button>
            <Button
              danger
              onClick={handleDeleteProject}
              disabled={!activeProjectId || activeProjectId === 'default'}
              loading={deletingProject}
            >
              删除项目
            </Button>
          </Space>
        </div>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'report',
                label: (
                  <span>
                    <FileTextOutlined />
                    报告生成
                  </span>
                ),
                children: reportTabContent
              },
              {
                key: 'examples',
                label: (
                  <span>
                    <FolderOpenOutlined />
                    示例文档管理
                  </span>
                ),
                children: (
                  <ExampleManager
                    key={activeProjectId || 'default'}
                    exampleFiles={currentProjectState.exampleFiles}
                    onUpload={handleUploadExample}
                    onDelete={handleDeleteExample}
                    uploading={uploading}
                  />
                )
              },
              {
                key: 'prompts',
                label: (
                  <span>
                    <SettingOutlined />
                    Prompt配置
                  </span>
                ),
                children: activeProjectId ? (
                  <PromptTemplateManager
                    key={activeProjectId}
                    projectId={activeProjectId}
                    chapters={currentChapters}
                    onTemplatesChanged={() => loadProjectTemplates(activeProjectId)}
                  />
                ) : (
                  <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
                    请先创建或选择一个项目
                  </div>
                )
              }
            ]}
          />
        </div>
      </Content>

      <Modal
        title="新建项目"
        open={projectModalVisible}
        onCancel={() => setProjectModalVisible(false)}
        onOk={handleCreateProject}
        confirmLoading={creatingProject}
        okText="创建"
        cancelText="取消"
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item
            label="项目名称"
            name="name"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 50, message: '名称不超过 50 个字符' }
            ]}
          >
            <Input placeholder="例如：事件月报、质量月报" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传参考文档"
        open={seedModalVisible}
        onCancel={() => {
          if (seedUploading) return;
          setSeedModalVisible(false);
          setSeedFile(null);
          setSeedProjectId(null);
        }}
        onOk={handleSeedProject}
        confirmLoading={seedUploading}
        okText="开始生成"
        cancelText="取消"
      >
        <p>请选择包含完整示例报告的文档，系统将自动分析章节并生成 Prompt 模板。</p>
        <input
          type="file"
          accept=".md,.markdown,.docx,.doc"
          onChange={event => {
            const file = event.target.files?.[0] || null;
            setSeedFile(file);
          }}
          disabled={seedUploading}
        />
        {seedFile && <div style={{ marginTop: 8 }}>已选择文件：{seedFile.name}</div>}
      </Modal>
    </Layout>
  );
}

export default App;
