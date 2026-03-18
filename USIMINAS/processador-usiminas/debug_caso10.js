// Debug do caso específico: Dia 10 (Terça) com turno noturno 22:40-06:50
import { toMin, add24ToTime } from './src/utilitários/time.js';
import { isNextCalendarDay } from './src/utilitários/date.js';

// Simulando o que o parser extrairia do dia 10 e dia 11
const timeline = [
  {
    data: new Date(2018, 3, 10), // 10/04/2018 (Terça)
    times: ["02:58", "03:59", "06:52", "22:35"], // 4 batidas (número par)
    rawLine: "10 Ter REV015A 22:40 06:50 02:58 03:59 06:52 22:35"
  },
  {
    data: new Date(2018, 3, 11), // 11/04/2018 (Quarta)
    times: ["02:57", "03:58", "06:45", "22:36"], // 4 batidas
    rawLine: "11 Qua REV015A 22:40 06:50 02:57 03:58 06:45 22:36"
  }
];

console.log("=== SITUAÇÃO ATUAL ===");
console.log("Dia 10 (Terça):", timeline[0].times.join(", "), `(${timeline[0].times.length} batidas - PAR)`);
console.log("Dia 11 (Quarta):", timeline[1].times.join(", "), `(${timeline[1].times.length} batidas - PAR)`);

console.log("\n=== ANÁLISE DO PROBLEMA ===");
console.log("❌ Problema: O dia 10 tem 4 batidas (número PAR)");
console.log("   A função adjustShifts() só atua se dia atual tem ÍMPAR");
console.log("   Como tem PAR, considera o dia 'fechado' e não faz nada");

console.log("\n=== O QUE DEVERIA ACONTECER ===");
console.log("Como é um turno noturno (22:40 - 06:50):");
console.log("- Horários com hora < 12 (madrugada) deveriam estar NO DIA SEGUINTE");
console.log("- Horários com hora >= 12 deveriam estar NO DIA ATUAL");

console.log("\n=== LÓGICA CORRETA ESPERADA ===");
console.log("Dia 10 (noturno 22:40-06:50):");
console.log("  - 22:35 → possível erro/reaquisição ou entrada do turno anterior");
console.log("  - 02:58 (hora < 12) → deveria estar em 11/04 como 26:58");
console.log("  - 03:59 (hora < 12) → deveria estar em 11/04 como 27:59");
console.log("  - 06:52 (hora < 12) → deveria estar em 11/04 como 30:52");
console.log("");
console.log("Dia 11 (noturno 22:40-06:50):");
console.log("  - 02:57 (hora < 12) → deveria estar em 12/04 como 26:57");
console.log("  - 03:58 (hora < 12) → deveria estar em 12/04 como 27:58");
console.log("  - 06:45 (hora < 12) → deveria estar em 12/04 como 30:45");
console.log("  - 22:36 → fica no 11/04 mesmo");

console.log("\n=== VERIFICAÇÃO DE HEURÍSTICA ===");
const today = timeline[0];
const tomorrow = timeline[1];
console.log("Comparando dia 10 vs dia 11:");
for (let i = 0; i < today.times.length; i++) {
  const t = today.times[i];
  const min = toMin(t);
  console.log(`  ${t} = ${min} min, hora=${Math.floor(min/60)}, é madrugada? ${min < 12*60}`);
}
