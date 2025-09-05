// Predefined categories and tools for AI activities
// These can be customized by admins through the dashboard

const AI_CATEGORIES = [
  {
    id: "prompt_engineering",
    name: "Prompt Engineering",
    description: "Experimenting with different prompts and techniques",
    emoji: "🎯",
  },
  {
    id: "code_generation",
    name: "Code Generation",
    description: "Using AI to generate, review, or debug code",
    emoji: "💻",
  },
  {
    id: "content_creation",
    name: "Content Creation",
    description: "Creating text, images, videos, or other content with AI",
    emoji: "✍️",
  },
  {
    id: "data_analysis",
    name: "Data Analysis",
    description: "Analyzing data or creating visualizations with AI",
    emoji: "📊",
  },
  {
    id: "automation",
    name: "Automation",
    description: "Building automated workflows or processes with AI",
    emoji: "⚙️",
  },
  {
    id: "research",
    name: "Research & Learning",
    description: "Researching AI topics or learning new AI concepts",
    emoji: "🔬",
  },
  {
    id: "prototyping",
    name: "Prototyping",
    description: "Building prototypes or proof-of-concepts with AI",
    emoji: "🚀",
  },
  {
    id: "collaboration",
    name: "AI Collaboration",
    description: "Working with AI as a collaborative partner",
    emoji: "🤝",
  },
  {
    id: "other",
    name: "Other",
    description: "Other AI activities not covered above",
    emoji: "✨",
  },
];

const AI_TOOLS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "general",
    emoji: "🤖",
  },
  {
    id: "claude",
    name: "Claude",
    category: "general",
    emoji: "🧠",
  },
  {
    id: "github_copilot",
    name: "GitHub Copilot",
    category: "coding",
    emoji: "👨‍💻",
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "coding",
    emoji: "⌨️",
  },
  {
    id: "midjourney",
    name: "Midjourney",
    category: "image",
    emoji: "🎨",
  },
  {
    id: "dalle",
    name: "DALL-E",
    category: "image",
    emoji: "🖼️",
  },
  {
    id: "stable_diffusion",
    name: "Stable Diffusion",
    category: "image",
    emoji: "🎭",
  },
  {
    id: "notion_ai",
    name: "Notion AI",
    category: "productivity",
    emoji: "📝",
  },
  {
    id: "jupyter",
    name: "Jupyter + AI",
    category: "data",
    emoji: "📊",
  },
  {
    id: "langchain",
    name: "LangChain",
    category: "development",
    emoji: "🔗",
  },
  {
    id: "openai_api",
    name: "OpenAI API",
    category: "development",
    emoji: "🔌",
  },
  {
    id: "anthropic_api",
    name: "Anthropic API",
    category: "development",
    emoji: "🔌",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    category: "development",
    emoji: "🤗",
  },
  {
    id: "zapier",
    name: "Zapier AI",
    category: "automation",
    emoji: "⚡",
  },
  {
    id: "make",
    name: "Make (Integromat)",
    category: "automation",
    emoji: "🔧",
  },
  {
    id: "other_tool",
    name: "Other Tool",
    category: "other",
    emoji: "🛠️",
  },
];

const TOOL_CATEGORIES = [
  { id: "general", name: "General AI", emoji: "🤖" },
  { id: "coding", name: "Coding", emoji: "💻" },
  { id: "image", name: "Image Generation", emoji: "🎨" },
  { id: "productivity", name: "Productivity", emoji: "📈" },
  { id: "data", name: "Data & Analytics", emoji: "📊" },
  { id: "development", name: "Development", emoji: "🔧" },
  { id: "automation", name: "Automation", emoji: "⚙️" },
  { id: "other", name: "Other", emoji: "✨" },
];

// Weekly check-in message templates
const MESSAGE_TEMPLATES = {
  weekly_checkin: {
    title: "🐝 WDAI Hive Weekly Check-in",
    description:
      "Hey there! It's time for your weekly AI check-in. Have you played with AI this week?",
    ai_definition:
      "Playing with AI means experimenting with AI tools, building something using AI, exploring new AI features, or learning about AI concepts. It could be as simple as trying a new prompt or as complex as building an AI-powered application!",
    yes_button: "Yes, I played with AI! 🎉",
    no_button: "Not this week 😔",
  },
  category_selection: {
    title: "What did you work on?",
    description:
      "Great! Let's capture what you explored. What category best describes your AI activity?",
    next_button: "Next ➡️",
  },
  tool_selection: {
    title: "Which tools did you use?",
    description: "Which AI tools or platforms did you experiment with? (You can select multiple)",
    next_button: "Next ➡️",
  },
  custom_details: {
    title: "Tell us more! (Optional)",
    description:
      "Feel free to share more details about what you built, learned, or discovered. This helps inspire others in the community!",
    submit_button: "Submit 🚀",
    skip_button: "Skip",
  },
  thank_you: {
    title: "Thanks for sharing! 🎉",
    description:
      "Your AI adventure has been recorded in the WDAI Hive. Keep exploring and inspiring others!",
  },
  no_response: {
    title: "No worries! 😊",
    description:
      "That's totally fine! We'll check in again next week. Feel free to reach out if you have any questions about AI tools or want to explore something specific.",
  },
};

module.exports = {
  AI_CATEGORIES,
  AI_TOOLS,
  TOOL_CATEGORIES,
  MESSAGE_TEMPLATES,
};
