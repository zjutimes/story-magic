import express, { Request, Response } from 'express';
import { ensureDirSync, writeFileSync } from 'fs-extra';
import path from 'path';

const publishRouter = express.Router();

// 获取亚马逊出版规格
publishRouter.get('/specs', async (_req: Request, res: Response) => {
  const specs = {
    standardSizes: [
      { name: '8.5" x 8.5"', description: '正方形精装书', pages: '20-28页', dpi: 300 },
      { name: '8" x 10"', description: '矩形平装书', pages: '24-32页', dpi: 300 },
      { name: '11" x 8.5"', description: '横向大尺寸', pages: '24-32页', dpi: 300 },
    ],
    requirements: {
      cover: '300 DPI, CMYK颜色模式',
      interior: '300 DPI, RGB颜色模式',
      format: 'PDF或EPUB',
      bleed: '0.125" (3mm)',
      margin: '0.25" (6mm) 内部边距',
    }
  };
  res.json({ success: true, specs });
});

// 生成出版级书籍HTML
publishRouter.post('/generate-book-pdf', async (req: Request, res: Response) => {
  try {
    const { story, size = '8.5x8.5', includeCover = true } = req.body;
    console.log('收到生成书籍请求:', story?.title, '尺寸:', size);

    if (!story || !story.pages) {
      return res.status(400).json({ error: '请提供有效的故事内容' });
    }

    // 尺寸映射（英寸转像素 @ 300 DPI）
    const sizeMap: Record<string, { width: number, height: number, name: string }> = {
      '8.5x8.5': { width: 2550, height: 2550, name: '8.5x8.5英寸' },
      '8x10': { width: 2400, height: 3000, name: '8x10英寸' },
      '11x8.5': { width: 3300, height: 2550, name: '11x8.5英寸' },
    };

    const bookSize = sizeMap[size] || sizeMap['8.5x8.5'];
    const margin = 75; // 0.25" * 300 = 75px

    // 生成HTML内容
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${story.title || 'My Picture Book'}</title>
  <style>
    @page { size: ${bookSize.width}px ${bookSize.height}px; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; background: white; }
    .page { width: ${bookSize.width}px; height: ${bookSize.height}px; position: relative; overflow: hidden; page-break-after: always; }
    .cover { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: ${margin * 2}px; }
    .cover-title { font-size: ${Math.floor(bookSize.width / 10)}px; color: white; font-weight: bold; text-shadow: 2px 2px 8px rgba(0,0,0,0.3); margin-bottom: 40px; }
    .cover-author { font-size: ${Math.floor(bookSize.width / 15)}px; color: rgba(255,255,255,0.9); }
    .cover-badge { position: absolute; bottom: ${margin}px; font-size: 24px; color: rgba(255,255,255,0.8); }
    .interior-page { display: flex; flex-direction: column; align-items: center; padding: ${margin}px; background: #fffef8; }
    .page-number { position: absolute; bottom: ${margin / 2}px; font-size: 24px; color: #666; }
    .story-text { font-size: ${Math.floor(bookSize.width / 22)}px; color: #333; text-align: center; line-height: 1.8; max-width: ${bookSize.width - margin * 4}px; margin-top: auto; margin-bottom: auto; }
    .illustration-img { width: ${bookSize.width - margin * 2}px; height: ${bookSize.height - margin * 3 - bookSize.height / 3}px; object-fit: contain; }
    .end-page { background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: white; }
  </style>
</head>
<body>
`;

    // 封面
    if (includeCover) {
      html += `
  <div class="page cover">
    <div class="cover-title">${story.title || 'My Story'}</div>
    <div class="cover-author">By Story Magic</div>
    <div class="cover-badge">A Children's Picture Book</div>
  </div>
`;
    }

    // 故事页面
    for (let i = 0; i < story.pages.length; i++) {
      const page = story.pages[i];
      html += `
  <div class="page interior-page">
    ${page.imageUrl 
      ? `<img src="${page.imageUrl}" class="illustration-img" alt="illustration">` 
      : `<div style="width:100%;height:60%;background:#f0f0f0;display:flex;justify-content:center;align-items:center;color:#999;">Illustration ${i + 1}</div>`
    }
    <p class="story-text">${page.text || ''}</p>
    <div class="page-number">${i + (includeCover ? 1 : 0)}</div>
  </div>
`;
    }

    // 封底
    if (includeCover) {
      html += `
  <div class="page end-page">
    <div style="font-size: 48px; margin-bottom: 30px;">The End</div>
    <div style="font-size: 24px; opacity: 0.8;">Thank you for reading!</div>
    <div style="font-size: 18px; opacity: 0.6; margin-top: 60px;">Created with Story Magic</div>
  </div>
`;
    }

    html += `
</body>
</html>`;

    // 保存HTML文件
    const outputDir = path.join(process.cwd(), 'public', 'books');
    ensureDirSync(outputDir);
    const storyId = story.id || Date.now().toString();
    const htmlPath = path.join(outputDir, `book_${storyId}.html`);
    writeFileSync(htmlPath, html, 'utf-8');

    const bookUrl = `/books/book_${storyId}.html`;
    console.log('书籍生成成功:', bookUrl);

    res.json({ 
      success: true, 
      bookUrl,
      bookSize: bookSize.name,
      pages: story.pages.length + (includeCover ? 2 : 0),
      message: '书籍已生成，可在浏览器中打印为PDF'
    });

  } catch (error: any) {
    console.error('生成书籍失败:', error);
    res.status(500).json({ error: '生成书籍失败，请重试' });
  }
});

export default publishRouter;
