import React, { useState, useEffect } from 'react';
import { Layout, Button, message, Tabs, Space, Select } from 'antd';
import { FileTextOutlined, FolderOpenOutlined, SettingOutlined } from '@ant-design/icons';
import { DataInput } from './components/DataInput';
import { ReportEditor } from './components/ReportEditor';
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

interface ChapterContent {
  chapter_1: string;
  chapter_2: string;
}

interface ChapterData {
  chapter_1: string;
  chapter_2: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  chapter: string;
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

function App() {
  // 全局示例文档
  const [exampleFiles, setExampleFiles] = useState<ExampleFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(true);

  // Load saved examples and templates on mount
  useEffect(() => {
    const loadExamples = async () => {
      try {
        const examples = await getAllExamples();
        setExampleFiles(examples);
      } catch (error: any) {
        console.error('Failed to load examples:', error);
        message.error('加载示例文档失败');
      } finally {
        setLoadingExamples(false);
      }
    };

    const loadTemplates = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/prompts/templates');
        const allTemplates: PromptTemplate[] = await response.json();

        const grouped = allTemplates.reduce((acc, template) => {
          if (!acc[template.chapter]) {
            acc[template.chapter] = [];
          }
          acc[template.chapter].push(template);
          return acc;
        }, {} as { [key: string]: PromptTemplate[] });

        setTemplates(grouped);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };

    loadExamples();
    loadTemplates();
  }, []);

  // 每个章节独立的数据
  const [chapterData, setChapterData] = useState<ChapterData>({
    chapter_1: '',
    chapter_2: ''
  });

  const [chapterContents, setChapterContents] = useState<ChapterContent>({
    chapter_1: '',
    chapter_2: ''
  });

  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    chapter_1: false,
    chapter_2: false
  });

  const [activeTab, setActiveTab] = useState<string>('report');
  const [activeChapter, setActiveChapter] = useState<ChapterType>('chapter_1');

  // Prompt templates
  const [templates, setTemplates] = useState<{ [key: string]: PromptTemplate[] }>({
    chapter_1: [],
    chapter_2: []
  });
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: string }>({
    chapter_1: '',
    chapter_2: ''
  });

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
    const content = chapterContents[chapter];
    if (!content) {
      message.error('没有可导出的内容');
      return;
    }

    try {
      const chapterNames = {
        chapter_1: '全区社会治理基本情况',
        chapter_2: '高频社会治理问题隐患分析研判'
      };

      const blob = await exportToWord(content, chapterNames[chapter]);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapterNames[chapter]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('导出成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const renderReportContent = () => (
    <Tabs
      activeKey={activeChapter}
      onChange={(key) => setActiveChapter(key as ChapterType)}
      items={[
        {
          key: 'chapter_1',
          label: '一、全区社会治理基本情况',
          children: (
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left: Data Input */}
              <div style={{ flex: '0 0 450px' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <DataInput
                    title="输入数据"
                    placeholder="请粘贴 CSV 或 Markdown 格式的数据&#10;&#10;CSV 示例：&#10;事件ID,事件类型,等级,街镇&#10;E001,城市管理,三级,街道A&#10;E002,环境保护,二级,街道B&#10;&#10;或直接粘贴 Markdown 表格"
                    value={chapterData.chapter_1}
                    onChange={(value) => setChapterData(prev => ({ ...prev, chapter_1: value }))}
                    rows={25}
                  />

                  {exampleFiles.length > 0 && (
                    <div style={{
                      padding: '12px',
                      background: '#f0f9ff',
                      border: '1px solid #91caff',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        📚 已加载 {exampleFiles.length} 个示例文档
                      </div>
                      <div style={{ color: '#666' }}>
                        {exampleFiles.map(f => f.name).join(', ')}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>选择Prompt模板</div>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="使用默认模板"
                      allowClear
                      value={selectedTemplates.chapter_1 || undefined}
                      onChange={(value) => setSelectedTemplates(prev => ({ ...prev, chapter_1: value || '' }))}
                    >
                      {templates.chapter_1?.map(template => (
                        <Select.Option key={template.id} value={template.id}>
                          {template.name} {template.is_default && '(默认)'}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => handleGenerate('chapter_1')}
                    loading={loading.chapter_1}
                    disabled={!chapterData.chapter_1.trim()}
                  >
                    生成报告
                  </Button>
                </Space>
              </div>

              {/* Right: Report Display */}
              <div style={{ flex: 1 }}>
                <ReportEditor
                  content={chapterContents.chapter_1}
                  onChange={(content) => handleContentChange('chapter_1', content)}
                  onExport={() => handleExport('chapter_1')}
                  loading={loading.chapter_1}
                />
              </div>
            </div>
          )
        },
        {
          key: 'chapter_2',
          label: '二、高频社会治理问题隐患分析研判',
          children: (
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left: Data Input */}
              <div style={{ flex: '0 0 450px' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <DataInput
                    title="输入数据"
                    placeholder="请粘贴 CSV 或 Markdown 格式的数据&#10;&#10;CSV 示例：&#10;事件ID,事件类型,等级,街镇&#10;E001,城市管理,三级,街道A&#10;E002,环境保护,二级,街道B&#10;&#10;或直接粘贴 Markdown 表格"
                    value={chapterData.chapter_2}
                    onChange={(value) => setChapterData(prev => ({ ...prev, chapter_2: value }))}
                    rows={25}
                  />

                  {exampleFiles.length > 0 && (
                    <div style={{
                      padding: '12px',
                      background: '#f0f9ff',
                      border: '1px solid #91caff',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        📚 已加载 {exampleFiles.length} 个示例文档
                      </div>
                      <div style={{ color: '#666' }}>
                        {exampleFiles.map(f => f.name).join(', ')}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>选择Prompt模板</div>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="使用默认模板"
                      allowClear
                      value={selectedTemplates.chapter_2 || undefined}
                      onChange={(value) => setSelectedTemplates(prev => ({ ...prev, chapter_2: value || '' }))}
                    >
                      {templates.chapter_2?.map(template => (
                        <Select.Option key={template.id} value={template.id}>
                          {template.name} {template.is_default && '(默认)'}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => handleGenerate('chapter_2')}
                    loading={loading.chapter_2}
                    disabled={!chapterData.chapter_2.trim()}
                  >
                    生成报告
                  </Button>
                </Space>
              </div>

              {/* Right: Report Display */}
              <div style={{ flex: 1 }}>
                <ReportEditor
                  content={chapterContents.chapter_2}
                  onChange={(content) => handleContentChange('chapter_2', content)}
                  onExport={() => handleExport('chapter_2')}
                  loading={loading.chapter_2}
                />
              </div>
            </div>
          )
        }
      ]}
    />
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
                children: renderReportContent()
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
