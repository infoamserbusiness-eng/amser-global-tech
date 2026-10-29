// Datos semilla del demo. Cuando se conecte Supabase, estas estructuras pasan a ser tablas
// (ver ARCHITECTURE.md §5); la forma de los objetos se mantiene para no reescribir las vistas.

export type Role = "student" | "teacher" | "coordinator" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  student: "Estudiante",
  teacher: "Capacitador",
  coordinator: "Coordinador académico",
  admin: "Administrador",
};

export const ROLE_HOME: Record<Role, string> = {
  student: "/estudiante",
  teacher: "/capacitador",
  coordinator: "/coordinador",
  admin: "https://amserbusiness.com", // la administración vive en la plataforma madre
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string; // grado académico (capacitadores)
  bio?: string;
  docId?: string;
  mustChange?: boolean; // debe cambiar la clave temporal antes de usar su portal
  active: boolean;
};

export const DEMO_PASSWORD = "demo1234";

export const USERS: User[] = [
  { id: "u-est1", name: "Camila Andrade", email: "estudiante@amserglobal.tech", role: "student", active: true },
  { id: "u-est2", name: "Joel Quishpe", email: "joel.quishpe@correo.com", role: "student", active: true },
  { id: "u-est3", name: "Valeria Ortiz", email: "valeria.ortiz@correo.com", role: "student", active: true },
  { id: "u-est4", name: "Mateo Chiriboga", email: "mateo.chiriboga@correo.com", role: "student", active: true },
  { id: "u-est5", name: "Daniela Salazar", email: "daniela.salazar@correo.com", role: "student", active: true },
  { id: "u-est6", name: "Esteban Lara", email: "esteban.lara@correo.com", role: "student", active: true },
  { id: "u-doc1", name: "Marco Villacís", email: "capacitador@amserglobal.tech", role: "teacher", title: "Ing.", bio: "Arquitecto de software con 12 años liderando equipos web en banca y retail.", active: true },
  { id: "u-doc2", name: "Daniela Rosero", email: "daniela.rosero@amserglobal.tech", role: "teacher", title: "Mg.", bio: "Especialista en seguridad ofensiva y respuesta a incidentes (OSCP).", active: true },
  { id: "u-doc3", name: "Andrés Cueva", email: "andres.cueva@amserglobal.tech", role: "teacher", title: "PhD.", bio: "Investigador en aprendizaje automático aplicado a series de tiempo.", active: true },
  { id: "u-doc4", name: "Sofía Mena", email: "sofia.mena@amserglobal.tech", role: "teacher", title: "Ing.", bio: "Cloud architect certificada AWS Solutions Architect Professional.", active: true },
  { id: "u-coo1", name: "Lucía Paredes", email: "coordinador@amserglobal.tech", role: "coordinator", title: "Mg.", active: true },
  { id: "u-adm1", name: "Administración Amser", email: "admin@amserglobal.tech", role: "admin", active: true },
];

// Material que el capacitador sube para el participante (en demo solo se guarda el nombre/enlace).
export type Material = { name: string; kind: "archivo" | "enlace"; url?: string };
export type Lesson = { id: string; title: string; type: "video" | "lectura" | "laboratorio"; min: number; material?: Material };
export type Module = { id: string; title: string; lessons: Lesson[]; quiz?: Quiz }; // quiz = evaluación del módulo (opcional)
export type Assignment = { id: string; title: string; description: string; due: string; maxPoints: number };
export type Question = { q: string; options: string[]; answer: number };
export type Quiz = { id: string; title: string; questions: Question[] };

