export type UserType = "patient" | "doctor"

/** Convert ISO date (YYYY-MM-DD) to DD/MM/AA for display */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}
export type Page = "login" | "register" | "forgot-password" | "reset-confirmation" | "patient-dashboard" | "patient-history" | "patient-charts" | "patient-recommendations" | "patient-profile" | "import-exam" | "doctor-dashboard" | "doctor-patient-detail" | "doctor-messages" | "doctor-profile"

export interface ExamResult {
  id: string
  name: string
  value: number
  unit: string
  date: string
  status: "normal" | "high" | "low" | "critical"
  refMin: number
  refMax: number
  doctor: string
  lab: string
  category: string
  attachmentType?: "pdf" | "image"
  attachmentName?: string
}

export interface ExamHistory {
  month: string
  glicemia: number
  colesterol: number
  hemoglobina: number
  pressaoSistolica: number
}

export interface Patient {
  id: string
  name: string
  age: number
  birthdate: string
  bloodType: string
  weight: number
  height: number
  email: string
  phone: string
  cpf: string
  avatar: string
  condition: string
  lastVisit: string
  nextExam: string
  doctor: string
  status: "stable" | "attention" | "critical"
}

export interface Doctor {
  id: string
  name: string
  crm: string
  specialty: string
  email: string
  phone: string
  avatar: string
}

// Per-doctor reference value for a specific exam+patient
export interface DoctorReferenceValue {
  id: string
  doctorId: string
  doctorName: string
  specialty: string
  examName: string
  min: number
  max: number
  unit: string
  addedAt: string
  note?: string
}

// Aggregated view: average across all doctors for one exam
export interface AggregatedReference {
  examName: string
  unit: string
  avgMin: number
  avgMax: number
  doctorCount: number
  entries: DoctorReferenceValue[]
}

export function computeAverageRefs(
  values: DoctorReferenceValue[],
): AggregatedReference[] {
  const byExam: Record<string, DoctorReferenceValue[]> = {}
  for (const v of values) {
    if (!byExam[v.examName]) byExam[v.examName] = []
    byExam[v.examName].push(v)
  }
  return Object.entries(byExam).map(([examName, entries]) => ({
    examName,
    unit: entries[0].unit,
    avgMin:
      Math.round(
        (entries.reduce((s, e) => s + e.min, 0) / entries.length) * 10,
      ) / 10,
    avgMax:
      Math.round(
        (entries.reduce((s, e) => s + e.max, 0) / entries.length) * 10,
      ) / 10,
    doctorCount: entries.length,
    entries,
  }))
}

// Which doctors have access to each patient (patient p1 = Ana Ribeiro)
export interface PatientDoctorAccess {
  doctorId: string
  doctorName: string
  specialty: string
  crm: string
  avatar: string
  grantedAt: string
}

export const patientDoctorAccess: PatientDoctorAccess[] = [
  {
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    crm: "CRM/SP 142890",
    avatar: "",
    grantedAt: "2024-03-10",
  },
  {
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    crm: "CRM/SP 98321",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&auto=format",
    grantedAt: "2024-09-22",
  },
  {
    doctorId: "d4",
    doctorName: "Dra. Camila Ferreira",
    specialty: "Nefrologia",
    crm: "CRM/SP 115432",
    avatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&auto=format",
    grantedAt: "2025-01-08",
  },
]

