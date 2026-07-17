// i18n.js (v10 — Bilingual TH/EN)
// ---------------------------------------------------------------------------
// Localization. All player-facing text lives here, keyed by stable English
// ids — code identifiers stay English, UI text is looked up through t(key,
// params), which interpolates {placeholders}.
//
// v10 CHANGE: the single Thai table is now two parallel tables, TH and EN,
// built with the exact same keys in the exact same order (every TH block
// below has a matching EN block). t()'s signature and every call site in
// the codebase are UNCHANGED — only this file grows. The active table is
// swapped by setLanguage('th' | 'en'), which also persists the choice to
// localStorage (key: 'ashen_lang', matching the project's ashen_* naming
// convention) so it survives reloads. Default language is Thai.
//
// Fallback chain inside t(): current language -> Thai -> the raw key. This
// means a string that's momentarily missing from EN degrades to Thai
// instead of showing a raw i18n key to an English-reading player.
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

const TH = {
  // ---- App / auth ----
  'app.title': 'THE ASHEN TABLE',
  'auth.tagline': 'พิมพ์ชื่อของคุณเพื่อเดินทางต่อจากเซฟเดิม หรือเริ่มการเดินทางใหม่',
  'auth.placeholder': 'ชื่อนักผจญภัย',
  'auth.login': 'เดินทางต่อจากเซฟเดิม',
  'auth.register': 'เริ่มการเดินทางใหม่',
  'auth.google': 'เข้าสู่ระบบด้วย Google',
  'auth.err.short': 'ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร',
  'auth.err.taken': 'ชื่อนี้ถูกใช้แล้ว — ลองกด "เดินทางต่อจากเซฟเดิม" แทน',
  'auth.err.notfound': 'ยังไม่มีเซฟภายใต้ชื่อนี้ — ลองกด "เริ่มการเดินทางใหม่"',

  // ---- Menu / HUD ----
  'menu.map': '🗺 แผนที่โซน',
  'menu.pvp': '🏆 สังเวียน PvP',
  'menu.gear': '🎽 ตุ๊กตากระดาษ',
  'menu.leaderboard': '🏅 กระดานอันดับ',
  'menu.logout': 'ออกจากระบบ',
  'hud.menu': 'เมนู',
  'hud.gear': 'อุปกรณ์',
  'hud.points': '+{n} แต้ม',
  'hud.legacy': 'มรดก',
  'hud.level': 'เลเวล {n}',
  'combat.brief.title': 'สรุประบบต่อสู้',
  'combat.brief.1': 'ความเร็วกำหนดลำดับเทิร์น — ศัตรูที่เร็วกว่าอาจได้ลงมือหลายครั้งก่อนคุณ',
  'combat.brief.2': 'บล็อก / ปัดป้อง คือ "ท่าตั้งรับ" — ตั้งไว้แล้วมันจะสวนการโจมตีที่ตรงเงื่อนไข',
  'combat.brief.3': 'ความแม่นยำปะทะการหลบ — โจมตีพลาดคือไม่เข้าเลย ส่วนคริติคอลแรงทวีคูณ',
  'combat.brief.4': 'ท่าไม้ตายชาร์จด้วยความเร็วเวท ยิ่งสูงยิ่งใช้ได้บ่อย',

  // ---- Character creation ----
  'create.tagline': 'เลือกเส้นทางของคุณ — มี {n} อาชีพให้เลือก',
  'create.legacyNote': 'โบนัสมรดกจากวีรชนผู้ล่วงลับจะถูกมอบให้โดยอัตโนมัติ',
  'create.name.placeholder': 'ตั้งชื่อวีรชนของคุณ',
  'create.confirm': 'เริ่มการเดินทาง',

  // ---- Stats ----
  'stat.maxHp': 'พลังชีวิต',
  'stat.atk': 'พลังโจมตี',
  'stat.def': 'พลังป้องกัน',
  'stat.speed': 'ความเร็ว',
  'stat.dodge': 'หลบหลีก %',
  'stat.accuracy': 'ความแม่นยำ',
  'stat.critRate': 'อัตราคริติคอล %',
  'stat.critDamage': 'ความแรงคริติคอล %',
  'stat.spellSpeed': 'ความเร็วเวท',
  'stat.dotPower': 'พลังดาเมจต่อเนื่อง',
  'stat.lifesteal': 'ดูดเลือด %',
  'allocate.title': 'แต้มสถานะ: {n}',
  'allocate.note': 'ได้รับเมื่อเลเวลอัป ใช้กับสายการเล่นที่คุณถนัด',
  'allocate.done': 'เสร็จสิ้น',

  // ---- Skills ----
  'skill.heavy_attack': 'โจมตีหนัก',
  'skill.heavy_attack.desc': 'ช้าแต่หนัก — โดนปัดป้องสวนได้',
  'skill.quick_strike': 'โจมตีเร็ว',
  'skill.quick_strike.desc': 'เร็วแต่เบา — โดนบล็อกสวนได้',
  'skill.block': 'บล็อก',
  'skill.block.desc': 'ตั้งท่ารับ: สวนโจมตีเร็วครั้งถัดไปที่พุ่งเข้าหาคุณ',
  'skill.parry': 'ปัดป้อง',
  'skill.parry.desc': 'ตั้งท่ารับ: สวนโจมตีหนักครั้งถัดไปที่พุ่งเข้าหาคุณ',
  'skill.signature.charging': 'ท่าไม้ตาย ({n}%)',

  // ---- Battle logs (structured params) ----
  'log.stance': '{name} ตั้งท่า{stance}',
  'log.hit': '{name} โจมตี {target} ด้วย{skill} สร้างความเสียหาย {dmg}',
  'log.crit': '{name} คริติคอล! {skill}ใส่ {target} สร้างความเสียหาย {dmg}',
  'log.miss': '{name} หลบ{skill}ของ {target} ได้!',
  'log.counter': '{name} ใช้{stance}สวน{skill}ของ {target}! ({dmg} ดาเมจ)',
  'log.dot.apply': '{target} ติดสถานะเผาไหม้ ({dmg} ดาเมจ/ครั้ง {ticks} ครั้ง)',
  'log.dot.tick': '{name} เจ็บจากการเผาไหม้ {dmg} ดาเมจ',
  'log.lifesteal': '{name} ดูดเลือดฟื้นฟู {heal} HP',
  'log.sig.notready': 'ท่าไม้ตายยังชาร์จไม่เต็ม',
  'log.sig.heal': '{name} ใช้ {sig}! ฟื้นฟู {heal} HP',
  'log.sig.buff': '{name} ใช้ {sig}! เพิ่ม{stat} {n} เทิร์น',
  'log.sig.multibuff': '{name} ใช้ {sig}! เสริมพลังทุกด้าน {n} เทิร์น',
  'log.sig.vanish': '{name} ใช้ {sig}! หายวับ — การโจมตีครั้งถัดไปพลาดแน่นอนและถูกสวนกลับ',
  'log.sig.vanishCounter': 'สวนกลับจากเงามืด! {dmg} ดาเมจ',
  'log.sig.overcharge': '{name} ใช้ {sig}! โจมตีหนักครั้งถัดไปแรงเป็นสองเท่า',
  'log.sig.overchargeBoom': 'พลังเวทระเบิด!',
  'log.sig.dot': '{name} ใช้ {sig}! สาปศัตรูให้เผาไหม้รุนแรง',
  'log.sig.sureCrit': '{name} ใช้ {sig}! การโจมตีครั้งถัดไปเข้าเป้าและคริติคอลแน่นอน',
  'log.sig.drain': '{name} ใช้ {sig}! ดูดวิญญาณ {dmg} ดาเมจ ฟื้นฟู {heal} HP',
  'log.sig.burnOnHit': '{name} ใช้ {sig}! อาวุธลุกเป็นไฟ — การโจมตีติดเผาไหม้ {n} เทิร์น',
  'log.passive.vampiric': 'คมกระหายเลือดของ {name} ฟื้นฟู {heal} HP',
  'log.passive.thorns': 'เกราะหนามของ {name} สะท้อน {dmg} ดาเมจ',
  'log.passive.fleetfoot': 'ฝีเท้าสายลมของ {name} ทำงาน — ความเร็ว +12 ตลอดการต่อสู้',
  'log.hint': 'เลือกการกระทำ',
  // ---- v7: animation layer ----
  'log.ko': '{name} ล้มลงแล้ว!',
  'battle.skipHint': 'แตะสนามรบเพื่อเร่งผลการต่อสู้',
  'fx.miss': 'พลาด!',

  // ---- Map / nodes ----
  'map.zone': 'โซน {n}',
  'map.legend': 'เส้นสีทอง = ไปได้ตอนนี้ · เส้นจาง = ยังไปไม่ถึง',
  'map.back': 'กลับเมนู',
  'node.normal': 'ศัตรู',
  'node.hard': 'ศัตรูแกร่ง',
  'node.boss': 'บอส',
  'node.event': 'เหตุการณ์',
  'node.altar': 'แท่นบูชา',
  'node.rest': 'จุดพัก',

  // ---- Results / events ----
  'result.win': 'ชัยชนะ!',
  'result.lose': 'พ่ายแพ้...',
  'result.win.body': '{name} ล้มลงแล้ว',
  'result.lose.body': '{name} แข็งแกร่งเกินไปในครั้งนี้ — คุณถอยออกมาพร้อมความคืบหน้าเล็กน้อย',
  'result.reward': '+{xp} EXP · +{res} ทรัพยากร',
  'result.levelup': ' · เลเวลอัป!',
  'result.zoneCleared': 'เคลียร์โซนสำเร็จ! ดินแดนใหม่รออยู่',
  'result.continue': 'ไปต่อ',
  'event.title': 'โชคเข้าข้าง',
  'rest.title': 'จุดพักอันเงียบสงบ',
  'event.reward': '+{n} ทรัพยากร',
  'loot.equip': 'สวมใส่',
  'loot.salvage': 'แยกชิ้นส่วน (+{n})',

  // ---- Altar ----
  'altar.title': '🔥 แท่นบูชาหัวใจ',
  'altar.body': 'แท่นบูชาร้าวส่งเสียงหึ่ง หิวกระหายหัวใจ — สังเวย 1 ดวงแลกกับพลังสถานะถาวรก้อนใหญ่',
  'altar.warning': 'คุณมีหัวใจ {n} ดวง การกระทำนี้ย้อนคืนไม่ได้',
  'altar.accept': 'สังเวยหัวใจ',
  'altar.decline': 'เดินจากไป',
  'altar.accepted': 'แท่นบูชารับเครื่องสังเวยของคุณ',
  'altar.declined': 'คุณถอยห่างจากแท่นบูชา',
  'altar.boon': '+{boost} {stat} — ถาวร เหลือหัวใจ {hearts} ดวง',
  'altar.walkaway': 'บางความเสี่ยงก็ไม่คุ้มในวันนี้',

  // ---- PvP ----
  'pvp.searching': 'กำลังค้นหาคู่ต่อสู้…',
  'pvp.searchingBody': 'มองหาคู่ต่อสู้ที่พลังรบใกล้เคียง {cp}',
  'pvp.botNote': 'ไม่มีผู้กล้าในระยะ? สังเวียนจะเสกบอทที่แข็งแกร่งกว่าคุณราว 10%',
  'pvp.banner': 'สังเวียน PvP — แพ้เสียหัวใจ 1 ดวง',
  'pvp.opponent': 'คู่ต่อสู้: {name} ({type}, พลังรบ {cp})',
  'pvp.human': 'ผู้เล่นจริง',
  'pvp.bot': 'บอทสำรอง',
  'pvp.winBody': 'ชื่อของคุณดังก้องในสังเวียนยิ่งขึ้น',
  'pvp.heartLost': '💔 คุณเสียหัวใจ 1 ดวง เหลือ {n} ดวง',

  // ---- Permadeath / legacy ----
  'death.title': '⚰ {name} ได้จากไปแล้ว',
  'death.body': 'พลังรบสุดท้าย {cp} · เลเวล {level} · {cls}',
  'death.legacy': 'โต๊ะเถ้าธุลีจดจำ — ผู้ที่ลุกขึ้นคนต่อไปจะสืบทอดเศษเสี้ยวพลังของผู้ล่วงลับ',
  'death.revive': 'สร้างวีรชนคนใหม่',

  // ---- Leaderboard ----
  'lb.title': '🏅 กระดานอันดับ',
  'lb.season': 'ซีซั่น: {name}',
  'season.name.preseason': 'พรีซีซั่น (ช่วงทดสอบ)',
  'season.noEnd': 'ยังไม่กำหนดวันสิ้นสุด — สถิติจะถูกรีเซ็ตเมื่อซีซั่นจริงเริ่มต้น',
  'season.endsAt': 'สิ้นสุด {date}',
  'lb.byCP': 'เรียงตามพลังรบสูงสุด',
  'lb.byZone': 'เรียงตามโซนสูงสุด',
  'lb.rank': 'อันดับ',
  'lb.name': 'ชื่อ',
  'lb.class': 'อาชีพ',
  'lb.maxCP': 'พลังรบสูงสุด',
  'lb.maxZone': 'โซนสูงสุด',
  'lb.empty': 'ยังไม่มีข้อมูลอันดับ — ออกผจญภัยก่อนสิ!',
  'lb.you': '(คุณ)',
  'lb.back': 'กลับ',

  // ---- Classes ----
  'class.warrior': 'นักรบ', 'class.warrior.tag': 'กำแพงเหล็ก ใจเหล็กกล้า',
  'class.berserker': 'เบอร์เซิร์กเกอร์', 'class.berserker.tag': 'ยิ่งเจ็บ ยิ่งบ้าคลั่ง',
  'class.paladin': 'พาลาดิน', 'class.paladin.tag': 'แสงศรัทธาไม่เคยดับ',
  'class.assassin': 'มือสังหาร', 'class.assassin.tag': 'จากไปก่อนคมมีดจะถึงตัว',
  'class.mage': 'จอมเวท', 'class.mage.tag': 'โลกบิดงอตามปลายนิ้ว',
  'class.warlock': 'วอร์ล็อก', 'class.warlock.tag': 'คำสาปคืออาวุธที่ไม่มีวันทื่อ',
  'class.ranger': 'เรนเจอร์', 'class.ranger.tag': 'หนึ่งลูกธนู หนึ่งชีวิต',
  'class.monk': 'นักบวชหมัดเหล็ก', 'class.monk.tag': 'สายน้ำไหล ไม่มีสิ่งใดขวางได้',
  'class.necromancer': 'เนโครแมนเซอร์', 'class.necromancer.tag': 'ความตายเป็นเพียงจุดเริ่มต้น',
  'class.bard': 'กวีศึก', 'class.bard.tag': 'บทเพลงที่ทำให้ดาบคมขึ้น',
  'class.guardian': 'ผู้พิทักษ์', 'class.guardian.tag': 'ไม่มีสิ่งใดผ่านโล่นี้ไปได้',
  'class.spellblade': 'นักดาบเวท', 'class.spellblade.tag': 'คมดาบจารึกอักขระเพลิง',

  // ---- Signatures ----
  'sig.rally': 'ปลุกใจ', 'sig.rally.desc': 'ฟื้นฟู 15% HP และเพิ่มพลังป้องกัน 30% เป็นเวลา 2 เทิร์น',
  'sig.bloodrage': 'โลหิตคลั่ง', 'sig.bloodrage.desc': 'เพิ่มพลังโจมตี 40% เป็นเวลา 2 เทิร์น',
  'sig.sanctuary': 'เขตศักดิ์สิทธิ์', 'sig.sanctuary.desc': 'ฟื้นฟูพลังชีวิต 25% ทันที',
  'sig.vanish': 'หายวับ', 'sig.vanish.desc': 'หลบการโจมตีครั้งถัดไปแน่นอน แล้วสวนกลับด้วยดาเมจโบนัส',
  'sig.overcharge': 'อัดพลังเวท', 'sig.overcharge.desc': 'โจมตีหนักครั้งถัดไปแรงเป็นสองเท่า',
  'sig.curse': 'คำสาปมรณะ', 'sig.curse.desc': 'สาปศัตรูให้เผาไหม้รุนแรงต่อเนื่อง',
  'sig.aimedshot': 'ยิงเล็งเป้า', 'sig.aimedshot.desc': 'การโจมตีครั้งถัดไปเข้าเป้าแน่นอนและคริติคอล',
  'sig.flow': 'กระแสธาร', 'sig.flow.desc': 'เพิ่มความเร็ว 40% เป็นเวลา 2 เทิร์น',
  'sig.drain': 'ดูดวิญญาณ', 'sig.drain.desc': 'สร้างดาเมจทันทีและฟื้นฟู HP เท่าดาเมจที่ทำได้',
  'sig.hymn': 'บทเพลงศึก', 'sig.hymn.desc': 'เพิ่มพลังโจมตี ป้องกัน และความเร็ว 15% เป็นเวลา 2 เทิร์น',
  'sig.ironshell': 'เปลือกเหล็กกล้า', 'sig.ironshell.desc': 'เพิ่มพลังป้องกัน 60% เป็นเวลา 2 เทิร์น',
  'sig.runicedge': 'คมอักขระ', 'sig.runicedge.desc': 'การโจมตีติดสถานะเผาไหม้เป็นเวลา 3 เทิร์น',

  // ---- Equipment ----
  'rarity.common': 'ธรรมดา',
  'rarity.rare': 'หายาก',
  'rarity.epic': 'มหากาพย์',
  'item.sword': 'ดาบ', 'item.dagger': 'กริช', 'item.tome': 'ตำราเวท',
  'item.plate': 'เกราะเหล็ก', 'item.vest': 'เสื้อหนัง', 'item.robe': 'เสื้อคลุมเวท',
  'item.ring': 'แหวน', 'item.charm': 'เครื่องราง', 'item.amulet': 'สร้อยตราลับ',
  'slot.weapon': 'อาวุธ', 'slot.armor': 'ชุดเกราะ', 'slot.accessory': 'เครื่องประดับ',
  'passive.vampiric': 'คมกระหายเลือด', 'passive.vampiric.desc': 'ฟื้นฟู 8% ของดาเมจเมื่อสวนกลับสำเร็จ',
  'passive.thorns': 'เกราะหนาม', 'passive.thorns.desc': 'สะท้อน 15% ของดาเมจที่ได้รับกลับไปหาผู้โจมตี',
  'passive.fleetfoot': 'ฝีเท้าสายลม', 'passive.fleetfoot.desc': 'หลบครั้งแรกในแต่ละการต่อสู้ ได้ความเร็ว +12 จนจบ',

  // ---- v8: Dormant Passives & the Hidden Runesmith (เควสต์ปลุกพลังยุทธภัณฑ์) ----
  'passive.dormant': '🔒 พลังหลับใหล — มีเสียงลือว่าช่างตีรูนแห่ง{town}ปลุกมันให้ตื่นได้',
  'runesmith.title': 'ช่างตีรูนผู้ซ่อนเร้น',
  'runesmith.lore': 'ทันทีที่คุณก้าวผ่านรั้วค่าย คนแคระชราร่างกำยำคว้าแขนคุณไว้แน่น ดวงตาขุ่นขาวของเขาจ้องเขม็งไปยังยุทธภัณฑ์ข้างกายคุณ "เสียงหึ่งต่ำ ๆ นั่น... เจ้าไม่ได้ยินรึ มันยังหลับอยู่ พลังข้างในหลับใหลมาเนิ่นนาน" เขาพึมพำ พลางลูบทั่งเหล็กดำสนิทข้างกองไฟ "จันทร์ที่ดับดิ่งลงเหวเบื้องล่างเคยสอนข้าสลักรูนปลุกวิญญาณโลหะ ให้ข้าลงค้อนสักครั้งเถิด — แล้วธาตุแท้ของมันจะตื่นขึ้นทั้งหมด ตลอดกาล"',
  'runesmith.confirm': '⚒ ให้ช่างตีรูนปลุกพลังยุทธภัณฑ์',

  // ---- v9: Boss progression, roads, checkpoints ----
  'lord.roadOpen': 'ร่างของจอมมารล้มลง — เส้นทางสู่{place}เปิดออกแล้ว ธรณีประตูที่มันเฝ้าไว้ไม่มีผู้ใดขวางอีกต่อไป',
  'lord.advance': '🚪 เดินทางต่อไปยัง{place}',
  'lord.stay': '🏕 ยังอยู่ในแดนนี้ต่อ',
  'node.lordSlain': 'รังของจอมมารที่ล่มสลาย — เหลือเพียงสมุนเร่ร่อน',
  // v9.2
  'lord.deadEnd': 'จอมมารสิ้นลม — แต่เบื้องหลังบัลลังก์มีเพียงผาหินตัน ไม่มีเส้นทางใดทอดต่อไปจากที่นี่',
  'node.clearedPass': 'พื้นที่ที่ยึดได้แล้ว — เดินผ่านได้โดยไม่ต้องรบ',
  'zone.backtrackHint': '↩ เดินย้อนกลับไปยังช่องที่ยึดได้แล้วได้ตลอด — ผ่านฟรี ไม่มีการต่อสู้ (เว้นแต่มีสัตว์ร้ายพลัดหลงมา)',
  'prowler.encounter': '⚠ สัตว์ร้ายพลัดหลงเข้ามาในพื้นที่ที่คุณยึดไว้ — มันไม่ได้ฟื้นคืนชีพ แต่มันตามกลิ่นเลือดมา',
  'world.unknownRoad': 'เส้นทางที่ยังไร้ชื่อ',
  'save.failed': '⚠ บันทึกไม่สำเร็จ — ความคืบหน้าอาจสูญหายเมื่อปิดหน้าต่าง ({err})',
  'save.recovered': '⛨ กู้คืนความคืบหน้าล่าสุดจากเครื่องนี้แล้ว — ข้อมูลบนคลาวด์ตามหลังอยู่ ระบบกำลังซิงก์ให้ใหม่',
  'session.takeover.title': 'เกมถูกเปิดในแท็บอื่น',
  'session.takeover.body': 'เพื่อป้องกันเซฟย้อนเวลา แท็บนี้จึงหยุดลง — เล่นต่อในแท็บล่าสุดได้เลย หรือกดปุ่มด้านล่างเพื่อกลับมาเล่นที่แท็บนี้แทน',
  'session.takeover.reload': '⟳ กลับมาเล่นที่แท็บนี้',
  'inv.title': 'ตุ๊กตากระดาษ',
  'inv.empty': 'ว่าง',
  'inv.unequip': 'ถอดออก',
  'inv.back': 'กลับ',

  // ---- Biomes ----
  'biome.ember_wastes': 'ทุ่งถ่านคุ', 'biome.ember_wastes.flavor': 'ผืนดินแตกระแหงกับถ่านที่ไหม้ช้า ๆ',
  'biome.verdant_hollow': 'หุบเขาเขียวชอุ่ม', 'biome.verdant_hollow.flavor': 'ซากปรักหักพังที่ถูกตะไคร่กลืนกิน',
  'biome.frostpeak': 'ยอดเขาน้ำแข็ง', 'biome.frostpeak.flavor': 'หน้าผาถูกลมกัดกร่อนและน้ำแข็งโบราณ',
  'biome.ashen_ruins': 'ซากเมืองเถ้าธุลี', 'biome.ashen_ruins.flavor': 'โครงกระดูกของเมืองที่ลืมชื่อตัวเอง',

  // ---- Enemies ----
  'enemy.beast': 'สัตว์ป่าดุร้าย',
  'enemy.stalker': 'นักล่าชุบแกร่ง',
  'enemy.warden': 'ผู้คุมแห่ง{biome}',
};

