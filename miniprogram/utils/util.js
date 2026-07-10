// 通用小工具
function maskOpenid(openid) {
  if (!openid) return ''
  if (openid.length < 8) return openid
  return openid.slice(0, 4) + '****' + openid.slice(-4)
}

function getCurrentFamily() {
  const app = getApp()
  const id = app.globalData.currentFamilyId
  return (app.globalData.families || []).find(f => f._id === id) || null
}

function setCurrentFamily(familyId) {
  const app = getApp()
  app.globalData.currentFamilyId = familyId
  wx.setStorageSync('currentFamilyId', familyId)
}

module.exports = { maskOpenid, getCurrentFamily, setCurrentFamily }
