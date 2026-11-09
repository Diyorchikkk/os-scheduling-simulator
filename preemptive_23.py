# 1-topshiriq: Preemptive usul, tartib raqam 23 (toq)
# Priority sifatida jarayonning QOLGAN vaqti olindi (kichigi birinchi).
# Qolgan vaqtlar teng bo'lsa, oldin kelgan (AT kichik) jarayon tanlanadi.

tartib_raqam = 23

jarayonlar = [
    # (nomi, kelish vaqti AT, bajarilish vaqti BT)
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

qolgan = BT[:]
CT = [0] * n
gantt = []
vaqt = 0
tugaganlar = 0

# Har 1 birlik vaqtda: kelganlar ichidan qolgan vaqti eng kichigini tanlaymiz
while tugaganlar < n:
    tayyor = [i for i in range(n) if AT[i] <= vaqt and qolgan[i] > 0]

    if not tayyor:
        vaqt += 1               # protsessor bo'sh
        continue

    # 1) qolgan vaqt kichigi, 2) teng bo'lsa oldin kelgani
    i = min(tayyor, key=lambda j: (qolgan[j], AT[j]))

    if gantt and gantt[-1][0] == nomi[i] and gantt[-1][2] == vaqt:
        gantt[-1] = (nomi[i], gantt[-1][1], vaqt + 1)
    else:
        gantt.append((nomi[i], vaqt, vaqt + 1))

    qolgan[i] -= 1
    vaqt += 1

    if qolgan[i] == 0:
        CT[i] = vaqt
        tugaganlar += 1

TAT = [CT[i] - AT[i] for i in range(n)]     # TAT = CT - AT
WT = [TAT[i] - BT[i] for i in range(n)]     # WT  = TAT - BT

print("=" * 50)
print("  PREEMPTIVE USUL   Tartib raqam: %d (toq)" % tartib_raqam)
print("=" * 50)

print("\nGantt diagrammasi:")
qator1, qator2 = "|", "0"
for p, bosh, tug in gantt:
    blok = " %s |" % p
    qator1 += blok
    qator2 += " " * (len(blok) - len(str(tug))) + str(tug)
print(qator1)
print(qator2)

print("\n%-8s%-5s%-5s%-5s%-5s%-5s" % ("P id", "AT", "BT", "CT", "TAT", "WT"))
print("-" * 36)
for i in range(n):
    print("%-8s%-5d%-5d%-5d%-5d%-5d" % (nomi[i], AT[i], BT[i], CT[i], TAT[i], WT[i]))
print("-" * 36)

print("\nAWT  = %d / %d = %.2f" % (sum(WT), n, sum(WT) / n))
print("ATAT = %d / %d = %.2f" % (sum(TAT), n, sum(TAT) / n))