// ============================ v4 — Dark World ============================
// Elden Ring-inspired world strings: 10 zones, capital, towns, NPCs with
// deep lore, economy, bag, fog of war. Tone: bleak, mysterious, reverent.
Object.assign(TH, {
  // ---- Capital ----
  'capital.name': 'เวลันทีร์ นครหลวงแห่งเถ้า',
  'capital.lore': 'นครที่เคยเปล่งประกายดั่งทองคำ บัดนี้เหลือเพียงหอคอยหักและระฆังที่ลั่นเองยามค่ำคืน ผู้คนที่ยังเหลือไม่เงยหน้ามองท้องฟ้าอีกต่อไป',
  'capital.rested': 'ร่างกายของคุณได้พักพิงใต้เงากำแพงนครหลวง — พลังชีวิตฟื้นเต็ม',
  'capital.depart': '⚔ ออกเดินทางสู่แดนเถื่อน',
  'capital.travel': '🕯 วาร์ปสู่เมืองที่ค้นพบ',
  'capital.bag': '👜 ถุงมิติ',
  'capital.arena': '🏆 สังเวียนเลือด (PvP)',

  // ---- World map ----
  'world.title': 'แดนเถื่อนทั้งสิบ',
  'world.subtitle': 'ทุกเส้นทางทอดออกจากเวลันทีร์ และบางเส้นทาง...ไม่พาใครกลับมา',
  'world.enter': 'ย่างเท้าเข้าไป',
  'world.townFound': '✓ พบเมืองแล้ว',
  'world.lordSlain': '☠ จ้าวดินแดนถูกสังหาร',
  'world.back': 'กลับสู่นครหลวง',
  'world.danger': 'ระดับภัย',

  // ---- Zones (10) ----
  'zone.z0': 'ป่าเงาโศก', 'zone.z0.lore': 'ต้นไม้ที่นี่ไม่ผลัดใบ — พวกมันผลัดน้ำตา',
  'zone.z1': 'ที่ราบกระดูกเงียบ', 'zone.z1.lore': 'กระดูกยักษ์โบราณโผล่พ้นดิน ไม่มีใครรู้ว่ามันคุกเข่าให้สิ่งใด',
  'zone.z2': 'หนองน้ำนิทรา', 'zone.z2.lore': 'ผู้หลับใหลในหนองน้ำนี้ยังฝันอยู่ และฝันของพวกเขารั่วไหลออกมา',
  'zone.z3': 'ผาสะอื้น', 'zone.z3.lore': 'เสียงร่ำไห้ในสายลมไม่ใช่ลม ชาวเผาถ่านรู้ดี จึงไม่มีใครอยู่ฟังจนจบ',
  'zone.z4': 'ทะเลทรายอัฐิ', 'zone.z4.lore': 'ทรายที่นี่เคยเป็นกองทัพ ยามพายุพัด มันยังพยายามเดินขบวน',
  'zone.z5': 'หุบเหวจันทร์ดับ', 'zone.z5.lore': 'ดวงจันทร์เคยตกลงมาที่นี่หนึ่งดวง สิ่งที่คลานออกมาจากหลุมนั้นยังไม่ตาย',
  'zone.z6': 'ป่าราคีเรืองแสง', 'zone.z6.lore': 'แสงเรืองในความมืดมิใช่ความหวัง — มันคือเหยื่อล่อ',
  'zone.z7': 'ธารน้ำแข็งคร่ำครวญ', 'zone.z7.lore': 'น้ำแข็งกักขังเสียงสุดท้ายของผู้แช่แข็ง เดินเบา ๆ เถิด เผื่อพวกเขาจะได้หลับ',
  'zone.z8': 'เนินสุสานหลงลืม', 'zone.z8.lore': 'หลุมศพที่นี่ไม่มีชื่อ เพราะชื่อคือสิ่งแรกที่ดินแดนนี้กลืนกิน',
  'zone.z9': 'ขอบโลกอันแหลกสลาย', 'zone.z9.lore': 'สุดปลายแผ่นดิน โลกแตกออกเป็นเสี่ยง และบางสิ่งกำลังปีนขึ้นมาจากรอยแยก',

  // ---- Materials (per zone) ----
  'mat.z0': 'น้ำตาเงา', 'mat.z1': 'ผงกระดูกเงียบ', 'mat.z2': 'ไข่มุกนิทรา', 'mat.z3': 'หินสะอื้น',
  'mat.z4': 'ทรายอัฐิ', 'mat.z5': 'เศษจันทร์ดับ', 'mat.z6': 'สปอร์ราคี', 'mat.z7': 'น้ำแข็งคร่ำครวญ',
  'mat.z8': 'ดินสุสาน', 'mat.z9': 'เศษขอบโลก',
  'mat.generic': 'วัสดุแดนเถื่อน',

  // ---- Towns (per zone) ----
  'town.z0': 'หมู่บ้านตะเกียงหรี่', 'town.z1': 'ด่านกระดูกพัก', 'town.z2': 'ท่าเรือร้างนิทรา', 'town.z3': 'เพิงผาผู้ลี้ภัย',
  'town.z4': 'โอเอซิสสุดท้าย', 'town.z5': 'ค่ายขอบเหว', 'town.z6': 'สถานีเก็บสปอร์', 'town.z7': 'กระท่อมไออุ่น',
  'town.z8': 'ศาลาเฝ้าสุสาน', 'town.z9': 'ป้อมปลายทาง',
  'town.discovered': 'คุณพบ {town} — ที่หลบภัยกลางแดนมรณะ',
  'town.rested': 'ใต้ชายคาที่ปลอดภัย ร่างกายของคุณฟื้นเต็ม',
  'town.shop': '🛒 ร้านค้า',
  'town.continue': '⚔ บุกลึกต่อไป',
  'town.toCapital': '🚶 เดินกลับนครหลวง',
  'town.travel': '🕯 วาร์ปเดินทาง',

  // ---- Node types (new) ----
  'node.elite': 'อสูรร้าย',
  'node.campfire': 'กองไฟ',
  'node.town': 'เมือง',
  'node.fog': '???',
  'node.lord': 'จ้าวดินแดน',
  'campfire.rest': 'เปลวไฟเล็ก ๆ ท้าทายความมืด คุณนั่งลงและหายใจอีกครั้ง',
  'campfire.healed': 'ฟื้นฟู {n} HP',
  'gate.toCapital': 'ทางลัดคดเคี้ยวย้อนกลับสู่เวลันทีร์ปรากฏขึ้นเบื้องหน้า',
  'gate.use': '🚶 ใช้ทางลัดกลับนครหลวง',

  // ---- Zone screen ----
  'zone.retreat': '🏳 ถอยทัพ',
  'zone.retreated': 'คุณถอยกลับมาอย่างสิ้นเรี่ยวแรง — แดนเถื่อนไม่จดจำผู้พ่ายแพ้ แต่มันรอ',
  'zone.softcapWarn': 'ยิ่งลึก ความตายยิ่งหนาแน่น — เกินเมืองไปแล้ว ศัตรูจะแข็งแกร่งขึ้นทวีคูณ',
  'defeat.returned': 'ความมืดกลืนคุณ... แล้วคายร่างซีดเผือดกลับสู่ {place}',

  // ---- Economy ----
  'gold': 'ทอง',
  'gold.drop': '+{n} ทอง',
  'mat.drop': '+{n} {mat}',
  'shop.title': 'ร้านค้าแห่ง {town}',
  'shop.buy': 'ซื้อ ({n} ทอง)',
  'shop.sell': 'ขาย (+{n} ทอง)',
  'shop.noGold': 'ทองไม่พอ',
  'shop.bagFull': 'ถุงมิติเต็ม',
  'shop.stockEmpty': 'ชั้นวางว่างเปล่า — พ่อค้าจ้องมองคุณเงียบ ๆ',
  'shop.yourBag': 'ของในถุงของคุณ',
  'travel.title': 'วาร์ปเดินทาง',
  'travel.desc': 'เปลวเทียนมิติจะพาคุณข้ามแดน — แลกกับทองและความทรงจำเลือนราง',
  'travel.cost': 'ไป {place} ({n} ทอง)',
  'travel.capital': 'นครหลวงเวลันทีร์',
  'travel.none': 'ยังไม่พบเมืองใดในแดนเถื่อน',

  // ---- Dimensional Bag ----
  'bag.title': 'ถุงมิติ ({used}/{cap})',
  'bag.empty': 'ว่างเปล่า — มีแต่เสียงสะท้อนจากมิติอื่น',
  'bag.equipped': 'สวมใส่อยู่',
  'bag.materials': 'วัสดุ',
  'bag.matCap': 'คลังวัสดุ (สูงสุด {cap} ต่อชนิด)',
  'bag.discard': 'ทิ้ง',
  'bag.discardConfirm': 'แน่ใจ? ทิ้งถาวร!',
  'world.viewer.legend.gated': 'ทางที่ลอร์ดยังเฝ้าอยู่ — สังหารลอร์ดประจำทางเพื่อเปิด',
  'event.matFull': 'คลังวัสดุเต็ม — ของ {n} ชิ้นร่วงหล่นสู่เถ้าธุลี',
  'bag.full.autoSold': 'ถุงมิติเต็ม! {item} สลายเป็นทอง (+{n})',
  'bag.compare': 'เปรียบเทียบ',
  'bag.equip': 'สวมใส่',
  'bag.sellItem': 'ขาย (+{n})',
  'bag.close': 'ปิด',
  'compare.title': 'เปรียบเทียบอุปกรณ์',
  'compare.new': 'ชิ้นใหม่',
  'compare.current': 'ที่สวมอยู่',
  'compare.none': '— ไม่มี —',
  'loot.toBag': '{item} ถูกเก็บเข้าถุงมิติ',

  // ---- NPCs ----
  'npc.talk': 'สนทนา',
  'npc.service': 'บริการ',
  'npc.notEnoughMat': 'วัสดุไม่พอ',
  'npc.maxed': 'ถึงขีดสุดแล้ว',

  'npc.vesper.name': 'เวสเปอร์', 'npc.vesper.title': 'ปราชญ์ต้องสาปแห่งหอสมุดล่ม',
  'npc.vesper.lore': 'ครั้งหนึ่งเวสเปอร์เคยเป็นหัวหน้าบรรณารักษ์แห่งเวลันทีร์ จนกระทั่งเขาอ่านหนังสือเล่มที่ไม่ควรมีอยู่จริง บัดนี้ครึ่งร่างของเขาจมอยู่ในมิติอื่นตลอดกาล — มองเห็นได้เพียงเงาเลือนที่ขอบตา เขาจึงเข้าใจ "ที่ว่าง" ดีกว่าผู้ใดในโลกนี้',
  'npc.vesper.line1': '"ถุงของเจ้าน่ะหรือ... มันไม่ได้เล็กหรอก เจ้าต่างหากที่ยังไม่รู้จักความว่างเปล่าดีพอ"',
  'npc.vesper.line2': '"เอาวัสดุจากแดนเถื่อนมา ข้าจะเย็บรอยแยกมิติให้กว้างขึ้น... เหมือนที่มันเย็บร่างข้า"',
  'npc.vesper.svc': 'ขยายถุงมิติ +2 ช่อง',
  'npc.vesper.matSvc': 'ขยายคลังวัสดุ +15 ต่อชนิด',
  'npc.vesper.matCost': 'ค่าทอผนึกคลัง: {n} ทอง',
  'npc.vesper.matFull': 'คลังวัสดุถูกขยายถึงขีดสุดแล้ว',
  'npc.vesper.cost': 'ราคา: วัสดุชนิดเดียวกัน {n} ชิ้น',

  'npc.isra.name': 'อิศรา', 'npc.isra.title': 'ผู้สอดแนมเนตรดับ',
  'npc.isra.lore': 'อิศราเคยเป็นผู้สอดแนมหลวงที่มองไกลที่สุดในแผ่นดิน จนวันที่นางเห็น "สิ่งที่อยู่ขอบโลก" ดวงตาของนางไหม้เป็นสีขาวในคืนเดียว กระนั้นนางกลับบอกว่า บัดนี้จึงเห็นชัดกว่าเดิม — เพราะแผนที่ที่แท้จริงไม่ได้มองด้วยตา',
  'npc.isra.line1': '"อย่าเชื่อดวงตา เจ้าหนู หมอกไม่เคยซ่อนอะไร... มันแค่เมตตาไม่ให้เจ้าเห็นเร็วเกินไป"',
  'npc.isra.line2': '"นำวัสดุมา ข้าจะสอนให้เจ้าฟังเสียงของเส้นทางที่ยังมาไม่ถึง"',
  'npc.isra.svc': 'ขยายระยะมองเห็นแผนที่ +1 ก้าว',
  'npc.isra.cost': 'ราคา: วัสดุชนิดเดียวกัน {n} ชิ้น',

  'npc.krom.name': 'ครอม', 'npc.krom.title': 'ช่างตีเหล็กแขนเดียว',
  'npc.krom.lore': 'ครอมสูญเสียแขนขวาให้กับดาบที่เขาตีขึ้นเอง — ดาบเล่มนั้นดีเกินไปจนปฏิเสธที่จะมีเจ้าของ เขาฝังมันไว้ใต้ทั่งตีเหล็ก และตั้งแต่นั้นมาเตาไฟของเขาก็ไม่เคยดับ ราวกับมีบางสิ่งใต้ดินคอยเป่าถ่านให้',
  'npc.krom.line1': '"เหล็กดีต้องผ่านไฟ คนดีต้องผ่านแดนเถื่อน... ส่วนข้าผ่านมาทั้งสองอย่าง เหลือแขนเดียวก็คุ้ม"',
  'npc.krom.line2': '"วางอาวุธลงบนทั่ง แล้วอย่าถามว่าเสียงกระซิบใต้ดินนั่นคืออะไร"',
  'npc.krom.svc': 'หลอมเสริมอาวุธ (+2 พลังโจมตีถาวร)',
  'npc.krom.cost': 'ราคา: {gold} ทอง + วัสดุ {mat} ชิ้น',
  'npc.krom.noWeapon': 'เจ้ายังไม่มีอาวุธให้ข้าหลอม',

  'npc.mara.name': 'มารา', 'npc.mara.title': 'แม่ค้าเร่เงาคืนเดือน',
  'npc.mara.lore': 'ไม่มีใครเคยเห็นมาราเดินทางมาถึง — นางแค่ "อยู่ตรงนั้นแล้ว" พร้อมเกวียนที่ล้อไม่เคยแตะพื้น สินค้าของนางล้ำค่าเกินราคา และนางรับชำระด้วยทองเท่านั้น เพราะสิ่งอื่นที่ผู้คนเคยจ่าย... นางบอกว่าเก็บครบแล้ว',
  'npc.mara.line1': '"ของดีย่อมมีราคา ที่รัก... และราคาที่เป็นทองคำ คือราคาที่ถูกที่สุดที่ข้าเคยเรียก"',
  'npc.mara.line2': '"อย่าถามว่าของพวกนี้มาจากไหน เจ้าของเก่าไม่ต้องใช้มันแล้ว"',
  'npc.mara.svc': 'สินค้าหายากระดับสูง',

  // ---- Misc ----
  'hud.gold': '🪙 {n}',
  'result.goldReward': '+{xp} EXP · +{gold} ทอง',
  'lord.slain': 'จ้าวดินแดนล้มลง — {zone} เงียบงันลงชั่วขณะ',
});

