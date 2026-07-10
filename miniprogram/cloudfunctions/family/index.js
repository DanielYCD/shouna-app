// 家庭管理云函数：列表 / 创建 / 加入 / 成员 / 改名 / 刷新邀请码 / 删除 / 分类管理
// 所有写操作均在服务端校验 OPENID 与家庭成员关系
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}

async function isMember(familyId, openid) {
  const r = await db.collection('family_members').where({ familyId, openid }).get()
  return r.data.length > 0
}

async function isOwner(familyId, openid) {
  const r = await db.collection('families').doc(familyId).get()
  return r.data && r.data.ownerOpenid === openid
}

async function uniqueCode() {
  for (let t = 0; t < 6; t++) {
    const code = genCode()
    const exist = await db.collection('families').where({ inviteCode: code }).get()
    if (exist.data.length === 0) return code
  }
  return genCode() + Math.floor(Math.random() * 9)
}

const COLLECTIONS = ['profiles', 'families', 'family_members', 'items', 'floors']
async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try { await db.createCollection(name) } catch (e) { /* 已存在则忽略 */ }
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, error: '缺少身份信息' }
  const { action } = event
  try {
    await ensureCollections()
    if (action === 'list') {
      const mem = await db.collection('family_members').where({ openid: OPENID }).get()
      const ids = mem.data.map(m => m.familyId)
      let families = []
      if (ids.length) {
        const f = await db.collection('families').where({ _id: _.in(ids) }).get()
        families = f.data
      }
      return { success: true, families }
    }

    if (action === 'create') {
      const name = (event.name || '我的家庭').toString().slice(0, 20) || '我的家庭'
      const code = await uniqueCode()
      const fam = await db.collection('families').add({
        data: {
          name,
          ownerOpenid: OPENID,
          inviteCode: code,
          categories: ['衣物', '数码', '厨房', '书籍', '工具', '洗护', '药品', '其他'],
          createdAt: db.serverDate()
        }
      })
      await db.collection('family_members').add({
        data: { familyId: fam._id, openid: OPENID, role: 'owner', joinedAt: db.serverDate() }
      })
      return { success: true, family: { _id: fam._id, name, inviteCode: code, ownerOpenid: OPENID } }
    }

    if (action === 'join') {
      const code = (event.code || '').toString().toUpperCase().trim()
      if (!/^[A-Z0-9]{6}$/.test(code)) return { success: false, error: '邀请码格式不正确（6位字母数字）' }
      const f = await db.collection('families').where({ inviteCode: code }).get()
      if (!f.data.length) return { success: false, error: '邀请码无效' }
      const family = f.data[0]
      if (await isMember(family._id, OPENID)) return { success: false, error: '你已在该家庭中' }
      await db.collection('family_members').add({
        data: { familyId: family._id, openid: OPENID, role: 'member', joinedAt: db.serverDate() }
      })
      return { success: true, family }
    }

    if (action === 'members') {
      const { familyId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const mem = await db.collection('family_members').where({ familyId }).get()
      return { success: true, members: mem.data }
    }

    if (action === 'rename') {
      const { familyId, name } = event
      if (!await isOwner(familyId, OPENID)) return { success: false, error: '仅家庭创建者可操作' }
      await db.collection('families').doc(familyId).update({ data: { name: name.toString().slice(0, 20) } })
      return { success: true }
    }

    if (action === 'refreshCode') {
      const { familyId } = event
      if (!await isOwner(familyId, OPENID)) return { success: false, error: '仅家庭创建者可操作' }
      const code = await uniqueCode()
      await db.collection('families').doc(familyId).update({ data: { inviteCode: code } })
      return { success: true, inviteCode: code }
    }

    if (action === 'addCategory') {
      const { familyId, name } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const fam = await db.collection('families').doc(familyId).get()
      const cats = fam.data.categories || []
      const n = (name || '').toString().trim().slice(0, 10)
      if (!n) return { success: false, error: '分类名不能为空' }
      if (cats.includes(n)) return { success: false, error: '分类已存在' }
      cats.push(n)
      await db.collection('families').doc(familyId).update({ data: { categories: cats } })
      return { success: true, categories: cats }
    }

    if (action === 'delCategory') {
      const { familyId, name } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const fam = await db.collection('families').doc(familyId).get()
      const cats = (fam.data.categories || []).filter(c => c !== name)
      await db.collection('families').doc(familyId).update({ data: { categories: cats } })
      return { success: true, categories: cats }
    }

    if (action === 'del') {
      const { familyId } = event
      if (!await isOwner(familyId, OPENID)) return { success: false, error: '仅家庭创建者可操作' }
      await db.collection('family_members').where({ familyId }).remove()
      await db.collection('items').where({ familyId }).remove()
      await db.collection('floors').where({ familyId }).remove()
      await db.collection('families').doc(familyId).remove()
      return { success: true }
    }

    return { success: false, error: '未知操作' }
  } catch (e) {
    return { success: false, error: e.message || String(e) }
  }
}
