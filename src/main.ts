import './index.css';

// 类型定义
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

interface ImageResult {
  index: number;
  text: string;
  imageUrl?: string;
  imagePrompt?: string;
  error?: string;
}

// 状态管理
let currentStory: Story | null = null;
let isGeneratingImages = false;
let isGeneratingVideos = false;
let isGeneratingAudio = false;
let currentPage = 0;
let generatedImages: ImageResult[] = [];
let currentMode: 'generate' | 'illustrate' = 'generate';
let currentLanguage: 'zh' | 'en' = 'zh';

// 初始化应用
function initApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  render(app);
  bindEvents();
}

// 渲染主界面
function render(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      <!-- 顶部标题 -->
      <header class="bg-white/80 backdrop-blur-sm shadow-lg">
        <div class="max-w-6xl mx-auto px-6 py-8">
          <h1 class="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            📚 AI 绘本创作坊
          </h1>
          <p class="text-center text-gray-500 mt-2">输入故事，AI 为你画插图</p>
          
          <!-- 功能切换 -->
          <div class="flex justify-center gap-4 mt-6">
            <button id="mode-generate" class="mode-btn px-6 py-3 rounded-full font-medium transition-all ${currentMode === 'generate' ? 'bg-purple-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-purple-100'}" data-mode="generate">
              ✨ 创作故事
            </button>
            <button id="mode-illustrate" class="mode-btn px-6 py-3 rounded-full font-medium transition-all ${currentMode === 'illustrate' ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-pink-100'}" data-mode="illustrate">
              🎨 故事转插图
            </button>
          </div>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="max-w-6xl mx-auto px-6 py-12">
        ${currentMode === 'generate' ? renderGenerateMode() : renderIllustrateMode()}
      </main>
    </div>
  `;
}

// 渲染创作模式
function renderGenerateMode(): string {
  return `
    ${!currentStory ? renderInputSection() : renderStorySection()}
  `;
}

// 渲染插图模式
function renderIllustrateMode(): string {
  return `
    <!-- 故事输入区 -->
    <div class="bg-white rounded-3xl shadow-xl p-8 mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <span class="text-3xl">📝</span> 输入你的故事
      </h2>
      
      <div class="space-y-6">
        <div>
          <label class="block text-gray-700 font-medium mb-2">故事内容</label>
          <textarea 
            id="story-text" 
            rows="4"
            placeholder="输入一段故事文字，AI 将为它生成配套插图...

例如：小兔子在森林里发现了一颗闪闪发光的种子..."
            class="w-full px-6 py-4 rounded-2xl border-2 border-pink-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all text-lg resize-none"
          ></textarea>
        </div>
        
        <!-- 示例输入 -->
        <div class="bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl p-6">
          <p class="text-gray-600 font-medium mb-3">💡 试试这些故事：</p>
          <div class="flex flex-wrap gap-2">
            ${[
              '小熊在河边钓鱼，钓到了一条彩虹鱼',
              '星星们在天上跳舞，月亮是指挥家',
              '小女孩走进魔法森林，遇见了会说话的树',
            ].map((example) => `
              <button class="example-text px-4 py-2 bg-white rounded-full text-pink-600 hover:bg-pink-100 transition-colors border border-pink-200 text-sm font-medium cursor-pointer" data-text="${example}">
                ${example.substring(0, 15)}...
              </button>
            `).join('')}
          </div>
        </div>
        
        <button id="generate-image-btn" class="w-full py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-2xl font-semibold text-lg hover:from-pink-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3">
          <span id="btn-text">🎨 生成插图</span>
          <span id="btn-spinner" class="hidden">
            <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    
    <!-- 图片展示区 -->
    ${generatedImages.length > 0 ? renderGeneratedImages() : ''}
  `;
}

// 渲染已生成的图片
function renderGeneratedImages(): string {
  return `
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div class="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-8 py-6">
        <h2 class="text-2xl font-bold">✨ 生成结果</h2>
        <p class="text-pink-100 mt-1">共 ${generatedImages.length} 张插图</p>
      </div>
      
      <div class="p-8">
        <div class="grid gap-8">
          ${generatedImages.map((item, index) => `
            <div class="bg-gray-50 rounded-2xl p-6">
              <div class="flex items-start gap-6">
                <!-- 故事文字 -->
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-sm">${index + 1}</span>
                    <span class="text-gray-600 font-medium">故事内容</span>
                  </div>
                  <p class="text-gray-700 text-lg leading-relaxed bg-white rounded-xl p-4 shadow-sm">
                    ${item.text}
                  </p>
                  ${item.imagePrompt ? `
                    <div class="mt-3">
                      <p class="text-xs text-gray-500 mb-1">AI 画图描述：</p>
                      <p class="text-xs text-gray-600 italic bg-yellow-50 rounded-lg px-3 py-2">${item.imagePrompt}</p>
                    </div>
                  ` : ''}
                </div>
                
                <!-- 生成的图片 -->
                <div class="w-80 shrink-0">
                  <div class="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-lg">
                    ${item.imageUrl ? `
                      <img src="${item.imageUrl}" alt="插图${index + 1}" class="w-full h-full object-cover" />
                    ` : item.error ? `
                      <div class="w-full h-full flex items-center justify-center text-red-400">
                        <div class="text-center">
                          <div class="text-4xl mb-2">❌</div>
                          <p class="text-sm">生成失败</p>
                        </div>
                      </div>
                    ` : `
                      <div class="w-full h-full flex items-center justify-center text-gray-400">
                        <div class="text-center">
                          <div class="text-4xl mb-2 animate-pulse">🎨</div>
                          <p class="text-sm">正在生成...</p>
                        </div>
                      </div>
                    `}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- 操作按钮 -->
        <div class="mt-8 flex justify-center gap-4">
          <button id="clear-results" class="px-6 py-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors font-medium">
            🗑️ 清除结果
          </button>
          <button id="regenerate-btn" class="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full hover:from-pink-600 hover:to-orange-600 transition-all shadow-lg font-medium">
            🔄 重新生成
          </button>
        </div>
      </div>
    </div>
  `;
}

// 渲染输入区域
function renderInputSection(): string {
  return `
    <div class="bg-white rounded-3xl shadow-xl p-8 mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <span class="text-3xl">🎨</span> 创作你的故事
      </h2>
      
      <div class="space-y-6">
        <!-- 语言切换 -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium">选择语言</label>
          <div class="flex gap-2">
            <button id="lang-zh" class="lang-btn px-4 py-2 rounded-full font-medium transition-all ${currentLanguage === 'zh' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-lang="zh">
              🇨🇳 中文
            </button>
            <button id="lang-en" class="lang-btn px-4 py-2 rounded-full font-medium transition-all ${currentLanguage === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-lang="en">
              🇺🇸 English
            </button>
          </div>
        </div>
        
        <div>
          <label class="block text-gray-700 font-medium mb-2">故事主题</label>
          <input 
            type="text" 
            id="story-theme" 
            placeholder="${currentLanguage === 'zh' ? '例如：小兔子学勇敢、小熊学分享、外星人访地球...' : 'e.g., Little Rabbit learns courage, Bear shares food, Alien visits Earth...'}"
            class="w-full px-6 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-lg"
          />
        </div>
        
        <!-- 示例主题 -->
        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6">
          <p class="text-gray-600 font-medium mb-3">💡 ${currentLanguage === 'zh' ? '试试这些主题：' : 'Try these themes:'}</p>
          <div class="flex flex-wrap gap-2">
            ${(currentLanguage === 'zh' ? ['小兔子去上学', '星星找朋友', '大树的秘密', '彩虹桥'] : ['Little Rabbit goes to school', 'Stars make friends', 'The secret of the big tree', 'Rainbow bridge']).map(theme => `
              <button class="example-theme px-4 py-2 bg-white rounded-full text-purple-600 hover:bg-purple-100 transition-colors border border-purple-200 text-sm font-medium cursor-pointer" data-theme="${theme}">
                ${theme}
              </button>
            `).join('')}
          </div>
        </div>
        
        <button id="generate-btn" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3">
          <span id="generate-btn-text">${currentLanguage === 'zh' ? '✨ 开始创作' : '✨ Start Creating'}</span>
          <span id="generate-spinner" class="hidden">
            <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    
    <!-- 功能说明 -->
    <div class="grid md:grid-cols-3 gap-6">
      ${[
        { icon: '💭', title: currentLanguage === 'zh' ? 'AI 创作故事' : 'AI Creates Story', desc: currentLanguage === 'zh' ? '智能生成温馨有趣的情节' : 'Smart generation of warm stories' },
        { icon: '🎨', title: currentLanguage === 'zh' ? '自动画插图' : 'Auto Illustration', desc: currentLanguage === 'zh' ? '每页配有精美插画' : 'Beautiful illustrations for each page' },
        { icon: '🎬', title: currentLanguage === 'zh' ? '生成动画视频' : 'Generate Video', desc: currentLanguage === 'zh' ? '插图变动画' : 'Turn illustrations into animations' },
      ].map(item => `
        <div class="bg-white rounded-2xl p-6 shadow-lg text-center hover:shadow-xl transition-shadow">
          <div class="text-4xl mb-3">${item.icon}</div>
          <h3 class="font-semibold text-gray-800 mb-1">${item.title}</h3>
          <p class="text-gray-500 text-sm">${item.desc}</p>
        </div>
      `).join('')}
    </div>
  `;
}

// 渲染故事展示区域
function renderStorySection(): string {
  if (!currentStory) return '';

  return `
    <!-- 返回按钮 -->
    <button id="back-btn" class="mb-6 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors">
      <span class="text-xl">←</span> ${currentLanguage === 'zh' ? '创作新故事' : 'Create New Story'}
    </button>
    
    <!-- 故事标题 -->
    <div class="text-center mb-8">
      <h2 class="text-4xl font-bold text-gray-800 mb-2">${currentStory.title}</h2>
      <p class="text-gray-500">${currentLanguage === 'zh' ? '点击翻页阅读完整故事' : 'Flip pages to read the full story'}</p>
    </div>
    
    <!-- 操作按钮区 -->
    <div class="flex flex-wrap justify-center gap-3 mb-8">
      <!-- 生成插图按钮 -->
      <button id="generate-all-images" class="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ${isGeneratingImages ? 'opacity-50 cursor-not-allowed' : ''}">
        🎨 ${currentLanguage === 'zh' ? '生成插图' : 'Generate Images'}
        ${isGeneratingImages ? '<span class="animate-spin">⏳</span>' : ''}
      </button>
      
      <!-- 生成视频按钮 -->
      <button id="generate-all-videos" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ${isGeneratingVideos ? 'opacity-50 cursor-not-allowed' : ''}">
        🎬 ${currentLanguage === 'zh' ? '生成动画' : 'Generate Videos'}
        ${isGeneratingVideos ? '<span class="animate-spin">⏳</span>' : ''}
      </button>
      
      <!-- 生成语音按钮 -->
      <button id="generate-all-audio" class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ${isGeneratingAudio ? 'opacity-50 cursor-not-allowed' : ''}">
        🔊 ${currentLanguage === 'zh' ? '生成语音' : 'Generate Audio'}
        ${isGeneratingAudio ? '<span class="animate-spin">⏳</span>' : ''}
      </button>
    </div>
    
    <!-- 绘本展示区 -->
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
      ${renderCurrentPage()}
    </div>
    
    <!-- 翻页控制 -->
    <div class="flex items-center justify-center gap-4">
      <button id="prev-page" class="px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2" ${currentPage === 0 ? 'disabled' : ''}>
        <span>←</span> ${currentLanguage === 'zh' ? '上一页' : 'Prev'}
      </button>
      
      <div class="px-6 py-3 bg-purple-100 rounded-full text-purple-700 font-medium">
        ${currentLanguage === 'zh' ? '第' : 'Page'} ${currentPage + 1} / ${currentStory.pages.length}
      </div>
      
      <button id="next-page" class="px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2" ${currentPage === currentStory.pages.length - 1 ? 'disabled' : ''}>
        ${currentLanguage === 'zh' ? '下一页' : 'Next'} <span>→</span>
      </button>
    </div>
  `;
}

// 渲染当前页面
function renderCurrentPage(): string {
  if (!currentStory) return '';
  
  const page = currentStory.pages[currentPage];
  const isLoading = isGeneratingImages && !page.imageUrl;
  const isLoadingVideo = isGeneratingVideos && !page.videoUrl;
  const isLoadingAudio = isGeneratingAudio && !page.audioUrl;
  
  return `
    <div class="relative">
      <!-- 插图区域 -->
      <div class="aspect-[4/3] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
        ${page.imageUrl ? `
          <img src="${page.imageUrl}" alt="第${page.page}页插图" class="w-full h-full object-cover" />
        ` : isLoading ? `
          <div class="text-center">
            <div class="animate-spin h-12 w-12 mx-auto mb-4 border-4 border-purple-200 border-t-purple-500 rounded-full"></div>
            <p class="text-gray-500">${currentLanguage === 'zh' ? '正在为你画插图...' : 'Generating illustration...'}</p>
          </div>
        ` : `
          <div class="text-center text-gray-400">
            <div class="text-6xl mb-4">🖼️</div>
            <p>${currentLanguage === 'zh' ? '暂无插图' : 'No illustration yet'}</p>
          </div>
        `}
        
        <!-- 视频播放器（如果已生成视频） -->
        ${page.videoUrl ? `
          <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
            <video 
              src="${page.videoUrl}" 
              controls 
              autoplay
              loop
              class="max-w-full max-h-full rounded-lg shadow-2xl"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ` : isLoadingVideo ? `
          <div class="absolute bottom-4 right-4 bg-blue-500/90 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <span class="animate-spin">🎬</span> ${currentLanguage === 'zh' ? '生成动画中...' : 'Generating video...'}
          </div>
        ` : ''}
      </div>
      
      <!-- 音频播放器（如果已生成音频） -->
      ${page.audioUrl ? `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-t border-green-200">
          <div class="flex items-center gap-4">
            <button class="play-audio-btn w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg" data-page="${page.page}">
              ▶️
            </button>
            <audio id="audio-${page.page}" src="${page.audioUrl}" class="hidden"></audio>
            <div class="flex-1">
              <p class="text-sm text-green-700 font-medium">${currentLanguage === 'zh' ? '语音朗读' : 'Audio Narration'}</p>
              <div class="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                <div class="audio-progress h-full bg-green-500 rounded-full w-0 transition-all duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      ` : isLoadingAudio ? `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-t border-green-200 flex items-center gap-3">
          <span class="animate-spin text-green-500">🔊</span>
          <span class="text-green-700">${currentLanguage === 'zh' ? '生成语音中...' : 'Generating audio...'}</span>
        </div>
      ` : ''}
      
      <!-- 文字区域 -->
      <div class="p-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-t-4 border-dashed border-orange-300">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
            ${page.page}
          </div>
          <p class="text-xl text-gray-700 leading-relaxed flex-1 pt-2">
            ${page.text}
          </p>
        </div>
      </div>
    </div>
  `;
}

// 绑定事件
function bindEvents(): void {
  // 模式切换
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = (e.target as HTMLElement).dataset.mode;
      if (mode) {
        currentMode = mode as 'generate' | 'illustrate';
        const app = document.getElementById('app');
        if (app) render(app);
        bindEvents();
      }
    });
  });

  // 语言切换
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = (e.target as HTMLElement).dataset.lang;
      if (lang) {
        currentLanguage = lang as 'zh' | 'en';
        const app = document.getElementById('app');
        if (app) render(app);
        bindEvents();
      }
    });
  });

  // 故事创作模式事件
  if (currentMode === 'generate') {
    bindGenerateModeEvents();
  } else {
    bindIllustrateModeEvents();
  }
}

