// i18n.js
// ---------------------------------------------------------------------------
// Localization. All player-facing text lives here as Thai strings keyed by
// stable English ids — code identifiers stay English, UI is Thai. t(key,
// params) interpolates {placeholders}. Adding another language later means
// adding a second table and a setLanguage() switch; no other file changes.
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

let table = TH;

/** Translate a key, interpolating {param} placeholders. Falls back to the key itself. */
export function t(key, params = null) {
  let s = table[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

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
