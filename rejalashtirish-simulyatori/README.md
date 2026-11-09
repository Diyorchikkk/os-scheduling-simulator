# Protsessorni rejalashtirish simulyatori

Operatsion tizimlar fani uchun veb-dastur: **Priority** (preemptive / non-preemptive)
va **Round Robin** algoritmlarini qadamma-qadam ko'rsatadi va nima uchun shunday
qaror qabul qilinganini o'zbek tilida tushuntiradi.

Muallif: Mamasoliyev Diyorbek, SRM002-2

## VS Code'da ochish

1. Arxivni oching (zip ustiga ikki marta bosing) — `rejalashtirish-simulyatori` papkasi chiqadi.
2. VS Code → **File → Open Folder…** → shu papkani tanlang.
3. Ishga tushirishning ikki yo'li:
   - **Oddiy:** `index.html` faylini Finder'da ikki marta bosing — brauzerda ochiladi.
   - **Live Server bilan:** VS Code'da *Live Server* kengaytmasini o'rnating
     (Extensions → "Live Server"), keyin `index.html` ustida o'ng tugma → **Open with Live Server**.
     Kodni o'zgartirsangiz, sahifa o'zi yangilanadi.

Server, `npm install` yoki internet kerak emas.

## Qanday foydalaniladi

1. Chap tomonda algoritmni tanlang va jarayonlar jadvalini (AT, BT) kiriting.
   Tayyor 23- va 25-variant jadvallari tugmalar bilan qo'yiladi.
2. **Keyingi ▶** (yoki klaviaturada →) bossangiz, Gantt diagrammasiga navbatdagi
   bo'lak qo'shiladi, o'ng tomonda esa shu qadam nega shunday bo'lgani yoziladi.
3. **⏯ Avto** o'zi aylantirib ko'rsatadi, **⏭ Oxiriga** natijani darhol chiqaradi.
4. Oxirida CT, TAT, WT jadvali va AWT hisob-kitobi formulasi bilan ko'rinadi.
5. Pastda uchala algoritm natijasi taqqoslanadi.
6. Simulyatsiya tugagach **⬇ Natijani Excel'ga yuklash** tugmasi chiqadi. Bossangiz oyna ochiladi:
   Priority preemptive / non-preemptive / Round Robin — bittasini, ikkitasini yoki uchalasini tanlaysiz.
   Har usul alohida varaqqa yoziladi (2+ tanlansa, qo'shimcha «Taqqoslash» varag'i ham bo'ladi).
   Varaqda: CT/TAT/WT jadvali (formulalar bilan), AWT/ATAT, rangli Gantt, qadamma-qadam tushuntirish.

Klaviatura: `→` keyingi, `←` orqaga, `Probel` avto.

## Fayllar

| Fayl | Nima qiladi |
|---|---|
| `index.html` | Sahifaning tuzilishi (matnlar, jadvallar, tugmalar) |
| `style.css` | Ko'rinish: ranglar, joylashuv, telefonga moslash |
| `engine.js` | **Algoritmlar** — Priority va Round Robin hisobi (sahifaga bog'liq emas) |
| `export.js` | Excel (.xlsx) fayl yasash (ExcelJS bilan) |
| `lib/exceljs.min.js` | ExcelJS kutubxonasi (internet kerak emas) |
| `app.js` | Sahifa mantig'i: kiritilganni olib `engine.js` ga beradi, natijani chizadi |

## Algoritmlar qanday ishlaydi (engine.js)

**Priority (preemptive).** Vaqt 1 birlikdan oshib boradi. Har birlikda kelgan va tugamagan
jarayonlar ichidan kaliti eng kichigi tanlanadi. Kalit — qolgan vaqt (SRTF) yoki
priority ustuni. Kalitlar teng bo'lsa, oldin kelgani (AT kichik) tanlanadi.
Tanlov o'zgarganda yangi segment boshlanadi.

**Priority (non-preemptive).** Xuddi shunday, lekin jarayon boshlagach tugamaguncha ishlaydi:
tanlov faqat protsessor bo'shaganda qilinadi.

**Round Robin.** Tayyor navbat massivda saqlanadi. Boshidagi jarayon `min(TQ, qolgan)`
vaqt ishlaydi. Shu vaqt ichida kelganlar navbatga qo'shiladi, **keyin** tugamagan jarayon
navbat oxiriga qaytadi — shuning uchun yangi kelganlar to'xtatilgan jarayondan oldin turadi.

Formulalar: `TAT = CT − AT`, `WT = TAT − BT`, `AWT = ΣWT / n`.

## Tekshirilgan natijalar (23-variant)

| Algoritm | AWT |
|---|---|
| Priority preemptive, qolgan vaqt bo'yicha | 7,8 |
| Priority preemptive, priority = BT | 8,0 |
| Priority non-preemptive, priority = BT | 12,6 |
| Round Robin, TQ = 4 | 15,6 |

## Ustozga ko'rsatish uchun tartib

1. Jadvalni ko'rsating, algoritmni tanlang (masalan Round Robin, TQ = 4).
2. «Keyingi ▶» bilan 3–4 qadam bosing va har qadamdagi tushuntirishni o'qing.
3. «Oxiriga» bosib CT/TAT/WT jadvali va AWT formulasini ko'rsating.
4. Taqqoslash bo'limida algoritmlar farqini ayting.
5. Kodni so'rasa — `engine.js` ni oching (algoritmlar shu yerda, 150 qatorcha).
