import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listActivities } from "../activities";

// --- ใหม่: สร้าง Object สำหรับสไตล์ของ Badge แต่ละสถานะเพื่อให้เหมือนในภาพ ---
const STATUS_STYLES = {
  danger:   { backgroundColor: '#fff1f0', color: '#ff4d4f' }, // หมดเวลา
  warning:  { backgroundColor: '#fffbe6', color: '#faad14' }, // กำลังทำ (สมมติ)
  success:  { backgroundColor: '#f6ffed', color: '#52c41a' }, // สมบูรณ์
  normal:   { backgroundColor: '#fafafa', color: '#8c8c8c' }, // ปกติ
};

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfWeekMon(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const nd = new Date(d);
  nd.setDate(d.getDate() + diff);
  return nd;
}

function useWeek(selectedDate) {
  return useMemo(() => {
    const base = startOfWeekMon(new Date(selectedDate));
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push({ date: toDateStr(d), jsDay: d.getDay() });
    }
    return arr;
  }, [selectedDate]);
}

function groupActivities(items) {
  const groups = {
    // --- แก้ไข: เรียงลำดับกลุ่มให้ถูกต้องตามภาพ ---
    morning:   { title: "ตอนเช้า", data: [] },
    afternoon: { title: "ตอนบ่าย", data: [] },
    evening:   { title: "ตอนเย็น", data: [] },
    night:     { title: "ตอนดึก", data: [] },
    allDay:    { title: "กิจกรรมทั้งวัน", data: [] },
    completed: { title: "สมบูรณ์", data: [] },
    expired:   { title: "หมดเวลา", data: [] },
  };

  items.forEach(item => {
    if (item.status === 'success') {
      groups.completed.data.push(item);
      return;
    }
    if (item.status === 'danger') {
      groups.expired.data.push(item);
      return;
    }
    if (item.all_day || !item.time) {
      groups.allDay.data.push(item);
      return;
    }
    
    const hour = parseInt(item.time.slice(0, 2), 10);
    if (hour >= 6 && hour < 12) groups.morning.data.push(item);
    else if (hour >= 12 && hour < 17) groups.afternoon.data.push(item);
    else if (hour >= 17 && hour < 21) groups.evening.data.push(item);
    else groups.night.data.push(item);
  });

  return Object.values(groups).filter(group => group.data.length > 0);
}


export default function ActivitiesScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [items, setItems] = useState([]);
  const week = useWeek(selectedDate);
  const activitySections = useMemo(() => groupActivities(items), [items]);

  const load = useCallback(async () => {
    try {
      const data = await listActivities(selectedDate);
      setItems(data || []);
    } catch {
      Alert.alert("โหลดกิจกรรมไม่สำเร็จ");
    }
  }, [selectedDate]);

  // --- แก้ไข: โหลดข้อมูลเมื่อ focus ที่หน้า และเมื่อ selectedDate เปลี่ยน ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    load();
  }, [load]);

  const headingTH = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    } catch { return selectedDate; }
  }, [selectedDate]);

  const renderDayChip = (dobj) => {
    const isSelected = dobj.date === selectedDate;
    const label = TH_DAYS[dobj.jsDay];
    return (
      <TouchableOpacity
        key={dobj.date}
        onPress={() => setSelectedDate(dobj.date)}
        style={[styles.dayChip, isSelected && styles.dayChipSelected]}
      >
        <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const pill = item.all_day ? "ทั้งวัน" : (item.time ? item.time.slice(0, 5) : "-");
    // --- แก้ไข: ดึงสไตล์ Badge จาก Object ใหม่ ---
    const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.normal;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("ActivityUpdata", { id: item.id })}
        activeOpacity={0.8}
        style={styles.itemContainer}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemTitleBox}>
            <Text numberOfLines={1} style={styles.itemTitleText}>{item.title || "ชื่อ..."}</Text>
          </View>
          <View style={styles.itemTimePill}>
            <Text style={styles.itemTimeText}>{pill}</Text>
          </View>
          <View style={[styles.itemStatusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.itemStatusText, { color: statusStyle.color }]}>
              {item.status?.toUpperCase() || "NORMAL"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerContainer}>
        <View style={styles.weekContainer}>{week.map(renderDayChip)}</View>
        <Text style={styles.dateHeader}>วันที่ {headingTH}</Text>
      </View>
      
      <SectionList
        sections={activitySections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีกิจกรรมในวันนี้</Text>}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("EditActivity", { date: selectedDate })}>
          <Ionicons name="add" size={22} color="#444" />
          <Text style={styles.addButtonText}>เพิ่มกิจกรรม</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { paddingHorizontal: 14, paddingTop: 44, paddingBottom: 10, backgroundColor: '#fff' },
  weekContainer: { flexDirection: "row", marginBottom: 16, justifyContent: 'space-between' },
  dayChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f5f5f5", minWidth: 44, alignItems: "center" },
  dayChipSelected: { backgroundColor: "rgba(255, 219, 231, 0.5)", borderWidth: 1, borderColor: "#ff9fbf" },
  dayChipText: { fontWeight: "500", color: '#888' },
  dayChipTextSelected: { fontWeight: "700", color: '#000' },
  dateHeader: { fontSize: 16, fontWeight: "bold", color: '#333' },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10, paddingHorizontal: 14, marginTop: 10 },
  listContent: { paddingBottom: 120 },
  // --- แก้ไขสไตล์ของการ์ดกิจกรรม ---
  itemContainer: { backgroundColor: "#f7f7f7", borderRadius: 12, marginBottom: 10, paddingHorizontal: 14 },
  itemContent: { flexDirection: "row", alignItems: "center", height: 50 },
  itemTitleBox: { flex: 1, height: 36, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: '#eee' },
  itemTitleText: { color: "#555", fontSize: 14 },
  itemTimePill: { paddingHorizontal: 12, height: 36, borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", marginHorizontal: 8, borderWidth: 1, borderColor: '#eee' },
  itemTimeText: { color: "#666", fontSize: 12 },
  itemStatusBadge: { paddingHorizontal: 10, height: 28, borderRadius: 8, justifyContent: "center" },
  itemStatusText: { fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: "#999", marginTop: 48, textAlign: 'center' },
  addButtonContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: "center" },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  addButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#444' }
});

