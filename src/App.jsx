import React, { useState } from 'react';
import Dropzone from './components/Dropzone';
import PdfViewer from './components/PdfViewer';

function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileSelect = (file) => {
    setPdfFile(file);
  };

  const handleClose = () => {
    setPdfFile(null);
  };

  return (
    <div className="app-container">
      {!pdfFile ? (
        <Dropzone onFileSelect={handleFileSelect} />
      ) : (
        <PdfViewer file={pdfFile} onClose={handleClose} />
      )}
    </div>
  );
}

export default App;
