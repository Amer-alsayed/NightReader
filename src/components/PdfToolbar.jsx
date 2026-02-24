import React from 'react';
import {
    X, PanelLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
    Scroll, BookOpen, Maximize2, EyeOff, Minimize, Maximize, Moon, Sun
} from 'lucide-react';

const PdfToolbar = ({
    isVisible,
    onClose,

    onToggleSidebar,
    currentPage,
    numPages,
    onPrevPage,
    onNextPage,
    pageInputValue,
    onPageInputChange,
    onPageInputKeyDown,
    onPageInputBlur,
    scale,
    onZoomIn,
    onZoomOut,
    viewMode,
    onToggleViewMode,
    fitMode,
    onCycleFitMode,
    onToggleFocusMode,
    isFullscreen,
    onToggleFullscreen,
    isDarkMode,
    onToggleDarkMode
}) => {
    return (
        <div
            className={`pdf-toolbar glass-panel`}
            style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}
        >
            <button className="btn btn-icon" onClick={onClose} title="Close PDF"><X size={20} /></button>

            <div className="toolbar-divider"></div>

            {/* Sidebar toggle */}
            <button className="btn btn-icon" onClick={onToggleSidebar} title="Toggle Page Sidebar">
                <PanelLeft size={20} />
            </button>

            <div className="toolbar-divider"></div>

            {/* Page navigation */}
            <div className="page-controls">
                <button className="btn btn-icon" onClick={onPrevPage} disabled={currentPage <= 1} title="Previous Page">
                    <ChevronLeft size={20} />
                </button>
                <span className="page-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="text" value={pageInputValue} onChange={onPageInputChange}
                        onKeyDown={onPageInputKeyDown} onBlur={onPageInputBlur} className="page-input" />
                    <span>/ {numPages || '-'}</span>
                </span>
                <button className="btn btn-icon" onClick={onNextPage} disabled={currentPage >= numPages} title="Next Page">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Zoom */}
            <div className="zoom-controls">
                <button className="btn btn-icon" onClick={onZoomOut} disabled={scale <= 0.5}><ZoomOut size={20} /></button>
                <span className="zoom-info">{Math.round(scale * 100)}%</span>
                <button className="btn btn-icon" onClick={onZoomIn} disabled={scale >= 3.0}><ZoomIn size={20} /></button>
            </div>

            <div className="toolbar-divider"></div>

            {/* View mode + fit + focus + fullscreen */}
            <div className="fit-controls" style={{ display: 'flex', gap: '8px' }}>
                <button className={`btn btn-icon ${viewMode === 'scroll' ? 'btn-active' : ''}`} onClick={onToggleViewMode} title={viewMode === 'slide' ? 'Switch to Scroll View' : 'Switch to Slide View'}>
                    {viewMode === 'slide' ? <Scroll size={20} /> : <BookOpen size={20} />}
                </button>
                <button className="btn btn-icon" onClick={onCycleFitMode} title={`Fit Mode: ${fitMode}`}>
                    <Maximize2 size={20} />
                </button>
                <button className="btn btn-icon" onClick={onToggleFocusMode} title="Focus Mode (Hide UI)">
                    <EyeOff size={20} />
                </button>
                <button className="btn btn-icon" onClick={onToggleFullscreen} title="Toggle Fullscreen">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Dark mode toggle */}
            <button className={`btn ${isDarkMode ? 'btn-primary' : ''}`} onClick={onToggleDarkMode}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                <span className="mode-text">{isDarkMode ? 'Dark' : 'Light'}</span>
            </button>
        </div>
    );
};

export default PdfToolbar;
