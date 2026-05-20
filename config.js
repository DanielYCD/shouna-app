// Supabase配置文件
// 请将以下值替换为你的Supabase项目配置

const SUPABASE_CONFIG = {
  // Supabase项目URL（格式：https://xxx.supabase.co）
  url: 'https://hiimywdvjgdskgwayvdb.supabase.co',

  // Supabase Anon Key（公开API密钥）
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaW15d2R2amdkc2tnd2F5dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Mzk0MjIsImV4cCI6MjA5NDMxNTQyMn0.9ec4b9V33eNPt_QHr6VPgn2rl80MH4011lx9h_FX3e8',

  // 数据库表名配置
  tables: {
    profiles: 'profiles',
    families: 'families',
    familyMembers: 'family_members',
    items: 'items',
    customCategories: 'custom_categories'
  },

  // 认证配置
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },

  // 实时同步配置
  realtime: {
    enabled: true
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}