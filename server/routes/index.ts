import { Router, Request, Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, VideoGenerationClient, TTSClient } from 'coze-coding-dev-sdk';

const router = Router();

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

// ==================== 用户认证 API ====================

// 用户注册
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    const client = getSupabaseClient();

    // 使用 Supabase Auth 注册
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      user: data.user,
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册失败:', error);
    return res.status(500).json({ error: '注册失败，请重试' });
  }
});

// 用户登录
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    const client = getSupabaseClient();

    // 使用 Supabase Auth 登录
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    return res.json({
      success: true,
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ error: '登录失败，请重试' });
  }
});

// 获取当前用户信息
router.get('/auth/user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.split(' ')[1];
    const client = getSupabaseClient(token);

    const { data, error } = await client.auth.getUser();

    if (error) {
      return res.status(401).json({ error: '登录已过期' });
    }

    return res.json({
      success: true,
      user: data.user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 用户登出
router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const client = getSupabaseClient(token);
      await client.auth.signOut();
    }

    return res.json({
      success: true,
      message: '已退出登录'
    });
  } catch (error) {
    console.error('登出失败:', error);
    return res.status(500).json({ error: '登出失败' });
  }
});

// 语言配置
const languageConfig = {
  zh: {
    generatePrompt: (theme: string) => `你是一位优秀的儿童绘本作家。请为 "${theme}" 这个主题创作一个儿童绘本故事。

**重要：按照"英雄之旅"结构创作故事！**

"英雄之旅"是经典的故事结构，包含12个阶段。本故事将按照这个结构展开，让故事更有深度和意义：

1. **平凡世界** - 主角的日常生活（温馨开场）
2. **冒险召唤** - 出现挑战/任务（故事起因）
3. **拒绝召唤** - 主角犹豫/担忧（内心挣扎）
4. **遇见导师** - 得到帮助/指引（找到方向）
5. **跨越门槛** - 踏上冒险旅程（正式出发）
6. **考验与盟友** - 遇到困难和新朋友（挫折与友情）
7. **进入洞穴** - 接近最大挑战（接近高潮）
8. **严峻考验** - 最大危机/转折（故事高潮）
9. **获得奖赏** - 克服困难得到奖励（胜利时刻）
10. **归来之路** - 踏上回家的路（返程）
11. **复活** - 最后挑战/蜕变（最终成长）
12. **带回万能药** - 带着成长和智慧归来（圆满结局）

要求：
1. 故事适合3-8岁儿童
2. 故事要有教育意义，传递正能量
3. 故事篇幅控制在12页，每页对应英雄之旅的一个阶段
4. 每页文字不超过30个字，要简洁易懂
5. 每页需要提供英文图片描述词（用于AI画图和动画），风格是儿童绘本插画风格
6. 主要角色（最多2个）要有详细的外观描述，这个描述必须保持一致地用在所有页面的图片描述中
7. **动画描述词**要包含角色情绪、动作和场景氛围，用于生成有戏剧张力的动画

请按以下JSON格式输出：
{
  "title": "故事标题",
  "characterDescription": "主要角色的详细外观描述（英文，用于保持所有插图角色一致）",
  "pages": [
    {
      "page": 1,
      "stage": "平凡世界",
      "text": "这页的文字内容（中文，不超过30字）",
      "imagePrompt": "英文的图片描述词，必须包含角色外观描述，风格是可爱温馨的儿童绘本插画风格",
      "animationPrompt": "英文的动画描述词，包含：角色情绪（如happy/sad/scared/excited）、动作（如jumping/running/crying）、场景氛围（如sunny forest/magical cave）、动态效果（如stars twinkling/fireflies glowing）"
    }
  ]
}`,
    speaker: 'zh_female_xueayi_saturn_bigtts',
  },
  en: {
    generatePrompt: (theme: string) => `You are an excellent children's picture book author. Please create a children's picture book story for the theme "${theme}".

**Important: Structure your story using the "Hero's Journey" framework!**

The "Hero's Journey" is a classic story structure with 12 stages. Your story should follow this structure:

1. **Ordinary World** - Hero's daily life (warm opening)
2. **Call to Adventure** - A challenge/task appears (story begins)
3. **Refusal of the Call** - Hero hesitates/worries (inner struggle)
4. **Meeting the Mentor** - Gets help/guidance (finds direction)
5. **Crossing the Threshold** - Embarks on the journey (departure)
6. **Tests, Allies & Enemies** - Faces challenges and makes friends (trials & friendship)
7. **Approach to the Inmost Cave** - Approaches the biggest challenge (building up)
8. **The Ordeal** - The greatest crisis/turning point (climax)
9. **Reward** - Overcomes difficulties and gains reward (victory moment)
10. **The Road Back** - Begins the journey home (return)
11. **Resurrection** - Final challenge/transformation (final growth)
12. **Return with the Elixir** - Returns with wisdom and growth (fulfilling ending)

Requirements:
1. Story suitable for children aged 3-8
2. Story should be educational, conveying positive values
3. Story has exactly 12 pages, one for each stage of the Hero's Journey
4. Each page should have no more than 30 words, be concise and easy to understand
5. Each page needs English image description prompts (for AI drawing and animation), in children's picture book illustration style
6. Main characters (max 2) must have detailed appearance descriptions that remain CONSISTENT across ALL pages
7. **Animation prompts** should include character emotions, actions, and scene atmosphere for dramatic animation

Please output in the following JSON format:
{
  "title": "Story Title",
  "characterDescription": "Detailed appearance description of main characters in English (for maintaining character consistency)",
  "pages": [
    {
      "page": 1,
      "stage": "Ordinary World",
      "text": "The text content of this page (in English, no more than 30 words)",
      "imagePrompt": "English image description that includes character appearance, in cute and warm children's picture book style",
      "animationPrompt": "English animation description including: character emotions (e.g., happy/sad/scared/excited), actions (e.g., jumping/running/crying), scene atmosphere (e.g., sunny forest/magical cave), dynamic effects (e.g., stars twinkling/fireflies glowing)"
    }
  ]
}`,
    speaker: 'en_us_male_cubic_bigtts',
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
    const errorLang = req.body.language || 'zh';
    res.status(500).json({ error: errorLang === 'en' ? 'Story generation failed' : '生成故事失败' });
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

    // 获取角色描述（用于保持角色一致性）
    const characterDescription = story.characterDescription || '';
    const updatedPages: StoryPage[] = [];

    // 并行生成所有插图（提高速度）
    const generatePageImage = async (page: StoryPage): Promise<StoryPage> => {
      try {
        console.log(`正在生成第 ${page.page} 页插图...`);
        
        // 增强图片提示词
        const basePrompt = characterDescription 
          ? `${characterDescription}, ${page.imagePrompt}` 
          : page.imagePrompt;
        
        const enhancedPrompt = `${basePrompt}, children's book illustration, cute, colorful, warm, soft lighting, watercolor effect, pastel colors`;

        const response = await client.generate({
          prompt: enhancedPrompt,
          size: '1K', // 使用 1K 尺寸加快生成速度
        });

        const helper = client.getResponseHelper(response);

        if (helper.success && helper.imageUrls.length > 0) {
          return { ...page, imageUrl: helper.imageUrls[0] };
        }
        return { ...page, imageUrl: '' };
      } catch (error) {
        console.error(`第 ${page.page} 页插图生成失败:`, error);
        return { ...page, imageUrl: '' };
      }
    };

    // 并行处理所有页面（最多同时3个，避免API限制）
    const chunkSize = 3;
    for (let i = 0; i < story.pages.length; i += chunkSize) {
      const chunk = story.pages.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(generatePageImage));
      updatedPages.push(...results);
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

    // 构建内容：图片作为首帧 + 文字描述动画效果
    const contentItems = [
      {
        type: 'image_url' as const,
        image_url: { url: imageUrl },
        role: 'first_frame' as const,
      },
      {
        type: 'text' as const,
        text: 'A gentle, magical animation. Soft camera movement, warm lighting transitions, subtle motion in the characters - a gentle sway, a sparkle of magic, breathing effect.',
      },
    ];

    // 生成视频
    const response = await client.videoGeneration(contentItems, {
      model: 'doubao-seedance-1-5-pro-251215',
      duration: 5,
      resolution: '720p',
      ratio: '4:3',
      returnLastFrame: true,
      generateAudio: true,
    });

    if (response.videoUrl) {
      res.json({ 
        success: true, 
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl || null,
        message: '视频生成成功！' 
      });
    } else {
      res.status(500).json({ 
        error: '视频生成失败',
        details: response.response?.error_message || '未知错误' 
      });
    }
  } catch (error) {
    console.error('生成视频失败:', error);
    res.status(500).json({ error: '生成视频失败，请重试' });
  }
});