// ===================== v5 — Landing / Rename / Loot Gate =====================
Object.assign(TH, {
  'landing.guest': '▶ เล่นทันที (ผู้มาเยือน)',
  'landing.or': '— หรือ —',
  'landing.guestNote': 'เริ่มผจญภัยได้ทันที เซฟจะถูกเก็บไว้ในเครื่องนี้',
  'landing.loginNote': 'เข้าสู่ระบบเพื่อเก็บเซฟบนคลาวด์และขึ้นกระดานอันดับ',
  'auth.guestName': 'ผู้มาเยือนนิรนาม',

  'rename.btn': '✍ เปลี่ยนชื่อ',
  'rename.title': 'เปลี่ยนชื่อวีรชน',
  'rename.current': 'ชื่อปัจจุบัน: {name}',
  'rename.freeNote': 'การเปลี่ยนชื่อครั้งแรกไม่มีค่าใช้จ่าย',
  'rename.placeholder': 'ชื่อใหม่ของคุณ',
  'rename.confirm': 'ยืนยันเปลี่ยนชื่อ',
  'rename.devNote': 'คุณใช้สิทธิ์เปลี่ยนชื่อฟรีไปแล้ว — การเปลี่ยนชื่อครั้งถัดไปอยู่ระหว่างการพัฒนา',
  'rename.err.short': 'ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร',
  'rename.err.same': 'ชื่อใหม่ซ้ำกับชื่อเดิม',
  'rename.err.taken': 'ชื่อนี้ถูกใช้แล้ว — โปรดเลือกชื่ออื่น',
  'create.err.taken': 'ชื่อนี้มีเจ้าของแล้วในดินแดน — รวมถึงตำนานผู้ล่วงลับบนกระดานอันดับ โปรดตั้งชื่อใหม่',
  'rename.success': 'บัดนี้โลกจะจดจำเจ้าในนาม "{name}"',

  'lootgate.title': 'ของที่ร่วงจากศัตรู',
  'lootgate.remaining': 'เหลือให้ตัดสินใจอีก {n} ชิ้น',
  'lootgate.equip': 'สวมใส่ทันที',
  'lootgate.take': 'เก็บเข้าถุงมิติ',
  'lootgate.discard': 'สลายเป็นทอง (+{n})',
  'lootgate.bagFull': 'ถุงมิติเต็ม',
  'lootgate.equipped': 'สวมใส่ {item} แล้ว',
  'lootgate.prevToBag': '{item} (ชิ้นเดิม) ถูกเก็บเข้าถุงมิติ',
  'lootgate.prevSalvaged': 'ถุงมิติเต็ม — {item} (ชิ้นเดิม) สลายเป็นทอง (+{n})',
  'lootgate.taken': '{item} ถูกเก็บเข้าถุงมิติ',
  'lootgate.discarded': '{item} สลายเป็นทอง (+{n})',
});

// ===================== v5 — Two-Layer World Map & Settings =====================
// Macro World Map Viewer (world-map.js graph), the Start Village hub, the
// endless outer web past the Capital, and the Settings panel (Link Account
// now lives here instead of the Capital menu).
Object.assign(TH, {
  // ---- Start Village (the other hub, alongside the Capital) ----
  'world.hub.start.name': 'หมู่บ้านไร้นาม',
  'world.hub.start.lore': 'หมู่บ้านเล็ก ๆ ริมขอบแดนเถื่อน ไม่มีกำแพง ไม่มีนาม ไม่มีสิ่งใดค้ำประกันว่าพรุ่งนี้จะยังตั้งอยู่ ทว่ามันคือจุดเริ่มต้นของการเดินทางที่ไม่มีที่สิ้นสุด ที่ยังจุดไฟไว้รอผู้เดินทางกลับมา',
  'world.hub.start.rested': 'ไฟกองเล็ก ๆ กลางหมู่บ้านให้ความอบอุ่นพอจะฟื้นแรงกาย',

  // ---- World Map Viewer (macro layer, ui.js) ----
  'world.viewer.title': 'แผนที่แดนเถื่อน',
  'world.viewer.navLabel': '🗺 แผนที่โลก',
  'world.viewer.subtitle': 'เส้นทางที่แท้จริงเผยตัวก็ต่อเมื่อเจ้าพบเมืองในดินแดนนั้นแล้วเท่านั้น ส่วนที่เหลือยังคงหลับใหลอยู่ในหมอก',
  'world.viewer.back': 'กลับ',
  'world.viewer.legend.conquered': 'พิชิตแล้ว',
  'world.viewer.legend.available': 'เดินทางได้',
  'world.viewer.legend.scouted': 'เห็นเงาราง ๆ',

  // ---- The endless web past the Capital (procedural outer regions) ----
  'world.outerZoneName': '{biome} #{n}',
  'world.outerTownName': 'ค่ายพักใน{biome}',
  'zone.unknown': 'ดินแดนนิรนาม',
  'zone.unknown.lore': 'หมอกยังไม่ยอมเผยว่าสิ่งใดซ่อนอยู่เบื้องหลัง',

  // ---- Walking back from a Town (destination depends on which side of the Capital you're on) ----
  'town.toStart': '🚶 เดินกลับหมู่บ้านเถ้าแรก',

  // ---- Settings panel (Link Account + logout now live here, off the HUD) ----
  'settings.title': 'ตั้งค่า',
  'settings.navLabel': '⚙ ตั้งค่า',
  'settings.back': 'กลับ',
  'settings.link.title': '🔗 ผูกบัญชี',
  'settings.link.body': 'เซฟของเจ้าอยู่ในเครื่องนี้เท่านั้น — ผูกบัญชี Google เพื่อย้ายขึ้นคลาวด์และขึ้นกระดานอันดับได้จากทุกที่ ไม่มีการลบเซฟเดิม',
  'settings.link.button': 'ผูกบัญชีด้วย Google',
  'settings.link.working': 'กำลังผูกบัญชี...',
  'settings.link.error': 'ผูกบัญชีไม่สำเร็จ — ลองใหม่อีกครั้ง',
  'settings.linked.title': '✓ ผูกบัญชีแล้ว',
  'settings.linked.body': 'เข้าสู่ระบบในนาม {name} — เซฟของเจ้าอยู่บนคลาวด์แล้ว',
});

