import { Router, Request, Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, VideoGenerationClient, TTSClient } from 'coze-coding-dev-sdk';

const storyRouter = Router();
const router = Router();

// 初始化 AI 客户端
const config = new Config();
const llmClient = new LLMClient(config);
const imageClient = new ImageGenerationClient(config);
const videoClient = new VideoGenerationClient(config);
const ttsClient = new TTSClient(config);

interface StoryPage {
  page: number;
  text: string;
  imagePrompt: string;
  stageName?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

interface Story {
  title: string;
  characterDescription: string;
  pages: StoryPage[];
}

// ==================== 故事生成 API ====================

// 英雄之旅12阶段定义
const heroJourneyStages = {
  zh: [
    { name: '平凡世界', prompt: '主角在日常生活环境中，展现他们的日常生活和性格特点。' },
    { name: '冒险召唤', prompt: '出现了一个特殊的任务或挑战，主角第一次意识到需要行动。' },
    { name: '拒绝召唤', prompt: '主角表现出犹豫或担忧，面对未知感到不安。' },
    { name: '遇见导师', prompt: '主角遇到了一位智者或朋友，获得了鼓励和指引。' },
    { name: '跨越门槛', prompt: '主角鼓起勇气，踏上冒险之旅，离开熟悉的世界。' },
    { name: '考验与盟友', prompt: '主角遇到新的挑战，也结识了新的朋友和伙伴。' },
    { name: '进入洞穴', prompt: '主角接近了最大的挑战所在之地。' },
    { name: '严峻考验', prompt: '主角面临最大的危机和考验，这是故事的转折点。' },
    { name: '获得奖赏', prompt: '主角克服了困难，获得了珍贵的奖赏或领悟。' },
    { name: '归来之路', prompt: '主角踏上了回家的旅程，带着收获和成长。' },
    { name: '复活', prompt: '主角面临最后的考验，完成最终的蜕变和成长。' },
    { name: '带回万能药', prompt: '主角回到平凡世界，分享所学，成为更好的自己。' }
  ],
  en: [
    { name: 'Ordinary World', prompt: 'The hero in their daily life, showing their routine and personality.' },
    { name: 'Call to Adventure', prompt: 'A special task or challenge appears, the hero first realizes they need to act.' },
    { name: 'Refusal of the Call', prompt: 'The hero shows hesitation or worry, feeling uneasy about the unknown.' },
    { name: 'Meeting the Mentor', prompt: 'The hero meets a wise person or friend who gives encouragement and guidance.' },
    { name: 'Crossing the Threshold', prompt: 'The hero gathers courage and embarks on the adventure, leaving the familiar world.' },
    { name: 'Tests and Allies', prompt: 'The hero faces new challenges and makes new friends.' },
    { name: 'Approach to the Cave', prompt: 'The hero approaches the place of the greatest challenge.' },
    { name: 'The Ordeal', prompt: 'The hero faces the biggest crisis and turning point of the story.' },
    { name: 'Reward', prompt: 'The hero overcomes difficulties and gains a precious reward or insight.' },
    { name: 'The Road Back', prompt: 'The hero begins the journey home, bringing their gains and growth.' },
    { name: 'Resurrection', prompt: 'The hero faces one final test, completing their final transformation.' },
    { name: 'Return with the Elixir', prompt: 'The hero returns to the ordinary world, sharing what they learned and becoming a better self.' }
  ]
};

// 生成故事
storyRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { theme, language = 'zh' } = req.body;
    console.log('收到生成故事请求:', { theme, language });

    if (!theme) {
      return res.status(400).json({ error: '请提供故事主题' });
    }

    const stages = heroJourneyStages[language] || heroJourneyStages.zh;
    const isZh = language === 'zh';

