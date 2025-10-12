import React from 'react';
import { Card, Upload, List, Button, message, Space } from 'antd';
import { UploadOutlined, DeleteOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

interface ExampleManagerProps {
  exampleFiles: Array<{ id: string; name: string }>;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
  uploading: boolean;
}

export const ExampleManager: React.FC<ExampleManagerProps> = ({
  exampleFiles,
  onUpload,
  onDelete,
  uploading
}) => {
  const handleBeforeUpload = async (file: File) => {
    const allowedExtensions = ['.md', '.markdown', '.docx', '.doc'];
    const isAllowed = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isAllowed) {
      message.error('只支持 Markdown (.md, .markdown) 和 Word (.docx, .doc) 文件');
      return false;
    }

    try {
      await onUpload(file);
    } catch (error) {
      // Error already handled in parent
    }
    return false; // Prevent auto upload
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Card
        title="示例文档管理"
        extra={
          <Upload
            accept=".md,.markdown,.docx,.doc"
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              上传示例文档
            </Button>
          </Upload>
        }
      >
        <div style={{ marginBottom: 16, color: '#666' }}>
          上传的示例文档将用于所有章节的报告生成，帮助 AI 学习语气风格和分析思路。支持 Markdown (.md) 和 Word (.docx, .doc) 格式。
        </div>

        {exampleFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <FileMarkdownOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无示例文档</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              点击右上角"上传示例文档"按钮添加
            </div>
          </div>
        ) : (
          <List
            dataSource={exampleFiles}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(item.id)}
                  >
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileMarkdownOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={item.name}
                  description={`文档 ID: ${item.id}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
