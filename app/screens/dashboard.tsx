import React, { useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AddTask from "./components/AddTaskComponent";
import TaskList from "./components/task";
import ProgressComponent from "./components/ProgressComponent";
import Sidebar from "./components/Sidebar";

// ─── Design Tokens (shared with other components) ────────────────────────────
const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  accent: "#6366F1",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
};

export default function Dashboard() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Bump this whenever a task is added/edited/completed/deleted so
  // ProgressComponent and TaskList can refetch in sync.
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Life OS</Text>

        {/* Spacer to balance the menu icon and keep title centered */}
        <View style={styles.menuButton} />
      </View>

      {/* Dashboard Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress overview at the top; remounts whenever refreshTrigger changes */}
        <ProgressComponent key={refreshTrigger} />

        {/* Today's task list — sorted High → Medium → Low priority.
            Each card supports Complete, Edit, and Delete actions. */}
        <View style={[styles.section, styles.taskListSection]}>
          <TaskList refreshTrigger={refreshTrigger} onTaskChanged={triggerRefresh} />
        </View>

        {/* Add Task form */}
        <View style={styles.section}>
          <AddTask onTaskAdded={triggerRefresh} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  menuButton: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 16,
  },

  section: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    overflow: "hidden",
  },

  // task.tsx renders its own FlatList with padding/background, so this
  // section only needs a fixed height to render properly inside the
  // outer ScrollView (FlatList can't size itself to its content there).
  taskListSection: {
    height: 420,
  },
});