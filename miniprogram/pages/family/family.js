const api = require('../../utils/api.js')
const { maskOpenid, getCurrentFamily, setCurrentFamily } = require('../../utils/util.js')

Page({
  data: {
    families: [],
    currentFamilyId: '',
    current: null,
    members: [],
    inviteCode: '',
    maskedOpenid: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const app = getApp()
    const fams = app.globalData.families || []
    const cur = getCurrentFamily()
    this.setData({
      families: fams,
      currentFamilyId: app.globalData.currentFamilyId,
      maskedOpenid: maskOpenid(app.globalData.openid),
      current: cur,
      inviteCode: cur ? cur.inviteCode : ''
    })
    if (cur) this.loadMembers(cur._id)
    else this.setData({ members: [] })
  },

  loadMembers(familyId) {
    api.family.members(familyId).then(r => {
      this.setData({
        members: r.members.map(m => ({ role: m.role, masked: maskOpenid(m.openid) }))
      })
    }).catch(() => {})
  },

  switchFamily(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentFamilyId) return
    setCurrentFamily(id)
    this.refresh()
    wx.showToast({ title: '已切换家庭', icon: 'success' })
  },

  createFamily() {
    wx.showModal({
      title: '创建家庭',
      editable: true,
      placeholderText: '家庭名称',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.family.create(res.content.trim()).then(r => {
            const app = getApp()
            app.globalData.families.push(r.family)
            setCurrentFamily(r.family._id)
            this.refresh()
            wx.showToast({ title: '已创建', icon: 'success' })
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  joinFamily() {
    wx.showModal({
      title: '加入家庭',
      editable: true,
      placeholderText: '输入6位邀请码',
      success: res => {
        if (res.confirm && res.content) {
          api.family.join(res.content.trim().toUpperCase()).then(r => {
            const app = getApp()
            app.globalData.families.push(r.family)
            this.refresh()
            wx.showToast({ title: '已加入', icon: 'success' })
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  copyCode() {
    if (!this.data.inviteCode) return
    wx.setClipboardData({ data: this.data.inviteCode })
  },

  renameFamily() {
    wx.showModal({
      title: '重命名家庭',
      editable: true,
      placeholderText: '新名称',
      content: this.data.current ? this.data.current.name : '',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.family.rename(this.data.currentFamilyId, res.content.trim()).then(() => {
            const f = (getApp().globalData.families || []).find(x => x._id === this.data.currentFamilyId)
            if (f) f.name = res.content.trim()
            this.refresh()
            wx.showToast({ title: '已重命名', icon: 'success' })
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  refreshCode() {
    api.family.refreshCode(this.data.currentFamilyId).then(r => {
      const f = (getApp().globalData.families || []).find(x => x._id === this.data.currentFamilyId)
      if (f) f.inviteCode = r.inviteCode
      this.refresh()
      wx.showToast({ title: '已刷新邀请码', icon: 'success' })
    }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
  },

  delFamily() {
    wx.showModal({
      title: '删除家庭',
      content: '将删除该家庭及全部物品、户型图，不可恢复',
      success: res => {
        if (res.confirm) {
          api.family.del(this.data.currentFamilyId).then(() => {
            const app = getApp()
            app.globalData.families = app.globalData.families.filter(x => x._id !== this.data.currentFamilyId)
            setCurrentFamily(app.globalData.families[0] ? app.globalData.families[0]._id : null)
            this.refresh()
            wx.showToast({ title: '已删除', icon: 'success' })
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  addCategory() {
    wx.showModal({
      title: '新增分类',
      editable: true,
      placeholderText: '分类名称',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.family.addCategory(this.data.currentFamilyId, res.content.trim()).then(r => {
            const f = (getApp().globalData.families || []).find(x => x._id === this.data.currentFamilyId)
            if (f) f.categories = r.categories
            this.refresh()
            wx.showToast({ title: '已添加', icon: 'success' })
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  delCategory(e) {
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '删除分类',
      content: `删除分类「${name}」？`,
      success: res => {
        if (res.confirm) {
          api.family.delCategory(this.data.currentFamilyId, name).then(r => {
            const f = (getApp().globalData.families || []).find(x => x._id === this.data.currentFamilyId)
            if (f) f.categories = r.categories
            this.refresh()
          }).catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  }
})