// ===================== v6 — The Hardcore & Hazards Update =====================
// Rare/high-reward Altar, hardcore loot (no free gold), Hidden Unique
// Skills, Cursed Equipment + Cleanse Curse, Campfire Ambush, the Wandering
// Smuggler's black market, Zone Hazards, and Rename's move into Settings.
Object.assign(TH, {
  // ---- Altar (now +25% to ALL base stats) ----
  'altar.boonAll': 'พลังพื้นฐานทุกด้านของคุณเพิ่มขึ้น 25% ถาวร — เหลือหัวใจ {hearts} ดวง',

  // ---- Hardcore loot gate (discard/bag-full yield NOTHING now) ----
  'lootgate.discard': 'ทิ้งไป — สลายหายไปตลอดกาล',
  'lootgate.discarded': '{item} ถูกทิ้ง — สลายหายไปในความว่างเปล่าตลอดกาล',
  'lootgate.prevLost': 'ถุงมิติเต็ม — {item} (ชิ้นเดิม) สลายหายไปตลอดกาล',
  'bag.full.lost': 'ถุงมิติเต็ม! {item} สลายหายไปตลอดกาล — ไม่มีสิ่งใดคงเหลือ',
  'bag.sellLocked': 'ต้องกลับเมืองและหาพ่อค้าก่อน จึงจะขายของในถุงมิติได้',

  // ---- Campfire Ambush ----
  'log.ambush.opener': '{name} พุ่งออกมาจากเงามืดและโจมตีก่อนที่คุณจะทันตั้งตัว!',
  'ambush.banner': '🌑 ซุ่มโจมตีที่กองไฟ! ศัตรูได้ลงมือก่อน',
  'ambush.survived': '✦ คุณรอดจากการซุ่มโจมตี! ของรางวัลหายากถูกทิ้งไว้ให้',
  'enemy.ambusher': 'ผู้ล่าแฝงเงา',

  // ---- Zone Hazards ----
  'hazard.toxic_fog': 'หมอกพิษ',
  'hazard.toxic_fog.desc': 'ไอพิษกัดกินร่างกายทุกเทิร์นตลอดการต่อสู้',
  'hazard.blood_moon': 'จันทร์เลือด',
  'hazard.blood_moon.desc': 'แสงจันทร์สีเลือดกระตุ้นให้ศัตรูโจมตีคริติคอลทุกครั้ง แต่ทองที่ได้จะเพิ่มเป็นสองเท่า',
  'hazard.overgrowth': 'ราวเถาวัลย์คลุมดิน',
  'hazard.overgrowth.desc': 'เถาวัลย์รัดเท้าจนหลบหลีกไม่ได้เลยตลอดการต่อสู้',
  'zone.hazardSight': 'สายตาที่อิศราฝึกให้เผยให้เห็นอันตรายที่ซ่อนอยู่บนเส้นทางข้างหน้า',
  'log.hazard.drain': '{name} เจ็บปวดทรมาน {dmg} ดาเมจ',

  // ---- Cursed Equipment ----
  'rarity.cursed': 'ต้องสาป',
  'rarity.legendary': 'ในตำนาน',
  'curse.hpDrain': 'สาปเลือดไหลไม่หยุด', 'curse.hpDrain.desc': 'เสียพลังชีวิต 5% ของค่าสูงสุดทุกเทิร์นของคุณ',
  'curse.speedHalf': 'สาปขาหนักอึ้ง', 'curse.speedHalf.desc': 'ความเร็วลดลงครึ่งหนึ่งตลอดเวลาที่สวมใส่',
  'curse.dodgeSeal': 'สาปเท้าติดบ่วง', 'curse.dodgeSeal.desc': 'ไม่สามารถหลบหลีกได้เลยตลอดเวลาที่สวมใส่',
  'curse.brittle': 'สาปเกราะแตกร้าว', 'curse.brittle.desc': 'ได้รับความเสียหายเพิ่มขึ้น 20% จากทุกการโจมตี',

  // ---- Vesper's Cleanse Curse (Capital only) ----
  'npc.vesper.cleanseSvc': '🔮 ชำระล้างคำสาป',
  'npc.vesper.cleanseCost': 'ราคา: {gold} ทอง + วัสดุชนิดเดียวกัน {mat} ชิ้น',
  'npc.vesper.cleanseBtn': 'ชำระล้าง',
  'npc.vesper.noCursed': 'เจ้าไม่มีของต้องสาปติดตัวอยู่ในตอนนี้',

  // ---- The Wandering Smuggler (มืดกาล) ----
  'npc.smuggler.name': 'มืดกาล',
  'npc.smuggler.title': 'พ่อค้าเร่แห่งเงามืด',
  'npc.smuggler.lore': 'ไม่มีใครเคยเห็นมืดกาลเดินทางมาถึง เกวียนของนางปรากฏขึ้นในที่ที่แผนที่ยังไม่กล้าเอ่ยชื่อ ราวกับหมอกได้ก่อร่างเป็นพ่อค้า สินค้าของนางมาจากมือของผู้ที่ไม่มีใครกล้าถาม และนางไม่เคยอยู่ที่เดิมสองครั้ง',
  'npc.smuggler.line1': '"เจ้าเจอข้าได้อย่างไรในความมืดเช่นนี้... งั้นก็คงถึงเวลาที่ข้าต้องย้ายที่แล้วสินะ"',
  'npc.smuggler.line2': '"หัวใจดวงที่สามน่ะหรือ? มีราคาสิ ที่รัก แต่ไม่ใช่ราคาที่จ่ายด้วยทอง"',
  'world.viewer.smugglerHint': 'มีบางสิ่งเคลื่อนไหวอยู่ในหมอก...',
  'world.viewer.legend.smuggler': 'เงาลึกลับ',
  'smuggler.stockTitle': '🌫 สินค้าลับ',
  'smuggler.heartTitle': '💗 หัวใจดวงที่สาม',
  'smuggler.heartDesc': 'มืดกาลมีวิธีคืนหัวใจให้เจ้า... ในราคาที่บ้าคลั่ง (วัสดุชนิดเดียวกัน {n} ชิ้น)',
  'smuggler.heartBuy': 'ซื้อหัวใจคืน ({n} วัสดุ)',
  'smuggler.heartMaxed': 'หัวใจของเจ้าเต็มอยู่แล้ว',

  // ---- Hidden Unique Skills (classes.js) ----
  'hidden.hint': 'ทักษะลับ — จะตื่นขึ้นเมื่อ{stat}รวมถึง {n}',
  'hidden.dormant': '— ทักษะลับยังไม่ตื่น',
  'hidden.awakened.title': '✦ ทักษะลับตื่นขึ้นแล้ว!',
  'hidden.awakened.dismiss': 'รับทราบ',
  'log.hidden.trigger': '{name} ปลุกพลัง {skill}!',
  'log.hidden.secondWind': '{name} ฝ่าฟันความตาย! {skill} ฟื้นคืนพลังชีวิต {heal} หน่วย',
  'log.hidden.reflect': '{skill}ของ {name} สะท้อนความเสียหาย {dmg}',
  'log.hidden.doubleStrike': '{skill}ของ {name} ฟาดซ้ำ! เพิ่มดาเมจ {dmg}',

  'hidden.lastbastion': 'ป้อมปราการสุดท้าย',
  'hidden.lastbastion.desc': 'เมื่อพลังชีวิตต่ำกว่า 30% พลังป้องกันพุ่งขึ้น 60% ตลอดการต่อสู้ที่เหลือ',
  'hidden.deathwish': 'ปณิธานสู่ความตาย',
  'hidden.deathwish.desc': 'เมื่อพลังชีวิตต่ำกว่า 40% พลังโจมตีพุ่งขึ้น 50% ตลอดการต่อสู้ที่เหลือ',
  'hidden.martyrlight': 'แสงมรณสักขี',
  'hidden.martyrlight.desc': 'รอดจากการโจมตีที่ควรสังหารได้หนึ่งครั้งต่อการต่อสู้ แล้วฟื้นฟูพลังชีวิต 35%',
  'hidden.phantomstep': 'ก้าวเงาผี',
  'hidden.phantomstep.desc': 'เริ่มการต่อสู้ทุกครั้งด้วยสถานะหายวับ — การโจมตีแรกของศัตรูพลาดเป้าเสมอ',
  'hidden.arcanetorrent': 'กระแสเวทวิปโยค',
  'hidden.arcanetorrent.desc': 'เกจท่าไม้ตายเต็มทันทีตั้งแต่เริ่มการต่อสู้',
  'hidden.plaguebearer': 'ผู้แผ่โรคระบาด',
  'hidden.plaguebearer.desc': 'ดาเมจต่อเนื่องที่คุณสร้างขึ้นแรงขึ้น 75%',
  'hidden.hawkeye': 'ตาเหยี่ยว',
  'hidden.hawkeye.desc': 'สร้างความเสียหายเพิ่ม 40% ใส่ศัตรูที่เหลือพลังชีวิตต่ำกว่า 35%',
  'hidden.innertempo': 'จังหวะภายใน',
  'hidden.innertempo.desc': 'ทุกการโจมตีมีโอกาส 25% ที่จะฟาดซ้ำทันทีด้วยดาเมจครึ่งหนึ่ง',
  'hidden.soulharvest': 'เก็บเกี่ยววิญญาณ',
  'hidden.soulharvest.desc': 'อัตราดูดเลือดเพิ่มขึ้นเป็นสองเท่าตลอดการต่อสู้',
  'hidden.crescendo': 'เสียงเพลงถึงขีดสุด',
  'hidden.crescendo.desc': 'เกจท่าไม้ตายชาร์จเร็วขึ้นอีก 20 หน่วยทุกการกระทำ',
  'hidden.aegiswall': 'กำแพงโล่ศักดิ์สิทธิ์',
  'hidden.aegiswall.desc': 'สะท้อนความเสียหาย 25% กลับสู่ผู้โจมตีทุกครั้งที่ถูกตี',
  'hidden.runeburst': 'ระเบิดอักขระ',
  'hidden.runeburst.desc': 'การคริติคอลทุกครั้งจุดไฟเผาศัตรูเพิ่มเติม',
});

// ===================== v10 — Bilingual Language Toggle =====================
Object.assign(TH, {
  'settings.language.title': '🌐 ภาษา',
  'settings.language.note': 'เปลี่ยนภาษาที่ใช้แสดงผลในเกม — บันทึกไว้ในเครื่องนี้',
});

// =============================================================================
// ENGLISH TABLE — mirrors every TH block above, key-for-key, in the same
// order. This is what makes the file diff-able: to check EN coverage for a
// new TH key, search for that key here.
// =============================================================================

