import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Switch, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet,
  Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createActivity, getActivity, updateActivity } from "../activities";

// --- หมายเหตุ: ในการใช้งานจริง ควรใช้ไลบรารี เช่น @react-native-community/datetimepicker ---
// --- เพื่อสร้าง Date/Time Picker ที่สมบูรณ์ ---

function toDateStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function toTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const CustomCheckbox = ({ label, value, onValueChange }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onValueChange} activeOpacity={0.7}>
    <Ionicons 
      name={value ? "checkbox" : "square-outline"} 
      size={24} 
      color={value ? "#1f6f8b" : "#ccc"} 
    />
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const CATEGORIES = [
  { name: "เรียน", emoji: "📚" }, { name: "ทำงาน", emoji: "💼" }, { name: "ออกกำลังกาย", emoji: "🏋️" },
  { name: "เรื่องบ้าน", emoji: "🏠" }, { name: "ส่วนตัว", emoji: "👤" }, { name: "สุขภาพ", emoji: "❤️‍🩹" }
];
// --- ใหม่: สำหรับ UI เลือกวันทำซ้ำ ---
const WEEK_DAYS = [
  { key: "sun", label: "อา" }, { key: "mon", label: "จ" }, { key: "tue", label: "อ" },
  { key: "wed", label: "พ" }, { key: "thu", label: "พฤ" }, { key: "fri", label: "ศ" }, { key: "sat", label: "ส" }
];

