import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import 'pdfjs-dist/build/pdf.worker.mjs';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Moon, Sun, X, Maximize, Minimize, Maximize2, Eye, EyeOff, PanelLeft, Scroll, BookOpen } from 'lucide-react';
import './PdfViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

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
            } catch (e) { /* ignore */ }
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

// ── Scroll-mode page canvas ──
const ScrollPageCanvas = ({ pdfDoc, pageNumber, scale, isDarkMode, containerWidth, containerHeight, fitMode }) => {
    const canvasRef = useRef(null);
    const renderTaskRef = useRef(null);

    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        let active = true;

        (async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);
                if (!active || !canvasRef.current) return;

                let currentScale = scale;
                if (fitMode !== 'custom' && containerWidth && containerHeight) {
                    const unscaledVP = page.getViewport({ scale: 1 });
                    const availableWidth = fitMode === 'width' ? containerWidth : containerWidth - 80;
                    const availableHeight = containerHeight - 80 - 120;

                    const scaleForWidth = availableWidth / unscaledVP.width;
                    const scaleForHeight = availableHeight / unscaledVP.height;

                    if (fitMode === 'width') currentScale = scaleForWidth;
                    else if (fitMode === 'page') currentScale = Math.min(scaleForWidth, scaleForHeight);
                }

                const viewport = page.getViewport({ scale: currentScale });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;

                // Only fade out if the dimensions actually changed drastically
                if (Math.abs(canvas.width - Math.floor(viewport.width * dpr)) > 5) {
                    setIsRendered(false);
                }

                canvas.width = Math.floor(viewport.width * dpr);
                canvas.height = Math.floor(viewport.height * dpr);
                canvas.style.width = Math.floor(viewport.width) + 'px';
                canvas.style.height = Math.floor(viewport.height) + 'px';

                const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

                if (renderTaskRef.current) {
                    try { await renderTaskRef.current.cancel(); } catch (e) { }
                }

                renderTaskRef.current = page.render({ canvasContext: ctx, viewport, transform });
                await renderTaskRef.current.promise;
                renderTaskRef.current = null;

                if (active) setIsRendered(true);
            } catch (e) {
                if (e.name !== 'RenderingCancelledException') console.error(e);
            }
        })();

        return () => {
            active = false;
            if (renderTaskRef.current) {
                try { renderTaskRef.current.cancel(); } catch (e) { }
            }
        };
    }, [pdfDoc, pageNumber, scale, containerWidth, containerHeight, fitMode]);

    return (
        <div className="scroll-page" data-page={pageNumber}>
            <canvas
                ref={canvasRef}
                className={isDarkMode ? 'pdf-dark-mode-canvas' : 'pdf-light-mode-canvas'}
                style={{ opacity: isRendered ? 1 : 0 }}
            />
            <div className="scroll-page-number">{pageNumber}</div>
        </div>
    );
};