// 🎬 批量生成视频（为故事每页生成视频，支持尾帧继承实现角色一致性）
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
    
    // 关键：尾帧继承策略 - 上一段视频的尾帧作为下一段的首帧
    let lastFrameUrl: string | null = null;
    
    for (const page of story.pages) {
      if (!page.imageUrl) {
        updatedPages.push({ ...page, videoUrl: '' });
        continue;
      }

      try {
        console.log(`正在生成第 ${page.page} 页视频...`);
        
        // 构建视频生成的内容数组
        // 如果有上一段的尾帧，将其作为首帧输入，实现视觉连贯性
        const contentItems: any[] = [];
        
        if (lastFrameUrl) {
          // 使用上一段的尾帧作为首帧（首帧继承策略）
          contentItems.push({
            type: 'image_url' as const,
            image_url: {
              url: lastFrameUrl,
            },
            role: 'first_frame' as const,
          });
        }
        
        // 添加当前页的插图
        contentItems.push({
          type: 'image_url' as const,
          image_url: {
            url: page.imageUrl,
          },
          role: 'first_frame' as const,
        });
        
        // 添加动画描述 - 使用故事中的 animationPrompt，增加戏剧张力
        const animationPrompt = page.animationPrompt 
          ? `${page.animationPrompt}. Soft movements, warm magical atmosphere, children's picture book animation style.`
          : `A gentle animation of the picture book scene: "${page.text}". Soft movements like a living storybook. Characters maintain consistent appearance, subtle motions - gentle breathing, blinking eyes, swaying gently. Warm and magical atmosphere.`;
        
        contentItems.push({
          type: 'text' as const,
          text: animationPrompt,
        });

        // 使用 videoGeneration 方法（支持尾帧返回）
        const response = await client.videoGeneration(contentItems, {
          model: 'doubao-seedance-1-5-pro-251215',
          duration: 5,
          resolution: '720p',
          ratio: '16:9',
          returnLastFrame: true, // 关键：返回尾帧用于下一段视频
          generateAudio: true, // 生成音效
          camerafixed: false, // 允许镜头轻微移动
        });

        // 获取尾帧 URL（用于下一段视频的首帧）
        if (response.lastFrameUrl) {
          lastFrameUrl = response.lastFrameUrl;
        }

        updatedPages.push({
          ...page,
          videoUrl: response.videoUrl || '',
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

    // 选择语音：根据语言选择儿童有声书风格的声音
    const speaker = language === 'zh' 
      ? 'zh_female_xueayi_saturn_bigtts' // 儿童有声书
      : 'zh_female_vv_uranus_bigtts';    // 中英双语

    // 生成语音
    const response = await client.synthesize({
      uid: `story_${Date.now()}`,
      text: text,
      speaker: speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: 0, // 正常语速
    });

    if (response.audioUri) {
      res.json({ 
        success: true, 
        audioUrl: response.audioUri,
        message: '语音生成成功！' 
      });
    } else {
      res.status(500).json({ 
        error: '语音生成失败',
        details: '未获取到音频URL' 
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

    // 选择语音：根据语言选择儿童有声书风格的声音
    const speaker = language === 'zh' 
      ? 'zh_female_xueayi_saturn_bigtts' // 儿童有声书
      : 'zh_female_vv_uranus_bigtts';    // 中英双语

    const updatedPages: StoryPage[] = [];
    
    for (const page of story.pages) {
      try {
        console.log(`正在生成第 ${page.page} 页语音...`);

        const response = await client.synthesize({
          uid: `story_page_${page.page}_${Date.now()}`,
          text: page.text,
          speaker: speaker,
          audioFormat: 'mp3',
          sampleRate: 24000,
          speechRate: 0, // 正常语速
        });

        updatedPages.push({
          ...page,
          audioUrl: response.audioUri || '',
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