// 绑定创作模式事件
function bindGenerateModeEvents(): void {
  // 生成按钮
  const generateBtn = document.getElementById('generate-btn');
  const themeInput = document.getElementById('story-theme') as HTMLInputElement;
  
  generateBtn?.addEventListener('click', async () => {
    const theme = themeInput?.value.trim();
    if (!theme) {
      alert(currentLanguage === 'zh' ? '请输入故事主题' : 'Please enter a story theme');
      return;
    }
    await generateStory(theme);
  });

  // 示例主题按钮
  document.querySelectorAll('.example-theme').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const theme = (e.target as HTMLElement).dataset.theme || '';
      if (themeInput) themeInput.value = theme;
      await generateStory(theme);
    });
  });

  // 返回按钮
  const backBtn = document.getElementById('back-btn');
  backBtn?.addEventListener('click', () => {
    currentStory = null;
    currentPage = 0;
    isGeneratingImages = false;
    isGeneratingVideos = false;
    isGeneratingAudio = false;
    const app = document.getElementById('app');
    if (app) render(app);
    bindEvents();
  });

  // 翻页按钮
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  prevBtn?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      updatePage();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentStory && currentPage < currentStory.pages.length - 1) {
      currentPage++;
      updatePage();
    }
  });

  // 生成所有插图按钮
  const generateAllImagesBtn = document.getElementById('generate-all-images');
  generateAllImagesBtn?.addEventListener('click', async () => {
    if (!isGeneratingImages && currentStory) {
      await generateAllIllustrations();
    }
  });

  // 生成所有视频按钮
  const generateAllVideosBtn = document.getElementById('generate-all-videos');
  generateAllVideosBtn?.addEventListener('click', async () => {
    if (!isGeneratingVideos && currentStory) {
      await generateAllVideos();
    }
  });

  // 生成所有语音按钮
  const generateAllAudioBtn = document.getElementById('generate-all-audio');
  generateAllAudioBtn?.addEventListener('click', async () => {
    if (!isGeneratingAudio && currentStory) {
      await generateAllAudio();
    }
  });

  // 播放音频按钮
  document.querySelectorAll('.play-audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = (e.target as HTMLElement).dataset.page;
      if (page) {
        const audio = document.getElementById(`audio-${page}`) as HTMLAudioElement;
        if (audio) {
          if (audio.paused) {
            audio.play();
            (e.target as HTMLElement).textContent = '⏸️';
          } else {
            audio.pause();
            (e.target as HTMLElement).textContent = '▶️';
          }
        }
      }
    });
  });
}

