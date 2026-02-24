import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import './Dropzone.css';

const Dropzone = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Please drop a valid PDF file.');
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="dropzone-container animate-fade-in">
      <div className="dropzone-header">
        <h1 className="text-gradient">NightReader</h1>
        <p>Your PDFs, optimized for the night.</p>
      </div>

      <div
        className={`dropzone-area glass-panel ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <div className="dropzone-content">
          <div className={`icon-container ${isDragging ? 'pulse' : ''}`}>
            {isDragging ? <UploadCloud size={48} color="var(--accent-color)" /> : <FileText size={48} color="var(--text-secondary)" />}
          </div>
          <h2>{isDragging ? 'Drop it here!' : 'Drag & Drop your PDF'}</h2>
          <p className="subtitle">or click to browse files</p>
          <input
            type="file"
            id="file-upload"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </div>
      </div>
    </div>
  );
};

export default Dropzone;