export type Course = {
  slug: string;
  title: string;
  area: "Desarrollo" | "Seguridad" | "Datos e IA" | "Cloud" | "Redes" | "Negocios digitales";
  level: "Básico" | "Intermedio" | "Avanzado";
  modality: "Virtual en vivo" | "Pregrabado" | "Híbrido";
  weeks: number;
  kind: "rapido" | "largo"; // rápido = pregrabado, pago único; largo = plan de pagos a elección
  months?: number; // duración en meses (cursos largos)
  hours: number;
  price: number; // USD
  start: string; // ISO
  status: "abierto" | "proximamente";
  published: boolean;
  teacherId: string;
  summary: string;
  outcomes: string[];
  modules: Module[];
  assignments: Assignment[];
  quiz: Quiz;
  color: string; // acento de la tarjeta
  authored?: boolean; // creado por un capacitador en la plataforma
  teacherName?: string; // nombre del capacitador (cursos publicados desde la base de datos)
  teacherBio?: string;
  review?: "borrador" | "revision" | "publicado" | "rechazado"; // aprobación académica antes de vender
  reviewNote?: string;
};

const L = (id: string, title: string, type: Lesson["type"], min: number): Lesson => ({ id, title, type, min });

const BASE_COURSES: Course[] = [
  {
    slug: "desarrollo-web-fullstack",
    title: "Desarrollo Web Full Stack",
    area: "Desarrollo",
    level: "Intermedio",
    modality: "Virtual en vivo",
    weeks: 24,
    kind: "largo",
    months: 6,
    hours: 96,
    price: 320,
    start: "2026-11-02",
    status: "abierto",
    published: true,
    teacherId: "u-doc1",
    color: "#1f7ae0",
    summary: "Construye aplicaciones completas: interfaces con React, APIs con Node y bases de datos reales, hasta desplegarlas en la nube.",
    outcomes: ["Diseñar interfaces accesibles y responsivas con React", "Crear APIs REST seguras con Node.js y PostgreSQL", "Desplegar con CI/CD en un entorno cloud", "Publicar un proyecto final en tu portafolio"],
    modules: [
      { id: "web-m1", title: "Fundamentos del front-end moderno", lessons: [L("web-m1-l1", "HTML semántico y accesibilidad", "video", 28), L("web-m1-l2", "CSS moderno: Flexbox y Grid", "video", 35), L("web-m1-l3", "JavaScript esencial (ES2024)", "lectura", 25)] },
      { id: "web-m2", title: "React y estado de la aplicación", lessons: [L("web-m2-l1", "Componentes, props y hooks", "video", 40), L("web-m2-l2", "Estado global y formularios", "video", 38), L("web-m2-l3", "Laboratorio: tablero de tareas", "laboratorio", 60)] },
      { id: "web-m3", title: "Back-end con Node y bases de datos", lessons: [L("web-m3-l1", "APIs REST con Express", "video", 42), L("web-m3-l2", "Modelado en PostgreSQL", "lectura", 30), L("web-m3-l3", "Laboratorio: API de inventario", "laboratorio", 75)] },
    ],
    assignments: [
      { id: "web-a1", title: "Maqueta responsiva de una landing", description: "Entrega el enlace a tu repositorio con una landing de 3 secciones que funcione en móvil y escritorio. Explica tus decisiones de diseño.", due: "2026-11-16", maxPoints: 10 },
      { id: "web-a2", title: "API REST de tareas", description: "Implementa CRUD de tareas con validación y autenticación básica. Adjunta la colección de pruebas.", due: "2026-12-07", maxPoints: 10 },
    ],
    quiz: { id: "web-q1", title: "Evaluación: fundamentos web", questions: [
      { q: "¿Qué etiqueta HTML es la más adecuada para el contenido principal de una página?", options: ["<div>", "<main>", "<section>", "<span>"], answer: 1 },
      { q: "¿Qué hook de React guarda un valor que persiste entre renderizados y dispara un re-render al cambiar?", options: ["useRef", "useEffect", "useState", "useMemo"], answer: 2 },
      { q: "En una API REST, ¿qué método HTTP se usa para crear un recurso?", options: ["GET", "POST", "PUT", "DELETE"], answer: 1 },
    ] },
  },
  {
    slug: "ciberseguridad-fundamentos",
    title: "Ciberseguridad: Fundamentos y Hacking Ético",
    area: "Seguridad",
    level: "Básico",
    modality: "Híbrido",
    weeks: 16,
    kind: "largo",
    months: 4,
    hours: 80,
    price: 290,
    start: "2026-11-09",
    status: "abierto",
    published: true,
    teacherId: "u-doc2",
    color: "#16a34a",
    summary: "Aprende a pensar como un atacante para proteger mejor: redes, aplicaciones web, criptografía y respuesta a incidentes en laboratorios reales.",
    outcomes: ["Identificar vulnerabilidades del OWASP Top 10", "Realizar pruebas de penetración en entornos controlados", "Aplicar criptografía y hardening de sistemas", "Redactar informes técnicos y ejecutivos"],
    modules: [
      { id: "cib-m1", title: "Panorama de la seguridad", lessons: [L("cib-m1-l1", "Tríada CIA y modelos de amenaza", "video", 30), L("cib-m1-l2", "Marco legal y ética profesional", "lectura", 20)] },
      { id: "cib-m2", title: "Seguridad en redes", lessons: [L("cib-m2-l1", "Protocolos y análisis con Wireshark", "video", 45), L("cib-m2-l2", "Laboratorio: captura y análisis de tráfico", "laboratorio", 60)] },
      { id: "cib-m3", title: "Seguridad web y OWASP", lessons: [L("cib-m3-l1", "Inyección SQL y XSS", "video", 40), L("cib-m3-l2", "Laboratorio: explotando una app vulnerable", "laboratorio", 80)] },
    ],
    assignments: [
      { id: "cib-a1", title: "Informe de análisis de tráfico", description: "Analiza el archivo .pcap entregado e identifica 3 hallazgos sospechosos. Entrega un informe de 2 páginas.", due: "2026-11-30", maxPoints: 10 },
    ],
    quiz: { id: "cib-q1", title: "Evaluación: fundamentos de seguridad", questions: [
      { q: "¿Qué letra de la tríada CIA corresponde a que la información no sea alterada sin autorización?", options: ["Confidencialidad", "Integridad", "Disponibilidad", "Autenticidad"], answer: 1 },
      { q: "¿Qué ataque inserta código malicioso en el navegador de otros usuarios a través de una web vulnerable?", options: ["SQL Injection", "Phishing", "XSS", "DDoS"], answer: 2 },
      { q: "¿Cuál es una buena práctica para almacenar contraseñas?", options: ["Texto plano", "MD5 sin sal", "Hash con sal (bcrypt/argon2)", "Base64"], answer: 2 },
    ] },
  },
  {
    slug: "ciencia-datos-ia",
    title: "Ciencia de Datos e Inteligencia Artificial",
    area: "Datos e IA",
    level: "Intermedio",
    modality: "Virtual en vivo",
    weeks: 24,
    kind: "largo",
    months: 6,
    hours: 112,
    price: 380,
    start: "2026-11-16",
    status: "abierto",
    published: true,
    teacherId: "u-doc3",
    color: "#7c3aed",
    summary: "De los datos crudos al modelo en producción: Python, estadística aplicada, machine learning y una introducción práctica a IA generativa.",
    outcomes: ["Limpiar y analizar datos con Python y pandas", "Entrenar y evaluar modelos de machine learning", "Comunicar hallazgos con visualizaciones claras", "Integrar modelos de IA generativa en un producto"],
    modules: [
      { id: "dat-m1", title: "Python para datos", lessons: [L("dat-m1-l1", "Python, NumPy y pandas", "video", 45), L("dat-m1-l2", "Limpieza y exploración de datos", "laboratorio", 70)] },
      { id: "dat-m2", title: "Machine learning aplicado", lessons: [L("dat-m2-l1", "Regresión y clasificación", "video", 50), L("dat-m2-l2", "Validación y métricas", "lectura", 30), L("dat-m2-l3", "Laboratorio: predicción de ventas", "laboratorio", 80)] },
      { id: "dat-m3", title: "IA generativa en productos", lessons: [L("dat-m3-l1", "Modelos de lenguaje y prompting", "video", 35), L("dat-m3-l2", "Construir un asistente con tus datos", "laboratorio", 90)] },
    ],
    assignments: [
      { id: "dat-a1", title: "Análisis exploratorio de un dataset", description: "Elige un dataset público, límpialo y presenta 5 hallazgos con gráficos. Entrega el notebook.", due: "2026-12-04", maxPoints: 10 },
    ],
    quiz: { id: "dat-q1", title: "Evaluación: fundamentos de ciencia de datos", questions: [
      { q: "¿Qué librería de Python es la base para manipular datos tabulares?", options: ["pandas", "Flask", "pytest", "requests"], answer: 0 },
      { q: "Un modelo rinde muy bien en entrenamiento pero mal con datos nuevos. ¿Qué ocurre?", options: ["Subajuste", "Sobreajuste", "Normalización", "Regularización"], answer: 1 },
      { q: "¿Qué métrica es adecuada para un problema de clasificación?", options: ["RMSE", "R² ajustado", "F1-score", "MAE"], answer: 2 },
    ] },
  },
  {
    slug: "cloud-computing-aws",
    title: "Cloud Computing con AWS",
    area: "Cloud",
    level: "Intermedio",
    modality: "Pregrabado",
    weeks: 8,
    kind: "rapido",
    hours: 64,
    price: 260,
    start: "2026-11-23",
    status: "abierto",
    published: true,
    teacherId: "u-doc4",
    color: "#f59e0b",
    summary: "Diseña infraestructura escalable y segura en AWS y prepárate para la certificación Cloud Practitioner / Solutions Architect Associate.",
    outcomes: ["Desplegar servicios de cómputo, red y almacenamiento", "Aplicar IAM y buenas prácticas de seguridad", "Automatizar infraestructura como código", "Estimar y optimizar costos en la nube"],
    modules: [
      { id: "clo-m1", title: "Conceptos y servicios base", lessons: [L("clo-m1-l1", "Modelo de responsabilidad compartida", "video", 25), L("clo-m1-l2", "EC2, S3 y VPC", "video", 50)] },
      { id: "clo-m2", title: "Seguridad y operación", lessons: [L("clo-m2-l1", "IAM y políticas de acceso", "lectura", 30), L("clo-m2-l2", "Laboratorio: arquitectura de tres capas", "laboratorio", 90)] },
    ],
    assignments: [
      { id: "clo-a1", title: "Diagrama de arquitectura", description: "Diseña la arquitectura en AWS para una tienda en línea con picos de tráfico. Justifica cada servicio.", due: "2026-12-14", maxPoints: 10 },
    ],
    quiz: { id: "clo-q1", title: "Evaluación: fundamentos cloud", questions: [
      { q: "¿Qué servicio de AWS almacena objetos como imágenes y respaldos?", options: ["EC2", "S3", "RDS", "Lambda"], answer: 1 },
      { q: "Según el modelo de responsabilidad compartida, ¿quién protege los datos del cliente en S3?", options: ["Solo AWS", "Solo el cliente", "Ambos, con roles distintos", "Nadie"], answer: 2 },
    ] },
  },
  {
    slug: "redes-conectividad-ccna",
    title: "Redes y Conectividad (CCNA)",
    area: "Redes",
    level: "Básico",
    modality: "Híbrido",
    weeks: 24,
    kind: "largo",
    months: 6,
    hours: 96,
    price: 300,
    start: "2027-01-18",
    status: "proximamente",
    published: true,
    teacherId: "u-doc2",
    color: "#0891b2",
    summary: "Domina el direccionamiento IP, switching, routing y redes inalámbricas con simuladores y equipos reales.",
    outcomes: ["Configurar switches y routers", "Diseñar esquemas de direccionamiento y VLAN", "Diagnosticar fallas de conectividad"],
    modules: [{ id: "red-m1", title: "Modelo OSI y direccionamiento", lessons: [L("red-m1-l1", "Capas OSI y TCP/IP", "video", 35), L("red-m1-l2", "Subnetting paso a paso", "lectura", 40)] }],
    assignments: [{ id: "red-a1", title: "Plan de direccionamiento", description: "Diseña el plan IP para una sede con 4 departamentos.", due: "2027-02-08", maxPoints: 10 }],
    quiz: { id: "red-q1", title: "Evaluación: redes", questions: [{ q: "¿Cuántos hosts útiles tiene una red /24?", options: ["254", "256", "255", "250"], answer: 0 }] },
  },
  {
    slug: "marketing-digital-analitica",
    title: "Marketing Digital y Analítica",
    area: "Negocios digitales",
    level: "Básico",
    modality: "Pregrabado",
    weeks: 6,
    kind: "rapido",
    hours: 48,
    price: 180,
    start: "2027-02-01",
    status: "proximamente",
    published: true,
    teacherId: "u-doc4",
    color: "#e11d48",
    summary: "Estrategia, contenidos, pauta y analítica web para hacer crecer un negocio con decisiones basadas en datos.",
    outcomes: ["Diseñar un embudo de marketing", "Medir resultados con Google Analytics 4", "Optimizar campañas por costo de adquisición"],
    modules: [{ id: "mkt-m1", title: "Estrategia digital", lessons: [L("mkt-m1-l1", "Buyer persona y propuesta de valor", "video", 30), L("mkt-m1-l2", "Embudos y métricas clave", "lectura", 25)] }],
    assignments: [{ id: "mkt-a1", title: "Plan de campaña", description: "Plantea objetivos, audiencia y KPIs de una campaña de 30 días.", due: "2027-02-22", maxPoints: 10 }],
    quiz: { id: "mkt-q1", title: "Evaluación: marketing", questions: [{ q: "¿Qué mide el CAC?", options: ["Costo de adquisición de cliente", "Capacidad de ahorro", "Clics por anuncio", "Conversión de carrito"], answer: 0 }] },
  },
];