// Reference values added by different doctors for patient p1
export const patientReferenceValues: DoctorReferenceValue[] = [
  {
    id: "rv1",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    examName: "Glicemia em Jejum",
    min: 70,
    max: 99,
    unit: "mg/dL",
    addedAt: "2024-06-01",
    note: "Referência padrão. Monitorar se subir acima de 95 consistentemente.",
  },
  {
    id: "rv2",
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    examName: "Glicemia em Jejum",
    min: 72,
    max: 95,
    unit: "mg/dL",
    addedAt: "2024-09-22",
    note: "Perfil endocrinológico da paciente sugere meta mais restrita para prevenção.",
  },
  {
    id: "rv3",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    examName: "Colesterol Total",
    min: 0,
    max: 190,
    unit: "mg/dL",
    addedAt: "2024-06-01",
    note: "Meta mais agressiva pelo histórico familiar cardíaco.",
  },
  {
    id: "rv4",
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    examName: "Colesterol Total",
    min: 0,
    max: 200,
    unit: "mg/dL",
    addedAt: "2024-09-22",
  },
  {
    id: "rv5",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    examName: "LDL Colesterol",
    min: 0,
    max: 100,
    unit: "mg/dL",
    addedAt: "2024-06-01",
    note: "Dado histórico familiar, manter LDL abaixo de 100.",
  },
  {
    id: "rv6",
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    examName: "LDL Colesterol",
    min: 0,
    max: 110,
    unit: "mg/dL",
    addedAt: "2025-01-10",
  },
  {
    id: "rv7",
    doctorId: "d4",
    doctorName: "Dra. Camila Ferreira",
    specialty: "Nefrologia",
    examName: "LDL Colesterol",
    min: 0,
    max: 105,
    unit: "mg/dL",
    addedAt: "2025-02-14",
    note: "Ajuste nefrológico considerando função renal.",
  },
  {
    id: "rv8",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    examName: "Vitamina D",
    min: 40,
    max: 80,
    unit: "ng/mL",
    addedAt: "2026-06-28",
    note: "Meta terapêutica elevada dado histórico de deficiência recorrente.",
  },
  {
    id: "rv9",
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    examName: "Vitamina D",
    min: 30,
    max: 100,
    unit: "ng/mL",
    addedAt: "2025-01-08",
  },
  {
    id: "rv10",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    examName: "Hemoglobina",
    min: 12.5,
    max: 16.0,
    unit: "g/dL",
    addedAt: "2024-06-01",
  },
  {
    id: "rv11",
    doctorId: "d4",
    doctorName: "Dra. Camila Ferreira",
    specialty: "Nefrologia",
    examName: "Hemoglobina",
    min: 11.5,
    max: 15.5,
    unit: "g/dL",
    addedAt: "2025-02-14",
    note: "Leve ajuste para acompanhamento renal.",
  },
]

// Specialist notes directed at a specific doctor (for patient p1, to Dr. Carlos)
export interface SpecialistNote {
  id: string
  fromDoctorId: string
  fromDoctorName: string
  fromSpecialty: string
  fromAvatar: string
  toDoctorId: string
  patientId: string
  date: string
  subject: string
  content: string
  type: "referral" | "observation" | "urgent"
  read: boolean
}

export const specialistNotes: SpecialistNote[] = [
  {
    id: "sn1",
    fromDoctorId: "d2",
    fromDoctorName: "Dra. Beatriz Lima",
    fromSpecialty: "Endocrinologia",
    fromAvatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&auto=format",
    toDoctorId: "d1",
    patientId: "p1",
    date: "2026-07-28",
    subject: "Vitamina D e correlação cardiovascular",
    content:
      "Carlos, a deficiência de Vitamina D da Ana pode ter impacto no risco cardiovascular. Iniciei suplementação de 4.000 UI/dia. Seria oportuno reavaliar o perfil lipídico em 3 meses após estabilizar os níveis. Iniciamos também monitoramento da PTH. Fico à disposição para discutir o caso.",
    type: "observation",
    read: false,
  },
  {
    id: "sn2",
    fromDoctorId: "d4",
    fromDoctorName: "Dra. Camila Ferreira",
    fromSpecialty: "Nefrologia",
    fromAvatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&auto=format",
    toDoctorId: "d1",
    patientId: "p1",
    date: "2026-07-15",
    subject: "Encaminhamento: função renal e anti-hipertensivos",
    content:
      "Olá Carlos, avaliei a Ana por conta de um edema leve nos membros inferiores reportado em junho. A creatinina está estável (0.9 mg/dL) e a TFG estimada é 88 mL/min/1.73m². Por enquanto não há comprometimento renal, mas recomendo cautela caso seja necessário ajustar medicação anti-hipertensiva no futuro. Peço que me mantenha informada sobre qualquer mudança no protocolo cardiológico.",
    type: "referral",
    read: true,
  },
]

export const currentDoctor: Doctor = {
  id: "d1",
  name: "Dr. Carlos Mendes",
  crm: "CRM/SP 142890",
  specialty: "Cardiologia",
  email: "carlos.mendes@vitalink.med.br",
  phone: "(11) 98765-4321",
  avatar: "",
}

export const currentPatient = {
  id: "p1",
  name: "Ana Ribeiro",
  age: 38,
  birthdate: "1986-04-15",
  bloodType: "A+",
  weight: 62,
  height: 165,
  email: "ana.ribeiro@email.com",
  phone: "(11) 99234-5678",
  cpf: "432.891.066-12",
  doctor: "Dr. Carlos Mendes",
  nextExam: "2026-08-18",
  lastVisit: "2026-07-10",
}