// 绑定插图模式事件
function bindIllustrateModeEvents(): void {
  // 生成图片按钮
  const generateBtn = document.getElementById('generate-image-btn');
  const storyTextarea = document.getElementById('story-text') as HTMLTextAreaElement;
  
  generateBtn?.addEventListener('click', async () => {
    const storyText = storyTextarea?.value.trim();
    if (!storyText) {
      alert(currentLanguage === 'zh' ? '请输入故事内容' : 'Please enter story content');
      return;
    }
    await generateImageFromStory(storyText);
  });

  // 示例文本按钮
  document.querySelectorAll('.example-text').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const text = (e.target as HTMLElement).dataset.text || '';
      if (storyTextarea) storyTextarea.value = text;
      await generateImageFromStory(text);
    });
  });

  // 清除结果
  const clearBtn = document.getElementById('clear-results');
  clearBtn?.addEventListener('click', () => {
    generatedImages = [];
    const app = document.getElementById('app');
    if (app) render(app);
    bindEvents();
  });

  // 重新生成
  const regenerateBtn = document.getElementById('regenerate-btn');
  regenerateBtn?.addEventListener('click', async () => {
    if (generatedImages.length > 0) {
      const lastText = generatedImages[generatedImages.length - 1].text;
      await generateImageFromStory(lastText);
    }
  });
}

