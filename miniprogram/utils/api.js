// 统一的云函数调用封装
// 所有家庭数据都经过云函数中转，由服务端校验 OPENID + 家庭成员关系
const DEFAULT_CATEGORIES = ['衣物', '数码', '厨房', '书籍', '工具', '洗护', '药品', '其他']

function call(funcName, action, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: funcName,
      data: Object.assign({ action: action }, data || {})
    }).then(res => {
      const r = res.result || {}
      if (r && r.success) resolve(r)
      else reject(new Error((r && r.error) || '调用失败'))
    }).catch(err => reject(err))
  })
}

const api = {
  DEFAULT_CATEGORIES,

  initUser: () => call('initUser', 'init', {}),

  family: {
    list: () => call('family', 'list', {}),
    create: (name) => call('family', 'create', { name }),
    join: (code) => call('family', 'join', { code }),
    members: (familyId) => call('family', 'members', { familyId }),
    rename: (familyId, name) => call('family', 'rename', { familyId, name }),
    refreshCode: (familyId) => call('family', 'refreshCode', { familyId }),
    del: (familyId) => call('family', 'del', { familyId }),
    addCategory: (familyId, name) => call('family', 'addCategory', { familyId, name }),
    delCategory: (familyId, name) => call('family', 'delCategory', { familyId, name })
  },

  items: {
    list: (opts) => call('items', 'list', opts),
    add: (familyId, item) => call('items', 'add', { familyId, item }),
    update: (familyId, itemId, item) => call('items', 'update', { familyId, itemId, item }),
    del: (familyId, itemId) => call('items', 'del', { familyId, itemId }),
    detail: (familyId, itemId) => call('items', 'detail', { familyId, itemId })
  },

  floor: {
    list: (familyId) => call('floor', 'list', { familyId }),
    add: (familyId, name, imageFileId) => call('floor', 'add', { familyId, name, imageFileId }),
    rename: (familyId, floorId, name) => call('floor', 'rename', { familyId, floorId, name }),
    del: (familyId, floorId) => call('floor', 'del', { familyId, floorId }),
    markers: (familyId, floorId) => call('floor', 'markers', { familyId, floorId }),
    setMarker: (familyId, itemId, floorId, x, y) => call('floor', 'setMarker', { familyId, itemId, floorId, x, y })
  }
}

module.exports = api