// Registro de cursos: los base más los creados por capacitadores (el store lo sincroniza; solo cliente/demo).
export const COURSES: Course[] = [...BASE_COURSES];
export const setCustomCourses = (list: Course[]) => {
  COURSES.length = 0;
  COURSES.push(...BASE_COURSES, ...list);
};

export type Enrollment = { studentId: string; courseSlug: string; progress: number; status: "activo" | "completado" };

// `progress` es el avance semilla de los estudiantes que no operan en el demo.
// Para Camila (u-est1) el avance se calcula en vivo con las lecciones completadas.
export const ENROLLMENTS: Enrollment[] = [
  { studentId: "u-est1", courseSlug: "desarrollo-web-fullstack", progress: 0, status: "activo" },
  { studentId: "u-est1", courseSlug: "ciberseguridad-fundamentos", progress: 0, status: "activo" },
  { studentId: "u-est1", courseSlug: "ciencia-datos-ia", progress: 0, status: "activo" },
  { studentId: "u-est2", courseSlug: "desarrollo-web-fullstack", progress: 72, status: "activo" },
  { studentId: "u-est3", courseSlug: "desarrollo-web-fullstack", progress: 45, status: "activo" },
  { studentId: "u-est4", courseSlug: "desarrollo-web-fullstack", progress: 88, status: "activo" },
  { studentId: "u-est3", courseSlug: "ciberseguridad-fundamentos", progress: 60, status: "activo" },
  { studentId: "u-est5", courseSlug: "ciberseguridad-fundamentos", progress: 30, status: "activo" },
  { studentId: "u-est2", courseSlug: "ciencia-datos-ia", progress: 55, status: "activo" },
  { studentId: "u-est6", courseSlug: "ciencia-datos-ia", progress: 20, status: "activo" },
  { studentId: "u-est5", courseSlug: "cloud-computing-aws", progress: 100, status: "completado" },
  { studentId: "u-est6", courseSlug: "cloud-computing-aws", progress: 40, status: "activo" },
];