export const examHistory: ExamHistory[] = [
  {
    month: "Fev",
    glicemia: 98,
    colesterol: 195,
    hemoglobina: 13.2,
    pressaoSistolica: 118,
  },
  {
    month: "Mar",
    glicemia: 104,
    colesterol: 210,
    hemoglobina: 13.0,
    pressaoSistolica: 122,
  },
  {
    month: "Abr",
    glicemia: 101,
    colesterol: 208,
    hemoglobina: 13.4,
    pressaoSistolica: 120,
  },
  {
    month: "Mai",
    glicemia: 107,
    colesterol: 225,
    hemoglobina: 12.8,
    pressaoSistolica: 128,
  },
  {
    month: "Jun",
    glicemia: 99,
    colesterol: 202,
    hemoglobina: 13.1,
    pressaoSistolica: 124,
  },
  {
    month: "Jul",
    glicemia: 95,
    colesterol: 188,
    hemoglobina: 13.5,
    pressaoSistolica: 116,
  },
]

export const recentExams: ExamResult[] = [
  {
    id: "e1",
    name: "Glicemia em Jejum",
    value: 95,
    unit: "mg/dL",
    date: "2026-07-10",
    status: "normal",
    refMin: 70,
    refMax: 99,
    doctor: "Dr. Carlos Mendes",
    lab: "Fleury Medicina e Saúde",
    category: "Bioquímica",
    attachmentType: "pdf",
    attachmentName: "hemograma_jul2026.pdf",
  },
  {
    id: "e2",
    name: "Colesterol Total",
    value: 188,
    unit: "mg/dL",
    date: "2026-07-10",
    status: "normal",
    refMin: 0,
    refMax: 200,
    doctor: "Dr. Carlos Mendes",
    lab: "Fleury Medicina e Saúde",
    category: "Lipídios",
    attachmentType: "pdf",
    attachmentName: "lipidios_jul2026.pdf",
  },
  {
    id: "e3",
    name: "LDL Colesterol",
    value: 128,
    unit: "mg/dL",
    date: "2026-07-10",
    status: "high",
    refMin: 0,
    refMax: 100,
    doctor: "Dr. Carlos Mendes",
    lab: "Fleury Medicina e Saúde",
    category: "Lipídios",
  },
  {
    id: "e4",
    name: "Hemoglobina",
    value: 13.5,
    unit: "g/dL",
    date: "2026-07-10",
    status: "normal",
    refMin: 12.0,
    refMax: 16.0,
    doctor: "Dr. Carlos Mendes",
    lab: "Fleury Medicina e Saúde",
    category: "Hemograma",
    attachmentType: "image",
    attachmentName: "hemograma_imagem.jpg",
  },
  {
    id: "e5",
    name: "TSH",
    value: 2.4,
    unit: "mUI/L",
    date: "2026-06-15",
    status: "normal",
    refMin: 0.4,
    refMax: 4.0,
    doctor: "Dra. Beatriz Lima",
    lab: "Dasa Laboratórios",
    category: "Tireoide",
    attachmentType: "pdf",
    attachmentName: "tireoide_jun2026.pdf",
  },
  {
    id: "e6",
    name: "Pressão Arterial",
    value: 116,
    unit: "mmHg",
    date: "2026-07-10",
    status: "normal",
    refMin: 90,
    refMax: 120,
    doctor: "Dr. Carlos Mendes",
    lab: "Clínica VitaLink",
    category: "Cardiovascular",
  },
  {
    id: "e7",
    name: "Vitamina D",
    value: 18,
    unit: "ng/mL",
    date: "2026-06-15",
    status: "low",
    refMin: 30,
    refMax: 100,
    doctor: "Dr. Carlos Mendes",
    lab: "Dasa Laboratórios",
    category: "Vitaminas",
    attachmentType: "pdf",
    attachmentName: "vitaminas_jun2026.pdf",
  },
  {
    id: "e8",
    name: "Ferritina",
    value: 42,
    unit: "ng/mL",
    date: "2026-05-20",
    status: "normal",
    refMin: 13,
    refMax: 150,
    doctor: "Dra. Beatriz Lima",
    lab: "Fleury Medicina e Saúde",
    category: "Hematologia",
  },
]

