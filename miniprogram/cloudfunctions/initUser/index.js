// 打开小程序即自动注册/登录：
// 1) 首次打开：自动创建用户档案 + 默认「我的家庭」
// 2) 之后打开：取回档案与家庭列表
// 身份由微信注入的 OPENID 决定，无需任何前端登录界面
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_CATEGORIES = ['衣物', '数码', '厨房', '书籍', '工具', '洗护', '药品', '其他']

function genCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}

async function uniqueCode() {
  for (let t = 0; t < 6; t++) {
    const code = genCode()
    const exist = await db.collection('families').where({ inviteCode: code }).get()
    if (exist.data.length === 0) return code
  }
  return genCode() + Math.floor(Math.random() * 9)
}

// 集合不会随首次写入自动创建，这里幂等确保集合存在
const COLLECTIONS = ['profiles', 'families', 'family_members', 'items', 'floors']
async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try { await db.createCollection(name) } catch (e) { /* 已存在则忽略 */ }
  }
}

exports.main = async (event, context) => {
  const { OPENID, UNIONID } = cloud.getWXContext()
  if (!OPENID) return { success: false, error: '缺少身份信息' }
  try {
    await ensureCollections()
    // 1. 确保档案存在
    const profCol = db.collection('profiles')
    let profile
    const pRes = await profCol.where({ openid: OPENID }).get()
    if (pRes.data.length === 0) {
      const add = await profCol.add({
        data: { openid: OPENID, unionid: UNIONID || '', nickName: '', avatarUrl: '', createdAt: db.serverDate() }
      })
      profile = { _id: add._id, openid: OPENID }
    } else {
      profile = pRes.data[0]
    }

    // 2. 确保至少加入一个家庭
    const memCol = db.collection('family_members')
    let members = await memCol.where({ openid: OPENID }).get()
    if (members.data.length === 0) {
      const code = await uniqueCode()
      const fam = await db.collection('families').add({
        data: {
          name: '我的家庭',
          ownerOpenid: OPENID,
          inviteCode: code,
          categories: DEFAULT_CATEGORIES,
          createdAt: db.serverDate()
        }
      })
      await memCol.add({ data: { familyId: fam._id, openid: OPENID, role: 'owner', joinedAt: db.serverDate() } })
      members = await memCol.where({ openid: OPENID }).get()
    }

    // 3. 取回家庭列表
    const famIds = members.data.map(m => m.familyId)
    let families = []
    if (famIds.length) {
      const fRes = await db.collection('families').where({ _id: _.in(famIds) }).get()
      families = fRes.data
    }

    const firstId = families[0] ? families[0]._id : null
    return { success: true, openid: OPENID, profile, families, currentFamilyId: firstId }
  } catch (e) {
    return { success: false, error: e.message || String(e) }
  }
}
