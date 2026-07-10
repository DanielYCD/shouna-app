const api = require('../../utils/api.js')
const { getCurrentFamily } = require('../../utils/util.js')

Page({
  data: {
    familyName: '',
    stats: { items: 0, categories: 0, floors: 0 },
    recent: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const fam = getCurrentFamily()
    if (!fam) {
      wx.showToast({ title: '请先在「家庭」中创建或加入家庭', icon: 'none' })
      this.setData({ familyName: '', recent: [], stats: { items: 0, categories: 0, floors: 0 } })
      return
    }
    this.setData({
      familyName: fam.name,
      stats: { items: 0, categories: (fam.categories || []).length, floors: 0 }
    })
    api.items.list({ familyId: fam._id, limit: 5 }).then(r => {
      this.setData({
        recent: r.items,
        stats: Object.assign({}, this.data.stats, { items: r.total })
      })
    }).catch(() => {})
    api.floor.list(fam._id).then(r => {
      this.setData({
        stats: Object.assign({}, this.data.stats, { floors: r.floors.length })
      })
    }).catch(() => {})
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/item-edit/item-edit?mode=add' })
  },
  goItems() {
    wx.switchTab({ url: '/pages/items/items' })
  },
  goMap() {
    wx.navigateTo({ url: '/pages/map/map' })
  },
  goFamily() {
    wx.switchTab({ url: '/pages/family/family' })
  },
  openItem(e) {
    const id = e.currentTarget.dataset.id
    const fam = getCurrentFamily()
    wx.navigateTo({ url: `/pages/item-edit/item-edit?mode=edit&id=${id}&familyId=${fam._id}` })
  }
})