export type Submission = {
  file?: string; // nombre del archivo adjunto (demo: no se almacena el contenido)
  id: string;
  studentId: string;
  assignmentId: string;
  text: string;
  at: string;
  grade?: number;
  feedback?: string;
};

export type Post = { id: string; courseSlug: string; authorId: string; text: string; at: string; replies: { authorId: string; text: string; at: string }[] };
export type Announcement = { id: string; courseSlug: string; authorId: string; title: string; body: string; at: string };
// Solicitud de registro de participante. Flujo: nuevo → (llamada de admisión) contactado → matriculado = habilitado | descartado = rechazado.
export type Lead = { id: string; name: string; docId?: string; email: string; phone: string; city?: string; courseSlug: string; message?: string; at: string; status: "nuevo" | "contactado" | "matriculado" | "descartado"; callNote?: string; calledAt?: string; userId?: string; tempPassword?: string };
export type Certificate = { code: string; studentId: string; courseSlug: string; at: string; score: number };
export const PASS_PCT = 70; // nota mínima (%) para aprobar la evaluación final

export const SEED_SUBMISSIONS: Submission[] = [
  { id: "s1", studentId: "u-est2", assignmentId: "web-a1", text: "https://github.com/joelq/landing-amser — usé Grid para el hero y Flexbox para las tarjetas. Probé en 3 tamaños de pantalla.", at: "2026-10-03T15:20:00Z" },
  { id: "s2", studentId: "u-est4", assignmentId: "web-a1", text: "https://github.com/mateoc/landing — incluye modo oscuro y navegación accesible por teclado.", at: "2026-10-02T09:10:00Z", grade: 9, feedback: "Excelente accesibilidad. Cuida el contraste del botón secundario." },
  { id: "s3", studentId: "u-est3", assignmentId: "cib-a1", text: "Hallazgos: 1) escaneo de puertos desde 10.0.0.45, 2) credenciales FTP en claro, 3) DNS tunneling sospechoso.", at: "2026-10-04T18:45:00Z" },
  { id: "s4", studentId: "u-est6", assignmentId: "dat-a1", text: "Dataset: precios de vivienda en Quito. Notebook adjunto con 5 gráficos y limpieza de nulos.", at: "2026-10-04T21:00:00Z" },
];

