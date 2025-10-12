import React from 'react';
import { Card, Input } from 'antd';

const { TextArea } = Input;

interface DataInputProps {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export const DataInput: React.FC<DataInputProps> = ({
  title,
  placeholder,
  value,
  onChange,
  rows = 10
}) => {
  return (
    <Card title={title} size="small" style={{ marginBottom: 16 }}>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ fontFamily: 'monospace', fontSize: '13px' }}
      />
    </Card>
  );
};
