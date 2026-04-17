import { Router, Request, Response } from 'express';
import { LLMClient, Config, HeaderUtils, ImageGenerationClient } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化 LLM 客户端
const llmConfig = new Config();

// 初始化图片生成客户端
const imageConfig = new Config();

interface StoryPage {
  page: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface Story {
  title: string;
  pages: StoryPage[];
}

// 生成故事内容
router.post('/api/story/generate', async (req: Request, res: Response) => {
  try {
    const { theme } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 更新客户端的 headers
    const client = new LLMClient(llmConfig, customHeaders);

    if (!theme) {
      res.status(400).json({ error: '请提供故事主题' });
      return;
    }

    // 构建提示词，让 LLM 生成儿童绘本内容
    const prompt = `你是一位优秀的儿童绘本作家。请为 "${theme}" 这个主题创作一个温馨、有教育意义的儿童绘本故事。

要求：
1. 故事适合3-8岁儿童
2. 故事要有教育意义，传递正能量
3. 故事篇幅控制在6页左右
4. 每页文字不超过30个字，要简洁易懂
5. 每页需要提供英文图片描述词（用于AI画图），风格是儿童绘本插画风格

请按以下JSON格式输出：
{
  "title": "故事标题",
  "pages": [
    {
      "page": 1,
      "text": "这页的文字内容（中文，不超过30字）",
      "imagePrompt": "英文的图片描述词，用于AI生成插图，风格是可爱温馨的儿童绘本插画风格"
    }
  ]
}`;

    const messages = [{ role: 'user' as const, content: prompt }];
    const response = await client.invoke(messages, { 
      model: 'doubao-seed-1-6-251015',
      temperature: 0.8 
    });

    // 解析 LLM 返回的 JSON
    let story: Story;
    try {
      // 尝试提取 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        story = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析故事内容');
      }
    } catch (parseError) {
      console.error('JSON 解析错误:', parseError);
      res.status(500).json({ error: '故事生成失败，请重试' });
      return;
    }

    res.json({ success: true, story });
  } catch (error) {
    console.error('生成故事失败:', error);
    res.status(500).json({ error: '生成故事失败，请重试' });
  }
});

// 为故事生成插图
router.post('/api/story/generate-illustrations', async (req: Request, res: Response) => {
  try {
    const { story } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 更新图片客户端的 headers
    const client = new ImageGenerationClient(imageConfig, customHeaders);

    if (!story || !story.pages) {
      res.status(400).json({ error: '故事数据无效' });
      return;
    }

    // 逐页生成插图
    const updatedPages: StoryPage[] = [];
    
    for (const page of story.pages) {
      try {
        console.log(`正在生成第 ${page.page} 页插图...`);
        
        // 增强图片提示词，使其更适合儿童绘本
        const enhancedPrompt = `${page.imagePrompt}, children's book illustration style, cute, colorful, warm, soft lighting, hand-drawn style, watercolor effect, adorable characters, pastel colors, whimsical, enchanting atmosphere`;

        const response = await client.generate({
          prompt: enhancedPrompt,
          size: '2K',
        });

        const helper = client.getResponseHelper(response);

        if (helper.success && helper.imageUrls.length > 0) {
          updatedPages.push({
            ...page,
            imageUrl: helper.imageUrls[0],
          });
        } else {
          // 如果图片生成失败，仍保留页面内容
          updatedPages.push({
            ...page,
            imageUrl: '',
          });
        }

        // 添加短暂延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (imgError) {
        console.error(`生成第 ${page.page} 页插图失败:`, imgError);
        updatedPages.push({
          ...page,
          imageUrl: '',
        });
      }
    }

    res.json({ 
      success: true, 
      story: {
        ...story,
        pages: updatedPages
      } 
    });
  } catch (error) {
    console.error('生成插图失败:', error);
    res.status(500).json({ error: '生成插图失败，请重试' });
  }
});

