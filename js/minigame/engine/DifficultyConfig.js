export function getDifficultyLevel(runTimeSeconds = 0, playerLevel = 1) {
  const t = Math.min(1, runTimeSeconds / 1200);
  const curve = t * t * (3 - 2 * t);
  // Empurrão inicial: a curva suave sozinha deixa os primeiros ~2 min “vazios”
  const opening = Math.min(1.15, runTimeSeconds / 55);
  const earlyRamp = 5.4 * curve;
  const latePressure = 2.1 * Math.pow(t, 2.2);
  const levelCurve = (playerLevel - 1) * 0.12;
  return Math.min(10, 0.35 + opening + earlyRamp + latePressure + levelCurve);
}

export function getSpawnInterval(difficultyLevel) {
  return Math.max(0.55, 2.6 - difficultyLevel * 0.28);
}

export function getEnemySpawnCount(difficultyLevel) {
  if (difficultyLevel < 0.7) return 2;
  if (difficultyLevel < 1.6) return 3;
  if (difficultyLevel < 3.2) return 4;
  if (difficultyLevel < 5.2) return 5;
  if (difficultyLevel < 7.2) return 7;
  return 9;
}

export function getEnemyStats(difficultyLevel, playerLevel = 1) {
  return {
    speed: 4.2 + difficultyLevel * 2.8 + playerLevel * 0.7,
    hp: Math.max(1, Math.round(1.0 + difficultyLevel * 4.8 + playerLevel * 1.5)),
    damage: 1.0 + difficultyLevel * 3.3 + playerLevel * 1.0,
  };
}
