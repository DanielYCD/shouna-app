const { ENV_ID } = require('./config.js')

App({
  globalData: {
    openid: null,
    userInfo: null,
    families: [],
    currentFamilyId: null,
    envId: ENV_ID
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请使用 2.2.3 或以上的基础库')
      wx.showModal({
        title: '环境异常',
        content: '当前微信基础库不支持云开发，请在开发者工具中升级基础库版本。',
        showCancel: false
      })
      return
    }
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true
    })
    this.autoLogin()
  },

  // 打开即自动注册/登录：调用 initUser 云函数
  // - 首次打开：自动建档案 + 默认家庭
  // - 之后打开：自动取回档案与家庭列表
  // 整个过程无需任何登录界面，符合「微信打开自动注册登录」要求
  autoLogin() {
    wx.cloud.callFunction({ name: 'initUser', data: {} })
      .then(res => {
        const r = res.result || {}
        if (r.success) {
          const app = this
          app.globalData.openid = r.openid
          app.globalData.userInfo = r.profile
          app.globalData.families = r.families || []
          const saved = wx.getStorageSync('currentFamilyId')
          let cur = (r.families || []).find(f => f._id === saved)
          if (!cur) cur = (r.families || [])[0]
          app.globalData.currentFamilyId = cur ? cur._id : null
          wx.setStorageSync('openid', r.openid)
          wx.setStorageSync('currentFamilyId', app.globalData.currentFamilyId)
        } else {
          console.error('initUser 失败:', r.error)
        }
      })
      .catch(err => {
        console.error('autoLogin 出错:', err)
      })
  }
})