// 根据故事文字生成图片（简化版：一段文字 -> 一张图片）
router.post('/api/story/generate-image', async (req: Request, res: Response) => {
  try {
    const { storyText, style } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!storyText) {
      res.status(400).json({ error: '请提供故事文字' });
      return;
    }

    // 初始化 LLM 客户端
    const llmClient = new LLMClient(llmConfig, customHeaders);
    
    // 初始化图片生成客户端
    const imgClient = new ImageGenerationClient(imageConfig, customHeaders);

    console.log('正在根据故事生成图片描述...');

    // 使用 LLM 将故事文字转换成图片描述
    const promptConvert = `你是一位专业的儿童绘本插画家。请根据以下故事文字，生成一个详细的英文图片描述词，用于 AI 画图。

要求：
1. 描述要生动、具体、适合画图
2. 风格：儿童绘本插画风格（cute, colorful, warm, soft lighting）
3. 突出故事中的主要角色和场景
4. 不要包含文字或对话气泡

故事文字：
"${storyText}"

请直接输出英文描述，不要其他内容，控制在 100 词以内。`;

    const messages = [{ role: 'user' as const, content: promptConvert }];
    const llmResponse = await llmClient.invoke(messages, { 
      model: 'doubao-seed-1-6-251015',
      temperature: 0.7 
    });

    // 提取图片描述
    let imagePrompt = llmResponse.content.trim();
    
    // 增强提示词
    const enhancedPrompt = `${imagePrompt}, children's book illustration style, cute, colorful, warm, soft lighting, hand-drawn style, watercolor effect, adorable characters, pastel colors, whimsical, enchanting atmosphere, high quality`;

    console.log('图片描述:', enhancedPrompt);

    // 生成图片
    const imgResponse = await imgClient.generate({
      prompt: enhancedPrompt,
      size: '2K',
    });

    const helper = imgClient.getResponseHelper(imgResponse);

    if (helper.success && helper.imageUrls.length > 0) {
      res.json({ 
        success: true, 
        imageUrl: helper.imageUrls[0],
        imagePrompt: imagePrompt
      });
    } else {
      res.status(500).json({ 
        error: '图片生成失败',
        details: helper.errorMessages 
      });
    }
  } catch (error) {
    console.error('生成图片失败:', error);
    res.status(500).json({ error: '生成图片失败，请重试' });
  }
});

// 批量生成插图（多段故事 -> 多张图片）
router.post('/api/story/generate-batch-images', async (req: Request, res: Response) => {
  try {
    const { storyTexts, style } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!storyTexts || !Array.isArray(storyTexts)) {
      res.status(400).json({ error: '请提供故事文字数组' });
      return;
    }

    // 初始化客户端
    const llmClient = new LLMClient(llmConfig, customHeaders);
    const imgClient = new ImageGenerationClient(imageConfig, customHeaders);

    const results: Array<{ index: number; text: string; imageUrl?: string; imagePrompt?: string; error?: string }> = [];

    for (let i = 0; i < storyTexts.length; i++) {
      const storyText = storyTexts[i];
      console.log(`正在处理第 ${i + 1}/${storyTexts.length} 段故事...`);

      try {
        // 使用 LLM 转换故事为图片描述
        const promptConvert = `你是一位专业的儿童绘本插画家。请根据以下故事文字，生成一个详细的英文图片描述词，用于 AI 画图。

故事文字： "${storyText}"

要求：
1. 描述生动、具体、适合画图
2. 风格：儿童绘本插画风格
3. 突出主要角色和场景
4. 不要包含文字或对话

请直接输出英文描述，控制在 80 词以内。`;

        const messages = [{ role: 'user' as const, content: promptConvert }];
        const llmResponse = await llmClient.invoke(messages, { 
          model: 'doubao-seed-1-6-251015',
          temperature: 0.7 
        });

        let imagePrompt = llmResponse.content.trim();
        const enhancedPrompt = `${imagePrompt}, children's book illustration style, cute, colorful, warm, soft lighting, hand-drawn style, watercolor effect, adorable characters, pastel colors, whimsical, enchanting atmosphere`;

        // 生成图片
        const imgResponse = await imgClient.generate({
          prompt: enhancedPrompt,
          size: '2K',
        });

        const helper = imgClient.getResponseHelper(imgResponse);

        if (helper.success && helper.imageUrls.length > 0) {
          results.push({
            index: i,
            text: storyText,
            imageUrl: helper.imageUrls[0],
            imagePrompt: imagePrompt
          });
        } else {
          results.push({
            index: i,
            text: storyText,
            error: '图片生成失败'
          });
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`处理第 ${i + 1} 段失败:`, error);
        results.push({
          index: i,
          text: storyText,
          error: '处理失败'
        });
      }
    }

    res.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('批量生成图片失败:', error);
    res.status(500).json({ error: '批量生成图片失败，请重试' });
  }
});

export default router;
