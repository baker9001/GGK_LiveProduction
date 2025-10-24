/**
 * Test Data Seeding Script
 *
 * This script creates test teachers and students following the proper user creation flow.
 * It uses the userCreationService to ensure consistency with production code.
 *
 * Usage:
 *   npm run seed-test-users
 *
 * Features:
 * - Creates teachers with realistic profiles and specializations
 * - Creates students distributed across grades and sections
 * - Follows proper authentication and authorization flows
 * - Generates documentation of created test accounts
 */

import { supabase } from '../src/lib/supabase';
import { userCreationService } from '../src/services/userCreationService';

// ============= CONFIGURATION =============

const TEST_PASSWORD = 'TestPass123!'; // Standard password for all test accounts
const TEACHER_SPECIALIZATIONS = [
  ['Mathematics', 'Statistics'],
  ['Physics', 'Chemistry'],
  ['Biology', 'Chemistry'],
  ['English', 'Literature'],
  ['History', 'Geography'],
  ['Computer Science', 'Mathematics'],
  ['Art', 'Design'],
  ['Physical Education', 'Health']
];

const TEACHER_QUALIFICATIONS = [
  'B.Ed. Mathematics',
  'M.Sc. Physics',
  'B.Sc. Biology, B.Ed.',
  'M.A. English Literature',
  'M.Ed. History',
  'M.C.A. Computer Science',
  'B.F.A. Visual Arts',
  'B.P.Ed. Physical Education'
];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const SECTIONS = ['A', 'B', 'C'];

// ============= HELPER FUNCTIONS =============

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateFullName(): { firstName: string; lastName: string; fullName: string } {
  const firstName = getRandomElement(FIRST_NAMES);
  const lastName = getRandomElement(LAST_NAMES);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  };
}

function generateEmail(firstName: string, lastName: string, suffix: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${suffix}@testschool.edu`.replace(/\s+/g, '');
}

function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${exchange}-${number}`;
}

function generateTeacherCode(schoolCode: string, index: number): string {
  return `TCH-${schoolCode}-${String(index).padStart(4, '0')}`;
}

function generateStudentCode(schoolCode: string, gradeLevel: string, index: number): string {
  return `STU-${schoolCode}-G${gradeLevel}-${String(index).padStart(4, '0')}`;
}

function generateEnrollmentNumber(year: number, index: number): string {
  return `ENR${year}${String(index).padStart(6, '0')}`;
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// ============= MAIN SEEDING FUNCTIONS =============

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  company_name: string;
}

interface BranchData {
  id: string;
  name: string;
  school_id: string;
  school_name: string;
}

interface GradeLevelData {
  id: string;
  name: string;
  code: string;
}

interface CreatedUser {
  type: 'teacher' | 'student';
  name: string;
  email: string;
  password: string;
  code: string;
  schoolName: string;
  branchName?: string;
  additionalInfo?: any;
}

const createdUsers: CreatedUser[] = [];

async function getSchoolsAndBranches(): Promise<{ schools: SchoolData[]; branches: BranchData[] }> {
  console.log('\n📊 Fetching schools and branches...');

  // Fetch schools
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select(`
      id,
      name,
      code,
      company_id,
      companies!inner(name)
    `)
    .eq('status', 'active')
    .order('name');

  if (schoolsError) {
    throw new Error(`Failed to fetch schools: ${schoolsError.message}`);
  }

  if (!schools || schools.length === 0) {
    throw new Error('No active schools found in database. Please create schools first.');
  }

  // Fetch branches
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      school_id,
      schools!inner(name)
    `)
    .eq('status', 'active')
    .order('name');

  if (branchesError) {
    throw new Error(`Failed to fetch branches: ${branchesError.message}`);
  }

  const schoolsData: SchoolData[] = schools.map((s: any) => ({
    id: s.id,
    name: s.name,
    code: s.code || 'SCH',
    company_id: s.company_id,
    company_name: s.companies?.name || 'Unknown Company'
  }));

  const branchesData: BranchData[] = (branches || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    school_id: b.school_id,
    school_name: b.schools?.name || 'Unknown School'
  }));

  console.log(`✅ Found ${schoolsData.length} schools and ${branchesData.length} branches`);

  return { schools: schoolsData, branches: branchesData };
}

async function getGradeLevels(): Promise<GradeLevelData[]> {
  console.log('\n📊 Fetching grade levels...');

  const { data: gradeLevels, error } = await supabase
    .from('grade_levels')
    .select('id, name, code')
    .eq('status', 'active')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch grade levels: ${error.message}`);
  }

  if (!gradeLevels || gradeLevels.length === 0) {
    console.warn('⚠️ No grade levels found. Creating default grade levels...');
    return await createDefaultGradeLevels();
  }

  console.log(`✅ Found ${gradeLevels.length} grade levels`);
  return gradeLevels;
}