// 更新页面显示
function updatePage(): void {
  const container = document.querySelector('.bg-white.rounded-3xl');
  if (container) {
    container.innerHTML = renderCurrentPage();
    
    // 更新翻页按钮状态
    const prevBtn = document.getElementById('prev-page') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page') as HTMLButtonElement;
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn && currentStory) nextBtn.disabled = currentPage === currentStory.pages.length - 1;
    
    // 更新页码显示
    const pageIndicator = document.querySelector('.bg-purple-100.rounded-full');
    if (pageIndicator && currentStory) {
      pageIndicator.textContent = `${currentLanguage === 'zh' ? '第' : 'Page'} ${currentPage + 1} / ${currentStory.pages.length}`;
    }
    
    // 如果当前页没有图片，尝试生成
    const page = currentStory?.pages[currentPage];
    if (page && !page.imageUrl && !isGeneratingImages) {
      generateCurrentPageIllustration();
    }
  }
}

// 生成故事
async function generateStory(theme: string): Promise<void> {
  const btn = document.getElementById('generate-btn');
  const btnText = document.getElementById('generate-btn-text');
  const spinner = document.getElementById('generate-spinner');
  
  if (btn) (btn as HTMLButtonElement).disabled = true;
  if (btnText) btnText.textContent = currentLanguage === 'zh' ? '正在创作故事...' : 'Creating story...';
  if (spinner) spinner.classList.remove('hidden');

  try {
    // 调用后端 API
    const response = await fetch('/api/story/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, language: currentLanguage }),
    });

    const data = await response.json();
    
    if (data.success) {
      currentStory = data.story;
      currentPage = 0;
      
      // 重新渲染界面
      const app = document.getElementById('app');
      if (app) render(app);
      bindEvents();
      
      // 自动开始生成插图
      isGeneratingImages = true;
      await generateAllIllustrations();
    } else {
      alert(data.error || (currentLanguage === 'zh' ? '生成失败，请重试' : 'Failed, please try again'));
      resetButton();
    }
  } catch (error) {
    console.error('生成故事失败:', error);
    alert(currentLanguage === 'zh' ? '网络错误，请检查后重试' : 'Network error, please try again');
    resetButton();
  }
}