export const SEED_POSTS: Post[] = [
  { id: "p1", courseSlug: "desarrollo-web-fullstack", authorId: "u-est2", text: "¿Alguien más tuvo problemas con Grid en Safari? El gap no se aplica en mi maqueta.", at: "2026-10-03T12:00:00Z", replies: [{ authorId: "u-doc1", text: "Revisa que no uses prefijos viejos. Safari 15+ soporta gap en Grid. Comparte tu CSS y lo vemos en clase.", at: "2026-10-03T13:30:00Z" }] },
  { id: "p2", courseSlug: "ciberseguridad-fundamentos", authorId: "u-est3", text: "Para el laboratorio de Wireshark, ¿qué filtro recomiendan para aislar tráfico DNS?", at: "2026-10-04T10:00:00Z", replies: [] },
];

export const SEED_ANNOUNCEMENTS: Announcement[] = [
  { id: "a1", courseSlug: "desarrollo-web-fullstack", authorId: "u-doc1", title: "Bienvenidos al curso", body: "La sesión en vivo es los martes y jueves a las 19:00. Las grabaciones quedan disponibles en el campus.", at: "2026-10-01T14:00:00Z" },
  { id: "a2", courseSlug: "ciberseguridad-fundamentos", authorId: "u-doc2", title: "Laboratorio de red habilitado", body: "Ya pueden acceder a la máquina virtual del laboratorio 2. Instrucciones en la lección correspondiente.", at: "2026-10-03T16:00:00Z" },
];

