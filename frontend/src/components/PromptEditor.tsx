import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Space, message, Tabs, Alert, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface PromptTemplate {
  system_prompt: string;
  user_prompt_template: string;
}

interface PromptEditorProps {
  onSave?: () => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ onSave }) => {
  const [prompts, setPrompts] = useState<{
    chapter_1: PromptTemplate;
    chapter_2: PromptTemplate;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [activeChapter, setActiveChapter] = useState<'chapter_1' | 'chapter_2'>('chapter_1');

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/prompts');
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      message.error('加载Prompt失败');
      console.error('Load prompts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chapter: 'chapter_1' | 'chapter_2') => {
    if (!prompts) return;

    setSaving(prev => ({ ...prev, [chapter]: true }));
    try {
      const response = await fetch('http://localhost:8000/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapter,
          system_prompt: prompts[chapter].system_prompt,
          user_prompt_template: prompts[chapter].user_prompt_template,
        }),
      });

      if (response.ok) {
        message.success('Prompt保存成功');
        onSave?.();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      message.error('保存Prompt失败');
      console.error('Save prompts error:', error);
    } finally {
      setSaving(prev => ({ ...prev, [chapter]: false }));
    }
  };

  const handleReset = async (chapter: 'chapter_1' | 'chapter_2') => {
    try {
      const response = await fetch(`http://localhost:8000/api/prompts/reset/${chapter}`, {
        method: 'POST',
      });

      if (response.ok) {
        message.success('Prompt已重置为默认值');
        await loadPrompts();
      } else {
        throw new Error('重置失败');
      }
    } catch (error) {
      message.error('重置Prompt失败');
      console.error('Reset prompts error:', error);
    }
  };

  const handleChange = (
    chapter: 'chapter_1' | 'chapter_2',
    field: keyof PromptTemplate,
    value: string
  ) => {
    if (!prompts) return;
    setPrompts({
      ...prompts,
      [chapter]: {
        ...prompts[chapter],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  if (!prompts) {
    return (
      <Alert
        message="加载失败"
        description="无法加载Prompt配置，请刷新页面重试"
        type="error"
        showIcon
      />
    );
  }

  const renderChapterEditor = (chapter: 'chapter_1' | 'chapter_2') => (
    <Card>
      <Alert
        message="Prompt模板说明"
        description={
          <div>
            <p><strong>System Prompt:</strong> 设置AI的角色和基本行为</p>
            <p><strong>User Prompt Template:</strong> 用户提示词模板，支持以下占位符：</p>
            <ul style={{ marginBottom: 0 }}>
              <li><code>{'{data_summary}'}</code> - 将被替换为数据摘要</li>
              <li><code>{'{examples_text}'}</code> - 将被替换为示例文档内容（如果有）</li>
            </ul>
          </div>
        }
        type="info"
        icon={<QuestionCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>System Prompt</div>
          <TextArea
            value={prompts[chapter].system_prompt}
            onChange={(e) => handleChange(chapter, 'system_prompt', e.target.value)}
            rows={4}
            placeholder="设置AI的角色，例如：你是一位专业的数据分析师..."
          />
        </div>

        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>User Prompt Template</div>
          <TextArea
            value={prompts[chapter].user_prompt_template}
            onChange={(e) => handleChange(chapter, 'user_prompt_template', e.target.value)}
            rows={20}
            placeholder="编写提示词模板，使用 {data_summary} 和 {examples_text} 作为占位符"
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => handleSave(chapter)}
            loading={saving[chapter]}
          >
            保存
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => handleReset(chapter)}
          >
            重置为默认
          </Button>
        </Space>
      </Space>
    </Card>
  );

  return (
    <div>
      <Tabs
        activeKey={activeChapter}
        onChange={(key) => setActiveChapter(key as 'chapter_1' | 'chapter_2')}
        items={[
          {
            key: 'chapter_1',
            label: '一、全区社会治理基本情况',
            children: renderChapterEditor('chapter_1'),
          },
          {
            key: 'chapter_2',
            label: '二、高频社会治理问题隐患分析研判',
            children: renderChapterEditor('chapter_2'),
          },
        ]}
      />
    </div>
  );
};
