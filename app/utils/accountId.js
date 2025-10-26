/**
 * Generates a unique account ID in the format MEGG-XXXXXX
 * where X is a 6-digit number
 * @returns {string} A formatted account ID
 */
export function generateAccountId() {
    // Generate a 6-digit random number
    const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    
    // Return in MEGG-XXXXXX format
    return `MEGG-${randomNumber}`
  }
  
  /**
   * Validates if an account ID follows the MEGG-XXXXXX format
   * @param {string} accountId - The account ID to validate
   * @returns {boolean} True if valid, false otherwise
   */
  export function validateAccountId(accountId) {
    const regex = /^MEGG-\d{6}$/
    return regex.test(accountId)
  }
  
  /**
   * Checks if an account ID already exists in the database
   * @param {string} accountId - The account ID to check
   * @param {object} db - Firestore database instance
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  export async function checkAccountIdExists(accountId, db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('accountId', '==', accountId))
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (error) {
      console.error('Error checking account ID:', error)
      throw error
    }
  }
  
  /**
   * Generates a unique account ID that doesn't exist in the database
   * @param {object} db - Firestore database instance
   * @returns {Promise<string>} A unique account ID
   */
  export async function generateUniqueAccountId(db) {
    let accountId
    let isUnique = false
    let attempts = 0
    const maxAttempts = 50 // Increased from 10 to 50 for better success rate
  
    while (!isUnique && attempts < maxAttempts) {
      accountId = generateAccountId()
      try {
        const exists = await checkAccountIdExists(accountId, db)
        if (!exists) {
          isUnique = true
        } else {
          console.log(`Account ID ${accountId} already exists, generating new one...`)
        }
      } catch (error) {
        console.error('Error checking account ID uniqueness:', error)
        throw error
      }
      attempts++
    }
  
    if (!isUnique) {
      // Fallback: Use timestamp-based ID to guarantee uniqueness
      const timestamp = Date.now().toString().slice(-6)
      accountId = `MEGG-${timestamp}`
      console.warn(`Using timestamp-based fallback ID: ${accountId}`)
      
      // Double-check the fallback ID
      try {
        const exists = await checkAccountIdExists(accountId, db)
        if (exists) {
          throw new Error('Even timestamp-based fallback ID is not unique. Database may have issues.')
        }
      } catch (error) {
        console.error('Error checking fallback ID:', error)
        throw new Error('Unable to generate unique account ID after all attempts')
      }
    }
  
    return accountId
  }