export const doctorRecommendations = [
  {
    id: "r1",
    date: "2026-07-10",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    avatar: "",
    message:
      "Ana, seus resultados de colesterol melhoraram bastante! Continue com a dieta mediterrânea e exercícios. O LDL ainda está um pouco elevado — vamos reavaliar em 6 semanas. Aumentei a meta de atividade física para 45 min/dia.",
    type: "recommendation",
    tags: ["Colesterol", "Atividade física"],
  },
  {
    id: "r2",
    date: "2026-06-28",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    avatar: "",
    message:
      "Sua vitamina D está baixa (18 ng/mL). Iniciar suplementação com 4.000 UI/dia por 3 meses. Expor-se ao sol por pelo menos 15 minutos pela manhã. Repetir exame em outubro.",
    type: "alert",
    tags: ["Vitamina D", "Suplementação"],
  },
  {
    id: "r3",
    date: "2026-06-15",
    doctor: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    avatar: "",
    message:
      "Função tireoidiana dentro da normalidade. Manter acompanhamento anual. Glicemia em tendência estável — ótimo controle alimentar. Parabéns pela dedicação!",
    type: "note",
    tags: ["Tireoide", "Glicemia"],
  },
]

export const patients: Patient[] = [
  {
    id: "p1",
    name: "Ana Ribeiro",
    age: 38,
    birthdate: "1986-04-15",
    bloodType: "A+",
    weight: 62,
    height: 165,
    email: "ana.ribeiro@email.com",
    phone: "(11) 99234-5678",
    cpf: "432.891.066-12",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format",
    condition: "Hipercolesterolemia",
    lastVisit: "2026-07-10",
    nextExam: "2026-08-18",
    doctor: "Dr. Carlos Mendes",
    status: "attention",
  },
  {
    id: "p2",
    name: "Roberto Alves",
    age: 55,
    birthdate: "1971-09-03",
    bloodType: "O-",
    weight: 84,
    height: 176,
    email: "roberto.alves@email.com",
    phone: "(11) 98123-7654",
    cpf: "187.432.090-55",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    condition: "Hipertensão, Diabetes T2",
    lastVisit: "2026-07-22",
    nextExam: "2026-08-05",
    doctor: "Dr. Carlos Mendes",
    status: "critical",
  },
  {
    id: "p3",
    name: "Fernanda Costa",
    age: 29,
    birthdate: "1997-01-20",
    bloodType: "B+",
    weight: 58,
    height: 162,
    email: "fernanda.costa@email.com",
    phone: "(11) 97654-3210",
    cpf: "765.023.180-44",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format",
    condition: "Acompanhamento preventivo",
    lastVisit: "2026-06-30",
    nextExam: "2026-09-30",
    doctor: "Dr. Carlos Mendes",
    status: "stable",
  },
  {
    id: "p4",
    name: "Marcos Pereira",
    age: 47,
    birthdate: "1979-11-08",
    bloodType: "AB+",
    weight: 91,
    height: 180,
    email: "marcos.pereira@email.com",
    phone: "(11) 96543-2109",
    cpf: "321.654.087-33",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
    condition: "Arritmia cardíaca",
    lastVisit: "2026-07-18",
    nextExam: "2026-08-10",
    doctor: "Dr. Carlos Mendes",
    status: "attention",
  },
  {
    id: "p5",
    name: "Juliana Santos",
    age: 42,
    birthdate: "1984-06-25",
    bloodType: "A-",
    weight: 67,
    height: 168,
    email: "juliana.santos@email.com",
    phone: "(11) 95432-1098",
    cpf: "654.321.098-22",
    avatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&auto=format",
    condition: "Pós-cirurgia cardíaca",
    lastVisit: "2026-07-25",
    nextExam: "2026-08-01",
    doctor: "Dr. Carlos Mendes",
    status: "critical",
  },
  {
    id: "p6",
    name: "Pedro Nascimento",
    age: 63,
    birthdate: "1963-03-12",
    bloodType: "O+",
    weight: 78,
    height: 172,
    email: "pedro.nascimento@email.com",
    phone: "(11) 94321-0987",
    cpf: "543.210.987-11",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format",
    condition: "Insuficiência coronariana",
    lastVisit: "2026-07-05",
    nextExam: "2026-08-25",
    doctor: "Dr. Carlos Mendes",
    status: "stable",
  },
]

