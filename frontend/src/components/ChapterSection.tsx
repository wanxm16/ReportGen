import React from 'react';
import { Card, Space, Button, Select, Typography } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { DataInput } from './DataInput';
import { ReportEditor } from './ReportEditor';

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

interface ChapterSectionProps {
  title: string;
  dataPlaceholder: string;
  dataValue: string;
  onDataChange: (value: string) => void;
  contentValue: string;
  onContentChange: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
  onExport: () => void;
  templates: PromptTemplate[];
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  exampleFiles: ExampleFile[];
}

const { Title, Text } = Typography;

export const ChapterSection: React.FC<ChapterSectionProps> = ({
  title,
  dataPlaceholder,
  dataValue,
  onDataChange,
  contentValue,
  onContentChange,
  loading,
  onGenerate,
  onExport,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  exampleFiles: _exampleFiles
}) => {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 12,
        boxShadow: '0 6px 16px -12px rgba(15, 15, 15, 0.35)'
      }}
      bodyStyle={{ padding: 24 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            {title}
          </Title>
          <Text type="secondary">
            为该章节提供数据并点击生成，生成结果会自动同步到导出预览。
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: '0 0 430px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <DataInput
                title="输入数据"
                placeholder={dataPlaceholder}
                value={dataValue}
                onChange={onDataChange}
                rows={20}
              />

              <div>
                <Text strong>选择 Prompt 模板</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="使用默认模板"
                  allowClear
                  value={selectedTemplateId || undefined}
                  onChange={(value) => onTemplateSelect(value || '')}
                >
                  {templates.map(template => (
                    <Select.Option key={template.id} value={template.id}>
                      {template.name} {template.is_default && '(默认)'}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                block
                onClick={onGenerate}
                loading={loading}
                disabled={!dataValue.trim() || loading}
              >
                生成本章节
              </Button>
            </Space>
          </div>

          <div style={{ flex: 1 }}>
            <ReportEditor
              content={contentValue}
              onChange={onContentChange}
              onExport={onExport}
              loading={loading}
            />
          </div>
        </div>
      </Space>
    </Card>
  );
};
