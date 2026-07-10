const api = require('../../utils/api.js')
const { getCurrentFamily } = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    activeCat: 'all',
    categories: ['all'],
    items: [],
    familyId: '',
    skip: 0,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
    const fam = getCurrentFamily()
    if (!fam) {
      this.setData({ items: [], familyId: '' })
      return
    }
    const cats = ['all'].concat(fam.categories || api.DEFAULT_CATEGORIES)
    this.setData({
      familyId: fam._id,
      categories: cats,
      activeCat: 'all',
      skip: 0,
      items: [],
      total: 0,
      hasMore: true
    }, () => this.load(true))
  },

  onPullDownRefresh() {
    this.setData({ skip: 0, items: [], hasMore: true }, () => {
      this.load(true).then(() => wx.stopPullDownRefresh())
    })
  },

  onReachBottom() {
    if (this.data.hasMore) this.load(false)
  },

  onSearchInput(e) {
    const v = e.detail.value
    this.setData({ keyword: v })
    clearTimeout(this._t)
    this._t = setTimeout(() => {
      this.setData({ skip: 0, items: [], hasMore: true })
      this.load(true)
    }, 300)
  },

  onCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat, skip: 0, items: [], hasMore: true }, () => {
      this.load(true)
    })
  },

  load(reset) {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    const opts = {
      familyId: this.data.familyId,
      category: this.data.activeCat,
      keyword: this.data.keyword,
      skip: this.data.skip,
      limit: 30
    }
    return api.items.list(opts).then(r => {
      const items = reset ? r.items : this.data.items.concat(r.items)
      const nextSkip = this.data.skip + r.items.length
      this.setData({
        items,
        total: r.total,
        skip: nextSkip,
        hasMore: nextSkip < r.total,
        loading: false
      })
    }).catch(e => {
      this.setData({ loading: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    })
  },

  openItem(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/item-edit/item-edit?mode=edit&id=${id}&familyId=${this.data.familyId}` })
  },

  goAdd() {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?mode=add&familyId=${this.data.familyId}` })
  }
})
