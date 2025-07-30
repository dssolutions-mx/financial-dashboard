// Simple test for hierarchy detection logic
console.log('Testing hierarchy detection with actual dataset accounts...')

// Test accounts from the actual dataset (including new parent accounts)
const testAccounts = [
  '5000-0000-000-000', // Level 1 - main total
  '5000-2000-000-000', // Level 2 - parent for 2000 family
  '5000-3000-000-000', // Level 2 - parent for 3000 family
  '5000-4000-000-000', // Level 2 - parent for 4000 family
  '5000-5000-000-000', // Level 2 - parent for 5000 family
  '5000-8000-000-000', // Level 2 - parent for 8000 family
  '5000-9000-000-000', // Level 2 - parent for 9000 family
  '5000-2001-000-000', // Level 3 - should be child of 5000-2000-000-000
  '5000-2002-000-000', // Level 3 - should be child of 5000-2000-000-000
  '5000-1001-001-001', // Level 4 - detail
  '5000-1002-001-001', // Level 4 - detail
  '5000-1003-001-001', // Level 4 - detail
  '5000-1004-100-000', // Level 3 - subcategory
  '5000-1000-002-003'  // Level 4 - detail
]

console.log('Test accounts:', testAccounts)

// Expected hierarchy:
// - 5000-0000-000-000 (Level 1) - main total
//   - 5000-2000-000-000 (Level 2) - parent for 2000 family
//     - 5000-2001-001-001 (Level 4) - detail (if exists)
//   - 5000-3000-000-000 (Level 2) - parent for 3000 family
//   - 5000-4000-000-000 (Level 2) - parent for 4000 family
//   - 5000-5000-000-000 (Level 2) - parent for 5000 family
//   - 5000-8000-000-000 (Level 2) - parent for 8000 family
//   - 5000-9000-000-000 (Level 2) - parent for 9000 family
//   - 5000-1001-001-001 (Level 4) - detail (should be under virtual parent)
//   - 5000-1002-001-001 (Level 4) - detail (should be under virtual parent)
//   - 5000-1003-001-001 (Level 4) - detail (should be under virtual parent)
//   - 5000-1004-100-000 (Level 3) - subcategory (should be under virtual parent)
//   - 5000-1000-002-003 (Level 4) - detail (should be under virtual parent)

console.log('Expected behavior:')
console.log('- Level 1: 5000-0000-000-000 (main total)')
console.log('- Level 2: Specific parent accounts (2000, 3000, 4000, 5000, 8000, 9000)')
console.log('- Level 3 & 4: Detail accounts grouped under appropriate parents')

// Test the level assignment logic
testAccounts.forEach(account => {
  const parts = account.split('-')
  const nivel1 = parts[0]
  const nivel2 = parts[1]
  const nivel3 = parts[2]
  const nivel4 = parts[3]
  
  console.log(`\nAccount: ${account}`)
  console.log(`  Parts: ${nivel1}-${nivel2}-${nivel3}-${nivel4}`)
  
  // Determine level based on the logic
  let level = 4 // default
  if (nivel2 === '0000' && nivel3 === '000' && nivel4 === '000') {
    level = 1 // main total
  } else if (nivel3 === '000' && nivel4 === '000' && nivel2 !== '0000') {
    level = 2 // family root
  } else if (nivel4 === '000' && nivel3 !== '000') {
    level = 3 // subcategory
  }
  
  console.log(`  Level: ${level}`)
  
  // Determine expected parent
  let expectedParent = null
  if (level === 4) {
    expectedParent = `${nivel1}-${nivel2}-${nivel3}-000` // Level 3 parent
  } else if (level === 3) {
    expectedParent = `${nivel1}-${nivel2}-000-000` // Level 2 parent
  } else if (level === 2) {
    expectedParent = `${nivel1}-0000-000-000` // Level 1 parent
  }
  
  console.log(`  Expected parent: ${expectedParent}`)
  console.log(`  Parent exists in test set: ${testAccounts.includes(expectedParent)}`)
}) 