const EN = {
  // ---- App / auth ----
  'app.title': 'THE ASHEN TABLE',
  'auth.tagline': 'Type your name to continue your journey, or start a new one.',
  'auth.placeholder': 'Adventurer name',
  'auth.login': 'Continue Journey',
  'auth.register': 'Begin New Journey',
  'auth.google': 'Sign in with Google',
  'auth.err.short': 'Name must be at least 2 characters long',
  'auth.err.taken': 'This name is already taken — try "Continue Journey" instead',
  'auth.err.notfound': 'No save found under this name — try "Begin New Journey"',

  // ---- Menu / HUD ----
  'menu.map': '🗺 Zone Map',
  'menu.pvp': '🏆 PvP Arena',
  'menu.gear': '🎽 Paper Doll',
  'menu.leaderboard': '🏅 Leaderboard',
  'menu.logout': 'Log Out',
  'hud.menu': 'Menu',
  'hud.gear': 'Gear',
  'hud.points': '+{n} pts',
  'hud.legacy': 'Legacy',
  'hud.level': 'Level {n}',
  'combat.brief.title': 'Combat Overview',
  'combat.brief.1': 'Speed sets turn order — a faster enemy may act more than once before you do.',
  'combat.brief.2': 'Block / Parry are "stances" — set one and it counters the matching attack aimed at you.',
  'combat.brief.3': 'Accuracy vs. Dodge — a miss lands nothing, while a critical hit deals multiplied damage.',
  'combat.brief.4': 'Your signature move charges with Spell Speed — the higher it is, the more often you can use it.',

  // ---- Character creation ----
  'create.tagline': 'Choose your path — {n} classes await.',
  'create.legacyNote': 'A legacy bonus from your fallen predecessor will be granted automatically.',
  'create.name.placeholder': 'Name your hero',
  'create.confirm': 'Begin the Journey',

  // ---- Stats ----
  'stat.maxHp': 'Max HP',
  'stat.atk': 'Attack',
  'stat.def': 'Defense',
  'stat.speed': 'Speed',
  'stat.dodge': 'Dodge %',
  'stat.accuracy': 'Accuracy',
  'stat.critRate': 'Crit Rate %',
  'stat.critDamage': 'Crit Damage %',
  'stat.spellSpeed': 'Spell Speed',
  'stat.dotPower': 'DoT Power',
  'stat.lifesteal': 'Lifesteal %',
  'allocate.title': 'Stat Points: {n}',
  'allocate.note': 'Earned on level up — spend them on the build you favor.',
  'allocate.done': 'Done',

  // ---- Skills ----
  'skill.heavy_attack': 'Heavy Attack',
  'skill.heavy_attack.desc': 'Slow but powerful — can be countered by Parry.',
  'skill.quick_strike': 'Quick Strike',
  'skill.quick_strike.desc': 'Fast but light — can be countered by Block.',
  'skill.block': 'Block',
  'skill.block.desc': 'Set a stance: counters the next Quick Strike aimed at you.',
  'skill.parry': 'Parry',
  'skill.parry.desc': 'Set a stance: counters the next Heavy Attack aimed at you.',
  'skill.signature.charging': 'Signature Move ({n}%)',

  // ---- Battle logs (structured params) ----
  'log.stance': '{name} takes a {stance} stance',
  'log.hit': '{name} strikes {target} with {skill} for {dmg} damage',
  'log.crit': '{name} lands a CRITICAL! {skill} hits {target} for {dmg} damage',
  'log.miss': '{name} dodges {target}\u2019s {skill}!',
  'log.counter': '{name} counters {target}\u2019s {skill} with {stance}! ({dmg} damage)',
  'log.dot.apply': '{target} is burning ({dmg} damage x{ticks} ticks)',
  'log.dot.tick': '{name} takes {dmg} burn damage',
  'log.lifesteal': '{name} drains {heal} HP',
  'log.sig.notready': 'Signature move is not fully charged',
  'log.sig.heal': '{name} uses {sig}! Restores {heal} HP',
  'log.sig.buff': '{name} uses {sig}! {stat} increased for {n} turns',
  'log.sig.multibuff': '{name} uses {sig}! All stats boosted for {n} turns',
  'log.sig.vanish': '{name} uses {sig}! Vanishes — the next attack against them is guaranteed to miss and gets countered',
  'log.sig.vanishCounter': 'Countered from the shadows! {dmg} damage',
  'log.sig.overcharge': '{name} uses {sig}! The next Heavy Attack deals double damage',
  'log.sig.overchargeBoom': 'The spell overloads!',
  'log.sig.dot': '{name} uses {sig}! Curses the enemy with searing, ongoing burn',
  'log.sig.sureCrit': '{name} uses {sig}! The next attack is guaranteed to hit and crit',
  'log.sig.drain': '{name} uses {sig}! Drains {dmg} damage and restores {heal} HP',
  'log.sig.burnOnHit': '{name} uses {sig}! Weapon ignites — attacks inflict burn for {n} turns',
  'log.passive.vampiric': '{name}\u2019s bloodthirsty edge restores {heal} HP',
  'log.passive.thorns': '{name}\u2019s thorned armor reflects {dmg} damage',
  'log.passive.fleetfoot': '{name}\u2019s windswept stride triggers — Speed +12 for the rest of the battle',
  'log.hint': 'Choose an action',
  // ---- v7: animation layer ----
  'log.ko': '{name} has fallen!',
  'battle.skipHint': 'Tap the arena to fast-forward the fight',
  'fx.miss': 'MISS!',

  // ---- Map / nodes ----
  'map.zone': 'Zone {n}',
  'map.legend': 'Gold line = reachable now · Dim line = not yet reachable',
  'map.back': 'Back to Menu',
  'node.normal': 'Enemy',
  'node.hard': 'Tough Enemy',
  'node.boss': 'Boss',
  'node.event': 'Event',
  'node.altar': 'Altar',
  'node.rest': 'Rest Site',

  // ---- Results / events ----
  'result.win': 'Victory!',
  'result.lose': 'Defeat...',
  'result.win.body': '{name} has fallen',
  'result.lose.body': '{name} proved too strong this time — you retreat with only a sliver of progress',
  'result.reward': '+{xp} EXP · +{res} resources',
  'result.levelup': ' · Level Up!',
  'result.zoneCleared': 'Zone cleared! New lands await',
  'result.continue': 'Continue',
  'event.title': 'Fortune Favors You',
  'rest.title': 'A Quiet Place to Rest',
  'event.reward': '+{n} resources',
  'loot.equip': 'Equip',
  'loot.salvage': 'Salvage (+{n})',

  // ---- Altar ----
  'altar.title': '🔥 Heart Sacrifice Altar',
  'altar.body': 'The cracked altar hums, hungry for a heart — sacrifice one in exchange for a great, permanent boost.',
  'altar.warning': 'You have {n} hearts remaining. This cannot be undone.',
  'altar.accept': 'Sacrifice a Heart',
  'altar.decline': 'Walk Away',
  'altar.accepted': 'The altar accepts your offering',
  'altar.declined': 'You step back from the altar',
  'altar.boon': '+{boost} {stat} — permanent. {hearts} hearts remaining',
  'altar.walkaway': 'Some risks aren\u2019t worth taking today',

  // ---- PvP ----
  'pvp.searching': 'Searching for an opponent…',
  'pvp.searchingBody': 'Looking for a fighter near {cp} Combat Power',
  'pvp.botNote': 'No challenger in range? The arena will conjure a bot roughly 10% stronger than you.',
  'pvp.banner': 'PvP Arena — losing costs 1 heart',
  'pvp.opponent': 'Opponent: {name} ({type}, {cp} CP)',
  'pvp.human': 'Real Player',
  'pvp.bot': 'Fallback Bot',
  'pvp.winBody': 'Your name echoes louder across the arena',
  'pvp.heartLost': '💔 You lost 1 heart. {n} remaining',

  // ---- Permadeath / legacy ----
  'death.title': '⚰ {name} has passed on',
  'death.body': 'Final Combat Power {cp} · Level {level} · {cls}',
  'death.legacy': 'The Ashen Table remembers — whoever rises next inherits a fragment of the fallen\u2019s power',
  'death.revive': 'Create a New Hero',

  // ---- Leaderboard ----
  'lb.title': '🏅 Leaderboard',
  'lb.season': 'Season: {name}',
  'season.name.preseason': 'Preseason (test period)',
  'season.noEnd': 'No end date scheduled — records reset when the first real season begins',
  'season.endsAt': 'Ends {date}',
  'lb.byCP': 'Sort by Highest Combat Power',
  'lb.byZone': 'Sort by Deepest Zone',
  'lb.rank': 'Rank',
  'lb.name': 'Name',
  'lb.class': 'Class',
  'lb.maxCP': 'Max Combat Power',
  'lb.maxZone': 'Deepest Zone',
  'lb.empty': 'No rankings yet — go adventure first!',
  'lb.you': '(You)',
  'lb.back': 'Back',

  // ---- Classes ----
  'class.warrior': 'Warrior', 'class.warrior.tag': 'An iron wall, an iron will',
  'class.berserker': 'Berserker', 'class.berserker.tag': 'The more it hurts, the wilder it gets',
  'class.paladin': 'Paladin', 'class.paladin.tag': 'A light of faith that never dims',
  'class.assassin': 'Assassin', 'class.assassin.tag': 'Gone before the blade ever lands',
  'class.mage': 'Mage', 'class.mage.tag': 'The world bends at their fingertips',
  'class.warlock': 'Warlock', 'class.warlock.tag': 'A curse is a blade that never dulls',
  'class.ranger': 'Ranger', 'class.ranger.tag': 'One arrow, one life',
  'class.monk': 'Iron Fist Monk', 'class.monk.tag': 'Flowing water — nothing stands in its way',
  'class.necromancer': 'Necromancer', 'class.necromancer.tag': 'Death is only the beginning',
  'class.bard': 'War Bard', 'class.bard.tag': 'A song that sharpens every blade',
  'class.guardian': 'Guardian', 'class.guardian.tag': 'Nothing gets past this shield',
  'class.spellblade': 'Spellblade', 'class.spellblade.tag': 'A blade etched with fire runes',

  // ---- Signatures ----
  'sig.rally': 'Rally', 'sig.rally.desc': 'Restores 15% HP and raises Defense by 30% for 2 turns',
  'sig.bloodrage': 'Blood Rage', 'sig.bloodrage.desc': 'Raises Attack by 40% for 2 turns',
  'sig.sanctuary': 'Sanctuary', 'sig.sanctuary.desc': 'Instantly restores 25% HP',
  'sig.vanish': 'Vanish', 'sig.vanish.desc': 'Guarantees a dodge of the next attack, then counters with bonus damage',
  'sig.overcharge': 'Overcharge', 'sig.overcharge.desc': 'The next Heavy Attack deals double damage',
  'sig.curse': 'Death Curse', 'sig.curse.desc': 'Curses the enemy with heavy, ongoing burn',
  'sig.aimedshot': 'Aimed Shot', 'sig.aimedshot.desc': 'The next attack is guaranteed to hit and crit',
  'sig.flow': 'Flow', 'sig.flow.desc': 'Raises Speed by 40% for 2 turns',
  'sig.drain': 'Soul Drain', 'sig.drain.desc': 'Deals instant damage and restores HP equal to the damage dealt',
  'sig.hymn': 'War Hymn', 'sig.hymn.desc': 'Raises Attack, Defense, and Speed by 15% for 2 turns',
  'sig.ironshell': 'Iron Shell', 'sig.ironshell.desc': 'Raises Defense by 60% for 2 turns',
  'sig.runicedge': 'Runic Edge', 'sig.runicedge.desc': 'Attacks inflict burn for 3 turns',

  // ---- Equipment ----
  'rarity.common': 'Common',
  'rarity.rare': 'Rare',
  'rarity.epic': 'Epic',
  'item.sword': 'Sword', 'item.dagger': 'Dagger', 'item.tome': 'Spellbook',
  'item.plate': 'Plate Armor', 'item.vest': 'Leather Vest', 'item.robe': 'Spell Robe',
  'item.ring': 'Ring', 'item.charm': 'Charm', 'item.amulet': 'Secret Amulet',
  'slot.weapon': 'Weapon', 'slot.armor': 'Armor', 'slot.accessory': 'Accessory',
  'passive.vampiric': 'Bloodthirsty Edge', 'passive.vampiric.desc': 'Restores 8% of damage dealt on a successful counter',
  'passive.thorns': 'Thorned Armor', 'passive.thorns.desc': 'Reflects 15% of damage taken back at the attacker',
  'passive.fleetfoot': 'Windswept Stride', 'passive.fleetfoot.desc': 'The first dodge each battle grants +12 Speed for the rest of the fight',

  // ---- v8: Dormant Passives & the Hidden Runesmith ----
  'passive.dormant': '🔒 Dormant Power — rumor says the Runesmith of {town} can awaken it',
  'runesmith.title': 'The Hidden Runesmith',
  'runesmith.lore': 'The moment you step past the camp fence, a stout old dwarf grips your arm tight, his clouded white eyes fixed on the gear at your side. "That low hum... don\u2019t you hear it? It\u2019s still asleep. The power inside has slumbered a long, long time," he mutters, running a hand over the pitch-black anvil beside the fire. "The moon that fell into the abyss below once taught me to carve runes that wake the soul of metal. Let me strike the hammer just once — and its true nature will awaken. Forever."',
  'runesmith.confirm': '⚒ Let the Runesmith Awaken Your Gear',

  // ---- v9: Boss progression, roads, checkpoints ----
  'lord.roadOpen': 'The fiend lord\u2019s body has fallen — the path to {place} lies open. The threshold it once guarded stands unopposed.',
  'lord.advance': '🚪 Advance to {place}',
  'lord.stay': '🏕 Remain in This Land',
  'node.lordSlain': 'The fallen fiend lord\u2019s lair — only stray minions remain',
  // v9.2
  'lord.deadEnd': 'The fiend lord has breathed its last — but behind the throne lies only solid rock. No path continues from here.',
  'node.clearedPass': 'Ground already claimed — pass freely, no fight required',
  'zone.backtrackHint': '↩ You can always walk back through claimed ground — free passage, no combat (unless a stray beast wanders in)',
  'prowler.encounter': '⚠ A stray beast has wandered into your claimed ground — it hasn\u2019t respawned, but it followed the scent of blood',
  'world.unknownRoad': 'An Unnamed Road',
  'save.failed': '⚠ Save failed — progress may be lost if you close this window ({err})',
  'save.recovered': '⛨ Recovered your latest progress from this device — the cloud copy is behind and is being synced now',
  'session.takeover.title': 'Game Opened in Another Tab',
  'session.takeover.body': 'To prevent your save from rewinding, this tab has stopped. Keep playing in the newest tab, or press the button below to resume playing in this one instead.',
  'session.takeover.reload': '⟳ Resume in This Tab',
  'inv.title': 'Paper Doll',
  'inv.empty': 'Empty',
  'inv.unequip': 'Unequip',
  'inv.back': 'Back',

  // ---- Biomes ----
  'biome.ember_wastes': 'Ember Wastes', 'biome.ember_wastes.flavor': 'Cracked earth smoldering with slow-burning embers',
  'biome.verdant_hollow': 'Verdant Hollow', 'biome.verdant_hollow.flavor': 'Ruins swallowed whole by moss',
  'biome.frostpeak': 'Frostpeak', 'biome.frostpeak.flavor': 'Cliffs scoured raw by wind and ancient ice',
  'biome.ashen_ruins': 'Ashen Ruins', 'biome.ashen_ruins.flavor': 'The skeleton of a city that forgot its own name',

  // ---- Enemies ----
  'enemy.beast': 'Feral Beast',
  'enemy.stalker': 'Hardened Stalker',
  'enemy.warden': 'Warden of {biome}',
};

