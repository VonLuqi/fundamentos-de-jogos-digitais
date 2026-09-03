export function getDifficultyLevel(runTimeSeconds = 0, playerLevel = 1) {
  const t = Math.min(1, runTimeSeconds / 1200);
  const curve = t * t * (3 - 2 * t);
  const earlyRamp = 6.2 * curve;
  const latePressure = 2.1 * Math.pow(t, 2.2);
  const levelCurve = (playerLevel - 1) * 0.12;
  return Math.min(10, 0.1 + earlyRamp + latePressure + levelCurve);
}

export function getSpawnInterval(difficultyLevel) {
  return Math.max(0.95, 4.8 - difficultyLevel * 0.82);
}

export function getEnemySpawnCount(difficultyLevel) {
  if (difficultyLevel < 0.7) return 1;
  if (difficultyLevel < 2.2) return 2;
  if (difficultyLevel < 4.7) return 3;
  if (difficultyLevel < 6.8) return 5;
  return 6;
}

export function getEnemyStats(difficultyLevel, playerLevel = 1) {
  return {
    speed: 2.3 + difficultyLevel * 3.1 + playerLevel * 0.9,
    hp: Math.max(1, Math.round(1.0 + difficultyLevel * 4.8 + playerLevel * 1.5)),
    damage: 1.0 + difficultyLevel * 3.3 + playerLevel * 1.0,
  };
}