export const collegeDoctors = [
  {
    id: "d2",
    name: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    crm: "CRM/SP 98321",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&auto=format",
    online: true,
  },
  {
    id: "d3",
    name: "Dr. Paulo Souza",
    specialty: "Neurologia",
    crm: "CRM/SP 77654",
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&auto=format",
    online: false,
  },
  {
    id: "d4",
    name: "Dra. Camila Ferreira",
    specialty: "Nefrologia",
    crm: "CRM/SP 115432",
    avatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=60&h=60&fit=crop&auto=format",
    online: true,
  },
]

export const doctorMessages = [
  {
    id: "m1",
    from: "Dra. Beatriz Lima",
    fromId: "d2",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&auto=format",
    patientId: "p1",
    patientName: "Ana Ribeiro",
    time: "14:32",
    date: "2026-07-28",
    type: "note",
    content:
      "Carlos, sobre a paciente Ana Ribeiro: o TSH voltou normal mas gostaria de acompanhar a vitamina D junto com você. Pode revisar a suplementação que prescreveu?",
    read: false,
  },
  {
    id: "m2",
    from: "Dr. Paulo Souza",
    fromId: "d3",
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&auto=format",
    patientId: "p4",
    patientName: "Marcos Pereira",
    time: "11:15",
    date: "2026-07-27",
    type: "note",
    content:
      "Carlos, o ECG do Marcos Pereira mostrou extrassístoles frequentes. Sugiro angiografia coronária antes de liberar para atividades intensas. O que você acha?",
    read: true,
  },
  {
    id: "m3",
    from: "Dra. Camila Ferreira",
    fromId: "d4",
    avatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=60&h=60&fit=crop&auto=format",
    patientId: "p2",
    patientName: "Roberto Alves",
    time: "09:48",
    date: "2026-07-26",
    type: "audio",
    content:
      "Carlos, ouça esse áudio sobre o caso do Roberto Alves. Creatinina subiu para 1.8 — precisa de ajuste na medicação anti-hipertensiva urgente.",
    audioDuration: "1:24",
    read: true,
  },
]

export type DocType = "exam" | "prescription" | "report" | "image"

export interface MedicalDocument {
  id: string
  type: DocType
  name: string
  date: string
  doctor: string
  specialty: string
  fileType: "pdf" | "jpg" | "png" | "dicom"
  size: string
  note?: string
  sharedWith: string[]
}

export interface Consultation {
  id: string
  date: string
  doctorId: string
  doctorName: string
  specialty: string
  motivo: string
  summary: string
  documents: string[]
  prescriptions: string[]
}

export interface AccessLog {
  id: string
  actorId: string
  actorName: string
  actorRole: "doctor" | "patient" | "system"
  action: string
  resource: string
  date: string
  time: string
  device: string
  ip: string
}

export interface AccessRequest {
  id: string
  doctorId: string
  doctorName: string
  specialty: string
  crm: string
  avatar: string
  patientId: string
  patientName: string
  justification: string
  requestedAt: string
  status: "pending" | "approved" | "denied"
}

export const patientDocuments: MedicalDocument[] = [
  {
    id: "doc1",
    type: "exam",
    name: "Hemograma Completo",
    date: "2026-07-10",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "1.2 MB",
    note: "Resultado dentro da normalidade para maioria dos índices.",
    sharedWith: ["d1", "d2"],
  },
  {
    id: "doc2",
    type: "exam",
    name: "Perfil Lipídico",
    date: "2026-07-10",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "0.9 MB",
    sharedWith: ["d1"],
  },
  {
    id: "doc3",
    type: "prescription",
    name: "Receita — Vitamina D 4000 UI",
    date: "2026-06-28",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "0.3 MB",
    note: "Tomar 1 cápsula/dia após almoço. Duração: 3 meses.",
    sharedWith: ["d1", "d2", "d4"],
  },
  {
    id: "doc4",
    type: "report",
    name: "Laudo Ecocardiograma",
    date: "2026-05-14",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "2.8 MB",
    note: "Função sistólica preservada. FE 68%.",
    sharedWith: ["d1", "d4"],
  },
  {
    id: "doc5",
    type: "image",
    name: "Radiografia de Tórax",
    date: "2026-05-14",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "jpg",
    size: "4.1 MB",
    sharedWith: ["d1"],
  },
  {
    id: "doc6",
    type: "exam",
    name: "Função Tireoidiana (TSH, T4)",
    date: "2026-06-15",
    doctor: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    fileType: "pdf",
    size: "1.0 MB",
    sharedWith: ["d2", "d1"],
  },
  {
    id: "doc7",
    type: "prescription",
    name: "Receita — Estatina 20mg",
    date: "2026-07-10",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "0.3 MB",
    note: "Tomar 1 comprimido à noite. Sem suspender sem aviso médico.",
    sharedWith: ["d1"],
  },
  {
    id: "doc8",
    type: "report",
    name: "Laudo Holter 24h",
    date: "2026-04-22",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "3.5 MB",
    sharedWith: ["d1", "d2"],
  },
  {
    id: "doc9",
    type: "image",
    name: "Densitometria Óssea",
    date: "2026-03-08",
    doctor: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    fileType: "dicom",
    size: "12.4 MB",
    sharedWith: ["d2"],
  },
  {
    id: "doc10",
    type: "exam",
    name: "Vitaminas D e B12",
    date: "2026-06-15",
    doctor: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    fileType: "pdf",
    size: "0.7 MB",
    note: "Vitamina D baixa: 18 ng/mL. B12 normal.",
    sharedWith: ["d1", "d2", "d4"],
  },
]

