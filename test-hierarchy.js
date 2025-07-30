// Test file for hierarchy detection logic
const { ImprovedHierarchyDetector } = require('./lib/services/enhanced-hierarchy-detector.service.ts');

// Create test instance
const detector = new ImprovedHierarchyDetector();

// Test 1: 5000-200x sequence
console.log('=== TEST 1: 5000-200x SEQUENCE ===');
const testAccounts1 = ['5000-0000-000-000', '5000-2000-000-000', '5000-2001-000-000', '5000-2002-000-000'];
detector.testNumericSequenceDetection(testAccounts1);

// Test 2: Missing intermediate parent
console.log('\n=== TEST 2: MISSING INTERMEDIATE PARENT ===');
const testAccounts2 = ['5000-0000-000-000', '5000-1000-002-000'];
detector.testNumericSequenceDetection(testAccounts2);

// Test 3: Full hierarchy test
console.log('\n=== TEST 3: FULL HIERARCHY TEST ===');
const fullTestAccounts = [
  '5000-0000-000-000',
  '5000-2000-000-000', 
  '5000-2001-000-000',
  '5000-2002-000-000',
  '5000-1000-002-000'
];

console.log('Testing full hierarchy with accounts:', fullTestAccounts);
fullTestAccounts.forEach(account => {
  console.log(`\n--- Testing account: ${account} ---`);
  const sequenceResult = detector.analyzeNumericSequence(account, new Set(fullTestAccounts));
  console.log('Sequence result:', sequenceResult);
  
  const familyAnalysis = detector.analyzeByFamily(account, new Set(fullTestAccounts));
  console.log('Family analysis:', familyAnalysis);
  
  const levelResult = detector.determineLevel(account, new Set(fullTestAccounts));
  console.log('Level result:', levelResult);
  
  const parentResult = detector.determineParent(account, new Set(fullTestAccounts));
  console.log('Parent result:', parentResult);
}); 
 
 