export const SEED_LEADS: Lead[] = [
  { id: "l1", name: "Pablo Narváez", email: "pablo.n@correo.com", phone: "0991234567", courseSlug: "ciencia-datos-ia", at: "2026-10-04T08:30:00Z", status: "nuevo" },
  { id: "l2", name: "Karla Mendoza", email: "karla.m@correo.com", phone: "0987654321", courseSlug: "cloud-computing-aws", at: "2026-10-04T19:15:00Z", status: "nuevo" },
];

export const courseBySlug = (slug: string) => COURSES.find((c) => c.slug === slug);
export const userById = (id: string) => USERS.find((u) => u.id === id);
export const lessonsOf = (c: Course) => c.modules.flatMap((m) => m.lessons);
export const AREAS = ["Todos", ...Array.from(new Set(COURSES.map((c) => c.area)))];

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const fmtUSD = (n: number) => new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

// ---------- Finanzas ----------
export type PayMethod = "transferencia" | "tarjeta" | "efectivo";
export type Payment = { id: string; studentId: string; courseSlug: string; amount: number; method: PayMethod; at: string; note?: string; status?: "confirmado" | "por_validar" };
export type PlanId = "contado" | "anticipo" | "mensual";
export type Payout = { id: string; teacherId: string; courseSlug: string; amount: number; method: PayMethod; at: string; note?: string };