// ── Main PdfViewer ──
const PdfViewer = ({ file, onClose }) => {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [pageRendering, setPageRendering] = useState(false);
    const [pageNumPending, setPageNumPending] = useState(null);
    const [scale, setScale] = useState(1.5);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [numPages, setNumPages] = useState(0);
    const [pageInputValue, setPageInputValue] = useState('1');

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fitMode, setFitMode] = useState('page');
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);
    const [focusModeUserOverride, setFocusModeUserOverride] = useState(false);
    const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    // New states
    const [viewMode, setViewMode] = useState('slide'); // 'slide' or 'scroll'
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const resizeTimeoutRef = useRef(null);

    const isProgrammaticScrollRef = useRef(false);
    const stablePageNumRef = useRef(pageNum);

    useEffect(() => {
        stablePageNumRef.current = pageNum;
    }, [pageNum]);

    // Track container resize (handles window resize AND sidebar toggle)
    useEffect(() => {
        const container = viewMode === 'slide' ? containerRef.current : scrollContainerRef.current;
        if (!container) return;

        resizeObserverRef.current = new ResizeObserver((entries) => {
            // Debounce the resize to prevent jitter during the CSS transition
            clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = setTimeout(() => {
                for (let entry of entries) {
                    if (entry.contentRect) {
                        setWindowSize({ w: entry.contentRect.width, h: entry.contentRect.height });
                    }
                }
            }, 150); // wait for 0.3s CSS transition to mostly finish
        });

        resizeObserverRef.current.observe(container);

        return () => {
            if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
            clearTimeout(resizeTimeoutRef.current);
        };
    }, [viewMode, sidebarOpen]); // re-bind if viewMode changes


    // Fullscreen behavior and auto-hiding toolbar
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            setIsFullscreen(isFs);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        let timeout;
        const handleMouseMove = () => {
            if (focusModeUserOverride) return;
            setIsToolbarVisible(true);
            clearTimeout(timeout);
            if (isFullscreen) {
                timeout = setTimeout(() => setIsToolbarVisible(false), 2500);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, [isFullscreen, focusModeUserOverride]);

    // Load the PDF document
    useEffect(() => {
        let active = true;
        const loadPdf = async () => {
            try {
                const fileReader = new FileReader();
                fileReader.onload = async function () {
                    if (!active) return;
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    if (!active) return;
                    setPdfDoc(pdf);
                    setNumPages(pdf.numPages);
                    setPageNum(1);
                    setPageInputValue('1');
                };
                fileReader.readAsArrayBuffer(file);
            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        };
        loadPdf();
        return () => {
            active = false;
            if (renderTaskRef.current) renderTaskRef.current.cancel();
            if (pdfDoc) pdfDoc.destroy();
        };
    }, [file]);

    // Render current page in SLIDE mode
    useEffect(() => {
        if (viewMode !== 'slide') return;
        if (!pdfDoc || !canvasRef.current) return;

        let active = true;
        const renderPage = async (num) => {
            setPageRendering(true);
            try {
                const page = await pdfDoc.getPage(num);
                if (!active) return;

                let currentScale = scale;
                if (fitMode !== 'custom' && containerRef.current) {
                    const unscaledViewport = page.getViewport({ scale: 1 });
                    const container = containerRef.current;
                    const availableWidth = fitMode === 'width' ? container.clientWidth : container.clientWidth - 80;
                    const availableHeight = container.clientHeight - 80 - 120;

                    const scaleForWidth = availableWidth / unscaledViewport.width;
                    const scaleForHeight = availableHeight / unscaledViewport.height;

                    if (fitMode === 'width') currentScale = scaleForWidth;
                    else if (fitMode === 'page') currentScale = Math.min(scaleForWidth, scaleForHeight);
                }

                const viewport = page.getViewport({ scale: currentScale });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;

                // Temporarily hide canvas during heavy resize to avoid flash of unscaled content
                if (Math.abs(canvas.width - Math.floor(viewport.width * dpr)) > 5) {
                    canvas.style.opacity = '0';
                }

                canvas.width = Math.floor(viewport.width * dpr);
                canvas.height = Math.floor(viewport.height * dpr);
                canvas.style.width = Math.floor(viewport.width) + 'px';
                canvas.style.height = Math.floor(viewport.height) + 'px';

                const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

                if (renderTaskRef.current) {
                    try { await renderTaskRef.current.cancel(); } catch (e) { }
                }

                renderTaskRef.current = page.render({ canvasContext: ctx, transform, viewport });
                await renderTaskRef.current.promise;

                if (!active) return;
                canvas.style.opacity = '1';
                setPageRendering(false);
                renderTaskRef.current = null;

                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    setPageNumPending(null);
                }
            } catch (error) {
                if (error.name !== 'RenderingCancelledException') console.error('Error rendering page:', error);
                if (active) setPageRendering(false);
            }
        };

        renderPage(pageNum);
        return () => { active = false; };
    }, [pdfDoc, pageNum, scale, fitMode, windowSize.w, windowSize.h, viewMode]);

    // Track scroll position in scroll mode to update current page indicator
    useEffect(() => {
        if (viewMode !== "scroll" || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (isProgrammaticScrollRef.current) return;

                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNumber = parseInt(entry.target.dataset.page, 10);
                        setPageNum(pageNumber);
                        setPageInputValue(pageNumber.toString());
                    }
                });
            },
            {
                root: container,
                rootMargin: "-50% 0px -50% 0px", // Trigger when page crosses center line
                threshold: 0
            }
        );

        const pages = container.querySelectorAll(".scroll-page");
        pages.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [viewMode, numPages]);

    // Fix layout jumps: Sync scroll position when switching views or resizing zoom/fit in scroll mode
    useEffect(() => {
        if (viewMode === "scroll" && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            isProgrammaticScrollRef.current = true;

            const enforceScroll = () => {
                const pageEl = container.querySelector(`[data-page="${stablePageNumRef.current}"]`);
                if (pageEl) pageEl.scrollIntoView({ block: 'center' }); // center the current page to maintain position
            };

            // Run iteratively as canvases async render from PDF.js to physically prevent layout jumps
            enforceScroll();
            const t1 = setTimeout(enforceScroll, 50);
            const t2 = setTimeout(enforceScroll, 200);
            const t3 = setTimeout(enforceScroll, 500);
            const t4 = setTimeout(() => {
                enforceScroll();
                isProgrammaticScrollRef.current = false;
            }, 800);

            return () => {
                clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
                isProgrammaticScrollRef.current = false;
            };
        }
    }, [viewMode, fitMode, scale]);

    // Sync sidebar thumbnail scrolling
    useEffect(() => {
        if (sidebarOpen) {
            // Delay slightly to let the active class apply
            setTimeout(() => {
                const activeThumb = document.querySelector('.thumb-active');
                if (activeThumb) {
                    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    }, [pageNum, sidebarOpen]);

    const queueRenderPage = (num) => {
        if (viewMode === 'scroll') {
            isProgrammaticScrollRef.current = true;

            // In scroll mode, scroll to the page element
            setPageNum(num);
            setPageInputValue(num.toString());
            const container = scrollContainerRef.current;
            if (container) {
                const pageEl = container.querySelector(`[data-page="${num}"]`);
                if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            setTimeout(() => isProgrammaticScrollRef.current = false, 800);
            return;
        }
        if (pageRendering) {
            setPageNumPending(num);
        } else {
            setPageNum(num);
        }
        setPageInputValue(num.toString());
    };

    const onPrevPage = () => { if (pageNum <= 1) return; queueRenderPage(pageNum - 1); };
    const onNextPage = () => { if (pageNum >= numPages) return; queueRenderPage(pageNum + 1); };

    const zoomIn = () => { setFitMode('custom'); setScale(s => Math.min(s + 0.25, 3.0)); };
    const zoomOut = () => { setFitMode('custom'); setScale(s => Math.max(s - 0.25, 0.5)); };
    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const toggleFullscreen = async () => {
        const elem = document.documentElement;
        try {
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen API rejected, falling back to emulated fullscreen:", err);
            setIsFullscreen(prev => !prev);
        }
    };

    const toggleFocusMode = () => {
        setFocusModeUserOverride(prev => {
            const next = !prev;
            setIsToolbarVisible(!next);
            return next;
        });
    };

    const cycleFitMode = () => {
        if (fitMode === 'page') setFitMode('width');
        else if (fitMode === 'width') setFitMode('custom');
        else setFitMode('page');
    };

    const handlePageInputChange = (e) => setPageInputValue(e.target.value);

    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            let newPage = parseInt(pageInputValue, 10);
            if (isNaN(newPage) || newPage < 1) newPage = 1;
            else if (newPage > numPages) newPage = numPages;
            queueRenderPage(newPage);
        }
    };

    const handlePageInputBlur = () => setPageInputValue(pageNum.toString());

    const toggleViewMode = () => setViewMode(v => v === 'slide' ? 'scroll' : 'slide');

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            if (e.key === 'ArrowRight' || e.key === 'Space') onNextPage();
            else if (e.key === 'ArrowLeft') onPrevPage();
            else if (e.key === 'Escape' && focusModeUserOverride) toggleFocusMode();
            else if (e.key.toLowerCase() === 'f') toggleFocusMode();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageNum, numPages, pageRendering, focusModeUserOverride]);

    const containerWidth = containerRef.current?.clientWidth || scrollContainerRef.current?.clientWidth || windowSize.w;
    const containerHeight = containerRef.current?.clientHeight || scrollContainerRef.current?.clientHeight || windowSize.h;

    return (
        <div ref={wrapperRef} className={`pdf-viewer-container animate-fade-in ${isFullscreen ? 'emulated-fullscreen' : ''}`}>

            {/* Focus Mode exit */}
            {focusModeUserOverride && (
                <button className="btn btn-icon btn-primary focus-exit-btn"
                    onClick={toggleFocusMode} title="Exit Focus Mode"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.3}
                >
                    <Eye size={20} />
                </button>
            )}

            {/* ── Sidebar ── */}
            <div className={`pdf-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="sidebar-title">Pages</span>
                    <button className="btn btn-icon" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
                        <X size={16} />
                    </button>
                </div>
                <div className="sidebar-thumbs">
                    {pdfDoc && Array.from({ length: numPages }, (_, i) => (
                        <Thumbnail
                            key={i + 1}
                            pdfDoc={pdfDoc}
                            pageNumber={i + 1}
                            isActive={pageNum === i + 1}
                            isDarkMode={isDarkMode}
                            onClick={(p) => { queueRenderPage(p); }}
                        />
                    ))}
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div
                className={`pdf-toolbar glass-panel`}
                style={{ opacity: isToolbarVisible ? 1 : 0, pointerEvents: isToolbarVisible ? 'auto' : 'none', transition: 'opacity 0.5s ease' }}
            >
                <button className="btn btn-icon" onClick={onClose} title="Close PDF"><X size={20} /></button>

                <div className="toolbar-divider"></div>

                {/* Sidebar toggle */}
                <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Page Sidebar">
                    <PanelLeft size={20} />
                </button>

                <div className="toolbar-divider"></div>

                {/* Page navigation */}
                <div className="page-controls">
                    <button className="btn btn-icon" onClick={onPrevPage} disabled={pageNum <= 1} title="Previous Page">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="page-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="text" value={pageInputValue} onChange={handlePageInputChange}
                            onKeyDown={handlePageInputKeyDown} onBlur={handlePageInputBlur} className="page-input" />
                        <span>/ {numPages || '-'}</span>
                    </span>
                    <button className="btn btn-icon" onClick={onNextPage} disabled={pageNum >= numPages} title="Next Page">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="toolbar-divider"></div>

                {/* Zoom */}
                <div className="zoom-controls">
                    <button className="btn btn-icon" onClick={zoomOut} disabled={scale <= 0.5}><ZoomOut size={20} /></button>
                    <span className="zoom-info">{Math.round(scale * 100)}%</span>
                    <button className="btn btn-icon" onClick={zoomIn} disabled={scale >= 3.0}><ZoomIn size={20} /></button>
                </div>

                <div className="toolbar-divider"></div>

                {/* View mode + fit + focus + fullscreen */}
                <div className="fit-controls" style={{ display: 'flex', gap: '8px' }}>
                    <button className={`btn btn-icon ${viewMode === 'scroll' ? 'btn-active' : ''}`} onClick={toggleViewMode} title={viewMode === 'slide' ? 'Switch to Scroll View' : 'Switch to Slide View'}>
                        {viewMode === 'slide' ? <Scroll size={20} /> : <BookOpen size={20} />}
                    </button>
                    <button className="btn btn-icon" onClick={cycleFitMode} title={`Fit Mode: ${fitMode}`}>
                        <Maximize2 size={20} />
                    </button>
                    <button className="btn btn-icon" onClick={toggleFocusMode} title="Focus Mode (Hide UI)">
                        <EyeOff size={20} />
                    </button>
                    <button className="btn btn-icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>

                <div className="toolbar-divider"></div>

                {/* Dark mode toggle */}
                <button className={`btn ${isDarkMode ? 'btn-primary' : ''}`} onClick={toggleDarkMode}
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                    <span className="mode-text">{isDarkMode ? 'Dark' : 'Light'}</span>
                </button>
            </div>

            {/* ── Content Area ── */}
            {viewMode === 'slide' ? (
                <div key="slide" className={`pdf-canvas-container animate-crossfade ${fitMode === 'width' ? 'fit-width' : ''}`} ref={containerRef}>
                    {!pdfDoc && <div className="loading-indicator pulse">Loading Document...</div>}
                    <canvas ref={canvasRef} className={isDarkMode ? 'pdf-dark-mode-canvas' : 'pdf-light-mode-canvas'} />
                </div>
            ) : (
                <div key="scroll" className={`pdf-canvas-container scroll-view animate-crossfade ${fitMode === 'width' ? 'fit-width' : ''}`} ref={scrollContainerRef}>
                    {!pdfDoc && <div className="loading-indicator pulse">Loading Document...</div>}
                    {pdfDoc && Array.from({ length: numPages }, (_, i) => (
                        <ScrollPageCanvas
                            key={i + 1}
                            pdfDoc={pdfDoc}
                            pageNumber={i + 1}
                            scale={scale}
                            isDarkMode={isDarkMode}
                            containerWidth={containerWidth}
                            containerHeight={containerHeight}
                            fitMode={fitMode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
