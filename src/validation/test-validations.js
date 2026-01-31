import {
  MATCH_STATUS,
  listMatchesQuerySchema,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema,
} from './matches.js';

console.log('🧪 Testing Zod Validation Schemas\n');

// Test 1: MATCH_STATUS constants
console.log('1️⃣ Testing MATCH_STATUS constants:');
console.log('✅ SCHEDULED:', MATCH_STATUS.SCHEDULED);
console.log('✅ LIVE:', MATCH_STATUS.LIVE);
console.log('✅ FINISHED:', MATCH_STATUS.FINISHED);
console.log();

// Test 2: listMatchesQuerySchema
console.log('2️⃣ Testing listMatchesQuerySchema:');
try {
  const valid1 = listMatchesQuerySchema.parse({ limit: 50 });
  console.log('✅ Valid with limit 50:', valid1);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

try {
  const valid2 = listMatchesQuerySchema.parse({});
  console.log('✅ Valid without limit:', valid2);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

try {
  const invalid = listMatchesQuerySchema.parse({ limit: 150 });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log(
    '❌ Expected error - limit exceeds 100:',
    error.issues[0].message,
  );
}

try {
  const invalid = listMatchesQuerySchema.parse({ limit: -5 });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log('❌ Expected error - negative limit:', error.issues[0].message);
}
console.log();

// Test 3: matchIdParamSchema
console.log('3️⃣ Testing matchIdParamSchema:');
try {
  const valid = matchIdParamSchema.parse({ id: '123' });
  console.log('✅ Valid ID (coerced from string):', valid);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

try {
  const invalid = matchIdParamSchema.parse({ id: 0 });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log(
    '❌ Expected error - ID must be positive:',
    error.issues[0].message,
  );
}

try {
  const invalid = matchIdParamSchema.parse({});
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log('❌ Expected error - ID is required:', error.issues[0].message);
}
console.log();

// Test 4: createMatchSchema
console.log('4️⃣ Testing createMatchSchema:');
const validStartTime = new Date('2026-02-15T18:00:00.000Z').toISOString();
const validEndTime = new Date('2026-02-15T20:00:00.000Z').toISOString();

try {
  const valid = createMatchSchema.parse({
    sport: 'Football',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    startTime: validStartTime,
    endTime: validEndTime,
    homeScore: 0,
    awayScore: 0,
  });
  console.log('✅ Valid match created:', valid);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

try {
  const invalid = createMatchSchema.parse({
    sport: '',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    startTime: validStartTime,
    endTime: validEndTime,
  });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log('❌ Expected error - empty sport:', error.issues[0].message);
}

try {
  const invalid = createMatchSchema.parse({
    sport: 'Football',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    startTime: '2026-02-15 18:00:00', // Not ISO format
    endTime: validEndTime,
  });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log('❌ Expected error - invalid ISO date:', error.issues[0].message);
}

try {
  const invalid = createMatchSchema.parse({
    sport: 'Football',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    startTime: validEndTime, // End before start
    endTime: validStartTime,
  });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log(
    '❌ Expected error - endTime before startTime:',
    error.issues[0].message,
  );
}

try {
  const validOptionalScores = createMatchSchema.parse({
    sport: 'Basketball',
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    startTime: validStartTime,
    endTime: validEndTime,
  });
  console.log('✅ Valid without scores:', validOptionalScores);
} catch (error) {
  console.log('❌ Error:', error.issues);
}
console.log();

// Test 5: updateScoreSchema
console.log('5️⃣ Testing updateScoreSchema:');
try {
  const valid = updateScoreSchema.parse({ homeScore: '2', awayScore: '1' });
  console.log('✅ Valid scores (coerced from strings):', valid);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

try {
  const invalid = updateScoreSchema.parse({ homeScore: -1, awayScore: 2 });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log('❌ Expected error - negative score:', error.issues[0].message);
}

try {
  const invalid = updateScoreSchema.parse({ homeScore: 2 });
  console.log('✅ Parsed:', invalid);
} catch (error) {
  console.log(
    '❌ Expected error - missing awayScore:',
    error.issues[0].message,
  );
}
console.log();

console.log('🎉 Validation tests completed!');