export const SEED_PAYMENTS: Payment[] = [
  { id: "pg1", studentId: "u-est1", courseSlug: "desarrollo-web-fullstack", amount: 160, method: "transferencia", at: "2026-10-01T10:00:00Z", note: "Primera cuota (50%)" },
  { id: "pg2", studentId: "u-est1", courseSlug: "ciberseguridad-fundamentos", amount: 290, method: "tarjeta", at: "2026-10-02T15:30:00Z" },
  { id: "pg3", studentId: "u-est2", courseSlug: "desarrollo-web-fullstack", amount: 320, method: "transferencia", at: "2026-09-28T09:00:00Z" },
  { id: "pg4", studentId: "u-est3", courseSlug: "desarrollo-web-fullstack", amount: 160, method: "efectivo", at: "2026-09-30T12:00:00Z", note: "Primera cuota" },
  { id: "pg5", studentId: "u-est4", courseSlug: "desarrollo-web-fullstack", amount: 320, method: "tarjeta", at: "2026-09-27T18:20:00Z" },
  { id: "pg6", studentId: "u-est3", courseSlug: "ciberseguridad-fundamentos", amount: 290, method: "transferencia", at: "2026-09-29T11:10:00Z" },
  { id: "pg7", studentId: "u-est5", courseSlug: "ciberseguridad-fundamentos", amount: 145, method: "transferencia", at: "2026-10-03T08:45:00Z", note: "Primera cuota" },
  { id: "pg8", studentId: "u-est2", courseSlug: "ciencia-datos-ia", amount: 380, method: "tarjeta", at: "2026-10-01T16:00:00Z" },
  { id: "pg9", studentId: "u-est5", courseSlug: "cloud-computing-aws", amount: 260, method: "transferencia", at: "2026-08-20T10:00:00Z" },
  { id: "pg10", studentId: "u-est6", courseSlug: "cloud-computing-aws", amount: 260, method: "efectivo", at: "2026-09-10T10:00:00Z" },
];

// Tarifa por hora dictada (USD) acordada con cada capacitador.
export const TEACHER_RATES: Record<string, number> = { "u-doc1": 18, "u-doc2": 20, "u-doc3": 25, "u-doc4": 18 };

export const SEED_PAYOUTS: Payout[] = [
  { id: "po1", teacherId: "u-doc4", courseSlug: "cloud-computing-aws", amount: 576, method: "transferencia", at: "2026-09-25T10:00:00Z", note: "Pago parcial (50%)" },
  { id: "po2", teacherId: "u-doc1", courseSlug: "desarrollo-web-fullstack", amount: 432, method: "transferencia", at: "2026-10-01T10:00:00Z", note: "Anticipo 25%" },
];

