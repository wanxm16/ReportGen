import React from 'react';
import { Modal, Button, Empty, message, Space } from 'antd';
import { DownloadOutlined, CopyOutlined, FileDoneOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FullReportPreviewProps {
  open: boolean;
  content: string;
  onClose: () => void;
  onExport: () => void;
  hasPartialContent: boolean;
}

export const FullReportPreview: React.FC<FullReportPreviewProps> = ({
  open,
  content,
  onClose,
  onExport,
  hasPartialContent
}) => {
  const hasContent = !!content.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('整份报告内容已复制');
    } catch (error) {
      console.error('Failed to copy report:', error);
      message.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <FileDoneOutlined />
          <span>整份报告预览</span>
        </Space>
      }
      width={900}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy} disabled={!hasContent}>
          复制内容
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onExport}
          disabled={!hasContent}
        >
          导出整份报告
        </Button>
      ]}
    >
      {hasContent ? (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            hasPartialContent
              ? '部分章节尚未生成，生成后可在此查看整份报告'
              : '尚未生成任何章节内容'
          }
        />
      )}
    </Modal>
  );
};