// 根据故事生成图片
async function generateImageFromStory(storyText: string): Promise<void> {
  const btn = document.getElementById('generate-image-btn');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');
  
  if (btn) (btn as HTMLButtonElement).disabled = true;
  if (btnText) btnText.textContent = '正在生成...';
  if (spinner) spinner.classList.remove('hidden');

  try {
    // 调用后端 API
    const response = await fetch('/api/story/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyText }),
    });

    const data = await response.json();
    
    if (data.success) {
      // 添加到结果列表
      generatedImages.push({
        index: generatedImages.length,
        text: storyText,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt
      });
      
      // 重新渲染界面
      const app = document.getElementById('app');
      if (app) render(app);
      bindEvents();
    } else {
      alert(data.error || (currentLanguage === 'zh' ? '生成失败，请重试' : 'Failed, please try again'));
    }
  } catch (error) {
    console.error('生成图片失败:', error);
    alert(currentLanguage === 'zh' ? '网络错误，请检查后重试' : 'Network error, please try again');
  } finally {
    if (btn) (btn as HTMLButtonElement).disabled = false;
    if (btnText) btnText.textContent = currentLanguage === 'zh' ? '🎨 生成插图' : '🎨 Generate Image';
    if (spinner) spinner.classList.add('hidden');
  }
}