    // 构建提示词
    const systemPrompt = isZh
      ? `你是一位专业的儿童绘本作家，擅长使用"英雄之旅"叙事框架创作引人入胜的故事。
请根据用户提供的theme，创作一个完整的12页儿童绘本故事。
故事必须严格按照以下12个阶段展开：
1. 平凡世界 - 主角在日常生活环境中
2. 冒险召唤 - 出现特殊任务或挑战
3. 拒绝召唤 - 主角犹豫或担忧
4. 遇见导师 - 主角遇到智者或朋友获得指引
5. 跨越门槛 - 主角踏上冒险之旅
6. 考验与盟友 - 遇到挑战和新朋友
7. 进入洞穴 - 接近最大挑战
8. 严峻考验 - 最大危机和转折点
9. 获得奖赏 - 克服困难获得奖赏
10. 归来之路 - 踏上回家的旅程
11. 复活 - 最后考验和蜕变
12. 带回万能药 - 回到平凡世界，分享成长

每个阶段要求：
- 简洁有力的故事文本（30-50字），适合儿童理解
- 对应的英文画图描述词，用于AI生成配套插图
- 使用儿童绘本风格：水彩效果、柔和色调、温暖氛围

请以JSON格式返回，格式如下：
{
  "title": "故事标题",
  "characterDescription": "主角外观描述（用于保持所有插图中角色一致性）",
  "pages": [
    {
      "page": 1,
      "stageName": "阶段名称",
      "text": "故事文本（中文）",
      "imagePrompt": "英文画图描述词"
    },
    ...
  ]
}`
      : `You are a professional children's picture book author, skilled in using the "Hero's Journey" narrative framework.
Based on the user's theme, create a complete 12-page children's picture book story.
Follow these 12 stages strictly:
1. Ordinary World - Hero in their daily life
2. Call to Adventure - Special task or challenge appears
3. Refusal of the Call - Hero shows hesitation
4. Meeting the Mentor - Hero meets wise person or friend
5. Crossing the Threshold - Hero embarks on adventure
6. Tests and Allies - Faces challenges and makes friends
7. Approach to the Cave - Approaches greatest challenge
8. The Ordeal - Biggest crisis and turning point
9. Reward - Overcomes difficulties and gains reward
10. The Road Back - Begins journey home
11. Resurrection - Final test and transformation
12. Return with the Elixir - Returns to ordinary world

Each page needs:
- Concise story text (30-50 words), suitable for children
- English image prompt for AI illustration generation
- Children's picture book style: watercolor effect, soft colors, warm atmosphere

Return in JSON format:
{
  "title": "Story Title",
  "characterDescription": "Character appearance description (for consistency in all illustrations)",
  "pages": [
    {
      "page": 1,
      "stageName": "Stage Name",
      "text": "Story text (English)",
      "imagePrompt": "English image prompt"
    },
    ...
  ]
}`;

    const response = await llmClient.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请为"${theme}"创作一个儿童绘本故事` }
      ],
      {
        model: 'doubao-seed-1-6-251015',
        temperature: 0.8
      }
    );

    let storyContent = '';
    if (typeof response === 'string') {
      storyContent = response;
    } else if (response && typeof response === 'object') {
      // 如果是对象，尝试获取 content 字段
      storyContent = (response as any).content || JSON.stringify(response);
    } else {
      throw new Error('生成故事内容失败');
    }

    // 提取JSON
    const jsonMatch = storyContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析故事内容');
    }

    const story: Story = JSON.parse(jsonMatch[0]);

    // 确保页数正确
    if (!story.pages || story.pages.length === 0) {
      throw new Error('故事页数为空');
    }

    // 添加阶段名称
    story.pages.forEach((page, index) => {
      if (stages[index]) {
        page.stageName = stages[index].name;
      }
      page.imageUrl = '';
      page.videoUrl = '';
      page.audioUrl = '';
    });

    console.log('故事生成成功:', story.title, '-', story.pages.length, '页');
    res.json({ success: true, story });

  } catch (error: any) {
    console.error('生成故事失败:', error);
    res.status(500).json({ error: '生成故事失败，请重试' });
  }
});

// ==================== 插图和媒体生成 API ====================

// 生成插图
storyRouter.post('/generate-illustrations', async (req: Request, res: Response) => {
  try {
    const { story } = req.body;
    console.log('收到生成插图请求:', story?.title);
  
    if (!story || !story.pages) {
      return res.status(400).json({ error: '请提供有效的故事内容' });
    }

    const updatedPages = [...story.pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      try {
        const prompt = `${page.imagePrompt}, children's picture book style, watercolor effect, soft pastel colors, warm atmosphere, high quality, detailed illustration`;
        console.log(`正在生成第${i + 1}张插图...`);

        const response = await imageClient.generate({
          prompt,
          size: '1K'
        });

        let imageUrl = '';
        if (typeof response === 'string') {
          imageUrl = response;
        } else if (response && typeof response === 'object') {
          imageUrl = (response as any).imageUrls?.[0] || (response as any).url || '';
        }
        
        if (imageUrl) {
          page.imageUrl = imageUrl;
          console.log(`第${i + 1}张插图生成成功:`, imageUrl.substring(0, 50));
        }
      } catch (error) {
        console.error(`第${i + 1}张插图生成失败:`, error);
      }
    }

    story.pages = updatedPages;
    console.log('插图生成完成');
    res.json({ success: true, story });

  } catch (error: any) {
    console.error('生成插图失败:', error);
    res.status(500).json({ error: '生成插图失败，请重试' });
  }
});

