class PDFEditor {
    constructor() {
        this.currentPdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        this.canvas = null;
        this.ctx = null;
        this.pdfDoc = null; // PDF-lib document
        this.isTextMode = false;
        this.isImageMode = false;
        this.isHighlightMode = false;
        this.textToAdd = '';
        this.clickPosition = null;
        this.bookmarks = [];
        this.mergePdfs = [];
        this.continuousView = false;
        this.continuousCanvases = [];
        this.highlights = [];
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.hotReload = this.detectHotReload();
        this.isFileSelecting = false; // 防抖标志，防止多重文件对话框
        
        // 阅读模式状态
        this.isReadingMode = false;
        this.readingScale = 1.2;
        
        // 涂改工具状态
        this.currentDrawingTool = null;
        this.isDrawing = false;
        this.drawingPageNum = null;
        this.lastDrawingPoint = null;
        
        // 阅读位置记录
        this.currentReadingPosition = 0; // 当前滚动位置
        this.readingPositionHistory = new Map(); // 文件名 -> 滚动位置的映射
        this.currentFileName = null; // 当前打开的文件名
        
        // 标记和历史记录管理
        this.annotationHistory = new Map(); // 文件名 -> 标记数据的映射
        this.currentFileHash = null; // 当前文件的哈希值用于标识
        this.drawingLayers = new Map(); // 页面号 -> 涂改层数据的映射
        this.savedAnnotations = []; // 当前文件的保存标记
        this.lastAnnotationTime = null; // 上次添加标记的时间
        
        this.init();
        this.setupHotReload();
        this.setupElectronIntegration();
        this.initAnnotationSystem(); // 初始化标记系统
    }

    // 检测热重载环境
    detectHotReload() {
        // 检查是否在Vite开发环境
        if (typeof window !== 'undefined' && window.location && window.location.port === '5173') {
            return { accept: () => {} }; // 简化的热重载对象
        }
        // 检查其他热重载环境标识
        if (typeof window !== 'undefined' && (window.__vite__ || (window.module && window.module.hot))) {
            return (window.module && window.module.hot) || window.__vite__;
        }
        return null;
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.showToast('PDF编辑器已就绪 - 热重载功能正常工作! 🔥', 'success');
        
        // 验证关键元素是否正确加载
        this.validateElements();
    }

    validateElements() {
        const criticalElements = [
            'uploadArea', 
            'fileInput', 
            'canvas', 
            'controlPanel'
        ];
        
        const missingElements = [];
        
        criticalElements.forEach(elementName => {
            if (!this.elements[elementName]) {
                missingElements.push(elementName);
                console.error(`❌ 关键元素未找到: ${elementName}`);
            } else {
                console.log(`✅ 元素已找到: ${elementName}`);
            }
        });
        
        if (missingElements.length > 0) {
            console.error('缺少关键元素，尝试重新获取...');
            setTimeout(() => {
                this.setupElements();
                this.setupEventListeners();
                this.showToast('重新初始化完成', 'info');
            }, 1000);
        } else {
            console.log('✅ 所有关键元素已正确加载');
        }
    }

    setupElements() {
        console.log('🔧 开始设置DOM元素...');
        
        // 获取DOM元素
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            controlPanel: document.getElementById('controlPanel'),
            viewerSection: document.getElementById('viewerSection'),
            textSection: document.getElementById('textSection'),
            canvas: document.getElementById('pdfCanvas'),
            pageInfo: document.getElementById('pageInfo'),
            extractedText: document.getElementById('extractedText'),
            textInput: document.getElementById('textInput'),
            fontSize: document.getElementById('fontSize'),
            textColor: document.getElementById('textColor'),
            imageInput: document.getElementById('imageInput'),
            imageUrl: document.getElementById('imageUrl'),
            mergePdfInput: document.getElementById('mergePdfInput'),
            bookmarkTitle: document.getElementById('bookmarkTitle'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            toast: document.getElementById('toast'),
            splitModal: document.getElementById('splitModal'),
            // 新的连续查看元素
            continuousViewDiv: document.getElementById('continuousView'),
            singlePageView: document.getElementById('singlePageView'),
            continuousContainer: document.getElementById('continuousContainer'),
            continuousViewCheckbox: document.getElementById('continuousViewToggle'),
            // 新的文本标记元素
            highlightColor: document.getElementById('highlightColor'),
            highlightType: document.getElementById('highlightType'),
            highlightOpacity: document.getElementById('highlightOpacity'),
            // 阅读模式元素
            readingMode: document.getElementById('readingMode'),
            readingContainer: document.getElementById('readingContainer'),
            pdfScrollView: document.getElementById('pdfScrollView'),
            readingPageInfo: document.getElementById('readingPageInfo'),
            backToEditor: document.getElementById('backToEditor'),
            downloadPdfReading: document.getElementById('downloadPdfReading'),
            zoomInReading: document.getElementById('zoomInReading'),
            zoomOutReading: document.getElementById('zoomOutReading'),
            resetReadingPosition: document.getElementById('resetReadingPosition'),
            convertToWordReading: document.getElementById('convertToWordReading'),
            // 涂改工具元素
            drawingPen: document.getElementById('drawingPen'),
            drawingEraser: document.getElementById('drawingEraser'),
            drawingRect: document.getElementById('drawingRect'),
            drawingColor: document.getElementById('drawingColor'),
            drawingSize: document.getElementById('drawingSize')
        };

        // 详细调试每个关键元素
        console.log('📊 元素检查结果:');
        console.log('  uploadArea:', this.elements.uploadArea ? '✅ 找到' : '❌ 未找到');
        console.log('  fileInput:', this.elements.fileInput ? '✅ 找到' : '❌ 未找到');
        console.log('  canvas:', this.elements.canvas ? '✅ 找到' : '❌ 未找到');
        console.log('  controlPanel:', this.elements.controlPanel ? '✅ 找到' : '❌ 未找到');

        if (!this.elements.uploadArea) {
            console.error('❌ 严重错误: uploadArea 元素未找到!');
            console.log('🔍 尝试查找所有可能的上传区域...');
            
            // 尝试其他可能的选择器
            const alternatives = [
                document.querySelector('.upload-area'),
                document.querySelector('[id*="upload"]'),
                document.querySelector('.upload-section'),
            ];
            
            alternatives.forEach((alt, index) => {
                console.log(`  替代方案 ${index + 1}:`, alt ? '找到' : '未找到');
                if (alt && !this.elements.uploadArea) {
                    console.log('✅ 使用替代方案作为上传区域');
                    this.elements.uploadArea = alt;
                }
            });
        }

        if (!this.elements.fileInput) {
            console.error('❌ 严重错误: fileInput 元素未找到!');
            console.log('🔍 尝试查找文件输入元素...');
            
            const fileInputAlt = document.querySelector('input[type="file"]');
            if (fileInputAlt) {
                console.log('✅ 找到文件输入替代元素');
                this.elements.fileInput = fileInputAlt;
            }
        }

        if (this.elements.canvas) {
            this.canvas = this.elements.canvas;
            this.ctx = this.canvas.getContext('2d');
            console.log('✅ Canvas 元素已设置');
        } else {
            console.error('❌ Canvas 元素未找到');
        }
    }

    setupEventListeners() {
        console.log('🔗 开始设置事件监听器...');
        
        try {
            // 检查上传相关元素
            if (this.elements.uploadArea && this.elements.fileInput) {
                console.log('✅ 找到上传元素，开始绑定事件...');
                
                // 只使用一种绑定方法，避免重复事件
                this.bindUploadEvents_Method1();
                
            } else {
                console.error('❌ 上传元素缺失，无法绑定事件');
                console.log('uploadArea存在:', !!this.elements.uploadArea);
                console.log('fileInput存在:', !!this.elements.fileInput);
                
                // 尝试延迟重试
                setTimeout(() => {
                    console.log('🔄 延迟重试绑定事件...');
                    this.setupElements();
                    this.setupEventListeners();
                }, 1000);
                
                return;
            }

            // 设置其他事件监听器
            this.setupOtherEventListeners();

        } catch (error) {
            console.error('❌ 事件监听器设置失败:', error);
            this.showToast('上传功能初始化异常: ' + error.message, 'error');
        }
    }