export default function EditActivityScreen({ route, navigation }) {
  const id = route.params?.id || null;
  const initDate = route.params?.date || toDateStr();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [date, setDate] = useState(initDate);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState(""); // --- จะถูกตั้งค่าใน useEffect
  const [remind, setRemind] = useState(false);
  const [repeat, setRepeat] = useState("today");
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskText, setSubtaskText] = useState("");
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [notes, setNotes] = useState("");
  // --- ใหม่: State สำหรับวันที่จะทำซ้ำ ---
  const [repeatDays, setRepeatDays] = useState({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await getActivity(id);
      setTitle(d.title); setCategory(d.category || CATEGORIES[0].name); setDate(d.date);
      setAllDay(d.all_day); setTime(d.time ? d.time.slice(0, 5) : toTimeStr());
      setRemind(d.remind); setSubtasks(d.subtasks ? JSON.parse(d.subtasks) : []);
      setNotes(d.notes || "");
      // --- ใหม่: โหลดข้อมูลการทำซ้ำ ---
      if (d.repeat_config) {
        setRepeat('select');
        setRepeatDays(JSON.parse(d.repeat_config));
      } else {
        setRepeat('today');
        setRepeatDays({});
      }
    } catch { Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลกิจกรรมได้"); }
  }, [id]);

  useEffect(() => {
    // --- แก้ไข: ตั้งเวลาเริ่มต้นเป็นเวลาปัจจุบันเมื่อสร้างใหม่ ---
    if (id) {
      load();
    } else {
      setTime(toTimeStr());
    }
  }, [id, load]);

  const onSave = async () => {
    if (!title.trim()) { Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อสิ่งที่ต้องทำ"); return; }
    const payload = {
      date, all_day: allDay, time: allDay ? null : `${time}:00`,
      title: title.trim(), category, remind, status: "normal",
      subtasks: JSON.stringify(subtasks), notes: notes.trim(),
      // --- ใหม่: บันทึกข้อมูลการทำซ้ำ ---
      repeat_config: repeat === 'select' ? JSON.stringify(repeatDays) : null,
    };
    try {
      if (id) await updateActivity(id, payload); else await createActivity(payload);
      navigation.goBack();
    } catch { Alert.alert("บันทึกไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลอีกครั้ง"); }
  };

  const handleAddSubtask = () => { if (subtaskText.trim()) { setSubtasks([...subtasks, { id: Date.now(), text: subtaskText.trim(), completed: false }]); setSubtaskText(""); }};
  const handleToggleSubtask = (taskId) => { setSubtasks(subtasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task )); };
  const handleDeleteSubtask = (taskId) => { setSubtasks(subtasks.filter(task => task.id !== taskId)); };
  // --- ใหม่: ฟังก์ชันสำหรับเลือกวันทำซ้ำ ---
  const handleToggleRepeatDay = (dayKey) => { setRepeatDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] })); };
  
  const formattedDate = useMemo(() => { try { return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }); } catch { return date; }}, [date]);
  const selectedCategoryObject = useMemo(() => { return CATEGORIES.find(c => c.name === category) || CATEGORIES[0]; }, [category]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color="#555" /></TouchableOpacity><Text style={styles.headerTitle}>สิ่งที่ต้องทำ</Text><TouchableOpacity onPress={onSave}><Ionicons name="checkmark" size={28} color="#1f6f8b" /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}><TouchableOpacity style={styles.categoryButton} onPress={() => setCategoryModalVisible(true)}><Text style={styles.categoryEmoji}>{selectedCategoryObject.emoji}</Text><Text style={styles.categoryText}>{selectedCategoryObject.name}</Text></TouchableOpacity><TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="ชื่องาน..." placeholderTextColor="#ccc" /></View>
        <View style={styles.section}>
          {/* --- แก้ไข: กดเพื่อเลือกวัน/เวลาได้ --- */}
          <TouchableOpacity onPress={() => Alert.alert("เลือกวันที่", "UI สำหรับเลือกวันจะแสดงที่นี่")}><Text style={styles.dateText}>{formattedDate}</Text></TouchableOpacity>
          <View style={styles.row}><Text style={styles.label}>ทั้งวัน</Text><Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: "#ccc", true: "#b3dce9" }} thumbColor={allDay ? "#1f6f8b" : "#f4f3f4"} /></View>
          {!allDay && (<View style={styles.row}><Text style={styles.label}>ถึง</Text><TouchableOpacity onPress={() => Alert.alert("เลือกเวลา", "UI สำหรับเลือกเวลาจะแสดงที่นี่")}><Text style={styles.timePill}>{time}</Text></TouchableOpacity></View>)}
          <View style={styles.divider} /><View style={styles.row}><Text style={styles.label}>การแจ้งเตือน</Text><Switch value={remind} onValueChange={setRemind} trackColor={{ false: "#ccc", true: "#b3dce9" }} thumbColor={remind ? "#1f6f8b" : "#f4f3f4"}/></View>
          {remind && <Text style={styles.reminderText}>5 นาทีก่อนหน้า</Text>}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ทำซ้ำ</Text>
          <CustomCheckbox label="เฉพาะวันนี้" value={repeat === 'today'} onValueChange={() => setRepeat('today')} />
          <CustomCheckbox label="เลือกวัน" value={repeat === 'select'} onValueChange={() => setRepeat('select')} />
          {/* --- ใหม่: UI เลือกวันสำหรับทำซ้ำ --- */}
          {repeat === 'select' && (
            <View style={styles.weekDaySelector}>
              {WEEK_DAYS.map(day => (
                <TouchableOpacity key={day.key} style={[styles.weekDayButton, repeatDays[day.key] && styles.weekDayButtonSelected]} onPress={() => handleToggleRepeatDay(day.key)}>
                  <Text style={[styles.weekDayText, repeatDays[day.key] && styles.weekDayTextSelected]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>งานย่อย</Text>{subtasks.map(task => (<View key={task.id} style={styles.subtaskItem}><TouchableOpacity onPress={() => handleToggleSubtask(task.id)}><Ionicons name={task.completed ? "checkbox" : "square-outline"} size={24} color={task.completed ? "#52c41a" : "#ccc"} /></TouchableOpacity><Text style={[styles.subtaskText, task.completed && styles.subtaskTextCompleted]}>{task.text}</Text><TouchableOpacity onPress={() => handleDeleteSubtask(task.id)}><Ionicons name="trash-outline" size={20} color="#ff4d4f" /></TouchableOpacity></View>))}<View style={styles.subtaskInputContainer}><TextInput placeholder="เพิ่มงานย่อย..." style={styles.subtaskInput} value={subtaskText} onChangeText={setSubtaskText} onSubmitEditing={handleAddSubtask} /><TouchableOpacity style={styles.addSubtaskButton} onPress={handleAddSubtask}><Text style={styles.addSubtaskButtonText}>เพิ่ม</Text></TouchableOpacity></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>เพิ่มรายละเอียด</Text><View style={styles.attachmentBox}><TouchableOpacity><Ionicons name="image-outline" size={32} color="#888" style={styles.icon}/></TouchableOpacity><TouchableOpacity><Ionicons name="text-outline" size={32} color="#888" style={styles.icon}/></TouchableOpacity><TouchableOpacity><Ionicons name="chatbubble-ellipses-outline" size={32} color="#888" style={styles.icon}/></TouchableOpacity><TouchableOpacity><Ionicons name="videocam-outline" size={32} color="#888" style={styles.icon}/></TouchableOpacity></View><TextInput style={styles.notesInput} placeholder="เพิ่มโน้ตหรือรายละเอียด..." placeholderTextColor="#ccc" value={notes} onChangeText={setNotes} multiline={true} /></View>
      </ScrollView>
      <Modal visible={isCategoryModalVisible} transparent={true} animationType="fade"><View style={styles.modalBackdrop}><View style={styles.modalContent}><Text style={styles.modalTitle}>เลือกหมวดหมู่</Text>{CATEGORIES.map(cat => (<TouchableOpacity key={cat.name} style={styles.modalItem} onPress={() => { setCategory(cat.name); setCategoryModalVisible(false); }}><Text style={styles.modalItemText}>{cat.emoji} {cat.name}</Text></TouchableOpacity>))}<TouchableOpacity style={styles.modalCloseButton} onPress={() => setCategoryModalVisible(false)}><Text style={styles.modalCloseButtonText}>ยกเลิก</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  titleSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  categoryButton: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  categoryEmoji: { fontSize: 24 },
  categoryText: { fontSize: 10, color: '#777', marginTop: 2 },
  titleInput: { flex: 1, fontSize: 22, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  section: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#444' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 16, color: '#555' },
  dateText: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
  timePill: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', color: '#555' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  reminderText: { alignSelf: 'flex-end', color: '#777', marginTop: 4 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkboxLabel: { marginLeft: 12, fontSize: 16 },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
  subtaskText: { flex: 1, marginLeft: 10, fontSize: 16 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#aaa' },
  subtaskInputContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginTop: 10 },
  subtaskInput: { flex: 1, height: 40, paddingHorizontal: 12 },
  addSubtaskButton: { backgroundColor: '#1f6f8b', justifyContent: 'center', paddingHorizontal: 16, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  addSubtaskButtonText: { color: '#fff', fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, textAlign: 'left', paddingHorizontal: 10 },
  modalCloseButton: { marginTop: 20, backgroundColor: '#f0f0f0', borderRadius: 8, paddingVertical: 12 },
  modalCloseButtonText: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#555' },
  attachmentBox: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#eee' },
  icon: { marginHorizontal: 8 },
  notesInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginTop: 12, padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 16, },
  // --- ใหม่: สไตล์สำหรับ UI เลือกวันทำซ้ำ ---
  weekDaySelector: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  weekDayButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' },
  weekDayButtonSelected: { backgroundColor: '#1f6f8b' },
  weekDayText: { color: '#555', fontWeight: '500' },
  weekDayTextSelected: { color: '#fff', fontWeight: 'bold' },
});

