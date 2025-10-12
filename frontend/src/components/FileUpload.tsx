import React from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

interface FileUploadProps {
  title: string;
  accept: string;
  maxCount?: number;
  fileList: UploadFile[];
  onChange: (fileList: UploadFile[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  title,
  accept,
  maxCount = 1,
  fileList,
  onChange
}) => {
  const handleChange = (info: any) => {
    let newFileList = [...info.fileList];

    // Limit file list
    newFileList = newFileList.slice(-maxCount);

    // Update status
    newFileList = newFileList.map(file => {
      if (file.response) {
        file.url = file.response.url;
      }
      return file;
    });

    onChange(newFileList);
  };

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter(f => f.uid !== file.uid);
    onChange(newFileList);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <h3>{title}</h3>
      <Upload
        accept={accept}
        fileList={fileList}
        onChange={handleChange}
        onRemove={handleRemove}
        beforeUpload={() => false} // Prevent auto upload
        maxCount={maxCount}
      >
        <Button icon={<UploadOutlined />}>选择文件</Button>
      </Upload>
    </div>
  );
};
