import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import {db} from "../../../config/firebaseConfig"
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

// Map raw defect types to user-friendly labels
const mapDefectTypeToLabel = (defectType) => {
  const defectMap = {
    'CRACKS': 'cracks',
    'BLOOD_SPOTS': 'bloodSpots',
    'DIRTY': 'dirty',
    'GOOD': 'good',
    'OTHER': 'other'
  }
  return defectMap[defectType] || 'other'
}

// Get daily defect data for linked machines
export const getMachineLinkedDailyDefectData = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for daily defect data")
      return []
    }

    // Get data for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)

    const defectLogsQuery = query(
      collection(db, "defect_logs"),
      where("machine_id", "in", linkedMachines),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "asc")
    )

    const snapshot = await getDocs(defectLogsQuery)
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("Daily defect data logs:", logs.length)

    // Group by day and defect type
    const dailyData = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize all days with 0 for all defect types
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = dayNames[date.getDay()]
      dailyData[dayName] = {
        cracks: 0,
        good: 0,
        dirty: 0,
        bloodSpots: 0,
        other: 0
      }
    }

    // Count defects by type for each day
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const dayName = dayNames[logDate.getDay()]
      const defectLabel = mapDefectTypeToLabel(log.defect_type)
      
      if (dailyData[dayName] && dailyData[dayName].hasOwnProperty(defectLabel)) {
        dailyData[dayName][defectLabel]++
      }
    })

    // Convert to array format
    const result = dayNames.map(day => ({
      day,
      ...dailyData[day]
    }))

    console.log("Daily defect data result:", result)
    return result
  } catch (error) {
    console.error("Error getting daily defect data:", error)
    return []
  }
}

// Get monthly defect data for linked machines
export const getMachineLinkedMonthlyDefectData = async () => {
  try {
    const linkedMachines = await getUserLinkedMachines()
    
    if (linkedMachines.length === 0) {
      console.log("No linked machines found for monthly defect data")
      return []
    }

    // Get data for the last 6 months
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 6)

    const defectLogsQuery = query(
      collection(db, "defect_logs"),
      where("machine_id", "in", linkedMachines),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "asc")
    )

    const snapshot = await getDocs(defectLogsQuery)
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("Monthly defect data logs:", logs.length)

    // Group by month and defect type
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months with 0 for all defect types
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthName = monthNames[date.getMonth()]
      monthlyData[monthName] = {
        cracks: 0,
        good: 0,
        dirty: 0,
        bloodSpots: 0,
        other: 0
      }
    }

    // Count defects by type for each month
    logs.forEach(log => {
      const logDate = log.timestamp.toDate()
      const monthName = monthNames[logDate.getMonth()]
      const defectLabel = mapDefectTypeToLabel(log.defect_type)
      
      if (monthlyData[monthName] && monthlyData[monthName].hasOwnProperty(defectLabel)) {
        monthlyData[monthName][defectLabel]++
      }
    })

    // Convert to array format
    const result = Object.keys(monthlyData).map(month => ({
      month,
      ...monthlyData[month]
    }))

    console.log("Monthly defect data result:", result)
    return result
  } catch (error) {
    console.error("Error getting monthly defect data:", error)
    return []
  }
}