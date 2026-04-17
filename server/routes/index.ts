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

export default router;
