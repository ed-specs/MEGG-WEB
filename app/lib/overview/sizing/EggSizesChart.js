import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"
import { getCurrentUser } from "../../../utils/auth-utils"

// Get user's linked machines
export const getUserLinkedMachines = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log("No authenticated user found")
      return []
    }

    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
    
    if (userDoc.empty) {
      console.log("No user document found")
      return []
    }

    const userData = userDoc.docs[0].data()
    const linkedMachines = userData.linked_machines || []
    
    console.log("User linked machines:", linkedMachines)
    return linkedMachines
  } catch (error) {
    console.error("Error getting user linked machines:", error)
    return []
  }
}

// Map raw size values to user-friendly labels
const mapSizeToLabel = (size) => {
  const sizeMap = {
    'TOO_SMALL': 'small',
    'SMALL': 'small',
    'MEDIUM': 'medium',
    'LARGE': 'large',
    'XL': 'large',
    'TOO_LARGE': 'large',
    'JUMBO': 'large',
    'DEFECT': 'defect'
  }
  return sizeMap[size] || 'medium'
}

// Get daily egg sizes data for linked machines
export const getMachineLinkedDailyEggSizes = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for daily egg sizes")
      return []
    }

    // Get data for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const weightLogsQuery = query(
      collection(db, "weight_logs"),
      where("machine_id", "in", linkedMachines),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "asc")
    )

    const snapshot = await getDocs(weightLogsQuery)
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("Daily egg sizes logs:", logs.length)

    // Group by day and count sizes
    const dailyData = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize all days with 0 counts for each size
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = dayNames[date.getDay()]
      dailyData[dayName] = {
        large: 0,
        medium: 0,
        small: 0,
        defect: 0
      }
    }

    // Count eggs for each day and size
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const dayName = dayNames[logDate.getDay()]
      const sizeLabel = mapSizeToLabel(log.size)
      
      if (dailyData[dayName] && dailyData[dayName].hasOwnProperty(sizeLabel)) {
        dailyData[dayName][sizeLabel]++
      }
    })

    // Convert to array format
    const result = dayNames.map(day => ({
      day,
      large: dailyData[day]?.large || 0,
      medium: dailyData[day]?.medium || 0,
      small: dailyData[day]?.small || 0,
      defect: dailyData[day]?.defect || 0
    }))

    console.log("Daily egg sizes result:", result)
    return result
  } catch (error) {
    console.error("Error getting daily egg sizes:", error)
    return []
  }
}

// Get monthly egg sizes data for linked machines
export const getMachineLinkedMonthlyEggSizes = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for monthly egg sizes")
      return []
    }

    // Get data for the last 6 months
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 6)

    const weightLogsQuery = query(
      collection(db, "weight_logs"),
      where("machine_id", "in", linkedMachines),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "asc")
    )

    const snapshot = await getDocs(weightLogsQuery)
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("Monthly egg sizes logs:", logs.length)

    // Group by month and count sizes
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months with 0 counts for each size
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthName = monthNames[date.getMonth()]
      monthlyData[monthName] = {
        large: 0,
        medium: 0,
        small: 0,
        defect: 0
      }
    }

    // Count eggs for each month and size
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const monthName = monthNames[logDate.getMonth()]
      const sizeLabel = mapSizeToLabel(log.size)
      
      if (monthlyData[monthName] && monthlyData[monthName].hasOwnProperty(sizeLabel)) {
        monthlyData[monthName][sizeLabel]++
      }
    })

    // Convert to array format
    const result = Object.keys(monthlyData).map(month => ({
      month,
      large: monthlyData[month]?.large || 0,
      medium: monthlyData[month]?.medium || 0,
      small: monthlyData[month]?.small || 0,
      defect: monthlyData[month]?.defect || 0
    }))

    console.log("Monthly egg sizes result:", result)
    return result
  } catch (error) {
    console.error("Error getting monthly egg sizes:", error)
    return []
  }
}

