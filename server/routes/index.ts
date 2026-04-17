import { Router, Request, Response } from 'express';
import { LLMClient, Config, HeaderUtils, ImageGenerationClient, VideoGenerationClient, TTSClient } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化 LLM 客户端
const llmConfig = new Config();

// 初始化图片生成客户端
const imageConfig = new Config();

// 初始化视频生成客户端
const videoConfig = new Config();

// 初始化 TTS 客户端
const ttsConfig = new Config();

interface StoryPage {
  page: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

interface Story {
  title: string;
  pages: StoryPage[];
}

// 语言配置
const languageConfig = {
  zh: {
    generatePrompt: (theme: string) => `你是一位优秀的儿童绘本作家。请为 "${theme}" 这个主题创作一个温馨、有教育意义的儿童绘本故事。

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
}`,
    speaker: 'zh_female_xueayi_saturn_bigtts', // 儿童有声书声音
  },
  en: {
    generatePrompt: (theme: string) => `You are an excellent children's picture book author. Please create a warm, educational children's picture book story for the theme "${theme}".

Requirements:
1. Story suitable for children aged 3-8
2. Story should be educational, conveying positive values
3. Keep the story around 6 pages
4. Each page should have no more than 30 words, be concise and easy to understand
5. Each page needs English image description prompts (for AI drawing), in children's picture book illustration style

Please output in the following JSON format:
{
  "title": "Story Title",
  "pages": [
    {
      "page": 1,
      "text": "The text content of this page (in English, no more than 30 words)",
      "imagePrompt": "English image description for AI illustration, cute and warm children's picture book style"
    }
  ]
}`,
    speaker: 'zh_female_vv_uranus_bigtts', // 中英双语声音
  }
};

// 生成故事内容
router.post('/api/story/generate', async (req: Request, res: Response) => {
  try {
    const { theme, language = 'zh' } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 更新客户端的 headers
    const client = new LLMClient(llmConfig, customHeaders);

    if (!theme) {
      res.status(400).json({ error: language === 'en' ? 'Please provide a story theme' : '请提供故事主题' });
      return;
    }

    // 获取语言配置
    const config = languageConfig[language as keyof typeof languageConfig] || languageConfig.zh;
    
    // 构建提示词，让 LLM 生成儿童绘本内容
    const prompt = config.generatePrompt(theme);

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
      res.status(500).json({ error: language === 'en' ? 'Story generation failed, please try again' : '故事生成失败，请重试' });
      return;
    }

    res.json({ success: true, story, language });
  } catch (error) {
    console.error('生成故事失败:', error);
    res.status(500).json({ error: language === 'en' ? 'Story generation failed' : '生成故事失败' });
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

// 🎬 根据插图生成视频
router.post('/api/story/generate-video', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!imageUrl) {
      res.status(400).json({ error: '请提供图片URL' });
      return;
    }

    // 初始化视频生成客户端
    const client = new VideoGenerationClient(videoConfig, customHeaders);

    console.log('正在生成视频，图片URL:', imageUrl);

    // 生成视频
    const response = await client.generate({
      prompt: 'A gentle, magical animation of this picture book scene. Soft camera movement, like slowly turning the pages of a picture book. Warm lighting transitions, subtle motion in the characters - a gentle sway, a sparkle of magic, breathing effect. Like a story coming to life.',
      prompt_en: 'A gentle, magical animation of this picture book scene. Soft camera movement, like slowly turning the pages of a picture book. Warm lighting transitions, subtle motion in the characters - a gentle sway, a sparkle of magic, breathing effect. Like a story coming to life.',
      image_url: imageUrl,
      duration: 5,
      resolution: '720p',
      fps: 24,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.videoUrl) {
      res.json({ 
        success: true, 
        videoUrl: helper.videoUrl,
        message: '视频生成成功！' 
      });
    } else {
      res.status(500).json({ 
        error: '视频生成失败',
        details: helper.errorMessages 
      });
    }
  } catch (error) {
    console.error('生成视频失败:', error);
    res.status(500).json({ error: '生成视频失败，请重试' });
  }
});

// 🎬 批量生成视频（为故事每页生成视频）
router.post('/api/story/generate-story-videos', async (req: Request, res: Response) => {
  try {
    const { story } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!story || !story.pages) {
      res.status(400).json({ error: '故事数据无效' });
      return;
    }

    // 初始化视频生成客户端
    const client = new VideoGenerationClient(videoConfig, customHeaders);

    const updatedPages: StoryPage[] = [];
    
    for (const page of story.pages) {
      if (!page.imageUrl) {
        updatedPages.push({ ...page, videoUrl: '' });
        continue;
      }

      try {
        console.log(`正在生成第 ${page.page} 页视频...`);

        const response = await client.generate({
          prompt: `A gentle animation of the picture book scene: "${page.text}". Soft movements like a living storybook. Warm and magical atmosphere.`,
          prompt_en: `A gentle animation of the picture book scene: "${page.text}". Soft movements like a living storybook. Warm and magical atmosphere.`,
          image_url: page.imageUrl,
          duration: 5,
          resolution: '720p',
          fps: 24,
        });

        const helper = client.getResponseHelper(response);

        updatedPages.push({
          ...page,
          videoUrl: helper.success && helper.videoUrl ? helper.videoUrl : '',
        });

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (videoError) {
        console.error(`生成第 ${page.page} 页视频失败:`, videoError);
        updatedPages.push({
          ...page,
          videoUrl: '',
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
    console.error('批量生成视频失败:', error);
    res.status(500).json({ error: '批量生成视频失败，请重试' });
  }
});

// 🔊 文字转语音（TTS）
router.post('/api/story/text-to-speech', async (req: Request, res:Response) => {
  try {
    const { text, language = 'zh' } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!text) {
      res.status(400).json({ error: '请提供要转换的文字' });
      return;
    }

    // 初始化 TTS 客户端
    const client = new TTSClient(ttsConfig, customHeaders);

    console.log('正在生成语音，文字:', text.substring(0, 50), '...');

    // 生成语音
    const response = await client.textToSpeech({
      text: text,
      stream: false, // 返回URL模式
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.audioUrl) {
      res.json({ 
        success: true, 
        audioUrl: helper.audioUrl,
        message: '语音生成成功！' 
      });
    } else {
      res.status(500).json({ 
        error: '语音生成失败',
        details: helper.errorMessages 
      });
    }
  } catch (error) {
    console.error('生成语音失败:', error);
    res.status(500).json({ error: '生成语音失败，请重试' });
  }
});

// 🔊 为故事生成语音（每页文字转语音）
router.post('/api/story/generate-story-audio', async (req: Request, res: Response) => {
  try {
    const { story, language = 'zh' } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    if (!story || !story.pages) {
      res.status(400).json({ error: '故事数据无效' });
      return;
    }

    // 初始化 TTS 客户端
    const client = new TTSClient(ttsConfig, customHeaders);

    const updatedPages: StoryPage[] = [];
    
    for (const page of story.pages) {
      try {
        console.log(`正在生成第 ${page.page} 页语音...`);

        const response = await client.textToSpeech({
          text: page.text,
          stream: false,
        });

        const helper = client.getResponseHelper(response);

        updatedPages.push({
          ...page,
          audioUrl: helper.success && helper.audioUrl ? helper.audioUrl : '',
        });

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (audioError) {
        console.error(`生成第 ${page.page} 页语音失败:`, audioError);
        updatedPages.push({
          ...page,
          audioUrl: '',
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
    console.error('批量生成语音失败:', error);
    res.status(500).json({ error: '批量生成语音失败，请重试' });
  }
});

export default router;
