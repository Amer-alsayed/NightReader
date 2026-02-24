import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ── Thumbnail component ──
const Thumbnail = ({ pdfDoc, pageNumber, isActive, isDarkMode, onClick }) => {
    const canvasRef = useRef(null);
    const rendered = useRef(false);

    useEffect(() => {
        if (!pdfDoc || rendered.current) return;
        let active = true;

        (async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);
                if (!active || !canvasRef.current) return;
                const vp = page.getViewport({ scale: 0.25 });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = vp.width;
                canvas.height = vp.height;
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                rendered.current = true;
            } catch { /* ignore */ }
        })();

        return () => { active = false; };
    }, [pdfDoc, pageNumber]);

    return (
        <button className={`thumb ${isActive ? 'thumb-active' : ''}`} onClick={() => onClick(pageNumber)} title={`Page ${pageNumber}`}>
            <canvas ref={canvasRef} className={isDarkMode ? 'pdf-dark-mode-canvas' : ''} />
            <span className="thumb-label">{pageNumber}</span>
        </button>
    );
};

const PdfSidebar = ({
    isOpen,
    onClose,
    pdfDoc,
    numPages,
    currentPage,
    isDarkMode,
    onThumbnailClick
}) => {
    return (
        <div className={`pdf-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <span className="sidebar-title">Pages</span>
                <button className="btn btn-icon" onClick={onClose} title="Close Sidebar">
                    <X size={16} />
                </button>
            </div>
            <div className="sidebar-thumbs">
                {pdfDoc && Array.from({ length: numPages }, (_, i) => (
                    <Thumbnail
                        key={i + 1}
                        pdfDoc={pdfDoc}
                        pageNumber={i + 1}
                        isActive={currentPage === i + 1}
                        isDarkMode={isDarkMode}
                        onClick={onThumbnailClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default PdfSidebar;