// 生成单张插图
storyRouter.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { storyText, language = 'zh' } = req.body;

    if (!storyText) {
      return res.status(400).json({ error: '请提供故事文字' });
    }

    console.log('收到生成单张插图请求:', storyText.substring(0, 30));

    // 构建提示词
    const systemPrompt = language === 'zh'
      ? `你是一位专业的儿童绘本插画师。请根据给定的故事文字，生成一个详细的英文画图描述词。要求：
1. 描述场景中的主要角色外观和表情
2. 描述环境背景
3. 描述整体氛围和色调
4. 使用儿童绘本风格：水彩效果、柔和色调、温暖氛围
5. 描述词要具体详细，适合AI生成高质量插图

直接返回英文描述词，不要其他内容。`
      : `You are a professional children's picture book illustrator. Based on the given story text, generate a detailed English image prompt. Requirements:
1. Describe the main character's appearance and expression
2. Describe the environment and background
3. Describe the overall atmosphere and colors
4. Use children's picture book style: watercolor effect, soft colors, warm atmosphere
5. Be specific and detailed, suitable for AI image generation

Return only the English description, nothing else.`;

    const response = await llmClient.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: storyText }
      ],
      {
        model: 'doubao-seed-1-6-251015',
        temperature: 0.8
      }
    );

    let imagePrompt = '';
    if (typeof response === 'string') {
      imagePrompt = response.trim();
    } else if (response && typeof response === 'object') {
      imagePrompt = (response as any).content || '';
    }
    
    if (!imagePrompt) {
      throw new Error('生成画图描述失败');
    }

    // 生成插图
    const imgResponse = await imageClient.generate({
      prompt: `${imagePrompt}, children's picture book style, watercolor effect, soft pastel colors, high quality`,
      size: '1K'
    });

    let imageUrl = '';
    if (typeof imgResponse === 'string') {
      imageUrl = imgResponse;
    } else if (imgResponse && typeof imgResponse === 'object') {
      imageUrl = (imgResponse as any).imageUrls?.[0] 
        || (imgResponse as any).url 
        || (imgResponse as any).data?.[0]?.url 
        || (imgResponse as any).images?.[0]?.url 
        || '';
    }
    
    if (!imageUrl) {
      console.error('无法从响应中提取图片URL:', imgResponse);
      throw new Error('生成插图失败');
    }

    console.log('单张插图生成成功');
    res.json({
      success: true,
      imageUrl,
      imagePrompt
    });

  } catch (error: any) {
    console.error('生成单张插图失败:', error);
    res.status(500).json({ error: '生成插图失败，请重试' });
  }
});

// 批量生成插图
storyRouter.post('/generate-batch-images', async (req: Request, res: Response) => {
  try {
    const { prompts } = req.body;

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: '请提供有效的prompts数组' });
    }

    console.log('收到批量生成插图请求:', prompts.length, '张');

    const results = await Promise.all(
      prompts.map(async (prompt: string, index: number) => {
        try {
          const response = await imageClient.generate({
            prompt: `${prompt}, children's picture book style, watercolor effect`,
            size: '1K'
          });

          let imageUrl = '';
          if (typeof response === 'string') {
            imageUrl = response;
          } else if (response && typeof response === 'object') {
            imageUrl = (response as any).imageUrls?.[0] || (response as any).url || '';
          }
          
          return {
            index,
            success: !!imageUrl,
            imageUrl
          };
        } catch (error) {
          console.error(`第${index + 1}张插图生成失败:`, error);
          return { index, success: false, imageUrl: null };
        }
      })
    );

    console.log('批量插图生成完成:', results.filter(r => r.success).length, '/', prompts.length);
    res.json({ success: true, results });

  } catch (error: any) {
    console.error('批量生成插图失败:', error);
    res.status(500).json({ error: '批量生成插图失败，请重试' });
  }
});

