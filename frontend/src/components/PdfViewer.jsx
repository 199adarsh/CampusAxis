import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    ZoomInAreaIcon, 
    ZoomOutAreaIcon, 
    Download01Icon,
    ViewIcon,
    RefreshIcon,
    File01Icon
} from 'hugeicons-react';

// Use reliable CORS-friendly CDN worker compatible with all mobile browsers
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
}

const PDF_OPTIONS = {
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.296'}/standard_fonts/`,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.296'}/cmaps/`,
    cMapPacked: true,
};

export default function PdfViewer({ url, data, presignedUrl, title, onDownload, onFullScreen, extractedText }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [visiblePages, setVisiblePages] = useState(() => new Set([1]));
    const [aspectRatio, setAspectRatio] = useState(1.414);
    const [scale, setScale] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            return Math.min(window.innerWidth - 32, 850);
        }
        return 360;
    });
    const [loadError, setLoadError] = useState(null);
    const containerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const pageRefs = useRef({});

    const onPageLoadSuccess = useCallback((page) => {
        if (page?.originalWidth && page?.originalHeight) {
            setAspectRatio(page.originalHeight / page.originalWidth);
        } else if (page?.width && page?.height) {
            setAspectRatio(page.height / page.width);
        }
    }, []);

    const scrollToPage = useCallback((target) => {
        const el = pageRefs.current[target];
        if (el) {
            setVisiblePages((prev) => {
                const next = new Set(prev);
                next.add(target);
                return next;
            });
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setPageNumber(target);
        }
    }, []);

    const onDocumentLoadSuccess = useCallback(({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setVisiblePages(new Set([1]));
        setLoadError(null);
    }, []);

    const onDocumentLoadError = useCallback((err) => {
        console.warn('PDF canvas render issue on device:', err);
        setLoadError(err?.message || 'Failed to render PDF canvas');
    }, []);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        // Measure immediately
        const rect = node.getBoundingClientRect();
        if (rect.width > 50) {
            setContainerWidth(rect.width);
        }

        // Dynamically track mobile orientation and layout shifts
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 50) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        ro.observe(node);

        const handleResize = () => {
            if (node) {
                const w = node.getBoundingClientRect().width;
                if (w > 50) setContainerWidth(w);
            }
        };
        window.addEventListener('resize', handleResize);

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                setScale(s => Math.min(2.5, Math.max(0.4, parseFloat((s + delta).toFixed(2)))));
            }
        };
        node.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', handleResize);
            node.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Target URL for direct opening in mobile native browser
    const directUrl = presignedUrl || (typeof url === 'string' ? url : null);

    const handleOpenNative = () => {
        if (onFullScreen) {
            onFullScreen();
            return;
        }
        if (directUrl) {
            window.open(directUrl, '_blank', 'noopener');
        } else if (onDownload) {
            onDownload();
        }
    };

    // Memoize fileSource with stable ref to avoid react-pdf reload warning
    const fileRef = useRef(null);
    const fileSource = useMemo(() => {
        if (data && data.byteLength > 0) {
            if (fileRef.current?.data && fileRef.current.data.byteLength === data.byteLength) {
                const prev = fileRef.current.data;
                if (prev === data || (prev[0] === data[0] && prev[prev.length - 1] === data[data.length - 1])) {
                    return fileRef.current;
                }
            }
            const next = { data };
            fileRef.current = next;
            return next;
        }
        fileRef.current = null;
        return url;
    }, [data, url]);

    const calculatedWidth = useMemo(() => {
        const base = containerWidth ? Math.max(260, containerWidth - 32) : 340;
        return Math.round(base * scale);
    }, [containerWidth, scale]);

    const placeholderHeight = useMemo(() => {
        return Math.round(calculatedWidth * (aspectRatio || 1.414));
    }, [calculatedWidth, aspectRatio]);

    // Active pages to mount (+- 1 buffer page around visible pages)
    const mountedPages = useMemo(() => {
        const mounted = new Set();
        const active = visiblePages.size > 0 ? visiblePages : new Set([pageNumber || 1]);
        active.forEach((p) => {
            if (p > 1) mounted.add(p - 1);
            mounted.add(p);
            if (numPages && p < numPages) mounted.add(p + 1);
        });
        return mounted;
    }, [visiblePages, numPages, pageNumber]);

    // Track current visible page and virtualize active canvas mounts
    useEffect(() => {
        if (!numPages || numPages <= 1) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const navObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const page = Number(entry.target.getAttribute('data-page-number'));
                        if (page && !isNaN(page)) {
                            setPageNumber(page);
                        }
                    }
                }
            },
            {
                root: container,
                rootMargin: '-10% 0px -70% 0px',
                threshold: 0,
            }
        );

        const virtObserver = new IntersectionObserver(
            (entries) => {
                setVisiblePages((prev) => {
                    let changed = false;
                    const next = new Set(prev);
                    for (const entry of entries) {
                        const page = Number(entry.target.getAttribute('data-page-number'));
                        if (page && !isNaN(page)) {
                            if (entry.isIntersecting) {
                                if (!next.has(page)) {
                                    next.add(page);
                                    changed = true;
                                }
                            } else {
                                if (next.has(page)) {
                                    next.delete(page);
                                    changed = true;
                                }
                            }
                        }
                    }
                    return changed ? next : prev;
                });
            },
            {
                root: container,
                threshold: 0,
            }
        );

        Object.values(pageRefs.current).forEach((el) => {
            if (el) {
                navObserver.observe(el);
                virtObserver.observe(el);
            }
        });

        return () => {
            navObserver.disconnect();
            virtObserver.disconnect();
        };
    }, [numPages]);

    const pageNav = (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-xl select-none text-xs">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={pageNumber <= 1}
                    onClick={() => scrollToPage(Math.max(1, pageNumber - 1))}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                    title="Previous page"
                >
                    <ArrowLeft01Icon size={14} />
                </button>
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1 min-w-[50px] text-center text-[11px]">
                    {numPages ? `${pageNumber} / ${numPages}` : '...'}
                </span>
                <button
                    type="button"
                    disabled={!numPages || pageNumber >= numPages}
                    onClick={() => scrollToPage(Math.min(numPages, pageNumber + 1))}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                    title="Next page"
                >
                    <ArrowRight01Icon size={14} />
                </button>
            </div>

            <div className="h-3.5 w-px bg-[#E5E5EA] dark:bg-[#2C2C2E]" />

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
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
                    onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[#1D1D1F] dark:text-white transition-colors"
                    title="Zoom in"
                >
                    <ZoomInAreaIcon size={14} />
                </button>
            </div>

            {directUrl && (
                <>
                    <div className="h-3.5 w-px bg-[#E5E5EA] dark:bg-[#2C2C2E]" />
                    <button
                        type="button"
                        onClick={handleOpenNative}
                        className="p-1 px-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1 font-semibold text-[10px] cursor-pointer transition-colors shadow-xs"
                        title="Open in native mobile PDF viewer"
                    >
                        <ViewIcon size={12} />
                        <span className="hidden xs:inline">Full</span>
                    </button>
                </>
            )}
        </div>
    );

    if (loadError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-start p-6 bg-[#F5F5F7] dark:bg-black overflow-y-auto">
                <div className="w-full max-w-3xl flex flex-col items-center text-center my-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] flex items-center justify-center mb-3">
                        <File01Icon size={24} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white mb-1">
                        {title || "PDF Document"}
                    </h3>
                    <p className="text-xs text-[#8E8E93] max-w-md mb-4">
                        {extractedText 
                            ? "Unable to display PDF preview. You can read the extracted document text below, retry loading, or download the original file."
                            : "Unable to display PDF preview. Please check your network connection, retry loading, or download the file to view it locally."}
                    </p>

                    {loadError && (
                        <div className="text-[11px] font-mono text-[#E54D2E] dark:text-[#FF6247] bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mb-4 max-w-md break-all">
                            {typeof loadError === 'string' ? loadError : (loadError?.message || String(loadError))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
                        {directUrl && (
                            <button
                                type="button"
                                onClick={handleOpenNative}
                                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                            >
                                <ViewIcon size={14} />
                                <span>Open Direct Link</span>
                            </button>
                        )}
                        {onDownload && (
                            <button
                                type="button"
                                onClick={onDownload}
                                className="px-4 py-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <Download01Icon size={14} />
                                <span>Download PDF</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setLoadError(null);
                                setPageNumber(1);
                            }}
                            className="px-3 py-2 text-xs text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshIcon size={13} />
                            <span>Retry</span>
                        </button>
                    </div>

                    {extractedText && (
                        <div className="w-full text-left bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-6 sm:p-8 shadow-xs">
                            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                                <span>Showing extracted document text.</span>
                            </div>
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {extractedText}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div id="pdf-canvas-container" ref={containerRef} className="w-full h-full min-h-[400px] flex flex-col bg-[#F5F5F7] dark:bg-black overflow-hidden relative">
            {pageNav}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-auto flex justify-center p-2 sm:p-6 min-h-0 scroll-smooth"
            >
                <Document
                    file={fileSource}
                    options={PDF_OPTIONS}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-[#6E6E73] dark:text-[#AEAEB2]">
                            <div className="w-5 h-5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin mb-3" />
                            <span>Rendering PDF pages...</span>
                        </div>
                    }
                    className="flex flex-col items-center gap-4 max-w-full pb-8"
                >
                    {numPages ? (
                        Array.from(new Array(numPages), (_, index) => {
                            const pNum = index + 1;
                            const isMounted = mountedPages.has(pNum);
                            return (
                                <div
                                    key={`page_${pNum}`}
                                    ref={(el) => (pageRefs.current[pNum] = el)}
                                    data-page-number={pNum}
                                    className="flex flex-col items-center"
                                    style={{ minHeight: isMounted ? 'auto' : `${placeholderHeight}px`, width: `${calculatedWidth}px` }}
                                >
                                    {isMounted ? (
                                        <Page
                                            pageNumber={pNum}
                                            width={calculatedWidth}
                                            onLoadSuccess={onPageLoadSuccess}
                                            className="shadow-sm rounded-lg overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white"
                                            renderAnnotationLayer={false}
                                            renderTextLayer={false}
                                        />
                                    ) : (
                                        <div
                                            style={{ height: `${placeholderHeight}px`, width: `${calculatedWidth}px` }}
                                            className="shadow-sm rounded-lg overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] flex flex-col items-center justify-center text-[#8E8E93]"
                                        >
                                            <div className="text-xs font-medium">Page {pNum}</div>
                                        </div>
                                    )}
                                    {numPages > 1 && (
                                        <div className="text-[10px] text-[#8E8E93] font-mono mt-1 mb-2">
                                            Page {pNum} of {numPages}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <Page
                            pageNumber={1}
                            width={calculatedWidth}
                            onLoadSuccess={onPageLoadSuccess}
                            className="shadow-sm rounded-lg overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white"
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                        />
                    )}
                </Document>
            </div>
        </div>
    );
}
