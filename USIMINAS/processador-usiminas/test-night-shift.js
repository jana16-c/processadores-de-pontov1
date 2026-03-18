// Test para validar o ajuste de turnos noturnos
// Simula o caso do dia 10/04/2018 (Terça): Turno 22:40-06:50

import { adjustShifts } from './src/domain/adjustShifts.js';
import { toMin } from './src/utilitários/time.js';

console.log("=== TESTE: Ajuste de Turno Noturno (10/04/2018) ===\n");

const timeline = [
  {
    data: new Date(2018, 3, 10), // 10/04/2018 (Terça)
    times: ["02:58", "03:59", "06:52", "22:35"], // Batidas sem ordem
    isOffDay: false,
    rawLine: "10 Ter REV015A 22:40 06:50 02:58 03:59 06:52 22:35",
    plannedStart: "22:40",  // Turno começa às 22:40
    plannedEnd: "06:50"     // Turno termina às 06:50
  },
  {
    data: new Date(2018, 3, 11), // 11/04/2018 (Quarta)
    times: ["02:57", "03:58", "06:45", "22:36"],
    isOffDay: false,
    rawLine: "11 Qua REV015A 22:40 06:50 02:57 03:58 06:45 22:36",
    plannedStart: "22:40",
    plannedEnd: "06:50"
  },
  {
    data: new Date(2018, 3, 12), // 12/04/2018 (Quinta)
    times: ["03:56", "05:40", "06:45"],
    isOffDay: false,
    rawLine: "12 Qui REV015A DSR 03:56 05:40 06:45",
    plannedStart: null,
    plannedEnd: null
  }
];

console.log("ANTES:");
console.log(`Dia 10: ${timeline[0].times.join(", ")} (${timeline[0].times.length} batidas)`);
console.log(`Dia 11: ${timeline[1].times.join(", ")} (${timeline[1].times.length} batidas)`);
console.log(`Dia 12: ${timeline[2].times.join(", ")} (${timeline[2].times.length} batidas)`);

console.log("\nExecutando adjustShifts()...\n");
adjustShifts(timeline);

console.log("DEPOIS:");
console.log(`Dia 10: ${timeline[0].times.join(", ")} (${timeline[0].times.length} batidas)`);
console.log(`Dia 11: ${timeline[1].times.join(", ")} (${timeline[1].times.length} batidas)`);
console.log(`Dia 12: ${timeline[2].times.join(", ")} (${timeline[2].times.length} batidas)`);

console.log("\n=== ANÁLISE ===");
console.log("✓ TURNO NOTURNO DETECTADO: 22:40 > 06:50? SIM");
console.log("  Horários de madrugada (< 12:00) foram movidos para o dia seguinte com +24h\n");

console.log("Para o dia 10:");
timeline[0].times.forEach(t => {
  const min = toMin(t);
  const hora = Math.floor(min / 60);
  console.log(`  ${t} = ${hora}h ${min % 60}min`);
});

console.log("\nPara o dia 11:");
timeline[1].times.forEach(t => {
  const min = toMin(t);
  const hora = Math.floor(min / 60);
  console.log(`  ${t} = ${hora}h ${min % 60}min (se hora > 24, é +madrugada do dia 12)`);
});

console.log("\n=== ESPERADO ===");
console.log("Dia 10 deveria ter: 22:35 (única batida >= 12:00)");
console.log("Dia 11 deveria ter: 26:58, 27:59, 30:52 (madrugadas de 10) + 22:36");
console.log("Dia 12 deveria ter: 26:57, 27:58, 30:45 (madrugadas de 11) + 03:56, 05:40, 06:45");
