const api = require('../../utils/api.js')
const { getCurrentFamily } = require('../../utils/util.js')

Page({
  data: {
    familyId: '',
    floors: [],
    activeFloorId: '',
    activeFloor: null,
    markers: [],
    marking: false,
    markingItem: null,
    items: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const fam = getCurrentFamily()
    if (!fam) return
    this.setData({ familyId: fam._id })
    api.floor.list(fam._id).then(r => {
      const floors = r.floors
      const active = floors[0] ? floors[0]._id : ''
      this.setData({ floors, activeFloorId: active, marking: false, markingItem: null })
      this.loadActive()
    }).catch(() => {})
  },

  selectFloor(e) {
    this.setData({ activeFloorId: e.currentTarget.dataset.id, marking: false, markingItem: null })
    this.loadActive()
  },

  loadActive() {
    const fid = this.data.activeFloorId
    if (!fid) {
      this.setData({ activeFloor: null, markers: [] })
      return
    }
    const floor = this.data.floors.find(f => f._id === fid) || null
    api.floor.markers(this.data.familyId, fid).then(r => {
      this.setData({ activeFloor: floor, markers: r.markers })
    }).catch(() => {})
  },

  addFloor() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const filePath = res.tempFiles[0].tempFilePath
        const m = filePath.match(/\.(\w+)$/)
        const ext = m ? m[1] : 'png'
        const cloudPath = `floors/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`
        wx.showLoading({ title: '上传中' })
        wx.cloud.uploadFile({ cloudPath, filePath }).then(up => {
          wx.hideLoading()
          wx.showModal({
            title: '楼层名称',
            editable: true,
            placeholderText: '如：一楼',
            success: mr => {
              const name = mr.confirm && mr.content.trim() ? mr.content.trim() : '楼层'
              api.floor.add(this.data.familyId, name, up.fileID)
                .then(() => this.refresh())
                .catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
            }
          })
        }).catch(() => {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  },

  renameFloor() {
    if (!this.data.activeFloor) return
    wx.showModal({
      title: '重命名楼层',
      editable: true,
      placeholderText: '新名称',
      content: this.data.activeFloor.name,
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.floor.rename(this.data.familyId, this.data.activeFloorId, res.content.trim())
            .then(() => this.refresh())
            .catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  delFloor() {
    if (!this.data.activeFloor) return
    wx.showModal({
      title: '删除楼层',
      content: '将清除该楼层上的所有标记',
      success: res => {
        if (res.confirm) {
          api.floor.del(this.data.familyId, this.data.activeFloorId)
            .then(() => this.refresh())
            .catch(e => wx.showToast({ title: e.message || '失败', icon: 'none' }))
        }
      }
    })
  },

  startMark() {
    if (!this.data.activeFloor) {
      wx.showToast({ title: '请先添加楼层', icon: 'none' })
      return
    }
    api.items.list({ familyId: this.data.familyId, limit: 300 }).then(r => {
      this.setData({ items: r.items, marking: true, markingItem: null })
    }).catch(() => {})
  },

  pickItem(e) {
    const id = e.currentTarget.dataset.id
    const it = this.data.items.find(x => x._id === id)
    this.setData({ markingItem: it })
    wx.showToast({ title: '已选「' + it.name + '」，点击户型图放置', icon: 'none' })
  },

  cancelMark() {
    this.setData({ marking: false, markingItem: null })
  },

  onImageTap(e) {
    if (!this.data.marking || !this.data.markingItem) {
      if (this.data.activeFloor) wx.showToast({ title: '点「标记物品」后可放置', icon: 'none' })
      return
    }
    const q = wx.createSelectorQuery()
    q.select('#floorImg').boundingClientRect(rect => {
      if (!rect) return
      const px = e.detail.x - rect.left
      const py = e.detail.y - rect.top
      const x = Math.max(0, Math.min(1, px / rect.width))
      const y = Math.max(0, Math.min(1, py / rect.height))
      wx.showLoading({ title: '标记中' })
      api.floor.setMarker(this.data.familyId, this.data.markingItem._id, this.data.activeFloorId, x, y)
        .then(() => {
          wx.hideLoading()
          wx.showToast({ title: '已标记', icon: 'success' })
          this.setData({ marking: false, markingItem: null })
          this.loadActive()
        })
        .catch(err => {
          wx.hideLoading()
          wx.showToast({ title: (err && err.message) || '失败', icon: 'none' })
        })
    }).exec()
  },

  onMarkerTap(e) {
    const name = e.currentTarget.dataset.name
    wx.showToast({ title: name, icon: 'none' })
  }
})
