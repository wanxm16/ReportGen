import React, { useState, useEffect, useMemo } from 'react';
import { Layout, message, Tabs, Space, Button, Affix, Segmented } from 'antd';
import { FileTextOutlined, FolderOpenOutlined, SettingOutlined, EyeOutlined } from '@ant-design/icons';
import { ChapterSection } from './components/ChapterSection';
import { FullReportPreview } from './components/FullReportPreview';
import { ExampleManager } from './components/ExampleManager';
import { PromptTemplateManager } from './components/PromptTemplateManager';
import {
  uploadExampleFile,
  generateReportChapterWithText,
  exportToWord,
  getAllExamples,
  deleteExampleFile,
  type ChapterType
} from './services/api';
import './App.css';

const { Header, Content } = Layout;

type ChapterRecord<T> = Record<ChapterType, T>;
type ChapterContent = ChapterRecord<string>;
type ChapterData = ChapterRecord<string>;

interface PromptTemplate {
  id: string;
  name: string;
  chapter: ChapterType;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ExampleFile {
  id: string;
  name: string;
}

const CHAPTERS: Array<{ key: ChapterType; label: string; exportName: string }> = [
  { key: 'chapter_1', label: '一、全区社会治理基本情况', exportName: '全区社会治理基本情况' },
  { key: 'chapter_2', label: '二、高频社会治理问题隐患分析研判', exportName: '高频社会治理问题隐患分析研判' },
  { key: 'chapter_3', label: '三、社情民意热点问题分析预警', exportName: '社情民意热点问题分析预警' },
  { key: 'chapter_4', label: '四、事件处置解决情况分析', exportName: '事件处置解决情况分析' }
];

const DATA_PLACEHOLDER = '请粘贴 CSV 或 Markdown 格式的数据&#10;&#10;CSV 示例：&#10;事件ID,事件类型,等级,街镇&#10;E001,城市管理,三级,街道A&#10;E002,环境保护,二级,街道B&#10;&#10;或直接粘贴 Markdown 表格';

const CHAPTER_NAME_MAP = CHAPTERS.reduce((acc, { key, exportName }) => {
  acc[key] = exportName;
  return acc;
}, {} as ChapterRecord<string>);

const createChapterRecord = <T,>(factory: T | (() => T)): ChapterRecord<T> =>
  CHAPTERS.reduce((acc, { key }) => {
    acc[key] = typeof factory === 'function' ? (factory as () => T)() : factory;
    return acc;
  }, {} as ChapterRecord<T>);

const buildFullReportContent = (contents: ChapterContent) =>
  CHAPTERS.map(({ key, label }) => {
    const chapterContent = contents[key]?.trim();
    if (!chapterContent) {
      return '';
    }
    return `## ${label}\n\n${chapterContent}`;
  })
    .filter(Boolean)
    .join('\n\n');

function App() {
  // 全局示例文档
  const [exampleFiles, setExampleFiles] = useState<ExampleFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // State definitions (must come before useEffect)
  const [chapterData, setChapterData] = useState<ChapterData>(() => createChapterRecord(''));

  const [chapterContents, setChapterContents] = useState<ChapterContent>(() => createChapterRecord(''));

  const [loading, setLoading] = useState<ChapterRecord<boolean>>(() => createChapterRecord(false));
  const [activeTab, setActiveTab] = useState<string>('report');
  const [activeChapter, setActiveChapter] = useState<ChapterType>('chapter_1');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Prompt templates
  const [templates, setTemplates] = useState<ChapterRecord<PromptTemplate[]>>(() => createChapterRecord(() => []));
  const [selectedTemplates, setSelectedTemplates] = useState<ChapterRecord<string>>(() => createChapterRecord(''));

  // Load templates function
  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/prompts/templates');
      const allTemplates: PromptTemplate[] = await response.json();

      const grouped = createChapterRecord<PromptTemplate[]>(() => []);
      allTemplates.forEach(template => {
        grouped[template.chapter].push(template);
      });

      setTemplates(grouped);
      console.log('[App] Templates loaded:', grouped);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  // Load saved examples and templates on mount
  useEffect(() => {
    const loadExamples = async () => {
      try {
        const examples = await getAllExamples();
        setExampleFiles(examples);
      } catch (error: any) {
        console.error('Failed to load examples:', error);
        message.error('加载示例文档失败');
      }
    };

    loadExamples();
    loadTemplates();
  }, []);

  // Reload templates when switching to report tab
  useEffect(() => {
    if (activeTab === 'report') {
      console.log('[App] Switching to report tab, reloading templates');
      loadTemplates();
    }
  }, [activeTab]);

  const chapterRefs = useMemo(
    () => createChapterRecord(() => React.createRef<HTMLDivElement>()),
    []
  );

  const fullReportContent = useMemo(() => buildFullReportContent(chapterContents), [chapterContents]);
  const hasPartialContent = useMemo(
    () => Object.values(chapterContents).some(value => !!value?.trim()),
    [chapterContents]
  );

  // Handle example file upload
  const handleUploadExample = async (file: File) => {
    setUploading(true);
    try {
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      const response = await uploadExampleFile(file);
      console.log('Upload response:', response);

      if (response.success) {
        setExampleFiles(prev => [
          ...prev,
          { id: response.file_id, name: response.filename }
        ]);
        message.success('示例文档上传成功');
      } else {
        const errorMsg = response.error || '上传失败';
        console.error('Upload failed:', errorMsg);
        message.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || '上传失败，请检查网络连接';
      message.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Handle example file delete
  const handleDeleteExample = async (id: string) => {
    try {
      await deleteExampleFile(id);
      setExampleFiles(prev => prev.filter(f => f.id !== id));
      message.success('示例文档已删除');
    } catch (error: any) {
      console.error('Delete error:', error);
      message.error('删除失败');
    }
  };

  // Generate report chapter
  const handleGenerate = async (chapter: ChapterType) => {
    const dataText = chapterData[chapter];

    if (!dataText.trim()) {
      message.error('请先输入数据');
      return;
    }

    setLoading(prev => ({ ...prev, [chapter]: true }));
    try {
      const exampleFileIds = exampleFiles.map(f => f.id);

      console.log('[Generate] Starting request:', {
        chapter,
        dataLength: dataText.length,
        exampleFileIds
      });

      const templateId = selectedTemplates[chapter] || undefined;

      const response = await generateReportChapterWithText(
        chapter,
        dataText,
        exampleFileIds,
        templateId
      );

      console.log('[Generate] Response received:', response);

      if (response.success) {
        setChapterContents(prev => ({
          ...prev,
          [chapter]: response.content
        }));
        message.success('报告生成成功');
      } else {
        console.error('[Generate] Error in response:', response.error);
        message.error(response.error || '生成失败');
      }
    } catch (error: any) {
      console.error('[Generate] Exception caught:', error);
      console.error('[Generate] Error response:', error.response);
      const errorMsg = error.response?.data?.detail || error.message || '生成失败';
      message.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, [chapter]: false }));
    }
  };

  // Update chapter content
  const handleContentChange = (chapter: ChapterType, content: string) => {
    setChapterContents(prev => ({
      ...prev,
      [chapter]: content
    }));
  };

  // Export to Word
  const handleExport = async (chapter: ChapterType) => {
    if (loading[chapter]) {
      message.warning('正在生成，请稍后再试');
      return;
    }

    const content = chapterContents[chapter];
    if (!content) {
      message.error('没有可导出的内容');
      return;
    }

    try {
      const exportName = CHAPTER_NAME_MAP[chapter];

      const blob = await exportToWord(content, exportName);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportName}.docx`;
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
      const blob = await exportToWord(fullReportContent, '事件报告');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '事件报告.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('整份报告导出成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const handleChapterTabChange = (chapter: ChapterType) => {
    const ref = chapterRefs[chapter]?.current;
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveChapter(chapter);
  };

  useEffect(() => {
    const handleScroll = () => {
      let currentChapter: ChapterType | null = null;
      for (const { key } of CHAPTERS) {
        const ref = chapterRefs[key]?.current;
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom > 140) {
            currentChapter = key;
            break;
          }
        }
      }

      if (!currentChapter) {
        const lastChapter = CHAPTERS[CHAPTERS.length - 1]?.key;
        const lastRef = chapterRefs[lastChapter]?.current;
        if (lastRef && lastRef.getBoundingClientRect().top < 140) {
          currentChapter = lastChapter;
        }
      }

      if (currentChapter && currentChapter !== activeChapter) {
        setActiveChapter(currentChapter);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeChapter, chapterRefs]);

  const reportTabContent = (
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
            options={CHAPTERS.map(({ key, label }) => ({
              label,
              value: key
            }))}
            value={activeChapter}
            onChange={(value) => handleChapterTabChange(value as ChapterType)}
            size="small"
            style={{ minWidth: 320 }}
          />
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
        {CHAPTERS.map(({ key, label }) => (
          <div key={key} ref={chapterRefs[key]} id={key}>
            <ChapterSection
              title={label}
              dataPlaceholder={DATA_PLACEHOLDER}
              dataValue={chapterData[key]}
              onDataChange={(value) =>
                setChapterData(prev => ({ ...prev, [key]: value }))
              }
              contentValue={chapterContents[key]}
              onContentChange={(content) => handleContentChange(key, content)}
              loading={loading[key]}
              onGenerate={() => handleGenerate(key)}
              onExport={() => handleExport(key)}
              templates={templates[key]}
              selectedTemplateId={selectedTemplates[key] || ''}
              onTemplateSelect={(value) =>
                setSelectedTemplates(prev => ({ ...prev, [key]: value }))
              }
              exampleFiles={exampleFiles}
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
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, lineHeight: '64px' }}>事件报告生成系统</h1>
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
                    exampleFiles={exampleFiles}
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
                children: <PromptTemplateManager />
              }
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
}

export default App;