export const patientConsultations: Consultation[] = [
  {
    id: "c1",
    date: "2026-07-10",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    motivo: "Revisão do perfil lipídico e ajuste de medicação",
    summary:
      "LDL ainda elevado (128 mg/dL). Mantida estatina, orientada dieta mediterrânea. Retorno em 6 semanas.",
    documents: ["doc1", "doc2", "doc7"],
    prescriptions: ["doc7"],
  },
  {
    id: "c2",
    date: "2026-06-28",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    motivo: "Queixa de fadiga e resultado de vitamina D",
    summary:
      "Deficiência de vitamina D confirmada (18 ng/mL). Iniciada suplementação 4.000 UI/dia.",
    documents: ["doc10", "doc3"],
    prescriptions: ["doc3"],
  },
  {
    id: "c3",
    date: "2026-06-15",
    doctorId: "d2",
    doctorName: "Dra. Beatriz Lima",
    specialty: "Endocrinologia",
    motivo: "Acompanhamento endocrinológico semestral",
    summary:
      "TSH e T4 normais. Glicemia estável. Sem alteração de conduta. Próximo retorno em 12 meses.",
    documents: ["doc6"],
    prescriptions: [],
  },
  {
    id: "c4",
    date: "2026-05-14",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    motivo: "Avaliação cardiológica com ecocardiograma e radiografia",
    summary:
      "Ecocardiograma normal, FE 68%. Radiografia sem alterações. Mantido acompanhamento semestral.",
    documents: ["doc4", "doc5"],
    prescriptions: [],
  },
  {
    id: "c5",
    date: "2026-04-22",
    doctorId: "d1",
    doctorName: "Dr. Carlos Mendes",
    specialty: "Cardiologia",
    motivo: "Palpitações eventuais — avaliação com Holter",
    summary:
      "Holter 24h sem arritmias significativas. Episódios de extrassístoles isoladas, sem correlação sintomática. Conduta expectante.",
    documents: ["doc8"],
    prescriptions: [],
  },
]

