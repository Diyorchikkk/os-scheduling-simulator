# Round Robin algoritmi yordamida o'rtacha kutish vaqtini topish
# Muallif: Mamasoliyev Diyorbek, SRM002-2

from collections import deque

# --- 1. Kirish ma'lumotlari ---
tartib_raqam = 23
TQ = tartib_raqam % 3 + 2          # 23 % 3 + 2 = 2 + 2 = 4

jarayonlar = [
    # (nomi, kelish vaqti (AT), bajarilish vaqti (BT))
    ("P1", 0, 14),
    ("P2", 5, 8),
    ("P3", 4, 2),
    ("P4", 3, 3),
    ("P5", 1, 9),
]

n = len(jarayonlar)
nomi = [p[0] for p in jarayonlar]
AT = [p[1] for p in jarayonlar]
BT = [p[2] for p in jarayonlar]

qolgan = BT[:]          # har bir jarayonning qolgan vaqti
CT = [0] * n            # tugash vaqti (Completion Time)
gantt = []              # (jarayon, boshlanish, tugash)

# --- 2. Round Robin simulyatsiyasi ---
# Jarayonlarni kelish vaqti bo'yicha tartiblaymiz
tartib = sorted(range(n), key=lambda i: AT[i])
navbat = deque()
vaqt = 0
k = 0                   # tartib ro'yxatidagi keyingi jarayon indeksi
tugaganlar = 0

def kelganlarni_qosh(t):
    """t vaqtgacha kelgan jarayonlarni navbatga qo'shadi."""
    global k
    while k < n and AT[tartib[k]] <= t:
        navbat.append(tartib[k])
        k += 1

kelganlarni_qosh(vaqt)

while tugaganlar < n:
    if not navbat:
        # Protsessor bo'sh - keyingi jarayon kelishini kutamiz
        vaqt = AT[tartib[k]]
        kelganlarni_qosh(vaqt)
        continue

    i = navbat.popleft()
    ishlash = min(TQ, qolgan[i])
    gantt.append((nomi[i], vaqt, vaqt + ishlash))
    vaqt += ishlash
    qolgan[i] -= ishlash

    # Shu kvant davomida kelgan jarayonlar navbatga birinchi qo'shiladi
    kelganlarni_qosh(vaqt)

    if qolgan[i] > 0:
        navbat.append(i)        # tugamagan bo'lsa, navbat oxiriga
    else:
        CT[i] = vaqt
        tugaganlar += 1

# --- 3. Hisoblash ---
TAT = [CT[i] - AT[i] for i in range(n)]    # Turnaround Time = CT - AT
WT = [TAT[i] - BT[i] for i in range(n)]    # Waiting Time = TAT - BT

# --- 4. Natijalarni chiqarish ---
print("=" * 52)
print("   ROUND ROBIN ALGORITMI  (Tartib raqam: %d)" % tartib_raqam)
print("   TQ = %d %% 3 + 2 = %d" % (tartib_raqam, TQ))
print("=" * 52)

print("\nGantt diagrammasi:")
qator1 = "|"
qator2 = "0"
for p, bosh, tug in gantt:
    qator1 += " %s |" % p
    qator2 += " " * (len(" %s |" % p) - len(str(tug))) + str(tug)
print(qator1)
print(qator2)

print("\n%-6s %-5s %-5s %-5s %-5s %-5s" % ("Jarayon", "AT", "BT", "CT", "TAT", "WT"))
print("-" * 40)
for i in range(n):
    print("%-7s %-5d %-5d %-5d %-5d %-5d" % (nomi[i], AT[i], BT[i], CT[i], TAT[i], WT[i]))
print("-" * 40)

print("\nO'rtacha kutish vaqti (AWT)  = %d / %d = %.2f" % (sum(WT), n, sum(WT) / n))
print("O'rtacha aylanish vaqti (ATAT) = %d / %d = %.2f" % (sum(TAT), n, sum(TAT) / n))