// Plan de pago elegido por matrícula (clave `${studentId}:${courseSlug}`).
export const SEED_PLANS: Record<string, PlanId> = {
  "u-est1:desarrollo-web-fullstack": "anticipo",
  "u-est1:ciberseguridad-fundamentos": "contado",
  "u-est2:desarrollo-web-fullstack": "contado",
  "u-est3:desarrollo-web-fullstack": "anticipo",
  "u-est4:desarrollo-web-fullstack": "contado",
  "u-est3:ciberseguridad-fundamentos": "contado",
  "u-est5:ciberseguridad-fundamentos": "anticipo",
  "u-est2:ciencia-datos-ia": "contado",
  "u-est5:cloud-computing-aws": "contado",
  "u-est6:cloud-computing-aws": "contado",
};

// ---------- Capacitadores ----------
// Solicitud de capacitador (convocatoria). Mismo flujo que el participante: nuevo → llamada → habilitado | rechazado.
export type TrainerApp = {
  id: string; name: string; docId: string; email: string; phone: string; city?: string;
  specialty: string; years: number; mode: "pregrabados" | "envivo" | "ambos"; topic: string; link?: string; message?: string;
  at: string; status: "nuevo" | "contactado" | "matriculado" | "descartado"; callNote?: string; calledAt?: string; userId?: string; tempPassword?: string;
};
export const MODE_LABEL: Record<TrainerApp["mode"], string> = { pregrabados: "Vender cursos pregrabados", envivo: "Dictar cursos en vivo (Zoom/Meet)", ambos: "Ambas modalidades" };

export type ClassSession = { id: string; teacherId: string; courseSlug: string; title: string; date: string; time: string; hours: number; platform: "zoom" | "meet" | "otro"; link: string; status: "programada" | "dictada" | "cancelada" };

// Cambios de nota hechos por coordinación (el capacitador califica una sola vez; solo coordinación puede corregir).
export type GradeChange = { id: string; submissionId: string; from: number; to: number; by: string; reason: string; at: string };

export const DEFAULT_SHARE = 60; // % de lo cobrado por un curso propio que recibe el capacitador

export const SEED_TRAINER_APPS: TrainerApp[] = [
  { id: "t1", name: "Ricardo Guevara", docId: "1710020030", email: "ricardo.g@correo.com", phone: "0994445566", city: "Guayaquil", specialty: "Ingeniero en redes, CCNP", years: 9, mode: "ambos", topic: "Redes y seguridad perimetral", link: "https://linkedin.com/in/ricardog", at: "2026-10-05T10:00:00Z", status: "nuevo" },
];

export const SEED_SESSIONS: ClassSession[] = [
  { id: "c1", teacherId: "u-doc1", courseSlug: "desarrollo-web-fullstack", title: "Introducción a React y componentes", date: "2026-10-01", time: "19:00", hours: 2, platform: "zoom", link: "https://zoom.us/j/000000001", status: "dictada" },
  { id: "c2", teacherId: "u-doc1", courseSlug: "desarrollo-web-fullstack", title: "Hooks y estado", date: "2026-10-06", time: "19:00", hours: 2, platform: "zoom", link: "https://zoom.us/j/000000001", status: "dictada" },
  { id: "c3", teacherId: "u-doc1", courseSlug: "desarrollo-web-fullstack", title: "Formularios y validación", date: "2026-10-13", time: "19:00", hours: 2, platform: "zoom", link: "https://zoom.us/j/000000001", status: "programada" },
  { id: "c4", teacherId: "u-doc2", courseSlug: "ciberseguridad-fundamentos", title: "Laboratorio: análisis de tráfico", date: "2026-10-02", time: "18:00", hours: 2, platform: "meet", link: "https://meet.google.com/aaa-bbbb-ccc", status: "dictada" },
  { id: "c5", teacherId: "u-doc2", courseSlug: "ciberseguridad-fundamentos", title: "OWASP Top 10", date: "2026-10-09", time: "18:00", hours: 2, platform: "meet", link: "https://meet.google.com/aaa-bbbb-ccc", status: "programada" },
  { id: "c6", teacherId: "u-doc3", courseSlug: "ciencia-datos-ia", title: "Regresión lineal en la práctica", date: "2026-10-08", time: "20:00", hours: 3, platform: "zoom", link: "https://zoom.us/j/000000003", status: "programada" },
];