async function createDefaultGradeLevels(): Promise<GradeLevelData[]> {
  const defaultGrades = [
    { name: 'Grade 1', code: '1' },
    { name: 'Grade 2', code: '2' },
    { name: 'Grade 3', code: '3' },
    { name: 'Grade 4', code: '4' },
    { name: 'Grade 5', code: '5' },
    { name: 'Grade 6', code: '6' },
    { name: 'Grade 7', code: '7' },
    { name: 'Grade 8', code: '8' },
    { name: 'Grade 9', code: '9' },
    { name: 'Grade 10', code: '10' }
  ];

  const gradesData = defaultGrades.map(g => ({
    ...g,
    status: 'active',
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('grade_levels')
    .insert(gradesData)
    .select('id, name, code');

  if (error) {
    throw new Error(`Failed to create default grade levels: ${error.message}`);
  }

  console.log(`✅ Created ${data.length} default grade levels`);
  return data;
}

async function createTeachersForSchool(
  school: SchoolData,
  branches: BranchData[],
  teachersPerSchool: number
): Promise<void> {
  console.log(`\n👨‍🏫 Creating ${teachersPerSchool} teachers for ${school.name}...`);

  const schoolBranches = branches.filter(b => b.school_id === school.id);

  if (schoolBranches.length === 0) {
    console.warn(`⚠️ No branches found for ${school.name}, skipping teacher creation`);
    return;
  }

  let teacherIndex = 1;

  for (let i = 0; i < teachersPerSchool; i++) {
    try {
      const { firstName, lastName, fullName } = generateFullName();
      const email = generateEmail(firstName, lastName, `teacher${teacherIndex}`);
      const phone = generatePhone();
      const teacherCode = generateTeacherCode(school.code, teacherIndex);
      const specialization = getRandomElement(TEACHER_SPECIALIZATIONS);
      const qualification = getRandomElement(TEACHER_QUALIFICATIONS);
      const experienceYears = Math.floor(Math.random() * 15) + 1;
      const hireDate = getRandomDate(365 * 5); // Within last 5 years
      const branch = getRandomElement(schoolBranches);

      console.log(`  Creating teacher: ${fullName} (${email})`);

      const result = await userCreationService.createUserWithInvitation({
        user_type: 'teacher',
        email,
        name: fullName,
        password: TEST_PASSWORD,
        phone,
        company_id: school.company_id,
        teacher_code: teacherCode,
        specialization,
        qualification,
        experience_years: experienceYears,
        hire_date: hireDate,
        school_id: school.id,
        branch_id: branch.id,
        is_active: true,
        send_invitation: false,
        metadata: {
          test_account: true,
          created_via: 'seed_script',
          created_at: new Date().toISOString()
        }
      });

      createdUsers.push({
        type: 'teacher',
        name: fullName,
        email,
        password: TEST_PASSWORD,
        code: teacherCode,
        schoolName: school.name,
        branchName: branch.name,
        additionalInfo: {
          specialization: specialization.join(', '),
          qualification,
          experienceYears,
          hireDate
        }
      });

      console.log(`  ✅ Created teacher: ${fullName}`);
      teacherIndex++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error(`  ❌ Failed to create teacher: ${error.message}`);
    }
  }
}

async function createStudentsForSchool(
  school: SchoolData,
  branches: BranchData[],
  gradeLevels: GradeLevelData[],
  studentsPerGrade: number
): Promise<void> {
  console.log(`\n👨‍🎓 Creating students for ${school.name}...`);

  const schoolBranches = branches.filter(b => b.school_id === school.id);

  if (schoolBranches.length === 0) {
    console.warn(`⚠️ No branches found for ${school.name}, skipping student creation`);
    return;
  }

  let studentIndex = 1;
  const currentYear = new Date().getFullYear();

  // Select a subset of grades for this school (e.g., 5 grades)
  const numGrades = Math.min(5, gradeLevels.length);
  const selectedGrades = gradeLevels.slice(0, numGrades);

  for (const grade of selectedGrades) {
    console.log(`\n  Grade ${grade.name}:`);

    for (let i = 0; i < studentsPerGrade; i++) {
      try {
        const { firstName, lastName, fullName } = generateFullName();
        const email = generateEmail(firstName, lastName, `student${studentIndex}`);
        const phone = generatePhone();
        const studentCode = generateStudentCode(school.code, grade.code, studentIndex);
        const enrollmentNumber = generateEnrollmentNumber(currentYear, studentIndex);
        const section = getRandomElement(SECTIONS);
        const admissionDate = getRandomDate(365 * 3); // Within last 3 years
        const branch = getRandomElement(schoolBranches);

        // Generate parent info
        const parentName = `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`;
        const parentContact = generatePhone();
        const parentEmail = generateEmail(firstName, lastName, `parent${studentIndex}`);

        console.log(`    Creating student: ${fullName} - Section ${section}`);

        const result = await userCreationService.createUserWithInvitation({
          user_type: 'student',
          email,
          name: fullName,
          password: TEST_PASSWORD,
          phone,
          company_id: school.company_id,
          student_code: studentCode,
          enrollment_number: enrollmentNumber,
          grade_level: grade.code,
          section,
          admission_date: admissionDate,
          school_id: school.id,
          branch_id: branch.id,
          parent_name: parentName,
          parent_contact: parentContact,
          parent_email: parentEmail,
          emergency_contact: {
            name: parentName,
            phone: parentContact,
            relationship: 'parent',
            address: '123 Main Street, City, State'
          },
          is_active: true,
          send_invitation: false,
          metadata: {
            test_account: true,
            created_via: 'seed_script',
            created_at: new Date().toISOString()
          }
        });

        createdUsers.push({
          type: 'student',
          name: fullName,
          email,
          password: TEST_PASSWORD,
          code: studentCode,
          schoolName: school.name,
          branchName: branch.name,
          additionalInfo: {
            enrollmentNumber,
            grade: grade.name,
            section,
            parentName,
            parentContact,
            admissionDate
          }
        });

        console.log(`    ✅ Created student: ${fullName}`);
        studentIndex++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`    ❌ Failed to create student: ${error.message}`);
      }
    }
  }
}

function generateReport(): string {
  const timestamp = new Date().toISOString();
  const teachers = createdUsers.filter(u => u.type === 'teacher');
  const students = createdUsers.filter(u => u.type === 'student');

  let report = `# Test Users Seeding Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `**Total Users Created:** ${createdUsers.length}\n`;
  report += `- Teachers: ${teachers.length}\n`;
  report += `- Students: ${students.length}\n\n`;
  report += `**Standard Test Password:** \`${TEST_PASSWORD}\`\n\n`;
  report += `---\n\n`;

  // Teachers section
  report += `## Teachers (${teachers.length})\n\n`;
  report += `| Name | Email | Code | School | Branch | Specialization |\n`;
  report += `|------|-------|------|--------|--------|----------------|\n`;

  teachers.forEach(teacher => {
    report += `| ${teacher.name} | ${teacher.email} | ${teacher.code} | ${teacher.schoolName} | ${teacher.branchName || 'N/A'} | ${teacher.additionalInfo?.specialization || 'N/A'} |\n`;
  });

  report += `\n---\n\n`;

  // Students section grouped by school and grade
  report += `## Students (${students.length})\n\n`;

  const studentsBySchool: Record<string, CreatedUser[]> = {};
  students.forEach(student => {
    if (!studentsBySchool[student.schoolName]) {
      studentsBySchool[student.schoolName] = [];
    }
    studentsBySchool[student.schoolName].push(student);
  });

  Object.entries(studentsBySchool).forEach(([schoolName, schoolStudents]) => {
    report += `### ${schoolName} (${schoolStudents.length} students)\n\n`;
    report += `| Name | Email | Code | Grade | Section | Enrollment # |\n`;
    report += `|------|-------|------|-------|---------|-------------|\n`;

    schoolStudents.forEach(student => {
      report += `| ${student.name} | ${student.email} | ${student.code} | ${student.additionalInfo?.grade || 'N/A'} | ${student.additionalInfo?.section || 'N/A'} | ${student.additionalInfo?.enrollmentNumber || 'N/A'} |\n`;
    });

    report += `\n`;
  });

  report += `---\n\n`;
  report += `## Login Instructions\n\n`;
  report += `All test accounts use the same password: \`${TEST_PASSWORD}\`\n\n`;
  report += `To login:\n`;
  report += `1. Navigate to the login page\n`;
  report += `2. Enter any email from the tables above\n`;
  report += `3. Enter password: \`${TEST_PASSWORD}\`\n`;
  report += `4. Click "Sign In"\n\n`;
  report += `**Note:** All accounts are marked as test accounts in their metadata.\n`;

  return report;
}

// ============= MAIN EXECUTION =============

async function main() {
  console.log('🚀 Starting Test Data Seeding Process\n');
  console.log('=' .repeat(60));

  try {
    // Configuration
    const TEACHERS_PER_SCHOOL = 4;
    const STUDENTS_PER_GRADE = 8;

    // Step 1: Fetch database structure
    const { schools, branches } = await getSchoolsAndBranches();
    const gradeLevels = await getGradeLevels();

    console.log('\n📋 Summary of Database Structure:');
    console.log(`  - Schools: ${schools.length}`);
    console.log(`  - Branches: ${branches.length}`);
    console.log(`  - Grade Levels: ${gradeLevels.length}`);
    console.log('=' .repeat(60));

    // Step 2: Create teachers for each school
    console.log('\n\n👨‍🏫 CREATING TEACHERS');
    console.log('=' .repeat(60));

    for (const school of schools) {
      await createTeachersForSchool(school, branches, TEACHERS_PER_SCHOOL);
    }

    // Step 3: Create students for each school
    console.log('\n\n👨‍🎓 CREATING STUDENTS');
    console.log('=' .repeat(60));

    for (const school of schools) {
      await createStudentsForSchool(school, branches, gradeLevels, STUDENTS_PER_GRADE);
    }

    // Step 4: Generate report
    console.log('\n\n📄 GENERATING REPORT');
    console.log('=' .repeat(60));

    const report = generateReport();

    // Save report (you can implement file writing if needed)
    console.log('\n' + report);

    console.log('\n\n✅ TEST DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`\nTotal users created: ${createdUsers.length}`);
    console.log(`- Teachers: ${createdUsers.filter(u => u.type === 'teacher').length}`);
    console.log(`- Students: ${createdUsers.filter(u => u.type === 'student').length}`);
    console.log(`\nAll accounts use password: ${TEST_PASSWORD}`);

  } catch (error: any) {
    console.error('\n\n❌ ERROR DURING SEEDING:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main as seedTestUsers };