// 生成所有插图
async function generateAllIllustrations(): Promise<void> {
  if (!currentStory) return;
  
  try {
    const response = await fetch('/api/story/generate-illustrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: currentStory }),
    });

    const data = await response.json();
    
    if (data.success) {
      currentStory = data.story;
      isGeneratingImages = false;
      
      // 更新当前页面的图片显示
      updatePage();
    }
  } catch (error) {
    console.error('生成插图失败:', error);
    isGeneratingImages = false;
  }
}

// 生成所有视频
async function generateAllVideos(): Promise<void> {
  if (!currentStory) return;
  
  // 确保有插图才能生成视频
  const hasImages = currentStory.pages.some(p => p.imageUrl);
  if (!hasImages) {
    alert(currentLanguage === 'zh' ? '请先生成插图，再生成视频' : 'Please generate images first, then generate videos');
    return;
  }
  
  isGeneratingVideos = true;
  updatePage();
  
  try {
    const response = await fetch('/api/story/generate-story-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: currentStory }),
    });

    const data = await response.json();
    
    if (data.success) {
      currentStory = data.story;
    }
  } catch (error) {
    console.error('生成视频失败:', error);
  }
  
  isGeneratingVideos = false;
  updatePage();
}

// 生成所有语音
async function generateAllAudio(): Promise<void> {
  if (!currentStory) return;
  
  isGeneratingAudio = true;
  updatePage();
  
  try {
    const response = await fetch('/api/story/generate-story-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: currentStory, language: currentLanguage }),
    });

    const data = await response.json();
    
    if (data.success) {
      currentStory = data.story;
    }
  } catch (error) {
    console.error('生成语音失败:', error);
  }
  
  isGeneratingAudio = false;
  updatePage();
}

// 生成当前页插图
async function generateCurrentPageIllustration(): Promise<void> {
  if (!currentStory || !currentPage) return;
  
  isGeneratingImages = true;
  updatePage();
  
  try {
    const response = await fetch('/api/story/generate-illustrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: currentStory }),
    });

    const data = await response.json();
    
    if (data.success) {
      currentStory = data.story;
    }
  } catch (error) {
    console.error('生成插图失败:', error);
  }
  
  isGeneratingImages = false;
  updatePage();
}

// 重置按钮状态
function resetButton(): void {
  const btn = document.getElementById('generate-btn');
  const btnText = document.getElementById('generate-btn-text');
  const spinner = document.getElementById('generate-spinner');
  
  if (btn) (btn as HTMLButtonElement).disabled = false;
  if (btnText) btnText.textContent = currentLanguage === 'zh' ? '✨ 开始创作' : '✨ Start Creating';
  if (spinner) spinner.classList.add('hidden');
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);

// 暴露到全局
(window as unknown as { initApp: typeof initApp }).initApp = initApp;
