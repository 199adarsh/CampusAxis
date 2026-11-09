import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    ZoomInAreaIcon, 
    ZoomOutAreaIcon, 
    ViewIcon
} from 'hugeicons-react';

export default function DocxViewer({ blob, className = '', title, onDownload, onFullScreen }) {
    const wrapperRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const contentRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [numPages, setNumPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [docWidth, setDocWidth] = useState(816);

    // Measure container width and track resize
    useEffect(() => {
        const node = wrapperRef.current;
        if (!node) return;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                setScale(s => Math.min(2.5, Math.max(0.35, parseFloat((s + delta).toFixed(2)))));
            }
        };
        node.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            node.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Render DOCX into DOM, prune ghost/empty sections, and format pages
    useEffect(() => {
        let active = true;

        if (!blob || !contentRef.current) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        contentRef.current.innerHTML = '';

        (async () => {
            try {
                const target = contentRef.current;
                if (!target) return;

                await renderAsync(blob, target, null, {
                    inWrapper: false,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    experimental: true,
                    trimXmlDeclaration: true
                });

                if (active) {
                    setLoading(false);

                    // Prune trailing empty ghost pages created by breakPages
                    const rawSections = Array.from(target.querySelectorAll('section.docx, .docx-wrapper > section'));
                    const validSections = [];

                    rawSections.forEach((sec) => {
                        const text = (sec.innerText || sec.textContent || '').trim();
                        const hasContent = text.length > 0 || sec.querySelector('table, img, svg, canvas, [class*="drawing"]');
                        if (!hasContent) {
                            sec.remove();
                        } else {
                            validSections.push(sec);
                        }
                    });

                    let maxWidth = 816;
                    if (validSections.length > 0) {
                        setNumPages(validSections.length);
                        validSections.forEach((sec, idx) => {
                            if (sec.offsetWidth > maxWidth) maxWidth = sec.offsetWidth;
                            sec.setAttribute('data-page-index', idx + 1);
                            sec.style.background = '#FFFFFF';
                            sec.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)';
                            sec.style.borderRadius = '4px';
                            sec.style.margin = '16px auto';
                            sec.style.boxSizing = 'border-box';
                            sec.style.display = 'block';
                        });
                    } else if (target.firstElementChild) {
                        maxWidth = target.firstElementChild.offsetWidth || 816;
                        target.firstElementChild.style.background = '#FFFFFF';
                        target.firstElementChild.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)';
                        target.firstElementChild.style.margin = '16px auto';
                        target.firstElementChild.style.borderRadius = '4px';
                    }

                    setDocWidth(maxWidth);

                    // Auto-fit to mobile container width on initial load
                    const currentContainerWidth = wrapperRef.current?.getBoundingClientRect().width || window.innerWidth;
                    if (currentContainerWidth < maxWidth + 32) {
                        const fit = Math.max(0.35, Math.min(1.0, (currentContainerWidth - 24) / maxWidth));
                        setScale(parseFloat(fit.toFixed(2)));
                    } else {
                        setScale(1.0);
                    }
                }
            } catch (err) {
                if (active) {
                    console.error('DocxViewer render error:', err);
                    setError(err?.message || 'Failed to render document preview');
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [blob]);

    // Track active page via scroll position
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || loading) return;

        const sections = contentRef.current?.querySelectorAll('section.docx');
        if (!sections || sections.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const pIdx = Number(entry.target.getAttribute('data-page-index'));
                    if (pIdx && !isNaN(pIdx)) {
                        setCurrentPage(pIdx);
                    }
                }
            }
        }, {
            root: container,
            rootMargin: '-10% 0px -70% 0px',
            threshold: 0
        });

        sections.forEach(sec => observer.observe(sec));
        return () => observer.disconnect();
    }, [loading, numPages]);

    const handleFitWidth = useCallback(() => {
        if (!docWidth) return;
        const currentContainerWidth = wrapperRef.current?.getBoundingClientRect().width || window.innerWidth;
        const fit = Math.max(0.35, Math.min(2.0, (currentContainerWidth - 32) / docWidth));
        setScale(parseFloat(fit.toFixed(2)));
    }, [docWidth]);

    const scrollToPage = useCallback((pNum) => {
        const sections = contentRef.current?.querySelectorAll('section.docx');
        if (sections && sections[pNum - 1]) {
            sections[pNum - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentPage(pNum);
        }
    }, []);

    return (
        <div ref={wrapperRef} className={`w-full h-full flex flex-col bg-[#F5F5F7] dark:bg-black overflow-hidden relative select-text ${className}`}>
            {/* Floating Navigation & Zoom Toolbar (No duplicate top bar) */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-xl select-none text-xs">
                {/* Left: Page Navigator */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                        title="Previous page"
                    >
                        <ArrowLeft01Icon size={14} />
                    </button>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1 min-w-[50px] text-center text-[11px]">
                        {numPages ? `${currentPage} / ${numPages}` : '...'}
                    </span>
                    <button
                        type="button"
                        disabled={currentPage >= numPages}
                        onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                        title="Next page"
                    >
                        <ArrowRight01Icon size={14} />
                    </button>
                </div>

                <div className="h-3.5 w-px bg-[#E5E5EA] dark:bg-[#2C2C2E]" />

                {/* Right: Zoom Controls */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setScale(s => Math.max(0.35, parseFloat((s - 0.15).toFixed(2))))}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[#1D1D1F] dark:text-white transition-colors"
                        title="Zoom out"
                    >
                        <ZoomOutAreaIcon size={14} />
                    </button>
                    <span className="font-mono text-[10px] text-[#6E6E73] dark:text-[#AEAEB2] min-w-[34px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => setScale(s => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))))}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[#1D1D1F] dark:text-white transition-colors"
                        title="Zoom in"
                    >
                        <ZoomInAreaIcon size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={onFullScreen || handleFitWidth}
                        className="ml-1 p-1 px-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1 font-semibold text-[10px] cursor-pointer shadow-xs transition-colors"
                        title={onFullScreen ? "Open Full Screen View" : "Fit Document to Width"}
                    >
                        <ViewIcon size={12} />
                        <span className="hidden xs:inline">{onFullScreen ? "Full" : "Fit"}</span>
                    </button>
                </div>
            </div>

            {/* Seamless Document Canvas */}
            <div
                ref={scrollContainerRef}
                className="flex-1 w-full overflow-y-auto overflow-x-auto flex justify-center p-2 sm:p-6 min-h-0 scroll-smooth bg-[#F5F5F7] dark:bg-black"
            >
                {loading && (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-[#6E6E73] dark:text-[#AEAEB2]">
                        <div className="w-5 h-5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin mb-3" />
                        <span>Rendering document pages...</span>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-amber-600 dark:text-amber-400">
                        <p className="mb-3">{error}</p>
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="px-3 py-1.5 bg-[#0071E3] text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                                Download original
                            </button>
                        )}
                    </div>
                )}

                {/* Scaled Sheets Flow */}
                <div
                    className="flex flex-col items-center transition-transform duration-100 ease-out origin-top"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        display: loading || error ? 'none' : 'flex'
                    }}
                >
                    <div
                        ref={contentRef}
                        className="docx-render-wrapper flex flex-col items-center select-text pb-8"
                    />
                </div>
            </div>
        </div>
    );
}
