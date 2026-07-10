const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    mode: 'add',
    id: '',
    familyId: '',
    name: '',
    categoryIndex: 0,
    categories: [],
    quantity: '',
    note: '',
    photoFileId: '',
    photoPath: '',
    submitting: false
  },

  onLoad(q) {
    const fam = (app.globalData.families || []).find(f => f._id === (q.familyId || app.globalData.currentFamilyId))
    const cats = (fam && fam.categories) || api.DEFAULT_CATEGORIES
    this.setData({
      mode: q.mode || 'add',
      id: q.id || '',
      familyId: fam ? fam._id : '',
      categories: cats
    })
    if (q.mode === 'edit' && q.id) {
      wx.setNavigationBarTitle({ title: '编辑物品' })
      api.items.detail(this.data.familyId, q.id).then(r => {
        const it = r.item
        this.setData({
          name: it.name || '',
          categoryIndex: Math.max(0, cats.indexOf(it.category)),
          quantity: it.quantity != null ? String(it.quantity) : '',
          note: it.note || '',
          photoFileId: it.photoFileId || '',
          photoPath: it.photoFileId || ''
        })
      }).catch(e => wx.showToast({ title: e.message || '加载失败', icon: 'none' }))
    } else {
      wx.setNavigationBarTitle({ title: '记一笔' })
    }
  },

  onName(e) { this.setData({ name: e.detail.value }) },
  onNote(e) { this.setData({ note: e.detail.value }) },
  onQty(e) { this.setData({ quantity: e.detail.value }) },
  onCategory(e) { this.setData({ categoryIndex: Number(e.detail.value) }) },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const filePath = res.tempFiles[0].tempFilePath
        this.setData({ photoPath: filePath })
        const m = filePath.match(/\.(\w+)$/)
        const ext = m ? m[1] : 'png'
        const cloudPath = `items/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`
        wx.showLoading({ title: '上传中' })
        wx.cloud.uploadFile({ cloudPath, filePath })
          .then(up => {
            this.setData({ photoFileId: up.fileID })
            wx.hideLoading()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
          })
      }
    })
  },

  removePhoto() {
    this.setData({ photoFileId: '', photoPath: '' })
  },

  save() {
    if (this.data.submitting) return
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const item = {
      name,
      category: this.data.categories[this.data.categoryIndex],
      quantity: this.data.quantity ? Number(this.data.quantity) : undefined,
      note: this.data.note,
      photoFileId: this.data.photoFileId || ''
    }
    const done = () => {
      this.setData({ submitting: false })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    }
    const fail = (e) => {
      this.setData({ submitting: false })
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
    }
    if (this.data.mode === 'edit') {
      api.items.update(this.data.familyId, this.data.id, item).then(done).catch(fail)
    } else {
      api.items.add(this.data.familyId, item).then(done).catch(fail)
    }
  },

  remove() {
    wx.showModal({
      title: '删除物品',
      content: '确定删除该物品？',
      success: res => {
        if (res.confirm) {
          api.items.del(this.data.familyId, this.data.id)
            .then(() => { wx.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) })
            .catch(e => wx.showToast({ title: (e && e.message) || '删除失败', icon: 'none' }))
        }
      }
    })
  }
})
