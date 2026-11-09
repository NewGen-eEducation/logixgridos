import { Register } from '../types/register';

export const sampleRegisters: Register[] = [
  {
    id: 'reg-students',
    title: 'Student Academic Evaluation & Feedback Form',
    titleTe: 'విద్యార్థుల విద్యా మూల్యాంకనం & ఫీడ్‌బ్యాక్ ఫారమ్',
    description: 'Academic performance registration form with Google Forms validations for student IDs, emails, scores, and rating feedback.',
    descriptionTe: 'రోల్ నంబర్లు, ఈమెయిళ్లు, మార్కులు మరియు రేటింగ్‌లతో కూడిన విద్యార్థుల మూల్యాంకన ఫారమ్.',
    category: 'education',
    createdAt: '2026-09-01',
    updatedAt: '2026-10-09',
    themeColor: '#673ab7', // Classic Google Forms purple
    columns: [
      { 
        id: 'timestamp', 
        name: 'Timestamp', 
        nameTe: 'నమోదైన సమయం', 
        type: 'date', 
        width: 140 
      },
      { 
        id: 'roll_no', 
        name: 'Roll Number', 
        nameTe: 'రోల్ నంబర్', 
        type: 'text', 
        required: true, 
        width: 130,
        description: 'Institutional ID format: 2026-CS-XXX',
        validation: {
          enabled: true,
          category: 'length',
          operator: 'min_char_count',
          value: 5,
          customErrorMessage: 'Roll number must be at least 5 characters long',
        }
      },
      { 
        id: 'student_name', 
        name: 'Student Full Name', 
        nameTe: 'విద్యార్థి పూర్తి పేరు', 
        type: 'text', 
        required: true, 
        width: 180,
        validation: {
          enabled: true,
          category: 'length',
          operator: 'min_char_count',
          value: 3,
          customErrorMessage: 'Name must have at least 3 characters',
        }
      },
      { 
        id: 'email', 
        name: 'Official Email ID', 
        nameTe: 'ఈమెయిల్ చిరునామా', 
        type: 'text', 
        required: true, 
        width: 190,
        validation: {
          enabled: true,
          category: 'text',
          operator: 'email',
          customErrorMessage: 'Please enter a valid institution email address',
        }
      },
      { 
        id: 'section', 
        name: 'Class Section', 
        nameTe: 'తరగతి సెక్షన్', 
        type: 'multiple_choice', 
        required: true,
        options: ['Section A', 'Section B', 'Section C'], 
        width: 140 
      },
      { 
        id: 'attendance_pct', 
        name: 'Attendance Percentage', 
        nameTe: 'హాజరు శాతం', 
        type: 'number', 
        unit: '%', 
        required: true,
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'between',
          value: 0,
          secondValue: 100,
          customErrorMessage: 'Attendance percentage must be between 0 and 100',
        }
      },
      { 
        id: 'internal_marks', 
        name: 'Internal Marks (40)', 
        nameTe: 'ఇంటర్నల్ మార్కులు', 
        type: 'number', 
        required: true,
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'between',
          value: 0,
          secondValue: 40,
          customErrorMessage: 'Internal marks must be between 0 and 40',
        }
      },
      { 
        id: 'external_marks', 
        name: 'External Marks (60)', 
        nameTe: 'ఎక్స్టర్నల్ మార్కులు', 
        type: 'number', 
        required: true,
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'between',
          value: 0,
          secondValue: 60,
          customErrorMessage: 'External marks must be between 0 and 60',
        }
      },
      { 
        id: 'total_score', 
        name: 'Total Score (100)', 
        nameTe: 'మొత్తం మార్కులు', 
        type: 'formula', 
        formula: '[internal_marks] + [external_marks]', 
        unit: 'pts',
        width: 150 
      },
      { 
        id: 'course_feedback', 
        name: 'Course Satisfaction Rating', 
        nameTe: 'కోర్సు సంతృప్తి రేటింగ్', 
        type: 'linear_scale', 
        scaleMin: 1, 
        scaleMax: 5,
        scaleMinLabel: 'Needs Improvement',
        scaleMaxLabel: 'Outstanding Experience',
        width: 170 
      },
      { 
        id: 'specializations', 
        name: 'Elective Tracks Selected', 
        nameTe: 'ఎంచుకున్న ఎలెక్టివ్ విభాగాలు', 
        type: 'checkboxes', 
        options: ['Artificial Intelligence', 'Cyber Security', 'Full-Stack Web Systems', 'Cloud & DevOps'],
        validation: {
          enabled: true,
          category: 'checkbox',
          operator: 'select_at_least',
          value: 1,
          customErrorMessage: 'Please select at least 1 elective track',
        },
        width: 220 
      },
    ],
    rows: [
      { timestamp: '2026-10-01', roll_no: '2026-CS-001', student_name: 'Aarav Sharma', email: 'aarav.sharma@campus.edu', section: 'Section A', attendance_pct: 94, internal_marks: 38, external_marks: 56, course_feedback: 5, specializations: ['Artificial Intelligence', 'Full-Stack Web Systems'] },
      { timestamp: '2026-10-01', roll_no: '2026-CS-002', student_name: 'Bhavya Reddy', email: 'bhavya.r@campus.edu', section: 'Section A', attendance_pct: 88, internal_marks: 34, external_marks: 49, course_feedback: 4, specializations: ['Cyber Security'] },
      { timestamp: '2026-10-02', roll_no: '2026-CS-003', student_name: 'Chaitanya Varma', email: 'chaitanya.v@campus.edu', section: 'Section B', attendance_pct: 76, internal_marks: 29, external_marks: 41, course_feedback: 4, specializations: ['Cloud & DevOps'] },
      { timestamp: '2026-10-02', roll_no: '2026-CS-004', student_name: 'Divya Sree', email: 'divya.sree@campus.edu', section: 'Section A', attendance_pct: 98, internal_marks: 39, external_marks: 58, course_feedback: 5, specializations: ['Artificial Intelligence', 'Cyber Security'] },
      { timestamp: '2026-10-03', roll_no: '2026-CS-005', student_name: 'Eshwar Prasad', email: 'eshwar.p@campus.edu', section: 'Section B', attendance_pct: 62, internal_marks: 22, external_marks: 32, course_feedback: 3, specializations: ['Full-Stack Web Systems'] },
      { timestamp: '2026-10-03', roll_no: '2026-CS-006', student_name: 'Farhan Ali', email: 'farhan.ali@campus.edu', section: 'Section C', attendance_pct: 85, internal_marks: 33, external_marks: 48, course_feedback: 4, specializations: ['Cloud & DevOps', 'Cyber Security'] },
      { timestamp: '2026-10-04', roll_no: '2026-CS-007', student_name: 'Gowri Nandini', email: 'gowri.n@campus.edu', section: 'Section A', attendance_pct: 92, internal_marks: 37, external_marks: 54, course_feedback: 5, specializations: ['Artificial Intelligence'] },
      { timestamp: '2026-10-04', roll_no: '2026-CS-008', student_name: 'Harish Kumar', email: 'harish.k@campus.edu', section: 'Section B', attendance_pct: 81, internal_marks: 30, external_marks: 44, course_feedback: 4, specializations: ['Full-Stack Web Systems'] },
      { timestamp: '2026-10-05', roll_no: '2026-CS-009', student_name: 'Ishaan Gupta', email: 'ishaan.g@campus.edu', section: 'Section C', attendance_pct: 54, internal_marks: 18, external_marks: 26, course_feedback: 2, specializations: ['Cloud & DevOps'] },
      { timestamp: '2026-10-05', roll_no: '2026-CS-010', student_name: 'Jyothi Sri', email: 'jyothi.sri@campus.edu', section: 'Section C', attendance_pct: 90, internal_marks: 36, external_marks: 52, course_feedback: 5, specializations: ['Artificial Intelligence', 'Cyber Security'] },
    ]
  },
  {
    id: 'reg-cashbook',
    title: 'Financial Expense & Voucher Request Form',
    titleTe: 'క్యాష్ బుక్ & వోచర్ అభ్యర్థన ఫారమ్',
    description: 'Voucher payment requisitions, expense categories, amounts with minimum threshold validation, and approval status.',
    descriptionTe: 'ఆర్థిక వ్యయాలు, వోచర్ నంబర్లు మరియు చెల్లింపు వివరాల నమోదు ఫారమ్.',
    category: 'finance',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-09',
    themeColor: '#00796b', // Teal
    columns: [
      { id: 'voucher_no', name: 'Voucher Ref Code', nameTe: 'వోచర్ సంఖ్య', type: 'text', required: true, width: 140 },
      { id: 'date', name: 'Transaction Date', nameTe: 'తేదీ', type: 'date', required: true, width: 140 },
      { id: 'particulars', name: 'Expense Particulars', nameTe: 'లావాదేవీ వివరాలు', type: 'paragraph', required: true, width: 220 },
      { id: 'head_category', name: 'Accounting Head', nameTe: 'ఖాతా శీర్షిక', type: 'select', options: ['Tuition Revenue', 'Lab Supplies', 'IT Infrastructure', 'Utility & Electricity', 'Printing & Books', 'Staff Honorarium'], width: 180 },
      { 
        id: 'income_amount', 
        name: 'Inflow Receipt (₹)', 
        nameTe: 'రాబడి (రూ.)', 
        type: 'currency', 
        unit: '₹', 
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'greater_than_or_equal',
          value: 0,
          customErrorMessage: 'Inflow cannot be negative',
        }
      },
      { 
        id: 'expense_amount', 
        name: 'Outflow Payment (₹)', 
        nameTe: 'ఖర్చు (రూ.)', 
        type: 'currency', 
        unit: '₹', 
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'greater_than_or_equal',
          value: 0,
          customErrorMessage: 'Expense cannot be negative',
        }
      },
      { 
        id: 'net_flow', 
        name: 'Net Balance', 
        nameTe: 'నికర మార్పు (రూ.)', 
        type: 'formula', 
        formula: '[income_amount] - [expense_amount]', 
        unit: '₹', 
        width: 160 
      },
      { id: 'payment_mode', name: 'Payment Mode', nameTe: 'చెల్లింపు విధానం', type: 'multiple_choice', options: ['UPI / NetBanking', 'Cheque Transfer', 'Cash Drawer', 'NEFT / RTGS'], width: 160 },
      { id: 'is_verified', name: 'Verified & Approved', nameTe: 'ఆడిట్ పూర్తయింది', type: 'checkbox', width: 140 },
    ],
    rows: [
      { voucher_no: 'VCH-2026-101', date: '2026-10-01', particulars: 'Semester Tuition Batch A Collection', head_category: 'Tuition Revenue', income_amount: 145000, expense_amount: 0, payment_mode: 'UPI / NetBanking', is_verified: true },
      { voucher_no: 'VCH-2026-102', date: '2026-10-02', particulars: 'Fiber Internet Lease & Cloud Subscription', head_category: 'IT Infrastructure', income_amount: 0, expense_amount: 18500, payment_mode: 'NEFT / RTGS', is_verified: true },
      { voucher_no: 'VCH-2026-103', date: '2026-10-03', particulars: 'Science Lab Chemistry Reagents Restock', head_category: 'Lab Supplies', income_amount: 0, expense_amount: 24300, payment_mode: 'Cheque Transfer', is_verified: true },
      { voucher_no: 'VCH-2026-104', date: '2026-10-04', particulars: 'Library Reference Books & Journals', head_category: 'Printing & Books', income_amount: 0, expense_amount: 9800, payment_mode: 'Cash Drawer', is_verified: false },
      { voucher_no: 'VCH-2026-105', date: '2026-10-05', particulars: 'Lateral Admission Registration Fees', head_category: 'Tuition Revenue', income_amount: 68000, expense_amount: 0, payment_mode: 'UPI / NetBanking', is_verified: true },
      { voucher_no: 'VCH-2026-106', date: '2026-10-06', particulars: 'Main Campus Power & Water Utility Bill', head_category: 'Utility & Electricity', income_amount: 0, expense_amount: 32500, payment_mode: 'NEFT / RTGS', is_verified: true },
    ]
  },
  {
    id: 'reg-inventory',
    title: 'Equipment & Asset Inspection Form',
    titleTe: 'సరుకుల నిల్వ & ఇన్వెంటరీ తనిఖీ ఫారమ్',
    description: 'Hardware equipment registry with unit rates, asset condition ratings, and threshold safety validations.',
    descriptionTe: 'ల్యాబ్ పరికరాలు, స్టాక్ పరిమాణం మరియు రేటింగ్‌లతో కూడిన ఇన్వెంటరీ రిజిస్టర్.',
    category: 'inventory',
    createdAt: '2026-09-15',
    updatedAt: '2026-10-09',
    themeColor: '#d97706', // Amber
    columns: [
      { id: 'asset_id', name: 'Asset Tag Code', nameTe: 'ఆస్తి కోడ్', type: 'text', required: true, width: 140 },
      { id: 'item_name', name: 'Item Description', nameTe: 'వస్తువు వివరాలు', type: 'text', required: true, width: 220 },
      { id: 'department', name: 'Campus Location', nameTe: 'ప్రాంగణం / గది', type: 'select', options: ['Computer Center', 'Electronics Lab', 'Library', 'Admin Block', 'Auditorium'], width: 180 },
      { 
        id: 'unit_cost', 
        name: 'Unit Cost Rate', 
        nameTe: 'యూనిట్ ధర (రూ.)', 
        type: 'currency', 
        unit: '₹', 
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'greater_than',
          value: 0,
          customErrorMessage: 'Unit cost must be greater than 0',
        }
      },
      { 
        id: 'quantity', 
        name: 'Quantity in Stock', 
        nameTe: 'నిల్వ పరిమాణం', 
        type: 'number', 
        unit: 'units', 
        width: 150,
        validation: {
          enabled: true,
          category: 'number',
          operator: 'greater_than_or_equal',
          value: 1,
          customErrorMessage: 'Must have at least 1 unit recorded',
        }
      },
      { 
        id: 'total_valuation', 
        name: 'Total Valuation', 
        nameTe: 'మొత్తం ఆస్తి విలువ', 
        type: 'formula', 
        formula: '[unit_cost] * [quantity]', 
        unit: '₹', 
        width: 170 
      },
      { id: 'condition_rating', name: 'Apparatus Condition', nameTe: 'పరిస్థితి రేటింగ్', type: 'rating', width: 150 },
    ],
    rows: [
      { asset_id: 'EQ-COMP-01', item_name: 'Workstation PCs (Core i7 32GB)', department: 'Computer Center', unit_cost: 65000, quantity: 45, condition_rating: 5 },
      { asset_id: 'EQ-COMP-02', item_name: 'Gigabit Managed Switch 48-Port', department: 'Computer Center', unit_cost: 28000, quantity: 6, condition_rating: 5 },
      { asset_id: 'EQ-ELEC-01', item_name: 'Digital Storage Oscilloscope 100MHz', department: 'Electronics Lab', unit_cost: 34500, quantity: 18, condition_rating: 4 },
      { asset_id: 'EQ-ELEC-02', item_name: 'Precision Function Generators', department: 'Electronics Lab', unit_cost: 16200, quantity: 22, condition_rating: 4 },
      { asset_id: 'EQ-LIB-01', item_name: 'Barcode RFID Scanner Terminal', department: 'Library', unit_cost: 12000, quantity: 8, condition_rating: 4 },
      { asset_id: 'EQ-ADM-01', item_name: 'High-Speed Multi-Function Copier', department: 'Admin Block', unit_cost: 84000, quantity: 3, condition_rating: 3 },
    ]
  }
];