// 生成视频
storyRouter.post('/generate-video', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: '请提供插图URL' });
    }

    console.log('收到生成视频请求:', imageUrl.substring(0, 50));

    const contentItems = [
      { type: 'image_url' as const, image_url: { url: imageUrl }, role: 'first_frame' as const },
      { type: 'text' as const, text: 'A gentle animation. Soft camera movement, warm lighting transitions, the character blinks and breathes subtly.' }
    ];

    const response = await videoClient.videoGeneration(contentItems, {
      model: 'doubao-seedance-1-5-pro-251215',
      duration: 5,
      resolution: '720p',
      ratio: '4:3',
      returnLastFrame: true,
      generateAudio: true
    });

    console.log('视频生成成功:', response.videoUrl);
    res.json({
      success: true,
      videoUrl: response.videoUrl,
      lastFrameUrl: response.lastFrameUrl
    });

  } catch (error: any) {
    console.error('生成视频失败:', error);
    res.status(500).json({ error: '生成视频失败，请重试' });
  }
});

// 为故事每页生成视频
storyRouter.post('/generate-story-videos', async (req: Request, res: Response) => {
  try {
    const { story } = req.body;

    if (!story || !story.pages) {
      return res.status(400).json({ error: '请提供有效的故事内容' });
    }

    console.log('收到生成故事视频请求:', story.title);

    let lastFrameUrl: string | undefined;
    const updatedPages = [...story.pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      if (!page.imageUrl) continue;

      console.log(`正在生成第${i + 1}页视频...`);

      try {
        const contentItems = [
          { type: 'image_url' as const, image_url: { url: page.imageUrl }, role: 'first_frame' as const }
        ];

        if (lastFrameUrl) {
          contentItems.unshift({
            type: 'image_url' as const,
            image_url: { url: lastFrameUrl },
            role: 'first_frame' as const
          });
        }

        contentItems.push({
          type: 'text' as const,
          text: 'A gentle animation. Soft camera movement, warm lighting transitions, magical sparkles and subtle character movement.'
        });

        const response = await videoClient.videoGeneration(contentItems, {
          model: 'doubao-seedance-1-5-pro-251215',
          duration: 5,
          resolution: '720p',
          ratio: '4:3',
          returnLastFrame: true,
          generateAudio: true
        });

        page.videoUrl = response.videoUrl || '';
        lastFrameUrl = response.lastFrameUrl;

        console.log(`第${i + 1}页视频生成成功`);
      } catch (error) {
        console.error(`第${i + 1}页视频生成失败:`, error);
      }
    }

    story.pages = updatedPages;
    console.log('故事视频生成完成');
    res.json({ success: true, story });

  } catch (error: any) {
    console.error('生成故事视频失败:', error);
    res.status(500).json({ error: '生成故事视频失败，请重试' });
  }
});

// 文字转语音
storyRouter.post('/text-to-speech', async (req: Request, res: Response) => {
  try {
    const { text, language = 'zh' } = req.body;

    if (!text) {
      return res.status(400).json({ error: '请提供要转换的文字' });
    }

    console.log('收到TTS请求:', text.substring(0, 30));

    const speaker = language === 'zh'
      ? 'zh_female_xueayi_saturn_bigtts'
      : 'en_us_male_crisp_high_stight_bigtts';

    const response = await ttsClient.synthesize({
      uid: `story_${Date.now()}`,
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000
    });

    console.log('TTS生成成功:', response.audioUri);
    res.json({
      success: true,
      audioUrl: response.audioUri
    });

  } catch (error: any) {
    console.error('TTS生成失败:', error);
    res.status(500).json({ error: '语音合成失败，请重试' });
  }
});

// 为故事每页生成语音
storyRouter.post('/generate-story-audio', async (req: Request, res: Response) => {
  try {
    const { story, language = 'zh' } = req.body;

    if (!story || !story.pages) {
      return res.status(400).json({ error: '请提供有效的故事内容' });
    }

    console.log('收到生成故事语音请求:', story.title);

    const speaker = language === 'zh'
      ? 'zh_female_xueayi_saturn_bigtts'
      : 'en_us_male_crisp_high_stight_bigtts';

    const updatedPages = [...story.pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      if (!page.text) continue;

      console.log(`正在生成第${i + 1}页语音...`);

      try {
        const response = await ttsClient.synthesize({
          uid: `story_${Date.now()}_${i}`,
          text: page.text,
          speaker,
          audioFormat: 'mp3',
          sampleRate: 24000
        });

        page.audioUrl = response.audioUri || '';
        console.log(`第${i + 1}页语音生成成功`);
      } catch (error) {
        console.error(`第${i + 1}页语音生成失败:`, error);
      }
    }

    story.pages = updatedPages;
    console.log('故事语音生成完成');
    res.json({ success: true, story });

  } catch (error: any) {
    console.error('生成故事语音失败:', error);
    res.status(500).json({ error: '生成故事语音失败，请重试' });
  }
});

export default storyRouter;
