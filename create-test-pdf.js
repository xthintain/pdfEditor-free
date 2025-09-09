const PDFLib = require('pdf-lib');
const fs = require('fs');

async function createTestPDF() {
    // 创建新的PDF文档
    const pdfDoc = await PDFLib.PDFDocument.create();
    
    // 嵌入字体
    const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    
    // 添加第一页
    const page1 = pdfDoc.addPage([595, 842]); // A4尺寸
    const { width, height } = page1.getSize();
    
    // 添加标题
    page1.drawText('PDF Editor Reading Mode Test Document', {
        x: 50,
        y: height - 100,
        size: 24,
        font: helveticaBold,
        color: PDFLib.rgb(0, 0.2, 0.8)
    });
    
    // 添加副标题
    page1.drawText('Focused Reading Mode Feature Test', {
        x: 50,
        y: height - 140,
        size: 14,
        font: helveticaFont,
        color: PDFLib.rgb(0.3, 0.3, 0.3)
    });
    
    // 添加正文内容
    const content = [
        'Welcome to PDF Editor Focused Reading Mode!',
        '',
        'New reading mode features:',
        '• Auto fullscreen scrollable view mode',
        '• Hide unnecessary editing buttons',
        '• Support color highlight text marking',
        '• Support underline text marking',
        '• Smooth mouse wheel zoom function',
        '• Beautiful interface design',
        '',
        'How to use:',
        '1. Upload PDF file to auto enter reading mode',
        '2. Use mouse wheel to browse all pages',
        '3. Click color highlight button to enter mark mode',
        '4. Drag to select text area to highlight',
        '5. Choose highlight color and opacity',
        '6. Confirm highlight to complete',
        '',
        'Technical implementation:',
        '• Canvas-based rendering of all PDF pages',
        '• Mouse event handling for text selection',
        '• PDF-lib implementation of marking function',
        '• Responsive design for different screens'
    ];
    
    let yPosition = height - 200;
    content.forEach(line => {
        page1.drawText(line, {
            x: 50,
            y: yPosition,
            size: 12,
            font: helveticaFont,
            color: PDFLib.rgb(0, 0, 0)
        });
        yPosition -= 20;
    });
    
    // 添加第二页
    const page2 = pdfDoc.addPage([595, 842]);
    
    page2.drawText('Page 2 - More Test Content', {
        x: 50,
        y: height - 100,
        size: 20,
        font: helveticaBold,
        color: PDFLib.rgb(0.8, 0.2, 0)
    });
    
    const page2Content = [
        'This is page 2 content for testing multi-page PDF scroll view.',
        '',
        'You can test the following features on this page:',
        '',
        'Color highlighting test:',
        '• Try to highlight this text with yellow color',
        '• Adjust opacity to see effect changes',
        '• Test different color highlight effects',
        '',
        'Underline marking test:',
        '• Select important sentences for underline marking',
        '• Test red underline effects',
        '• Try blue underline marking',
        '',
        'Zoom function test:',
        '• Hold Ctrl key and scroll mouse wheel',
        '• Observe page zoom effects',
        '• Test maximum and minimum zoom levels',
        '',
        'Interface interaction test:',
        '• Click back to editor button to switch modes',
        '• Test download PDF function',
        '• Verify all buttons respond correctly'
    ];
    
    yPosition = height - 150;
    page2Content.forEach(line => {
        page2.drawText(line, {
            x: 50,
            y: yPosition,
            size: 12,
            font: helveticaFont,
            color: PDFLib.rgb(0, 0, 0)
        });
        yPosition -= 18;
    });
    
    // 添加第三页
    const page3 = pdfDoc.addPage([595, 842]);
    
    page3.drawText('Page 3 - Long Text Scroll Test', {
        x: 50,
        y: height - 100,
        size: 20,
        font: helveticaBold,
        color: PDFLib.rgb(0.2, 0.6, 0.2)
    });
    
    const page3Content = [
        'This is page 3, specially for testing long document scroll experience.',
        '',
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
        'Laboris nisi ut aliquip ex ea commodo consequat.',
        '',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse',
        'cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat',
        'cupidatat non proident, sunt in culpa qui officia deserunt',
        'mollit anim id est laborum.',
        '',
        'Feature completeness test:',
        '1. Scroll view: Scroll from first page to last page',
        '2. Marking function: Text marking on different pages',
        '3. Zoom test: Test various zoom ratios',
        '4. Interface response: Test all buttons and controls',
        '5. Mode switching: Switch between reading and editing modes',
        '',
        'Additional testing scenarios:',
        '• Test text selection accuracy',
        '• Verify highlight color persistence',
        '• Check underline positioning',
        '• Validate zoom level limits',
        '• Confirm smooth scrolling performance'
    ];
    
    yPosition = height - 150;
    page3Content.forEach(line => {
        page3.drawText(line, {
            x: 50,
            y: yPosition,
            size: 12,
            font: helveticaFont,
            color: PDFLib.rgb(0, 0, 0)
        });
        yPosition -= 18;
    });
    
    // 添加页脚
    [page1, page2, page3].forEach((page, index) => {
        page.drawText(`Page ${index + 1} - PDF Editor Reading Mode Test`, {
            x: 50,
            y: 30,
            size: 10,
            font: helveticaFont,
            color: PDFLib.rgb(0.5, 0.5, 0.5)
        });
        
        page.drawText(`Generated: ${new Date().toLocaleString('en-US')}`, {
            x: width - 200,
            y: 30,
            size: 10,
            font: helveticaFont,
            color: PDFLib.rgb(0.5, 0.5, 0.5)
        });
    });
    
    // 保存PDF
    const pdfBytes = await pdfDoc.save();
    
    // 写入文件
    fs.writeFileSync('reading-mode-test.pdf', pdfBytes);
    console.log('✅ Test PDF file generated: reading-mode-test.pdf');
}

createTestPDF().catch(console.error);