// ============================ v4 — Dark World ============================
Object.assign(EN, {
  // ---- Capital ----
  'capital.name': 'Velantir, the Ashen Capital',
  'capital.lore': 'A city that once shone like gold now stands with broken towers and bells that toll themselves at night. Those who remain no longer look up at the sky.',
  'capital.rested': 'You have rested in the shadow of the capital\u2019s walls — HP fully restored',
  'capital.depart': '⚔ Set Out Into the Wilds',
  'capital.travel': '🕯 Warp to a Discovered Town',
  'capital.bag': '👜 Dimensional Bag',
  'capital.arena': '🏆 Blood Arena (PvP)',

  // ---- World map ----
  'world.title': 'The Ten Wildlands',
  'world.subtitle': 'Every road leads out from Velantir — and some roads... bring no one back',
  'world.enter': 'Step In',
  'world.townFound': '✓ Town Found',
  'world.lordSlain': '☠ Land Lord Slain',
  'world.back': 'Return to the Capital',
  'world.danger': 'Danger Level',

  // ---- Zones (10) ----
  'zone.z0': 'Sorrowshade Forest', 'zone.z0.lore': 'The trees here never shed their leaves — they shed tears instead.',
  'zone.z1': 'Silent Bone Plains', 'zone.z1.lore': 'Ancient giant bones jut from the earth. No one knows what they once knelt before.',
  'zone.z2': 'Slumbering Marsh', 'zone.z2.lore': 'The sleepers in this marsh still dream — and their dreams leak into the waking world.',
  'zone.z3': 'Weeping Cliffs', 'zone.z3.lore': 'The crying carried on the wind isn\u2019t wind at all. The charcoal folk know this well, which is why none of them stay to hear it end.',
  'zone.z4': 'Ashbone Desert', 'zone.z4.lore': 'This sand was once an army. When the storms blow, it still tries to march.',
  'zone.z5': 'Deadmoon Ravine', 'zone.z5.lore': 'A moon once fell here. What crawled out of that crater still hasn\u2019t died.',
  'zone.z6': 'Glowspore Forest', 'zone.z6.lore': 'The glow in the dark isn\u2019t hope — it\u2019s a lure.',
  'zone.z7': 'Wailing Glacier', 'zone.z7.lore': 'The ice traps the last sounds of those it froze. Tread softly, in case they finally get to sleep.',
  'zone.z8': 'Forgotten Barrow Hill', 'zone.z8.lore': 'No grave here bears a name, for a name is the first thing this land devours.',
  'zone.z9': 'The Shattered Rim', 'zone.z9.lore': 'The edge of the world, broken into pieces — and something is climbing up through the cracks.',

  // ---- Materials (per zone) ----
  'mat.z0': 'Shade Tears', 'mat.z1': 'Silent Bone Dust', 'mat.z2': 'Slumbering Pearl', 'mat.z3': 'Weeping Stone',
  'mat.z4': 'Ashbone Sand', 'mat.z5': 'Deadmoon Shard', 'mat.z6': 'Glowspore', 'mat.z7': 'Wailing Ice',
  'mat.z8': 'Barrow Soil', 'mat.z9': 'Rim Fragment',
  'mat.generic': 'Wildland Material',

  // ---- Towns (per zone) ----
  'town.z0': 'Dimlantern Village', 'town.z1': 'Restbone Outpost', 'town.z2': 'Slumbering Derelict Port', 'town.z3': 'Refugee\u2019s Ledge',
  'town.z4': 'Last Oasis', 'town.z5': 'Ravine\u2019s Edge Camp', 'town.z6': 'Spore Collection Station', 'town.z7': 'Warmth Cabin',
  'town.z8': 'Barrow Watch Hall', 'town.z9': 'Endroad Fort',
  'town.discovered': 'You\u2019ve found {town} — a refuge amid the deathlands',
  'town.rested': 'Beneath a safe roof, your body is fully restored',
  'town.shop': '🛒 Shop',
  'town.continue': '⚔ Push On Deeper',
  'town.toCapital': '🚶 Walk Back to the Capital',
  'town.travel': '🕯 Warp Travel',

  // ---- Node types (new) ----
  'node.elite': 'Vile Beast',
  'node.campfire': 'Campfire',
  'node.town': 'Town',
  'node.fog': '???',
  'node.lord': 'Land Lord',
  'campfire.rest': 'A small flame defies the dark. You sit and breathe again.',
  'campfire.healed': 'Restored {n} HP',
  'gate.toCapital': 'A winding shortcut back to Velantir appears before you',
  'gate.use': '🚶 Use Shortcut Back to the Capital',

  // ---- Zone screen ----
  'zone.retreat': '🏳 Retreat',
  'zone.retreated': 'You retreat, utterly spent — the wilds don\u2019t remember the defeated, but they wait',
  'zone.softcapWarn': 'The deeper you go, the denser death becomes — past the town, enemies grow exponentially stronger',
  'defeat.returned': 'The darkness swallows you... then spits your pale body back out at {place}',

  // ---- Economy ----
  'gold': 'Gold',
  'gold.drop': '+{n} gold',
  'mat.drop': '+{n} {mat}',
  'shop.title': '{town} Shop',
  'shop.buy': 'Buy ({n} gold)',
  'shop.sell': 'Sell (+{n} gold)',
  'shop.noGold': 'Not enough gold',
  'shop.bagFull': 'Bag is full',
  'shop.stockEmpty': 'The shelves are bare — the merchant watches you in silence',
  'shop.yourBag': 'Items in Your Bag',
  'travel.title': 'Warp Travel',
  'travel.desc': 'A dimensional candle-flame will carry you across the wilds — at the cost of gold and fading memory',
  'travel.cost': 'Travel to {place} ({n} gold)',
  'travel.capital': 'Velantir, the Capital',
  'travel.none': 'No towns discovered in the wilds yet',

  // ---- Dimensional Bag ----
  'bag.title': 'Dimensional Bag ({used}/{cap})',
  'bag.empty': 'Empty — only echoes from other dimensions remain',
  'bag.equipped': 'Equipped',
  'bag.materials': 'Materials',
  'bag.matCap': 'Material Vault (max {cap} per type)',
  'bag.discard': 'Discard',
  'bag.discardConfirm': 'Sure? Gone forever!',
  'world.viewer.legend.gated': 'Road still guarded by its Lord — slay him to open it',
  'event.matFull': 'The vault is full — {n} spilled into the ash',
  'bag.full.autoSold': 'Bag full! {item} was salvaged for gold (+{n})',
  'bag.compare': 'Compare',
  'bag.equip': 'Equip',
  'bag.sellItem': 'Sell (+{n})',
  'bag.close': 'Close',
  'compare.title': 'Compare Gear',
  'compare.new': 'New Item',
  'compare.current': 'Currently Equipped',
  'compare.none': '— None —',
  'loot.toBag': '{item} was stored in your Dimensional Bag',

  // ---- NPCs ----
  'npc.talk': 'Talk',
  'npc.service': 'Service',
  'npc.notEnoughMat': 'Not enough materials',
  'npc.maxed': 'Already at maximum',

  'npc.vesper.name': 'Vesper', 'npc.vesper.title': 'The Cursed Sage of the Fallen Library',
  'npc.vesper.lore': 'Vesper was once the head librarian of Velantir — until he read a book that should never have existed. Now half his body remains permanently sunken into another dimension, visible only as a faint shadow at the edge of sight. Because of this, he understands "empty space" better than anyone alive.',
  'npc.vesper.line1': '"Your bag? It isn\u2019t small. You simply don\u2019t understand emptiness well enough yet."',
  'npc.vesper.line2': '"Bring me material from the wilds, and I\u2019ll stitch the dimensional tear a little wider... the same way it was stitched into me."',
  'npc.vesper.svc': 'Expand Dimensional Bag +2 slots',
  'npc.vesper.matSvc': 'Expand Material Vault +15 per type',
  'npc.vesper.matCost': 'Vault-weaving fee: {n} gold',
  'npc.vesper.matFull': 'The material vault is already at its limit',
  'npc.vesper.cost': 'Cost: {n} of the same material',

  'npc.isra.name': 'Isra', 'npc.isra.title': 'The Blind-Eyed Scout',
  'npc.isra.lore': 'Isra was once the royal scout who saw farther than anyone in the land — until the day she looked upon "what lies at the world\u2019s edge," and her eyes burned white in a single night. And yet she says she sees more clearly now, because the true map was never meant to be read with the eyes.',
  'npc.isra.line1': '"Don\u2019t trust your eyes, little one. The fog never hides anything... it simply spares you from seeing too soon."',
  'npc.isra.line2': '"Bring me material, and I\u2019ll teach you to hear the sound of the road not yet reached."',
  'npc.isra.svc': 'Extend Map Vision Range +1 step',
  'npc.isra.cost': 'Cost: {n} of the same material',

  'npc.krom.name': 'Krom', 'npc.krom.title': 'The One-Armed Smith',
  'npc.krom.lore': 'Krom lost his right arm to a sword he forged with his own hands — a blade too perfect to accept an owner. He buried it beneath his anvil, and his forge fire has never gone out since, as though something underground keeps stoking the coals.',
  'npc.krom.line1': '"Good steel must pass through fire. A good soul must pass through the wilds... I\u2019ve passed through both. One arm was a fair price."',
  'npc.krom.line2': '"Lay your weapon on the anvil, and don\u2019t ask what that whisper beneath the ground is."',
  'npc.krom.svc': 'Reforge Weapon (+2 permanent Attack)',
  'npc.krom.cost': 'Cost: {gold} gold + {mat} material',
  'npc.krom.noWeapon': 'You have no weapon for me to reforge',

  'npc.mara.name': 'Mara', 'npc.mara.title': 'The Wandering Shade of the Waning Moon',
  'npc.mara.lore': 'No one has ever seen Mara arrive — she simply "is already there," her cart\u2019s wheels never quite touching the ground. Her wares are worth more than their price, and she accepts only gold, because whatever else people once paid with, she says she already has plenty of.',
  'npc.mara.line1': '"Good things carry a price, dear... and a price paid in gold is the cheapest I\u2019ve ever asked."',
  'npc.mara.line2': '"Don\u2019t ask where these came from. Their previous owners have no more use for them."',
  'npc.mara.svc': 'Rare High-Tier Goods',

  // ---- Misc ----
  'hud.gold': '🪙 {n}',
  'result.goldReward': '+{xp} EXP · +{gold} gold',
  'lord.slain': 'The land lord has fallen — {zone} falls silent, if only for a moment',
});

// ===================== v5 — Landing / Rename / Loot Gate =====================
Object.assign(EN, {
  'landing.guest': '▶ Play Now (Guest)',
  'landing.or': '— or —',
  'landing.guestNote': 'Start adventuring immediately — your save is stored on this device',
  'landing.loginNote': 'Sign in to keep your save in the cloud and appear on the leaderboard',
  'auth.guestName': 'Anonymous Wanderer',

  'rename.btn': '✍ Rename',
  'rename.title': 'Rename Your Hero',
  'rename.current': 'Current name: {name}',
  'rename.freeNote': 'Your first rename is free',
  'rename.placeholder': 'Your new name',
  'rename.confirm': 'Confirm Rename',
  'rename.devNote': 'You\u2019ve already used your free rename — further renames are still in development',
  'rename.err.short': 'Name must be at least 2 characters long',
  'rename.err.same': 'New name matches your current name',
  'rename.err.taken': 'This name is already taken — please choose another',
  'create.err.taken': 'This name already belongs to someone in the realm — including fallen legends on the leaderboard. Choose a new name.',
  'rename.success': 'The world will now remember you as "{name}"',

  'lootgate.title': 'Loot from the Fallen',
  'lootgate.remaining': '{n} items left to decide',
  'lootgate.equip': 'Equip Now',
  'lootgate.take': 'Store in Dimensional Bag',
  'lootgate.discard': 'Melt Down for Gold (+{n})',
  'lootgate.bagFull': 'Bag full',
  'lootgate.equipped': 'Equipped {item}',
  'lootgate.prevToBag': '{item} (previous gear) was stored in your Dimensional Bag',
  'lootgate.prevSalvaged': 'Bag full — {item} (previous gear) melted down for gold (+{n})',
  'lootgate.taken': '{item} was stored in your Dimensional Bag',
  'lootgate.discarded': '{item} melted down for gold (+{n})',
});

// ===================== v5 — Two-Layer World Map & Settings =====================
Object.assign(EN, {
  // ---- Start Village (the other hub, alongside the Capital) ----
  'world.hub.start.name': 'The Nameless Village',
  'world.hub.start.lore': 'A small village on the edge of the wilds — no walls, no name, nothing to guarantee it will still be standing tomorrow. And yet it is where the endless journey begins, its fire always lit, waiting for travelers to return.',
  'world.hub.start.rested': 'A small fire at the village center warms you enough to restore your strength',

  // ---- World Map Viewer (macro layer, ui.js) ----
  'world.viewer.title': 'Map of the Wildlands',
  'world.viewer.navLabel': '🗺 World Map',
  'world.viewer.subtitle': 'The true roads reveal themselves only once you\u2019ve found a town in that land. The rest still sleeps in the fog.',
  'world.viewer.back': 'Back',
  'world.viewer.legend.conquered': 'Conquered',
  'world.viewer.legend.available': 'Reachable',
  'world.viewer.legend.scouted': 'Glimpsed in Shadow',

  // ---- The endless web past the Capital (procedural outer regions) ----
  'world.outerZoneName': '{biome} #{n}',
  'world.outerTownName': 'Camp in the {biome}',
  'zone.unknown': 'Unnamed Land',
  'zone.unknown.lore': 'The fog still refuses to reveal what lies beyond',

  // ---- Walking back from a Town ----
  'town.toStart': '🚶 Walk Back to the First Ashen Village',

  // ---- Settings panel ----
  'settings.title': 'Settings',
  'settings.navLabel': '⚙ Settings',
  'settings.back': 'Back',
  'settings.link.title': '🔗 Link Account',
  'settings.link.body': 'Your save currently lives only on this device — link a Google account to move it to the cloud and appear on the leaderboard from anywhere. Your existing save will not be deleted.',
  'settings.link.button': 'Link with Google',
  'settings.link.working': 'Linking account...',
  'settings.link.error': 'Failed to link account — please try again',
  'settings.linked.title': '✓ Account Linked',
  'settings.linked.body': 'Signed in as {name} — your save now lives in the cloud',
});

// ===================== v6 — The Hardcore & Hazards Update =====================
Object.assign(EN, {
  // ---- Altar (now +25% to ALL base stats) ----
  'altar.boonAll': 'All your base stats increase by 25%, permanently — {hearts} hearts remaining',

  // ---- Hardcore loot gate (discard/bag-full yield NOTHING now) ----
  'lootgate.discard': 'Discard — Lost Forever',
  'lootgate.discarded': '{item} was discarded — lost forever into the void',
  'lootgate.prevLost': 'Bag full — {item} (previous gear) is lost forever',
  'bag.full.lost': 'Bag full! {item} is lost forever — nothing remains',
  'bag.sellLocked': 'You must return to a town and find a merchant before selling from your Dimensional Bag',

  // ---- Campfire Ambush ----
  'log.ambush.opener': '{name} lunges out of the shadows and strikes before you can react!',
  'ambush.banner': '🌑 Ambushed at the Campfire! The enemy strikes first',
  'ambush.survived': '✦ You survived the ambush! A rare reward was left behind',
  'enemy.ambusher': 'Shadow-Lurking Hunter',

  // ---- Zone Hazards ----
  'hazard.toxic_fog': 'Toxic Fog',
  'hazard.toxic_fog.desc': 'Poisonous vapor eats away at your body every turn of the battle',
  'hazard.blood_moon': 'Blood Moon',
  'hazard.blood_moon.desc': 'The crimson moonlight drives enemies to land critical hits every time — but gold earned is doubled',
  'hazard.overgrowth': 'Choking Vines',
  'hazard.overgrowth.desc': 'Vines bind your feet, making you unable to dodge for the entire battle',
  'zone.hazardSight': 'The sight Isra trained into you reveals the hidden danger on the road ahead',
  'log.hazard.drain': '{name} suffers {dmg} agonizing damage',

  // ---- Cursed Equipment ----
  'rarity.cursed': 'Cursed',
  'rarity.legendary': 'Legendary',
  'curse.hpDrain': 'Curse of Endless Bleeding', 'curse.hpDrain.desc': 'Lose 5% of max HP on every one of your turns',
  'curse.speedHalf': 'Curse of Leaden Legs', 'curse.speedHalf.desc': 'Speed is halved for as long as it\u2019s worn',
  'curse.dodgeSeal': 'Curse of Snared Feet', 'curse.dodgeSeal.desc': 'Cannot dodge at all while worn',
  'curse.brittle': 'Curse of Cracked Armor', 'curse.brittle.desc': 'Take 20% more damage from every attack',

  // ---- Vesper's Cleanse Curse (Capital only) ----
  'npc.vesper.cleanseSvc': '🔮 Cleanse Curse',
  'npc.vesper.cleanseCost': 'Cost: {gold} gold + {mat} of the same material',
  'npc.vesper.cleanseBtn': 'Cleanse',
  'npc.vesper.noCursed': 'You have no cursed items on you right now',

  // ---- The Wandering Smuggler ----
  'npc.smuggler.name': 'Duskfall',
  'npc.smuggler.title': 'The Wandering Merchant of Shadow',
  'npc.smuggler.lore': 'No one has ever seen Duskfall arrive. Her cart appears in places the map doesn\u2019t yet dare to name, as though the fog itself had taken the shape of a merchant. Her wares come from hands no one dares question, and she is never in the same place twice.',
  'npc.smuggler.line1': '"You found me in this darkness? Well then — I suppose it\u2019s time I moved on."',
  'npc.smuggler.line2': '"The third heart, hm? It has a price, darling — but not one paid in gold."',
  'world.viewer.smugglerHint': 'Something is moving in the fog...',
  'world.viewer.legend.smuggler': 'Mysterious Shadow',
  'smuggler.stockTitle': '🌫 Black Market Wares',
  'smuggler.heartTitle': '💗 The Third Heart',
  'smuggler.heartDesc': 'Duskfall has a way to return a heart to you... at a mad price ({n} of the same material)',
  'smuggler.heartBuy': 'Buy Back a Heart ({n} material)',
  'smuggler.heartMaxed': 'Your hearts are already full',

  // ---- Hidden Unique Skills (classes.js) ----
  'hidden.hint': 'Hidden Skill — awakens once {stat} reaches {n}',
  'hidden.dormant': '— Hidden Skill Still Dormant',
  'hidden.awakened.title': '✦ Hidden Skill Awakened!',
  'hidden.awakened.dismiss': 'Acknowledge',
  'log.hidden.trigger': '{name} unleashes {skill}!',
  'log.hidden.secondWind': '{name} defies death! {skill} restores {heal} HP',
  'log.hidden.reflect': '{name}\u2019s {skill} reflects {dmg} damage',
  'log.hidden.doubleStrike': '{name}\u2019s {skill} strikes again! +{dmg} bonus damage',

  'hidden.lastbastion': 'Last Bastion',
  'hidden.lastbastion.desc': 'When HP falls below 30%, Defense surges by 60% for the rest of the battle',
  'hidden.deathwish': 'Deathwish Resolve',
  'hidden.deathwish.desc': 'When HP falls below 40%, Attack surges by 50% for the rest of the battle',
  'hidden.martyrlight': 'Martyr\u2019s Light',
  'hidden.martyrlight.desc': 'Survive one otherwise-fatal blow per battle, then restore 35% HP',
  'hidden.phantomstep': 'Phantom Step',
  'hidden.phantomstep.desc': 'Every battle begins with Vanish active — the enemy\u2019s first attack always misses',
  'hidden.arcanetorrent': 'Arcane Torrent',
  'hidden.arcanetorrent.desc': 'Signature move gauge starts the battle already full',
  'hidden.plaguebearer': 'Plaguebearer',
  'hidden.plaguebearer.desc': 'DoT damage you inflict is increased by 75%',
  'hidden.hawkeye': 'Hawkeye',
  'hidden.hawkeye.desc': 'Deal 40% bonus damage to enemies below 35% HP',
  'hidden.innertempo': 'Inner Tempo',
  'hidden.innertempo.desc': 'Every attack has a 25% chance to strike again instantly for half damage',
  'hidden.soulharvest': 'Soul Harvest',
  'hidden.soulharvest.desc': 'Lifesteal rate is doubled for the entire battle',
  'hidden.crescendo': 'Crescendo',
  'hidden.crescendo.desc': 'Signature move gauge charges 20 extra units per action',
  'hidden.aegiswall': 'Wall of the Sacred Aegis',
  'hidden.aegiswall.desc': 'Reflects 25% of damage back at the attacker every time you\u2019re hit',
  'hidden.runeburst': 'Rune Burst',
  'hidden.runeburst.desc': 'Every critical hit also sets the enemy ablaze',
});

