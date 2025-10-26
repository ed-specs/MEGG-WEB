import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
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

// Get daily total eggs data for linked machines
export const getMachineLinkedDailyTotalEggs = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for daily total eggs")
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

    console.log("Daily total eggs logs:", logs.length)

    // Group by day and count total eggs
    const dailyData = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = dayNames[date.getDay()]
      dailyData[dayName] = 0
    }

    // Count eggs for each day
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const dayName = dayNames[logDate.getDay()]
      dailyData[dayName] = (dailyData[dayName] || 0) + 1
    })

    // Convert to array format
    const result = dayNames.map(day => ({
      day,
      eggs: dailyData[day] || 0
    }))

    console.log("Daily total eggs result:", result)
    return result
  } catch (error) {
    console.error("Error getting daily total eggs:", error)
    return []
  }
}

// Get monthly total eggs data for linked machines
export const getMachineLinkedMonthlyTotalEggs = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for monthly total eggs")
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

    console.log("Monthly total eggs logs:", logs.length)

    // Group by month and count total eggs
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months with 0
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthName = monthNames[date.getMonth()]
      monthlyData[monthName] = 0
    }

    // Count eggs for each month
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const monthName = monthNames[logDate.getMonth()]
      monthlyData[monthName] = (monthlyData[monthName] || 0) + 1
    })

    // Convert to array format
    const result = Object.keys(monthlyData).map(month => ({
      month,
      eggs: monthlyData[month] || 0
    }))

    console.log("Monthly total eggs result:", result)
    return result
  } catch (error) {
    console.error("Error getting monthly total eggs:", error)
    return []
  }
}









