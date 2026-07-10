const api = require('../../utils/api.js')
const { maskOpenid, getCurrentFamily } = require('../../utils/util.js')

Page({
  data: {
    maskedOpenid: '',
    familyName: '',
    itemCount: 0
  },

  onShow() {
    const app = getApp()
    const fam = getCurrentFamily()
    this.setData({
      maskedOpenid: maskOpenid(app.globalData.openid),
      familyName: fam ? fam.name : ''
    })
    if (fam) {
      api.items.list({ familyId: fam._id, limit: 1 }).then(r => {
        this.setData({ itemCount: r.total })
      }).catch(() => {})
    } else {
      this.setData({ itemCount: 0 })
    }
  },

  copyOpenid() {
    const app = getApp()
    if (app.globalData.openid) wx.setClipboardData({ data: app.globalData.openid })
  },

  exportData() {
    const fam = getCurrentFamily()
    if (!fam) {
      wx.showToast({ title: '请先选择家庭', icon: 'none' })
      return
    }
    wx.showLoading({ title: '导出中' })
    Promise.all([
      api.items.list({ familyId: fam._id, limit: 1000 }),
      api.floor.list(fam._id)
    ]).then(([ir, fr]) => {
      const data = {
        app: 'shouna-app',
        exportedAt: new Date().toISOString(),
        familyId: fam._id,
        familyName: fam.name,
        items: ir.items,
        floors: fr.floors
      }
      wx.hideLoading()
      wx.setClipboardData({
        data: JSON.stringify(data, null, 2),
        success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' })
      })
    }).catch(e => {
      wx.hideLoading()
      wx.showToast({ title: (e && e.message) || '导出失败', icon: 'none' })
    })
  },

  goPwa() {
    wx.setClipboardData({
      data: 'https://danielycd.github.io/shouna-app/',
      success: () => wx.showToast({ title: '已复制网页版地址', icon: 'none' })
    })
  }
})
