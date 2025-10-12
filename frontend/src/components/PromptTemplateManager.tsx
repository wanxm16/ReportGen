import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Spin,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  QuestionCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { generatePromptFromExamples, getAllExamples, generateAllChaptersPrompts } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

interface Template {
  id: string;
  name: string;
  chapter: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE = 'http://localhost:8000/api/prompts';

const CHAPTER_NAMES = {
  chapter_1: '一、全区社会治理基本情况',
  chapter_2: '二、高频社会治理问题隐患分析研判'
};

export const PromptTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [hasExamples, setHasExamples] = useState(false);

  useEffect(() => {
    loadTemplates();
    checkExamples();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/templates`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      message.error('加载模板失败');
      console.error('Load templates error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExamples = async () => {
    try {
      const examples = await getAllExamples();
      setHasExamples(examples.length > 0);
    } catch (error) {
      console.error('Check examples error:', error);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    form.setFieldsValue(template);
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingTemplate) {
        // Update existing template
        const response = await fetch(`${API_BASE}/templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });

        if (!response.ok) throw new Error('更新失败');
        message.success('模板更新成功');
      } else {
        // Create new template
        const response = await fetch(`${API_BASE}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });

        if (!response.ok) throw new Error('创建失败');
        message.success('模板创建成功');
      }

      setModalVisible(false);
      loadTemplates();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '删除失败');
      }

      message.success('模板删除成功');
      loadTemplates();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleSetDefault = async (template: Template) => {
    try {
      const response = await fetch(`${API_BASE}/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true })
      });

      if (!response.ok) throw new Error('设置失败');
      message.success('已设置为默认模板');
      loadTemplates();
    } catch (error: any) {
      message.error(error.message || '设置失败');
    }
  };

  const handleGenerateFromExamples = async (chapter: string) => {
    if (!hasExamples) {
      message.warning('请先上传示例文档');
      return;
    }

    Modal.confirm({
      title: '从示例文档生成 Prompt',
      content: (
        <div>
          <p>将分析所有已上传的示例文档，自动生成适合的 Prompt 模板。</p>
          <p>生成的模板将：</p>
          <ul>
            <li>学习示例文档的写作风格和结构</li>
            <li>提取关键信息点和格式要求</li>
            <li>自动包含必要的占位符</li>
          </ul>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            注意：生成过程需要调用 AI，可能需要 10-30 秒
          </p>
        </div>
      ),
      okText: '开始生成',
      cancelText: '取消',
      onOk: async () => {
        setGenerating(true);
        try {
          message.loading({ content: '正在分析示例文档并生成 Prompt...', key: 'generating', duration: 0 });

          const result = await generatePromptFromExamples(chapter as any);

          message.success({ content: `成功分析 ${result.analyzed_examples} 个示例`, key: 'generating' });

          // Fill form with generated prompt
          form.setFieldsValue({
            name: `AI 生成 - ${CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}`,
            chapter: chapter,
            system_prompt: result.system_prompt,
            user_prompt_template: result.user_prompt_template,
            is_default: false
          });

          setEditingTemplate(null);
          setModalVisible(true);
        } catch (error: any) {
          message.error({ content: error.message || '生成失败', key: 'generating' });
          console.error('Generate prompt error:', error);
        } finally {
          setGenerating(false);
        }
      }
    });
  };

  const handleBatchGenerate = async () => {
    if (!hasExamples) {
      message.warning('请先上传示例文档');
      return;
    }

    Modal.confirm({
      title: '批量生成所有章节 Prompt',
      content: (
        <div>
          <p>将自动分析示例文档，依次生成所有章节的 Prompt 模板：</p>
          <ul>
            <li>一、全区社会治理基本情况</li>
            <li>二、高频社会治理问题隐患分析研判</li>
          </ul>
          <p>每个章节将：</p>
          <ul>
            <li>从示例文档中提取对应章节内容</li>
            <li>分析该章节的写作风格和格式要求</li>
            <li>生成专属的 Prompt 模板并自动保存</li>
          </ul>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            注意：批量生成需要较长时间（约 30-60 秒），请耐心等待
          </p>
        </div>
      ),
      okText: '开始批量生成',
      cancelText: '取消',
      width: 600,
      onOk: async () => {
        setGenerating(true);
        try {
          message.loading({ content: '正在批量生成所有章节 Prompt...', key: 'batch-gen', duration: 0 });

          const result = await generateAllChaptersPrompts();

          if (result.success) {
            message.success({
              content: `批量生成完成！成功 ${result.successful} 个，失败 ${result.failed} 个`,
              key: 'batch-gen',
              duration: 5
            });

            // Show detailed results
            const successChapters = result.results.filter(r => r.success).map(r => r.chapter);
            const failedChapters = result.results.filter(r => !r.success);

            if (successChapters.length > 0) {
              message.info(`成功生成章节：${successChapters.join(', ')}`);
            }
            if (failedChapters.length > 0) {
              failedChapters.forEach(fc => {
                message.error(`${fc.chapter} 生成失败：${fc.error}`);
              });
            }

            // Reload templates
            loadTemplates();
          } else {
            message.error({ content: '批量生成失败', key: 'batch-gen' });
          }
        } catch (error: any) {
          message.error({ content: error.message || '批量生成失败', key: 'batch-gen' });
          console.error('Batch generate error:', error);
        } finally {
          setGenerating(false);
        }
      }
    });
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.chapter]) {
      acc[template.chapter] = [];
    }
    acc[template.chapter].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: '8px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
        <Button
          type="default"
          icon={<ThunderboltOutlined />}
          onClick={handleBatchGenerate}
          loading={generating}
          disabled={!hasExamples}
          style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
        >
          一键生成所有章节
        </Button>
      </div>

      <Alert
        message="模板说明"
        description={
          <div>
            <p>• 每个章节可以有多个Prompt模板</p>
            <p>• 生成报告时可以选择使用哪个模板</p>
            <p>• 标记为默认的模板会在未选择时自动使用</p>
            <p>• 占位符：<code>{'{data_summary}'}</code> 数据摘要，<code>{'{examples_text}'}</code> 示例文档</p>
          </div>
        }
        type="info"
        icon={<QuestionCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      {Object.entries(groupedTemplates).map(([chapter, chapterTemplates]) => (
        <Card
          key={chapter}
          title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES] || chapter}
          extra={
            <Button
              type="dashed"
              icon={<BulbOutlined />}
              onClick={() => handleGenerateFromExamples(chapter)}
              loading={generating}
              disabled={!hasExamples}
            >
              AI 生成 Prompt
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <List
            dataSource={chapterTemplates}
            renderItem={(template) => (
              <List.Item
                actions={[
                  template.is_default ? (
                    <Tag color="gold" icon={<StarFilled />}>默认</Tag>
                  ) : (
                    <Button
                      size="small"
                      icon={<StarOutlined />}
                      onClick={() => handleSetDefault(template)}
                    >
                      设为默认
                    </Button>
                  ),
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(template)}
                  >
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定要删除这个模板吗？"
                    onConfirm={() => handleDelete(template.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={template.name}
                  description={
                    <div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        System Prompt: {template.system_prompt.substring(0, 50)}...
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        更新时间: {new Date(template.updated_at).toLocaleString()}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ))}

      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如：详细版报告、简化版报告" />
          </Form.Item>

          {!editingTemplate && (
            <Form.Item
              name="chapter"
              label="所属章节"
              rules={[{ required: true, message: '请选择章节' }]}
            >
              <Select placeholder="选择章节">
                <Option value="chapter_1">{CHAPTER_NAMES.chapter_1}</Option>
                <Option value="chapter_2">{CHAPTER_NAMES.chapter_2}</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="system_prompt"
            label="System Prompt"
            rules={[{ required: true, message: '请输入System Prompt' }]}
          >
            <TextArea
              rows={4}
              placeholder="设置AI的角色和行为，例如：你是一位专业的数据分析师..."
            />
          </Form.Item>

          <Form.Item
            name="user_prompt_template"
            label="User Prompt Template"
            rules={[{ required: true, message: '请输入User Prompt Template' }]}
          >
            <TextArea
              rows={15}
              placeholder="编写提示词模板，使用 {data_summary} 和 {examples_text} 作为占位符"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item name="is_default" valuePropName="checked" initialValue={false}>
            <div>
              <input type="checkbox" id="is_default" />
              <label htmlFor="is_default" style={{ marginLeft: 8 }}>
                设为该章节的默认模板
              </label>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