// ===================== v10 — Bilingual Language Toggle =====================
Object.assign(EN, {
  'settings.language.title': '🌐 Language',
  'settings.language.note': 'Change the language used throughout the game — saved on this device',
});

// =============================================================================
// Language machinery — swaps the active table; t()'s signature never changes.
// =============================================================================

const TABLES = { th: TH, en: EN };
const DEFAULT_LANG = 'th';
const LANG_STORAGE_KEY = 'ashen_lang';

export const AVAILABLE_LANGUAGES = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
];

function loadStoredLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'th' || saved === 'en') return saved;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to default.
  }
  return DEFAULT_LANG;
}

let currentLang = loadStoredLang();

/** Current active language code ('th' | 'en'). */
export function getLanguage() { return currentLang; }

/** Switch the active language and persist the choice. Returns the resulting language. */
export function setLanguage(lang) {
  if (lang !== 'th' && lang !== 'en') return currentLang;
  currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {
    // localStorage unavailable — language still switches for this session.
  }
  return currentLang;
}

/**
 * Translate a key, interpolating {param} placeholders.
 * Fallback chain: active language -> Thai -> the raw key itself, so a
 * string momentarily missing from EN degrades to Thai instead of a raw key.
 */
export function t(key, params = null) {
  const table = TABLES[currentLang] || TH;
  let s = table[key] ?? TH[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}


// ============================ v11 — The Ashen Ascension ============================
// Slot expansion (8-slot paper-doll), the Arena Warden + PvP-point economy,
// Secret & Unique class tiers, and the Sanity Curse. TH block first, then a
// key-for-key EN mirror — same discipline as every block above.

Object.assign(TH, {
  // ---- v11 slots ----
  'slot.head': 'หมวก', 'slot.armor': 'เกราะอก', 'slot.legs': 'สนับขา', 'slot.boots': 'รองเท้า',
  'slot.ring': 'แหวน', 'slot.necklace': 'สร้อยคอ', 'slot.bracelet': 'กำไล',

  // ---- v11 item bases ----
  'item.helm': 'หมวกเหล็ก', 'item.hood': 'ฮู้ดคลุมเงา', 'item.circlet': 'มงกุฎรัดเกล้า',
  'item.greaves': 'สนับแข้งเหล็ก', 'item.leggings': 'สนับขาหนัง',
  'item.sabatons': 'รองเท้าเกราะ', 'item.boots': 'รองเท้าหนัง', 'item.striders': 'รองเท้าลมกรด',
  'item.signet': 'แหวนตรา', 'item.pendant': 'จี้ห้อยคอ', 'item.bangle': 'กำไลข้อมือ',

  // ---- v11 PvP rarity + Arena Honor set ----
  'rarity.pvp': 'เกียรติยศ',
  'item.pvp.blade': 'ดาบสังเวียน', 'item.pvp.helm': 'หมวกสังเวียน', 'item.pvp.plate': 'เกราะสังเวียน',
  'item.pvp.greaves': 'สนับแข้งสังเวียน', 'item.pvp.boots': 'รองเท้าสังเวียน',
  'item.pvp.ring': 'แหวนสังเวียน', 'item.pvp.amulet': 'สร้อยสังเวียน', 'item.pvp.band': 'กำไลสังเวียน',

  // ---- v11 PvP points / Warden shop ----
  'hud.pvpPoints': '🏅 {n}',
  'pvp.ptsEarned': '🏅 +{n} แต้มสังเวียน (สะสม {total})',
  'pvpshop.title': 'คลังเกียรติยศสังเวียน',
  'pvpshop.tagline': 'เลือดที่หลั่งในสังเวียนไม่เคยสูญเปล่า',
  'pvpshop.balance': 'แต้มสังเวียนของเจ้า: 🏅 {n}',
  'pvpshop.note': 'ยุทธภัณฑ์จากเลือดและเหงื่อ — แต่ตำนานที่แท้จริงยังหลับใหลอยู่ในแดนลึกและมือของผู้ที่มองไม่เห็น',
  'pvpshop.cost': '🏅 {n} แต้ม',
  'pvpshop.buy': 'แลก',
  'pvpshop.bought': 'ได้รับแล้ว — เก็บไว้ในกระเป๋ามิติ',
  'pvpshop.noPoints': 'แต้มสังเวียนไม่พอ — จงกลับไปหลั่งเลือดเพิ่ม',
  'pvpshop.bagFull': 'กระเป๋ามิติเต็ม — จัดการสัมภาระก่อน',

  // ---- v11 NPC: ศัสตรา ผู้คุมสังเวียน ----
  'npc.warden.name': 'ศัสตรา',
  'npc.warden.title': 'ผู้คุมสังเวียนเลือด',
  'npc.warden.lore': 'อดีตแชมป์ร้อยศึกผู้ปฏิเสธที่จะตายในสังเวียน เล่ากันว่าเมื่อหัวใจดวงสุดท้ายของเขาแตกสลาย เมืองหลวงกลับปฏิเสธความตายของเขา — บัดนี้เขายืนเฝ้าประตูสังเวียนชั่วนิรันดร์ แลกเกียรติยศกับเหล็กกล้าให้ผู้ที่ยังหายใจ',
  'npc.warden.line1': '"เลือดของเจ้ามีราคา และข้าคือคนจ่าย"',
  'npc.warden.line2': '"อย่าถามว่าข้าตายมาแล้วกี่ครั้ง... จงถามว่าเหตุใดข้ายังยืนอยู่"',
  'npc.warden.svc': 'แลกแต้มสังเวียนเป็นยุทธภัณฑ์เกียรติยศ',
  'npc.warden.open': 'เปิดคลังเกียรติยศ',

  // ---- v11 creation: tiers ----
  'create.locked': 'ยังไม่ปลดล็อก',
  'create.tier.secret': 'คลาสลับ',
  'create.tier.unique': 'หนึ่งเดียว',
  'create.secret.title': '— คลาสลับ —',
  'create.unique.title': '— คลาสเอกอุแห่งเซิร์ฟเวอร์ —',
  'create.unique.rule': 'แต่ละบัลลังก์มีผู้ครองได้เพียงหนึ่งเดียวทั้งเซิร์ฟเวอร์ — หากผู้ครองสิ้นชีพถาวรในสังเวียน บัลลังก์จะว่างลงให้ผู้อื่นชิงทันที',
  'create.unique.checking': 'กำลังหยั่งดูบัลลังก์...',
  'create.unique.holder': 'บัลลังก์นี้มีผู้ครอง — {name}',
  'create.unique.taken': 'ช้าไปเพียงหนึ่งลมหายใจ — {name} ชิงบัลลังก์นี้ไปแล้ว',
  'create.unique.claimError': 'ไม่อาจติดต่อผู้ตัดสินบัลลังก์ได้ — ลองอีกครั้ง',

  // ---- v11 Sanity Curse ----
  'sanity.onset.title': '🕯 คำสาปสติวิปลาส',
  'sanity.onset.body': 'เจ้าก้าวลึกเกินกว่าที่จิตมนุษย์จะทานทน เสียงกระซิบเริ่มกัดกินขอบสติ... นับแต่นี้ จงหลั่งเลือดในสังเวียนอย่างน้อยหนึ่งครั้งทุก 24 ชั่วโมง มิเช่นนั้นคำสาปจะเก็บเกี่ยวหัวใจของเจ้าไปทีละดวง',
  'sanity.tax.title': 'คำสาปทวงหัวใจ',
  'sanity.tax.body': 'เจ้าหลบเลี่ยงสังเวียนนานเกินไป — คำสาปเก็บเกี่ยวหัวใจไป {n} ดวง',
  'sanity.tax.died': 'คำสาปเก็บเกี่ยวหัวใจไป {n} ดวง... รวมถึงดวงสุดท้าย การเดินทางของเจ้าจบลงในความวิปลาส',
  'sanity.fed': '🕯 คำสาปได้ลิ้มรสเลือดแล้ว — สติของเจ้ามั่นคงไปอีก 24 ชั่วโมง',
  'sanity.hud.tip': 'เวลาที่เหลือก่อนคำสาปทวงหัวใจ — สู้ในสังเวียนหนึ่งครั้งเพื่อเริ่มนับใหม่',

  // ---- v11 Secret classes ----
  'class.cursebreaker': 'ผู้หักคำสาป', 'class.cursebreaker.tag': 'มือที่กลืนกินสิ่งที่คนอื่นไม่กล้าแตะ',
  'class.cursebreaker.hint': 'จงชำระสิ่งต้องสาปให้ครบสามครา... แล้วคำสาปจะจดจำมือของเจ้า',
  'class.ashenknight': 'อัศวินเถ้าธุลี', 'class.ashenknight.tag': 'เกราะที่หลอมจากซากแดนลึก',
  'class.ashenknight.hint': 'จอมมารแห่งแดนอันตรายขั้นที่หก... โค่นมัน แล้วสวมเถ้าของมัน',
  'class.gravewarden': 'ผู้เฝ้าสุสาน', 'class.gravewarden.tag': 'ผู้ดื่มกินจากหลุมศพของตนเอง',
  'class.gravewarden.hint': 'เมื่อหลุมศพแรกของเจ้าให้กำเนิดทายาท ผู้เฝ้าจะเปิดประตูรับ',
  'class.moonveil': 'จันทร์คลุมเงา', 'class.moonveil.tag': 'คมมีดที่แสงจันทร์ไม่ยอมส่อง',
  'class.moonveil.hint': 'นางเร่ขายหัวใจใต้เงาหมอก... จงซื้อมันสักครั้ง',

  // ---- v11 Unique classes ----
  'class.eclipsemonarch': 'ราชันสุริยคราส', 'class.eclipsemonarch.tag': 'ผู้สวมมงกุฎเมื่อดวงตะวันดับ',
  'class.hollowsaint': 'นักบุญกลวงเปล่า', 'class.hollowsaint.tag': 'ศรัทธาที่เหลือแต่เปลือก — และเปลือกนั้นไม่มีวันแตก',
  'class.plagueempress': 'จักรพรรดินีมหันตโรค', 'class.plagueempress.tag': 'ทุกลมหายใจของนางคือโรคระบาด',
  'class.voidreaver': 'ผู้เกี่ยวสุญตา', 'class.voidreaver.tag': 'คมเคียวที่เกี่ยวเอาความว่างเปล่า',
  'class.dawnbreaker': 'ผู้หักรุ่งอรุณ', 'class.dawnbreaker.tag': 'ร้อยศึกในสังเวียนหลอมเขาขึ้นมา',
  'class.gravemarshal': 'จอมพลหลุมศพ', 'class.gravemarshal.tag': 'กองทัพของเขาไม่เคยหลับ เพราะมันตายหมดแล้ว',
  'class.runeprophet': 'ศาสดาอักขระ', 'class.runeprophet.tag': 'ผู้อ่านอักษรที่โลกพยายามลบ',
  'class.nightsovereign': 'ราชาแห่งรัตติกาล', 'class.nightsovereign.tag': 'อาณาจักรของเขาเริ่มเมื่อเจ้าหลับตา',
  'class.ashqueen': 'ราชินีเถ้าถ่าน', 'class.ashqueen.tag': 'ทุกอาณาจักรที่นางรักล้วนมอดไหม้',
  'class.worldsedge': 'ผู้ยืน ณ ขอบโลก', 'class.worldsedge.tag': 'ผู้เดินไกลเกินกว่าแผนที่ใดจะตามทัน',

  // ---- v11 signatures ----
  'sig.sunder': 'ฉีกคำสาป', 'sig.sunder.desc': 'กรีดแผลต้องสาปที่กัดกินต่อเนื่อง พร้อมปลุกพลังโจมตีของตน',
  'sig.cinderwall': 'กำแพงถ่านคุ', 'sig.cinderwall.desc': 'เสริมเกราะและคมดาบด้วยเถ้าลุกโชน พร้อมสมานแผลเล็กน้อย',
  'sig.gravedraw': 'สูบวิญญาณหลุมศพ', 'sig.gravedraw.desc': 'โจมตีดูดกลืน — แผลของศัตรูคือยาของเจ้า',
  'sig.lunareclipse': 'จันทรุปราคา', 'sig.lunareclipse.desc': 'หายวับไปในเงาจันทร์ แล้วกลับมาพร้อมคมมีดที่คมกว่าเดิม',
  'sig.totaleclipse': 'สุริยคราสเต็มดวง', 'sig.totaleclipse.desc': 'การโจมตีครั้งถัดไปเป็นคริติคอลแน่นอน และพลังโจมตีพุ่งทะยาน',
  'sig.hollowgrace': 'พรแห่งความกลวง', 'sig.hollowgrace.desc': 'ฟื้นพลังชีวิตมหาศาล เสริมเกราะและการดูดเลือด',
  'sig.blightbloom': 'บุปผามหันตโรค', 'sig.blightbloom.desc': 'หว่านเชื้อโรคร้ายแรงที่สุดเท่าที่โลกเคยรู้จัก กัดกินสี่จังหวะ',
  'sig.voidstep': 'ย่างก้าวสุญตา', 'sig.voidstep.desc': 'หายเข้าไปในความว่าง — การโจมตีถัดไปหลบไม่ได้และเป็นคริติคอล',
  'sig.firstlight': 'แสงแรกแห่งรุ่ง', 'sig.firstlight.desc': 'สมานแผลและปลุกทั้งพลังโจมตีและความเร็วพร้อมกัน',
  'sig.legionrise': 'กองทัพผงาด', 'sig.legionrise.desc': 'สูบกำลังจากศัตรูมาเลี้ยงกองทัพ พร้อมยกเกราะขึ้นตั้งรับ',
  'sig.runecascade': 'อักขระถล่ม', 'sig.runecascade.desc': 'เกจอาคมพลุ่งพล่าน และอักขระเผาไหม้กัดกินศัตรู',
  'sig.kingdomofnight': 'อาณาจักรรัตติกาล', 'sig.kingdomofnight.desc': 'กลืนหายเข้าเงามืด ทิ้งความมืดที่กัดกินไว้เบื้องหลัง',
  'sig.pyrelight': 'เพลิงเชิงตะกอน', 'sig.pyrelight.desc': 'ทุกการโจมตีจุดไฟเผา และคมอาวุธร้อนแรงยิ่งขึ้น',
  'sig.horizonfall': 'ขอบฟ้าพังทลาย', 'sig.horizonfall.desc': 'คริติคอลแน่นอน พร้อมปลุกทั้งดาบและโล่ให้ตื่นพร้อมกัน',

  // ---- v11 hidden skills ----
  'hidden.hexeater': 'ผู้กลืนอาถรรพ์', 'hidden.hexeater.desc': 'พิษและแผลไหม้ของเจ้ารุนแรงขึ้นเท่าตัว',
  'hidden.emberheart': 'หัวใจถ่านคุ', 'hidden.emberheart.desc': 'เมื่อชีวิตต่ำ เกราะของเจ้าแกร่งขึ้นมหาศาล',
  'hidden.tombpact': 'พันธสัญญาหลุมศพ', 'hidden.tombpact.desc': 'หนึ่งครั้งต่อศึก — ปฏิเสธความตายและลุกขึ้นพร้อมเลือดเกือบครึ่ง',
  'hidden.silvershadow': 'เงาเงินยวง', 'hidden.silvershadow.desc': 'เริ่มทุกศึกโดยหายตัวในเงาจันทร์',
  'hidden.crownofash': 'มงกุฎเถ้า', 'hidden.crownofash.desc': 'ศัตรูที่ใกล้ตายรับความเสียหายรุนแรงขึ้นมาก',
  'hidden.emptyvessel': 'ภาชนะว่างเปล่า', 'hidden.emptyvessel.desc': 'หนึ่งครั้งต่อศึก — ความกลวงปฏิเสธความตาย ฟื้นเลือดมหาศาล',
  'hidden.thousandsores': 'พันแผลเรื้อรัง', 'hidden.thousandsores.desc': 'โรคของเจ้าร้ายแรงขึ้นอีกครึ่งเท่า',
  'hidden.edgeofnothing': 'คมแห่งความว่าง', 'hidden.edgeofnothing.desc': 'มีโอกาสสูงที่จะฟาดซ้ำในจังหวะเดียว',
  'hidden.oathofdawn': 'คำสาบานรุ่งอรุณ', 'hidden.oathofdawn.desc': 'เมื่อชีวิตต่ำ พลังโจมตีลุกโชนดั่งตะวันแรก',
  'hidden.deadmensoath': 'คำสาบานคนตาย', 'hidden.deadmensoath.desc': 'เมื่อชีวิตต่ำ กองทัพคนตายยกเกราะให้เจ้าเป็นเท่าตัว',
  'hidden.openedeye': 'ดวงตาที่สาม', 'hidden.openedeye.desc': 'เริ่มทุกศึกด้วยเกจอาคมเต็มเปี่ยม',
  'hidden.throneunseen': 'บัลลังก์ไร้เงา', 'hidden.throneunseen.desc': 'เริ่มทุกศึกโดยหายตัวในความมืด',
  'hidden.cinderveil': 'ม่านถ่านแดง', 'hidden.cinderveil.desc': 'เปลวไฟของเจ้าเผาผลาญรุนแรงขึ้นมาก',
  'hidden.lastcartographer': 'นักเขียนแผนที่คนสุดท้าย', 'hidden.lastcartographer.desc': 'มีโอกาสฟาดซ้ำ — เพราะขอบโลกสอนให้เจ้าไม่หยุดก้าว',
});

Object.assign(EN, {
  // ---- v11 slots ----
  'slot.head': 'Head', 'slot.armor': 'Chest', 'slot.legs': 'Legs', 'slot.boots': 'Boots',
  'slot.ring': 'Ring', 'slot.necklace': 'Necklace', 'slot.bracelet': 'Bracelet',

  // ---- v11 item bases ----
  'item.helm': 'Iron Helm', 'item.hood': 'Shadow Hood', 'item.circlet': 'Circlet',
  'item.greaves': 'Iron Greaves', 'item.leggings': 'Leather Leggings',
  'item.sabatons': 'Sabatons', 'item.boots': 'Leather Boots', 'item.striders': 'Gale Striders',
  'item.signet': 'Signet Ring', 'item.pendant': 'Pendant', 'item.bangle': 'Bangle',

  // ---- v11 PvP rarity + Arena Honor set ----
  'rarity.pvp': 'Honor',
  'item.pvp.blade': 'Arena Blade', 'item.pvp.helm': 'Arena Helm', 'item.pvp.plate': 'Arena Plate',
  'item.pvp.greaves': 'Arena Greaves', 'item.pvp.boots': 'Arena Boots',
  'item.pvp.ring': 'Arena Ring', 'item.pvp.amulet': 'Arena Amulet', 'item.pvp.band': 'Arena Band',

  // ---- v11 PvP points / Warden shop ----
  'hud.pvpPoints': '🏅 {n}',
  'pvp.ptsEarned': '🏅 +{n} Arena Points ({total} total)',
  'pvpshop.title': 'The Arena Honor Vault',
  'pvpshop.tagline': 'Blood spilled in the arena is never wasted.',
  'pvpshop.balance': 'Your Arena Points: 🏅 {n}',
  'pvpshop.note': 'Fine steel bought with blood and sweat — but the true legends still sleep in the deep lands and unseen hands.',
  'pvpshop.cost': '🏅 {n} pts',
  'pvpshop.buy': 'Redeem',
  'pvpshop.bought': 'Received — stored in your Dimensional Bag.',
  'pvpshop.noPoints': 'Not enough Arena Points — go spill more blood.',
  'pvpshop.bagFull': 'Dimensional Bag is full — make room first.',

  // ---- v11 NPC: Sastra the Arena Warden ----
  'npc.warden.name': 'Sastra',
  'npc.warden.title': 'Warden of the Blood Arena',
  'npc.warden.lore': 'A champion of a hundred bouts who refused to die in the sand. They say when his last Heart shattered, the Capital refused his death — now he stands eternal at the arena gate, trading honor for steel with those who still breathe.',
  'npc.warden.line1': '"Your blood has a price. I am the one who pays it."',
  'npc.warden.line2': '"Do not ask how many times I have died... ask why I am still standing."',
  'npc.warden.svc': 'Trade Arena Points for Honor equipment',
  'npc.warden.open': 'Open the Honor Vault',

  // ---- v11 creation: tiers ----
  'create.locked': 'Not yet unlocked',
  'create.tier.secret': 'Secret',
  'create.tier.unique': 'Unique',
  'create.secret.title': '— Secret Classes —',
  'create.unique.title': '— Server-Unique Classes —',
  'create.unique.rule': 'Each throne has exactly ONE holder across the entire server — if its holder permanently dies in the arena, the throne empties for anyone to claim.',
  'create.unique.checking': 'Consulting the thrones...',
  'create.unique.holder': 'This throne is held — {name}',
  'create.unique.taken': 'One breath too slow — {name} has claimed this throne.',
  'create.unique.claimError': 'Could not reach the arbiter of thrones — try again.',

  // ---- v11 Sanity Curse ----
  'sanity.onset.title': '🕯 The Sanity Curse',
  'sanity.onset.body': 'You have walked deeper than a mortal mind can bear. The whispers begin gnawing at the edge of thought... From this day, spill blood in the arena at least once every 24 hours, or the curse will harvest your Hearts one by one.',
  'sanity.tax.title': 'The Curse Collects',
  'sanity.tax.body': 'You avoided the arena too long — the curse has harvested {n} Heart(s).',
  'sanity.tax.died': 'The curse harvested {n} Heart(s)... including your last. Your journey ends in madness.',
  'sanity.fed': '🕯 The curse has tasted blood — your sanity holds for another 24 hours.',
  'sanity.hud.tip': 'Time left before the curse collects — fight one arena bout to reset it.',

  // ---- v11 Secret classes ----
  'class.cursebreaker': 'Cursebreaker', 'class.cursebreaker.tag': 'The hand that devours what others dare not touch',
  'class.cursebreaker.hint': 'Cleanse that which is cursed three times... and the curse will remember your hand.',
  'class.ashenknight': 'Ashen Knight', 'class.ashenknight.tag': 'Armor forged from the wreckage of the deep lands',
  'class.ashenknight.hint': 'A Lord of the sixth danger... fell him, and wear his ashes.',
  'class.gravewarden': 'Gravewarden', 'class.gravewarden.tag': 'One who drinks from their own grave',
  'class.gravewarden.hint': 'When your first tombstone bears an heir, the Warden opens the gate.',
  'class.moonveil': 'Moonveil', 'class.moonveil.tag': 'A blade the moonlight refuses to touch',
  'class.moonveil.hint': 'She peddles hearts beneath the mist... buy one, just once.',

  // ---- v11 Unique classes ----
  'class.eclipsemonarch': 'Eclipse Monarch', 'class.eclipsemonarch.tag': 'Crowned the moment the sun dies',
  'class.hollowsaint': 'Hollow Saint', 'class.hollowsaint.tag': 'Faith worn down to a shell — and the shell will not break',
  'class.plagueempress': 'Plague Empress', 'class.plagueempress.tag': 'Every breath she takes is an epidemic',
  'class.voidreaver': 'Void Reaver', 'class.voidreaver.tag': 'A scythe that harvests emptiness itself',
  'class.dawnbreaker': 'Dawnbreaker', 'class.dawnbreaker.tag': 'A hundred arena bouts forged him',
  'class.gravemarshal': 'Grave Marshal', 'class.gravemarshal.tag': 'His army never sleeps, for it is already dead',
  'class.runeprophet': 'Rune Prophet', 'class.runeprophet.tag': 'Reader of the letters the world tried to erase',
  'class.nightsovereign': 'Night Sovereign', 'class.nightsovereign.tag': 'His kingdom begins when you close your eyes',
  'class.ashqueen': 'Ash Queen', 'class.ashqueen.tag': 'Every kingdom she loved burned to cinders',
  'class.worldsedge': "World's Edge", 'class.worldsedge.tag': 'The one who walked farther than any map could follow',

  // ---- v11 signatures ----
  'sig.sunder': 'Curse Sunder', 'sig.sunder.desc': 'Carve a cursed wound that festers over time, and rouse your own attack.',
  'sig.cinderwall': 'Cinderwall', 'sig.cinderwall.desc': 'Wreathe armor and blade in burning ash, mending a few wounds.',
  'sig.gravedraw': 'Grave Draw', 'sig.gravedraw.desc': 'A devouring strike — the enemy\u2019s wound is your medicine.',
  'sig.lunareclipse': 'Lunar Eclipse', 'sig.lunareclipse.desc': 'Vanish into the moon\u2019s shadow and return with a keener edge.',
  'sig.totaleclipse': 'Total Eclipse', 'sig.totaleclipse.desc': 'Your next strike is a guaranteed critical, and your attack soars.',
  'sig.hollowgrace': 'Hollow Grace', 'sig.hollowgrace.desc': 'Restore massive HP, bolstering armor and lifesteal.',
  'sig.blightbloom': 'Blightbloom', 'sig.blightbloom.desc': 'Sow the deadliest plague the world has known, festering four beats.',
  'sig.voidstep': 'Voidstep', 'sig.voidstep.desc': 'Step into nothing — your next strike cannot miss and must crit.',
  'sig.firstlight': 'First Light', 'sig.firstlight.desc': 'Mend wounds and rouse both attack and speed at once.',
  'sig.legionrise': 'Legion Rise', 'sig.legionrise.desc': 'Drain the enemy to feed your legion, raising your guard.',
  'sig.runecascade': 'Rune Cascade', 'sig.runecascade.desc': 'Arcana surges, and burning runes gnaw at the enemy.',
  'sig.kingdomofnight': 'Kingdom of Night', 'sig.kingdomofnight.desc': 'Melt into darkness, leaving a gnawing dark behind.',
  'sig.pyrelight': 'Pyrelight', 'sig.pyrelight.desc': 'Every strike ignites, and your edge burns ever hotter.',
  'sig.horizonfall': 'Horizonfall', 'sig.horizonfall.desc': 'A guaranteed critical, rousing sword and shield together.',

  // ---- v11 hidden skills ----
  'hidden.hexeater': 'Hexeater', 'hidden.hexeater.desc': 'Your poisons and burns strike twice as hard.',
  'hidden.emberheart': 'Emberheart', 'hidden.emberheart.desc': 'At low HP, your armor hardens immensely.',
  'hidden.tombpact': 'Tomb Pact', 'hidden.tombpact.desc': 'Once per battle — refuse death and rise with nearly half your blood.',
  'hidden.silvershadow': 'Silver Shadow', 'hidden.silvershadow.desc': 'Begin every battle vanished in moonshadow.',
  'hidden.crownofash': 'Crown of Ash', 'hidden.crownofash.desc': 'Dying enemies take vastly more damage.',
  'hidden.emptyvessel': 'Empty Vessel', 'hidden.emptyvessel.desc': 'Once per battle — the hollowness refuses death, restoring massive HP.',
  'hidden.thousandsores': 'A Thousand Sores', 'hidden.thousandsores.desc': 'Your plagues fester half again as fiercely.',
  'hidden.edgeofnothing': 'Edge of Nothing', 'hidden.edgeofnothing.desc': 'A high chance to strike twice in one motion.',
  'hidden.oathofdawn': 'Oath of Dawn', 'hidden.oathofdawn.desc': 'At low HP, your attack blazes like first light.',
  'hidden.deadmensoath': "Dead Men's Oath", 'hidden.deadmensoath.desc': 'At low HP, the dead double your guard.',
  'hidden.openedeye': 'The Opened Eye', 'hidden.openedeye.desc': 'Begin every battle with a full arcana gauge.',
  'hidden.throneunseen': 'Throne Unseen', 'hidden.throneunseen.desc': 'Begin every battle vanished in darkness.',
  'hidden.cinderveil': 'Cinderveil', 'hidden.cinderveil.desc': 'Your flames consume far more fiercely.',
  'hidden.lastcartographer': 'The Last Cartographer', 'hidden.lastcartographer.desc': 'A chance to strike again — the world\u2019s edge taught you never to stop.',
});


// ============================ v12 — Balance & Market ============================
Object.assign(TH, {
  'capital.market': '🛒 ตลาดหลวง',
  'result.trivial': 'ศัตรูที่นี่อ่อนแอเกินกว่าจะสอนอะไรเจ้าได้อีกแล้ว — ไม่ได้รับค่าประสบการณ์',
});
Object.assign(EN, {
  'capital.market': '🛒 The Royal Market',
  'result.trivial': 'The foes here are too feeble to teach you anything now — no experience gained.',
});