    // 设置其他事件监听器
    setupOtherEventListeners() {
        try {
            // 页面导航
            document.getElementById('prevPage').addEventListener('click', () => {
                this.previousPage();
            });

            document.getElementById('nextPage').addEventListener('click', () => {
                this.nextPage();
            });

            // 缩放控制
            document.getElementById('zoomIn').addEventListener('click', () => {
                this.zoomIn();
            });

            document.getElementById('zoomOut').addEventListener('click', () => {
                this.zoomOut();
            });

            document.getElementById('fitToPage').addEventListener('click', () => {
                this.fitToPage();
            });

            // 文本操作
            document.getElementById('extractText').addEventListener('click', () => {
                this.extractText();
            });

            document.getElementById('addText').addEventListener('click', () => {
                this.toggleTextMode();
            });

            document.getElementById('confirmText').addEventListener('click', () => {
                this.confirmAddText();
            });

            // 图片操作
            document.getElementById('addImage').addEventListener('click', () => {
                this.elements.imageInput.click();
            });

            this.elements.imageInput.addEventListener('change', (e) => {
                this.handleImageSelect(e.target.files[0]);
            });

            document.getElementById('addImageFromUrl').addEventListener('click', () => {
                this.toggleImageUrlInput();
            });

            document.getElementById('confirmImageUrl').addEventListener('click', () => {
                this.addImageFromUrl();
            });

            // 页面操作
            document.getElementById('addPage').addEventListener('click', () => {
                this.addPage();
            });

            document.getElementById('deletePage').addEventListener('click', () => {
                this.deletePage();
            });

            document.getElementById('rotatePage').addEventListener('click', () => {
                this.rotatePage();
            });

            document.getElementById('duplicatePage').addEventListener('click', () => {
                this.duplicatePage();
            });

            // 高级工具
            document.getElementById('mergePdf').addEventListener('click', () => {
                this.elements.mergePdfInput.click();
            });

            this.elements.mergePdfInput.addEventListener('change', (e) => {
                this.handleMergePdfs(e.target.files);
            });

            document.getElementById('splitPdf').addEventListener('click', () => {
                this.showSplitModal();
            });

            document.getElementById('addBookmark').addEventListener('click', () => {
                this.toggleBookmarkInput();
            });

            document.getElementById('confirmBookmark').addEventListener('click', () => {
                this.addBookmark();
            });

            // 文件操作
            document.getElementById('downloadPdf').addEventListener('click', () => {
                this.downloadPDF();
            });

            document.getElementById('printPdf').addEventListener('click', () => {
                this.printPdf();
            });

            document.getElementById('saveAsImage').addEventListener('click', () => {
                this.saveAsImage();
            });

            document.getElementById('clearAll').addEventListener('click', () => {
                this.clearAll();
            });

            // 文本复制
            document.getElementById('copyText').addEventListener('click', () => {
                this.copyExtractedText();
            });

            // 连续查看模式切换
            document.getElementById('continuousViewToggle').addEventListener('change', (e) => {
                this.toggleContinuousView(e.target.checked);
            });

            // 文本标记功能
            document.getElementById('highlightText').addEventListener('click', () => {
                this.toggleHighlightMode();
            });

            document.getElementById('confirmHighlight').addEventListener('click', () => {
                this.confirmHighlight();
            });

            document.getElementById('cancelHighlight').addEventListener('click', () => {
                this.cancelHighlight();
            });

            // Canvas点击事件（用于添加文本、图片或标记）
            this.canvas.addEventListener('click', (e) => {
                if (this.isTextMode || this.isImageMode || this.isHighlightMode) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.clickPosition = {
                        x: (e.clientX - rect.left) / this.scale,
                        y: (e.clientY - rect.top) / this.scale
                    };
                    if (this.isTextMode) {
                        this.showTextInput();
                    } else if (this.isImageMode && this.pendingImage) {
                        this.addImageToPage();
                    } else if (this.isHighlightMode) {
                        this.showHighlightInput();
                    }
                }
            });

            // Canvas鼠标事件用于文本选择标记
            this.canvas.addEventListener('mousedown', (e) => {
                if (this.isHighlightMode) {
                    this.startSelection(e);
                }
            });

            this.canvas.addEventListener('mousemove', (e) => {
                if (this.isHighlightMode && this.isSelecting) {
                    this.updateSelection(e);
                }
            });

            this.canvas.addEventListener('mouseup', (e) => {
                if (this.isHighlightMode && this.isSelecting) {
                    this.endSelection(e);
                }
            });

            // 分割PDF弹窗事件
            document.getElementById('closeSplitModal').addEventListener('click', () => {
                this.hideSplitModal();
            });

            document.getElementById('confirmSplit').addEventListener('click', () => {
                this.splitPdf();
            });

            document.getElementById('cancelSplit').addEventListener('click', () => {
                this.hideSplitModal();
            });

            // 分割方式切换
            document.querySelectorAll('input[name="splitType"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.handleSplitTypeChange(e.target.value);
                });
            });

            // 输入框回车确认
            this.elements.textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.confirmAddText();
                }
            });

            console.log('✅ 其他事件监听器设置完成');
        } catch (error) {
            console.error('❌ 其他事件监听器设置失败:', error);
        }
    }

    // 方法1: 标准addEventListener
    bindUploadEvents_Method1() {
        console.log('📌 方法1: 使用addEventListener绑定事件...');
        
        try {
            // 确保清除所有旧的事件监听器
            this.elements.uploadArea.onclick = null;
            this.elements.fileInput.onchange = null;
            
            // 移除可能存在的旧的addEventListener事件
            const oldClickHandler = this.elements.uploadArea.clickHandler;
            if (oldClickHandler) {
                this.elements.uploadArea.removeEventListener('click', oldClickHandler);
            }
            
            // 创建新的事件处理器
            const clickHandler = async (e) => {
                console.log('📂 方法1: 上传区域被点击');
                e.preventDefault();
                e.stopPropagation();
                await this.triggerFileInput();
            };
            
            // 存储引用以便将来移除
            this.elements.uploadArea.clickHandler = clickHandler;
            
            // 绑定点击事件
            this.elements.uploadArea.addEventListener('click', clickHandler, false);

            // 文件选择事件
            this.elements.fileInput.addEventListener('change', (e) => {
                console.log('📄 方法1: 文件被选择');
                this.handleFileSelection(e);
            }, false);

            this.setupDragAndDrop();
            console.log('✅ 方法1: 事件绑定完成');
            
        } catch (error) {
            console.error('❌ 方法1失败:', error);
        }
    }

    // 方法2: 直接属性赋值
    bindUploadEvents_Method2() {
        console.log('📌 方法2: 使用直接属性赋值...');
        
        try {
            if (!this.elements.uploadArea.onclick) {
                this.elements.uploadArea.onclick = async (e) => {
                    console.log('📂 方法2: 上传区域被点击');
                    e.preventDefault();
                    await this.triggerFileInput();
                };
                console.log('✅ 方法2: 点击事件绑定完成');
            }
            
            if (!this.elements.fileInput.onchange) {
                this.elements.fileInput.onchange = (e) => {
                    console.log('📄 方法2: 文件被选择');
                    this.handleFileSelection(e);
                };
                console.log('✅ 方法2: 文件选择事件绑定完成');
            }
        } catch (error) {
            console.error('❌ 方法2失败:', error);
        }
    }

    // 方法3: 事件委托
    bindUploadEvents_Method3() {
        console.log('📌 方法3: 使用事件委托...');
        
        try {
            document.addEventListener('click', async (e) => {
                if (e.target.id === 'uploadArea' || e.target.closest('#uploadArea')) {
                    console.log('📂 方法3: 委托事件触发');
                    e.preventDefault();
                    await this.triggerFileInput();
                }
            });
            console.log('✅ 方法3: 委托事件绑定完成');
        } catch (error) {
            console.error('❌ 方法3失败:', error);
        }
    }

    // 统一的文件输入触发方法
    async triggerFileInput() {
        // 防止重复触发的防抖机制
        if (this.isFileSelecting) {
            console.log('⚠️ 文件选择对话框已经打开，跳过重复请求');
            return;
        }
        
        this.isFileSelecting = true;
        
        try {
            // 在Electron环境中优先使用原生文件对话框
            if (this.isElectron && window.electronAPI) {
                console.log('🎯 使用Electron原生文件选择对话框');
                const result = await window.electronAPI.showOpenDialog();
                
                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    console.log(`📁 通过Electron选择了文件: ${filePath}`);
                    
                    // 通过Electron主进程读取文件
                    const fileData = await window.electronAPI.readFile(filePath);
                    const fileName = filePath.split(/[/\\]/).pop();
                    const file = new File([fileData], fileName, { type: 'application/pdf' });
                    
                    await this.handleFileSelect(file);
                } else {
                    console.log('⚠️ 用户取消了文件选择');
                }
            } 
            // 在浏览器环境中使用HTML文件输入
            else {
                if (this.elements.fileInput) {
                    console.log('🎯 使用浏览器文件选择对话框');
                    this.elements.fileInput.click();
                } else {
                    console.error('❌ fileInput 元素不存在');
                    this.showToast('文件选择功能异常', 'error');
                }
            }
        } catch (error) {
            console.error('❌ 触发文件选择失败:', error);
            this.showToast(`文件选择失败: ${error.message}`, 'error');
        } finally {
            // 200ms后重置防抖标志，确保用户可以再次点击
            setTimeout(() => {
                this.isFileSelecting = false;
            }, 200);
        }
    }

    // 统一的文件选择处理方法
    handleFileSelection(e) {
        try {
            const files = e.target.files;
            if (files && files[0]) {
                console.log(`📁 选择了文件: ${files[0].name} (${files[0].type})`);
                this.handleFileSelect(files[0]);
            } else {
                console.log('⚠️ 未选择文件');
            }
        } catch (error) {
            console.error('❌ 处理文件选择失败:', error);
        }
    }

    // 拖拽功能设置
    setupDragAndDrop() {
        try {
            ['dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.elements.uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            this.elements.uploadArea.addEventListener('dragover', () => {
                this.elements.uploadArea.classList.add('dragover');
            });

            this.elements.uploadArea.addEventListener('dragleave', () => {
                this.elements.uploadArea.classList.remove('dragover');
            });

            this.elements.uploadArea.addEventListener('drop', (e) => {
                this.elements.uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                
                if (files && files[0] && files[0].type === 'application/pdf') {
                    console.log('📂 通过拖拽获取文件:', files[0].name);
                    this.handleFileSelect(files[0]);
                } else {
                    this.showToast('请选择有效的PDF文件', 'error');
                }
            });
            
            console.log('✅ 拖拽功能设置完成');
        } catch (error) {
            console.error('❌ 拖拽功能设置失败:', error);
        }
    }

    async handleFileSelect(file) {
        if (!file || file.type !== 'application/pdf') {
            this.showToast('请选择有效的PDF文件', 'error');
            return;
        }

        this.showLoading(true);
        
        // 记录当前文件名用于阅读位置记录
        this.currentFileName = file.name;
        console.log(`📖 打开文件: ${this.currentFileName}`);
        
        // 🔖 初始化文件的标记系统
        this.initFileAnnotations(file);

        try {
            // 为PDF.js读取文件
            const pdfJsReader = new FileReader();
            const pdfJsPromise = new Promise((resolve, reject) => {
                pdfJsReader.onload = (e) => resolve(new Uint8Array(e.target.result));
                pdfJsReader.onerror = reject;
                pdfJsReader.readAsArrayBuffer(file);
            });
            
            // 为PDF-lib读取文件（完全独立的第二次读取）
            const pdfLibReader = new FileReader();
            const pdfLibPromise = new Promise((resolve, reject) => {
                pdfLibReader.onload = (e) => resolve(new Uint8Array(e.target.result));
                pdfLibReader.onerror = reject;
                pdfLibReader.readAsArrayBuffer(file);
            });
            
            // 等待两个独立的读取完成
            const [pdfJsData, pdfLibData] = await Promise.all([pdfJsPromise, pdfLibPromise]);
            
            // 使用PDF.js加载用于显示
            const loadingTask = pdfjsLib.getDocument({data: pdfJsData});
            this.currentPdf = await loadingTask.promise;
            this.totalPages = this.currentPdf.numPages;
            this.currentPage = 1;

            // 使用PDF-lib加载用于编辑
            this.pdfDoc = await PDFLib.PDFDocument.load(pdfLibData);

            // 分析PDF内容类型
            const contentAnalysis = await this.analyzePdfContent();
            console.log('📊 PDF内容分析结果:', contentAnalysis);

            // 根据内容类型决定转换方式
            if (contentAnalysis.recommendWordConversion) {
                this.showToast(`检测到${contentAnalysis.primaryType}内容，建议转换为Word文档`, 'info');
                // 显示转换选项
                this.showWordConversionOptions(contentAnalysis);
            }

            // 直接切换到阅读模式，而不是显示传统的编辑界面
            await this.enterReadingMode();

            this.showToast('PDF文件加载成功 - 已进入阅读模式', 'success');
        } catch (error) {
            console.error('加载PDF失败:', error);
            this.showToast(`加载PDF文件失败: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async renderPage(pageNum) {
        if (!this.currentPdf || pageNum < 1 || pageNum > this.totalPages) {
            return;
        }

        try {
            const page = await this.currentPdf.getPage(pageNum);
            const viewport = page.getViewport({scale: this.scale});

            // 设置canvas尺寸
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;

            // 清除canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 渲染PDF页面
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('渲染页面失败:', error);
            this.showToast('渲染页面失败', 'error');
        }
    }

    updatePageInfo() {
        this.elements.pageInfo.textContent = `页面 ${this.currentPage} / ${this.totalPages}`;
        
        // 更新按钮状态
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= this.totalPages;
        document.getElementById('deletePage').disabled = this.totalPages <= 1;
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }

    async zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        await this.renderPage(this.currentPage);
        this.showToast(`缩放: ${Math.round(this.scale * 100)}%`);
    }

    async zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.5);
        await this.renderPage(this.currentPage);
        this.showToast(`缩放: ${Math.round(this.scale * 100)}%`);
    }

    async extractText() {
        if (!this.currentPdf) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            let allText = '';
            
            for (let i = 1; i <= this.totalPages; i++) {
                const page = await this.currentPdf.getPage(i);
                const textContent = await page.getTextContent();
                
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                
                allText += `=== 第 ${i} 页 ===\n${pageText}\n\n`;
            }

            this.elements.extractedText.value = allText;
            this.elements.textSection.style.display = 'block';
            
            this.showToast(`成功提取 ${this.totalPages} 页文本`, 'success');
        } catch (error) {
            console.error('提取文本失败:', error);
            this.showToast('提取文本失败', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    toggleTextMode() {
        this.isTextMode = !this.isTextMode;
        const button = document.getElementById('addText');
        
        if (this.isTextMode) {
            button.textContent = '取消添加';
            button.classList.add('active');
            this.showToast('点击PDF页面选择文本位置', 'info');
            this.canvas.style.cursor = 'crosshair';
        } else {
            button.textContent = '添加文本';
            button.classList.remove('active');
            this.hideTextInput();
            this.canvas.style.cursor = 'default';
        }
    }

    showTextInput() {
        this.elements.textInput.style.display = 'inline-block';
        document.getElementById('confirmText').style.display = 'inline-block';
        this.elements.textInput.focus();
    }

    hideTextInput() {
        this.elements.textInput.style.display = 'none';
        document.getElementById('confirmText').style.display = 'none';
        this.elements.textInput.value = '';
    }

    async confirmAddText() {
        const text = this.elements.textInput.value.trim();
        if (!text || !this.clickPosition || !this.pdfDoc) {
            this.showToast('请输入文本内容', 'warning');
            return;
        }

        try {
            const pages = this.pdfDoc.getPages();
            const page = pages[this.currentPage - 1];
            
            // 嵌入字体
            const font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            // 添加文本
            page.drawText(text, {
                x: this.clickPosition.x,
                y: page.getHeight() - this.clickPosition.y,
                size: 12,
                font: font,
                color: PDFLib.rgb(0, 0, 0)
            });

            // 重新渲染页面
            await this.updatePdfDisplay();
            
            this.hideTextInput();
            this.toggleTextMode();
            this.showToast('文本添加成功', 'success');
        } catch (error) {
            console.error('添加文本失败:', error);
            this.showToast('添加文本失败', 'error');
        }
    }

    async addPage() {
        if (!this.pdfDoc) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            this.pdfDoc.addPage();
            await this.updatePdfDisplay();
            
            this.totalPages++;
            this.currentPage = this.totalPages;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
            
            this.showToast('新页面添加成功', 'success');
        } catch (error) {
            console.error('添加页面失败:', error);
            this.showToast('添加页面失败', 'error');
        }
    }

    async deletePage() {
        if (!this.pdfDoc || this.totalPages <= 1) {
            this.showToast('无法删除唯一的页面', 'warning');
            return;
        }

        try {
            this.pdfDoc.removePage(this.currentPage - 1);
            await this.updatePdfDisplay();
            
            this.totalPages--;
            if (this.currentPage > this.totalPages) {
                this.currentPage = this.totalPages;
            }
            
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
            
            this.showToast('页面删除成功', 'success');
        } catch (error) {
            console.error('删除页面失败:', error);
            this.showToast('删除页面失败', 'error');
        }
    }

    async rotatePage() {
        if (!this.pdfDoc) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            const pages = this.pdfDoc.getPages();
            const page = pages[this.currentPage - 1];
            page.setRotation(PDFLib.degrees(page.getRotation().angle + 90));
            
            await this.updatePdfDisplay();
            await this.renderPage(this.currentPage);
            
            this.showToast('页面旋转成功', 'success');
        } catch (error) {
            console.error('旋转页面失败:', error);
            this.showToast('旋转页面失败', 'error');
        }
    }

    async updatePdfDisplay() {
        if (!this.pdfDoc) return;

        try {
            const pdfBytes = await this.pdfDoc.save();
            // 创建副本避免ArrayBuffer问题
            const loadingTask = pdfjsLib.getDocument({data: new Uint8Array(pdfBytes)});
            this.currentPdf = await loadingTask.promise;
            this.totalPages = this.currentPdf.numPages;
        } catch (error) {
            console.error('更新PDF显示失败:', error);
        }
    }

    async downloadPDF() {
        if (!this.pdfDoc) {
            this.showToast('没有可下载的PDF文件', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            const pdfBytes = await this.pdfDoc.save();
            const blob = new Blob([pdfBytes], {type: 'application/pdf'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited-pdf-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('PDF下载成功', 'success');
        } catch (error) {
            console.error('下载PDF失败:', error);
            this.showToast('下载PDF失败', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    copyExtractedText() {
        const text = this.elements.extractedText.value;
        if (!text) {
            this.showToast('没有可复制的文本', 'warning');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('文本已复制到剪贴板', 'success');
        }).catch(() => {
            // 备用复制方法
            this.elements.extractedText.select();
            document.execCommand('copy');
            this.showToast('文本已复制到剪贴板', 'success');
        });
    }

    async fitToPage() {
        if (!this.currentPdf) return;
        
        const page = await this.currentPdf.getPage(this.currentPage);
        const viewport = page.getViewport({scale: 1.0});
        
        // 计算适合容器的缩放比例
        const container = this.elements.viewerSection;
        const containerWidth = container.clientWidth - 50; // 留出边距
        const containerHeight = container.clientHeight - 50;
        
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        this.scale = Math.min(scaleX, scaleY, 2.0); // 最大2倍
        
        await this.renderPage(this.currentPage);
        this.showToast(`适合页面: ${Math.round(this.scale * 100)}%`);
    }

    toggleImageUrlInput() {
        const group = document.querySelector('.image-input-group');
        group.style.display = group.style.display === 'none' ? 'flex' : 'none';
    }

    async addImageFromUrl() {
        const url = this.elements.imageUrl.value.trim();
        if (!url) {
            this.showToast('请输入图片URL', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(url);
            const blob = await response.blob();
            this.handleImageSelect(blob);
            this.toggleImageUrlInput();
            this.elements.imageUrl.value = '';
        } catch (error) {
            console.error('加载图片失败:', error);
            this.showToast('加载图片失败，请检查URL是否正确', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleImageSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showToast('请选择有效的图片文件', 'error');
            return;
        }

        try {
            // 使用独立的 FileReader
            const fileReader = new FileReader();
            const filePromise = new Promise((resolve, reject) => {
                fileReader.onload = (e) => resolve(new Uint8Array(e.target.result));
                fileReader.onerror = reject;
                fileReader.readAsArrayBuffer(file);
            });

            const uint8Array = await filePromise;
            
            // 根据文件类型嵌入图片
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                this.pendingImage = await this.pdfDoc.embedJpg(uint8Array);
            } else if (file.type === 'image/png') {
                this.pendingImage = await this.pdfDoc.embedPng(uint8Array);
            } else {
                this.showToast('只支持JPG和PNG格式的图片', 'warning');
                return;
            }

            this.isImageMode = true;
            this.canvas.style.cursor = 'crosshair';
            this.showToast('点击PDF页面选择图片插入位置', 'info');
        } catch (error) {
            console.error('处理图片失败:', error);
            this.showToast(`处理图片失败: ${error.message}`, 'error');
        }
    }

    async addImageToPage() {
        if (!this.pendingImage || !this.clickPosition || !this.pdfDoc) {
            return;
        }

        try {
            const pages = this.pdfDoc.getPages();
            const page = pages[this.currentPage - 1];
            
            // 计算图片尺寸（保持比例，最大宽度200px）
            const maxWidth = 200;
            const imageRatio = this.pendingImage.width / this.pendingImage.height;
            const width = Math.min(maxWidth, this.pendingImage.width);
            const height = width / imageRatio;

            page.drawImage(this.pendingImage, {
                x: this.clickPosition.x,
                y: page.getHeight() - this.clickPosition.y - height,
                width: width,
                height: height
            });

            await this.updatePdfDisplay();
            await this.renderPage(this.currentPage);

            this.pendingImage = null;
            this.isImageMode = false;
            this.canvas.style.cursor = 'default';
            this.showToast('图片插入成功', 'success');
        } catch (error) {
            console.error('插入图片失败:', error);
            this.showToast('插入图片失败', 'error');
        }
    }

    async duplicatePage() {
        if (!this.pdfDoc) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            const pages = this.pdfDoc.getPages();
            const currentPageToCopy = pages[this.currentPage - 1];
            
            // 复制页面
            const [copiedPage] = await this.pdfDoc.copyPages(this.pdfDoc, [this.currentPage - 1]);
            this.pdfDoc.insertPage(this.currentPage, copiedPage);
            
            await this.updatePdfDisplay();
            
            this.totalPages++;
            this.currentPage++;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
            
            this.showToast('页面复制成功', 'success');
        } catch (error) {
            console.error('复制页面失败:', error);
            this.showToast('复制页面失败', 'error');
        }
    }

    async handleMergePdfs(files) {
        if (!files || files.length === 0) {
            return;
        }

        if (!this.pdfDoc) {
            this.showToast('请先加载主PDF文件', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            for (const file of files) {
                if (file.type === 'application/pdf') {
                    // 为每个文件使用独立的 FileReader
                    const fileReader = new FileReader();
                    const filePromise = new Promise((resolve, reject) => {
                        fileReader.onload = (e) => resolve(new Uint8Array(e.target.result));
                        fileReader.onerror = reject;
                        fileReader.readAsArrayBuffer(file);
                    });

                    const uint8Array = await filePromise;
                    const pdfToMerge = await PDFLib.PDFDocument.load(uint8Array);
                    
                    const pageCount = pdfToMerge.getPageCount();
                    const pageIndices = Array.from({length: pageCount}, (_, i) => i);
                    const copiedPages = await this.pdfDoc.copyPages(pdfToMerge, pageIndices);
                    
                    copiedPages.forEach(page => this.pdfDoc.addPage(page));
                }
            }

            await this.updatePdfDisplay();
            this.totalPages = this.currentPdf.numPages;
            this.updatePageInfo();

            this.showToast(`成功合并 ${files.length} 个PDF文件`, 'success');
        } catch (error) {
            console.error('合并PDF失败:', error);
            this.showToast('合并PDF失败', 'error');
        } finally {
            this.showLoading(false);
            this.elements.mergePdfInput.value = '';
        }
    }

    showSplitModal() {
        if (!this.pdfDoc || this.totalPages <= 1) {
            this.showToast('PDF文件页数不足，无法分割', 'warning');
            return;
        }

        this.elements.splitModal.style.display = 'flex';
    }

    hideSplitModal() {
        this.elements.splitModal.style.display = 'none';
    }

    handleSplitTypeChange(type) {
        const pagesInput = document.getElementById('splitByPages');
        const rangeInput = document.getElementById('splitByRange');
        
        if (type === 'pages') {
            pagesInput.style.display = 'block';
            rangeInput.style.display = 'none';
        } else {
            pagesInput.style.display = 'none';
            rangeInput.style.display = 'block';
        }
    }

    async splitPdf() {
        if (!this.pdfDoc) return;

        const splitType = document.querySelector('input[name="splitType"]:checked').value;
        this.showLoading(true);

        try {
            if (splitType === 'pages') {
                const pagesPerFile = parseInt(document.getElementById('pagesPerFile').value) || 1;
                await this.splitByPages(pagesPerFile);
            } else {
                const ranges = document.getElementById('pageRanges').value.trim();
                await this.splitByRanges(ranges);
            }

            this.hideSplitModal();
            this.showToast('PDF分割完成', 'success');
        } catch (error) {
            console.error('分割PDF失败:', error);
            this.showToast('分割PDF失败', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async splitByPages(pagesPerFile) {
        const totalFiles = Math.ceil(this.totalPages / pagesPerFile);
        
        for (let i = 0; i < totalFiles; i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const startPage = i * pagesPerFile;
            const endPage = Math.min(startPage + pagesPerFile - 1, this.totalPages - 1);
            
            const pageIndices = [];
            for (let j = startPage; j <= endPage; j++) {
                pageIndices.push(j);
            }
            
            const copiedPages = await newPdf.copyPages(this.pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));
            
            const pdfBytes = await newPdf.save();
            this.downloadBlob(pdfBytes, `split-pdf-part-${i + 1}.pdf`);
        }
    }

    async splitByRanges(rangeString) {
        const ranges = rangeString.split(',').map(r => r.trim());
        
        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            const [start, end] = range.split('-').map(n => parseInt(n.trim()) - 1);
            
            if (isNaN(start) || start < 0 || start >= this.totalPages) {
                throw new Error(`无效的页面范围: ${range}`);
            }
            
            const endPage = isNaN(end) ? start : Math.min(end, this.totalPages - 1);
            const pageIndices = [];
            
            for (let j = start; j <= endPage; j++) {
                pageIndices.push(j);
            }
            
            const newPdf = await PDFLib.PDFDocument.create();
            const copiedPages = await newPdf.copyPages(this.pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));
            
            const pdfBytes = await newPdf.save();
            this.downloadBlob(pdfBytes, `split-pdf-range-${range.replace('-', 'to')}.pdf`);
        }
    }

    toggleBookmarkInput() {
        const group = document.querySelector('.bookmark-input-group');
        group.style.display = group.style.display === 'none' ? 'flex' : 'none';
        if (group.style.display === 'flex') {
            this.elements.bookmarkTitle.focus();
        }
    }

    async addBookmark() {
        const title = this.elements.bookmarkTitle.value.trim();
        if (!title) {
            this.showToast('请输入书签标题', 'warning');
            return;
        }

        try {
            // 添加书签到当前页面
            this.bookmarks.push({
                title: title,
                page: this.currentPage,
                timestamp: new Date().toLocaleString()
            });

            this.toggleBookmarkInput();
            this.elements.bookmarkTitle.value = '';
            this.showToast(`书签 "${title}" 添加成功`, 'success');
        } catch (error) {
            console.error('添加书签失败:', error);
            this.showToast('添加书签失败', 'error');
        }
    }

    async printPdf() {
        if (!this.currentPdf) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            const pdfBytes = await this.pdfDoc.save();
            const blob = new Blob([pdfBytes], {type: 'application/pdf'});
            const url = URL.createObjectURL(blob);
            
            const printWindow = window.open(url, '_blank');
            printWindow.onload = () => {
                printWindow.print();
            };
        } catch (error) {
            console.error('打印PDF失败:', error);
            this.showToast('打印PDF失败', 'error');
        }
    }

    async saveAsImage() {
        if (!this.currentPdf || !this.canvas) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            // 将当前页面保存为图片
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pdf-page-${this.currentPage}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showToast(`页面 ${this.currentPage} 已保存为图片`, 'success');
            }, 'image/png');
        } catch (error) {
            console.error('保存图片失败:', error);
            this.showToast('保存图片失败', 'error');
        }
    }

    downloadBlob(bytes, filename) {
        const blob = new Blob([bytes], {type: 'application/pdf'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showTextInput() {
        const group = document.querySelector('.text-input-group');
        group.style.display = 'flex';
        this.elements.textInput.focus();
    }

    hideTextInput() {
        const group = document.querySelector('.text-input-group');
        group.style.display = 'none';
        this.elements.textInput.value = '';
    }

    async confirmAddText() {
        const text = this.elements.textInput.value.trim();
        const fontSize = parseInt(this.elements.fontSize.value) || 12;
        const color = this.elements.textColor.value || '#000000';
        
        if (!text || !this.clickPosition || !this.pdfDoc) {
            this.showToast('请输入文本内容', 'warning');
            return;
        }

        try {
            const pages = this.pdfDoc.getPages();
            const page = pages[this.currentPage - 1];
            
            // 嵌入字体
            const font = await this.pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            // 将颜色转换为RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            
            // 添加文本
            page.drawText(text, {
                x: this.clickPosition.x,
                y: page.getHeight() - this.clickPosition.y,
                size: fontSize,
                font: font,
                color: PDFLib.rgb(r, g, b)
            });

            // 重新渲染页面
            await this.updatePdfDisplay();
            await this.renderPage(this.currentPage);
            
            this.hideTextInput();
            this.toggleTextMode();
            this.showToast('文本添加成功', 'success');
        } catch (error) {
            console.error('添加文本失败:', error);
            this.showToast('添加文本失败', 'error');
        }
    }

    clearAll() {
        if (confirm('确定要清空所有内容并重新开始吗？')) {
            this.currentPdf = null;
            this.pdfDoc = null;
            this.currentPage = 1;
            this.totalPages = 0;
            this.scale = 1.5;
            this.isTextMode = false;
            this.isImageMode = false;
            this.isHighlightMode = false;
            this.pendingImage = null;
            this.bookmarks = [];
            this.mergePdfs = [];
            this.continuousView = false;
            this.continuousCanvases = [];
            this.highlights = [];
            this.selectionStart = null;
            this.selectionEnd = null;
            this.isSelecting = false;
            
            // 隐藏所有面板
            this.elements.controlPanel.style.display = 'none';
            this.elements.viewerSection.style.display = 'none';
            this.elements.textSection.style.display = 'none';
            this.hideSplitModal();
            
            // 重置查看模式
            this.elements.continuousViewCheckbox.checked = false;
            this.elements.continuousViewDiv.style.display = 'none';
            this.elements.singlePageView.style.display = 'block';
            
            // 重置UI状态
            this.canvas.style.cursor = 'default';
            document.querySelector('.text-input-group').style.display = 'none';
            document.querySelector('.image-input-group').style.display = 'none';
            document.querySelector('.bookmark-input-group').style.display = 'none';
            document.querySelector('.highlight-input-group').style.display = 'none';
            
            // 重置按钮状态
            const addTextBtn = document.getElementById('addText');
            const highlightBtn = document.getElementById('highlightText');
            addTextBtn.textContent = '添加文本';
            addTextBtn.classList.remove('active');
            highlightBtn.textContent = '标记文本';
            highlightBtn.classList.remove('active');
            
            // 清空canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 清空连续查看容器
            this.elements.continuousContainer.innerHTML = '';
            
            // 清空表单
            this.elements.extractedText.value = '';
            this.elements.fileInput.value = '';
            this.elements.textInput.value = '';
            this.elements.imageUrl.value = '';
            this.elements.bookmarkTitle.value = '';
            
            this.showToast('已清空所有内容', 'success');
        }
    }

    showLoading(show) {
        this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    // 连续查看模式相关方法
    async toggleContinuousView(enabled) {
        this.continuousView = enabled;
        
        if (enabled) {
            // 切换到连续查看模式
            this.elements.singlePageView.style.display = 'none';
            this.elements.continuousViewDiv.style.display = 'block';
            await this.renderAllPages();
            this.showToast('已切换到连续查看模式', 'success');
        } else {
            // 切换回单页模式
            this.elements.continuousViewDiv.style.display = 'none';
            this.elements.singlePageView.style.display = 'block';
            await this.renderPage(this.currentPage);
            this.showToast('已切换到单页模式', 'success');
        }
    }

    async renderAllPages() {
        if (!this.currentPdf) return;

        // 清空连续容器
        this.elements.continuousContainer.innerHTML = '';
        this.continuousCanvases = [];

        try {
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const canvas = document.createElement('canvas');
                canvas.className = 'continuous-canvas';
                canvas.id = `continuous-page-${pageNum}`;
                
                const page = await this.currentPdf.getPage(pageNum);
                const viewport = page.getViewport({scale: this.scale});
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                const ctx = canvas.getContext('2d');
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                // 添加页码标签
                const pageLabel = document.createElement('div');
                pageLabel.textContent = `第 ${pageNum} 页`;
                pageLabel.style.textAlign = 'center';
                pageLabel.style.margin = '10px 0 5px 0';
                pageLabel.style.color = '#666';
                pageLabel.style.fontSize = '14px';
                
                this.elements.continuousContainer.appendChild(pageLabel);
                this.elements.continuousContainer.appendChild(canvas);
                
                this.continuousCanvases.push(canvas);
                
                // 为每个页面的canvas添加点击事件
                canvas.addEventListener('click', (e) => {
                    this.currentPage = pageNum;
                    this.updatePageInfo();
                    if (this.isTextMode || this.isImageMode || this.isHighlightMode) {
                        const rect = canvas.getBoundingClientRect();
                        this.clickPosition = {
                            x: (e.clientX - rect.left) / this.scale,
                            y: (e.clientY - rect.top) / this.scale
                        };
                        if (this.isTextMode) {
                            this.showTextInput();
                        } else if (this.isImageMode && this.pendingImage) {
                            this.addImageToPage();
                        } else if (this.isHighlightMode) {
                            this.showHighlightInput();
                        }
                    }
                });
            }
        } catch (error) {
            console.error('渲染所有页面失败:', error);
            this.showToast('渲染连续页面失败', 'error');
        }
    }

    // 文本标记功能相关方法
    toggleHighlightMode() {
        this.isHighlightMode = !this.isHighlightMode;
        const button = document.getElementById('highlightText');
        
        if (this.isHighlightMode) {
            button.textContent = '取消标记';
            button.classList.add('active');
            this.showToast('选择要标记的文本区域', 'info');
            this.canvas.style.cursor = 'crosshair';
        } else {
            button.textContent = '标记文本';
            button.classList.remove('active');
            this.hideHighlightInput();
            this.canvas.style.cursor = 'default';
        }
    }

    showHighlightInput() {
        const group = document.querySelector('.highlight-input-group');
        group.style.display = 'flex';
    }

    hideHighlightInput() {
        const group = document.querySelector('.highlight-input-group');
        group.style.display = 'none';
    }

    startSelection(e) {
        this.isSelecting = true;
        const rect = this.canvas.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    updateSelection(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // 清除之前的选择框
        this.clearSelection();
        
        // 绘制新的选择框
        this.drawSelectionBox(this.selectionStart, currentPos);
    }

    endSelection(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        const rect = this.canvas.getBoundingClientRect();
        this.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // 显示标记选项
        this.showHighlightInput();
    }

    drawSelectionBox(start, end) {
        const ctx = this.canvas.getContext('2d');
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        ctx.strokeRect(start.x, start.y, width, height);
    }

    clearSelection() {
        // 重新渲染当前页面以清除选择框
        if (this.continuousView) {
            // 在连续模式下需要重新渲染所有页面
            // 这里简化处理，只清除选择框
        } else {
            this.renderPage(this.currentPage);
        }
    }

    async confirmHighlight() {
        if (!this.selectionStart || !this.selectionEnd || !this.pdfDoc) {
            this.showToast('请先选择要标记的区域', 'warning');
            return;
        }

        try {
            const highlightType = this.elements.highlightType.value;
            const color = this.elements.highlightColor.value;
            const opacity = parseFloat(this.elements.highlightOpacity.value);
            
            // 将颜色转换为RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;

            const pages = this.pdfDoc.getPages();
            const page = pages[this.currentPage - 1];
            
            // 计算标记区域
            const x = Math.min(this.selectionStart.x, this.selectionEnd.x) / this.scale;
            const y = Math.min(this.selectionStart.y, this.selectionEnd.y) / this.scale;
            const width = Math.abs(this.selectionEnd.x - this.selectionStart.x) / this.scale;
            const height = Math.abs(this.selectionEnd.y - this.selectionStart.y) / this.scale;

            if (highlightType === 'highlight') {
                // 绘制高亮矩形
                page.drawRectangle({
                    x: x,
                    y: page.getHeight() - y - height,
                    width: width,
                    height: height,
                    color: PDFLib.rgb(r, g, b),
                    opacity: opacity
                });
            } else if (highlightType === 'underline') {
                // 绘制下划线
                page.drawRectangle({
                    x: x,
                    y: page.getHeight() - y - height,
                    width: width,
                    height: 2,
                    color: PDFLib.rgb(r, g, b),
                    opacity: opacity
                });
            }

            // 保存标记信息
            this.highlights.push({
                page: this.currentPage,
                type: highlightType,
                x: x,
                y: y,
                width: width,
                height: height,
                color: color,
                opacity: opacity
            });

            // 重新渲染页面
            await this.updatePdfDisplay();
            if (this.continuousView) {
                await this.renderAllPages();
            } else {
                await this.renderPage(this.currentPage);
            }
            
            this.hideHighlightInput();
            this.toggleHighlightMode();
            this.showToast(`${highlightType === 'highlight' ? '高亮' : '下划线'}标记添加成功`, 'success');
        } catch (error) {
            console.error('添加标记失败:', error);
            this.showToast('添加标记失败', 'error');
        }
    }

    cancelHighlight() {
        this.hideHighlightInput();
        this.toggleHighlightMode();
        this.clearSelection();
        this.selectionStart = null;
        this.selectionEnd = null;
    }

    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 调试方法
    debugFunctions() {
        console.log('=== PDF编辑器功能调试 ===');
        console.log('连续查看复选框:', this.elements.continuousViewCheckbox);
        console.log('连续查看容器:', this.elements.continuousViewDiv);
        console.log('标记按钮:', document.getElementById('highlightText'));
        console.log('标记面板:', document.querySelector('.highlight-input-group'));
        console.log('当前状态:', {
            continuousView: this.continuousView,
            isHighlightMode: this.isHighlightMode,
            currentPdf: !!this.currentPdf,
            isElectron: this.isElectron,
            hotReload: !!this.hotReload
        });
    }

    // 热重载设置
    setupHotReload() {
        if (this.hotReload) {
            console.log('🔥 热重载已启用');
            
            // 简化的热重载处理
            if (this.hotReload.accept && typeof this.hotReload.accept === 'function') {
                this.hotReload.accept(() => {
                    console.log('🔄 代码已更新');
                    this.showToast('代码已更新，功能已刷新', 'success');
                });
            }
            
            // 自动保存状态
            this.setupAutoSave();
            
            // 监听Vite热重载事件
            if (typeof window !== 'undefined' && window.location.port === '5173') {
                // Vite HMR 环境
                if (window.__viteHotReloadReady) {
                    console.log('🎯 Vite热重载就绪');
                    this.setupViteHotReload();
                } else {
                    // 等待Vite HMR准备就绪
                    window.addEventListener('vite:beforeUpdate', () => {
                        console.log('🔄 Vite正在更新...');
                    });
                    
                    window.addEventListener('vite:afterUpdate', () => {
                        console.log('✅ Vite更新完成');
                        this.showToast('页面已更新', 'success');
                    });
                }
            }
        } else if (this.isElectron && window.electronAPI && window.electronAPI.isDev && window.electronAPI.isDev()) {
            console.log('🚀 Electron开发模式');
            this.setupElectronDevReload();
        } else {
            console.log('📱 标准浏览器模式');
        }
    }
    
    // 设置Vite热重载
    setupViteHotReload() {
        // 监听文件变化
        if (window.WebSocket) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}`;
            
            try {
                const ws = new WebSocket(wsUrl);
                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    if (message.type === 'update') {
                        console.log('🔄 检测到文件更新');
                        // 这里可以添加特定的热重载逻辑
                    }
                };
            } catch (error) {
                console.warn('WebSocket连接失败:', error.message);
            }
        }
    }
    
    // 设置Electron开发模式重载
    setupElectronDevReload() {
        // 在Electron开发模式下，可以通过键盘快捷键重载
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                console.log('🔄 手动重载应用');
                window.location.reload();
            }
        });
    }

    // Electron集成设置
    setupElectronIntegration() {
        if (!this.isElectron) {
            console.log('🌐 运行在浏览器模式');
            return;
        }

        console.log('💻 Electron桌面应用模式');
        
        // 监听文件打开事件
        window.electronAPI.onOpenFile((filePath) => {
            console.log('📂 从系统打开文件:', filePath);
            this.handleElectronFileOpen(filePath);
        });

        // 监听保存事件
        window.electronAPI.onSaveFile(() => {
            this.handleElectronSave();
        });

        // 更新窗口标题
        this.updateWindowTitle('PDF编辑器 Pro - 桌面版');

        // 添加原生文件操作按钮
        this.addNativeFileButtons();

        // 设置键盘快捷键
        this.setupElectronShortcuts();
    }

    // 自动保存设置（开发模式）
    setupAutoSave() {
        if (this.hotReload) {
            setInterval(() => {
                if (this.pdfDoc && this.currentPdf) {
                    const state = {
                        currentPage: this.currentPage,
                        scale: this.scale,
                        continuousView: this.continuousView,
                        highlights: this.highlights,
                        bookmarks: this.bookmarks
                    };
                    
                    localStorage.setItem('pdf-editor-dev-state', JSON.stringify(state));
                }
            }, 5000); // 每5秒自动保存状态
        }
    }

    // 恢复开发状态
    restoreDevState() {
        if (this.hotReload) {
            const savedState = localStorage.getItem('pdf-editor-dev-state');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    this.currentPage = state.currentPage || 1;
                    this.scale = state.scale || 1.5;
                    this.continuousView = state.continuousView || false;
                    this.highlights = state.highlights || [];
                    this.bookmarks = state.bookmarks || [];
                    
                    console.log('🔄 开发状态已恢复');
                } catch (error) {
                    console.warn('恢复开发状态失败:', error);
                }
            }
        }
    }

    // Electron文件打开处理
    async handleElectronFileOpen(filePath) {
        try {
            this.showLoading(true);
            
            // 读取文件 (需要通过主进程)
            const fileData = await window.electronAPI.readFile(filePath);
            const file = new File([fileData], 'opened-file.pdf', { type: 'application/pdf' });
            
            await this.handleFileSelect(file);
            this.updateWindowTitle(`PDF编辑器 Pro - ${filePath.split(/[/\\]/).pop()}`);
            
        } catch (error) {
            console.error('打开文件失败:', error);
            this.showToast('文件打开失败', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Electron保存处理
    async handleElectronSave() {
        if (!this.pdfDoc) {
            this.showToast('没有可保存的PDF文件', 'warning');
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog();
            if (!result.canceled && result.filePath) {
                const pdfBytes = await this.pdfDoc.save();
                await window.electronAPI.writeFile(result.filePath, pdfBytes);
                
                this.showToast('文件保存成功', 'success');
                this.updateWindowTitle(`PDF编辑器 Pro - ${result.filePath.split(/[/\\]/).pop()}`);
            }
        } catch (error) {
            console.error('保存文件失败:', error);
            this.showToast('文件保存失败', 'error');
        }
    }

    // 更新窗口标题
    updateWindowTitle(title) {
        document.title = title;
    }

    // 添加原生文件操作按钮
    addNativeFileButtons() {
        const controlPanel = document.getElementById('controlPanel');
        if (!controlPanel) return;

        // 创建原生文件操作组
        const nativeGroup = document.createElement('div');
        nativeGroup.className = 'panel-group';
        nativeGroup.innerHTML = `
            <h3>💻 桌面文件操作</h3>
            <div class="controls">
                <button id="nativeOpenFile" class="btn">📂 打开文件</button>
                <button id="nativeSaveFile" class="btn">💾 保存文件</button>
                <button id="nativeExportImage" class="btn">🖼️ 导出图片</button>
            </div>
        `;

        // 插入到第一个位置
        controlPanel.insertBefore(nativeGroup, controlPanel.firstChild);

        // 绑定事件
        document.getElementById('nativeOpenFile').addEventListener('click', async () => {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                await this.handleElectronFileOpen(result.filePaths[0]);
            }
        });

        document.getElementById('nativeSaveFile').addEventListener('click', () => {
            this.handleElectronSave();
        });

        document.getElementById('nativeExportImage').addEventListener('click', async () => {
            await this.handleNativeImageExport();
        });
    }

    // 原生图片导出
    async handleNativeImageExport() {
        if (!this.canvas || !this.currentPdf) {
            this.showToast('请先加载PDF文件', 'warning');
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog();
            if (!result.canceled && result.filePath) {
                // 转换canvas为数据URL
                const dataUrl = this.canvas.toDataURL('image/png');
                const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                await window.electronAPI.writeFile(result.filePath, buffer);
                this.showToast('图片导出成功', 'success');
            }
        } catch (error) {
            console.error('导出图片失败:', error);
            this.showToast('导出图片失败', 'error');
        }
    }

    // Electron键盘快捷键
    setupElectronShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'o':
                        e.preventDefault();
                        const nativeOpenBtn = document.getElementById('nativeOpenFile');
                        if (nativeOpenBtn) {
                            nativeOpenBtn.click();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        const nativeSaveBtn = document.getElementById('nativeSaveFile');
                        if (nativeSaveBtn) {
                            nativeSaveBtn.click();
                        }
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        this.zoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        this.zoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        this.fitToPage();
                        break;
                }
            }
            
            // 页面导航快捷键
            switch (e.key) {
                case 'ArrowLeft':
                    if (!this.isTextMode && !this.isHighlightMode) {
                        this.previousPage();
                    }
                    break;
                case 'ArrowRight':
                    if (!this.isTextMode && !this.isHighlightMode) {
                        this.nextPage();
                    }
                    break;
            }
        });
    }

    // ===== 阅读模式功能 =====
    async enterReadingMode() {
        console.log('📚 进入阅读模式');
        
        // 隐藏主编辑界面
        document.querySelector('.container').style.display = 'none';
        
        // 显示阅读模式界面
        this.elements.readingMode.style.display = 'flex';
        
        // 设置阅读模式状态
        this.isReadingMode = true;
        this.readingScale = 1.5; // 增加初始缩放以提高可读性
        this.readingHighlightMode = false;
        
        // 渲染所有PDF页面到滚动视图
        await this.renderAllPagesForReading();
        
        // 设置阅读模式的事件监听器
        this.setupReadingModeEvents();
        
        // 恢复上次的阅读位置
        this.restoreReadingPosition();
        
        // 更新页面信息
        this.updateReadingPageInfo();
        
        console.log('✅ 已进入阅读模式');
    }

    async renderAllPagesForReading() {
        if (!this.currentPdf) return;
        
        // 设置分页显示，每次最多显示5页
        const PAGES_PER_BATCH = 5;
        const totalBatches = Math.ceil(this.totalPages / PAGES_PER_BATCH);
        
        console.log(`📄 智能分批渲染PDF (${this.totalPages}页, ${totalBatches}批, 每批${PAGES_PER_BATCH}页)`);
        
        // 清空滚动容器
        this.elements.pdfScrollView.innerHTML = '';
        
        // 初始化分页状态
        this.currentBatch = 1;
        this.pagesBatch = PAGES_PER_BATCH;
        this.totalBatches = totalBatches;
        this.isAutoLoading = false;
        
        // 添加分页导航（隐藏手动按钮，只显示信息）
        this.addPaginationInfo(totalBatches, PAGES_PER_BATCH);
        
        // 渲染第一批页面
        await this.renderPageBatch(1, PAGES_PER_BATCH);
        
        // 设置自动加载监听器
        this.setupAutoLoadListener();
    }

    // 添加分页信息显示（智能模式）
    addPaginationInfo(totalBatches, pagesPerBatch) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-info';
        paginationDiv.innerHTML = `
            <div class="batch-info">
                <span>智能加载模式 - 当前第 <span id="currentBatchInfo">1</span> 批，共 ${totalBatches} 批 (每批 ${pagesPerBatch} 页)</span>
                <div class="auto-load-indicator" id="autoLoadIndicator" style="display: none;">
                    <span>🔄 正在自动加载下一批...</span>
                </div>
            </div>
        `;
        
        // 插入到滚动容器的顶部，作为固定的信息面板
        this.elements.pdfScrollView.insertBefore(paginationDiv, this.elements.pdfScrollView.firstChild);
    }

    // 设置自动加载监听器
    setupAutoLoadListener() {
        if (!this.elements.readingContainer) return;
        
        // 移除旧的监听器（如果存在）
        if (this.autoLoadListener) {
            this.elements.readingContainer.removeEventListener('scroll', this.autoLoadListener);
        }
        
        // 创建防抖的滚动监听器
        this.autoLoadListener = this.debounce((e) => {
            this.checkAutoLoad();
        }, 100);
        
        this.elements.readingContainer.addEventListener('scroll', this.autoLoadListener);
        console.log('✅ 自动加载监听器已设置');
    }

    // 检查是否需要自动加载下一批
    async checkAutoLoad() {
        if (this.isAutoLoading || this.currentBatch >= this.totalBatches) return;
        
        const container = this.elements.readingContainer;
        if (!container) return;
        
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // 当滚动到85%位置时触发自动加载
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        
        // 优化：只有在确实需要时才进行加载，避免重复触发
        if (scrollPercentage >= 0.85 && !this._lastAutoLoadTrigger) {
            this._lastAutoLoadTrigger = true;
            console.log(`📖 触发自动加载：滚动进度 ${Math.round(scrollPercentage * 100)}%`);
            await this.autoLoadNextBatch();
            
            // 重置触发标志，为下次加载做准备
            setTimeout(() => {
                this._lastAutoLoadTrigger = false;
            }, 2000); // 2秒后重置
        }
    }

    // 自动加载下一批页面
    async autoLoadNextBatch() {
        if (this.isAutoLoading || this.currentBatch >= this.totalBatches) return;
        
        this.isAutoLoading = true;
        const nextBatch = this.currentBatch + 1;
        
        // 显示加载指示器
        const indicator = document.getElementById('autoLoadIndicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
        
        try {
            console.log(`🔄 自动加载第${nextBatch}批页面`);
            
            // 追加渲染新批次（不清除现有页面）
            await this.appendPageBatch(nextBatch, this.pagesBatch);
            
            // 更新状态
            this.currentBatch = nextBatch;
            const batchInfo = document.getElementById('currentBatchInfo');
            if (batchInfo) batchInfo.textContent = nextBatch;
            
            console.log(`✅ 第${nextBatch}批页面自动加载完成`);
            
        } catch (error) {
            console.error('自动加载失败:', error);
        } finally {
            this.isAutoLoading = false;
            // 隐藏加载指示器
            if (indicator) {
                // 延迟500ms隐藏，让用户能看到加载完成
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 500);
            }
        }
    }

    // 追加渲染页面批次（不清除现有内容）
    async appendPageBatch(batchNum, pagesPerBatch) {
        const startPage = (batchNum - 1) * pagesPerBatch + 1;
        const endPage = Math.min(startPage + pagesPerBatch - 1, this.totalPages);
        
        console.log(`📄 追加渲染第${batchNum}批页面: ${startPage}-${endPage}`);
        
        // 直接追加新页面，不清除现有页面
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            await this.renderSinglePage(pageNum);
        }
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 渲染指定批次的页面
    async renderPageBatch(batchNum, pagesPerBatch) {
        const startPage = (batchNum - 1) * pagesPerBatch + 1;
        const endPage = Math.min(startPage + pagesPerBatch - 1, this.totalPages);
        
        console.log(`📄 渲染第${batchNum}批页面`);
        
        // 清除之前的页面内容（保留分页控制）
        const existingPages = this.elements.pdfScrollView.querySelectorAll('.reading-page');
        existingPages.forEach(page => page.remove());
        
        // 渲染当前批次的页面
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            await this.renderSinglePage(pageNum);
        }
    }

    // 渲染单个页面
    async renderSinglePage(pageNum) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'reading-page';
        pageContainer.setAttribute('data-page', pageNum);
        
        const canvas = document.createElement('canvas');
        canvas.className = 'reading-canvas';
        canvas.id = `reading-canvas-${pageNum}`;
        
        try {
            const page = await this.currentPdf.getPage(pageNum);
            const viewport = page.getViewport({scale: this.readingScale});
            
            // 获取设备像素比以支持高DPI显示
            const devicePixelRatio = window.devicePixelRatio || 1;
            const scaledWidth = viewport.width * devicePixelRatio;
            const scaledHeight = viewport.height * devicePixelRatio;
            
            // 设置Canvas实际分辨率（高分辨率）
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            
            // 设置Canvas显示大小
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            
            const ctx = canvas.getContext('2d');
            
            // 缩放绘图上下文以匹配设备像素比
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // 添加页面涂改功能
            canvas.addEventListener('mousedown', (e) => {
                this.startDrawing(e, pageNum);
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (this.isDrawing) {
                    this.updateDrawing(e, pageNum);
                }
            });
            
            canvas.addEventListener('mouseup', async (e) => {
                await this.endDrawing(e, pageNum);
            });
            
            // 添加Canvas样式
            canvas.style.cursor = 'default';
            canvas.style.userSelect = 'none';
            
        } catch (error) {
            console.error(`渲染第${pageNum}页失败:`, error);
            // 创建错误提示
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `第${pageNum}页渲染失败`;
            errorDiv.className = 'page-error';
            pageContainer.appendChild(errorDiv);
            this.elements.pdfScrollView.appendChild(pageContainer);
            return;
        }
        
        pageContainer.appendChild(canvas);
        this.elements.pdfScrollView.appendChild(pageContainer);
    }

    setupReadingModeEvents() {
        console.log('🔧 设置阅读模式事件监听器');
        
        // 返回编辑模式
        if (this.elements.backToEditor) {
            this.elements.backToEditor.addEventListener('click', () => {
                this.exitReadingMode();
            });
            console.log('✅ 返回编辑按钮事件已绑定');
        }
        
        // 颜色标记按钮
        // 涂改工具事件
        if (this.elements.drawingPen) {
            this.elements.drawingPen.addEventListener('click', () => {
                this.activateDrawingTool('pen');
            });
        }
        
        if (this.elements.drawingEraser) {
            this.elements.drawingEraser.addEventListener('click', () => {
                this.activateDrawingTool('eraser');
            });
        }
        
        if (this.elements.drawingRect) {
            this.elements.drawingRect.addEventListener('click', () => {
                this.activateDrawingTool('rect');
            });
        }
        
        // 缩放控制
        this.elements.zoomInReading.addEventListener('click', () => {
            this.adjustReadingZoom(1.2);
        });
        
        this.elements.zoomOutReading.addEventListener('click', () => {
            this.adjustReadingZoom(0.8);
        });
        
        // 下载功能
        this.elements.downloadPdfReading.addEventListener('click', () => {
            this.downloadPDF();
        });
        
        // 重置阅读位置功能
        if (this.elements.resetReadingPosition) {
            this.elements.resetReadingPosition.addEventListener('click', () => {
                this.resetReadingPosition();
            });
            console.log('✅ 重置位置按钮事件已绑定');
        }
        
        // 转换为Word按钮
        if (this.elements.convertToWordReading) {
            this.elements.convertToWordReading.addEventListener('click', async () => {
                if (!this.currentPdf) {
                    this.showToast('请先打开PDF文件', 'warning');
                    return;
                }
                
                console.log('🔄 手动触发Word转换...');
                const contentAnalysis = await this.analyzePdfContent();
                this.convertToWord(contentAnalysis);
            });
            console.log('✅ 转换Word按钮事件已绑定');
        }
        
        // 支持滚轮缩放
        this.elements.readingContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                this.adjustReadingZoom(zoomFactor);
            }
        });
        
        // 监听滚动位置变化以保存阅读位置
        this.elements.readingContainer.addEventListener('scroll', () => {
            this.saveCurrentReadingPosition();
        });
        
        console.log('✅ 阅读模式事件监听器已设置');
    }

    // ===== 旧的标记功能已删除，替换为涂改功能 =====

    async adjustReadingZoom(factor) {
        console.log(`🎯 切换标记模式: ${type}，当前状态: 模式=${this.readingHighlightMode}, 类型=${this.readingHighlightType}`);
        
        // 切换标记模式
        if (this.readingHighlightMode && this.readingHighlightType === type) {
            // 退出标记模式
            this.readingHighlightMode = false;
            this.readingHighlightType = null;
            this.elements.highlightTextReading.classList.remove('active');
            this.elements.underlineTextReading.classList.remove('active');
            
            // 更新Canvas光标
            document.querySelectorAll('.reading-canvas').forEach(canvas => {
                canvas.style.cursor = 'default';
            });
            
            this.showToast('已退出标记模式', 'info');
            console.log('❌ 已退出标记模式');
        } else {
            // 进入标记模式
            this.readingHighlightMode = true;
            this.readingHighlightType = type;
            
            // 更新按钮状态
            this.elements.highlightTextReading.classList.toggle('active', type === 'highlight');
            this.elements.underlineTextReading.classList.toggle('active', type === 'underline');
            
            // 设置标记类型
            if (this.elements.readingHighlightType) {
                this.elements.readingHighlightType.value = type;
            }
            
            // 更新Canvas光标
            document.querySelectorAll('.reading-canvas').forEach(canvas => {
                canvas.style.cursor = 'crosshair';
            });
            
            const modeText = type === 'highlight' ? '颜色标记' : '下划线标记';
            this.showToast(`已进入${modeText}模式 - 请按住鼠标左键拖拽选择要标记的文本区域`, 'info');
            console.log(`✅ 进入${modeText}模式`);
        }
        
        console.log(`🎯 标记状态更新: 模式=${this.readingHighlightMode}, 类型=${this.readingHighlightType}`);
    }

    startReadingSelection(e, pageNum) {
        if (!this.readingHighlightMode) return;
        
        console.log('🖱️ 开始选择，页面:', pageNum);
        this.isReadingSelecting = true;
        this.readingSelectionPage = pageNum;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // 考虑Canvas实际显示大小与实际分辨率的比例
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        this.readingSelectionStart = {
            x: (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1),
            y: (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)
        };
        
        console.log('选择起点:', this.readingSelectionStart);
    }

    updateReadingSelection(e, pageNum) {
        if (!this.readingHighlightMode || !this.isReadingSelecting || pageNum !== this.readingSelectionPage) return;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // 考虑Canvas实际显示大小与实际分辨率的比例
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        this.readingSelectionEnd = {
            x: (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1),
            y: (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)
        };
        
        // 绘制选择框预览
        this.drawReadingSelectionPreview(canvas);
    }

    endReadingSelection(e, pageNum) {
        if (!this.readingHighlightMode || !this.isReadingSelecting || pageNum !== this.readingSelectionPage) return;
        
        this.isReadingSelecting = false;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // 考虑Canvas实际显示大小与实际分辨率的比例
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        this.readingSelectionEnd = {
            x: (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1),
            y: (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)
        };
        
        console.log('选择终点:', this.readingSelectionEnd);
        
        // 显示标记确认界面
        this.showReadingHighlightInput();
    }

    drawReadingSelectionPreview(canvas) {
        if (!this.readingSelectionStart || !this.readingSelectionEnd) return;
        
        // 重新渲染页面以清除之前的预览
        const pageNum = parseInt(canvas.id.split('-')[2]);
        this.rerenderReadingPage(pageNum);
        
        // 等待重新渲染完成后绘制选择框
        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            
            // 保存当前状态
            ctx.save();
            
            // 设置选择框样式
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
            ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
            ctx.setLineDash([5 * (window.devicePixelRatio || 1), 5 * (window.devicePixelRatio || 1)]);
            
            // 计算选择框尺寸（考虑设备像素比）
            const devicePixelRatio = window.devicePixelRatio || 1;
            const startX = this.readingSelectionStart.x * devicePixelRatio;
            const startY = this.readingSelectionStart.y * devicePixelRatio;
            const width = (this.readingSelectionEnd.x - this.readingSelectionStart.x) * devicePixelRatio;
            const height = (this.readingSelectionEnd.y - this.readingSelectionStart.y) * devicePixelRatio;
            
            ctx.strokeRect(startX, startY, width, height);
            
            // 恢复状态
            ctx.restore();
        }, 10);
    }

    async rerenderReadingPage(pageNum) {
        const canvas = document.getElementById(`reading-canvas-${pageNum}`);
        if (!canvas) return;
        
        try {
            const page = await this.currentPdf.getPage(pageNum);
            const viewport = page.getViewport({scale: this.readingScale});
            
            // 获取设备像素比以支持高DPI显示
            const devicePixelRatio = window.devicePixelRatio || 1;
            const scaledWidth = viewport.width * devicePixelRatio;
            const scaledHeight = viewport.height * devicePixelRatio;
            
            // 设置Canvas实际分辨率（高分辨率）
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            
            // 设置Canvas显示大小
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            
            const ctx = canvas.getContext('2d');
            
            // 缩放绘图上下文以匹配设备像素比
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
        } catch (error) {
            console.error(`重新渲染第${pageNum}页失败:`, error);
        }
    }

    showReadingHighlightInput() {
        this.elements.readingHighlightInput.style.display = 'block';
    }

    hideReadingHighlightInput() {
        this.elements.readingHighlightInput.style.display = 'none';
    }

    async confirmReadingHighlight() {
        if (!this.readingSelectionStart || !this.readingSelectionEnd || !this.pdfDoc) {
            this.showToast('请先选择要标记的区域', 'warning');
            return;
        }

        try {
            const highlightType = this.elements.readingHighlightType.value;
            const color = this.elements.readingHighlightColorPicker.value;
            const opacity = parseFloat(this.elements.readingHighlightOpacity.value);
            
            // 将颜色转换为RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;

            const pages = this.pdfDoc.getPages();
            const page = pages[this.readingSelectionPage - 1];
            
            // 计算标记区域
            const x = Math.min(this.readingSelectionStart.x, this.readingSelectionEnd.x) / this.readingScale;
            const y = Math.min(this.readingSelectionStart.y, this.readingSelectionEnd.y) / this.readingScale;
            const width = Math.abs(this.readingSelectionEnd.x - this.readingSelectionStart.x) / this.readingScale;
            const height = Math.abs(this.readingSelectionEnd.y - this.readingSelectionStart.y) / this.readingScale;

            if (highlightType === 'highlight') {
                // 绘制高亮矩形
                page.drawRectangle({
                    x: x,
                    y: page.getHeight() - y - height,
                    width: width,
                    height: height,
                    color: PDFLib.rgb(r, g, b),
                    opacity: opacity
                });
            } else if (highlightType === 'underline') {
                // 绘制下划线
                page.drawRectangle({
                    x: x,
                    y: page.getHeight() - y - height,
                    width: width,
                    height: 2,
                    color: PDFLib.rgb(r, g, b),
                    opacity: opacity
                });
            }

            // 🔥 关键修复：更新PDF显示以持久保存标记
            console.log('🔄 更新PDF文档显示以保存标记...');
            await this.updatePdfDisplay();
            
            // 重新渲染所有页面以显示标记
            console.log('🎨 重新渲染所有页面以显示标记...');
            await this.renderAllPagesForReading();
            
            this.hideReadingHighlightInput();
            this.readingSelectionStart = null;
            this.readingSelectionEnd = null;
            
            const modeText = highlightType === 'highlight' ? '高亮' : '下划线';
            this.showToast(`${modeText}标记添加成功，已保存到PDF中`, 'success');
            console.log(`✅ ${modeText}标记已成功添加并保存`);
        } catch (error) {
            console.error('添加标记失败:', error);
            this.showToast('添加标记失败', 'error');
        }
    }

    // ===== 涂改工具功能 =====
    
    activateDrawingTool(tool) {
        // 重置所有工具按钮状态
        document.querySelectorAll('.drawing-btn').forEach(btn => btn.classList.remove('active'));
        
        // 激活当前工具
        this.currentDrawingTool = tool;
        const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (toolBtn) toolBtn.classList.add('active');
        
        // 设置光标样式
        const cursor = tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'grab' : 'crosshair';
        document.querySelectorAll('.reading-canvas').forEach(canvas => {
            canvas.style.cursor = cursor;
        });
        
        // 静默切换，不显示提示
    }

    startDrawing(e, pageNum) {
        if (!this.currentDrawingTool) return;
        
        this.isDrawing = true;
        this.drawingPageNum = pageNum;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // 确保有涂改层
        this.ensureDrawingLayer(canvas, pageNum);
        
        // 考虑设备像素比和Canvas缩放
        const devicePixelRatio = window.devicePixelRatio || 1;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        this.lastDrawingPoint = {
            x: (e.clientX - rect.left) * (scaleX / devicePixelRatio),
            y: (e.clientY - rect.top) * (scaleY / devicePixelRatio)
        };
    }

    updateDrawing(e, pageNum) {
        if (!this.isDrawing || pageNum !== this.drawingPageNum || !this.currentDrawingTool) return;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // 考虑设备像素比和Canvas缩放
        const devicePixelRatio = window.devicePixelRatio || 1;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const currentPoint = {
            x: (e.clientX - rect.left) * (scaleX / devicePixelRatio),
            y: (e.clientY - rect.top) * (scaleY / devicePixelRatio)
        };
        
        // 在涂改层上绘制
        this.drawOnLayer(currentPoint, pageNum);
        
        this.lastDrawingPoint = currentPoint;
    }

    async endDrawing(e, pageNum) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // 💾 自动保存涂改标记到PDF文件
        await this.saveDrawingAnnotation(pageNum);
        
        this.drawingPageNum = null;
    }

    // 确保页面有涂改层
    ensureDrawingLayer(canvas, pageNum) {
        const layerId = `drawing-layer-${pageNum}`;
        let drawingLayer = document.getElementById(layerId);
        
        if (!drawingLayer) {
            drawingLayer = document.createElement('canvas');
            drawingLayer.id = layerId;
            drawingLayer.className = 'drawing-layer';
            
            // 设置Canvas尺寸与原Canvas完全一致
            drawingLayer.width = canvas.width;
            drawingLayer.height = canvas.height;
            
            // 获取Canvas的精确位置
            const canvasRect = canvas.getBoundingClientRect();
            const parentRect = canvas.parentNode.getBoundingClientRect();
            
            drawingLayer.style.position = 'absolute';
            drawingLayer.style.top = (canvasRect.top - parentRect.top) + 'px';
            drawingLayer.style.left = (canvasRect.left - parentRect.left) + 'px';
            drawingLayer.style.width = canvas.style.width;
            drawingLayer.style.height = canvas.style.height;
            drawingLayer.style.pointerEvents = 'none';
            drawingLayer.style.zIndex = '10';
            
            canvas.parentNode.appendChild(drawingLayer);
        }
        
        return drawingLayer;
    }

    drawOnLayer(currentPoint, pageNum) {
        const drawingLayer = document.getElementById(`drawing-layer-${pageNum}`);
        if (!drawingLayer) return;
        
        const ctx = drawingLayer.getContext('2d');
        const color = this.elements.drawingColor?.value || '#ff0000';
        const size = this.elements.drawingSize?.value || 3;
        
        // 考虑设备像素比例设置绘图上下文
        const devicePixelRatio = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (this.currentDrawingTool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
        } else if (this.currentDrawingTool === 'eraser') {
            // 橡皮擦只擦除涂改层，不影响PDF原始内容
            ctx.globalCompositeOperation = 'destination-out';
        }
        
        ctx.beginPath();
        ctx.moveTo(this.lastDrawingPoint.x, this.lastDrawingPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * 保存涂改标记直接到PDF文件
     * @param {number} pageNum - 页面号
     */
    async saveDrawingAnnotation(pageNum) {
        if (!this.currentDrawingTool || !this.pdfDoc) return;
        
        const drawingLayer = document.getElementById(`drawing-layer-${pageNum}`);
        if (!drawingLayer) return;
        
        try {
            // 直接将绘图层的内容保存到PDF文件中
            await this.saveDrawingLayerToPDF(pageNum, drawingLayer);
            
            console.log(`💾 涂改标记已保存到PDF文件: 页面${pageNum}`);
            
        } catch (error) {
            console.warn('保存涂改标记到PDF失败:', error);
        }
    }
    
    /**
     * 将绘图层内容保存到PDF文件
     * @param {number} pageNum - 页面号
     * @param {HTMLCanvasElement} drawingLayer - 绘图层canvas
     */
    async saveDrawingLayerToPDF(pageNum, drawingLayer) {
        if (!this.pdfDoc) return;
        
        try {
            // 获取绘图层的图像数据
            const imageData = drawingLayer.toDataURL('image/png');
            
            // 将base64数据转换为字节数组
            const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // 将图像嵌入到PDF中
            const embeddedImage = await this.pdfDoc.embedPng(bytes);
            
            // 获取目标页面
            const pages = this.pdfDoc.getPages();
            const page = pages[pageNum - 1];
            
            // 在页面上绘制标记图像（与原始尺寸对应）
            const pageHeight = page.getHeight();
            const pageWidth = page.getWidth();
            
            page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
                opacity: 1.0
            });
            
            // 更新PDF显示以保持同步
            await this.updatePdfDisplay();
            
            console.log(`✅ 第${pageNum}页涂改标记已保存到PDF文件`);
            
        } catch (error) {
            console.error('将绘图层保存到PDF失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取绘图范围
     * @param {HTMLCanvasElement} canvas - 绘图层canvas
     * @returns {Object} 绘图范围信息
     */
    getDrawingBounds(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width, minY = canvas.height;
        let maxX = 0, maxY = 0;
        
        // 找到非透明像素的范围
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    async adjustReadingZoom(factor) {
        this.readingScale *= factor;
        this.readingScale = Math.max(0.5, Math.min(3.0, this.readingScale));
        
        this.showToast(`缩放: ${Math.round(this.readingScale * 100)}%`, 'info');
        
        // 重新渲染所有页面
        await this.renderAllPagesForReading();
    }

    updateReadingPageInfo() {
        if (this.elements.readingPageInfo) {
            this.elements.readingPageInfo.textContent = `共 ${this.totalPages} 页`;
        }
    }

    // ===== 阅读位置管理功能 =====
    
    // 保存当前滚动位置
    saveCurrentReadingPosition() {
        if (!this.currentFileName || !this.elements.readingContainer) return;
        
        const scrollTop = this.elements.readingContainer.scrollTop;
        this.currentReadingPosition = scrollTop;
        this.readingPositionHistory.set(this.currentFileName, scrollTop);
        
        // 保存到localStorage以持久化
        const positions = Object.fromEntries(this.readingPositionHistory);
        localStorage.setItem('pdf-reading-positions', JSON.stringify(positions));
        
        // 防抖，避免过度频繁的日志
        if (!this._lastSaveTime || Date.now() - this._lastSaveTime > 1000) {
            console.log(`💾 保存阅读位置: ${this.currentFileName} -> ${scrollTop}px`);
            this._lastSaveTime = Date.now();
        }
    }
    
    // 恢复上次的阅读位置
    restoreReadingPosition() {
        if (!this.currentFileName || !this.elements.readingContainer) return;
        
        // 从localStorage恢复历史记录
        try {
            const savedPositions = localStorage.getItem('pdf-reading-positions');
            if (savedPositions) {
                const positions = JSON.parse(savedPositions);
                this.readingPositionHistory = new Map(Object.entries(positions));
            }
        } catch (error) {
            console.warn('恢复阅读位置历史失败:', error);
        }
        
        // 获取当前文件的上次位置
        const lastPosition = this.readingPositionHistory.get(this.currentFileName);
        
        if (lastPosition && lastPosition > 0) {
            // 延迟滚动，确保页面已完全渲染
            setTimeout(() => {
                this.elements.readingContainer.scrollTop = lastPosition;
                console.log(`📖 恢复阅读位置: ${this.currentFileName} -> ${lastPosition}px`);
                this.showToast(`已恢复到上次阅读位置`, 'info');
            }, 500);
        } else {
            console.log(`📖 新文件，从头开始: ${this.currentFileName}`);
        }
    }
    
    // 重置当前文件的阅读位置
    resetReadingPosition() {
        if (!this.currentFileName) return;
        
        this.readingPositionHistory.delete(this.currentFileName);
        this.currentReadingPosition = 0;
        
        // 更新localStorage
        const positions = Object.fromEntries(this.readingPositionHistory);
        localStorage.setItem('pdf-reading-positions', JSON.stringify(positions));
        
        // 滚动到顶部
        if (this.elements.readingContainer) {
            this.elements.readingContainer.scrollTop = 0;
        }
        
        console.log(`🔄 重置阅读位置: ${this.currentFileName}`);
        this.showToast('已重置到文档开头', 'info');
    }
    
    // 获取当前页面编号（基于滚动位置）
    getCurrentPageFromScroll() {
        if (!this.elements.readingContainer || !this.totalPages) return 1;
        
        const scrollTop = this.elements.readingContainer.scrollTop;
        const scrollHeight = this.elements.readingContainer.scrollHeight;
        const clientHeight = this.elements.readingContainer.clientHeight;
        
        // 计算滚动进度（0-1）
        const scrollProgress = scrollTop / (scrollHeight - clientHeight);
        
        // 基于滚动进度估算当前页面
        const estimatedPage = Math.floor(scrollProgress * this.totalPages) + 1;
        return Math.min(Math.max(estimatedPage, 1), this.totalPages);
    }

    exitReadingMode() {
        console.log('🚪 退出阅读模式');
        
        // 隐藏阅读模式界面
        this.elements.readingMode.style.display = 'none';
        
        // 显示主编辑界面
        document.querySelector('.container').style.display = 'block';
        
        // 显示传统编辑界面
        this.elements.controlPanel.style.display = 'block';
        this.elements.viewerSection.style.display = 'block';
        
        // 渲染当前页面到编辑模式
        this.renderPage(this.currentPage);
        this.updatePageInfo();
        
        // 重置阅读模式状态
        this.isReadingMode = false;
        this.readingHighlightMode = false;
        
        this.showToast('已退出阅读模式', 'info');
    }

    // 在clearAll方法中重置阅读模式状态
    resetReadingMode() {
        this.isReadingMode = false;
        this.readingScale = 1.2;
        this.readingHighlightMode = false;
        this.readingHighlightType = null;
        this.isReadingSelecting = false;
        this.readingSelectionPage = null;
        this.readingSelectionStart = null;
        this.readingSelectionEnd = null;
        
        if (this.elements.readingMode) {
            this.elements.readingMode.style.display = 'none';
        }
    }

    // ===== PDF内容类型分析功能 =====
    
    /**
     * 分析PDF内容类型，判断主要是文本还是图片
     * @returns {Promise<Object>} 包含内容分析结果的对象
     */
    async analyzePdfContent() {
        if (!this.currentPdf) {
            return {
                primaryType: 'unknown',
                textPages: 0,
                imagePages: 0,
                totalPages: 0,
                textRatio: 0,
                imageRatio: 0,
                recommendWordConversion: false,
                details: []
            };
        }

        console.log('🔍 开始分析PDF内容类型...');
        const analysis = {
            primaryType: 'text',
            textPages: 0,
            imagePages: 0,
            totalPages: this.totalPages,
            textRatio: 0,
            imageRatio: 0,
            recommendWordConversion: false,
            details: []
        };

        try {
            // 分析每一页的内容
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const pageAnalysis = await this.analyzePageContent(pageNum);
                analysis.details.push(pageAnalysis);
                
                if (pageAnalysis.hasSignificantText) {
                    analysis.textPages++;
                } else {
                    analysis.imagePages++;
                }
                
                console.log(`📄 第${pageNum}页分析完成`);
            }

            // 计算比例
            analysis.textRatio = analysis.textPages / analysis.totalPages;
            analysis.imageRatio = analysis.imagePages / analysis.totalPages;
            
            // 判断主要类型
            if (analysis.textRatio >= 0.7) {
                analysis.primaryType = '文本内容';
                analysis.recommendWordConversion = true;
            } else if (analysis.imageRatio >= 0.7) {
                analysis.primaryType = '图片内容';
                analysis.recommendWordConversion = true; // 需要OCR转换
            } else {
                analysis.primaryType = '混合内容';
                analysis.recommendWordConversion = true;
            }

            console.log(`✅ PDF内容分析完成: ${analysis.primaryType} (文本页面: ${analysis.textPages}/${analysis.totalPages})`);
            return analysis;

        } catch (error) {
            console.error('分析PDF内容失败:', error);
            return {
                primaryType: 'error',
                textPages: 0,
                imagePages: 0,
                totalPages: this.totalPages,
                textRatio: 0,
                imageRatio: 0,
                recommendWordConversion: false,
                details: [],
                error: error.message
            };
        }
    }

    /**
     * 分析单页内容
     * @param {number} pageNum - 页面编号
     * @returns {Promise<Object>} 页面分析结果
     */
    async analyzePageContent(pageNum) {
        try {
            const page = await this.currentPdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // 计算文本内容
            let textLength = 0;
            let textItems = 0;
            
            if (textContent && textContent.items) {
                textItems = textContent.items.length;
                textLength = textContent.items.reduce((total, item) => {
                    return total + (item.str ? item.str.trim().length : 0);
                }, 0);
            }
            
            // 判断是否有显著的文本内容
            // 如果文本字符数 > 100 或者有 > 10 个文本项，认为是文本页面
            const hasSignificantText = textLength > 100 || textItems > 10;
            
            return {
                pageNum,
                textLength,
                textItems,
                hasSignificantText,
                analysis: hasSignificantText ? 'text-dominant' : 'image-dominant'
            };
            
        } catch (error) {
            console.warn(`分析第${pageNum}页内容失败:`, error);
            return {
                pageNum,
                textLength: 0,
                textItems: 0,
                hasSignificantText: false,
                analysis: 'unknown',
                error: error.message
            };
        }
    }

    /**
     * 显示Word转换选项
     * @param {Object} contentAnalysis - 内容分析结果
     */
    showWordConversionOptions(contentAnalysis) {
        // 创建模态框显示转换选项
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const isImageDominant = contentAnalysis.primaryType === '图片内容';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🔄 转换为Word文档</h2>
                <div class="conversion-info">
                    <p><strong>PDF内容分析：</strong></p>
                    <ul>
                        <li>主要内容类型：${contentAnalysis.primaryType}</li>
                        <li>文本页面：${contentAnalysis.textPages}/${contentAnalysis.totalPages}</li>
                        <li>图片页面：${contentAnalysis.imagePages}/${contentAnalysis.totalPages}</li>
                    </ul>
                    ${isImageDominant ? '<p style="color: orange;">⚠️ 检测到主要为图片内容，将使用OCR技术识别文字</p>' : ''}
                </div>
                <div class="conversion-options">
                    <button id="convertToWordBtn" class="btn btn-primary">
                        ${isImageDominant ? '🔍 OCR识别并转换为Word' : '📝 转换为Word文档'}
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加转换按钮事件
        document.getElementById('convertToWordBtn').addEventListener('click', () => {
            modal.remove();
            this.convertToWord(contentAnalysis);
        });
    }

    // ===== OCR和Word转换功能 =====
    
    /**
     * 转换PDF为Word文档
     * @param {Object} contentAnalysis - 内容分析结果
     */
    async convertToWord(contentAnalysis) {
        // 显示详细进度条
        this.showConversionProgress();
        
        try {
            const isImageDominant = contentAnalysis.primaryType === '图片内容';
            
            if (isImageDominant) {
                // 图片PDF不再使用OCR，提示用户使用涂改功能
                this.hideConversionProgress();
                this.showToast('检测到图片内容，建议使用涂改工具进行标注后保存', 'info');
                return;
            }
            
            // 只处理文本PDF
            this.updateProgress(0, `正在提取${this.totalPages}页文本内容...`, '准备文本提取');
            const documentContent = await this.extractTextFromPDF();
            
            // 生成Word文档
            this.updateProgress(90, '正在生成Word文档...', '创建文档结构');
            await this.generateWordDocument(documentContent);
            
            this.updateProgress(100, '转换完成！', '文档已保存');
            
            // 延迟关闭进度条
            setTimeout(() => {
                this.hideConversionProgress();
                this.showToast('Word文档转换完成！', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('转换Word文档失败:', error);
            this.hideConversionProgress();
            this.showToast(`转换失败: ${error.message}`, 'error');
        }
    }

    /**
     * 直接从PDF提取文本
     * @returns {Promise<Array>} 包含每页提取的文本
     */
    async extractTextFromPDF() {
        const extractedContent = [];
        
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            try {
                const progress = Math.round((pageNum - 1) / this.totalPages * 80); // 文本提取占80%
                this.updateProgress(progress, `正在提取第${pageNum}页文本...`, `共${this.totalPages}页`);
                
                const page = await this.currentPdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                let pageText = '';
                if (textContent && textContent.items) {
                    pageText = textContent.items.map(item => item.str).join(' ');
                }
                
                extractedContent.push({
                    pageNum,
                    text: pageText.trim(),
                    method: 'direct'
                });
                
            } catch (error) {
                extractedContent.push({
                    pageNum,
                    text: `[第${pageNum}页文本提取失败: ${error.message}]`,
                    method: 'error'
                });
            }
        }
        
        return extractedContent;
    }

    /**
     * 生成Word文档
     * @param {Array} documentContent - 文档内容数组
     */
    async generateWordDocument(documentContent) {
        console.log('📝 开始生成Word文档...');
        
        // 创建Word文档实例
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    // 添加标题
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: `PDF转换为Word文档 - ${this.currentFileName || '未知文件'}`,
                                bold: true,
                                size: 32
                            })
                        ],
                        spacing: { after: 400 }
                    }),
                    
                    // 添加转换信息
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: `转换时间: ${new Date().toLocaleString('zh-CN')}`,
                                italics: true,
                                size: 20
                            })
                        ],
                        spacing: { after: 600 }
                    }),
                    
                    // 添加每页内容
                    ...documentContent.flatMap(page => [
                        // 页面标题
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: `第${page.pageNum}页 (文本提取)`,
                                    bold: true,
                                    size: 24
                                })
                            ],
                            spacing: { before: 400, after: 200 }
                        }),
                        
                        // 页面内容
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: page.text || '[此页无内容]',
                                    size: 22
                                })
                            ],
                            spacing: { after: 400 }
                        })
                    ])
                ]
            }]
        });
        
        // 生成Word文件
        const buffer = await docx.Packer.toBlob(doc);
        
        // 下载文件
        const fileName = (this.currentFileName || 'converted').replace('.pdf', '') + '_转换为Word.docx';
        this.downloadBlob(buffer, fileName);
        
        console.log('✅ Word文档生成完成');
    }

    /**
     * 下载Blob数据
     * @param {Blob} blob - 数据blob
     * @param {string} fileName - 文件名
     */
    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== 转换进度条功能 =====
    
    /**
     * 显示转换进度条
     */
    showConversionProgress() {
        // 移除已存在的进度条
        const existingProgress = document.querySelector('.conversion-progress');
        if (existingProgress) {
            existingProgress.remove();
        }
        
        const progressDiv = document.createElement('div');
        progressDiv.className = 'conversion-progress';
        progressDiv.innerHTML = `
            <div class="progress-content">
                <h3>🔄 正在转换为Word文档</h3>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="progressText">准备开始...</div>
                <div class="progress-details" id="progressDetails">请等待转换完成</div>
            </div>
        `;
        
        document.body.appendChild(progressDiv);
    }
    
    /**
     * 更新进度条
     * @param {number} percent - 进度百分比 (0-100)
     * @param {string} message - 主要消息
     * @param {string} details - 详细信息
     */
    updateProgress(percent, message, details = '') {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        if (progressDetails) {
            progressDetails.textContent = details;
        }
    }
    
    /**
     * 隐藏转换进度条
     */
    hideConversionProgress() {
        const progressDiv = document.querySelector('.conversion-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }
    
    // ===== 标记管理系统（直接保存到PDF） =====
    
    /**
     * 初始化标记系统（简化版）
     */
    initAnnotationSystem() {
        console.log('🔖 初始化标记管理系统 (直接保存到PDF)...');
        
        // 重置绘图层
        this.drawingLayers.clear();
        
        // 清理旧的localStorage数据（如果存在）
        try {
            localStorage.removeItem('pdf-annotation-history');
        } catch (error) {
            // 忽略错误
        }
        
        console.log('✅ 标记系统初始化完成 - 标记将直接保存到PDF文件');
    }
    
    /**
     * 当文件被加载时，初始化文件的标记系统（简化版）
     * @param {File} file - PDF文件对象
     */
    initFileAnnotations(file) {
        this.currentFileName = file.name;
        this.currentFileHash = this.generateFileHash(file.name, file.size);
        
        console.log(`🔖 为文件 ${this.currentFileName} 初始化标记系统 (${this.currentFileHash})`);
        
        // 重置绘图层
        this.drawingLayers.clear();
        
        // 不再依赖localStorage，标记直接保存在PDF文件中
        console.log('📝 标记将直接保存到PDF文件中');
    }
    
    /**
     * 生成文件的唯一标识符
     * @param {string} fileName - 文件名
     * @param {number} fileSize - 文件大小
     * @returns {string} 文件哈希值
     */
    generateFileHash(fileName, fileSize) {
        // 简单的哈希生成（结合文件名和大小）
        const hashString = `${fileName}_${fileSize}_${Date.now()}`;
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
            const char = hashString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }
    
}

// 当页面加载完成后初始化PDF编辑器
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM内容已加载，初始化PDF编辑器...');
    
    // 确保所有元素都已加载
    setTimeout(() => {
        const pdfEditor = new PDFEditor();
        // 将实例暴露到全局作用域以便调试
        window.pdfEditor = pdfEditor;
        
        console.log('✅ PDF编辑器已初始化');
        console.log('🔧 调试命令:');
        console.log('  - pdfEditor.debugFunctions() 查看状态');
        console.log('  - pdfEditor.validateElements() 验证元素');
        console.log('📂 紧急修复页面: http://127.0.0.1:5173/emergency-fix.html');
        
        // 检查上传功能是否正常
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (!uploadArea || !fileInput) {
            console.error('❌ 关键上传元素缺失！');
            console.log('🔧 请访问紧急修复页面: emergency-fix.html');
        } else {
            // 添加额外的安全检查
            if (uploadArea.onclick === null) {
                console.warn('⚠️ 上传区域点击事件未绑定，尝试手动绑定...');
                uploadArea.addEventListener('click', () => {
                    console.log('📂 手动绑定的点击事件触发');
                    fileInput.click();
                });
            }
        }
        
    }, 100); // 短暂延迟确保DOM完全加载
});

// 备用初始化（如果DOMContentLoaded已经触发）
if (document.readyState === 'loading') {
    console.log('⏳ 等待DOM加载完成...');
} else {
    console.log('✅ DOM已就绪，立即初始化');
    setTimeout(() => {
        if (!window.pdfEditor) {
            const pdfEditor = new PDFEditor();
            window.pdfEditor = pdfEditor;
            console.log('🔄 备用初始化完成');
        }
    }, 50);
}

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('❌ 全局错误:', e.error);
    if (e.error.message.includes('pdfEditor') || e.error.message.includes('uploadArea')) {
        console.log('🚨 检测到PDF编辑器相关错误');
        console.log('🔧 请访问紧急修复页面: emergency-fix.html');
    }
});

// 导出调试函数到全局
window.debugPDFEditor = function() {
    if (window.pdfEditor) {
        window.pdfEditor.debugFunctions();
    } else {
        console.error('❌ PDF编辑器实例未找到');
    }
};