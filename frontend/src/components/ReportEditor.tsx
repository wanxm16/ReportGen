import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Spin, message } from 'antd';
import { DownloadOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;

interface ReportEditorProps {
  content: string;
  onChange: (content: string) => void;
  onExport: () => void;
  loading?: boolean;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({
  content,
  onChange,
  onExport,
  loading = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleSave = () => {
    onChange(editContent);
    setIsEditing(false);
    message.success('保存成功');
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在生成报告...</div>
        </div>
      </Card>
    );
  }

  if (!content && !isEditing) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
          请先上传数据文件并选择章节生成报告
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="报告内容"
      extra={
        <Space>
          {!isEditing ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={onExport}
                disabled={!content}
              >
                导出 Word
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
            </>
          )}
        </Space>
      }
    >
      {isEditing ? (
        <TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          autoSize={{ minRows: 20, maxRows: 50 }}
          style={{ fontFamily: 'monospace' }}
        />
      ) : (
        <div className="markdown-content" style={{ minHeight: 400 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </Card>
  );
};