export const patientAccessLogs: AccessLog[] = [
  {
    id: "al1",
    actorId: "d1",
    actorName: "Dr. Carlos Mendes",
    actorRole: "doctor",
    action: "Visualizou exame",
    resource: "Hemograma Completo — 10/07/26",
    date: "2026-08-05",
    time: "09:14",
    device: "Chrome · Windows",
    ip: "189.28.***.***",
  },
  {
    id: "al2",
    actorId: "d2",
    actorName: "Dra. Beatriz Lima",
    actorRole: "doctor",
    action: "Baixou laudo",
    resource: "Laudo Ecocardiograma — 14/05/26",
    date: "2026-08-04",
    time: "16:42",
    device: "Safari · MacOS",
    ip: "177.92.***.***",
  },
  {
    id: "al3",
    actorId: "p1",
    actorName: "Ana Ribeiro",
    actorRole: "patient",
    action: "Acessou perfil",
    resource: "Perfil pessoal",
    date: "2026-08-04",
    time: "11:30",
    device: "Chrome · iPhone",
    ip: "189.28.***.***",
  },
  {
    id: "al4",
    actorId: "d4",
    actorName: "Dra. Camila Ferreira",
    actorRole: "doctor",
    action: "Visualizou exame",
    resource: "Vitaminas D e B12 — 15/06/26",
    date: "2026-08-03",
    time: "14:07",
    device: "Firefox · Linux",
    ip: "201.55.***.***",
  },
  {
    id: "al5",
    actorId: "system",
    actorName: "Sistema VitaLink",
    actorRole: "system",
    action: "Gerou relatório",
    resource: "Resumo mensal — Jul/2026",
    date: "2026-08-01",
    time: "00:00",
    device: "Sistema automático",
    ip: "—",
  },
  {
    id: "al6",
    actorId: "d1",
    actorName: "Dr. Carlos Mendes",
    actorRole: "doctor",
    action: "Adicionou receita",
    resource: "Receita — Estatina 20mg — 10/07/26",
    date: "2026-07-10",
    time: "17:55",
    device: "Chrome · Windows",
    ip: "189.28.***.***",
  },
  {
    id: "al7",
    actorId: "d1",
    actorName: "Dr. Carlos Mendes",
    actorRole: "doctor",
    action: "Registrou consulta",
    resource: "Consulta — 10/07/26",
    date: "2026-07-10",
    time: "17:50",
    device: "Chrome · Windows",
    ip: "189.28.***.***",
  },
  {
    id: "al8",
    actorId: "d2",
    actorName: "Dra. Beatriz Lima",
    actorRole: "doctor",
    action: "Visualizou receita",
    resource: "Receita — Vitamina D 4000 UI — 28/06/26",
    date: "2026-07-01",
    time: "10:22",
    device: "Safari · MacOS",
    ip: "177.92.***.***",
  },
  {
    id: "al9",
    actorId: "p1",
    actorName: "Ana Ribeiro",
    actorRole: "patient",
    action: "Compartilhou documento",
    resource: "Laudo Holter 24h — 22/04/26",
    date: "2026-06-30",
    time: "20:11",
    device: "Chrome · Android",
    ip: "189.28.***.***",
  },
  {
    id: "al10",
    actorId: "d4",
    actorName: "Dra. Camila Ferreira",
    actorRole: "doctor",
    action: "Acessou prontuário",
    resource: "Histórico clínico completo",
    date: "2026-06-20",
    time: "08:45",
    device: "Chrome · Windows",
    ip: "201.55.***.***",
  },
]

export const pendingAccessRequests: AccessRequest[] = [
  {
    id: "ar1",
    doctorId: "d5",
    doctorName: "Dr. Rafael Nogueira",
    specialty: "Reumatologia",
    crm: "CRM/SP 203441",
    avatar: "",
    patientId: "p1",
    patientName: "Ana Ribeiro",
    justification:
      "Encaminhamento de Dr. Carlos Mendes para avaliação de dores articulares relatadas em consulta de 10/07/2026.",
    requestedAt: "2026-08-04",
    status: "pending",
  },
  {
    id: "ar2",
    doctorId: "d6",
    doctorName: "Dra. Priscila Azevedo",
    specialty: "Nutrição Clínica",
    crm: "CRM/SP 178832",
    avatar: "",
    patientId: "p1",
    patientName: "Ana Ribeiro",
    justification:
      "Acompanhamento nutricional solicitado pela Dra. Beatriz Lima para suporte ao tratamento da deficiência de vitamina D e controle lipídico.",
    requestedAt: "2026-08-03",
    status: "pending",
  },
]

// Simulated extracted exam values (used by ImportExamPage)
export const simulatedExtractedExams = [
  {
    name: "Glicemia em Jejum",
    value: "92",
    unit: "mg/dL",
    category: "Bioquímica",
    refMin: "70",
    refMax: "99",
  },
  {
    name: "Hemoglobina",
    value: "13.8",
    unit: "g/dL",
    category: "Hemograma",
    refMin: "12.0",
    refMax: "16.0",
  },
  {
    name: "Hematócrito",
    value: "42.1",
    unit: "%",
    category: "Hemograma",
    refMin: "36",
    refMax: "48",
  },
  {
    name: "Leucócitos",
    value: "6.200",
    unit: "/mm³",
    category: "Hemograma",
    refMin: "4.000",
    refMax: "11.000",
  },
  {
    name: "Plaquetas",
    value: "248.000",
    unit: "/mm³",
    category: "Hemograma",
    refMin: "150.000",
    refMax: "400.000",
  },
]
